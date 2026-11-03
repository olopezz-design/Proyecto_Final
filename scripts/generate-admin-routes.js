// scripts/generate-admin-routes.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const viewsDir = path.join(ROOT, 'views', 'admin');
const outFile = path.join(ROOT, 'routes', 'generated.admin.pages.routes.js');

// Rutas que YA tienes con controladores propios o no quieres exponer:
const SKIP = new Set([
  // dashboards / auth / index
  'index', 'login', 'signup', 'login copy', 'dashboard', 'dashboard2', 'dashboard3',

  // módulos con router propio
  'doctores', 'doctoresInactivos', 'pacientes', 'archivados',
  'citas', 'historial', 'pago', 'productos', 'proveedores',
  'salidasProductos', 'comprasProductos', 'cotizaciones',
  'categorias', 'marcas', 'configuracion', 'payments', 'verPaciente', 'gallery',

  // vistas “delicadas”
  'settings', 'create-invoice', 'invoice-details', 'invoices'
]);

const isValidName = (name) => /^[a-z0-9\-]+$/i.test(name);

function scan() {
  if (!fs.existsSync(viewsDir)) {
    console.error('[ERR] No existe:', viewsDir);
    process.exit(1);
  }
  const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.ejs'));
  const pages = [];

  for (const file of files) {
    let base = file.replace(/\.ejs$/i, '');

    // Ignorar duplicados como "(2).ejs" o copias
    if (/\(\d+\)$/i.test(base)) continue;
    if (/\scopy$/i.test(base)) continue;

    // Ignorar con espacios (si quieres soportarlos, mapea a slug)
    if (base.includes(' ')) continue;

    if (SKIP.has(base)) continue;
    if (!isValidName(base)) continue;

    pages.push({ slug: base, view: base });
  }
  pages.sort((a, b) => a.slug.localeCompare(b.slug));
  return pages;
}

function generate(pages) {
const header = `// Archivo AUTOGENERADO. No editar a mano.
// Ejecuta: node scripts/generate-admin-routes.js
const express = require('express');
const { isAuthenticated, requirePermission } = require('../middlewares/auth');

const router = express.Router();

function pageGuard(page) {
  return requirePermission(page === 'dash' ? 'dashboard:ver' : 'admin:plantilla:ver');
}
`;

  const body = pages.map(p =>
    `router.get('/admin/${p.slug}', isAuthenticated, pageGuard('${p.slug}'), (req, res) => res.render('admin/${p.view}'));`
  ).join('\n');

  const footer = `

module.exports = router;
`;

  const code = header + '\n' + body + footer;
  fs.writeFileSync(outFile, code, 'utf8');
  console.log('[OK] Rutas generadas:', pages.length, '→', path.relative(ROOT, outFile));
}

const pages = scan();
generate(pages);
