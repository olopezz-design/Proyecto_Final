const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const express = require('express');
const Joi = require('joi');
const { query } = require('../database/db');
const { isAuthenticated, requirePermission } = require('../middlewares/auth');
const { getAdminProfile } = require('../utils/adminProfile');
const { loadDoctorSchedules, replaceDoctorSchedules } = require('../utils/doctorSchedules');

const router = express.Router();
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'perfiles');
const MAX_PROFILE_PHOTO_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const profileSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(100).required(),
  apellido: Joi.string().trim().allow('').max(100),
  telefono: Joi.string().trim().allow('').max(45),
  email: Joi.string().trim().email().allow('').max(60),
  observacion: Joi.string().trim().allow('').max(250),
  especialidad_idespecialidad: Joi.number().integer().positive().required(),
  dpi: Joi.string().trim().allow('').max(20),
  fechaNacimiento: Joi.date().allow('', null),
  tipoSangre: Joi.string().trim().allow('').max(5),
  domicilio: Joi.string().trim().allow('').max(255),
  genero_idGenero: Joi.number().integer().positive().allow('', null),
  horariosJson: Joi.string().trim().allow('', null),
});

async function tableColumns(tableName) {
  const rows = await query(
    `SELECT COLUMN_NAME AS column_name
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?`,
    [tableName]
  );
  return new Set(rows.map(row => row.column_name));
}

async function doctorPhotoColumn() {
  const columns = await tableColumns('doctor');
  return ['fotoPerfil', 'foto_perfil', 'foto'].find(column => columns.has(column)) || null;
}

async function getDoctorForSession(userId) {
  const photoColumn = await doctorPhotoColumn();
  const rows = await query(
    `SELECT d.*, ${photoColumn ? `d.${photoColumn}` : 'NULL'} AS fotoPerfil,
            e.nombre AS especialidad_nombre,
            g.nombre AS genero_nombre,
            u.user AS usuario
       FROM doctor d
       LEFT JOIN especialidad e ON e.idespecialidad = d.especialidad_idespecialidad
       LEFT JOIN genero g ON g.idGenero = d.genero_idGenero
       LEFT JOIN usuario u ON u.idusuario = d.usuario_idusuario
      WHERE d.usuario_idusuario = ?
      LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function getDoctorById(doctorId) {
  const photoColumn = await doctorPhotoColumn();
  const rows = await query(
    `SELECT d.*, ${photoColumn ? `d.${photoColumn}` : 'NULL'} AS fotoPerfil,
            e.nombre AS especialidad_nombre,
            g.nombre AS genero_nombre,
            u.user AS usuario
       FROM doctor d
       LEFT JOIN especialidad e ON e.idespecialidad = d.especialidad_idespecialidad
       LEFT JOIN genero g ON g.idGenero = d.genero_idGenero
       LEFT JOIN usuario u ON u.idusuario = d.usuario_idusuario
      WHERE d.iddoctor = ?
      LIMIT 1`,
    [doctorId]
  );
  return rows[0] || null;
}

function initials(doctor) {
  return `${doctor?.nombre || ''} ${doctor?.apellido || ''}`
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'DR';
}

function parseSchedulePayload(rawValue) {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error('El horario laboral enviado no es válido.');
  }
}

async function profileLists() {
  const [especialidades, generos] = await Promise.all([
    query('SELECT idespecialidad, nombre FROM especialidad ORDER BY nombre'),
    query('SELECT idGenero, nombre FROM genero ORDER BY nombre'),
  ]);
  return { especialidades, generos };
}

function wantsMultipart(req) {
  return String(req.headers['content-type'] || '').toLowerCase().includes('multipart/form-data');
}

function parseHeaderParams(header) {
  return Object.fromEntries(
    String(header || '').split(';').slice(1).map(part => {
      const [key, ...rest] = part.trim().split('=');
      return [key, rest.join('=').replace(/^"|"$/g, '')];
    }).filter(([key]) => key)
  );
}

async function parseMultipart(req) {
  const contentType = String(req.headers['content-type'] || '');
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[1]
    || contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[2];
  if (!boundary) throw new Error('Formulario inválido.');

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_PROFILE_PHOTO_BYTES + 512 * 1024) throw new Error('La imagen supera el tamaño permitido.');
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('binary');
  const parts = raw.split(`--${boundary}`).slice(1, -1);
  const fields = {};
  const files = {};

  parts.forEach(part => {
    const cleanPart = part.replace(/^\r\n/, '').replace(/\r\n$/, '');
    const separatorIndex = cleanPart.indexOf('\r\n\r\n');
    if (separatorIndex === -1) return;

    const rawHeaders = cleanPart.slice(0, separatorIndex).split('\r\n');
    let body = cleanPart.slice(separatorIndex + 4);
    if (body.endsWith('\r\n')) body = body.slice(0, -2);

    const headers = Object.fromEntries(rawHeaders.map(line => {
      const index = line.indexOf(':');
      if (index === -1) return null;
      return [line.slice(0, index).toLowerCase(), line.slice(index + 1).trim()];
    }).filter(Boolean));

    const disposition = parseHeaderParams(headers['content-disposition']);
    if (!disposition.name) return;

    if (disposition.filename) {
      files[disposition.name] = {
        filename: disposition.filename,
        mimeType: headers['content-type'] || 'application/octet-stream',
        buffer: Buffer.from(body, 'binary'),
      };
    } else {
      fields[disposition.name] = Buffer.from(body, 'binary').toString('utf8');
    }
  });

  return { fields, files };
}

async function saveProfilePhoto(file, doctorId) {
  if (!file || !file.buffer?.length) return null;
  const extension = ALLOWED_IMAGE_TYPES.get(file.mimeType);
  if (!extension) throw new Error('Solo se permiten imágenes JPG, PNG o WebP.');
  if (file.buffer.length > MAX_PROFILE_PHOTO_BYTES) throw new Error('La imagen no debe superar 3 MB.');

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `doctor-${doctorId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${extension}`;
  const fullPath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(fullPath, file.buffer);
  return `/uploads/perfiles/${filename}`;
}

router.get('/admin/perfil', isAuthenticated, async (req, res, next) => {
  try {
    const doctor = await getDoctorForSession(req.session.user.id);
    const adminProfile = await getAdminProfile(req.session.user);
    res.render('admin/doctors-profile', {
      doctor,
      horarios: doctor ? await loadDoctorSchedules(doctor.iddoctor) : [],
      initials: initials(doctor),
      photoReady: Boolean(await doctorPhotoColumn()),
      adminProfile,
      updated: req.query.updated === '1',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/doctores/perfil/:id', isAuthenticated, requirePermission('doctores:ver'), async (req, res, next) => {
  try {
    const doctor = await getDoctorById(req.params.id);
    if (!doctor) return res.status(404).send('Doctor no encontrado');
    const adminProfile = await getAdminProfile(req.session.user);
    res.render('admin/doctors-profile', {
      doctor,
      horarios: await loadDoctorSchedules(doctor.iddoctor),
      initials: initials(doctor),
      photoReady: Boolean(await doctorPhotoColumn()),
      adminProfile,
      readOnly: true,
      updated: false,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/perfil/editar', isAuthenticated, async (req, res, next) => {
  try {
    const doctor = await getDoctorForSession(req.session.user.id);
    const lists = await profileLists();
    const adminProfile = await getAdminProfile(req.session.user);
    res.render('admin/edit-doctors', {
      doctor,
      horarios: doctor ? await loadDoctorSchedules(doctor.iddoctor) : [],
      initials: initials(doctor),
      photoReady: Boolean(await doctorPhotoColumn()),
      adminProfile,
      ...lists,
      error: req.query.error || null,
      saved: req.query.saved === '1',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/perfil/editar', isAuthenticated, async (req, res, next) => {
  try {
    const doctor = await getDoctorForSession(req.session.user.id);
    if (!doctor) return res.status(404).send('No hay un doctor vinculado a este usuario.');

    const parsed = wantsMultipart(req) ? await parseMultipart(req) : { fields: req.body || {}, files: {} };
    const { value, error } = profileSchema.validate(parsed.fields, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.redirect(`/admin/perfil/editar?error=${encodeURIComponent(error.details[0].message)}`);
    }
    const horarios = parseSchedulePayload(value.horariosJson);

    await query(
      `UPDATE doctor
          SET nombre=?, apellido=?, telefono=?, email=?, observacion=?, especialidad_idespecialidad=?,
              dpi=?, fechaNacimiento=?, tipoSangre=?, domicilio=?, genero_idGenero=?
        WHERE iddoctor=? AND usuario_idusuario=?`,
      [
        value.nombre,
        value.apellido || '',
        value.telefono || 'Pendiente',
        value.email || 'Pendiente',
        value.observacion || null,
        value.especialidad_idespecialidad,
        value.dpi || null,
        value.fechaNacimiento || null,
        value.tipoSangre || null,
        value.domicilio || null,
        value.genero_idGenero || null,
        doctor.iddoctor,
        req.session.user.id,
      ]
    );

    await replaceDoctorSchedules(doctor.iddoctor, horarios);

    const photoColumn = await doctorPhotoColumn();
    const photoFile = parsed.files?.fotoPerfil;
    if (photoFile?.buffer?.length) {
      if (!photoColumn) {
        return res.redirect('/admin/perfil/editar?error=Falta configurar la columna de foto de perfil en la tabla doctor.');
      }
      const photoUrl = await saveProfilePhoto(photoFile, doctor.iddoctor);
      await query(`UPDATE doctor SET ${photoColumn}=? WHERE iddoctor=? AND usuario_idusuario=?`, [
        photoUrl,
        doctor.iddoctor,
        req.session.user.id,
      ]);
    }

    res.redirect('/admin/perfil?updated=1');
  } catch (error) {
    if (error.message) {
      return res.redirect(`/admin/perfil/editar?error=${encodeURIComponent(error.message)}`);
    }
    next(error);
  }
});

module.exports = router;
