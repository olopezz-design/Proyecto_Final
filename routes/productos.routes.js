// routes/productos.routes.js
const express = require('express');
const Joi = require('joi');
const PDFDocument = require('pdfkit');
const { query, initPool } = require('../database/db');
const { isAuthenticated, requirePermission } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { getAdminProfile } = require('../utils/adminProfile');
const { createNotification } = require('../utils/notificaciones');

const router = express.Router();
const canViewInventory = requirePermission('inventario:ver');
const canCreateInventory = requirePermission('inventario:crear');
const canEditInventory = requirePermission('inventario:editar');
const canDeleteInventory = requirePermission('inventario:eliminar');
const canBuyInventory = requirePermission('inventario:compras');
const canMoveInventory = requirePermission('inventario:salidas');
const canViewCatalogs = requirePermission('configuracion:catalogos:ver');
const canCreateCatalogs = requirePermission('configuracion:catalogos:crear');
const canEditCatalogs = requirePermission('configuracion:catalogos:editar');
const canDeleteCatalogs = requirePermission('configuracion:catalogos:eliminar');

const idParam = Joi.object({ id: Joi.number().integer().positive().required() });
const categoriaIdParam = Joi.object({ id: Joi.number().integer().positive().required() });
const catalogItemSchema = Joi.object({
  nombre: Joi.string().trim().min(1).required(),
  descripcion: Joi.string().allow('', null),
  simbolo: Joi.string().trim().max(12).allow('', null),
});

function isForeignKeyError(error) {
  return error?.code === 'ER_ROW_IS_REFERENCED_2' || error?.errno === 1451;
}

async function tableExists(tableName, conn = null) {
  const executor = conn || { execute: async (sql, params) => [await query(sql, params)] };
  const [rows] = await executor.execute(
    `SELECT 1
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      LIMIT 1`,
    [tableName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function tableHasColumn(tableName, columnName, conn = null) {
  const executor = conn || { execute: async (sql, params) => [await query(sql, params)] };
  const [rows] = await executor.execute(
    `SELECT 1
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [tableName, columnName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function sessionUserId(req) {
  return req.session?.user?.idusuario || req.session?.user?.id || null;
}

async function ensureInventoryRow(conn, productId, stock = 0, stockMinimo = null) {
  const [rows] = await conn.execute(
    'SELECT id FROM inventario WHERE producto_id = ? ORDER BY id ASC LIMIT 1',
    [productId]
  );
  if (rows[0]) {
    if (stockMinimo !== null && stockMinimo !== undefined) {
      await conn.execute(
        'UPDATE inventario SET stock_actual = ?, stock_seguridad = ? WHERE id = ?',
        [stock, stockMinimo, rows[0].id]
      );
    } else {
      await conn.execute('UPDATE inventario SET stock_actual = ? WHERE id = ?', [stock, rows[0].id]);
    }
    return rows[0].id;
  }
  const [created] = await conn.execute(
    'INSERT INTO inventario (producto_id, stock_actual, stock_seguridad) VALUES (?, ?, ?)',
    [productId, stock, stockMinimo || 0]
  );
  return created.insertId;
}

async function movementColumnMap(conn = null) {
  const checks = await Promise.all([
    tableHasColumn('movimientoinventario', 'tipo', conn),
    tableHasColumn('movimientoinventario', 'usuario_idusuario', conn),
    tableHasColumn('movimientoinventario', 'motivo', conn),
    tableHasColumn('movimientoinventario', 'referencia_tipo', conn),
    tableHasColumn('movimientoinventario', 'referencia_id', conn),
    tableHasColumn('movimientoinventario', 'stock_resultante', conn),
  ]);
  return {
    tipo: checks[0],
    usuario: checks[1],
    motivo: checks[2],
    referenciaTipo: checks[3],
    referenciaId: checks[4],
    stockResultante: checks[5],
  };
}

async function addInventoryMovement(conn, payload) {
  const productId = Number(payload.productoId || payload.producto_id || 0);
  const quantity = Math.max(Number(payload.cantidad || 0), 0);
  const type = String(payload.tipo || 'salida_manual').trim();
  const reason = String(payload.motivo || payload.descripcion || '').trim() || 'Movimiento de inventario';
  const userId = payload.usuarioId || null;
  if (!productId || quantity <= 0) throw new Error('Movimiento de inventario inválido.');

  const [products] = await conn.execute('SELECT id, stock FROM producto WHERE id = ? FOR UPDATE', [productId]);
  const product = products[0];
  if (!product) throw new Error('Producto no encontrado.');

  const currentStock = Number(product.stock || 0);
  let nextStock = currentStock;
  if (type === 'entrada_manual') nextStock = currentStock + quantity;
  if (type === 'salida_manual' || type === 'salida_por_tratamiento') nextStock = currentStock - quantity;
  if (type === 'ajuste') nextStock = quantity;
  if (nextStock < 0) throw new Error('No hay suficiente stock para registrar la salida.');

  await conn.execute('UPDATE producto SET stock = ? WHERE id = ?', [nextStock, productId]);
  await ensureInventoryRow(conn, productId, nextStock);

  const columns = ['producto_id', 'cantidad', 'fecha', 'descripcion'];
  const values = [productId, quantity, payload.fecha || new Date(), reason];
  const map = await movementColumnMap(conn);
  if (map.tipo) { columns.push('tipo'); values.push(type); }
  if (map.usuario) { columns.push('usuario_idusuario'); values.push(userId); }
  if (map.motivo) { columns.push('motivo'); values.push(reason); }
  if (map.referenciaTipo) { columns.push('referencia_tipo'); values.push(payload.referenciaTipo || null); }
  if (map.referenciaId) { columns.push('referencia_id'); values.push(payload.referenciaId || null); }
  if (map.stockResultante) { columns.push('stock_resultante'); values.push(nextStock); }

  const placeholders = columns.map(() => '?').join(', ');
  const [created] = await conn.execute(
    `INSERT INTO movimientoinventario (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );
  return { id: created.insertId, stock: nextStock };
}

async function notifyStockStatus(productId, stock) {
  try {
    const [product] = await query(
      `SELECT p.nombre, COALESCE(i.stock_seguridad, 0) AS stock_minimo
         FROM producto p
         LEFT JOIN inventario i ON i.producto_id = p.id
        WHERE p.id = ?
        LIMIT 1`,
      [productId]
    );
    if (!product) return;
    const currentStock = Number(stock || 0);
    const minimum = Number(product.stock_minimo || 0);
    if (currentStock <= 0) {
      await createNotification({
        tipo: 'producto_agotado',
        titulo: 'Producto agotado',
        mensaje: `${product.nombre} se quedó sin stock.`,
        url: '/admin/productos',
        referenciaTipo: 'producto',
        referenciaId: productId,
        dedupeKey: `producto-agotado-${productId}`,
      });
      return;
    }
    if (minimum > 0 && currentStock <= minimum) {
      await createNotification({
        tipo: 'stock_bajo',
        titulo: 'Stock bajo',
        mensaje: `${product.nombre} está en ${currentStock} unidades.`,
        url: '/admin/productos',
        referenciaTipo: 'producto',
        referenciaId: productId,
        dedupeKey: `stock-bajo-${productId}`,
      });
    }
  } catch (error) {
    console.warn('[inventario] No se pudo evaluar stock para notificaciones:', error.message);
  }
}

async function replaceProductRelations(conn, productId, tableName, idColumn, ids) {
  if (!(await tableExists(tableName, conn))) return;
  const normalized = [...new Set(normalizeArray(ids).map(Number).filter(Boolean))];
  await conn.execute(`DELETE FROM ${tableName} WHERE producto_id = ?`, [productId]);
  for (const id of normalized) {
    await conn.execute(
      `INSERT INTO ${tableName} (producto_id, ${idColumn}) VALUES (?, ?)`,
      [productId, id]
    );
  }
}

async function loadInventoryProducts() {
  const hasProductProvider = await tableExists('producto_proveedor');
  const hasProductBrand = await tableExists('producto_marca');
  const hasMovementType = await tableHasColumn('movimientoinventario', 'tipo');

  const providersJoin = hasProductProvider
    ? `LEFT JOIN (
         SELECT pp.producto_id, GROUP_CONCAT(DISTINCT pr.nombre ORDER BY pr.nombre SEPARATOR ', ') AS proveedores
           FROM producto_proveedor pp
           JOIN proveedor pr ON pr.id = pp.proveedor_id
          GROUP BY pp.producto_id
       ) provs ON provs.producto_id = p.id`
    : `LEFT JOIN (
         SELECT df.producto_idproducto AS producto_id, GROUP_CONCAT(DISTINCT pr.nombre ORDER BY pr.nombre SEPARATOR ', ') AS proveedores
           FROM detallefactura df
           JOIN proveedor pr ON pr.id = df.proveedor_idproveedor
          GROUP BY df.producto_idproducto
       ) provs ON provs.producto_id = p.id`;

  const brandsJoin = hasProductBrand
    ? `LEFT JOIN (
         SELECT pm.producto_id, GROUP_CONCAT(DISTINCT m2.nombre ORDER BY m2.nombre SEPARATOR ', ') AS marcas
           FROM producto_marca pm
           JOIN marca m2 ON m2.id = pm.marca_id
          GROUP BY pm.producto_id
       ) marcas_multi ON marcas_multi.producto_id = p.id`
    : `LEFT JOIN (SELECT NULL AS producto_id, NULL AS marcas) marcas_multi ON 1 = 0`;

  const movementsJoin = hasMovementType
    ? `LEFT JOIN (
         SELECT producto_id,
                SUM(CASE WHEN tipo = 'entrada_manual' THEN cantidad ELSE 0 END) AS entradas,
                SUM(CASE WHEN tipo IN ('salida_manual', 'salida_por_tratamiento') THEN cantidad ELSE 0 END) AS salidas,
                MAX(fecha) AS ultima_actualizacion
           FROM movimientoinventario
          GROUP BY producto_id
       ) movs ON movs.producto_id = p.id`
    : `LEFT JOIN (
         SELECT producto_id,
                0 AS entradas,
                SUM(cantidad) AS salidas,
                MAX(fecha) AS ultima_actualizacion
           FROM movimientoinventario
          GROUP BY producto_id
       ) movs ON movs.producto_id = p.id`;

  return query(`
    SELECT p.id, p.nombre, p.descripcion, p.precio, p.fecha_expiracion, p.stock,
           m.id AS marca_id, c.idcategoria AS categoria_idcategoria,
           m.nombre AS nombre_marca, c.nombre AS nombre_categoria,
           COALESCE(inv.stock_actual, p.stock, 0) AS stock_actual,
           COALESCE(inv.stock_seguridad, 0) AS stock_minimo,
           COALESCE(marcas_multi.marcas, m.nombre, '') AS marcas,
           COALESCE(provs.proveedores, '') AS proveedores,
           COALESCE(movs.entradas, 0) AS entradas,
           COALESCE(movs.salidas, 0) AS salidas,
           movs.ultima_actualizacion
      FROM producto p
      LEFT JOIN marca m ON p.marca_id=m.id
      LEFT JOIN categoria c ON p.categoria_id=c.idcategoria
      LEFT JOIN (
        SELECT producto_id, MAX(stock_actual) AS stock_actual, MAX(stock_seguridad) AS stock_seguridad
          FROM inventario
         GROUP BY producto_id
      ) inv ON inv.producto_id = p.id
      ${brandsJoin}
      ${providersJoin}
      ${movementsJoin}
     ORDER BY p.id DESC
  `);
}

/* ===== Catálogos legacy usados por inventario ===== */
async function renderCategorias(_req, res, next) {
  try {
    const hasEstado = await tableHasColumn('categoria', 'idestado');
    const hasSimbolo = await tableHasColumn('categoria', 'simbolo');
    const categorias = await query(`SELECT idcategoria, nombre, descripcion, ${hasSimbolo ? 'simbolo' : 'NULL'} AS simbolo, ${hasEstado ? 'idestado' : '1'} AS idestado FROM categoria ${hasEstado ? 'WHERE COALESCE(idestado,1)=1' : ''} ORDER BY idcategoria DESC`);
    res.render('admin/categorias', { categorias });
  } catch (e) { next(e); }
}

async function renderMarcas(_req, res, next) {
  try {
    const hasEstado = await tableHasColumn('marca', 'idestado');
    const marcas = await query(`SELECT id, nombre, descripcion, ${hasEstado ? 'idestado' : '1'} AS idestado FROM marca ${hasEstado ? 'WHERE COALESCE(idestado,1)=1' : ''} ORDER BY id DESC`);
    res.render('admin/marcas', { marcas });
  } catch (e) { next(e); }
}

async function createCategoria(req, res, next) {
  try {
    const { nombre, descripcion, simbolo } = req.body;
    const hasSimbolo = await tableHasColumn('categoria', 'simbolo');
    const columns = ['nombre', 'descripcion'];
    const values = [nombre, descripcion || ''];
    if (hasSimbolo) {
      columns.push('simbolo');
      values.push(simbolo || null);
    }
    await query(`INSERT INTO categoria (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`, values);
    res.send('Categoría agregada con éxito');
  } catch (e) { next(e); }
}

async function updateCategoria(req, res, next) {
  try {
    const { nombre, descripcion, simbolo } = req.body;
    const hasSimbolo = await tableHasColumn('categoria', 'simbolo');
    const sets = ['nombre=?', 'descripcion=?'];
    const values = [nombre, descripcion || ''];
    if (hasSimbolo) {
      sets.push('simbolo=?');
      values.push(simbolo || null);
    }
    values.push(req.params.id);
    const r = await query(`UPDATE categoria SET ${sets.join(', ')} WHERE idcategoria=?`, values);
    if (!r.affectedRows) return res.status(404).send('Categoría no encontrada');
    res.send('Categoría actualizada con éxito');
  } catch (e) { next(e); }
}

async function deleteCategoria(req, res, next) {
  try {
    const r = await tableHasColumn('categoria', 'idestado')
      ? await query('UPDATE categoria SET idestado=2 WHERE idcategoria=?', [req.params.id])
      : await query('DELETE FROM categoria WHERE idcategoria=?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).send('Categoría no encontrada');
    res.send('Categoría desactivada con éxito');
  } catch (e) {
    if (isForeignKeyError(e)) return res.status(409).send('No se puede eliminar la categoría porque está en uso.');
    next(e);
  }
}

async function createMarca(req, res, next) {
  try {
    const { nombre, descripcion } = req.body;
    await query('INSERT INTO marca (nombre, descripcion) VALUES (?, ?)', [nombre, descripcion || '']);
    res.send('Marca agregada con éxito');
  } catch (e) { next(e); }
}

async function updateMarca(req, res, next) {
  try {
    const { nombre, descripcion } = req.body;
    const r = await query('UPDATE marca SET nombre=?, descripcion=? WHERE id=?', [nombre, descripcion || '', req.params.id]);
    if (!r.affectedRows) return res.status(404).send('Marca no encontrada');
    res.send('Marca actualizada con éxito');
  } catch (e) { next(e); }
}

async function deleteMarca(req, res, next) {
  try {
    const r = await tableHasColumn('marca', 'idestado')
      ? await query('UPDATE marca SET idestado=2 WHERE id=?', [req.params.id])
      : await query('DELETE FROM marca WHERE id=?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).send('Marca no encontrada');
    res.send('Marca desactivada con éxito');
  } catch (e) {
    if (isForeignKeyError(e)) return res.status(409).send('No se puede eliminar la marca porque está en uso.');
    next(e);
  }
}

router.get('/admin/categorias', isAuthenticated, canViewCatalogs, renderCategorias);
router.post('/admin/categorias', isAuthenticated, canCreateCatalogs, validate(catalogItemSchema), createCategoria);
router.put('/admin/categorias/:id', isAuthenticated, canEditCatalogs, validate(categoriaIdParam, 'params'), validate(catalogItemSchema), updateCategoria);
router.delete('/admin/categorias/:id', isAuthenticated, canDeleteCatalogs, validate(categoriaIdParam, 'params'), deleteCategoria);

router.get('/admin/marcas', isAuthenticated, canViewCatalogs, renderMarcas);
router.post('/admin/marcas', isAuthenticated, canCreateCatalogs, validate(catalogItemSchema), createMarca);
router.put('/admin/marcas/:id', isAuthenticated, canEditCatalogs, validate(idParam, 'params'), validate(catalogItemSchema), updateMarca);
router.delete('/admin/marcas/:id', isAuthenticated, canDeleteCatalogs, validate(idParam, 'params'), deleteMarca);

// Compatibilidad temporal con vistas/enlaces antiguos mientras terminamos de migrar todo a /admin.
router.post('/categorias', isAuthenticated, canCreateCatalogs, validate(catalogItemSchema), createCategoria);
router.put('/categorias/:id', isAuthenticated, canEditCatalogs, validate(categoriaIdParam, 'params'), validate(catalogItemSchema), updateCategoria);
router.delete('/categorias/:id', isAuthenticated, canDeleteCatalogs, validate(categoriaIdParam, 'params'), deleteCategoria);
router.post('/marcas', isAuthenticated, canCreateCatalogs, validate(catalogItemSchema), createMarca);
router.put('/marcas/:id', isAuthenticated, canEditCatalogs, validate(idParam, 'params'), validate(catalogItemSchema), updateMarca);
router.delete('/marcas/:id', isAuthenticated, canDeleteCatalogs, validate(idParam, 'params'), deleteMarca);

/* ===== Productos ===== */
const productoSchema = Joi.object({
  nombreProducto: Joi.string().required(),
  descripcionProducto: Joi.string().allow('', null),
  precioProducto: Joi.number().min(0).required(),
  fechaExpiracionProducto: Joi.date().allow('', null),
  marcaProducto: Joi.number().integer().required(),
  categoriaProducto: Joi.number().integer().required(),
  stockInicialProducto: Joi.number().integer().min(0).default(0),
  stockMinimoProducto: Joi.number().integer().min(0).default(0),
  proveedoresProducto: Joi.alternatives().try(
    Joi.array().items(Joi.number().integer().positive()),
    Joi.number().integer().positive(),
    Joi.string().allow('', null)
  ).optional(),
  marcasProducto: Joi.alternatives().try(
    Joi.array().items(Joi.number().integer().positive()),
    Joi.number().integer().positive(),
    Joi.string().allow('', null)
  ).optional(),
});

router.get('/admin/productos', isAuthenticated, canViewInventory, async (req, res, next) => {
  try {
    const [adminProfile, productos, marcas, categorias, proveedores] = await Promise.all([
      getAdminProfile(req.session.user),
      loadInventoryProducts(),
      query('SELECT id, nombre FROM marca ORDER BY nombre'),
      query('SELECT idcategoria, nombre FROM categoria ORDER BY nombre'),
      query('SELECT id, nombre FROM proveedor ORDER BY nombre'),
    ]);
    res.render('admin/productos', { adminProfile, productos, marcas, categorias, proveedores });
  } catch (e) { next(e); }
});

router.post('/admin/agregarProducto', isAuthenticated, canCreateInventory, validate(productoSchema), async (req, res, next) => {
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const p = req.body;
    const [created] = await conn.execute(
      'INSERT INTO producto (nombre, descripcion, precio, stock, fecha_expiracion, marca_id, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        p.nombreProducto,
        p.descripcionProducto || '',
        p.precioProducto,
        p.stockInicialProducto || 0,
        p.fechaExpiracionProducto || null,
        p.marcaProducto,
        p.categoriaProducto,
      ]
    );
    await ensureInventoryRow(conn, created.insertId, p.stockInicialProducto || 0, p.stockMinimoProducto || 0);
    await replaceProductRelations(conn, created.insertId, 'producto_proveedor', 'proveedor_id', p.proveedoresProducto);
    await replaceProductRelations(conn, created.insertId, 'producto_marca', 'marca_id', p.marcasProducto || p.marcaProducto);
    await conn.commit();
    res.redirect('/admin/productos');
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

router.post('/admin/editarProducto', isAuthenticated, canEditInventory, validate(productoSchema.keys({ productoId: Joi.number().integer().required() })), async (req, res, next) => {
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const p = req.body;
    await conn.execute(
      `UPDATE producto SET nombre=?, descripcion=?, precio=?, stock=?, fecha_expiracion=?, marca_id=?, categoria_id=? WHERE id=?`,
      [
        p.nombreProducto,
        p.descripcionProducto || '',
        p.precioProducto,
        p.stockInicialProducto || 0,
        p.fechaExpiracionProducto || null,
        p.marcaProducto,
        p.categoriaProducto,
        p.productoId,
      ]
    );
    await ensureInventoryRow(conn, p.productoId, p.stockInicialProducto || 0, p.stockMinimoProducto || 0);
    await replaceProductRelations(conn, p.productoId, 'producto_proveedor', 'proveedor_id', p.proveedoresProducto);
    await replaceProductRelations(conn, p.productoId, 'producto_marca', 'marca_id', p.marcasProducto || p.marcaProducto);
    await conn.commit();
    res.redirect('/admin/productos');
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

router.delete('/admin/eliminarProducto/:id', isAuthenticated, canDeleteInventory, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const r = await query('DELETE FROM producto WHERE id=?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).send('Producto no encontrado');
    res.status(200).send('Producto eliminado con éxito.');
  } catch (e) {
    if (isForeignKeyError(e)) return res.status(409).send('No se puede eliminar el producto porque está en uso.');
    next(e);
  }
});

/* ===== Proveedores ===== */
const proveedorSchema = Joi.object({
  nombre: Joi.string().required(),
  nit: Joi.string().allow('', null),
  contacto: Joi.string().allow('', null),
  email: Joi.string().email().allow('', null),
  telefono: Joi.string().allow('', null),
  direccion: Joi.string().allow('', null),
  observaciones: Joi.string().allow('', null),
  contactos: Joi.array().items(Joi.object({
    nombre: Joi.string().allow('', null),
    telefono: Joi.string().allow('', null),
    correo: Joi.string().email().allow('', null),
    puesto: Joi.string().allow('', null),
  })).default([]),
});

async function loadProviders() {
  const hasNit = await tableHasColumn('proveedor', 'nit');
  const hasObservaciones = await tableHasColumn('proveedor', 'observaciones');
  const hasEstado = await tableHasColumn('proveedor', 'idestado');
  const hasContacts = await tableExists('proveedor_contacto');
  const where = hasEstado ? 'WHERE COALESCE(idestado, 1) = 1' : '';

  const proveedores = await query(`
    SELECT id, nombre, contacto, email, telefono, direccion,
           ${hasNit ? 'nit' : 'NULL'} AS nit,
           ${hasObservaciones ? 'observaciones' : 'NULL'} AS observaciones,
           ${hasEstado ? 'idestado' : '1'} AS idestado
      FROM proveedor
      ${where}
     ORDER BY id DESC
  `);

  if (!hasContacts || !proveedores.length) {
    return proveedores.map(item => ({
      ...item,
      contactos: item.contacto || item.telefono || item.email
        ? [{ nombre: item.contacto || 'Contacto principal', telefono: item.telefono || '', correo: item.email || '', puesto: '' }]
        : [],
    }));
  }

  const ids = proveedores.map(item => item.id);
  const placeholders = ids.map(() => '?').join(', ');
  const contactos = await query(
    `SELECT id, proveedor_id, nombre, telefono, correo, puesto
       FROM proveedor_contacto
      WHERE proveedor_id IN (${placeholders})
      ORDER BY proveedor_id, id`,
    ids
  );
  return proveedores.map(item => ({
    ...item,
    contactos: contactos.filter(contact => Number(contact.proveedor_id) === Number(item.id)),
  }));
}

async function providerColumns() {
  const checks = await Promise.all([
    tableHasColumn('proveedor', 'nit'),
    tableHasColumn('proveedor', 'observaciones'),
  ]);
  return { nit: checks[0], observaciones: checks[1] };
}

function normalizeProviderContacts(provider) {
  const contacts = Array.isArray(provider.contactos) ? provider.contactos : [];
  const normalized = contacts
    .map(contact => ({
      nombre: String(contact.nombre || '').trim(),
      telefono: String(contact.telefono || '').trim(),
      correo: String(contact.correo || '').trim(),
      puesto: String(contact.puesto || '').trim(),
    }))
    .filter(contact => contact.nombre || contact.telefono || contact.correo || contact.puesto);

  if (!normalized.length && (provider.contacto || provider.telefono || provider.email)) {
    normalized.push({
      nombre: String(provider.contacto || '').trim() || 'Contacto principal',
      telefono: String(provider.telefono || '').trim(),
      correo: String(provider.email || '').trim(),
      puesto: '',
    });
  }
  return normalized;
}

async function replaceProviderContacts(conn, providerId, contacts) {
  if (!(await tableExists('proveedor_contacto', conn))) return;
  await conn.execute('DELETE FROM proveedor_contacto WHERE proveedor_id = ?', [providerId]);
  for (const contact of contacts) {
    await conn.execute(
      `INSERT INTO proveedor_contacto (proveedor_id, nombre, telefono, correo, puesto)
       VALUES (?, ?, ?, ?, ?)`,
      [providerId, contact.nombre, contact.telefono || null, contact.correo || null, contact.puesto || null]
    );
  }
}

router.get('/admin/proveedores', isAuthenticated, canViewInventory, async (req, res, next) => {
  try {
    const [adminProfile, proveedores] = await Promise.all([
      getAdminProfile(req.session.user),
      loadProviders(),
    ]);
    res.render('admin/proveedores', { adminProfile, proveedores });
  } catch (e) { next(e); }
});

async function createProveedor(req, res, next) {
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const p = req.body;
    const contacts = normalizeProviderContacts(p);
    const primary = contacts[0] || {};
    const columns = ['nombre', 'contacto', 'email', 'telefono', 'direccion'];
    const values = [
      p.nombre,
      p.contacto || primary.nombre || '',
      p.email || primary.correo || '',
      p.telefono || primary.telefono || '',
      p.direccion || '',
    ];
    const optional = await providerColumns();
    if (optional.nit) { columns.push('nit'); values.push(p.nit || null); }
    if (optional.observaciones) { columns.push('observaciones'); values.push(p.observaciones || null); }

    const [created] = await conn.execute(
      `INSERT INTO proveedor (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      values
    );
    await replaceProviderContacts(conn, created.insertId, contacts);
    await conn.commit();
    res.send('Proveedor agregado con éxito');
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
}

async function updateProveedor(req, res, next) {
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const p = req.body;
    const contacts = normalizeProviderContacts(p);
    const primary = contacts[0] || {};
    const assignments = ['nombre=?', 'contacto=?', 'email=?', 'telefono=?', 'direccion=?'];
    const values = [
      p.nombre,
      p.contacto || primary.nombre || '',
      p.email || primary.correo || '',
      p.telefono || primary.telefono || '',
      p.direccion || '',
    ];
    const optional = await providerColumns();
    if (optional.nit) { assignments.push('nit=?'); values.push(p.nit || null); }
    if (optional.observaciones) { assignments.push('observaciones=?'); values.push(p.observaciones || null); }
    values.push(req.params.id);

    const [r] = await conn.execute(`UPDATE proveedor SET ${assignments.join(', ')} WHERE id=?`, values);
    if (!r.affectedRows) {
      await conn.rollback();
      return res.status(404).send('Proveedor no encontrado');
    }
    await replaceProviderContacts(conn, req.params.id, contacts);
    await conn.commit();
    res.send('Proveedor actualizado con éxito');
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
}

async function deleteProveedor(req, res, next) {
  try {
    let r;
    if (await tableHasColumn('proveedor', 'idestado')) {
      r = await query('UPDATE proveedor SET idestado=2 WHERE id=?', [req.params.id]);
    } else {
      r = await query('DELETE FROM proveedor WHERE id=?', [req.params.id]);
    }
    if (!r.affectedRows) return res.status(404).send('Proveedor no encontrado');
    res.send('Proveedor desactivado con éxito');
  } catch (e) {
    if (isForeignKeyError(e)) return res.status(409).send('No se puede eliminar el proveedor porque está en uso.');
    next(e);
  }
}

router.post('/admin/proveedores', isAuthenticated, canCreateInventory, validate(proveedorSchema), createProveedor);
router.put('/admin/proveedores/:id', isAuthenticated, canEditInventory, validate(idParam, 'params'), validate(proveedorSchema), updateProveedor);
router.delete('/admin/proveedores/:id', isAuthenticated, canDeleteInventory, validate(idParam, 'params'), deleteProveedor);

// Compatibilidad temporal con vistas/enlaces antiguos mientras terminamos de migrar todo a /admin.
router.post('/proveedores', isAuthenticated, canCreateInventory, validate(proveedorSchema), createProveedor);
router.put('/proveedores/:id', isAuthenticated, canEditInventory, validate(idParam, 'params'), validate(proveedorSchema), updateProveedor);
router.delete('/proveedores/:id', isAuthenticated, canDeleteInventory, validate(idParam, 'params'), deleteProveedor);

/* ===== Compras de productos ===== */
const compraSchema = Joi.object({
  fechaEmision: Joi.date().required(),
  tipoPago: Joi.number().integer().required(), // idmetodo_pago
  proveedor: Joi.number().integer().required(),
  totalGlobal: Joi.number().min(0).required(),
  productos: Joi.array().items(Joi.object({
    producto: Joi.number().integer().required(),
    cantidad: Joi.number().integer().min(1).required(),
    precioCompra: Joi.number().min(0).required(),
    subtotal: Joi.number().min(0).required(),
  })).min(1).required(),
});

const idFacturaParam = Joi.object({ idfactura: Joi.number().integer().positive().required() });

router.get('/admin/comprasProductos', isAuthenticated, canBuyInventory, async (req, res, next) => {
  try {
    const [adminProfile, facturas, detalles] = await Promise.all([
      getAdminProfile(req.session.user),
      query('SELECT idfactura, fechaEmision, montoTotal, metodo_pago_idmetodo_pago AS tipoPago_idtipoPago FROM factura ORDER BY idfactura DESC'),
      query(`
        SELECT df.iddetalleFactura, df.cantidad, df.subtotal, df.factura_idfactura, df.producto_idproducto, df.proveedor_idproveedor,
               p.nombre AS nombre_producto, pr.nombre AS nombre_proveedor
        FROM detallefactura df
        LEFT JOIN producto p ON df.producto_idproducto=p.id
        LEFT JOIN proveedor pr ON df.proveedor_idproveedor=pr.id
      `),
    ]);
    facturas.forEach(f => f.detalles = detalles.filter(d => d.factura_idfactura === f.idfactura));
    res.render('admin/comprasProductos', { adminProfile, facturas });
  } catch (e) { next(e); }
});

router.get('/admin/get-proveedores', isAuthenticated, canBuyInventory, async (_req, res, next) => {
  try {
    const rows = await query('SELECT id, nombre FROM proveedor ORDER BY nombre');
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/admin/get-productos', isAuthenticated, canBuyInventory, async (_req, res, next) => {
  try {
    const rows = await query('SELECT id, nombre FROM producto ORDER BY nombre');
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/admin/comprar-producto', isAuthenticated, canBuyInventory, validate(compraSchema), async (req, res, next) => {
  const { fechaEmision, tipoPago, proveedor, productos, totalGlobal } = req.body;
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rf] = await conn.execute(
      'INSERT INTO factura (fechaEmision, metodo_pago_idmetodo_pago, montoTotal) VALUES (?, ?, ?)',
      [fechaEmision, tipoPago, totalGlobal]
    );
    const facturaId = rf.insertId;

    const affectedProducts = [];
    for (const { producto, cantidad, precioCompra, subtotal } of productos) {
      await conn.execute(
        'INSERT INTO detallefactura (cantidad, subtotal, factura_idfactura, producto_idproducto, proveedor_idproveedor) VALUES (?, ?, ?, ?, ?)',
        [cantidad, subtotal, facturaId, producto, proveedor]
      );
      const movement = await addInventoryMovement(conn, {
        productoId: producto,
        cantidad,
        tipo: 'entrada_manual',
        motivo: `Compra registrada en factura #${facturaId}`,
        referenciaTipo: 'factura',
        referenciaId: facturaId,
        usuarioId: sessionUserId(req),
      });
      affectedProducts.push({ id: producto, stock: movement.stock });
      await conn.execute('UPDATE producto SET precio=? WHERE id=?', [precioCompra, producto]);
      if (await tableExists('producto_proveedor', conn)) {
        const [rel] = await conn.execute(
          'SELECT 1 FROM producto_proveedor WHERE producto_id = ? AND proveedor_id = ? LIMIT 1',
          [producto, proveedor]
        );
        if (!rel[0]) {
          await conn.execute('INSERT INTO producto_proveedor (producto_id, proveedor_id) VALUES (?, ?)', [producto, proveedor]);
        }
      }
    }

    await conn.commit();
    await Promise.all(affectedProducts.map(item => notifyStockStatus(item.id, item.stock)));
    res.json({ success: true, facturaId });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

router.get('/admin/get-detalles-factura/:idfactura', isAuthenticated, canBuyInventory, validate(idFacturaParam, 'params'), async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT p.nombre AS producto_nombre, df.cantidad, df.subtotal
       FROM detallefactura df JOIN producto p ON df.producto_idproducto=p.id
       WHERE df.factura_idfactura=?`,
      [req.params.idfactura]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/admin/eliminar-factura', isAuthenticated, canBuyInventory, validate(Joi.object({ facturaId: Joi.number().integer().positive().required() })), async (req, res, next) => {
  const { facturaId } = req.body;
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [dets] = await conn.execute('SELECT producto_idproducto, cantidad FROM detallefactura WHERE factura_idfactura=?', [facturaId]);
    for (const d of dets) {
      await conn.execute('UPDATE producto SET stock=stock-? WHERE id=?', [d.cantidad, d.producto_idproducto]);
      const [[product]] = await conn.execute('SELECT stock FROM producto WHERE id=?', [d.producto_idproducto]);
      await ensureInventoryRow(conn, d.producto_idproducto, Math.max(Number(product?.stock || 0), 0));
    }
    await conn.execute('DELETE FROM detallefactura WHERE factura_idfactura=?', [facturaId]);
    await conn.execute('DELETE FROM factura WHERE idfactura=?', [facturaId]);
    await conn.commit();
    res.json({ success: true });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

/* ===== Salidas ===== */
const salidaSchema = Joi.object({
  producto_id: Joi.number().integer().required(),
  cantidad: Joi.number().integer().min(1).required(),
  fecha: Joi.date().required(),
  descripcion: Joi.string().required(),
});

router.get('/admin/salidasProductos', isAuthenticated, canMoveInventory, async (req, res, next) => {
  try {
    const [hasType, hasStockResultante, adminProfile, productos] = await Promise.all([
      tableHasColumn('movimientoinventario', 'tipo'),
      tableHasColumn('movimientoinventario', 'stock_resultante'),
      getAdminProfile(req.session.user),
      query('SELECT id, nombre, stock FROM producto ORDER BY nombre'),
    ]);
    const movimientos = await query(`
      SELECT mi.id,
             DATE_FORMAT(mi.fecha, '%Y-%m-%d') AS fecha,
             TIME_FORMAT(mi.fecha, '%H:%i') AS hora,
             mi.cantidad,
             mi.descripcion,
             mi.producto_id,
             ${hasType ? 'mi.tipo' : 'NULL'} AS tipo,
             ${hasStockResultante ? 'mi.stock_resultante' : 'NULL'} AS stock_resultante,
             p.nombre AS nombre_producto,
             p.stock AS stock_actual
        FROM movimientoinventario mi
        LEFT JOIN producto p ON mi.producto_id = p.id
       ORDER BY mi.id DESC
    `);
    res.render('admin/salidasProductos', { adminProfile, movimientos, productos });
  } catch (e) { next(e); }
});

router.get('/admin/getProductos', isAuthenticated, canMoveInventory, async (_req, res, next) => {
  try {
    const productos = await query('SELECT id, nombre FROM producto ORDER BY nombre');
    res.json({ productos });
  } catch (e) { next(e); }
});

router.post('/admin/salidasProducto', isAuthenticated, canMoveInventory, validate(salidaSchema), async (req, res, next) => {
  const { producto_id, cantidad, fecha, descripcion } = req.body;
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const movement = await addInventoryMovement(conn, {
      productoId: producto_id,
      cantidad,
      fecha,
      tipo: 'salida_manual',
      motivo: descripcion,
      usuarioId: sessionUserId(req),
    });

    await conn.commit();
    await notifyStockStatus(producto_id, movement.stock);
    res.redirect('/admin/salidasProductos');
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

router.post('/admin/eliminarMovimiento', isAuthenticated, canMoveInventory, validate(Joi.object({ id: Joi.number().integer().positive().required() })), async (req, res, next) => {
  const { id } = req.body;
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const hasType = await tableHasColumn('movimientoinventario', 'tipo', conn);
    const [[mov]] = await conn.query(`SELECT producto_id, cantidad, ${hasType ? 'tipo' : 'NULL'} AS tipo FROM movimientoinventario WHERE id=?`, [id]);
    if (!mov) { await conn.rollback(); return res.status(404).send('Movimiento no encontrado'); }
    const movementType = String(mov.tipo || 'salida_manual');
    const delta = movementType === 'entrada_manual' ? -Number(mov.cantidad || 0) : Number(mov.cantidad || 0);
    await conn.execute('UPDATE producto SET stock=GREATEST(stock + ?, 0) WHERE id=?', [delta, mov.producto_id]);
    const [[product]] = await conn.execute('SELECT stock FROM producto WHERE id=?', [mov.producto_id]);
    await ensureInventoryRow(conn, mov.producto_id, Math.max(Number(product?.stock || 0), 0));
    await conn.execute('DELETE FROM movimientoinventario WHERE id=?', [id]);
    await conn.commit();
    res.send({ success: true, message: 'Movimiento eliminado y stock actualizado.' });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

const movimientoRapidoSchema = Joi.object({
  producto_id: Joi.number().integer().positive().required(),
  tipo: Joi.string().valid('entrada_manual', 'salida_manual', 'ajuste').required(),
  cantidad: Joi.number().integer().min(1).required(),
  motivo: Joi.string().trim().allow('', null),
});

router.post('/api/admin/inventario/movimientos', isAuthenticated, canMoveInventory, validate(movimientoRapidoSchema), async (req, res, next) => {
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await addInventoryMovement(conn, {
      productoId: req.body.producto_id,
      cantidad: req.body.cantidad,
      tipo: req.body.tipo,
      motivo: req.body.motivo || 'Movimiento manual',
      usuarioId: sessionUserId(req),
    });
    await conn.commit();
    await notifyStockStatus(req.body.producto_id, result.stock);
    res.json({ success: true, ...result });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

router.get('/api/admin/productos/:id/historial', isAuthenticated, canViewInventory, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const hasType = await tableHasColumn('movimientoinventario', 'tipo');
    const hasReason = await tableHasColumn('movimientoinventario', 'motivo');
    const hasStock = await tableHasColumn('movimientoinventario', 'stock_resultante');
    const rows = await query(
      `SELECT mi.id, mi.producto_id, mi.cantidad, mi.fecha, mi.descripcion,
              ${hasType ? 'mi.tipo' : 'NULL'} AS tipo,
              ${hasReason ? 'mi.motivo' : 'mi.descripcion'} AS motivo,
              ${hasStock ? 'mi.stock_resultante' : 'NULL'} AS stock_resultante,
              p.nombre AS producto
         FROM movimientoinventario mi
         LEFT JOIN producto p ON p.id = mi.producto_id
        WHERE mi.producto_id = ?
        ORDER BY mi.fecha DESC, mi.id DESC
        LIMIT 80`,
      [req.params.id]
    );
    res.json({ success: true, movimientos: rows });
  } catch (e) { next(e); }
});

async function ensureShoppingListStorage() {
  const missing = [];
  if (!(await tableExists('lista_compra'))) missing.push('tabla lista_compra');
  if (!(await tableExists('lista_compra_detalle'))) missing.push('tabla lista_compra_detalle');
  if (missing.length) {
    const error = new Error(`Falta configurar lista de compras: ${missing.join(', ')}. Ejecuta manualmente el SQL compartido en el chat.`);
    error.status = 500;
    throw error;
  }
}

async function loadShoppingLists() {
  if (!(await tableExists('lista_compra')) || !(await tableExists('lista_compra_detalle'))) return [];
  const rows = await query(`
    SELECT lc.idlistaCompra, lc.nombre, lc.estado, lc.created_at, lc.updated_at,
           COUNT(lcd.idlistaCompraDetalle) AS total_items,
           COALESCE(SUM(lcd.cantidad), 0) AS total_unidades
      FROM lista_compra lc
      LEFT JOIN lista_compra_detalle lcd ON lcd.lista_compra_id = lc.idlistaCompra
     GROUP BY lc.idlistaCompra, lc.nombre, lc.estado, lc.created_at, lc.updated_at
     ORDER BY lc.idlistaCompra DESC
     LIMIT 25
  `);
  return rows;
}

async function loadShoppingList(listId) {
  await ensureShoppingListStorage();
  const [headers] = await query(
    'SELECT idlistaCompra, nombre, estado, created_at, updated_at FROM lista_compra WHERE idlistaCompra = ? LIMIT 1',
    [listId]
  );
  if (!headers) {
    const error = new Error('Lista de compras no encontrada.');
    error.status = 404;
    throw error;
  }
  const detalles = await query(
    `SELECT lcd.idlistaCompraDetalle, lcd.producto_id, lcd.nombre_producto, lcd.cantidad, lcd.motivo, lcd.estado,
            p.nombre AS producto, p.precio
       FROM lista_compra_detalle lcd
       LEFT JOIN producto p ON p.id = lcd.producto_id
      WHERE lcd.lista_compra_id = ?
      ORDER BY lcd.idlistaCompraDetalle ASC`,
    [listId]
  );
  return { ...headers, detalles };
}

const listaCompraSchema = Joi.object({
  nombre: Joi.string().trim().allow('', null),
  estado: Joi.string().valid('borrador', 'pendiente', 'comprada', 'cancelada').default('pendiente'),
  items: Joi.array().items(Joi.object({
    producto_id: Joi.number().integer().positive().required(),
    nombre_producto: Joi.string().trim().allow('', null),
    cantidad: Joi.number().integer().min(1).required(),
    motivo: Joi.string().trim().allow('', null),
  })).min(1).required(),
});

router.get('/admin/lista-compras', isAuthenticated, canViewInventory, async (req, res, next) => {
  try {
    const [adminProfile, productos, listas, tiposServicios, servicios] = await Promise.all([
      getAdminProfile(req.session.user),
      loadInventoryProducts(),
      loadShoppingLists(),
      query('SELECT idtipoServicio AS idtiposervicio, nombre FROM tiposervicio ORDER BY nombre'),
      query('SELECT idservicio, nombre FROM servicio ORDER BY nombre'),
    ]);
    const sugeridos = productos.filter(item => {
      const stock = Number(item.stock_actual || 0);
      const minimo = Number(item.stock_minimo || 0);
      return stock <= 0 || (minimo > 0 && stock <= minimo);
    });
    res.render('admin/lista-compras', { adminProfile, productos, sugeridos, listas, tiposServicios, servicios });
  } catch (e) { next(e); }
});

router.get('/api/admin/tratamientos/:id/materiales', isAuthenticated, canViewInventory, validate(idParam, 'params'), async (req, res, next) => {
  try {
    if (!(await tableExists('tratamiento_material'))) {
      return res.json({ success: true, materiales: [] });
    }
    const rows = await query(
      `SELECT tm.producto_id, tm.cantidad_sugerida AS cantidad, tm.notas AS motivo,
              p.nombre, p.precio, COALESCE(i.stock_actual, p.stock, 0) AS stock_actual
         FROM tratamiento_material tm
         JOIN producto p ON p.id = tm.producto_id
         LEFT JOIN (
           SELECT producto_id, MAX(stock_actual) AS stock_actual
             FROM inventario
            GROUP BY producto_id
         ) i ON i.producto_id = p.id
        WHERE tm.tiposervicio_idtiposervicio = ?
        ORDER BY p.nombre`,
      [req.params.id]
    );
    res.json({ success: true, materiales: rows });
  } catch (e) { next(e); }
});

router.post('/api/admin/listas-compras', isAuthenticated, canCreateInventory, validate(listaCompraSchema), async (req, res, next) => {
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await ensureShoppingListStorage();
    await conn.beginTransaction();
    const [created] = await conn.execute(
      'INSERT INTO lista_compra (nombre, estado, usuario_idusuario) VALUES (?, ?, ?)',
      [req.body.nombre || `Lista de compras ${new Date().toLocaleDateString('es-GT')}`, req.body.estado || 'pendiente', sessionUserId(req)]
    );
    for (const item of req.body.items) {
      await conn.execute(
        `INSERT INTO lista_compra_detalle (lista_compra_id, producto_id, nombre_producto, cantidad, motivo)
         VALUES (?, ?, ?, ?, ?)`,
        [created.insertId, item.producto_id, item.nombre_producto || null, item.cantidad, item.motivo || null]
      );
    }
    await conn.commit();
    res.status(201).json({ success: true, idlistaCompra: created.insertId });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

router.put('/api/admin/listas-compras/:id/estado', isAuthenticated, canEditInventory, validate(idParam, 'params'), validate(Joi.object({
  estado: Joi.string().valid('borrador', 'pendiente', 'comprada', 'cancelada').required(),
})), async (req, res, next) => {
  try {
    await ensureShoppingListStorage();
    const r = await query('UPDATE lista_compra SET estado=?, updated_at=CURRENT_TIMESTAMP WHERE idlistaCompra=?', [req.body.estado, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Lista no encontrada' });
    res.json({ success: true });
  } catch (e) { next(e); }
});

function streamShoppingListPdf(res, list) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 42 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="lista-compras-${list.idlistaCompra}.pdf"`);
  doc.pipe(res);
  doc.fontSize(18).fillColor('#7367f0').text('C&C Dental Studio');
  doc.moveDown(0.2);
  doc.fontSize(15).fillColor('#111827').text(list.nombre || `Lista de compras #${list.idlistaCompra}`);
  doc.fontSize(10).fillColor('#4b5563').text(`Estado: ${list.estado || 'pendiente'}`);
  doc.text(`Fecha: ${new Date(list.created_at || Date.now()).toLocaleDateString('es-GT')}`);
  doc.moveDown(1);

  const widths = [34, 220, 70, 180];
  const headers = ['#', 'Producto', 'Cant.', 'Motivo'];
  let x = doc.x;
  const y = doc.y;
  doc.roundedRect(x, y, widths.reduce((sum, width) => sum + width, 0), 26, 5).fill('#f4f1ff');
  doc.fillColor('#4338ca').font('Helvetica-Bold').fontSize(9);
  headers.forEach((header, index) => {
    doc.text(header, x + 8, y + 9, { width: widths[index] - 16 });
    x += widths[index];
  });
  doc.font('Helvetica').fillColor('#111827');
  doc.y = y + 36;

  list.detalles.forEach((item, index) => {
    if (doc.y > 720) doc.addPage();
    const rowY = doc.y;
    x = doc.page.margins.left;
    const values = [
      String(index + 1),
      item.producto || item.nombre_producto || 'Producto',
      String(item.cantidad || 1),
      item.motivo || 'Reposición de inventario',
    ];
    const rowHeight = Math.max(34, ...values.map((value, valueIndex) => doc.heightOfString(value, { width: widths[valueIndex] - 16 }))) + 12;
    doc.roundedRect(x, rowY, widths.reduce((sum, width) => sum + width, 0), rowHeight, 4).stroke('#dde2ee');
    values.forEach((value, valueIndex) => {
      doc.text(value, x + 8, rowY + 8, { width: widths[valueIndex] - 16 });
      x += widths[valueIndex];
    });
    doc.y = rowY + rowHeight + 6;
  });
  doc.end();
}

function shoppingListSvg(list) {
  const rows = list.detalles.map((item, index) => {
    const y = 170 + index * 46;
    const name = String(item.producto || item.nombre_producto || 'Producto').replace(/[&<>"']/g, '');
    const motivo = String(item.motivo || 'Reposición de inventario').replace(/[&<>"']/g, '');
    return `<g transform="translate(40 ${y})"><rect width="760" height="36" rx="8" fill="#ffffff" stroke="#dde2ee"/><text x="14" y="23" font-size="14" fill="#111827">${index + 1}</text><text x="60" y="23" font-size="14" font-weight="700" fill="#111827">${name}</text><text x="430" y="23" font-size="14" fill="#111827">${item.cantidad || 1}</text><text x="510" y="23" font-size="13" fill="#4b5563">${motivo}</text></g>`;
  }).join('');
  const height = Math.max(360, 220 + list.detalles.length * 46);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="840" height="${height}" viewBox="0 0 840 ${height}">
  <rect width="840" height="${height}" fill="#f7f8fc"/>
  <rect x="24" y="24" width="792" height="${height - 48}" rx="18" fill="#ffffff" stroke="#dde2ee"/>
  <text x="40" y="70" font-family="Arial" font-size="26" font-weight="700" fill="#7367f0">C&amp;C Dental Studio</text>
  <text x="40" y="108" font-family="Arial" font-size="20" font-weight="700" fill="#111827">${String(list.nombre || `Lista de compras #${list.idlistaCompra}`).replace(/[&<>"']/g, '')}</text>
  <text x="40" y="135" font-family="Arial" font-size="14" fill="#4b5563">Estado: ${String(list.estado || 'pendiente').replace(/[&<>"']/g, '')}</text>
  <g transform="translate(40 150)">
    <text x="14" y="0" font-family="Arial" font-size="12" font-weight="700" fill="#4338ca">#</text>
    <text x="60" y="0" font-family="Arial" font-size="12" font-weight="700" fill="#4338ca">Producto</text>
    <text x="430" y="0" font-family="Arial" font-size="12" font-weight="700" fill="#4338ca">Cant.</text>
    <text x="510" y="0" font-family="Arial" font-size="12" font-weight="700" fill="#4338ca">Motivo</text>
  </g>
  ${rows}
</svg>`;
}

router.get('/admin/listas-compras/:id/pdf', isAuthenticated, canViewInventory, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const list = await loadShoppingList(req.params.id);
    streamShoppingListPdf(res, list);
  } catch (e) { next(e); }
});

router.get('/admin/listas-compras/:id/imagen', isAuthenticated, canViewInventory, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const list = await loadShoppingList(req.params.id);
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="lista-compras-${list.idlistaCompra}.svg"`);
    res.send(shoppingListSvg(list));
  } catch (e) { next(e); }
});

module.exports = router;
