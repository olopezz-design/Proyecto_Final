// routes/cotizaciones.routes.js
const express = require('express');
const Joi = require('joi');
const { query, initPool } = require('../database/db');
const { isAuthenticated, requirePermission } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');

const router = express.Router();
const canViewQuotes = requirePermission('cotizaciones:ver');
const canCreateQuotes = requirePermission('cotizaciones:crear');

router.get('/admin/cotizaciones', isAuthenticated, canViewQuotes, async (_req, res, next) => {
  try {
    const q = `
      SELECT 
        c.id_cotizacion, c.id_paciente, c.fecha_cotizacion, c.notas_adicionales, c.estado,
        d.id_detalle, d.diente, ts.nombre AS nombre_tratamiento, s.nombre AS nombre_servicio,
        d.costo_servicio, d.notas AS notas_detalle, tot.costo_total
      FROM cotizaciones c
      LEFT JOIN detalle_cotizaciones d ON c.id_cotizacion = d.id_cotizacion
      LEFT JOIN tiposervicio ts ON d.id_tratamiento = ts.idtipoServicio
      LEFT JOIN servicio s ON d.id_servicio = s.idservicio
      LEFT JOIN (SELECT id_cotizacion, SUM(costo_servicio) AS costo_total FROM detalle_cotizaciones GROUP BY id_cotizacion) tot
        ON c.id_cotizacion = tot.id_cotizacion
      ORDER BY c.id_cotizacion DESC, d.id_detalle
    `;
    const rows = await query(q);
    const pacientes = await query('SELECT idPaciente, nombre, apellido FROM paciente');
    const tiposServicios = await query('SELECT idtipoServicio AS idtiposervicio, nombre FROM tiposervicio');
    const servicios = await query('SELECT idservicio, nombre FROM servicio');

    const agr = rows.reduce((acc, r) => {
      if (!acc[r.id_cotizacion]) acc[r.id_cotizacion] = { id_cotizacion: r.id_cotizacion, id_paciente: r.id_paciente, fecha_cotizacion: r.fecha_cotizacion, notas_adicionales: r.notas_adicionales, estado: r.estado, costo_total: r.costo_total || 0, detalles: [] };
      if (r.id_detalle) acc[r.id_cotizacion].detalles.push({ id_detalle: r.id_detalle, diente: r.diente, nombre_tratamiento: r.nombre_tratamiento, nombre_servicio: r.nombre_servicio, costo_servicio: r.costo_servicio, notas: r.notas_detalle });
      return acc;
    }, {});
    res.render('admin/cotizaciones', { cotizacionesAgrupadas: Object.values(agr), pacientes, tiposServicios, servicios });
  } catch (e) { next(e); }
});

const cotizacionSchema = Joi.object({
  paciente: Joi.number().integer().required(),
  tipoServicio: Joi.number().integer().required(),
  servicio: Joi.number().integer().required(),
  costoServicio: Joi.number().positive().required(),
  notas: Joi.string().allow('', null),
  dientes: Joi.alternatives().try(Joi.string().valid('1-32'), Joi.array().items(Joi.string())).required(),
});

router.post(['/api/admin/cotizaciones', '/api/cotizaciones/agregar'], isAuthenticated, canCreateQuotes, validate(cotizacionSchema), async (req, res, next) => {
  const { paciente, tipoServicio, servicio, costoServicio, notas, dientes } = req.body;

  const detalles = (typeof dientes === 'string')
    ? [{ diente: '1-32', id_servicio: servicio, id_tratamiento: tipoServicio, costo_servicio: costoServicio, notas }]
    : dientes.map(d => ({ diente: d, id_servicio: servicio, id_tratamiento: tipoServicio, costo_servicio: costoServicio, notas }));

  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rC] = await conn.execute('INSERT INTO cotizaciones (id_paciente, notas_adicionales, estado) VALUES (?, ?, 1)', [paciente, notas || null]);
    const idCot = rC.insertId;

    const ins = 'INSERT INTO detalle_cotizaciones (id_cotizacion, diente, id_servicio, id_tratamiento, costo_servicio, notas) VALUES (?, ?, ?, ?, ?, ?)';
    for (const det of detalles) {
      await conn.execute(ins, [idCot, det.diente, det.id_servicio, det.id_tratamiento, det.costo_servicio, det.notas || null]);
    }
    await conn.commit();
    res.json({ message: 'Cotización creada exitosamente', id_cotizacion: idCot });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

module.exports = router;
