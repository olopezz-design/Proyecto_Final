const { query } = require('../database/db');

const PERMISSIONS = [
  ['*', 'Acceso total', 'Sistema'],
  ['dashboard:ver', 'Ver panel principal', 'General'],
  ['admin:plantilla:ver', 'Ver páginas administrativas extra', 'General'],
  ['portafolio:ver', 'Ver portafolio administrativo', 'Portafolio'],
  ['portafolio:crear', 'Crear grupos e imágenes de portafolio', 'Portafolio'],
  ['portafolio:editar', 'Editar portafolio', 'Portafolio'],
  ['portafolio:eliminar', 'Eliminar imágenes de portafolio', 'Portafolio'],
  ['configuracion:ver', 'Ver configuración', 'Configuración'],
  ['configuracion:editar', 'Editar configuración general', 'Configuración'],
  ['configuracion:limpieza', 'Ejecutar limpieza del sistema', 'Configuración'],
  ['configuracion:catalogos:ver', 'Ver catálogos', 'Configuración'],
  ['configuracion:catalogos:crear', 'Crear catálogos', 'Configuración'],
  ['configuracion:catalogos:editar', 'Editar catálogos', 'Configuración'],
  ['configuracion:catalogos:eliminar', 'Eliminar catálogos', 'Configuración'],
  ['configuracion:permisos:ver', 'Ver permisos', 'Configuración'],
  ['configuracion:permisos:editar', 'Asignar permisos', 'Configuración'],
  ['configuracion:solicitudes:ver', 'Ver solicitudes de autorización', 'Configuración'],
  ['configuracion:solicitudes:aprobar', 'Aprobar solicitudes de autorización', 'Configuración'],
  ['configuracion:solicitudes:rechazar', 'Rechazar solicitudes de autorización', 'Configuración'],
  ['usuarios:ver', 'Ver usuarios', 'Usuarios'],
  ['usuarios:crear', 'Crear usuarios', 'Usuarios'],
  ['usuarios:editar', 'Editar usuarios', 'Usuarios'],
  ['doctores:ver', 'Ver doctores', 'Doctores'],
  ['doctores:crear', 'Crear doctores', 'Doctores'],
  ['doctores:editar', 'Editar doctores', 'Doctores'],
  ['doctores:inactivar', 'Inactivar/reactivar doctores', 'Doctores'],
  ['doctores:horarios', 'Administrar horarios de doctores', 'Doctores'],
  ['pacientes:ver', 'Ver pacientes', 'Pacientes'],
  ['pacientes:crear', 'Crear pacientes', 'Pacientes'],
  ['pacientes:editar', 'Editar pacientes', 'Pacientes'],
  ['pacientes:archivar', 'Archivar/desarchivar pacientes', 'Pacientes'],
  ['citas:ver', 'Ver citas', 'Citas'],
  ['citas:crear', 'Crear citas', 'Citas'],
  ['citas:atender', 'Marcar citas atendidas', 'Citas'],
  ['citas:cancelar', 'Cancelar citas', 'Citas'],
  ['historial:ver', 'Ver historial clínico', 'Historial'],
  ['historial:crear', 'Crear consultas clínicas', 'Historial'],
  ['cotizaciones:ver', 'Ver cotizaciones', 'Cotizaciones'],
  ['cotizaciones:crear', 'Crear cotizaciones', 'Cotizaciones'],
  ['pagos:ver', 'Ver pagos', 'Pagos'],
  ['pagos:crear', 'Crear pagos', 'Pagos'],
  ['pagos:abonar', 'Registrar abonos', 'Pagos'],
  ['inventario:ver', 'Ver inventario', 'Inventario'],
  ['inventario:crear', 'Crear productos/proveedores', 'Inventario'],
  ['inventario:editar', 'Editar productos/proveedores', 'Inventario'],
  ['inventario:eliminar', 'Eliminar productos/proveedores', 'Inventario'],
  ['inventario:compras', 'Registrar compras', 'Inventario'],
  ['inventario:salidas', 'Registrar salidas', 'Inventario'],
];

const DEFAULT_ROLE_PERMISSIONS = {
  1: ['*'],
  2: [
    'dashboard:ver',
    'doctores:ver',
    'pacientes:ver',
    'citas:ver',
    'citas:atender',
    'citas:cancelar',
    'historial:ver',
    'historial:crear',
    'cotizaciones:ver',
    'cotizaciones:crear',
  ],
  3: [
    'dashboard:ver',
    'pacientes:ver',
    'pacientes:crear',
    'pacientes:editar',
    'pacientes:archivar',
    'citas:ver',
    'citas:crear',
    'citas:cancelar',
    'cotizaciones:ver',
    'cotizaciones:crear',
    'pagos:ver',
    'pagos:crear',
    'pagos:abonar',
  ],
};

const tableCache = new Map();

async function tableExists(tableName) {
  if (tableCache.has(tableName)) return tableCache.get(tableName);

  try {
    const rows = await query(
      `SELECT 1
         FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
        LIMIT 1`,
      [tableName]
    );
    const exists = Array.isArray(rows) && rows.length > 0;
    tableCache.set(tableName, exists);
    return exists;
  } catch {
    return false;
  }
}

async function permissionTablesReady() {
  const checks = await Promise.all([
    tableExists('permisos'),
    tableExists('roles_permisos'),
    tableExists('usuarios_permisos'),
  ]);
  return checks.every(Boolean);
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function getPermissionCatalogFallback() {
  return PERMISSIONS.map(([permiso_key, label, grupo]) => ({ permiso_key, label, grupo }));
}

async function getPermissionCatalog() {
  if (!(await tableExists('permisos'))) return getPermissionCatalogFallback();

  const rows = await query(
    `SELECT permiso_key, label, COALESCE(grupo, 'General') AS grupo
       FROM permisos
      ORDER BY grupo, label`
  );
  return rows.length ? rows : getPermissionCatalogFallback();
}

async function getRolePermissions(roleId) {
  const id = Number(roleId);
  if (id === 1) return ['*'];

  if (!(await permissionTablesReady())) {
    return DEFAULT_ROLE_PERMISSIONS[id] || [];
  }

  const rows = await query(
    `SELECT permiso_key
       FROM roles_permisos
      WHERE idrol = ?`,
    [id]
  );
  const fromDb = rows.map(row => row.permiso_key);
  return fromDb.length ? fromDb : (DEFAULT_ROLE_PERMISSIONS[id] || []);
}

async function getUserExtraPermissions(userId) {
  if (!(await tableExists('usuarios_permisos'))) return [];

  const rows = await query(
    `SELECT permiso_key
       FROM usuarios_permisos
      WHERE idusuario = ?`,
    [userId]
  );
  return rows.map(row => row.permiso_key);
}

async function getEffectivePermissions(user) {
  const userId = user?.id || user?.idusuario;
  const roleId = user?.rol || user?.rol_idrol;

  if (Number(roleId) === 1) return ['*'];

  const byRole = await getRolePermissions(roleId);
  const byUser = userId ? await getUserExtraPermissions(userId) : [];
  return unique([...byRole, ...byUser]);
}

function permissionMatches(granted, needed) {
  if (granted === '*' || granted === needed) return true;
  if (granted.endsWith(':*')) {
    return needed.startsWith(granted.slice(0, -1));
  }
  return false;
}

function hasPermission(grantedPermissions, needed) {
  return (grantedPermissions || []).some(granted => permissionMatches(granted, needed));
}

function hasAllPermissions(grantedPermissions, neededPermissions) {
  return (neededPermissions || []).every(permission => hasPermission(grantedPermissions, permission));
}

function knownPermissionKeys() {
  return new Set(PERMISSIONS.map(([key]) => key));
}

module.exports = {
  DEFAULT_ROLE_PERMISSIONS,
  getEffectivePermissions,
  getPermissionCatalog,
  getPermissionCatalogFallback,
  getRolePermissions,
  getUserExtraPermissions,
  hasAllPermissions,
  hasPermission,
  knownPermissionKeys,
  permissionTablesReady,
};
