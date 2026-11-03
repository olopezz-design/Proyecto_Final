const session = require('express-session');

const SAFE_IDENTIFIER = /^[a-zA-Z0-9_]+$/;

function normalizeTableName(tableName) {
  const name = tableName || 'session_store';
  if (!SAFE_IDENTIFIER.test(name)) {
    throw new Error('SESSION_TABLE solo puede contener letras, numeros y guion bajo.');
  }
  return name;
}

function getSessionExpiration(sessionData, ttlMs) {
  const cookieExpires = sessionData?.cookie?.expires;
  if (cookieExpires) {
    const expires = new Date(cookieExpires);
    if (!Number.isNaN(expires.getTime())) return expires;
  }
  return new Date(Date.now() + ttlMs);
}

class MySqlSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    if (typeof options.initPool !== 'function') {
      throw new Error('MySqlSessionStore requiere initPool.');
    }
    this.initPool = options.initPool;
    this.table = normalizeTableName(options.table);
    this.ttlMs = Number(options.ttlMs || 1000 * 60 * 60 * 4);
    this.cleanupIntervalMs = Number(options.cleanupIntervalMs || 1000 * 60 * 30);

    if (this.cleanupIntervalMs > 0) {
      this.cleanupTimer = setInterval(() => {
        this.pruneExpired().catch(() => {});
      }, this.cleanupIntervalMs);
      if (typeof this.cleanupTimer.unref === 'function') this.cleanupTimer.unref();
    }
  }

  async getPool() {
    const pool = await this.initPool();
    if (!pool) throw new Error('No hay conexion MySQL disponible para sesiones.');
    return pool;
  }

  get(sid, callback) {
    const done = callback || function () {};
    this.getPool()
      .then((pool) => pool.execute(
        `SELECT data, expires_at FROM ${this.table} WHERE sid = ? LIMIT 1`,
        [sid],
      ))
      .then(async ([rows]) => {
        const row = rows[0];
        if (!row) return done(null, null);

        const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
        if (expiresAt && expiresAt.getTime() <= Date.now()) {
          await this.destroyAsync(sid);
          return done(null, null);
        }

        const sessionData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        return done(null, sessionData);
      })
      .catch((error) => done(error));
  }

  set(sid, sessionData, callback) {
    const done = callback || function () {};
    const expiresAt = getSessionExpiration(sessionData, this.ttlMs);
    const payload = JSON.stringify(sessionData || {});

    this.getPool()
      .then((pool) => pool.execute(
        `INSERT INTO ${this.table} (sid, data, expires_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data), expires_at = VALUES(expires_at), updated_at = CURRENT_TIMESTAMP`,
        [sid, payload, expiresAt],
      ))
      .then(() => done(null))
      .catch((error) => done(error));
  }

  touch(sid, sessionData, callback) {
    const done = callback || function () {};
    const expiresAt = getSessionExpiration(sessionData, this.ttlMs);
    this.getPool()
      .then((pool) => pool.execute(
        `UPDATE ${this.table} SET expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE sid = ?`,
        [expiresAt, sid],
      ))
      .then(() => done(null))
      .catch((error) => done(error));
  }

  destroy(sid, callback) {
    const done = callback || function () {};
    this.destroyAsync(sid)
      .then(() => done(null))
      .catch((error) => done(error));
  }

  async destroyAsync(sid) {
    const pool = await this.getPool();
    await pool.execute(`DELETE FROM ${this.table} WHERE sid = ?`, [sid]);
  }

  async pruneExpired() {
    const pool = await this.getPool();
    await pool.execute(`DELETE FROM ${this.table} WHERE expires_at <= CURRENT_TIMESTAMP`);
  }
}

module.exports = { MySqlSessionStore };
