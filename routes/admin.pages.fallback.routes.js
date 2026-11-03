// routes/admin.pages.fallback.routes.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { isAuthenticated, requirePermission } = require('../middlewares/auth');

const router = express.Router();
const viewsDir = path.join(__dirname, '..', 'views', 'admin');
const fallbackAdminPermission = 'admin:plantilla:ver';
const pagePermissions = new Map([
  ['dash', 'dashboard:ver'],
  ['categorias', 'configuracion:catalogos:ver'],
  ['marcas', 'configuracion:catalogos:ver'],
  ['configuracion', 'configuracion:ver'],
  ['doctores', 'doctores:ver'],
  ['doctoresInactivos', 'doctores:ver'],
  ['productos', 'inventario:ver'],
  ['proveedores', 'inventario:ver'],
  ['comprasProductos', 'inventario:compras'],
  ['salidasProductos', 'inventario:salidas'],
  ['pago', 'pagos:ver'],
  ['payments', 'pagos:ver'],
]);
const blockedDirectPages = new Set(['verPaciente']);

// Lee todas las .ejs del directorio admin (excepto parciales que empiecen con "_")
function loadAllowed() {
  try {
    const files = fs.readdirSync(viewsDir);
    return new Set(
      files
        .filter(f => f.endsWith('.ejs') && !f.startsWith('_'))
        .map(f => path.basename(f, '.ejs'))
    );
  } catch (e) {
    console.warn('[admin-fallback] No se pudo leer views/admin:', e.message);
    return new Set();
  }
}

// Cache con recarga “perezosa” cuando no encuentra una vista
let ALLOW = loadAllowed();

// /admin -> redirige a la primera vista disponible (o a dash si existe)
router.get('/admin', isAuthenticated, requirePermission('dashboard:ver'), (req, res, next) => {
  const target =
    (ALLOW.has('dash') && 'dash') ||
    (ALLOW.has('index') && 'index') ||
    Array.from(ALLOW)[0] ||
    'page-not-found';
  return res.redirect(`/admin/${target}`);
});

// /admin/:page -> si existe esa vista en views/admin, la renderiza
router.get('/admin/:page', isAuthenticated, (req, res, next) => {
  const page = String(req.params.page).replace(/[^a-z0-9\-]/gi, '');

  if (page === 'index' || page === 'dashboard') {
    return requirePermission('dashboard:ver')(req, res, () => res.redirect('/admin/dash'));
  }

  if (!ALLOW.has(page)) {
    // Intenta recargar la lista (por si agregaste nuevos .ejs)
    ALLOW = loadAllowed();
  }
  if (!ALLOW.has(page)) return next();
  if (blockedDirectPages.has(page)) return next();

  const file = path.join(viewsDir, `${page}.ejs`);
  const renderPage = () => fs.access(file, fs.constants.R_OK, (err) => {
    if (err) return next();
    return res.render(`admin/${page}`);
  });

  return requirePermission(pagePermissions.get(page) || fallbackAdminPermission)(req, res, renderPage);
});

module.exports = router;
