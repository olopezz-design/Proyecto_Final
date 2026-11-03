// database/db.js
const dotenv = require('dotenv');
dotenv.config({ path: './env/.env' });

const mysql = require('mysql2/promise');

const {
  DB_HOST = '127.0.0.1',
  DB_USER = 'pilar',
  DB_PASSWORD = '1025',
  DB_NAME = 'clinica_dental',
  DB_PORT = '3306',
} = process.env;

let pool = null;

function printDbError(prefix, err, extra = {}) {
  console.warn(`[DB] ${prefix}`);
  if (extra && (extra.sql || extra.params)) {
    console.warn('  sql:       ', extra.sql);
    console.warn('  params:    ', extra.params);
  }
  console.warn('  name:      ', err?.name);
  console.warn('  code:      ', err?.code);
  console.warn('  errno:     ', err?.errno);
  console.warn('  sqlState:  ', err?.sqlState);
  console.warn('  message:   ', err?.message || err?.sqlMessage);
  console.warn('  stack:     ', err?.stack?.split('\n')[0]);
}

// detecta " ... LIMIT ? [;|espacios]" al final
const LIMIT_PLACEHOLDER_RE = /limit\s*\?\s*(?:;|\s*)$/i;

function sanitizeLimit(value, { min = 1, max = 500, def = 100 } = {}) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, min), max);
}

async function initPool() {
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    console.warn('[DB] Variables de entorno incompletas. Saltando conexión a la base de datos por ahora.');
    return null;
  }
  if (pool) return pool;

  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: Number(DB_PORT),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 8000,
  });

  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('[DB] Conexión a MySQL establecida.');
  } catch (err) {
    printDbError('No se pudo conectar a MySQL aún. El server seguirá funcionando sin DB.', err);
  }

  return pool;
}

async function getPool() {
  if (!pool) await initPool();
  return pool;
}

async function query(sql, params = []) {
  const p = await getPool();
  if (!p) {
    throw new Error('Base de datos no configurada. Completá env/.env antes de usar la DB.');
  }

  const endsWithLimitPlaceholder = LIMIT_PLACEHOLDER_RE.test(sql);
  let finalParams = params;

  if (endsWithLimitPlaceholder) {
    const idx = params.length - 1;
    const safe = sanitizeLimit(params[idx]);
    if (idx < 0) {
      finalParams = [safe];
    } else {
      finalParams = params.slice();
      finalParams[idx] = safe;
    }
  }

  try {
    // Si hay LIMIT ?, usamos .query() para que mysql2 formatee en cliente (y funcione).
    // Para el resto, .execute() sigue usando prepared statements.
    const method = endsWithLimitPlaceholder ? 'query' : 'execute';
    const [rows] = await p[method](sql, finalParams);
    return rows;
  } catch (err) {
    printDbError('Error en query()', err, { sql, params: finalParams });
    throw err;
  }
}

module.exports = { initPool, getPool, query, sanitizeLimit };