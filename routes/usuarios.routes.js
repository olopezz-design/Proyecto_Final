// routes/usuarios.routes.js
const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { query } = require('../database/db');
const { isAuthenticated, requirePermission } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { createNotification } = require('../utils/notificaciones');

const router = express.Router();
const canViewUsers = requirePermission('usuarios:ver');
const canCreateUsers = requirePermission('usuarios:crear');
const canEditUsers = requirePermission('usuarios:editar');

const idParam = Joi.object({ id: Joi.number().integer().positive().required() });

// Listar usuarios (JSON simple)
router.get('/admin/usuarios', isAuthenticated, canViewUsers, async (_req, res, next) => {
  try {
    const rows = await query(`
      SELECT idusuario, user AS username, rol_idrol, estadoUsuario_idestadoUsuario AS estado
      FROM usuario ORDER BY idusuario DESC
    `);
    res.json(rows);
  } catch (e) { next(e); }
});

const userCreateSchema = Joi.object({
  user: Joi.string().email().required(), // si prefieres no-email, cambia a string().min(3)
  password: Joi.string().min(4).required(),
  rol_idrol: Joi.number().integer().required(),
});

router.post('/admin/usuarios', isAuthenticated, canCreateUsers, validate(userCreateSchema), async (req, res, next) => {
  try {
    const { user, password, rol_idrol } = req.body;
    const [dup] = await query('SELECT 1 FROM usuario WHERE LOWER(user)=LOWER(?) LIMIT 1', [user]);
    if (dup) return res.status(409).json({ error: 'Usuario ya registrado' });
    const hash = await bcrypt.hash(password, 10);
    const r = await query('INSERT INTO usuario (user, password, rol_idrol, estadoUsuario_idestadoUsuario) VALUES (?, ?, ?, 1)', [user, hash, rol_idrol]);
    await createNotification({
      tipo: 'usuario',
      titulo: 'Nuevo usuario creado',
      mensaje: `${user} ya puede ingresar al sistema.`,
      url: '/admin/settings#sixA',
      referenciaTipo: 'usuario',
      referenciaId: r.insertId,
    });
    res.status(201).json({ idusuario: r.insertId, user, rol_idrol, estado: 1 });
  } catch (e) { next(e); }
});

const userUpdateSchema = Joi.object({
  user: Joi.string().email(),
  password: Joi.string().min(4),
  rol_idrol: Joi.number().integer(),
  estado: Joi.number().valid(1,2), // 1 activo, 2 inactivo
});

router.put('/admin/usuarios/:id', isAuthenticated, canEditUsers, validate(idParam, 'params'), validate(userUpdateSchema), async (req, res, next) => {
  try {
    const { user, password, rol_idrol, estado } = req.body;
    const sets = []; const vals = [];
    if (user !== undefined) {
      const [dup] = await query('SELECT 1 FROM usuario WHERE LOWER(user)=LOWER(?) AND idusuario<>? LIMIT 1', [user, req.params.id]);
      if (dup) return res.status(409).json({ error: 'Usuario ya registrado' });
      sets.push('user=?'); vals.push(user);
    }
    if (password) { sets.push('password=?'); vals.push(await bcrypt.hash(password, 10)); }
    if (rol_idrol !== undefined) { sets.push('rol_idrol=?'); vals.push(rol_idrol); }
    if (estado !== undefined)    { sets.push('estadoUsuario_idestadoUsuario=?'); vals.push(estado); }
    if (!sets.length) return res.json({ ok: true, updated: 0 });
    vals.push(req.params.id);
    await query(`UPDATE usuario SET ${sets.join(', ')} WHERE idusuario=?`, vals);
    res.json({ ok: true, updated: 1 });
  } catch (e) { next(e); }
});

// Cambiar solo estado (atajo)
router.put('/admin/usuarios/:id/estado', isAuthenticated, canEditUsers, validate(idParam, 'params'), validate(Joi.object({ estado: Joi.number().valid(1,2).required() })), async (req, res, next) => {
  try {
    const r = await query('UPDATE usuario SET estadoUsuario_idestadoUsuario=? WHERE idusuario=?', [req.body.estado, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
