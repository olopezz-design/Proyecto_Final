// routes/doctores.routes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { query, initPool } = require('../database/db');
const { isAuthenticated, requirePermission } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const {
  WEEK_DAYS,
  groupSchedulesByDoctor,
  loadAllDoctorSchedules,
  loadDoctorSchedules,
  normalizeScheduleRows,
  replaceDoctorSchedules,
} = require('../utils/doctorSchedules');
const { createNotification } = require('../utils/notificaciones');

const router = express.Router();
const canViewDoctors = requirePermission('doctores:ver');
const canCreateDoctors = requirePermission('doctores:crear');
const canEditDoctors = requirePermission('doctores:editar');
const canDeactivateDoctors = requirePermission('doctores:inactivar');
const canManageDoctorSchedules = requirePermission('doctores:horarios');

const idParam = Joi.object({ id: Joi.number().integer().positive().required() });

const doctorCreateSchema = Joi.object({
  nombre: Joi.string().min(2).required(),
  apellido: Joi.string().min(2).required(),
  telefono: Joi.string().allow('', null),
  email: Joi.string().email().allow('', null),
  observacion: Joi.string().allow('', null),
  especialidad_idespecialidad: Joi.number().integer().required(),
  dpi: Joi.string().allow('', null),
  fechaNacimiento: Joi.date().allow('', null).empty(''),
  tipoSangre: Joi.string().allow('', null),
  domicilio: Joi.string().allow('', null),
  genero_idGenero: Joi.number().integer().required(),
  rol_idrol: Joi.number().integer().required(),
  user: Joi.string().min(3).required(),
  password: Joi.string().min(4).required(),
});

const scheduleItemSchema = Joi.object({
  dia_semana: Joi.string().valid(...WEEK_DAYS).required(),
  hora_inicio: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  hora_fin: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
}).custom((value, helpers) => {
  try {
    normalizeScheduleRows([value]);
    return value;
  } catch (error) {
    return helpers.message(error.message);
  }
});

const doctorEditSchema = Joi.object({
  nombre: Joi.string().min(2).required(),
  apellido: Joi.string().min(2).required(),
  telefono: Joi.string().allow('', null),
  email: Joi.string().email().allow('', null),
  observacion: Joi.string().allow('', null),
  especialidad_idespecialidad: Joi.number().integer().required(),
  dpi: Joi.string().allow('', null),
  fechaNacimiento: Joi.date().allow('', null).empty(''),
  tipoSangre: Joi.string().allow('', null),
  domicilio: Joi.string().allow('', null),
  genero_idGenero: Joi.number().integer().required(),
  horarios: Joi.array().items(scheduleItemSchema).optional(),
});

const horarioSchema = Joi.object({
  doctor_id: Joi.number().integer().positive().required(),
  dia_semana: Joi.string().valid(...WEEK_DAYS).required(),
  hora_inicio: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  hora_fin: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
}).custom((value, helpers) => {
  try {
    normalizeScheduleRows([value]);
    return value;
  } catch (error) {
    return helpers.message(error.message);
  }
});

// Listado activos
router.get('/admin/doctores', isAuthenticated, canViewDoctors, async (_req, res, next) => {
  try {
    const q = `
      SELECT d.*, u.user AS usuario_nombre, u.rol_idrol
      FROM doctor d JOIN usuario u ON d.usuario_idusuario = u.idusuario
      WHERE d.idestado = 1
      ORDER BY d.iddoctor DESC
    `;
    const [doctores, horarios] = await Promise.all([
      query(q),
      loadAllDoctorSchedules(),
    ]);
    res.render('admin/doctores', { doctores, horariosPorDoctor: groupSchedulesByDoctor(horarios) });
  } catch (e) { next(e); }
});

// Listado inactivos
router.get('/admin/doctores/inactivos', isAuthenticated, canViewDoctors, async (_req, res, next) => {
  try {
    const q = `
      SELECT d.*, u.user AS usuario_nombre, u.rol_idrol
      FROM doctor d JOIN usuario u ON d.usuario_idusuario = u.idusuario
      WHERE d.idestado = 2
      ORDER BY d.iddoctor DESC
    `;
    const doctores = await query(q);
    res.render('admin/doctoresInactivos', { doctores });
  } catch (e) { next(e); }
});

// Crear doctor + usuario
router.post('/admin/doctores', isAuthenticated, canCreateDoctors, validate(doctorCreateSchema), async (req, res, next) => {
  const {
    nombre, apellido, telefono, email, observacion, especialidad_idespecialidad, dpi,
    fechaNacimiento, tipoSangre, domicilio, genero_idGenero, rol_idrol, user, password
  } = req.body;

  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const hash = await bcrypt.hash(password, 10);
    const rUser = await conn.execute(
      'INSERT INTO usuario (user, password, rol_idrol, estadoUsuario_idestadoUsuario) VALUES (?, ?, ?, 1)',
      [user, hash, rol_idrol]
    );
    const usuario_idusuario = rUser[0].insertId;

    const [doctorCreated] = await conn.execute(
      `INSERT INTO doctor
        (nombre, apellido, telefono, email, observacion, usuario_idusuario, especialidad_idespecialidad, dpi, fechaNacimiento, tipoSangre, domicilio, idestado, genero_idGenero)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?)`,
      [nombre, apellido, telefono, email, observacion, usuario_idusuario, especialidad_idespecialidad, dpi, fechaNacimiento, tipoSangre, domicilio, genero_idGenero]
    );
    await conn.commit();
    await createNotification({
      tipo: 'usuario',
      titulo: 'Nuevo doctor creado',
      mensaje: `Dr. ${nombre} ${apellido} fue agregado al sistema.`,
      url: `/admin/doctores/perfil/${doctorCreated.insertId}`,
      referenciaTipo: 'doctor',
      referenciaId: doctorCreated.insertId,
    });
    res.status(201).send('Doctor guardado correctamente');
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

// Editar doctor
router.put('/admin/doctores/:id', isAuthenticated, canEditDoctors, validate(idParam, 'params'), validate(doctorEditSchema), async (req, res, next) => {
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    const id = req.params.id;
    const {
      nombre, apellido, fechaNacimiento, genero_idGenero, domicilio, telefono, email,
      especialidad_idespecialidad, tipoSangre, observacion, horarios,
    } = req.body;

    await conn.beginTransaction();
    const [r] = await conn.execute(
      `UPDATE doctor SET nombre=?, apellido=?, fechaNacimiento=?, genero_idGenero=?, domicilio=?,
        telefono=?, email=?, especialidad_idespecialidad=?, tipoSangre=?, observacion=? WHERE iddoctor=?`,
      [
        nombre,
        apellido,
        fechaNacimiento || null,
        genero_idGenero,
        domicilio || null,
        telefono || null,
        email || null,
        especialidad_idespecialidad,
        tipoSangre || null,
        observacion || null,
        id,
      ]
    );
    if (!r.affectedRows) {
      await conn.rollback();
      return res.status(404).json({ message: 'Doctor no encontrado' });
    }

    if (Array.isArray(horarios)) {
      if (typeof res.locals.can === 'function' && !res.locals.can('doctores:horarios')) {
        await conn.rollback();
        return res.status(403).json({ message: 'No tiene permisos para administrar horarios de doctores.' });
      }
      await replaceDoctorSchedules(id, horarios, conn);
    }

    await conn.commit();
    res.json({ success: true });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

// Inactivar / Reactivar
router.put(['/api/admin/doctores/:id/inactivar', '/api/doctores/inactivar/:id'], isAuthenticated, canDeactivateDoctors, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const r = await query('UPDATE doctor SET idestado=2 WHERE iddoctor=?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Doctor no encontrado' });
    res.json({ message: 'Doctor inactivado' });
  } catch (e) { next(e); }
});
router.put(['/api/admin/doctores/:id/reactivar', '/api/doctores/reactivar/:id'], isAuthenticated, canDeactivateDoctors, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const r = await query('UPDATE doctor SET idestado=1 WHERE iddoctor=?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Doctor no encontrado' });
    res.json({ message: 'Doctor reactivado' });
  } catch (e) { next(e); }
});

// Horario
router.post(['/admin/doctores/horarios', '/guardar-horario'], isAuthenticated, canManageDoctorSchedules, validate(horarioSchema), async (req, res, next) => {
  try {
    const { doctor_id, dia_semana, hora_inicio, hora_fin } = req.body;
    const r = await query('INSERT INTO horarios_laborales (doctor_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)', [doctor_id, dia_semana, hora_inicio, hora_fin]);
    const [doc] = await query('SELECT nombre, apellido FROM doctor WHERE iddoctor=?', [doctor_id]);
    res.json({ id: r.insertId, idhorario: r.insertId, doctor_id, dia_semana, hora_inicio, hora_fin, doctor_nombre: doc ? `${doc.nombre} ${doc.apellido}` : '' });
  } catch (e) { next(e); }
});

router.get('/api/admin/doctores/:id/horarios', isAuthenticated, canViewDoctors, validate(idParam, 'params'), async (req, res, next) => {
  try {
    res.json({ horarios: await loadDoctorSchedules(req.params.id) });
  } catch (e) { next(e); }
});

router.delete(['/admin/doctores/horarios/:id', '/eliminar-horario/:id'], isAuthenticated, canManageDoctorSchedules, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const r = await query('DELETE FROM horarios_laborales WHERE id=?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Horario no encontrado' });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Get doctor info simplificada
router.get(['/api/admin/doctores/:id', '/get-doctor/:id'], isAuthenticated, canViewDoctors, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const [d] = await query('SELECT * FROM doctor WHERE iddoctor=?', [req.params.id]);
    if (!d) return res.status(404).json({ error: 'Doctor no encontrado' });
    const generoName = { 1:'Masculino', 2:'Femenino', 3:'Otro' }[d.genero_idGenero] || 'Género Desconocido';
    const especialidadName = {
      1: 'Dentista General', 2: 'Ortodoncista', 3: 'Cirujano Maxilofacial', 4: 'Endodoncia',
      5: 'Periodoncia', 6: 'Odontólogo Cosmético', 7: 'Odontólogo Restaurador', 8: 'Prótesis Dental'
    }[d.especialidad_idespecialidad] || 'Especialidad Desconocida';

    res.json({
      id: d.iddoctor, nombre: d.nombre, apellido: d.apellido, telefono: d.telefono,
      email: d.email, observacion: d.observacion, especialidad: especialidadName, dpi: d.dpi,
      fechaNacimiento: d.fechaNacimiento, tipoSangre: d.tipoSangre, domicilio: d.domicilio,
      genero: generoName, horarios: await loadDoctorSchedules(req.params.id)
    });
  } catch (e) { next(e); }
});

module.exports = router;
