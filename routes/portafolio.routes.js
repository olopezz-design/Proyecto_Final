const express = require('express');
const crypto = require('crypto');
const fs = require('fs/promises');
const Joi = require('joi');
const path = require('path');
const { isAuthenticated, requirePermission } = require('../middlewares/auth');
const { query } = require('../database/db');
const { hasPermission } = require('../utils/permissions');
const { getAdminProfile } = require('../utils/adminProfile');

const router = express.Router();
const canViewPortfolio = requirePermission('portafolio:ver');
const canCreatePortfolio = requirePermission('portafolio:crear');
const canEditPortfolio = requirePermission('portafolio:editar');
const canDeletePortfolio = requirePermission('portafolio:eliminar');
const MAX_IMAGE_BYTES = Number(process.env.PORTFOLIO_MAX_IMAGE_BYTES || 6 * 1024 * 1024);
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'portafolio');
const UPLOAD_URL_PREFIX = '/uploads/portafolio';

function portfolioActions(req) {
  const permissions = req.session?.user?.permissions || [];
  return {
    canCreate: hasPermission(permissions, 'portafolio:crear'),
    canEdit: hasPermission(permissions, 'portafolio:editar'),
    canDelete: hasPermission(permissions, 'portafolio:eliminar'),
  };
}

function tableMissing(err) {
  return err?.code === 'ER_NO_SUCH_TABLE' || err?.code === 'ER_BAD_FIELD_ERROR';
}

async function hasColumn(table, column) {
  const rows = await query(
    `SELECT 1
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [table, column]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function requiredColumnWithoutDefault(table, column) {
  const rows = await query(
    `SELECT IS_NULLABLE, COLUMN_DEFAULT, EXTRA
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [table, column]
  );
  const meta = rows[0];
  if (!meta) return false;
  const autoIncrement = String(meta.EXTRA || '').toLowerCase().includes('auto_increment');
  return meta.IS_NULLABLE === 'NO' && meta.COLUMN_DEFAULT == null && !autoIncrement;
}

function bufferIndexOf(buffer, search, start = 0) {
  return buffer.indexOf(search, start);
}

function splitBuffer(buffer, delimiter) {
  const parts = [];
  let start = 0;
  let index = bufferIndexOf(buffer, delimiter, start);
  while (index !== -1) {
    parts.push(buffer.subarray(start, index));
    start = index + delimiter.length;
    index = bufferIndexOf(buffer, delimiter, start);
  }
  parts.push(buffer.subarray(start));
  return parts;
}

function multipartBoundary(contentType = '') {
  const match = String(contentType).match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return match?.[1] || match?.[2] || null;
}

function detectImage(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (
    buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
    && buffer[4] === 0x0d
    && buffer[5] === 0x0a
    && buffer[6] === 0x1a
    && buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

function parseMultipart(buffer, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const headerSeparator = Buffer.from('\r\n\r\n');
  const fields = {};
  let file = null;

  for (let part of splitBuffer(buffer, delimiter)) {
    if (!part.length) continue;
    if (part.subarray(0, 2).toString('ascii') === '\r\n') part = part.subarray(2);
    if (part.subarray(0, 2).toString('ascii') === '--') continue;
    if (part.subarray(part.length - 2).toString('ascii') === '\r\n') part = part.subarray(0, part.length - 2);

    const headerEnd = bufferIndexOf(part, headerSeparator);
    if (headerEnd === -1) continue;

    const rawHeaders = part.subarray(0, headerEnd).toString('latin1');
    let content = part.subarray(headerEnd + headerSeparator.length);
    if (content.subarray(content.length - 2).toString('ascii') === '\r\n') {
      content = content.subarray(0, content.length - 2);
    }

    const disposition = rawHeaders.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] || '';
    const name = disposition.match(/name="([^"]+)"/i)?.[1];
    const filename = disposition.match(/filename="([^"]*)"/i)?.[1];
    const contentType = rawHeaders.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim();
    if (!name) continue;

    if (filename !== undefined) {
      if (content.length > 0) file = { field: name, filename, contentType, buffer: content };
    } else {
      fields[name] = content.toString('utf8').trim();
    }
  }

  return { fields, file };
}

function readMultipartRequest(req) {
  return new Promise((resolve, reject) => {
    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > MAX_IMAGE_BYTES) {
      reject(Object.assign(new Error('La imagen supera el tamaño permitido.'), { status: 413 }));
      return;
    }

    const chunks = [];
    let total = 0;
    let tooLarge = false;

    req.on('data', chunk => {
      total += chunk.length;
      if (total > MAX_IMAGE_BYTES) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('La imagen supera el tamaño permitido.'), { status: 413 }));
        return;
      }
      const boundary = multipartBoundary(req.headers['content-type']);
      if (!boundary) {
        reject(Object.assign(new Error('Formulario de imagen inválido.'), { status: 400 }));
        return;
      }
      resolve(parseMultipart(Buffer.concat(chunks), boundary));
    });

    req.on('error', reject);
  });
}

async function savePortfolioImage(file) {
  if (!file?.buffer?.length) {
    throw Object.assign(new Error('Selecciona una imagen.'), { status: 400 });
  }

  const detected = detectImage(file.buffer);
  if (!detected) {
    throw Object.assign(new Error('Formato no permitido. Usa JPG, PNG o WEBP.'), { status: 400 });
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomUUID()}.${detected.ext}`;
  const absolutePath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(absolutePath, file.buffer, { flag: 'wx' });
  return `${UPLOAD_URL_PREFIX}/${filename}`;
}

function localUploadPath(publicUrl) {
  const normalized = String(publicUrl || '').replace(/\\/g, '/');
  if (!normalized.startsWith(`${UPLOAD_URL_PREFIX}/`)) return null;
  const filename = path.basename(normalized);
  const absolutePath = path.resolve(UPLOAD_DIR, filename);
  const root = path.resolve(UPLOAD_DIR);
  return absolutePath.startsWith(`${root}${path.sep}`) ? absolutePath : null;
}

async function removeLocalUpload(publicUrl) {
  const absolutePath = localUploadPath(publicUrl);
  if (!absolutePath) return;
  try {
    await fs.unlink(absolutePath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

async function loadPortfolioGroups() {
  const hasDescription = await hasColumn('servicio', 'descripcion');
  const hasPortfolioFlag = await hasColumn('servicio', 'mostrar_portafolio');
  const servicios = await query(`
    SELECT idservicio AS id,
           nombre,
           ${hasDescription ? 'descripcion' : "'' AS descripcion"},
           ${hasPortfolioFlag ? 'mostrar_portafolio' : '1'} AS mostrarPortafolio
      FROM servicio
     ${hasPortfolioFlag ? 'WHERE mostrar_portafolio = 1' : ''}
     ORDER BY nombre
  `);

  const imagenes = await query(`
    SELECT
      idportafolio_imagen AS id,
      servicio_idservicio AS servicioId,
      titulo,
      descripcion,
      imagen_url AS url,
      orden
    FROM portafolio_imagen
    WHERE activo = 1
    ORDER BY servicio_idservicio, orden, idportafolio_imagen
  `);

  const imagenesPorServicio = new Map();
  imagenes.forEach((imagen) => {
    const list = imagenesPorServicio.get(Number(imagen.servicioId)) || [];
    list.push(imagen);
    imagenesPorServicio.set(Number(imagen.servicioId), list);
  });

  return servicios.map((servicio) => ({
    ...servicio,
    imagenes: imagenesPorServicio.get(Number(servicio.id)) || [],
  }));
}

router.get(['/admin/gallery', '/admin/portafolio'], isAuthenticated, canViewPortfolio, async (req, res, next) => {
  try {
    const portfolioGroups = await loadPortfolioGroups();
    const adminProfile = await getAdminProfile(req.session.user);
    res.render('admin/gallery', {
      title: 'Portafolio',
      portfolioGroups,
      portfolioReady: true,
      portfolioActions: portfolioActions(req),
      adminProfile,
    });
  } catch (err) {
    if (!tableMissing(err)) return next(err);
    const adminProfile = await getAdminProfile(req.session.user);
    res.render('admin/gallery', {
      title: 'Portafolio',
      portfolioGroups: [],
      portfolioReady: false,
      portfolioActions: portfolioActions(req),
      adminProfile,
    });
  }
});

router.post('/admin/portafolio/grupos', isAuthenticated, canCreatePortfolio, async (req, res, next) => {
  const schema = Joi.object({
    nombre: Joi.string().trim().min(2).max(150).required(),
    descripcion: Joi.string().trim().max(255).allow('', null),
  });
  const { value, error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({ ok: false, error: error.details.map(d => d.message).join(', ') });
  }

  try {
    const [duplicate] = await query('SELECT idservicio FROM servicio WHERE LOWER(nombre)=LOWER(?) LIMIT 1', [value.nombre]);
    if (duplicate) return res.status(409).json({ ok: false, error: 'Ya existe un servicio con ese nombre.' });

    const columns = ['nombre'];
    const values = [value.nombre];
    if (await hasColumn('servicio', 'descripcion')) {
      columns.push('descripcion');
      values.push(value.descripcion || null);
    }
    if (await hasColumn('servicio', 'mostrar_portafolio')) {
      columns.push('mostrar_portafolio');
      values.push(1);
    }
    if (await requiredColumnWithoutDefault('servicio', 'precio')) {
      columns.push('precio');
      values.push(0);
    }

    const result = await query(
      `INSERT INTO servicio (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      values
    );
    return res.status(201).json({
      ok: true,
      id: result.insertId,
      nombre: value.nombre,
      descripcion: value.descripcion || '',
    });
  } catch (err) {
    if (tableMissing(err)) return res.status(409).json({ ok: false, error: 'El catálogo de servicios no está disponible.' });
    return next(err);
  }
});

router.put('/admin/portafolio/grupos/:id', isAuthenticated, canEditPortfolio, async (req, res, next) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'Grupo inválido.' });
  }

  const schema = Joi.object({
    nombre: Joi.string().trim().min(2).max(150).required(),
    descripcion: Joi.string().trim().max(255).allow('', null),
  });
  const { value, error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({ ok: false, error: error.details.map(d => d.message).join(', ') });
  }

  try {
    const [existing] = await query('SELECT idservicio FROM servicio WHERE idservicio = ? LIMIT 1', [id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Grupo no encontrado.' });

    const [duplicate] = await query(
      'SELECT idservicio FROM servicio WHERE LOWER(nombre)=LOWER(?) AND idservicio <> ? LIMIT 1',
      [value.nombre, id]
    );
    if (duplicate) return res.status(409).json({ ok: false, error: 'Ya existe otro servicio con ese nombre.' });

    const sets = ['nombre=?'];
    const values = [value.nombre];
    if (await hasColumn('servicio', 'descripcion')) {
      sets.push('descripcion=?');
      values.push(value.descripcion || null);
    }
    values.push(id);

    await query(`UPDATE servicio SET ${sets.join(', ')} WHERE idservicio=?`, values);
    return res.json({ ok: true, id, nombre: value.nombre, descripcion: value.descripcion || '' });
  } catch (err) {
    if (tableMissing(err)) return res.status(409).json({ ok: false, error: 'El catálogo de servicios no está disponible.' });
    return next(err);
  }
});

router.delete('/admin/portafolio/grupos/:id', isAuthenticated, canDeletePortfolio, async (req, res, next) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'Grupo inválido.' });
  }

  try {
    if (!(await hasColumn('servicio', 'mostrar_portafolio'))) {
      return res.status(409).json({
        ok: false,
        error: 'Para ocultar grupos sin borrar servicios, agrega la columna mostrar_portafolio al catálogo servicio.',
      });
    }

    const result = await query('UPDATE servicio SET mostrar_portafolio=0 WHERE idservicio=?', [id]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, error: 'Grupo no encontrado.' });
    return res.json({ ok: true });
  } catch (err) {
    if (tableMissing(err)) return res.status(409).json({ ok: false, error: 'El catálogo de servicios no está disponible.' });
    return next(err);
  }
});

router.post('/admin/portafolio/imagenes', isAuthenticated, canCreatePortfolio, async (req, res, next) => {
  const isMultipart = String(req.headers['content-type'] || '').toLowerCase().startsWith('multipart/form-data');
  if (!isMultipart) {
    return res.status(415).json({ ok: false, error: 'Debes seleccionar y enviar un archivo de imagen.' });
  }

  let imagenUrl = null;
  try {
    const { fields, file } = await readMultipartRequest(req);
    const schema = Joi.object({
      servicio_idservicio: Joi.number().integer().positive().required(),
      titulo: Joi.string().trim().max(150).allow('', null),
      descripcion: Joi.string().trim().max(255).allow('', null),
    });
    const { value, error } = schema.validate(fields, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ ok: false, error: error.details.map(d => d.message).join(', ') });
    }

    imagenUrl = await savePortfolioImage(file);
    const result = await query(`
      INSERT INTO portafolio_imagen (servicio_idservicio, titulo, descripcion, imagen_url)
      VALUES (?, ?, ?, ?)
    `, [
      value.servicio_idservicio,
      value.titulo || null,
      value.descripcion || null,
      imagenUrl,
    ]);

    return res.status(201).json({
      ok: true,
      imagen: {
        id: result.insertId,
        servicioId: value.servicio_idservicio,
        titulo: value.titulo || '',
        descripcion: value.descripcion || '',
        url: imagenUrl,
      },
    });
  } catch (err) {
    if (imagenUrl) await removeLocalUpload(imagenUrl);
    if (tableMissing(err)) return res.status(409).json({ ok: false, error: 'La tabla de portafolio no está disponible.' });
    if (err.status) return res.status(err.status).json({ ok: false, error: err.message });
    return next(err);
  }
});

router.put('/admin/portafolio/imagenes/:id', isAuthenticated, canEditPortfolio, async (req, res, next) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'Imagen inválida.' });
  }

  const schema = Joi.object({
    servicio_idservicio: Joi.number().integer().positive().required(),
    titulo: Joi.string().trim().max(150).allow('', null),
    descripcion: Joi.string().trim().max(255).allow('', null),
    orden: Joi.number().integer().min(0).max(9999).default(0),
  });
  const { value, error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({ ok: false, error: error.details.map(d => d.message).join(', ') });
  }

  try {
    const [service] = await query('SELECT idservicio FROM servicio WHERE idservicio = ? LIMIT 1', [value.servicio_idservicio]);
    if (!service) return res.status(400).json({ ok: false, error: 'Servicio inválido.' });

    const [image] = await query(
      'SELECT idportafolio_imagen FROM portafolio_imagen WHERE idportafolio_imagen = ? AND activo = 1 LIMIT 1',
      [id]
    );
    if (!image) return res.status(404).json({ ok: false, error: 'Imagen no encontrada.' });

    await query(`
      UPDATE portafolio_imagen
         SET servicio_idservicio = ?,
             titulo = ?,
             descripcion = ?,
             orden = ?
       WHERE idportafolio_imagen = ?
    `, [
      value.servicio_idservicio,
      value.titulo || null,
      value.descripcion || null,
      value.orden,
      id,
    ]);

    return res.json({
      ok: true,
      imagen: {
        id,
        servicioId: value.servicio_idservicio,
        titulo: value.titulo || '',
        descripcion: value.descripcion || '',
        orden: value.orden,
      },
    });
  } catch (err) {
    if (tableMissing(err)) return res.status(409).json({ ok: false, error: 'La tabla de portafolio no está disponible.' });
    return next(err);
  }
});

router.delete('/admin/portafolio/imagenes/:id', isAuthenticated, canDeletePortfolio, async (req, res, next) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'Imagen inválida.' });
  }

  try {
    const [image] = await query('SELECT imagen_url FROM portafolio_imagen WHERE idportafolio_imagen = ? LIMIT 1', [id]);
    await query('UPDATE portafolio_imagen SET activo = 0 WHERE idportafolio_imagen = ?', [id]);
    await removeLocalUpload(image?.imagen_url);
    return res.json({ ok: true });
  } catch (err) {
    if (tableMissing(err)) return res.status(409).json({ ok: false, error: 'La tabla de portafolio no está disponible.' });
    return next(err);
  }
});

module.exports = router;
