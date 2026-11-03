// app.js
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const fs = require('fs'); // lo usas en __debug
const { initPool } = require('./database/db');
const { MySqlSessionStore } = require('./utils/mysqlSessionStore');

dotenv.config({ path: './env/.env' });

const app = express();
const sessionSecret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev_session_secret_change_me');
const sessionMaxAgeMs = Number(process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 4);
const useMySqlSessionStore = String(process.env.SESSION_STORE || '').toLowerCase() === 'mysql';
const defaultInactivityMinutes = Number(process.env.SESSION_INACTIVITY_MINUTES || 60);
let inactivityCache = { value: defaultInactivityMinutes, expiresAt: 0 };

if (!sessionSecret) {
  throw new Error('SESSION_SECRET es obligatorio en producción.');
}

if (process.env.NODE_ENV === 'production' && !useMySqlSessionStore && process.env.ALLOW_MEMORY_SESSION_STORE !== 'true') {
  throw new Error('SESSION_STORE=mysql es obligatorio en producción. Usa ALLOW_MEMORY_SESSION_STORE=true solo para una emergencia controlada.');
}

// Middlewares base
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sesión real (ajusta store si necesitas persistencia)
app.use(session({
  name: 'cnc.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: useMySqlSessionStore
    ? new MySqlSessionStore({
      initPool,
      table: process.env.SESSION_TABLE || 'session_store',
      ttlMs: sessionMaxAgeMs,
      cleanupIntervalMs: Number(process.env.SESSION_CLEANUP_INTERVAL_MS || 1000 * 60 * 30),
    })
    : undefined,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: String(process.env.COOKIE_SECURE).toLowerCase() === 'true',
    maxAge: sessionMaxAgeMs,
  },
}));

// Archivos estáticos
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Sirve /assets desde la carpeta ./assets
//app.use('/assets', express.static(path.join(__dirname, 'assets')));

// 1) Servir /assets desde la carpeta raíz ./assets
const ASSETS_DIR = path.join(__dirname, 'assets');
console.log('🧩 Sirviendo /assets desde:', ASSETS_DIR);
// Sirve tanto /assets como /admin/assets (para páginas que usan "assets/..."):
  app.use(['/assets', '/admin/assets'], express.static(ASSETS_DIR, {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0
  }));

// 2) Ruta de diagnóstico solo para desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.get('/__debug/assets', (req, res) => {
    res.json({
      assetsDir: ASSETS_DIR,
      hasMain: fs.existsSync(path.join(ASSETS_DIR, 'css', 'main.min.css')),
      hasRemix_fontsPlural: fs.existsSync(path.join(ASSETS_DIR, 'fonts', 'remix', 'remixicon.css')),
      hasRemix_fontSingular: fs.existsSync(path.join(ASSETS_DIR, 'font', 'remix', 'remixicon.css'))
    });
  });
}

// Mantiene URLs limpias aunque alguien llegue desde un enlace viejo terminado en .html.
app.use((req, res, next) => {
  if (!req.path.endsWith('.html')) return next();
  const cleanPath = req.path.slice(0, -5) || '/';
  return res.redirect(301, `${cleanPath}${req.url.slice(req.path.length)}`);
});


// Vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
//app.locals.bgImage = '/images/fondo.png';

function wantsJson(req) {
  return req.originalUrl.startsWith('/api/')
    || req.originalUrl.includes('/api/')
    || req.xhr
    || req.accepts(['html', 'json']) === 'json';
}

function sanitizeSessionReturnTo(value) {
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
  ) {
    return target;
  }
  return '/admin/dash';
}

function getSessionReturnTo(req) {
  const headerReturn = sanitizeSessionReturnTo(req.get('x-current-url') || req.get('x-return-to'));
  if (headerReturn !== '/admin/dash') return headerReturn;

  const currentReturn = sanitizeSessionReturnTo(req.originalUrl);
  if (currentReturn !== '/admin/dash') return currentReturn;

  try {
    const referer = req.get('referer');
    if (referer) {
      const refererUrl = new URL(referer);
      const currentHost = req.get('host');
      if (refererUrl.host === currentHost) {
        return sanitizeSessionReturnTo(`${refererUrl.pathname}${refererUrl.search}${refererUrl.hash}`);
      }
    }
  } catch {
  }

  return '/admin/dash';
}

function isPassiveSessionRequest(req) {
  if (req.get('x-cnc-passive') === '1') return true;
  return req.method === 'GET' && (
    req.path === '/api/admin/notificaciones'
    || req.path === '/api/admin/session/status'
  );
}

async function getInactivityMinutes() {
  const now = Date.now();
  if (inactivityCache.expiresAt > now) return inactivityCache.value;

  let value = defaultInactivityMinutes;
  try {
    const pool = await initPool();
    if (pool) {
      const [tables] = await pool.execute(
        `SELECT 1
           FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'configuracion_sistema'
          LIMIT 1`
      );
      if (tables.length) {
        const [rows] = await pool.execute(
          `SELECT valor
             FROM configuracion_sistema
            WHERE clave = 'session_inactivity_minutes'
            LIMIT 1`
        );
        const configured = Number(rows[0]?.valor);
        if (Number.isFinite(configured) && configured >= 0) value = configured;
      }
    }
  } catch {
    value = defaultInactivityMinutes;
  }

  inactivityCache = { value, expiresAt: now + 30_000 };
  return value;
}

app.use(async (req, res, next) => {
  if (!req.session?.user) return next();

  try {
    const minutes = await getInactivityMinutes();
    const passiveRequest = isPassiveSessionRequest(req);
    const now = Date.now();

    if (minutes > 0) {
      const maxIdleMs = minutes * 60 * 1000;
      const lastActivity = Number(req.session.lastActivity);

      if (!Number.isFinite(lastActivity) || lastActivity <= 0) {
        req.session.lastActivity = now;
        req.session.cookie.maxAge = maxIdleMs;
        return next();
      }

      if (now - lastActivity > maxIdleMs) {
        const returnTo = getSessionReturnTo(req);
        return req.session.destroy(() => {
          res.clearCookie('cnc.sid');
          if (wantsJson(req)) {
            return res.status(401).json({ ok: false, error: 'Sesión cerrada por inactividad', expired: true, returnTo });
          }
          return res.redirect(`/admin/login?expired=1&returnTo=${encodeURIComponent(returnTo)}`);
        });
      }

      if (!passiveRequest) {
        req.session.cookie.maxAge = maxIdleMs;
      }
    }

    if (!passiveRequest) {
      req.session.lastActivity = now;
    }
    return next();
  } catch (error) {
    return next(error);
  }
});

// Helper render
function render(view, locals = {}) {
  return (_req, res) => {
    if (!res.headersSent) res.render(view, locals);
  };
}

const { hasAllPermissions } = require('./utils/permissions');

// Middlewares auth locals
function attachLocals(_req, res, next) {
  const permissions = _req.session?.user?.permissions || [];
  res.locals.login = !!(_req.session && _req.session.user);
  res.locals.name = _req.session?.user?.username || 'Debe iniciar sesión';
  res.locals.role = _req.session?.user?.rol || null;
  res.locals.permissions = permissions;
  res.locals.can = (permission) => hasAllPermissions(res.locals.permissions || [], [permission]);
  next();
}
app.use(attachLocals);

app.get('/api/admin/session/status', async (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ ok: false, error: 'Debe iniciar sesión', expired: true, returnTo: getSessionReturnTo(req) });
  }

  const minutes = await getInactivityMinutes();
  const lastActivity = Number(req.session.lastActivity || Date.now());
  const expiresAt = minutes > 0 ? new Date(lastActivity + minutes * 60 * 1000).toISOString() : null;
  return res.json({
    ok: true,
    inactivityMinutes: minutes,
    lastActivity,
    expiresAt,
    serverTime: new Date().toISOString(),
  });
});

// Rutas
const publicRoutes       = require('./routes/public.routes');
const authRoutes         = require('./routes/auth.routes');
const configuracionRoutes= require('./routes/configuracion.routes');
const cotizacionesRoutes = require('./routes/cotizaciones.routes');
const doctoresRoutes     = require('./routes/doctores.routes');    // doctores + inactivos
const pacientesRoutes    = require('./routes/pacientes.routes');   // pacientes + archivados + citas + historial
const pagosRoutes        = require('./routes/pagos.routes');       // usa metodo_pago
const productosRoutes    = require('./routes/productos.routes');   // productos + proveedores + compras + salidas
const usuariosRoutes     = require('./routes/usuarios.routes');
const portafolioRoutes   = require('./routes/portafolio.routes');
const notificacionesRoutes = require('./routes/notificaciones.routes');
const dashboardRoutes    = require('./routes/dashboard.routes');
const perfilRoutes       = require('./routes/perfil.routes');
// app.js (después de montar tus routers principales)
const adminPagesRoutes = require('./routes/generated.admin.pages.routes');
const adminPagesFallback = require('./routes/admin.pages.fallback.routes');

// Home / Index
app.get('/', render('index', { bgImage: '/images/fondo.png' }));
app.get('/index', render('index', { bgImage: '/images/fondo.png' }));

// Montaje (puedes loguear typeof si lo prefieres)
app.use(publicRoutes);
console.log('typeof publicRoutes:', typeof publicRoutes);

app.use(authRoutes);
console.log('typeof authRoutes:', typeof authRoutes);

app.use(configuracionRoutes);
console.log('typeof configuracionRoutes:', typeof configuracionRoutes);

app.use(cotizacionesRoutes);
console.log('typeof cotizacionesRoutes:', typeof cotizacionesRoutes);

app.use(doctoresRoutes);
console.log('typeof doctoresRoutes:', typeof doctoresRoutes);

app.use(pacientesRoutes);
console.log('typeof pacientesRoutes:', typeof pacientesRoutes);

app.use(pagosRoutes);
console.log('typeof pagosRoutes:', typeof pagosRoutes);

app.use(productosRoutes);
console.log('typeof productosRoutes:', typeof productosRoutes);

app.use(usuariosRoutes);
console.log('typeof usuariosRoutes:', typeof usuariosRoutes);

app.use(portafolioRoutes);
console.log('typeof portafolioRoutes:', typeof portafolioRoutes);

app.use(notificacionesRoutes);
console.log('typeof notificacionesRoutes:', typeof notificacionesRoutes);

app.use(dashboardRoutes);
console.log('typeof dashboardRoutes:', typeof dashboardRoutes);

app.use(perfilRoutes);
console.log('typeof perfilRoutes:', typeof perfilRoutes);

app.use(adminPagesRoutes);
console.log('typeof adminPagesRoutes:', typeof adminPagesRoutes);

app.use(adminPagesFallback);
console.log('typeof adminPagesFallback:', typeof adminPagesFallback);

// 404 y error handler (colócalos al FINAL, después de montar TODOS los routers)
const ERROR_VIEW = 'admin/page-not-found';

// 404
app.use((req, res) => {
  const msg = 'Página no encontrada';

  // APIs => JSON
  if (req.originalUrl.startsWith('/configuracion/api/') || req.originalUrl.startsWith('/admin/portafolio/') || req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ ok: false, error: msg });
  }

  // Web => renderiza tu vista de error
  res.status(404);
  res.render(
    ERROR_VIEW,
    { status: 404, message: msg, url: req.originalUrl },
    (err, html) => {
      if (err) return res.type('text/plain').send('404 - Página no encontrada');
      res.send(html);
    }
  );
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  const msg = err.expose ? err.message : (err.message || 'Error inesperado');

  // APIs => JSON
  if (req.originalUrl.startsWith('/configuracion/api/') || req.originalUrl.startsWith('/admin/portafolio/') || req.originalUrl.startsWith('/api/')) {
    return res.status(status).json({ ok: false, error: msg });
  }

  // Web => misma vista de error
  res.status(status);
  res.render(
    ERROR_VIEW,
    {
      status,
      message: msg,
      // Muestra stack solo en dev si tu EJS lo usa
      error: process.env.NODE_ENV === 'development' ? err : null
    },
    (rErr, html) => {
      if (rErr) return res.type('text/plain').send(`${status} - ${msg}`);
      res.send(html);
    }
  );
});

// Arranque
const PORT = process.env.PORT || 3000;
(async () => {
  try {
    if (typeof initPool === 'function') await initPool();
  } catch (dbErr) {
    console.warn('[DB] No se pudo iniciar la DB:', dbErr.message);
  }
  app.listen(PORT, () => console.log(`SERVER RUNNING IN http://localhost:${PORT}`));
})();
