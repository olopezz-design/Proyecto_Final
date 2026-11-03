const express = require('express');
const Joi = require('joi');
const { isAuthenticated } = require('../middlewares/auth');
const {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} = require('../utils/notificaciones');

const router = express.Router();
const idParam = Joi.object({ id: Joi.number().integer().positive().required() });

router.get('/api/admin/notificaciones', isAuthenticated, async (req, res, next) => {
  try {
    const data = await listNotifications(req.session.user, req.query.limit);
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
});

router.post('/api/admin/notificaciones/:id/leida', isAuthenticated, async (req, res, next) => {
  try {
    const { value, error } = idParam.validate(req.params);
    if (error) return res.status(400).json({ success: false, message: 'Notificación inválida.' });
    const updated = await markNotificationRead(req.session.user, value.id);
    res.json({ success: true, updated });
  } catch (error) {
    next(error);
  }
});

router.post('/api/admin/notificaciones/marcar-leidas', isAuthenticated, async (req, res, next) => {
  try {
    const updated = await markAllNotificationsRead(req.session.user);
    res.json({ success: true, updated });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
