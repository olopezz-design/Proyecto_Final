const fsSync = require('fs');
const fs = require('fs/promises');
const path = require('path');
const PDFDocument = require('pdfkit');
const { query, initPool } = require('../database/db');

let storageReadyPromise = null;
const QUOTATION_TAX_RATE = 0.12;
const CLINIC_DOCUMENT_INFO = {
  name: 'C&C Dental Studio',
  phone: '+502 3515-5503',
  email: 'castilloherbert@gmail.com',
  address: '9na Avenida, Apartamento B, Condominio Fuentes del Valle 2, zona 5 de Villa Nueva, Guatemala',
};
let clinicLogoBufferCache;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  error.expose = true;
  return error;
}

async function tableHasColumn(tableName, columnName) {
  const rows = await query(
    `SELECT 1
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [tableName, columnName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function tableExists(tableName) {
  const rows = await query(
    `SELECT 1
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      LIMIT 1`,
    [tableName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function ensureActiveConsultationStorage() {
  if (!storageReadyPromise) {
    storageReadyPromise = (async () => {
      const requiredTables = [
        'consulta_activa',
        'consulta_activa_medicamentos',
        'consulta_activa_archivos',
      ];
      const requiredColumns = [
        ['consulta_activa', 'proximaCita'],
        ['cotizaciones', 'cita_idcita'],
        ['cotizaciones', 'consulta_activa_id'],
        ['detalle_cotizaciones', 'nombre'],
        ['detalle_cotizaciones', 'descripcion'],
        ['detalle_cotizaciones', 'cantidad'],
        ['detalle_cotizaciones', 'precio'],
      ];
      const missing = [];

      for (const tableName of requiredTables) {
        if (!(await tableExists(tableName))) missing.push(`tabla ${tableName}`);
      }

      for (const [tableName, columnName] of requiredColumns) {
        if (!(await tableHasColumn(tableName, columnName))) {
          missing.push(`columna ${tableName}.${columnName}`);
        }
      }

      if (missing.length) {
        throw httpError(
          500,
          `Falta configurar la base de datos para consulta activa: ${missing.join(', ')}. Ejecuta manualmente el SQL de consulta activa que se compartió en el chat.`
        );
      }
    })().catch(error => {
      storageReadyPromise = null;
      throw error;
    });
  }

  return storageReadyPromise;
}

async function ensureInventoryRow(conn, productId, stock = 0) {
  const [rows] = await conn.execute(
    'SELECT id FROM inventario WHERE producto_id = ? ORDER BY id ASC LIMIT 1',
    [productId]
  );
  if (rows[0]) {
    await conn.execute('UPDATE inventario SET stock_actual = ? WHERE id = ?', [stock, rows[0].id]);
    return rows[0].id;
  }
  const [created] = await conn.execute(
    'INSERT INTO inventario (producto_id, stock_actual, stock_seguridad) VALUES (?, ?, 0)',
    [productId, stock]
  );
  return created.insertId;
}

async function movementColumnMap(conn) {
  const checks = await Promise.all([
    tableHasColumn('movimientoinventario', 'tipo'),
    tableHasColumn('movimientoinventario', 'usuario_idusuario'),
    tableHasColumn('movimientoinventario', 'motivo'),
    tableHasColumn('movimientoinventario', 'referencia_tipo'),
    tableHasColumn('movimientoinventario', 'referencia_id'),
    tableHasColumn('movimientoinventario', 'stock_resultante'),
  ]);
  return {
    tipo: checks[0],
    usuario: checks[1],
    motivo: checks[2],
    referenciaTipo: checks[3],
    referenciaId: checks[4],
    stockResultante: checks[5],
  };
}

async function addInventoryMovement(conn, payload) {
  const productId = Number(payload.productoId || 0);
  const quantity = Math.max(Number(payload.cantidad || 0), 0);
  if (!productId || quantity <= 0) throw httpError(400, 'Material consumido inválido.');

  const [products] = await conn.execute('SELECT id, stock FROM producto WHERE id = ? FOR UPDATE', [productId]);
  const product = products[0];
  if (!product) throw httpError(404, 'Producto de inventario no encontrado.');

  const nextStock = Number(product.stock || 0) - quantity;
  if (nextStock < 0) throw httpError(409, `No hay suficiente stock para consumir ${payload.nombreProducto || 'el material seleccionado'}.`);

  await conn.execute('UPDATE producto SET stock = ? WHERE id = ?', [nextStock, productId]);
  await ensureInventoryRow(conn, productId, nextStock);

  const columns = ['producto_id', 'cantidad', 'fecha', 'descripcion'];
  const values = [productId, quantity, new Date(), payload.motivo || 'Salida por tratamiento'];
  const map = await movementColumnMap(conn);
  if (map.tipo) { columns.push('tipo'); values.push('salida_por_tratamiento'); }
  if (map.usuario) { columns.push('usuario_idusuario'); values.push(payload.usuarioId || null); }
  if (map.motivo) { columns.push('motivo'); values.push(payload.motivo || 'Salida por tratamiento'); }
  if (map.referenciaTipo) { columns.push('referencia_tipo'); values.push('consulta_activa'); }
  if (map.referenciaId) { columns.push('referencia_id'); values.push(payload.consultaActivaId || null); }
  if (map.stockResultante) { columns.push('stock_resultante'); values.push(nextStock); }

  const [created] = await conn.execute(
    `INSERT INTO movimientoinventario (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    values
  );
  return { id: created.insertId, stock: nextStock };
}

async function inventoryConsumptionReady() {
  return tableExists('consulta_activa_materiales');
}

async function ensureAppointmentStatus(nombre, descripcion = null) {
  const [existing] = await query(
    'SELECT idestadoCita FROM estadocita WHERE LOWER(nombre) = LOWER(?) LIMIT 1',
    [nombre]
  );
  if (existing) return existing.idestadoCita;

  throw httpError(
    500,
    `Falta configurar el estado de cita "${nombre}". Ejecuta manualmente el SQL de consulta activa que se compartió en el chat.`
  );
}

function normalizeStatusName(value) {
  return String(value || '').trim().toLowerCase();
}

function parseMaybeJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function patientFolderName(patientId) {
  return `PT${String(patientId || 0).padStart(4, '0')}`;
}

function patientUploadPath(patientId, section, fileName) {
  const folder = patientFolderName(patientId);
  return {
    absoluteDir: path.join(process.cwd(), 'uploads', 'pacientes', folder, section),
    publicPath: `/uploads/pacientes/${folder}/${section}/${fileName}`,
  };
}

function formatPdfDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleDateString('es-GT');
}

function getClinicLogoBuffer() {
  if (clinicLogoBufferCache !== undefined) return clinicLogoBufferCache;
  try {
    const svg = fsSync.readFileSync(path.join(process.cwd(), 'public', 'images', 'cnc-logo-alt.svg'), 'utf8');
    const match = svg.match(/data:image\/png;base64,([^"]+)/);
    clinicLogoBufferCache = match ? Buffer.from(match[1], 'base64') : null;
  } catch {
    clinicLogoBufferCache = null;
  }
  return clinicLogoBufferCache;
}

function preserveCursor(doc, draw) {
  const x = doc.x;
  const y = doc.y;
  draw();
  doc.x = x;
  doc.y = y;
}

function drawClinicWatermark(doc) {
  const logo = getClinicLogoBuffer();
  if (!logo) return;
  preserveCursor(doc, () => {
    doc.save();
    doc.opacity(0.055);
    doc.image(logo, (doc.page.width - 250) / 2, 260, { fit: [250, 170] });
    doc.restore();
  });
}

function drawDocumentFooter(doc) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.page.height - 64;
  preserveCursor(doc, () => {
    doc.save();
    doc.moveTo(left, y - 10).lineTo(left + width, y - 10).strokeColor('#dde2ee').stroke();
    doc.font('Helvetica').fontSize(8).fillColor('#4b5563')
      .text(`${CLINIC_DOCUMENT_INFO.name} | Tel. ${CLINIC_DOCUMENT_INFO.phone} | ${CLINIC_DOCUMENT_INFO.email}`, left, y, { width, align: 'center' });
    doc.text(CLINIC_DOCUMENT_INFO.address, left, y + 12, { width, align: 'center' });
    doc.restore();
  });
}

function drawPrescriptionHeader(doc) {
  const logo = getClinicLogoBuffer();
  drawClinicWatermark(doc);
  if (logo) doc.image(logo, doc.page.margins.left, 34, { fit: [54, 46] });
  doc.fontSize(18).fillColor('#7367f0').text(CLINIC_DOCUMENT_INFO.name, 108, 42);
  doc.moveDown(0.2);
  doc.fontSize(15).fillColor('#111827').text('Receta médica', 108, doc.y);
  doc.moveTo(doc.page.margins.left, 96).lineTo(doc.page.width - doc.page.margins.right, 96).strokeColor('#dde2ee').stroke();
  doc.x = doc.page.margins.left;
  doc.y = 118;
}

function writePrescriptionContent(doc, data, medications) {
  const patientName = `${data.nombrePaciente || ''} ${data.apellidoPaciente || ''}`.trim() || 'Paciente';
  const doctorName = `${data.nombreDoctor || ''} ${data.apellidoDoctor || ''}`.trim() || 'Doctor';

  drawPrescriptionHeader(doc);
  doc.fontSize(10).fillColor('#4b5563');
  doc.text(`Paciente: ${patientName}`);
  doc.text(`Doctor: ${doctorName}`);
  doc.text(`Cita: #APT${String(data.cita_idcita || '').padStart(3, '0')}`);
  doc.text(`Fecha: ${formatPdfDate(data.fechaCita || Date.now())}`);
  if (data.telefonoPaciente) doc.text(`Teléfono: ${data.telefonoPaciente}`);
  doc.moveDown(1);

  const headerY = doc.y;
  doc.roundedRect(42, headerY, 528, 28, 6).fill('#f4f1ff');
  doc.fillColor('#4338ca').fontSize(11).font('Helvetica-Bold').text('Medicamentos', 56, headerY + 8);
  doc.font('Helvetica');
  doc.y = headerY + 42;

  medications.forEach((item, index) => {
    let y = doc.y;
    if (y > 680) {
      doc.addPage();
      y = doc.y;
    }
    doc.roundedRect(42, doc.y, 528, 72, 6).stroke('#dde2ee');
    doc.fontSize(10).fillColor('#111827').font('Helvetica-Bold')
      .text(`${index + 1}. ${item.nombre}`, 56, y + 10, { width: 500 });
    doc.font('Helvetica').fillColor('#4b5563');
    doc.text(`Dosis: ${item.dosis || 'N/D'}`, 56, y + 32, { width: 245 });
    doc.text(`Frecuencia: ${item.frecuencia || 'N/D'}`, 305, y + 32, { width: 245 });
    doc.text(`Duración: ${item.duracion || 'N/D'}`, 56, y + 52, { width: 500 });
    doc.y = y + 84;
  });

  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#6b7280')
    .text('Documento generado desde la consulta activa. Siga las indicaciones del profesional tratante.', { align: 'center' });
  drawDocumentFooter(doc);
}

async function savePrescriptionPdf(conn, consultationId, medications) {
  if (!medications.length) return null;

  const [rows] = await conn.execute(
    `SELECT ca.idconsultaActiva, ca.cita_idcita, ca.paciente_idPaciente,
            c.fechaCita, c.horaCita,
            p.nombre AS nombrePaciente, p.apellido AS apellidoPaciente, p.telefono AS telefonoPaciente,
            d.nombre AS nombreDoctor, d.apellido AS apellidoDoctor
       FROM consulta_activa ca
       JOIN cita c ON c.idcita = ca.cita_idcita
       JOIN paciente p ON p.idPaciente = ca.paciente_idPaciente
       LEFT JOIN doctor d ON d.iddoctor = ca.doctor_iddoctor
      WHERE ca.idconsultaActiva = ?
      LIMIT 1`,
    [consultationId]
  );
  const data = rows[0];
  if (!data) return null;

  const fileName = `receta-medica-consulta-${consultationId}.pdf`;
  const originalName = `Receta médica consulta ${consultationId}.pdf`;
  const { absoluteDir, publicPath } = patientUploadPath(data.paciente_idPaciente, 'recetas', fileName);
  await fs.mkdir(absoluteDir, { recursive: true });
  const absolutePath = path.join(absoluteDir, fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 42 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', async () => {
      try {
        await fs.writeFile(absolutePath, Buffer.concat(chunks));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    try {
      writePrescriptionContent(doc, data, medications);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });

  const stat = await fs.stat(absolutePath);
  const [existing] = await conn.execute(
    `SELECT idarchivoConsulta
       FROM consulta_activa_archivos
      WHERE consulta_activa_id = ?
        AND nombre_archivo = ?
      LIMIT 1`,
    [consultationId, fileName]
  );

  if (existing[0]) {
    await conn.execute(
      `UPDATE consulta_activa_archivos
          SET nombre_original = ?, ruta = ?, mime_type = 'application/pdf', tamano = ?, created_at = CURRENT_TIMESTAMP
        WHERE idarchivoConsulta = ?`,
      [originalName, publicPath, stat.size, existing[0].idarchivoConsulta]
    );
  } else {
    await conn.execute(
      `INSERT INTO consulta_activa_archivos
        (consulta_activa_id, nombre_original, nombre_archivo, ruta, mime_type, tamano)
       VALUES (?, ?, ?, ?, 'application/pdf', ?)`,
      [consultationId, originalName, fileName, publicPath, stat.size]
    );
  }

  return { originalName, fileName, publicPath, mimeType: 'application/pdf', size: stat.size };
}

function buildAllergyGroups(patient) {
  const details = parseMaybeJson(patient.fichaDetallesJson);
  const items = [];
  const push = (flag, label, fallback, detailKey) => {
    const detail = String(details[detailKey] || details[flag] || '').trim();
    if (detail) {
      items.push({ tipo: label, detalles: [detail] });
      return;
    }
    if (Number(patient[flag] || 0) === 1) items.push({ tipo: label, detalles: [fallback] });
  };

  push('alergias', 'Alergias generales', 'Alergias registradas', 'alergias_detalle');
  push('alergia_medicamento', 'Alergia a medicamento', 'Medicamentos registrados como alergia', 'alergia_medicamento_detalle');
  push('alergia_material_odontologico', 'Alergia a material odontológico', 'Material odontológico registrado como alergia', 'alergia_material_odontologico_detalle');
  return items;
}

async function loadInventoryProductOptions() {
  return query(
    `SELECT p.id, p.nombre, p.precio, p.descripcion,
            c.nombre AS categoria,
            m.nombre AS marca,
            COALESCE(inv.stock_actual, p.stock, 0) AS stock_actual,
            COALESCE(inv.stock_seguridad, 0) AS stock_minimo
       FROM producto p
       LEFT JOIN categoria c ON c.idcategoria = p.categoria_id
       LEFT JOIN marca m ON m.id = p.marca_id
       LEFT JOIN (
         SELECT producto_id, MAX(stock_actual) AS stock_actual, MAX(stock_seguridad) AS stock_seguridad
           FROM inventario
          GROUP BY producto_id
       ) inv ON inv.producto_id = p.id
      ORDER BY p.nombre`
  );
}

async function loadConsultationMaterials(consultationId) {
  if (!(await inventoryConsumptionReady())) return { ready: false, rows: [] };
  const rows = await query(
    `SELECT cam.idconsultaActivaMaterial, cam.consulta_activa_id, cam.cita_idcita,
            cam.servicio_idservicio, cam.tiposervicio_idtiposervicio, cam.producto_id,
            cam.cantidad, cam.motivo, cam.movimiento_id, cam.created_at,
            p.nombre AS producto, p.precio,
            s.nombre AS servicio, ts.nombre AS tratamiento
       FROM consulta_activa_materiales cam
       JOIN producto p ON p.id = cam.producto_id
       LEFT JOIN servicio s ON s.idservicio = cam.servicio_idservicio
       LEFT JOIN tiposervicio ts ON ts.idtipoServicio = cam.tiposervicio_idtiposervicio
      WHERE cam.consulta_activa_id = ?
      ORDER BY cam.idconsultaActivaMaterial ASC`,
    [consultationId]
  );
  return { ready: true, rows };
}

async function patientBloodTypeColumn() {
  return (await tableHasColumn('paciente', 'tipoSangre')) ? 'tipoSangre' : null;
}

async function fichaDetailsColumn() {
  return (await tableHasColumn('fichamedica', 'ficha_respuestas_json')) ? 'ficha_respuestas_json' : null;
}

async function startActiveConsultation(appointmentId) {
  await ensureActiveConsultationStorage();
  const enConsultaId = await ensureAppointmentStatus('En consulta', 'Paciente dentro de consulta');
  const pool = await initPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [appointments] = await conn.execute(
      `SELECT c.idcita, c.paciente_idPaciente, c.doctor_iddoctor, c.estadoCita_idestadoCita,
              ec.nombre AS estado_nombre,
              CASE WHEN DATE(c.fechaCita) > CURDATE() THEN 1 ELSE 0 END AS es_futura
         FROM cita c
         LEFT JOIN estadocita ec ON ec.idestadoCita = c.estadoCita_idestadoCita
        WHERE c.idcita = ?
        LIMIT 1
        FOR UPDATE`,
      [appointmentId]
    );
    const appointment = appointments[0];
    if (!appointment) throw httpError(404, 'Cita no encontrada.');

    const status = normalizeStatusName(appointment.estado_nombre);
    if (['cancelada', 'atendida', 'finalizada'].includes(status)) {
      throw httpError(409, 'Esta cita ya no se puede iniciar como consulta activa.');
    }
    if (Number(appointment.es_futura || 0) === 1) {
      throw httpError(409, 'No puedes iniciar consulta para una cita futura. Puedes editarla o cancelarla.');
    }

    const [existingRows] = await conn.execute(
      'SELECT idconsultaActiva, estado FROM consulta_activa WHERE cita_idcita = ? LIMIT 1',
      [appointment.idcita]
    );
    let activeId = existingRows[0]?.idconsultaActiva;

    if (!activeId) {
      const [created] = await conn.execute(
        `INSERT INTO consulta_activa (cita_idcita, paciente_idPaciente, doctor_iddoctor)
         VALUES (?, ?, ?)`,
        [appointment.idcita, appointment.paciente_idPaciente, appointment.doctor_iddoctor]
      );
      activeId = created.insertId;
    } else if (normalizeStatusName(existingRows[0].estado) === 'finalizada') {
      throw httpError(409, 'La consulta de esta cita ya fue finalizada.');
    }

    await conn.execute(
      'UPDATE cita SET estadoCita_idestadoCita = ? WHERE idcita = ?',
      [enConsultaId, appointment.idcita]
    );

    await conn.commit();
    return { idconsultaActiva: activeId };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function loadPreviousVisits(patientId, currentAppointmentId) {
  return query(
    `SELECT c.idcita, c.fechaCita, c.horaCita, c.motivoCita,
            ec.nombre AS estado_nombre,
            d.nombre AS doctor_nombre, d.apellido AS doctor_apellido
       FROM cita c
       LEFT JOIN estadocita ec ON ec.idestadoCita = c.estadoCita_idestadoCita
       LEFT JOIN doctor d ON d.iddoctor = c.doctor_iddoctor
      WHERE c.paciente_idPaciente = ?
        AND c.idcita <> ?
        AND TIMESTAMP(c.fechaCita, COALESCE(c.horaCita, '00:00:00')) <= NOW()
      ORDER BY c.fechaCita DESC, c.horaCita DESC
      LIMIT 5`,
    [patientId, currentAppointmentId]
  );
}

async function loadClinicalHistory(patientId, currentConsultationId) {
  const legacyHistory = await query(
    `SELECT hc.idhistorialClinico AS id,
            hc.fecharegistro AS fecha,
            co.descripcion AS diagnostico,
            co.nopieza AS piezaDental,
            d.nombre AS doctor_nombre,
            d.apellido AS doctor_apellido,
            'historial' AS origen
       FROM historial_clinico hc
       JOIN consulta co ON co.idconsulta = hc.consulta_idconsulta
      JOIN cita ci ON ci.idcita = co.cita_idcita
      LEFT JOIN doctor d ON d.iddoctor = hc.doctor_iddoctor
      WHERE ci.paciente_idPaciente = ?
        AND ci.idcita <> (
          SELECT cita_idcita
            FROM consulta_activa
           WHERE idconsultaActiva = ?
           LIMIT 1
        )
      ORDER BY hc.fecharegistro DESC
      LIMIT 12`,
    [patientId, currentConsultationId]
  );

  const activeHistory = await query(
    `SELECT ca.idconsultaActiva AS id,
            COALESCE(ca.finalized_at, ca.updated_at, ca.created_at) AS fecha,
            ca.diagnosticoPrincipal AS diagnostico,
            NULL AS piezaDental,
            d.nombre AS doctor_nombre,
            d.apellido AS doctor_apellido,
            'consulta_activa' AS origen
       FROM consulta_activa ca
       LEFT JOIN doctor d ON d.iddoctor = ca.doctor_iddoctor
      WHERE ca.paciente_idPaciente = ?
        AND ca.idconsultaActiva <> ?
        AND ca.estado = 'finalizada'
      ORDER BY fecha DESC
      LIMIT 12`,
    [patientId, currentConsultationId]
  );

  return legacyHistory
    .concat(activeHistory)
    .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))
    .slice(0, 12);
}

function groupQuotations(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.id_cotizacion)) {
      grouped.set(row.id_cotizacion, {
        id_cotizacion: row.id_cotizacion,
        fecha_cotizacion: row.fecha_cotizacion,
        costo_total: Number(row.costo_total || 0),
        estado: row.estado,
        notas_adicionales: row.notas_adicionales,
        detalles: [],
      });
    }
    if (row.id_detalle) {
      grouped.get(row.id_cotizacion).detalles.push({
        id_detalle: row.id_detalle,
        diente: row.diente,
        nombre: row.nombre || row.nombre_servicio || row.nombre_tratamiento || 'Procedimiento',
        nombre_servicio: row.nombre_servicio,
        nombre_tratamiento: row.nombre_tratamiento,
        descripcion: row.descripcion || row.notas_detalle || '',
        cantidad: Number(row.cantidad || 1),
        precio: Number(row.precio || row.costo_servicio || 0),
        costo_servicio: Number(row.costo_servicio || 0),
      });
    }
  }
  return Array.from(grouped.values()).map(quote => {
    const totals = calculateQuotationTotals(quote.detalles, quote.costo_total);
    return {
      ...quote,
      subtotal: totals.subtotal,
      impuestos: totals.impuestos,
      costo_total: totals.total,
    };
  });
}

function detailLineSubtotal(item) {
  const stored = Number(item.costo_servicio || 0);
  if (stored > 0) return stored;
  return Number(item.cantidad || 1) * Number(item.precio || 0);
}

function calculateQuotationTotals(details = [], fallbackTotal = 0) {
  const subtotal = details.length
    ? details.reduce((sum, item) => sum + detailLineSubtotal(item), 0)
    : Math.max(Number(fallbackTotal || 0), 0);
  const impuestos = Number((subtotal * QUOTATION_TAX_RATE).toFixed(2));
  const total = Number((subtotal + impuestos).toFixed(2));
  return { subtotal: Number(subtotal.toFixed(2)), impuestos, total };
}

function formatMoney(value) {
  return `Q${Number(value || 0).toFixed(2)}`;
}

async function loadLatestQuotationForConsultation(conn, consultation) {
  const consultationId = Number(consultation.idconsultaActiva || consultation.consulta_activa_id || 0);
  const appointmentId = Number(consultation.cita_idcita || 0);
  if (!consultationId && !appointmentId) return null;

  const [rows] = await conn.execute(
    `SELECT c.id_cotizacion, c.fecha_cotizacion, c.costo_total, c.notas_adicionales,
            d.id_detalle, d.diente, d.nombre, d.descripcion, d.cantidad, d.precio,
            d.costo_servicio, d.notas AS notas_detalle, d.id_servicio, d.id_tratamiento,
            s.nombre AS nombre_servicio, ts.nombre AS nombre_tratamiento
       FROM cotizaciones c
       LEFT JOIN detalle_cotizaciones d ON d.id_cotizacion = c.id_cotizacion
       LEFT JOIN servicio s ON s.idservicio = d.id_servicio
       LEFT JOIN tiposervicio ts ON ts.idtipoServicio = d.id_tratamiento
      WHERE c.id_cotizacion = (
        SELECT MAX(c2.id_cotizacion)
          FROM cotizaciones c2
         WHERE (? > 0 AND c2.consulta_activa_id = ?)
            OR (? > 0 AND c2.cita_idcita = ?)
      )
      ORDER BY d.id_detalle ASC`,
    [consultationId, consultationId, appointmentId, appointmentId]
  );

  if (!rows.length) return null;
  const details = rows
    .filter(row => row.id_detalle)
    .map(row => ({
      id_detalle: row.id_detalle,
      diente: row.diente,
      nombre: row.nombre || row.nombre_servicio || row.nombre_tratamiento || 'Procedimiento',
      nombre_servicio: row.nombre_servicio,
      nombre_tratamiento: row.nombre_tratamiento,
      descripcion: row.descripcion || row.notas_detalle || '',
      cantidad: Number(row.cantidad || 1),
      precio: Number(row.precio || row.costo_servicio || 0),
      costo_servicio: Number(row.costo_servicio || 0),
      id_servicio: Number(row.id_servicio || 0),
      id_tratamiento: Number(row.id_tratamiento || 0),
    }));

  const totals = calculateQuotationTotals(details, rows[0].costo_total);
  return {
    id_cotizacion: rows[0].id_cotizacion,
    fecha_cotizacion: rows[0].fecha_cotizacion,
    costo_total: totals.total,
    subtotal: totals.subtotal,
    impuestos: totals.impuestos,
    detalles: details,
  };
}

function summarizeQuotationTeeth(quotation) {
  const details = Array.isArray(quotation?.detalles) ? quotation.detalles : [];
  const teeth = [...new Set(details.map(item => String(item.diente || '').trim()).filter(Boolean))];
  if (!teeth.length) return 'N/A';
  if (teeth.includes('1-32')) return '1-32';
  return teeth.join(', ').slice(0, 200);
}

function buildLegacyConsultationDescription(consultation, quotation) {
  const clinicalNotes = [
    consultation.motivoConsulta && `Motivo: ${consultation.motivoConsulta}`,
    consultation.sintomas && `Sintomas: ${consultation.sintomas}`,
    consultation.diagnosticoPrincipal && `Diagnostico principal: ${consultation.diagnosticoPrincipal}`,
    consultation.diagnosticoSecundario && `Diagnostico secundario: ${consultation.diagnosticoSecundario}`,
    consultation.tratamiento && `Tratamiento: ${consultation.tratamiento}`,
    consultation.evolucion && `Evolucion: ${consultation.evolucion}`,
    consultation.observaciones && `Observaciones: ${consultation.observaciones}`,
  ].filter(Boolean).join('\n\n') || 'Consulta finalizada sin notas adicionales.';

  const details = Array.isArray(quotation?.detalles) ? quotation.detalles : [];
  if (!quotation || !details.length) return clinicalNotes;

  const serviceLines = details.map((item, index) => {
    const title = [item.nombre_tratamiento, item.nombre_servicio].filter(Boolean).join(' / ') || item.nombre || 'Servicio';
    const tooth = item.diente ? `Diente ${item.diente}` : 'Sin diente';
    const quantity = Number(item.cantidad || 1);
    const subtotal = detailLineSubtotal(item);
    const description = item.descripcion ? ` - ${item.descripcion}` : '';
    return `${index + 1}. ${title} - ${tooth} - Cant. ${quantity} - ${formatMoney(subtotal)}${description}`;
  });

  const totals = calculateQuotationTotals(details, quotation.costo_total);
  const chargeSummary = [
    'Cotización:',
    ...serviceLines,
    `Subtotal: ${formatMoney(totals.subtotal)}`,
    `IVA 12%: ${formatMoney(totals.impuestos)}`,
    `Total: ${formatMoney(totals.total)}`,
  ].join('\n');

  return [clinicalNotes, chargeSummary].filter(Boolean).join('\n\n');
}

async function loadActiveConsultationData(consultationId) {
  await ensureActiveConsultationStorage();
  const bloodColumn = await patientBloodTypeColumn();
  const detailsColumn = await fichaDetailsColumn();

  const [consultation] = await query(
    `SELECT ca.*,
            c.fechaCita, c.horaCita, c.motivoCita, c.notasAdicionales, c.estadoCita_idestadoCita,
            ec.nombre AS estado_cita,
            p.idPaciente, p.nombre AS nombrePaciente, p.apellido AS apellidoPaciente,
            p.telefono AS telefonoPaciente, p.email AS emailPaciente, p.edad,
            ${bloodColumn ? `p.${bloodColumn}` : 'NULL'} AS tipoSangre,
            fm.alergias, fm.alergia_material_odontologico, fm.alergia_medicamento,
            ${detailsColumn ? `fm.${detailsColumn}` : 'NULL'} AS fichaDetallesJson,
            d.nombre AS nombreDoctor, d.apellido AS apellidoDoctor
       FROM consulta_activa ca
       JOIN cita c ON c.idcita = ca.cita_idcita
       JOIN paciente p ON p.idPaciente = ca.paciente_idPaciente
       LEFT JOIN fichamedica fm ON fm.idFicha = p.fichaMedica_idfichaMedica
       LEFT JOIN doctor d ON d.iddoctor = ca.doctor_iddoctor
       LEFT JOIN estadocita ec ON ec.idestadoCita = c.estadoCita_idestadoCita
      WHERE ca.idconsultaActiva = ?
      LIMIT 1`,
    [consultationId]
  );

  if (!consultation) throw httpError(404, 'Consulta activa no encontrada.');

  const [medicamentos, archivos, quotationRows, ultimasVisitas, historial, servicios, tiposServicios, productosInventario, materialData] = await Promise.all([
    query(
      `SELECT idmedicamento, nombre, dosis, frecuencia, duracion
         FROM consulta_activa_medicamentos
        WHERE consulta_activa_id = ?
        ORDER BY idmedicamento ASC`,
      [consultationId]
    ),
    query(
      `SELECT idarchivoConsulta, nombre_original, ruta, mime_type, tamano, created_at
         FROM consulta_activa_archivos
        WHERE consulta_activa_id = ?
        ORDER BY created_at DESC`,
      [consultationId]
    ),
    query(
      `SELECT c.id_cotizacion, c.fecha_cotizacion, c.costo_total, c.notas_adicionales, c.estado,
              d.id_detalle, d.diente, d.nombre, d.descripcion, d.cantidad, d.precio,
              d.costo_servicio, d.notas AS notas_detalle,
              ts.nombre AS nombre_tratamiento, s.nombre AS nombre_servicio
         FROM cotizaciones c
         LEFT JOIN detalle_cotizaciones d ON d.id_cotizacion = c.id_cotizacion
         LEFT JOIN tiposervicio ts ON ts.idtipoServicio = d.id_tratamiento
         LEFT JOIN servicio s ON s.idservicio = d.id_servicio
        WHERE c.consulta_activa_id = ?
        ORDER BY c.id_cotizacion DESC, d.id_detalle ASC`,
      [consultationId]
    ),
    loadPreviousVisits(consultation.idPaciente, consultation.cita_idcita),
    loadClinicalHistory(consultation.idPaciente, consultationId),
    query('SELECT idservicio, nombre, precio FROM servicio ORDER BY nombre'),
    query('SELECT idtipoServicio AS idtiposervicio, nombre FROM tiposervicio ORDER BY nombre'),
    loadInventoryProductOptions(),
    loadConsultationMaterials(consultationId),
  ]);

  return {
    consulta: consultation,
    paciente: {
      idPaciente: consultation.idPaciente,
      nombre: consultation.nombrePaciente,
      apellido: consultation.apellidoPaciente,
      telefono: consultation.telefonoPaciente,
      email: consultation.emailPaciente,
      edad: consultation.edad,
      tipoSangre: consultation.tipoSangre,
      alergias: buildAllergyGroups(consultation),
    },
    doctor: {
      nombre: consultation.nombreDoctor,
      apellido: consultation.apellidoDoctor,
    },
    medicamentos,
    archivos,
    cotizaciones: groupQuotations(quotationRows),
    ultimasVisitas,
    historial,
    servicios,
    tiposServicios,
    productosInventario,
    materialesConsumidos: materialData.rows,
    inventarioConsultaListo: materialData.ready,
  };
}

async function assertConsultationEditable(conn, consultationId) {
  const [rows] = await conn.execute(
    `SELECT idconsultaActiva, estado, cita_idcita, paciente_idPaciente, doctor_iddoctor
       FROM consulta_activa
      WHERE idconsultaActiva = ?
      LIMIT 1`,
    [consultationId]
  );
  const consultation = rows[0];
  if (!consultation) throw httpError(404, 'Consulta activa no encontrada.');
  if (normalizeStatusName(consultation.estado) === 'finalizada') {
    throw httpError(423, 'La consulta ya fue finalizada y no se puede editar.');
  }
  return consultation;
}

async function updateConsultationFields(consultationId, fields) {
  await ensureActiveConsultationStorage();
  const allowed = [
    'motivoConsulta',
    'sintomas',
    'observaciones',
    'evolucion',
    'diagnosticoPrincipal',
    'diagnosticoSecundario',
    'tratamiento',
    'proximaCita',
  ];
  const entries = allowed
    .filter(field => Object.prototype.hasOwnProperty.call(fields, field))
    .map(field => [field, fields[field] || null]);
  if (!entries.length) return { success: true };

  const assignments = entries.map(([field]) => `${field} = ?`).join(', ');
  const values = entries.map(([, value]) => value);
  const result = await query(
    `UPDATE consulta_activa
        SET ${assignments}, updated_at = CURRENT_TIMESTAMP
      WHERE idconsultaActiva = ?
        AND estado = 'activa'`,
    [...values, consultationId]
  );
  if (!result.affectedRows) throw httpError(423, 'La consulta no se puede editar.');
  return { success: true };
}

async function replaceMedications(consultationId, medicamentos) {
  await ensureActiveConsultationStorage();
  const pool = await initPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    await assertConsultationEditable(conn, consultationId);
    await conn.execute('DELETE FROM consulta_activa_medicamentos WHERE consulta_activa_id = ?', [consultationId]);

    const validItems = medicamentos
      .map(item => ({
        nombre: String(item.nombre || '').trim(),
        dosis: String(item.dosis || '').trim(),
        frecuencia: String(item.frecuencia || '').trim(),
        duracion: String(item.duracion || '').trim(),
      }))
      .filter(item => item.nombre);

    for (const item of validItems) {
      await conn.execute(
        `INSERT INTO consulta_activa_medicamentos (consulta_activa_id, nombre, dosis, frecuencia, duracion)
         VALUES (?, ?, ?, ?, ?)`,
        [consultationId, item.nombre, item.dosis || null, item.frecuencia || null, item.duracion || null]
      );
    }

    const prescriptionFile = await savePrescriptionPdf(conn, consultationId, validItems);

    await conn.commit();
    return { success: true, total: validItems.length, prescriptionFile };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

function normalizeMaterialItem(item) {
  return {
    productoId: Number(item.productoId || item.producto_id || 0),
    servicioId: Number(item.servicioId || item.servicio || 0) || null,
    tratamientoId: Number(item.tratamientoId || item.tipoServicio || item.tiposervicio_idtiposervicio || 0) || null,
    cantidad: Math.max(Number(item.cantidad || 0), 0),
    motivo: String(item.motivo || '').trim() || 'Material utilizado en consulta',
  };
}

async function replaceConsultationMaterials(consultationId, materiales) {
  await ensureActiveConsultationStorage();
  if (!(await inventoryConsumptionReady())) {
    throw httpError(500, 'Falta crear la tabla consulta_activa_materiales para registrar materiales consumidos. Ejecuta manualmente el SQL compartido en el chat.');
  }
  const pool = await initPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const consultation = await assertConsultationEditable(conn, consultationId);
    const [consumed] = await conn.execute(
      `SELECT 1
         FROM consulta_activa_materiales
        WHERE consulta_activa_id = ?
          AND movimiento_id IS NOT NULL
        LIMIT 1`,
      [consultationId]
    );
    if (consumed[0]) throw httpError(423, 'Los materiales ya fueron descontados y no se pueden editar.');

    await conn.execute('DELETE FROM consulta_activa_materiales WHERE consulta_activa_id = ?', [consultationId]);
    const validItems = materiales.map(normalizeMaterialItem).filter(item => item.productoId && item.cantidad > 0);
    for (const item of validItems) {
      await conn.execute(
        `INSERT INTO consulta_activa_materiales
          (consulta_activa_id, cita_idcita, servicio_idservicio, tiposervicio_idtiposervicio, producto_id, cantidad, motivo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          consultation.idconsultaActiva,
          consultation.cita_idcita,
          item.servicioId,
          item.tratamientoId,
          item.productoId,
          item.cantidad,
          item.motivo,
        ]
      );
    }
    await conn.commit();
    return { success: true, total: validItems.length };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function consumeConsultationMaterials(conn, consultation) {
  if (!(await inventoryConsumptionReady())) return;
  const [materials] = await conn.execute(
    `SELECT cam.idconsultaActivaMaterial, cam.producto_id, cam.cantidad, cam.motivo,
            p.nombre AS producto, s.nombre AS servicio, ts.nombre AS tratamiento
       FROM consulta_activa_materiales cam
       JOIN producto p ON p.id = cam.producto_id
       LEFT JOIN servicio s ON s.idservicio = cam.servicio_idservicio
       LEFT JOIN tiposervicio ts ON ts.idtipoServicio = cam.tiposervicio_idtiposervicio
      WHERE cam.consulta_activa_id = ?
        AND cam.movimiento_id IS NULL
      ORDER BY cam.idconsultaActivaMaterial ASC`,
    [consultation.idconsultaActiva]
  );

  for (const item of materials) {
    const title = [item.tratamiento, item.servicio].filter(Boolean).join(' / ') || 'Consulta activa';
    const movement = await addInventoryMovement(conn, {
      productoId: item.producto_id,
      cantidad: item.cantidad,
      motivo: `${title}: ${item.motivo || 'material utilizado'}`,
      nombreProducto: item.producto,
      consultaActivaId: consultation.idconsultaActiva,
    });
    await conn.execute(
      `UPDATE consulta_activa_materiales
          SET movimiento_id = ?
        WHERE idconsultaActivaMaterial = ?`,
      [movement.id, item.idconsultaActivaMaterial]
    );
  }
}

function normalizeTeeth(value) {
  if (value === '1-32') return ['1-32'];
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }
  const single = String(value || '').trim();
  return single ? [single] : [];
}

function normalizeProcedure(procedure) {
  const cantidad = Math.max(Number(procedure.cantidad || 1), 1);
  const precio = Math.max(Number(procedure.precio || procedure.costoServicio || 0), 0);
  const dientes = normalizeTeeth(procedure.dientes || procedure.piezaDental || procedure.diente);
  return {
    dientes,
    tipoServicio: Number(procedure.tipoServicio || procedure.id_tratamiento || 0),
    servicio: Number(procedure.servicio || procedure.id_servicio || 0),
    nombre: String(procedure.nombre || '').trim(),
    descripcion: String(procedure.descripcion || '').trim(),
    cantidad,
    precio,
    subtotal: cantidad * precio,
  };
}

async function createConsultationQuotation(consultationId, procedimientos) {
  await ensureActiveConsultationStorage();
  const pool = await initPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const consultation = await assertConsultationEditable(conn, consultationId);
    let normalized = procedimientos.map(normalizeProcedure);
    const serviceIds = [...new Set(normalized.map(item => item.servicio).filter(Boolean))];
    const servicePrices = new Map();

    if (serviceIds.length) {
      const placeholders = serviceIds.map(() => '?').join(', ');
      const [serviceRows] = await conn.execute(
        `SELECT idservicio, precio FROM servicio WHERE idservicio IN (${placeholders})`,
        serviceIds
      );
      serviceRows.forEach(row => servicePrices.set(Number(row.idservicio), Number(row.precio || 0)));
    }

    normalized = normalized
      .map(item => {
        const price = item.precio > 0 ? item.precio : Number(servicePrices.get(item.servicio) || 0);
        return { ...item, precio: price, subtotal: item.cantidad * price };
      })
      .filter(item => item.dientes.length && item.tipoServicio && item.servicio && item.precio > 0);

    if (!normalized.length) throw httpError(400, 'Agrega al menos un procedimiento con dientes, tratamiento, servicio y precio.');

    const details = normalized.flatMap(item => {
      const dientes = item.dientes.includes('1-32') ? ['1-32'] : item.dientes;
      return dientes.map(diente => ({
        ...item,
        diente: String(diente).slice(0, 5),
        subtotal: item.cantidad * item.precio,
      }));
    });

    const { subtotal, impuestos, total } = calculateQuotationTotals(details);

    const [created] = await conn.execute(
      `INSERT INTO cotizaciones (id_paciente, cita_idcita, consulta_activa_id, costo_total, notas_adicionales, estado)
       VALUES (?, ?, ?, ?, ?, 'activa')`,
      [
        consultation.paciente_idPaciente,
        consultation.cita_idcita,
        consultation.idconsultaActiva,
        total,
        `Subtotal: Q${subtotal.toFixed(2)} | IVA 12%: Q${impuestos.toFixed(2)}`,
      ]
    );

    const idCotizacion = created.insertId;
    for (const item of details) {
      await conn.execute(
        `INSERT INTO detalle_cotizaciones
          (id_cotizacion, diente, id_servicio, id_tratamiento, costo_servicio, notas, nombre, descripcion, cantidad, precio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idCotizacion,
          item.diente,
          item.servicio,
          item.tipoServicio,
          item.subtotal,
          item.descripcion || null,
          item.nombre,
          item.descripcion || null,
          item.cantidad,
          item.precio,
        ]
      );
    }

    await conn.commit();
    return { id_cotizacion: idCotizacion, subtotal, impuestos, total };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function loadQuotationDocumentData(consultationId, quotationId) {
  const data = await loadActiveConsultationData(consultationId);
  const cotizacion = data.cotizaciones.find(item => Number(item.id_cotizacion) === Number(quotationId));
  if (!cotizacion) throw httpError(404, 'Cotización no encontrada para esta consulta.');
  return { ...data, cotizacion };
}

async function addConsultationAttachment(consultationId, file) {
  await ensureActiveConsultationStorage();
  const pool = await initPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    await assertConsultationEditable(conn, consultationId);
    const [created] = await conn.execute(
      `INSERT INTO consulta_activa_archivos
        (consulta_activa_id, nombre_original, nombre_archivo, ruta, mime_type, tamano)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [consultationId, file.originalName, file.fileName, file.publicPath, file.mimeType, file.size]
    );
    await conn.commit();
    return { idarchivoConsulta: created.insertId };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function saveActiveConsultationToLegacyHistory(conn, consultation) {
  try {
    const [existing] = await conn.execute(
      'SELECT idconsulta FROM consulta WHERE cita_idcita = ? LIMIT 1',
      [consultation.cita_idcita]
    );
    if (existing[0]) {
      const legacyId = existing[0].idconsulta;
      const [history] = await conn.execute(
        'SELECT 1 FROM historial_clinico WHERE consulta_idconsulta = ? LIMIT 1',
        [legacyId]
      );
      if (!history[0]) {
        await conn.execute(
          'INSERT INTO historial_clinico (consulta_idconsulta, doctor_iddoctor) VALUES (?, ?)',
          [legacyId, consultation.doctor_iddoctor || null]
        );
      }
      return legacyId;
    }

    const quotation = await loadLatestQuotationForConsultation(conn, consultation);
    const mainDetail = quotation?.detalles?.find(item => item.id_servicio && item.id_tratamiento);
    let serviceId = mainDetail?.id_servicio;
    let typeId = mainDetail?.id_tratamiento;

    if (!serviceId) {
      const [services] = await conn.execute('SELECT idservicio FROM servicio ORDER BY idservicio LIMIT 1');
      serviceId = services[0]?.idservicio;
    }
    if (!typeId) {
      const [types] = await conn.execute('SELECT idtipoServicio FROM tiposervicio ORDER BY idtipoServicio LIMIT 1');
      typeId = types[0]?.idtipoServicio;
    }
    if (!serviceId || !typeId) return;

    const description = buildLegacyConsultationDescription(consultation, quotation);

    const [created] = await conn.execute(
      `INSERT INTO consulta
        (nopieza, servicio_idservicio, tiposervicio_idtiposervicio, descripcion, proximaCita, cita_idcita)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [summarizeQuotationTeeth(quotation), serviceId, typeId, description, consultation.proximaCita || null, consultation.cita_idcita]
    );

    await conn.execute(
      'INSERT INTO historial_clinico (consulta_idconsulta, doctor_iddoctor) VALUES (?, ?)',
      [created.insertId, consultation.doctor_iddoctor || null]
    );
    return created.insertId;
  } catch (error) {
    console.warn('[consulta_activa] No se pudo guardar en historial_clinico:', error.message);
  }
}

async function syncFinalizedActiveConsultations(limit = 50) {
  await ensureActiveConsultationStorage();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const pool = await initPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT ca.*, c.motivoCita, c.notasAdicionales
         FROM consulta_activa ca
         JOIN cita c ON c.idcita = ca.cita_idcita
         LEFT JOIN consulta co ON co.cita_idcita = ca.cita_idcita
        WHERE ca.estado = 'finalizada'
          AND co.idconsulta IS NULL
        ORDER BY ca.finalized_at DESC, ca.updated_at DESC
        LIMIT ${safeLimit}`
    );

    let created = 0;
    for (const consultation of rows) {
      const legacyId = await saveActiveConsultationToLegacyHistory(conn, consultation);
      if (legacyId) created += 1;
    }

    await conn.commit();
    return { success: true, created };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function finalizeConsultation(consultationId) {
  await ensureActiveConsultationStorage();
  const finalizadaId = await ensureAppointmentStatus('Finalizada', 'Consulta finalizada');
  const pool = await initPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT *
         FROM consulta_activa
        WHERE idconsultaActiva = ?
        LIMIT 1
        FOR UPDATE`,
      [consultationId]
    );
    const consultation = rows[0];
    if (!consultation) throw httpError(404, 'Consulta activa no encontrada.');

    let legacyConsultationId = null;
    if (normalizeStatusName(consultation.estado) !== 'finalizada') {
      await consumeConsultationMaterials(conn, consultation);
      await conn.execute(
        `UPDATE consulta_activa
            SET estado = 'finalizada',
                finalized_at = NOW(),
                updated_at = CURRENT_TIMESTAMP
          WHERE idconsultaActiva = ?`,
        [consultationId]
      );
      await conn.execute(
        'UPDATE cita SET estadoCita_idestadoCita = ? WHERE idcita = ?',
        [finalizadaId, consultation.cita_idcita]
      );
      consultation.estado = 'finalizada';
    }
    legacyConsultationId = await saveActiveConsultationToLegacyHistory(conn, consultation);

    await conn.commit();
    return { success: true, consultaId: legacyConsultationId || null };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  addConsultationAttachment,
  createConsultationQuotation,
  ensureActiveConsultationStorage,
  finalizeConsultation,
  loadActiveConsultationData,
  loadQuotationDocumentData,
  replaceConsultationMaterials,
  replaceMedications,
  startActiveConsultation,
  syncFinalizedActiveConsultations,
  updateConsultationFields,
};
