// routes/pagos.routes.js
const crypto = require('crypto');
const express = require('express');
const fs = require('fs/promises');
const Joi = require('joi');
const path = require('path');
const { query, initPool } = require('../database/db');
const { isAuthenticated, requirePermission } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { getAdminProfile } = require('../utils/adminProfile');
const { syncFinalizedActiveConsultations } = require('../utils/consultasActivas');
const { createNotification } = require('../utils/notificaciones');

const router = express.Router();
const canViewPayments = requirePermission('pagos:ver');
const canCreatePayments = requirePermission('pagos:crear');
const canRegisterPayments = requirePermission('pagos:abonar');

const filtroPagosSchema = Joi.object({
  fechaInicio: Joi.date().allow(null).empty(''),
  fechaFin: Joi.date().allow(null).empty(''),
  consulta_idconsulta: Joi.number().integer().allow(null).empty(''),
  metodo_pago_idmetodo_pago: Joi.number().integer().allow(null).empty(''),
});

const abonoSchema = Joi.object({
  idPago: Joi.number().integer().positive().required(),
  valorAbono: Joi.number().positive().required(),
  descripcionAbono: Joi.string().trim().allow('', null),
  fechaAbono: Joi.date().required(),
});

const idParam = Joi.object({ idPago: Joi.number().integer().positive().required() });

const pagoCreateSchema = Joi.object({
  fecha: Joi.date().required(),
  lugar: Joi.string().trim().allow('', null),
  saldo: Joi.number().positive().required(),
  abono: Joi.number().min(0).required(),
  nocuota: Joi.number().integer().min(1).required(),
  consulta_idconsulta: Joi.number().integer().positive().required(),
  tipopago_idtipoPago: Joi.number().integer().positive(),
  metodo_pago_idmetodo_pago: Joi.number().integer().positive(),
  tipoCobro: Joi.string().valid('completo', 'abonos', 'cuotas').default('completo'),
  detallesPago: Joi.string().trim().allow('', null),
}).or('tipopago_idtipoPago', 'metodo_pago_idmetodo_pago');

function makeHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  error.expose = true;
  return error;
}

async function dbRows(conn, sql, params = []) {
  if (conn) {
    const [rows] = await conn.execute(sql, params);
    return rows;
  }
  return query(sql, params);
}

async function tableExistsInDatabase(tableName, conn = null) {
  const rows = await dbRows(
    conn,
    `SELECT 1
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      LIMIT 1`,
    [tableName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function columnExistsInDatabase(tableName, columnName, conn = null) {
  const rows = await dbRows(
    conn,
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

function toSqlDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function sanitizeUploadName(name) {
  return path.basename(String(name || 'comprobante')).replace(/[^\w.\- ]+/g, '_').trim() || 'comprobante';
}

function patientFolderName(patientId) {
  return `PT${String(patientId || 0).padStart(4, '0')}`;
}

function parseMultipartForm(req, maxBytes = 12 * 1024 * 1024) {
  const contentType = String(req.headers['content-type'] || '');
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return Promise.reject(makeHttpError(400, 'Solicitud de archivo no valida.'));
  const boundary = boundaryMatch[1] || boundaryMatch[2];

  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;
    const fail = error => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    req.on('data', chunk => {
      total += chunk.length;
      if (total > maxBytes) {
        fail(makeHttpError(413, 'El archivo supera el limite permitido.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('error', fail);
    req.on('end', () => {
      if (settled) return;
      settled = true;

      const raw = Buffer.concat(chunks).toString('latin1');
      const parts = raw.split(`--${boundary}`);
      const fields = {};
      const files = [];

      for (const part of parts) {
        const trimmed = part.replace(/^\r\n/, '').replace(/\r\n$/, '');
        if (!trimmed || trimmed === '--') continue;
        const separator = trimmed.indexOf('\r\n\r\n');
        if (separator === -1) continue;
        const header = trimmed.slice(0, separator);
        let body = trimmed.slice(separator + 4);
        if (body.endsWith('\r\n')) body = body.slice(0, -2);

        const name = header.match(/name="([^"]+)"/i)?.[1];
        if (!name) continue;
        const filename = header.match(/filename="([^"]*)"/i)?.[1];
        if (filename) {
          const mimeType = header.match(/Content-Type:\s*([^\r\n]+)/i)?.[1] || 'application/octet-stream';
          const buffer = Buffer.from(body, 'latin1');
          if (buffer.length) files.push({ field: name, originalName: filename, mimeType, buffer, size: buffer.length });
        } else {
          fields[name] = Buffer.from(body, 'latin1').toString('utf8');
        }
      }

      resolve({ fields, files });
    });
  });
}

async function readRequestData(req) {
  const contentType = String(req.headers['content-type'] || '');
  if (contentType.includes('multipart/form-data')) return parseMultipartForm(req);
  return { fields: req.body || {}, files: [] };
}

async function storePaymentEvidence(file, patientId) {
  if (!file) return null;
  const allowed = ['image/', 'application/pdf'];
  if (!allowed.some(prefix => String(file.mimeType || '').startsWith(prefix))) {
    throw makeHttpError(400, 'La evidencia debe ser una imagen o PDF.');
  }
  const extension = path.extname(sanitizeUploadName(file.originalName)).slice(0, 12) || '.bin';
  const fileName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${extension}`;
  const folder = patientFolderName(patientId);
  const absoluteDir = path.join(process.cwd(), 'uploads', 'pacientes', folder, 'pagos');
  await fs.mkdir(absoluteDir, { recursive: true });
  await fs.writeFile(path.join(absoluteDir, fileName), file.buffer);
  return `/uploads/pacientes/${folder}/pagos/${fileName}`;
}

async function createReceipt(conn, { fecha, monto, pagoId, evidencePath }) {
  const safeAmount = Number(monto || 0);
  if (safeAmount <= 0 && !evidencePath) return null;
  const [created] = await conn.execute(
    'INSERT INTO recibo (fecha, monto, imagen, pago_idPago) VALUES (?, ?, ?, ?)',
    [toSqlDate(fecha) || toSqlDate(new Date()), safeAmount, evidencePath || null, pagoId]
  );
  return created.insertId;
}

function sendPaymentApiError(res, error, fallbackMessage) {
  const status = Number(error.status || 500);
  const message = error.expose || status < 500 ? error.message : fallbackMessage;
  return res.status(status).json({ success: false, message });
}

function parsePaymentChargeDetails(raw) {
  if (!raw) return [];
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw makeHttpError(400, 'El detalle de cotización no tiene un formato valido.');
  }
  if (!Array.isArray(parsed)) throw makeHttpError(400, 'El detalle de cotización debe ser una lista.');

  return parsed
    .map(item => {
      const cantidad = Math.max(Number(item.cantidad || 1), 1);
      const precio = Math.max(Number(item.precio || item.precioUnitario || 0), 0);
      const subtotal = Number((cantidad * precio).toFixed(2));
      return {
        servicioId: Number(item.servicioId || item.idservicio || 0) || null,
        tratamientoId: Number(item.tratamientoId || item.idtiposervicio || 0) || null,
        nombreServicio: String(item.servicio || item.nombreServicio || '').trim(),
        nombreTratamiento: String(item.tratamiento || item.nombreTratamiento || '').trim(),
        descripcion: String(item.descripcion || '').trim(),
        cantidad,
        precio,
        subtotal,
      };
    })
    .filter(item => item.nombreServicio && item.precio > 0 && item.subtotal > 0);
}

async function insertPaymentChargeDetails(conn, pagoId, details) {
  if (!details.length) return 0;
  if (!(await tableExistsInDatabase('detalle_pago_servicio', conn))) {
    throw makeHttpError(500, 'Falta crear la tabla detalle_pago_servicio para guardar el detalle de la cotización. Ejecuta manualmente el SQL compartido en el chat.');
  }

  for (const detail of details) {
    await conn.execute(
      `INSERT INTO detalle_pago_servicio
        (pago_idPago, servicio_idservicio, tiposervicio_idtiposervicio, nombre_servicio, nombre_tratamiento, descripcion, cantidad, precio_unitario, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pagoId,
        detail.servicioId,
        detail.tratamientoId,
        detail.nombreServicio,
        detail.nombreTratamiento || null,
        detail.descripcion || null,
        detail.cantidad,
        detail.precio,
        detail.subtotal,
      ]
    );
  }
  return details.length;
}

async function loadPaymentChargeDetails(pagoId) {
  if (!(await tableExistsInDatabase('detalle_pago_servicio'))) return [];
  return query(
    `SELECT iddetallePagoServicio, nombre_servicio, nombre_tratamiento, descripcion,
            cantidad, precio_unitario, subtotal, servicio_idservicio, tiposervicio_idtiposervicio
       FROM detalle_pago_servicio
      WHERE pago_idPago = ?
      ORDER BY iddetallePagoServicio ASC`,
    [pagoId]
  );
}

async function paymentBaseQuery() {
  const hasPaymentType = await columnExistsInDatabase('pago', 'tipo_cobro');
  const typeSelect = hasPaymentType
    ? 'pago.tipo_cobro AS tipoCobro,'
    : `CASE
         WHEN COALESCE(pago.saldo_restante, 0) <= 0 THEN 'completo'
         WHEN COALESCE(pago.nocuotas, 1) > 1 THEN 'cuotas'
         WHEN COALESCE(pago.abono, 0) > 0 THEN 'abonos'
         ELSE 'sin_pago'
       END AS tipoCobro,`;
  return `
    SELECT pago.idPago AS idpago, pago.fecha, pago.lugar, pago.saldo, pago.abono,
           pago.saldo_restante, pago.nocuotas,
           ${typeSelect}
           COALESCE(abonos.total_abonos, 0) AS abonosRegistrados,
           COALESCE(pago.abono, 0) + COALESCE(abonos.total_abonos, 0) AS totalAbonado,
           COALESCE(recibos.total_recibos, 0) AS recibosRegistrados,
           recibos.ultima_evidencia AS ultimaEvidencia,
           consulta.idconsulta AS ConsultaId, consulta.descripcion AS DescripcionConsulta,
           cita.idcita, cita.fechaCita, cita.horaCita, cita.motivoCita,
           mp.idmetodo_pago AS MetodoPagoId, mp.nombre AS nombreMetodoPago,
           paciente.idPaciente, paciente.nombre AS nombrePaciente, paciente.apellido AS apellidoPaciente,
           doctor.nombre AS nombreDoctor, doctor.apellido AS apellidoDoctor
      FROM pago
      LEFT JOIN (
        SELECT pago_idPago, SUM(COALESCE(valor, 0)) AS total_abonos
          FROM controlpago
         GROUP BY pago_idPago
      ) abonos ON abonos.pago_idPago = pago.idPago
      LEFT JOIN (
        SELECT pago_idPago, COUNT(*) AS total_recibos, MAX(imagen) AS ultima_evidencia
          FROM recibo
         GROUP BY pago_idPago
      ) recibos ON recibos.pago_idPago = pago.idPago
      LEFT JOIN consulta ON pago.consulta_idconsulta = consulta.idconsulta
      LEFT JOIN cita ON consulta.cita_idcita = cita.idcita
      LEFT JOIN paciente ON cita.paciente_idPaciente = paciente.idPaciente
      LEFT JOIN doctor ON cita.doctor_iddoctor = doctor.iddoctor
      LEFT JOIN metodo_pago mp ON pago.metodo_pago_idmetodo_pago = mp.idmetodo_pago
  `;
}

async function loadPayments(filters = {}) {
  let sql = `${await paymentBaseQuery()} WHERE 1=1`;
  const params = [];
  const fechaInicio = toSqlDate(filters.fechaInicio);
  const fechaFin = toSqlDate(filters.fechaFin);

  if (fechaInicio && fechaFin) {
    sql += ' AND pago.fecha BETWEEN ? AND ?';
    params.push(fechaInicio, fechaFin);
  }
  if (filters.consulta_idconsulta) {
    sql += ' AND pago.consulta_idconsulta = ?';
    params.push(filters.consulta_idconsulta);
  }
  if (filters.metodo_pago_idmetodo_pago) {
    sql += ' AND pago.metodo_pago_idmetodo_pago = ?';
    params.push(filters.metodo_pago_idmetodo_pago);
  }

  sql += ' ORDER BY pago.fecha DESC, pago.idPago DESC';
  return query(sql, params);
}

async function loadPaymentOptions() {
  const [serviceHasPrice, treatmentHasPrice] = await Promise.all([
    columnExistsInDatabase('servicio', 'precio'),
    columnExistsInDatabase('tiposervicio', 'precio'),
  ]);
  const [consultas, tiposPago, servicios, tiposServicios] = await Promise.all([
    query(`
      SELECT consulta.idconsulta, consulta.descripcion, consulta.cita_idcita,
             cita.fechaCita, cita.horaCita, cita.motivoCita,
             paciente.nombre AS nombrePaciente, paciente.apellido AS apellidoPaciente,
             doctor.nombre AS nombreDoctor, doctor.apellido AS apellidoDoctor,
             0 AS montoSugerido,
             COALESCE(pagos.saldo_restante, 0) AS saldoPendiente,
             COALESCE(pagos.total_pagos, 0) AS pagosRegistrados
        FROM consulta
        LEFT JOIN cita ON consulta.cita_idcita = cita.idcita
        LEFT JOIN paciente ON cita.paciente_idPaciente = paciente.idPaciente
        LEFT JOIN doctor ON cita.doctor_iddoctor = doctor.iddoctor
        LEFT JOIN (
          SELECT consulta_idconsulta,
                 COUNT(*) AS total_pagos,
                 SUM(COALESCE(saldo_restante, 0)) AS saldo_restante
            FROM pago
           GROUP BY consulta_idconsulta
        ) pagos ON pagos.consulta_idconsulta = consulta.idconsulta
       ORDER BY cita.fechaCita DESC, cita.horaCita DESC, consulta.idconsulta DESC
    `),
    query('SELECT idmetodo_pago, nombre FROM metodo_pago ORDER BY nombre'),
    query(`SELECT idservicio, nombre, ${serviceHasPrice ? 'COALESCE(precio, 0)' : '0'} AS precio FROM servicio ORDER BY nombre`),
    query(`SELECT idtipoServicio AS idtiposervicio, nombre, ${treatmentHasPrice ? 'COALESCE(precio, 0)' : '0'} AS precio FROM tiposervicio ORDER BY nombre`),
  ]);

  return { consultas, tiposPago, servicios, tiposServicios };
}

function buildPaymentStats(pagos) {
  return pagos.reduce((stats, pago) => {
    const saldo = Number(pago.saldo || 0);
    const abonado = Number(pago.totalAbonado || 0);
    const pendiente = Number(pago.saldo_restante || 0);
    stats.totalSaldo += saldo;
    stats.totalAbonado += abonado;
    stats.totalPendiente += pendiente;
    if (pendiente <= 0) stats.pagados += 1;
    else stats.pendientes += 1;
    return stats;
  }, {
    totalSaldo: 0,
    totalAbonado: 0,
    totalPendiente: 0,
    pagados: 0,
    pendientes: 0,
  });
}

async function loadPaymentPageData(filters = {}) {
  await syncFinalizedActiveConsultations();
  const [pagos, options] = await Promise.all([
    loadPayments(filters),
    loadPaymentOptions(),
  ]);
  return {
    pagos,
    ...options,
    paymentStats: buildPaymentStats(pagos),
  };
}

function buildPaymentPrefill(req, consultas) {
  const consultaId = Number(req.query.consulta || req.query.consulta_idconsulta || 0);
  const citaId = Number(req.query.cita || req.query.idcita || 0);
  const consulta = consultas.find(item => Number(item.idconsulta) === consultaId)
    || consultas.find(item => citaId && Number(item.cita_idcita) === citaId);
  return {
    consultaId: consulta ? consulta.idconsulta : (consultaId || ''),
    saldo: consulta ? Number(consulta.saldoPendiente || 0) : '',
  };
}

router.get('/admin/pago', isAuthenticated, canViewPayments, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const [adminProfile, pageData] = await Promise.all([
      getAdminProfile(req.session.user),
      loadPaymentPageData({}),
    ]);
    res.render('admin/pago', {
      ...pageData,
      adminProfile,
      filters: {},
      paymentPrefill: buildPaymentPrefill(req, pageData.consultas),
    });
  } catch (e) { next(e); }
});

router.post('/admin/pago', isAuthenticated, canViewPayments, validate(filtroPagosSchema), async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const filters = req.body || {};
    const [adminProfile, pageData] = await Promise.all([
      getAdminProfile(req.session.user),
      loadPaymentPageData(filters),
    ]);
    res.render('admin/pago', {
      ...pageData,
      adminProfile,
      filters,
      paymentPrefill: buildPaymentPrefill(req, pageData.consultas),
    });
  } catch (e) { next(e); }
});

router.post(['/api/admin/pagos', '/api/pagos'], isAuthenticated, canCreatePayments, async (req, res, next) => {
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    const { fields, files } = await readRequestData(req);
    const { value, error } = pagoCreateSchema.validate(fields, { abortEarly: false, stripUnknown: true });
    if (error) throw makeHttpError(400, error.details.map(item => item.message).join(', '));

    const {
      fecha,
      saldo,
      abono,
      nocuota,
      consulta_idconsulta,
      tipopago_idtipoPago,
      metodo_pago_idmetodo_pago,
      tipoCobro,
      detallesPago,
    } = value;
    const chargeDetails = parsePaymentChargeDetails(detallesPago);

    const saldoTotal = Number(saldo);
    const abonoInicial = tipoCobro === 'completo' ? saldoTotal : Number(abono);
    const numeroCuotas = tipoCobro === 'cuotas' ? Math.max(Number(nocuota || 1), 2) : 1;
    if (abonoInicial > saldoTotal) {
      return res.status(400).json({ success: false, message: 'El abono no puede ser mayor al saldo.' });
    }

    const [[consulta]] = await conn.execute(
      `SELECT co.idconsulta, c.paciente_idPaciente
         FROM consulta co
         LEFT JOIN cita c ON c.idcita = co.cita_idcita
        WHERE co.idconsulta = ?
        LIMIT 1`,
      [consulta_idconsulta]
    );
    if (!consulta) {
      return res.status(404).json({ success: false, message: 'Consulta no encontrada.' });
    }

    const metodoPagoId = metodo_pago_idmetodo_pago || tipopago_idtipoPago;
    const saldoRestante = Number((saldoTotal - abonoInicial).toFixed(2));
    const evidencePath = await storePaymentEvidence(files.find(file => file.field === 'evidenciaPago'), consulta.paciente_idPaciente);
    const hasPaymentTypeColumn = await columnExistsInDatabase('pago', 'tipo_cobro', conn);

    await conn.beginTransaction();
    const columns = ['fecha', 'lugar', 'saldo', 'abono', 'nocuotas', 'saldo_restante', 'consulta_idconsulta', 'metodo_pago_idmetodo_pago'];
    const values = [toSqlDate(fecha), null, saldoTotal, abonoInicial, numeroCuotas, saldoRestante, consulta_idconsulta, metodoPagoId];
    if (hasPaymentTypeColumn) {
      columns.push('tipo_cobro');
      values.push(tipoCobro);
    }
    const [r] = await conn.execute(
      `INSERT INTO pago (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      values
    );
    const detailsCount = await insertPaymentChargeDetails(conn, r.insertId, chargeDetails);

    let reciboId = null;
    if (abonoInicial > 0 || evidencePath || saldoRestante <= 0) {
      reciboId = await createReceipt(conn, {
        fecha,
        monto: abonoInicial || (saldoRestante <= 0 ? saldoTotal : 0),
        pagoId: r.insertId,
        evidencePath,
      });
    }

    await conn.commit();
    await createNotification({
      tipo: saldoRestante > 0 ? 'pago_pendiente' : 'pago',
      titulo: saldoRestante > 0 ? 'Pago con saldo pendiente' : 'Pago completado',
      mensaje: saldoRestante > 0
        ? `Queda saldo pendiente de Q${saldoRestante.toFixed(2)}.`
        : `Pago registrado por Q${saldoTotal.toFixed(2)}.`,
      url: '/admin/pago',
      referenciaTipo: 'pago',
      referenciaId: r.insertId,
    });
    res.status(201).json({ success: true, idPago: r.insertId, saldoRestante, reciboId, detallesGuardados: detailsCount });
  } catch (e) {
    await conn.rollback();
    return sendPaymentApiError(res, e, 'No se pudo guardar el pago.');
  } finally {
    conn.release();
  }
});

router.post(['/api/admin/pagos/abonos', '/guardarAbono'], isAuthenticated, canRegisterPayments, async (req, res, next) => {
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    const { fields, files } = await readRequestData(req);
    const { value, error } = abonoSchema.validate(fields, { abortEarly: false, stripUnknown: true });
    if (error) throw makeHttpError(400, error.details.map(item => item.message).join(', '));
    const { idPago, valorAbono, descripcionAbono, fechaAbono } = value;

    await conn.beginTransaction();

    const [[pago]] = await conn.execute(
      `SELECT p.saldo, p.saldo_restante, c.paciente_idPaciente
         FROM pago p
         LEFT JOIN consulta co ON co.idconsulta = p.consulta_idconsulta
         LEFT JOIN cita c ON c.idcita = co.cita_idcita
        WHERE p.idPago=?
        LIMIT 1
        FOR UPDATE`,
      [idPago]
    );
    if (!pago) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Pago no encontrado.' });
    }

    const saldoActual = Number(pago.saldo_restante ?? pago.saldo ?? 0);
    const abono = Number(valorAbono);

    if (!Number.isFinite(saldoActual) || !Number.isFinite(abono)) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Monto invalido.' });
    }

    if (abono > saldoActual) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'El abono no puede ser mayor al saldo restante.' });
    }

    const nuevoSaldoRestante = Number((saldoActual - abono).toFixed(2));

    const [r] = await conn.execute('UPDATE pago SET saldo_restante=? WHERE idPago=?', [nuevoSaldoRestante, idPago]);
    if (!r.affectedRows) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'No se actualizo el pago.' });
    }

    await conn.execute(
      'INSERT INTO controlpago (fecha, valor, descripcion, pago_idPago) VALUES (?, ?, ?, ?)',
      [toSqlDate(fechaAbono), abono, descripcionAbono || 'Abono registrado', idPago]
    );

    const evidencePath = await storePaymentEvidence(files.find(file => file.field === 'evidenciaAbono'), pago.paciente_idPaciente);
    let reciboId = null;
    if (evidencePath || nuevoSaldoRestante <= 0) {
      reciboId = await createReceipt(conn, {
        fecha: fechaAbono,
        monto: abono,
        pagoId: idPago,
        evidencePath,
      });
    }

    await conn.commit();
    res.json({ success: true, saldoRestante: nuevoSaldoRestante, reciboId });
  } catch (e) {
    await conn.rollback();
    return sendPaymentApiError(res, e, 'No se pudo guardar el abono.');
  } finally {
    conn.release();
  }
});

router.get(['/api/admin/pagos/:idPago/detalles', '/obtenerPagoDetalles/:idPago'], isAuthenticated, canViewPayments, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const [pago] = await query(`
      ${await paymentBaseQuery()}
      WHERE pago.idPago=?
    `, [req.params.idPago]);
    if (!pago) return res.status(404).json({ success: false, message: 'Pago no encontrado.' });

    const abonos = await query(
      'SELECT fecha, valor, descripcion FROM controlpago WHERE pago_idPago=? ORDER BY fecha DESC',
      [req.params.idPago]
    );
    const recibos = await query(
      'SELECT idRecibo, fecha, monto, imagen FROM recibo WHERE pago_idPago=? ORDER BY fecha DESC, idRecibo DESC',
      [req.params.idPago]
    );
    const detalles = await loadPaymentChargeDetails(req.params.idPago);
    res.json({ success: true, pago, abonos, recibos, detalles });
  } catch (e) { next(e); }
});

module.exports = router;
