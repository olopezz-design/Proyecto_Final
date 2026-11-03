const { query } = require('../database/db');

async function hasTable(tableName) {
  try {
    const rows = await query(
      `SELECT 1
         FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
        LIMIT 1`,
      [tableName]
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

async function hasColumn(tableName, columnName) {
  try {
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
  } catch {
    return false;
  }
}

function notificationUserId(user) {
  return Number(user?.idusuario || user?.id || user || 0) || null;
}

async function notificationsReady() {
  return hasTable('notificacion');
}

async function createNotification({
  tipo = 'sistema',
  titulo,
  mensaje = '',
  url = null,
  usuarioId = null,
  referenciaTipo = null,
  referenciaId = null,
  dedupeKey = null,
} = {}) {
  if (!titulo || !(await notificationsReady())) return null;

  try {
    const optionalColumns = {
      usuario_idusuario: usuarioId || null,
      referencia_tipo: referenciaTipo || null,
      referencia_id: referenciaId || null,
      dedupe_key: dedupeKey || null,
    };
    const columns = ['tipo', 'titulo', 'mensaje', 'url'];
    const values = [tipo, titulo, mensaje || '', url || null];

    for (const [column, value] of Object.entries(optionalColumns)) {
      if (await hasColumn('notificacion', column)) {
        columns.push(column);
        values.push(value);
      }
    }

    const placeholders = columns.map(() => '?').join(', ');
    const update = columns.includes('dedupe_key')
      ? ' ON DUPLICATE KEY UPDATE titulo=VALUES(titulo), mensaje=VALUES(mensaje), url=VALUES(url), leida=0, creada_en=CURRENT_TIMESTAMP'
      : '';
    const result = await query(
      `INSERT INTO notificacion (${columns.join(', ')})
       VALUES (${placeholders})${update}`,
      values
    );
    return result.insertId || null;
  } catch (error) {
    console.warn('[notificaciones] No se pudo registrar notificación:', error.message);
    return null;
  }
}

async function listNotifications(user, limit = 8) {
  if (!(await notificationsReady())) return { items: [], unread: 0, ready: false };

  const userId = notificationUserId(user);
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);
  const hasReads = await hasTable('notificacion_lectura');
  const hasUserColumn = await hasColumn('notificacion', 'usuario_idusuario');

  const scopeWhere = hasUserColumn
    ? 'WHERE (n.usuario_idusuario IS NULL OR n.usuario_idusuario = ?)'
    : 'WHERE 1=1';
  const scopeParams = hasUserColumn ? [userId] : [];
  const readExpression = hasReads
    ? `CASE
         WHEN ${hasUserColumn ? 'n.usuario_idusuario IS NULL' : '1=1'} THEN IF(nl.notificacion_idnotificacion IS NULL, 0, 1)
         ELSE COALESCE(n.leida, 0)
       END`
    : 'COALESCE(n.leida, 0)';
  const joinReads = hasReads
    ? 'LEFT JOIN notificacion_lectura nl ON nl.notificacion_idnotificacion = n.idnotificacion AND nl.usuario_idusuario = ?'
    : '';
  const joinParams = hasReads ? [userId] : [];

  const items = await query(
    `SELECT n.idnotificacion, n.tipo, n.titulo, n.mensaje, n.url, n.creada_en,
            ${readExpression} AS leida
       FROM notificacion n
       ${joinReads}
       ${scopeWhere}
      ORDER BY n.creada_en DESC
      LIMIT ?`,
    [...joinParams, ...scopeParams, safeLimit]
  );

  const countRows = await query(
    `SELECT COUNT(*) AS total
       FROM notificacion n
       ${joinReads}
       ${scopeWhere}
        AND ${readExpression} = 0`,
    [...joinParams, ...scopeParams]
  );

  return { items, unread: Number(countRows[0]?.total || 0), ready: true };
}

async function markNotificationRead(user, notificationId) {
  if (!(await notificationsReady())) return false;

  const userId = notificationUserId(user);
  const id = Number(notificationId || 0);
  if (!id) return false;

  const [notification] = await query(
    'SELECT idnotificacion, usuario_idusuario FROM notificacion WHERE idnotificacion=? LIMIT 1',
    [id]
  );
  if (!notification) return false;

  if (notification.usuario_idusuario) {
    await query('UPDATE notificacion SET leida=1, leida_en=CURRENT_TIMESTAMP WHERE idnotificacion=?', [id]);
    return true;
  }

  if (await hasTable('notificacion_lectura')) {
    await query(
      `INSERT IGNORE INTO notificacion_lectura (notificacion_idnotificacion, usuario_idusuario)
       VALUES (?, ?)`,
      [id, userId]
    );
    return true;
  }

  await query('UPDATE notificacion SET leida=1, leida_en=CURRENT_TIMESTAMP WHERE idnotificacion=?', [id]);
  return true;
}

async function markAllNotificationsRead(user) {
  if (!(await notificationsReady())) return false;

  const userId = notificationUserId(user);
  if (await hasTable('notificacion_lectura')) {
    await query(
      `INSERT IGNORE INTO notificacion_lectura (notificacion_idnotificacion, usuario_idusuario)
       SELECT idnotificacion, ?
         FROM notificacion
        WHERE usuario_idusuario IS NULL`,
      [userId]
    );
  }
  if (await hasColumn('notificacion', 'usuario_idusuario')) {
    await query(
      `UPDATE notificacion
          SET leida=1, leida_en=CURRENT_TIMESTAMP
        WHERE usuario_idusuario = ?`,
      [userId]
    );
  } else {
    await query('UPDATE notificacion SET leida=1, leida_en=CURRENT_TIMESTAMP');
  }
  return true;
}

module.exports = {
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationUserId,
};
