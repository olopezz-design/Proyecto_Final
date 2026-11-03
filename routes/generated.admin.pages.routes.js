// Archivo AUTOGENERADO. No editar a mano.
// Ejecuta: node scripts/generate-admin-routes.js
const express = require('express');
const { isAuthenticated, requirePermission } = require('../middlewares/auth');

const router = express.Router();

function pageGuard(page) {
  return requirePermission(page === 'dash' ? 'dashboard:ver' : 'admin:plantilla:ver');
}

router.get('/admin/add-patient', isAuthenticated, pageGuard('add-patient'), (req, res) => res.render('admin/add-patient'));
router.get('/admin/appointments', isAuthenticated, pageGuard('appointments'), (req, res) => res.render('admin/appointments'));
router.get('/admin/dash', isAuthenticated, pageGuard('dash'), (req, res) => res.render('admin/dash'));
router.get('/admin/doc-appointments', isAuthenticated, pageGuard('doc-appointments'), (req, res) => res.render('admin/doc-appointments'));
router.get('/admin/doctors-profile', isAuthenticated, pageGuard('doctors-profile'), (req, res) => res.render('admin/doctors-profile'));
router.get('/admin/edit-appointment', isAuthenticated, pageGuard('edit-appointment'), (req, res) => res.render('admin/edit-appointment'));
router.get('/admin/edit-doctors', isAuthenticated, pageGuard('edit-doctors'), (req, res) => res.render('admin/edit-doctors'));
router.get('/admin/edit-patient', isAuthenticated, pageGuard('edit-patient'), (req, res) => res.render('admin/edit-patient'));
router.get('/admin/forgot-password', isAuthenticated, pageGuard('forgot-password'), (req, res) => res.render('admin/forgot-password'));
router.get('/admin/page-not-found', isAuthenticated, pageGuard('page-not-found'), (req, res) => res.render('admin/page-not-found'));
router.get('/admin/patient-dashboard', isAuthenticated, pageGuard('patient-dashboard'), (req, res) => res.render('admin/patient-dashboard'));
router.get('/admin/patients-list', isAuthenticated, pageGuard('patients-list'), (req, res) => res.render('admin/patients-list'));
router.get('/admin/reset-password', isAuthenticated, pageGuard('reset-password'), (req, res) => res.render('admin/reset-password'));

module.exports = router;
