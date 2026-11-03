const { query } = require('../database/db');

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

function initialsFromName(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'DR';
}

async function getAdminProfile(user) {
  const fallbackName = user?.nombre || user?.user || 'Usuario';
  const fallback = {
    displayName: fallbackName,
    initials: initialsFromName(fallbackName),
    photoUrl: '',
    roleLabel: user?.rol || 'Usuario',
  };

  if (!user?.id) return fallback;

  const photoColumn = await doctorPhotoColumn();
  const rows = await query(
    `SELECT d.iddoctor,
            TRIM(CONCAT(COALESCE(d.nombre, ''), ' ', COALESCE(d.apellido, ''))) AS nombre_completo,
            ${photoColumn ? `d.${photoColumn}` : 'NULL'} AS fotoPerfil,
            e.nombre AS especialidad_nombre
       FROM doctor d
       LEFT JOIN especialidad e ON e.idespecialidad = d.especialidad_idespecialidad
      WHERE d.usuario_idusuario = ?
      LIMIT 1`,
    [user.id]
  );

  const doctor = rows[0];
  if (!doctor) return fallback;

  const displayName = doctor.nombre_completo || fallbackName;
  return {
    displayName,
    initials: initialsFromName(displayName),
    photoUrl: doctor.fotoPerfil || '',
    roleLabel: doctor.especialidad_nombre || user?.rol || 'Doctor',
    doctorId: doctor.iddoctor,
  };
}

module.exports = {
  doctorPhotoColumn,
  getAdminProfile,
  initialsFromName,
};
