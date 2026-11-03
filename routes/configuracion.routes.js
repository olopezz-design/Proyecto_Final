// routes/configuracion.routes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const fs = require('fs/promises');
const path = require('path');
const { query, initPool } = require('../database/db');
const { isAuthenticated, requirePermission } = require('../middlewares/auth');
const {
  getEffectivePermissions,
  getPermissionCatalog,
  getRolePermissions,
  getUserExtraPermissions,
  permissionTablesReady,
} = require('../utils/permissions');
const { getAdminProfile } = require('../utils/adminProfile');
const { createNotification } = require('../utils/notificaciones');

const router = express.Router();
const canViewConfig = requirePermission('configuracion:ver');
const canEditConfig = requirePermission('configuracion:editar');
const canViewCatalogs = requirePermission('configuracion:catalogos:ver');
const canCreateCatalogs = requirePermission('configuracion:catalogos:crear');
const canEditCatalogs = requirePermission('configuracion:catalogos:editar');
const canDeleteCatalogs = requirePermission('configuracion:catalogos:eliminar');
const canViewPermissions = requirePermission('configuracion:permisos:ver');
const canEditPermissions = requirePermission('configuracion:permisos:editar');
const canViewAuthorizationRequests = requirePermission('configuracion:solicitudes:ver');
const canApproveAuthorizationRequests = requirePermission('configuracion:solicitudes:aprobar');
const canRejectAuthorizationRequests = requirePermission('configuracion:solicitudes:rechazar');
const canRunCleanup = requirePermission('configuracion:limpieza');

async function loadUsersForSettings() {
  return query(
    `SELECT u.idusuario, u.user, u.estadoUsuario_idestadoUsuario,
            r.nombre AS rol_nombre,
            eu.nombre AS estado_nombre,
            d.iddoctor, d.nombre AS doctor_nombre, d.apellido AS doctor_apellido,
            d.telefono, d.email, d.idestado AS doctor_estado,
            e.nombre AS especialidad_nombre
       FROM usuario u
       LEFT JOIN rol r ON r.idrol = u.rol_idrol
       LEFT JOIN estadousuario eu ON eu.idestadoUsuario = u.estadoUsuario_idestadoUsuario
       LEFT JOIN doctor d ON d.usuario_idusuario = u.idusuario
       LEFT JOIN especialidad e ON e.idespecialidad = d.especialidad_idespecialidad
      ORDER BY u.idusuario DESC`
  );
}

/* ====== Catálogos del sistema (Dental) ====== */
const CAT_MAP = {
  categoria:        { table: 'categoria',       id: 'idcategoria' },
  marca:            { table: 'marca',           id: 'id' }, // en tu BD usas marca.id
  especialidad:     { table: 'especialidad',    id: 'idespecialidad' },
  estadocita:       { table: 'estadocita',      id: 'idestadoCita' },
  estadopaciente:   { table: 'estadopaciente',  id: 'idestado' },          // confirma PK
  estadousuario:    { table: 'estadousuario',   id: 'idestadoUsuario' },
  genero:           { table: 'genero',          id: 'idGenero' },
  tipopaciente:     { table: 'tipopaciente',    id: 'idtipoPaciente' },
  metodo_pago:      { table: 'metodo_pago',     id: 'idmetodo_pago' },     // renombrado desde tipopago
  servicio:         { table: 'servicio',        id: 'idservicio' },
  tiposervicio:     { table: 'tiposervicio',    id: 'idtipoServicio' },
};
const ALLOWED_CATS = Object.keys(CAT_MAP);
const PRICE_CATALOGS = new Set(['servicio', 'tiposervicio']);

const SYSTEM_SETTINGS_DEFAULTS = {
  clinic_name: 'C&C Dental Studio',
  doctor_name: 'Dr. Herbert Castillo',
  clinic_phone: '+502 3515-5503',
  clinic_email: 'castilloherbert@gmail.com',
  clinic_address: '9na Avenida, Apartamento B, Condominio Fuentes del Valle 2, zona 5 de Villa Nueva, Guatemala',
  clinic_coordinates: '14.524983710028918, -90.5631000865086',
  appointment_notifications: '1',
  payment_notifications: '1',
  inventory_notifications: '1',
  registration_notifications: '1',
  email_notifications: '1',
  desktop_notifications: '0',
  session_inactivity_minutes: '60',
};
const SYSTEM_SETTING_KEYS = new Set(Object.keys(SYSTEM_SETTINGS_DEFAULTS));

/* ===== Cache columnas (igual a tu patrón) ===== */
const _colCache = new Map();
const NEG_TTL_MS = 10_000;

function invalidateCols(table) {
  for (const k of Array.from(_colCache.keys())) {
    if (k.startsWith(`${table}:`)) _colCache.delete(k);
  }
}

async function hasColumn(table, column) {
  const key = `${table}:${column}`;
  const now = Date.now();
  const cached = _colCache.get(key);
  if (cached) {
    if (cached.exists) return true;
    if (now - cached.ts < NEG_TTL_MS) return false;
  }
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1`,
    [table, column]
  );
  const exists = Array.isArray(rows) && rows.length > 0;
  _colCache.set(key, { exists, ts: now });
  return exists;
}

async function hasTable(table) {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME=? LIMIT 1`,
    [table]
  );
  return Array.isArray(rows) && rows.length > 0;
}

function splitFullName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { nombre: 'Pendiente', apellido: '' };
  if (parts.length === 1) return { nombre: parts[0], apellido: '' };
  return { nombre: parts.slice(0, -1).join(' '), apellido: parts.at(-1) };
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

async function createUserFromRegistration(conn, { solicitud, roleId, activeStateId }) {
  if ((await hasColumn('usuario', 'nombre')) && (await hasColumn('usuario', 'apellido'))) {
    const { nombre, apellido } = splitFullName(solicitud.nombre);
    const [created] = await conn.execute(
      `INSERT INTO usuario (user, password, rol_idrol, estadoUsuario_idestadoUsuario, nombre, apellido)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [solicitud.user, solicitud.password_hash, roleId, activeStateId, nombre, apellido]
    );
    return created;
  }

  const [created] = await conn.execute(
    `INSERT INTO usuario (user, password, rol_idrol, estadoUsuario_idestadoUsuario)
     VALUES (?, ?, ?, ?)`,
    [solicitud.user, solicitud.password_hash, roleId, activeStateId]
  );
  return created;
}

async function createDoctorFromRegistration(conn, { solicitud, userId }) {
  const [[existingDoctor]] = await conn.execute(
    'SELECT iddoctor FROM doctor WHERE usuario_idusuario=? LIMIT 1',
    [userId]
  );
  if (existingDoctor) return existingDoctor;

  const { nombre, apellido } = splitFullName(solicitud.nombre);
  const specialtyId = await findDefaultSpecialty(conn);
  const [created] = await conn.execute(
    `INSERT INTO doctor
      (nombre, apellido, telefono, email, observacion, usuario_idusuario, especialidad_idespecialidad,
       dpi, fechaNacimiento, tipoSangre, domicilio, idestado, genero_idGenero)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, 1, NULL)`,
    [
      nombre,
      apellido,
      solicitud.telefono || 'Pendiente',
      solicitud.user || 'Pendiente',
      'Creado automáticamente al aprobar solicitud de acceso',
      userId,
      specialtyId,
    ]
  );
  return { iddoctor: created.insertId };
}

/* ===== Vista Configuración ===== */
router.get(['/configuracion', '/admin/configuracion', '/admin/settings'], isAuthenticated, canViewConfig, async (req, res, next) => {
  try {
    const [adminProfile, configUsers] = await Promise.all([
      getAdminProfile(req.session.user),
      loadUsersForSettings(),
    ]);
    res.render('admin/settings', {
      title: 'Configuración del Sistema',
      catalogs: ALLOWED_CATS,
      currentUser: req.session.user,
      adminProfile,
      configUsers,
    });
  } catch (e) { next(e); }
});

router.put('/configuracion/api/usuarios/:id/estado', isAuthenticated, canEditConfig, async (req, res, next) => {
  try {
    const schema = Joi.object({
      estadoUsuario_idestadoUsuario: Joi.number().integer().valid(1, 2).required(),
    });
    const { value, error } = schema.validate(req.body || {});
    if (error) return res.status(400).json({ ok: false, message: error.details[0].message });

    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ ok: false, message: 'Usuario inválido.' });
    }
    if (req.session.user?.id === userId && value.estadoUsuario_idestadoUsuario !== 1) {
      return res.status(400).json({ ok: false, message: 'No puedes inactivar tu propio usuario desde esta pantalla.' });
    }

    const result = await query(
      'UPDATE usuario SET estadoUsuario_idestadoUsuario=? WHERE idusuario=?',
      [value.estadoUsuario_idestadoUsuario, userId]
    );
    if (!result.affectedRows) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });

    await query(
      'UPDATE doctor SET idestado=? WHERE usuario_idusuario=?',
      [value.estadoUsuario_idestadoUsuario === 1 ? 1 : 2, userId]
    ).catch(() => null);

    res.json({ ok: true, estadoUsuario_idestadoUsuario: value.estadoUsuario_idestadoUsuario });
  } catch (e) { next(e); }
});

router.get('/configuracion/api/usuarios', isAuthenticated, canViewConfig, async (_req, res, next) => {
  try {
    const users = await loadUsersForSettings();
    res.json({ ok: true, users });
  } catch (e) { next(e); }
});

/* ===== APIs: configuración general ===== */
async function readSystemSettings() {
  if (!(await hasTable('configuracion_sistema'))) {
    return {
      settings: { ...SYSTEM_SETTINGS_DEFAULTS },
      tablesReady: false,
    };
  }

  const rows = await query(
    `SELECT clave, valor
       FROM configuracion_sistema
      WHERE clave IN (${Array.from(SYSTEM_SETTING_KEYS).map(() => '?').join(',')})`,
    Array.from(SYSTEM_SETTING_KEYS)
  );
  const settings = { ...SYSTEM_SETTINGS_DEFAULTS };
  rows.forEach(row => {
    settings[row.clave] = row.valor;
  });
  return { settings, tablesReady: true };
}

async function requireSystemSettingsTable(res) {
  if (await hasTable('configuracion_sistema')) return true;

  res.status(409).json({
    ok: false,
    error: 'Tabla configuracion_sistema no configurada. Integra el SQL de configuración antes de guardar ajustes.',
  });
  return false;
}

const systemSettingsSchema = Joi.object(
  Object.fromEntries(Array.from(SYSTEM_SETTING_KEYS).map(key => [key, Joi.string().trim().allow('', null)]))
).min(1).unknown(false);

const passwordChangeSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(8).required(),
  confirm_password: Joi.string().required(),
});

router.get('/configuracion/api/system-settings', isAuthenticated, canViewConfig, async (_req, res, next) => {
  try {
    const { settings, tablesReady } = await readSystemSettings();
    res.json({ ok: true, settings, tablesReady });
  } catch (e) { next(e); }
});

router.put('/configuracion/api/system-settings', isAuthenticated, canEditConfig, async (req, res, next) => {
  try {
    if (!(await requireSystemSettingsTable(res))) return;

    const { value, error } = systemSettingsSchema.validate(req.body || {}, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) return joiError(res, error);

    const entries = Object.entries(value)
      .filter(([key]) => SYSTEM_SETTING_KEYS.has(key))
      .map(([key, val]) => [key, val == null ? '' : String(val)]);

    if (!entries.length) return res.json({ ok: true, updated: 0 });

    const placeholders = entries.map(() => '(?, ?)').join(', ');
    const params = entries.flatMap(([key, val]) => [key, val]);
    await query(
      `INSERT INTO configuracion_sistema (clave, valor)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE valor=VALUES(valor)`,
      params
    );

    const { settings } = await readSystemSettings();
    res.json({ ok: true, updated: entries.length, settings });
  } catch (e) { next(e); }
});

router.put('/configuracion/api/password', isAuthenticated, async (req, res, next) => {
  try {
    const { value, error } = passwordChangeSchema.validate(req.body || {}, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) return joiError(res, error);

    if (value.new_password !== value.confirm_password) {
      return res.status(400).json({ ok: false, error: 'Las contraseñas nuevas no coinciden' });
    }

    const userId = req.session.user?.id;
    const [user] = await query('SELECT idusuario, password FROM usuario WHERE idusuario=? LIMIT 1', [userId]);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

    const ok = await bcrypt.compare(value.current_password, user.password);
    if (!ok) return res.status(400).json({ ok: false, error: 'La contraseña actual no es correcta' });

    const hash = await bcrypt.hash(value.new_password, 10);
    await query('UPDATE usuario SET password=? WHERE idusuario=?', [hash, userId]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ===== APIs: catálogos ===== */
router.get('/configuracion/api/catalogs', isAuthenticated, canViewCatalogs, (_req, res) => {
  res.json({ catalogs: ALLOWED_CATS });
});

router.get('/configuracion/api/config/catalogs/:catalog', isAuthenticated, canViewCatalogs, async (req, res, next) => {
  try {
    const key = req.params.catalog;
    if (!ALLOWED_CATS.includes(key)) return res.status(400).json({ error: 'Catálogo no permitido' });
    const { table, id } = CAT_MAP[key];

    // revalidar columnas por cambios de schema recientes
    invalidateCols(table);
    const hasDesc   = await hasColumn(table, 'descripcion');
    const hasActivo = await hasColumn(table, 'activo');
    const hasSimbol = await hasColumn(table, 'simbolo');
    const hasPrice  = PRICE_CATALOGS.has(key) && await hasColumn(table, 'precio');

    const sql = `
      SELECT ${id} AS id, nombre,
             ${hasDesc ? 'descripcion' : "'' AS descripcion"},
             ${hasSimbol && !PRICE_CATALOGS.has(key) ? 'simbolo' : 'NULL AS simbolo'},
             ${hasPrice ? 'precio' : 'NULL AS precio'},
             ${hasActivo ? 'COALESCE(activo,1)' : '1'} AS activo
      FROM ${table}
      ORDER BY nombre
    `;
    const rows = await query(sql);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/configuracion/api/config/catalogs/:catalog', isAuthenticated, canCreateCatalogs, async (req, res, next) => {
  try {
    const key = req.params.catalog;
    if (!ALLOWED_CATS.includes(key)) return res.status(400).json({ error: 'Catálogo no permitido' });

    const s = Joi.object({
      nombre: Joi.string().trim().min(1).required(),
      descripcion: Joi.string().allow('', null),
      activo: Joi.boolean(),
      simbolo: Joi.string().max(12).allow('', null),
      precio: Joi.number().min(0).allow(null).empty(''),
    });
    const v = await s.validateAsync(req.body || {});

    const { table } = CAT_MAP[key];
    invalidateCols(table);
    const hasDesc   = await hasColumn(table, 'descripcion');
    const hasActivo = await hasColumn(table, 'activo');
    const hasSimbol = await hasColumn(table, 'simbolo');
    const hasPrice  = PRICE_CATALOGS.has(key) && await hasColumn(table, 'precio');

    const cols = ['nombre']; const vals = [v.nombre];
    if (hasDesc)   { cols.push('descripcion'); vals.push(v.descripcion ?? null); }
    if (hasSimbol && !PRICE_CATALOGS.has(key)) { cols.push('simbolo'); vals.push(v.simbolo ?? null); }
    if (hasPrice)  { cols.push('precio');      vals.push(v.precio ?? null); }
    if (hasActivo) { cols.push('activo');      vals.push(v.activo === false ? 0 : 1); }

    const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`;
    const r = await query(sql, vals);
    res.status(201).json({ id: r.insertId, ...v, activo: v.activo ?? true });
  } catch (e) {
    if (e.isJoi) return res.status(400).json({ ok:false, errors: e.details.map(d=>d.message) });
    next(e);
  }
});

router.put('/configuracion/api/config/catalogs/:catalog/:id', isAuthenticated, canEditCatalogs, async (req, res, next) => {
  try {
    const key = req.params.catalog;
    if (!ALLOWED_CATS.includes(key)) return res.status(400).json({ error: 'Catálogo no permitido' });

    const s = Joi.object({
      nombre: Joi.string().trim().min(1),
      descripcion: Joi.string().allow('', null),
      activo: Joi.boolean(),
      simbolo: Joi.string().max(12).allow('', null),
      precio: Joi.number().min(0).allow(null).empty(''),
    });
    const v = await s.validateAsync(req.body || {});
    const { table, id: idCol } = CAT_MAP[key];

    invalidateCols(table);
    const hasDesc   = await hasColumn(table, 'descripcion');
    const hasActivo = await hasColumn(table, 'activo');
    const hasSimbol = await hasColumn(table, 'simbolo');
    const hasPrice  = PRICE_CATALOGS.has(key) && await hasColumn(table, 'precio');

    const sets = []; const vals = [];
    if (v.nombre !== undefined)                   { sets.push('nombre=?');      vals.push(v.nombre); }
    if (hasDesc   && v.descripcion !== undefined) { sets.push('descripcion=?'); vals.push(v.descripcion ?? null); }
    if (hasSimbol && !PRICE_CATALOGS.has(key) && v.simbolo !== undefined) { sets.push('simbolo=?'); vals.push(v.simbolo ?? null); }
    if (hasPrice && v.precio !== undefined)       { sets.push('precio=?');      vals.push(v.precio ?? null); }
    if (hasActivo && v.activo  !== undefined)     { sets.push('activo=?');      vals.push(v.activo ? 1 : 0); }

    if (!sets.length) return res.json({ ok:true, updated:0 });
    vals.push(req.params.id);
    await query(`UPDATE ${table} SET ${sets.join(', ')} WHERE ${idCol}=?`, vals);
    res.json({ ok:true, updated:1 });
  } catch (e) {
    if (e.isJoi) return res.status(400).json({ ok:false, errors: e.details.map(d=>d.message) });
    next(e);
  }
});

router.delete('/configuracion/api/config/catalogs/:catalog/:id', isAuthenticated, canDeleteCatalogs, async (req, res, next) => {
  try {
    const key = req.params.catalog;
    if (!ALLOWED_CATS.includes(key)) return res.status(400).json({ error: 'Catálogo no permitido' });
    const { table, id: idCol } = CAT_MAP[key];

    invalidateCols(table);
    const hasActivo = await hasColumn(table, 'activo');

    if (hasActivo) {
      await query(`UPDATE ${table} SET activo=0 WHERE ${idCol}=?`, [req.params.id]);
      return res.json({ id: Number(req.params.id), activo: false });
    }
    await query(`DELETE FROM ${table} WHERE ${idCol}=?`, [req.params.id]);
    res.json({ ok:true, deleted:1 });
  } catch (e) { next(e); }
});

/* ===== APIs: permisos y solicitudes de autorización ===== */
const permissionsSchema = Joi.object({
  permissions: Joi.array().items(Joi.string().trim().min(1)).default([]),
});

const authorizationRequestSchema = Joi.object({
  permiso_key: Joi.string().trim().min(1),
  permisoKey: Joi.string().trim().min(1),
  motivo: Joi.string().trim().allow('', null),
}).or('permiso_key', 'permisoKey');

function joiError(res, error) {
  return res.status(400).json({ ok: false, errors: error.details.map(detail => detail.message) });
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

async function requirePermissionTables(res) {
  if (await permissionTablesReady()) return true;

  res.status(409).json({
    ok: false,
    error: 'Tablas de permisos no configuradas. Ejecuta el SQL de permisos antes de editar asignaciones.',
  });
  return false;
}

async function validatePermissionKeys(keys) {
  const catalog = await getPermissionCatalog();
  const allowed = new Set(catalog.map(item => item.permiso_key));
  const invalid = unique(keys).filter(key => !allowed.has(key));
  return { valid: invalid.length === 0, invalid };
}

async function replaceRolePermissions(roleId, permissions) {
  const keys = unique(permissions);
  await query('DELETE FROM roles_permisos WHERE idrol=?', [roleId]);

  if (!keys.length) return;

  const placeholders = keys.map(() => '(?, ?)').join(', ');
  const params = keys.flatMap(key => [roleId, key]);
  await query(`INSERT IGNORE INTO roles_permisos (idrol, permiso_key) VALUES ${placeholders}`, params);
}

async function replaceUserPermissions(userId, permissions, grantedBy) {
  const keys = unique(permissions);
  await query('DELETE FROM usuarios_permisos WHERE idusuario=?', [userId]);

  if (!keys.length) return;

  const placeholders = keys.map(() => '(?, ?, ?)').join(', ');
  const params = keys.flatMap(key => [userId, key, grantedBy || null]);
  await query(`INSERT IGNORE INTO usuarios_permisos (idusuario, permiso_key, otorgado_por) VALUES ${placeholders}`, params);
}

router.get('/configuracion/api/permissions', isAuthenticated, canViewPermissions, async (_req, res, next) => {
  try {
    const permissions = await getPermissionCatalog();
    res.json({ ok: true, permissions, tablesReady: await permissionTablesReady() });
  } catch (e) { next(e); }
});

router.get('/configuracion/api/roles-permisos', isAuthenticated, canViewPermissions, async (_req, res, next) => {
  try {
    const roles = await query('SELECT idrol, nombre FROM rol ORDER BY idrol');
    const data = [];

    for (const role of roles) {
      data.push({
        ...role,
        permissions: await getRolePermissions(role.idrol),
      });
    }

    res.json({ ok: true, roles: data, tablesReady: await permissionTablesReady() });
  } catch (e) { next(e); }
});

router.put('/configuracion/api/roles/:id/permisos', isAuthenticated, canEditPermissions, async (req, res, next) => {
  try {
    if (!(await requirePermissionTables(res))) return;

    const { value, error } = permissionsSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true });
    if (error) return joiError(res, error);

    const roleId = Number(req.params.id);
    const [role] = await query('SELECT idrol FROM rol WHERE idrol=?', [roleId]);
    if (!role) return res.status(404).json({ ok: false, error: 'Rol no encontrado' });

    const check = await validatePermissionKeys(value.permissions);
    if (!check.valid) {
      return res.status(400).json({ ok: false, error: `Permisos inválidos: ${check.invalid.join(', ')}` });
    }

    await replaceRolePermissions(roleId, value.permissions);
    res.json({ ok: true, idrol: roleId, permissions: unique(value.permissions) });
  } catch (e) { next(e); }
});

router.get('/configuracion/api/usuarios-permisos', isAuthenticated, canViewPermissions, async (_req, res, next) => {
  try {
    const users = await query(`
      SELECT u.idusuario, u.user, u.rol_idrol, r.nombre AS rol_nombre, u.estadoUsuario_idestadoUsuario
        FROM usuario u
        LEFT JOIN rol r ON r.idrol = u.rol_idrol
       ORDER BY u.idusuario
    `);

    const data = [];
    for (const user of users) {
      data.push({
        ...user,
        permissions: await getUserExtraPermissions(user.idusuario),
        effectivePermissions: await getEffectivePermissions({
          id: user.idusuario,
          rol: user.rol_idrol,
        }),
      });
    }

    res.json({ ok: true, users: data, tablesReady: await permissionTablesReady() });
  } catch (e) { next(e); }
});

router.put('/configuracion/api/usuarios/:id/permisos', isAuthenticated, canEditPermissions, async (req, res, next) => {
  try {
    if (!(await requirePermissionTables(res))) return;

    const { value, error } = permissionsSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true });
    if (error) return joiError(res, error);

    const userId = Number(req.params.id);
    const [user] = await query('SELECT idusuario FROM usuario WHERE idusuario=?', [userId]);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

    const check = await validatePermissionKeys(value.permissions);
    if (!check.valid) {
      return res.status(400).json({ ok: false, error: `Permisos inválidos: ${check.invalid.join(', ')}` });
    }

    await replaceUserPermissions(userId, value.permissions, req.session.user.id);
    res.json({ ok: true, idusuario: userId, permissions: unique(value.permissions) });
  } catch (e) { next(e); }
});

router.post(['/configuracion/api/solicitudes-autorizacion/crear', '/api/solicitudes-autorizacion'], isAuthenticated, async (req, res, next) => {
  try {
    if (!(await requirePermissionTables(res))) return;

    const { value, error } = authorizationRequestSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true });
    if (error) return joiError(res, error);

    const permisoKey = value.permiso_key || value.permisoKey;
    const check = await validatePermissionKeys([permisoKey]);
    if (!check.valid) return res.status(400).json({ ok: false, error: 'Permiso inválido' });

    const currentPermissions = await getEffectivePermissions(req.session.user);
    if (currentPermissions.includes('*') || currentPermissions.includes(permisoKey)) {
      return res.status(409).json({ ok: false, error: 'El usuario ya tiene este permiso' });
    }

    const [pending] = await query(
      `SELECT id
         FROM solicitudes_autorizacion
        WHERE idusuario=? AND permiso_key=? AND estado='pendiente'
        LIMIT 1`,
      [req.session.user.id, permisoKey]
    );
    if (pending) return res.status(409).json({ ok: false, error: 'Ya existe una solicitud pendiente para este permiso' });

    const result = await query(
      `INSERT INTO solicitudes_autorizacion (idusuario, permiso_key, motivo)
       VALUES (?, ?, ?)`,
      [req.session.user.id, permisoKey, value.motivo || null]
    );

    await createNotification({
      tipo: 'solicitud',
      titulo: 'Nueva solicitud de permiso',
      mensaje: `${req.session.user.username || 'Un usuario'} solicitó acceso a ${permisoKey}.`,
      url: '/admin/settings#fiveA',
      referenciaTipo: 'solicitudes_autorizacion',
      referenciaId: result.insertId,
    });

    res.status(201).json({ ok: true, id: result.insertId });
  } catch (e) { next(e); }
});

router.get('/configuracion/api/solicitudes-autorizacion', isAuthenticated, canViewAuthorizationRequests, async (_req, res, next) => {
  try {
    if (!(await requirePermissionTables(res))) return;

    const rows = await query(`
      SELECT s.id, s.idusuario, u.user, s.permiso_key, p.label AS permiso_label,
             s.motivo, s.estado, s.respuesta, s.fecha_solicitud, s.fecha_resolucion,
             admin.user AS resuelto_por_usuario
        FROM solicitudes_autorizacion s
        JOIN usuario u ON u.idusuario = s.idusuario
        LEFT JOIN permisos p ON p.permiso_key = s.permiso_key
        LEFT JOIN usuario admin ON admin.idusuario = s.resuelto_por
       ORDER BY FIELD(s.estado, 'pendiente', 'aprobada', 'rechazada'), s.fecha_solicitud DESC
    `);
    res.json({ ok: true, solicitudes: rows });
  } catch (e) { next(e); }
});

router.post('/configuracion/api/solicitudes-autorizacion/:id/aprobar', isAuthenticated, canApproveAuthorizationRequests, async (req, res, next) => {
  const pool = await initPool();
  const conn = await pool.getConnection();

  try {
    if (!(await requirePermissionTables(res))) return;

    await conn.beginTransaction();

    const [[solicitud]] = await conn.execute(
      `SELECT id, idusuario, permiso_key
         FROM solicitudes_autorizacion
        WHERE id=? AND estado='pendiente'
        FOR UPDATE`,
      [req.params.id]
    );
    if (!solicitud) {
      await conn.rollback();
      return res.status(404).json({ ok: false, error: 'Solicitud no encontrada o ya procesada' });
    }

    await conn.execute(
      `INSERT IGNORE INTO usuarios_permisos (idusuario, permiso_key, otorgado_por)
       VALUES (?, ?, ?)`,
      [solicitud.idusuario, solicitud.permiso_key, req.session.user.id]
    );
    await conn.execute(
      `UPDATE solicitudes_autorizacion
          SET estado='aprobada', respuesta=?, resuelto_por=?, fecha_resolucion=NOW()
        WHERE id=?`,
      [req.body?.respuesta || 'Solicitud aprobada por el administrador', req.session.user.id, solicitud.id]
    );

    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

router.post('/configuracion/api/solicitudes-autorizacion/:id/rechazar', isAuthenticated, canRejectAuthorizationRequests, async (req, res, next) => {
  try {
    if (!(await requirePermissionTables(res))) return;

    const result = await query(
      `UPDATE solicitudes_autorizacion
          SET estado='rechazada', respuesta=?, resuelto_por=?, fecha_resolucion=NOW()
        WHERE id=? AND estado='pendiente'`,
      [req.body?.respuesta || 'Solicitud rechazada por el administrador', req.session.user.id, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, error: 'Solicitud no encontrada o ya procesada' });
    }

    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ===== APIs: solicitudes de registro ===== */
const registrationApprovalSchema = Joi.object({
  rol_idrol: Joi.number().integer().positive(),
  rolId: Joi.number().integer().positive(),
}).or('rol_idrol', 'rolId').unknown(true);

async function requireRegistrationTable(res) {
  if (await hasTable('registro_pendiente')) return true;

  res.status(409).json({
    ok: false,
    error: 'Tabla registro_pendiente no configurada. Ejecuta el SQL de solicitudes de registro.',
  });
  return false;
}

async function findActiveUserState(conn) {
  const [rows] = await conn.execute(
    `SELECT idestadoUsuario
       FROM estadousuario
      WHERE LOWER(nombre) IN ('activo', 'active', 'habilitado')
      ORDER BY idestadoUsuario
      LIMIT 1`
  );
  return rows[0]?.idestadoUsuario || 1;
}

router.get('/configuracion/api/solicitudes-registro', isAuthenticated, canViewAuthorizationRequests, async (_req, res, next) => {
  try {
    if (!(await requireRegistrationTable(res))) return;

    const rows = await query(`
      SELECT rp.id, rp.user, rp.nombre, rp.telefono, rp.rol_idrol, r.nombre AS rol_nombre,
             rp.estado, rp.fecha_solicitud, rp.fecha_procesado, rp.motivo_rechazo,
             rp.idusuario_creado
        FROM registro_pendiente rp
        LEFT JOIN rol r ON r.idrol = rp.rol_idrol
       ORDER BY FIELD(rp.estado, 'pendiente', 'aprobada', 'rechazada'), rp.fecha_solicitud DESC
    `);

    res.json({ ok: true, solicitudes: rows });
  } catch (e) { next(e); }
});

router.post('/configuracion/api/solicitudes-registro/:id/aprobar', isAuthenticated, canApproveAuthorizationRequests, async (req, res, next) => {
  const pool = await initPool();
  const conn = await pool.getConnection();

  try {
    if (!(await requireRegistrationTable(res))) return;

    const { value, error } = registrationApprovalSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true });
    if (error) return joiError(res, error);

    await conn.beginTransaction();

    const [[solicitud]] = await conn.execute(
      `SELECT id, user, nombre, telefono, password_hash, rol_idrol
         FROM registro_pendiente
        WHERE id=? AND estado='pendiente'
        FOR UPDATE`,
      [req.params.id]
    );
    if (!solicitud) {
      await conn.rollback();
      return res.status(404).json({ ok: false, error: 'Solicitud no encontrada o ya procesada' });
    }

    const roleId = Number(value.rol_idrol || value.rolId || solicitud.rol_idrol);
    const [[role]] = await conn.execute('SELECT idrol, nombre FROM rol WHERE idrol=? LIMIT 1', [roleId]);
    if (!role) {
      await conn.rollback();
      return res.status(400).json({ ok: false, error: 'Rol inválido' });
    }

    if (['administrador', 'admin', 'superadmin', 'root'].includes(String(role.nombre || '').toLowerCase())) {
      await conn.rollback();
      return res.status(400).json({ ok: false, error: 'El rol administrador solo se crea con código seguro o manualmente.' });
    }

    const [[existingUser]] = await conn.execute('SELECT idusuario FROM usuario WHERE LOWER(user)=LOWER(?) LIMIT 1', [solicitud.user]);
    if (existingUser) {
      await conn.execute(
        `UPDATE registro_pendiente
            SET estado='rechazada', motivo_rechazo='Usuario ya existente', fecha_procesado=NOW()
          WHERE id=?`,
        [solicitud.id]
      );
      await conn.commit();
      return res.status(409).json({ ok: false, error: 'El usuario ya existe' });
    }

    const activeStateId = await findActiveUserState(conn);
    const created = await createUserFromRegistration(conn, { solicitud, roleId, activeStateId });
    await createDoctorFromRegistration(conn, { solicitud, userId: created.insertId });

    await conn.execute(
      `UPDATE registro_pendiente
          SET estado='aprobada', fecha_procesado=NOW(), idusuario_creado=?
        WHERE id=?`,
      [created.insertId, solicitud.id]
    );

    await conn.commit();
    await createNotification({
      tipo: 'usuario',
      titulo: 'Nuevo usuario creado',
      mensaje: `${solicitud.nombre || solicitud.user} ya puede ingresar al sistema.`,
      url: '/admin/settings#sixA',
      referenciaTipo: 'usuario',
      referenciaId: created.insertId,
    });
    res.json({ ok: true, idusuario: created.insertId });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

router.post('/configuracion/api/solicitudes-registro/:id/rechazar', isAuthenticated, canRejectAuthorizationRequests, async (req, res, next) => {
  try {
    if (!(await requireRegistrationTable(res))) return;

    const result = await query(
      `UPDATE registro_pendiente
          SET estado='rechazada', motivo_rechazo=?, fecha_procesado=NOW()
        WHERE id=? AND estado='pendiente'`,
      [req.body?.motivo || 'Solicitud rechazada por el administrador', req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, error: 'Solicitud no encontrada o ya procesada' });
    }

    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ===== APIs: limpieza controlada ===== */
const PORTFOLIO_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'portafolio');
const PORTFOLIO_UPLOAD_PREFIX = '/uploads/portafolio/';
const CLEANUP_AREAS = {
  portfolioInactiveImages: {
    label: 'Imágenes inactivas del portafolio',
    description: 'Elimina registros desactivados y sus archivos locales si todavía existen.',
  },
  portfolioOrphanFiles: {
    label: 'Archivos huérfanos del portafolio',
    description: 'Elimina archivos subidos que ya no están relacionados con ninguna imagen en BD.',
  },
  authorizationRequestsProcessed: {
    label: 'Solicitudes de permisos procesadas',
    description: 'Elimina solicitudes aprobadas o rechazadas que ya no necesitas conservar.',
  },
  registrationRequestsProcessed: {
    label: 'Solicitudes de registro procesadas',
    description: 'Elimina solicitudes de acceso aprobadas o rechazadas.',
  },
  sessionsExpired: {
    label: 'Sesiones vencidas',
    description: 'Elimina sesiones expiradas almacenadas en MySQL para liberar espacio.',
  },
};
const CLEANUP_RANGES = {
  all: { label: 'Desde siempre', cutoffMs: null },
  older_24h: { label: 'Más de 24 horas', cutoffMs: 24 * 60 * 60 * 1000 },
  older_7d: { label: 'Más de 7 días', cutoffMs: 7 * 24 * 60 * 60 * 1000 },
  older_30d: { label: 'Más de 30 días', cutoffMs: 30 * 24 * 60 * 60 * 1000 },
};
const cleanupAreaKeys = Object.keys(CLEANUP_AREAS);
const cleanupRangeKeys = Object.keys(CLEANUP_RANGES);
const cleanupSchema = Joi.object({
  areas: Joi.array().items(Joi.string().valid(...cleanupAreaKeys)).min(1).required(),
  range: Joi.string().valid(...cleanupRangeKeys).default('all'),
});

function mysqlDateTime(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 19).replace('T', ' ');
}

function cleanupCutoff(range) {
  const rule = CLEANUP_RANGES[range] || CLEANUP_RANGES.all;
  return rule.cutoffMs ? new Date(Date.now() - rule.cutoffMs) : null;
}

function sessionTableName() {
  const table = process.env.SESSION_TABLE || 'session_store';
  if (!/^[a-zA-Z0-9_]+$/.test(table)) return 'session_store';
  return table;
}

function safePortfolioPath(imageUrl) {
  const value = String(imageUrl || '').replace(/\\/g, '/');
  if (!value.startsWith(PORTFOLIO_UPLOAD_PREFIX)) return null;

  const filename = path.basename(value);
  if (!filename || filename === '.' || filename === '..') return null;

  const filePath = path.resolve(PORTFOLIO_UPLOAD_DIR, filename);
  return filePath.startsWith(`${PORTFOLIO_UPLOAD_DIR}${path.sep}`) ? filePath : null;
}

async function statFileSafe(filePath) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

async function unlinkSafe(filePath) {
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listPortfolioFiles() {
  try {
    const entries = await fs.readdir(PORTFOLIO_UPLOAD_DIR, { withFileTypes: true });
    return entries
      .filter(entry => entry.isFile())
      .map(entry => path.join(PORTFOLIO_UPLOAD_DIR, entry.name));
  } catch {
    return [];
  }
}

async function portfolioImageDateFilter(cutoff, params) {
  if (!cutoff) return '';

  const hasUpdated = await hasColumn('portafolio_imagen', 'actualizado_en');
  const hasCreated = await hasColumn('portafolio_imagen', 'creado_en');
  const dateExpression = hasUpdated && hasCreated
    ? 'COALESCE(actualizado_en, creado_en)'
    : hasUpdated
      ? 'actualizado_en'
      : hasCreated
        ? 'creado_en'
        : null;

  if (!dateExpression) return '';
  params.push(mysqlDateTime(cutoff));
  return ` AND ${dateExpression} <= ?`;
}

async function getInactivePortfolioImages(cutoff) {
  if (!(await hasTable('portafolio_imagen'))) return [];
  if (!(await hasColumn('portafolio_imagen', 'activo'))) return [];

  const params = [];
  const dateFilter = await portfolioImageDateFilter(cutoff, params);
  return query(
    `SELECT idportafolio_imagen AS id, imagen_url
       FROM portafolio_imagen
      WHERE activo=0${dateFilter}`,
    params
  );
}

async function summarizePortfolioRows(rows) {
  let files = 0;
  let bytes = 0;

  for (const row of rows) {
    const filePath = safePortfolioPath(row.imagen_url);
    if (!filePath) continue;
    const stats = await statFileSafe(filePath);
    if (!stats?.isFile()) continue;
    files += 1;
    bytes += stats.size;
  }

  return { dbRows: rows.length, files, bytes };
}

async function referencedPortfolioFilenames() {
  if (!(await hasTable('portafolio_imagen'))) return new Set();

  const rows = await query(
    `SELECT imagen_url
       FROM portafolio_imagen
      WHERE imagen_url LIKE ?`,
    [`${PORTFOLIO_UPLOAD_PREFIX}%`]
  );
  return new Set(rows.map(row => path.basename(String(row.imagen_url || ''))).filter(Boolean));
}

async function findOrphanPortfolioFiles() {
  const files = await listPortfolioFiles();
  const referenced = await referencedPortfolioFilenames();
  return files.filter(filePath => !referenced.has(path.basename(filePath)));
}

async function summarizeFiles(files) {
  let bytes = 0;
  let count = 0;

  for (const filePath of files) {
    const stats = await statFileSafe(filePath);
    if (!stats?.isFile()) continue;
    count += 1;
    bytes += stats.size;
  }

  return { dbRows: 0, files: count, bytes };
}

async function processedRowsWhere(table, dateColumn, cutoff, params) {
  let where = "WHERE estado IN ('aprobada', 'rechazada')";
  if (!cutoff) return where;

  const hasDate = await hasColumn(table, dateColumn);
  const hasRequestedAt = await hasColumn(table, 'fecha_solicitud');
  const dateExpression = hasDate && hasRequestedAt
    ? `COALESCE(${dateColumn}, fecha_solicitud)`
    : hasDate
      ? dateColumn
      : hasRequestedAt
        ? 'fecha_solicitud'
        : null;

  if (!dateExpression) return where;
  params.push(mysqlDateTime(cutoff));
  return `${where} AND ${dateExpression} <= ?`;
}

async function summarizeProcessedRows(table, dateColumn, cutoff) {
  if (!(await hasTable(table))) return { dbRows: 0, files: 0, bytes: 0 };

  const params = [];
  const where = await processedRowsWhere(table, dateColumn, cutoff, params);
  const [row] = await query(`SELECT COUNT(*) AS total FROM ${table} ${where}`, params);
  return { dbRows: Number(row?.total || 0), files: 0, bytes: 0 };
}

async function summarizeExpiredSessions(cutoff) {
  const table = sessionTableName();
  if (!(await hasTable(table))) return { dbRows: 0, files: 0, bytes: 0 };

  const params = [];
  const where = cutoff
    ? 'WHERE expires_at <= ?'
    : 'WHERE expires_at <= CURRENT_TIMESTAMP';
  if (cutoff) params.push(mysqlDateTime(cutoff));

  const [row] = await query(`SELECT COUNT(*) AS total FROM ${table} ${where}`, params);
  return { dbRows: Number(row?.total || 0), files: 0, bytes: 0 };
}

async function previewCleanupArea(area, cutoff) {
  if (area === 'portfolioInactiveImages') {
    return { key: area, ...CLEANUP_AREAS[area], ...(await summarizePortfolioRows(await getInactivePortfolioImages(cutoff))) };
  }

  if (area === 'portfolioOrphanFiles') {
    return { key: area, ...CLEANUP_AREAS[area], ...(await summarizeFiles(await findOrphanPortfolioFiles())) };
  }

  if (area === 'authorizationRequestsProcessed') {
    return {
      key: area,
      ...CLEANUP_AREAS[area],
      ...(await summarizeProcessedRows('solicitudes_autorizacion', 'fecha_resolucion', cutoff)),
    };
  }

  if (area === 'registrationRequestsProcessed') {
    return {
      key: area,
      ...CLEANUP_AREAS[area],
      ...(await summarizeProcessedRows('registro_pendiente', 'fecha_procesado', cutoff)),
    };
  }

  if (area === 'sessionsExpired') {
    return {
      key: area,
      ...CLEANUP_AREAS[area],
      ...(await summarizeExpiredSessions(cutoff)),
    };
  }

  return { key: area, ...CLEANUP_AREAS[area], dbRows: 0, files: 0, bytes: 0 };
}

function cleanupTotals(items) {
  return items.reduce((acc, item) => ({
    dbRows: acc.dbRows + Number(item.dbRows || 0),
    files: acc.files + Number(item.files || 0),
    bytes: acc.bytes + Number(item.bytes || 0),
  }), { dbRows: 0, files: 0, bytes: 0 });
}

async function buildCleanupPreview(areas, range) {
  const cutoff = cleanupCutoff(range);
  const items = [];

  for (const area of areas) {
    items.push(await previewCleanupArea(area, cutoff));
  }

  return {
    range,
    rangeLabel: CLEANUP_RANGES[range]?.label || CLEANUP_RANGES.all.label,
    cutoff: cutoff ? cutoff.toISOString() : null,
    items,
    totals: cleanupTotals(items),
  };
}

async function deleteInactivePortfolioImages(cutoff) {
  const rows = await getInactivePortfolioImages(cutoff);
  let deletedFiles = 0;
  let deletedBytes = 0;

  for (const row of rows) {
    const filePath = safePortfolioPath(row.imagen_url);
    if (!filePath) continue;
    const stats = await statFileSafe(filePath);
    if (await unlinkSafe(filePath)) {
      deletedFiles += 1;
      deletedBytes += stats?.size || 0;
    }
  }

  if (rows.length) {
    const placeholders = rows.map(() => '?').join(',');
    await query(`DELETE FROM portafolio_imagen WHERE idportafolio_imagen IN (${placeholders})`, rows.map(row => row.id));
  }

  return { key: 'portfolioInactiveImages', ...CLEANUP_AREAS.portfolioInactiveImages, dbRows: rows.length, files: deletedFiles, bytes: deletedBytes };
}

async function deleteOrphanPortfolioFiles() {
  const files = await findOrphanPortfolioFiles();
  let deletedFiles = 0;
  let deletedBytes = 0;

  for (const filePath of files) {
    const stats = await statFileSafe(filePath);
    if (await unlinkSafe(filePath)) {
      deletedFiles += 1;
      deletedBytes += stats?.size || 0;
    }
  }

  return { key: 'portfolioOrphanFiles', ...CLEANUP_AREAS.portfolioOrphanFiles, dbRows: 0, files: deletedFiles, bytes: deletedBytes };
}

async function deleteProcessedRows(table, dateColumn, cutoff) {
  if (!(await hasTable(table))) return 0;

  const params = [];
  const where = await processedRowsWhere(table, dateColumn, cutoff, params);
  const result = await query(`DELETE FROM ${table} ${where}`, params);
  return Number(result?.affectedRows || 0);
}

async function deleteExpiredSessions(cutoff) {
  const table = sessionTableName();
  if (!(await hasTable(table))) return 0;

  const params = [];
  const where = cutoff
    ? 'WHERE expires_at <= ?'
    : 'WHERE expires_at <= CURRENT_TIMESTAMP';
  if (cutoff) params.push(mysqlDateTime(cutoff));

  const result = await query(`DELETE FROM ${table} ${where}`, params);
  return Number(result?.affectedRows || 0);
}

async function executeCleanupArea(area, cutoff) {
  if (area === 'portfolioInactiveImages') return deleteInactivePortfolioImages(cutoff);
  if (area === 'portfolioOrphanFiles') return deleteOrphanPortfolioFiles();
  if (area === 'authorizationRequestsProcessed') {
    return {
      key: area,
      ...CLEANUP_AREAS[area],
      dbRows: await deleteProcessedRows('solicitudes_autorizacion', 'fecha_resolucion', cutoff),
      files: 0,
      bytes: 0,
    };
  }
  if (area === 'registrationRequestsProcessed') {
    return {
      key: area,
      ...CLEANUP_AREAS[area],
      dbRows: await deleteProcessedRows('registro_pendiente', 'fecha_procesado', cutoff),
      files: 0,
      bytes: 0,
    };
  }
  if (area === 'sessionsExpired') {
    return {
      key: area,
      ...CLEANUP_AREAS[area],
      dbRows: await deleteExpiredSessions(cutoff),
      files: 0,
      bytes: 0,
    };
  }
  return { key: area, ...CLEANUP_AREAS[area], dbRows: 0, files: 0, bytes: 0 };
}

router.get('/configuracion/api/limpieza/opciones', isAuthenticated, canRunCleanup, (_req, res) => {
  res.json({
    ok: true,
    areas: Object.entries(CLEANUP_AREAS).map(([key, value]) => ({ key, ...value })),
    ranges: Object.entries(CLEANUP_RANGES).map(([key, value]) => ({ key, label: value.label })),
  });
});

router.post('/configuracion/api/limpieza/preview', isAuthenticated, canRunCleanup, async (req, res, next) => {
  try {
    const { value, error } = cleanupSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true });
    if (error) return joiError(res, error);

    res.json({ ok: true, ...(await buildCleanupPreview(unique(value.areas), value.range)) });
  } catch (e) { next(e); }
});

router.post('/configuracion/api/limpieza/execute', isAuthenticated, canRunCleanup, async (req, res, next) => {
  try {
    const { value, error } = cleanupSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true });
    if (error) return joiError(res, error);

    const cutoff = cleanupCutoff(value.range);
    const items = [];
    for (const area of unique(value.areas)) {
      items.push(await executeCleanupArea(area, cutoff));
    }

    res.json({
      ok: true,
      range: value.range,
      rangeLabel: CLEANUP_RANGES[value.range]?.label || CLEANUP_RANGES.all.label,
      items,
      totals: cleanupTotals(items),
    });
  } catch (e) { next(e); }
});

module.exports = router;
