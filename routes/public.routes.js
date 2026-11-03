const express = require('express');
const { query } = require('../database/db');
const router = express.Router();

function tableMissing(err) {
  return err?.code === 'ER_NO_SUCH_TABLE' || err?.code === 'ER_BAD_FIELD_ERROR';
}

async function hasColumn(table, column) {
  const rows = await query(
    `SELECT 1
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [table, column]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function loadPublicPortfolioGroups() {
  const hasDescription = await hasColumn('servicio', 'descripcion');
  const hasPortfolioFlag = await hasColumn('servicio', 'mostrar_portafolio');
  const servicios = await query(`
    SELECT s.idservicio AS id,
           s.nombre,
           ${hasDescription ? 's.descripcion' : "'' AS descripcion"}
      FROM servicio s
     WHERE EXISTS (
           SELECT 1
             FROM portafolio_imagen pi
            WHERE pi.servicio_idservicio = s.idservicio
              AND pi.activo = 1
         )
       ${hasPortfolioFlag ? 'AND s.mostrar_portafolio = 1' : ''}
     ORDER BY s.nombre
  `);

  const imagenes = await query(`
    SELECT pi.idportafolio_imagen AS id,
           pi.servicio_idservicio AS servicioId,
           pi.titulo,
           pi.descripcion,
           pi.imagen_url AS url
      FROM portafolio_imagen pi
     WHERE pi.activo = 1
     ORDER BY pi.servicio_idservicio, pi.orden, pi.idportafolio_imagen
  `);

  const imagesByService = new Map();
  imagenes.forEach((image) => {
    const key = Number(image.servicioId);
    const list = imagesByService.get(key) || [];
    list.push(image);
    imagesByService.set(key, list);
  });

  return servicios.map((service) => ({
    ...service,
    imagenes: imagesByService.get(Number(service.id)) || [],
  }));
}

router.get('/', (req, res) => {
  if (req.session?.user) return res.render('index', { login: true, name: req.session.user.username });
  return res.render('index', { login: false, name: 'Debe iniciar sesión' });
});

router.get(['/admin/login', '/login'], (req, res) => {
  const returnTo = String(req.query.returnTo || '').startsWith('/admin/') ? req.query.returnTo : '';
  const errorMessage = req.query.error ? String(req.query.error) : '';
  res.render('admin/login', {
    message: errorMessage || (req.query.expired === '1' ? 'Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.' : undefined),
    usuario: req.query.usuario || '',
    returnTo,
  });
});
router.get('/admin/signup', (_req, res) => res.redirect('/signup'));
router.get(['/recuperar-password', '/admin/forgot-password'], (_req, res) => res.render('admin/forgot-password'));
router.get(['/restablecer-password', '/admin/reset-password'], (_req, res) => res.render('admin/reset-password'));

// Páginas públicas con URLs limpias.
router.get('/about', (req, res) => res.render('cliente/about'));
router.get('/contact', (req, res) => res.render('cliente/contact'));
router.get('/doctors', (req, res) => res.render('cliente/doctors'));
router.get('/odontopediatria', (req, res) => res.render('cliente/odontopediatria'));
router.get('/portfolio', async (_req, res, next) => {
  try {
    const portfolioGroups = await loadPublicPortfolioGroups();
    res.render('cliente/portfolio', {
      portfolioGroups,
      portfolioReady: true,
    });
  } catch (err) {
    if (!tableMissing(err)) return next(err);
    res.render('cliente/portfolio', {
      portfolioGroups: [],
      portfolioReady: false,
    });
  }
});
router.get('/services', (req, res) => res.render('cliente/services'));

router.get('/cliente/:page', (req, res, next) => {
  const cleanPages = new Set(['about', 'contact', 'doctors', 'odontopediatria', 'portfolio', 'services']);
  if (!cleanPages.has(req.params.page)) return next();
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  return res.redirect(301, `/${req.params.page}${query}`);
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('cnc.sid');
    res.clearCookie('shine.sid');
    res.clearCookie('connect.sid');
    res.redirect('/admin/login');
  });
});

module.exports = router;
