// routes/auth.routes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { query, initPool } = require('../database/db');
const { validate } = require('../middlewares/validate');
const { getEffectivePermissions, permissionTablesReady } = require('../utils/permissions');
const { createNotification } = require('../utils/notificaciones');

const router = express.Router();

const loginSchema = Joi.object({
  usuario: Joi.string().min(3).required(),
  password: Joi.string().min(4).required(),
  returnTo: Joi.string().allow('', null),
});

const signupAccessSchema = Joi.object({
  access_code: Joi.string().trim().required(),
});

const registerSchema = Joi.object({
  user: Joi.string().trim().min(3).max(100).required(),
  nombre: Joi.string().trim().min(2).max(150).required(),
  telefono: Joi.string().trim().max(25).allow('', null),
  rol_idrol: Joi.number().integer().positive().allow('', null),
  setup_pin: Joi.string().trim().allow('', null),
  password: Joi.string().min(8).required(),
  confirm: Joi.string().required(),
});

async function getUserCount() {
  const [{ total = 0 } = {}] = await query('SELECT COUNT(*) AS total FROM usuario');
  return Number(total) || 0;
}

async function getSignupRoles() {
  return query(
    `SELECT idrol, nombre
       FROM rol
      WHERE LOWER(nombre) NOT IN ('administrador', 'admin', 'superadmin', 'root')
      ORDER BY nombre`
  );
}

async function findActiveState(conn) {
  const [rows] = await conn.execute(
    `SELECT idestadoUsuario
       FROM estadousuario
      WHERE LOWER(nombre) IN ('activo', 'active', 'habilitado')
      ORDER BY idestadoUsuario
      LIMIT 1`
  );
  if (rows[0]) return rows[0].idestadoUsuario;

  const [result] = await conn.execute(
    'INSERT INTO estadousuario (nombre, descripcion) VALUES (?, ?)',
    ['Activo', 'Usuario habilitado']
  );
  return result.insertId;
}

async function findAdminRole(conn) {
  const [rows] = await conn.execute(
    `SELECT idrol
       FROM rol
      WHERE LOWER(nombre) IN ('administrador', 'admin', 'superadmin', 'root')
      ORDER BY idrol
      LIMIT 1`
  );
  if (rows[0]) return rows[0].idrol;

  const [result] = await conn.execute('INSERT INTO rol (nombre) VALUES (?)', ['Administrador']);
  return result.insertId;
}

async function findDefaultSpecialty(conn) {
  const [rows] = await conn.execute(
    `SELECT idespecialidad
       FROM especialidad
      ORDER BY idespecialidad
      LIMIT 1`
  );
  if (rows[0]) return rows[0].idespecialidad;

  const [result] = await conn.execute(
    'INSERT INTO especialidad (nombre, descripcion) VALUES (?, ?)',
    ['Odontología general', 'Especialidad base para doctores registrados desde el sistema']
  );
  return result.insertId;
}

function splitFullName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { nombre: 'Pendiente', apellido: '' };
  if (parts.length === 1) return { nombre: parts[0], apellido: '' };
  return { nombre: parts.slice(0, -1).join(' '), apellido: parts.at(-1) };
}

async function hasUserNameColumns(conn) {
  const [rows] = await conn.execute(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuario'
        AND COLUMN_NAME IN ('nombre', 'apellido')`
  );
  const columns = new Set(rows.map(row => row.COLUMN_NAME));
  return columns.has('nombre') && columns.has('apellido');
}

async function createUser(conn, { user, passwordHash, roleId, stateId, fullName }) {
  if (await hasUserNameColumns(conn)) {
    const { nombre, apellido } = splitFullName(fullName);
    const [result] = await conn.execute(
      `INSERT INTO usuario (user, password, rol_idrol, estadoUsuario_idestadoUsuario, nombre, apellido)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user, passwordHash, roleId, stateId, nombre, apellido]
    );
    return result;
  }

  const [result] = await conn.execute(
    'INSERT INTO usuario (user, password, rol_idrol, estadoUsuario_idestadoUsuario) VALUES (?, ?, ?, ?)',
    [user, passwordHash, roleId, stateId]
  );
  return result;
}

async function createDoctorForUser(conn, { userId, fullName, phone, email }) {
  const [[existingDoctor]] = await conn.execute(
    'SELECT iddoctor FROM doctor WHERE usuario_idusuario=? LIMIT 1',
    [userId]
  );
  if (existingDoctor) return existingDoctor;

  const { nombre, apellido } = splitFullName(fullName);
  const specialtyId = await findDefaultSpecialty(conn);
  const [result] = await conn.execute(
    `INSERT INTO doctor
      (nombre, apellido, telefono, email, observacion, usuario_idusuario, especialidad_idespecialidad,
       dpi, fechaNacimiento, tipoSangre, domicilio, idestado, genero_idGenero)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, 1, NULL)`,
    [
      nombre,
      apellido,
      phone || 'Pendiente',
      email || 'Pendiente',
      'Creado automáticamente desde registro de acceso',
      userId,
      specialtyId,
    ]
  );
  return { iddoctor: result.insertId };
}

function signupRedirect(params) {
  const qs = new URLSearchParams(params);
  return `/signup?${qs.toString()}`;
}

function getSignupAccessCode() {
  return String(process.env.SIGNUP_ACCESS_CODE || process.env.REGISTRATION_ACCESS_CODE || '').trim();
}

function safeReturnTo(value) {
  const target = String(value || '').trim();
  if (!target || !target.startsWith('/') || target.startsWith('//')) return '/admin/dash';
  if (target.startsWith('/admin/login') || target.startsWith('/logout') || target.startsWith('/api/')) return '/admin/dash';
  if (
    target === '/admin'
    || target.startsWith('/admin/')
    || target.startsWith('/admin?')
    || target.startsWith('/admin#')
    || target === '/configuracion'
    || target.startsWith('/configuracion/')
    || target.startsWith('/configuracion?')
    || target.startsWith('/configuracion#')
  ) return target;
  return '/admin/dash';
}

function loginRedirect(params = {}) {
  const qs = new URLSearchParams();
  if (params.error) qs.set('error', params.error);
  if (params.usuario) qs.set('usuario', params.usuario);
  if (params.returnTo) qs.set('returnTo', safeReturnTo(params.returnTo));
  return `/admin/login${qs.toString() ? `?${qs.toString()}` : ''}`;
}

function hasSignupAccess(req) {
  return req.session?.signupAccess === true;
}

router.get('/signup', async (req, res, next) => {
  try {
    const firstUser = (await getUserCount()) === 0;
    const signupAccessCode = getSignupAccessCode();
    const registrationLocked = !firstUser && !signupAccessCode;
    const needsAccessCode = !firstUser && Boolean(signupAccessCode) && !hasSignupAccess(req);
    const roles = firstUser || needsAccessCode || registrationLocked ? [] : await getSignupRoles();
    res.render('admin/signup', {
      firstUser,
      adminCreated: req.query.adminCreated === '1' || req.query.firstUser === '1',
      needsAccessCode,
      registrationLocked,
      roles,
      sent: req.query.sent === '1',
      err: req.query.err || null,
    });
  } catch (e) { next(e); }
});

router.post('/signup/access', async (req, res, next) => {
  try {
    const { value, error } = signupAccessSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true });
    if (error) return res.redirect(signupRedirect({ err: 'Ingresa el código de acceso.' }));

    const firstUser = (await getUserCount()) === 0;
    if (firstUser) return res.redirect('/signup');

    const signupAccessCode = getSignupAccessCode();
    if (!signupAccessCode) {
      return res.redirect(signupRedirect({ err: 'El registro no está habilitado.' }));
    }

    if (value.access_code !== signupAccessCode) {
      return res.redirect(signupRedirect({ err: 'Código de acceso incorrecto.' }));
    }

    req.session.signupAccess = true;
    res.redirect('/signup');
  } catch (e) { next(e); }
});

router.post('/auth', async (req, res, next) => {
  try {
    const { value, error } = loginSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true });
    const returnTo = req.body?.returnTo;
    const usuario = String(req.body?.usuario || '').trim();
    if (error) return res.redirect(loginRedirect({ error: 'Ingresa usuario y contraseña.', usuario, returnTo }));
    const { password } = value;
    const rows = await query('SELECT * FROM usuario WHERE user = ? LIMIT 1', [usuario]);
    if (!rows.length) return res.redirect(loginRedirect({ error: 'Usuario no encontrado.', usuario, returnTo }));

    const user = rows[0];
    if (Number(user.estadoUsuario_idestadoUsuario) !== 1) {
      return res.redirect(loginRedirect({ error: 'Usuario inactivo.', usuario, returnTo }));
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.redirect(loginRedirect({ error: 'Contraseña incorrecta.', usuario, returnTo }));

    const sessionUser = { id: user.idusuario, username: user.user, rol: user.rol_idrol };
    sessionUser.permissions = await getEffectivePermissions(sessionUser);
    req.session.user = sessionUser;
    req.session.lastActivity = Date.now();
    req.session.save((error) => {
      if (error) return next(error);
      return res.redirect(safeReturnTo(returnTo));
    });
  } catch (e) { next(e); }
});

router.post('/auth/register', async (req, res, next) => {
  let conn;
  try {
    const { value, error } = registerSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.redirect(signupRedirect({ err: error.details[0].message }));
    }

    if (value.password !== value.confirm) {
      return res.redirect(signupRedirect({ err: 'Las contraseñas no coinciden.' }));
    }

    const normalizedUser = value.user.toLowerCase();
    const firstUser = (await getUserCount()) === 0;

    if (!firstUser) {
      const signupAccessCode = getSignupAccessCode();
      if (!signupAccessCode || !hasSignupAccess(req)) {
        return res.redirect(signupRedirect({ err: 'Ingresa primero el código de acceso.' }));
      }
    }

    const pool = await initPool();
    conn = await pool.getConnection();

    await conn.beginTransaction();

    const [duplicates] = await conn.execute(
      'SELECT idusuario FROM usuario WHERE LOWER(user)=LOWER(?) LIMIT 1',
      [normalizedUser]
    );
    if (duplicates.length) {
      await conn.rollback();
      return res.redirect(signupRedirect({ err: 'Ese usuario ya existe.' }));
    }

    const passwordHash = await bcrypt.hash(value.password, 10);

    if (firstUser) {
      const setupPin = String(process.env.SETUP_PIN || '').trim();
      if (!setupPin) {
        await conn.rollback();
        return res.redirect(signupRedirect({ err: 'No se configuró el código de acceso inicial. Contacta al responsable del sistema.' }));
      }

      if (String(value.setup_pin || '').trim() !== setupPin) {
        await conn.rollback();
        return res.redirect(signupRedirect({ err: 'Código seguro incorrecto.' }));
      }

      const adminRoleId = await findAdminRole(conn);
      const activeStateId = await findActiveState(conn);

      const result = await createUser(conn, {
        user: normalizedUser,
        passwordHash,
        roleId: adminRoleId,
        stateId: activeStateId,
        fullName: value.nombre,
      });

      await createDoctorForUser(conn, {
        userId: result.insertId,
        fullName: value.nombre,
        phone: value.telefono || null,
        email: normalizedUser,
      });

      if (await permissionTablesReady()) {
        await conn.execute(
          `INSERT INTO permisos (permiso_key, label, grupo)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE label=VALUES(label), grupo=VALUES(grupo)`,
          ['*', 'Acceso total', 'Sistema']
        );
        await conn.execute(
          'INSERT IGNORE INTO roles_permisos (idrol, permiso_key) VALUES (?, ?)',
          [adminRoleId, '*']
        );
      }

      await conn.commit();
      await createNotification({
        tipo: 'usuario',
        titulo: 'Primer administrador creado',
        mensaje: `${value.nombre} creó la cuenta inicial del sistema.`,
        url: '/admin/settings#sixA',
        referenciaTipo: 'usuario',
        referenciaId: result.insertId,
      });
      return res.redirect(signupRedirect({ sent: '1', adminCreated: '1', created: result.insertId }));
    }

    const requestedRoleId = Number(value.rol_idrol);
    if (!requestedRoleId) {
      await conn.rollback();
      return res.redirect(signupRedirect({ err: 'Debes seleccionar un rol para solicitar acceso.' }));
    }

    const [roles] = await conn.execute('SELECT idrol, nombre FROM rol WHERE idrol=? LIMIT 1', [requestedRoleId]);
    const role = roles[0];
    if (!role) {
      await conn.rollback();
      return res.redirect(signupRedirect({ err: 'Rol inválido.' }));
    }

    if (['administrador', 'admin', 'superadmin', 'root'].includes(String(role.nombre || '').toLowerCase())) {
      await conn.rollback();
      return res.redirect(signupRedirect({ err: 'No puedes solicitar el rol administrador.' }));
    }

    const [pending] = await conn.execute(
      `SELECT id
         FROM registro_pendiente
        WHERE LOWER(user)=LOWER(?) AND estado='pendiente'
        LIMIT 1`,
      [normalizedUser]
    );
    if (pending.length) {
      await conn.rollback();
      return res.redirect(signupRedirect({ err: 'Ya existe una solicitud pendiente para este usuario.' }));
    }

    await conn.execute(
      `INSERT INTO registro_pendiente (user, nombre, telefono, password_hash, rol_idrol, estado)
       VALUES (?, ?, ?, ?, ?, 'pendiente')`,
      [normalizedUser, value.nombre, value.telefono || null, passwordHash, requestedRoleId]
    );

    await conn.commit();
    await createNotification({
      tipo: 'solicitud',
      titulo: 'Nueva solicitud de acceso',
      mensaje: `${value.nombre} solicitó ingresar al sistema.`,
      url: '/admin/settings#fiveA',
      referenciaTipo: 'registro_pendiente',
    });
    req.session.signupAccess = false;
    return res.redirect(signupRedirect({ sent: '1' }));
  } catch (e) {
    if (conn) await conn.rollback();
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.redirect(signupRedirect({ err: 'Falta ejecutar el SQL de solicitudes de registro.' }));
    }
    next(e);
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
