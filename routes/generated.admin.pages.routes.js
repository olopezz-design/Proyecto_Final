// Archivo AUTOGENERADO. No editar a mano.
// Ejecuta: node scripts/generate-admin-routes.js
const express = require('express');
const { isAuthenticated, requirePermission } = require('../middlewares/auth');

const router = express.Router();

function pageGuard(page) {
  return requirePermission(page === 'dash' ? 'dashboard:ver' : 'admin:plantilla:ver');
}

router.get('/admin/accordions', isAuthenticated, pageGuard('accordions'), (req, res) => res.render('admin/accordions'));
router.get('/admin/add-doctors', isAuthenticated, pageGuard('add-doctors'), (req, res) => res.render('admin/add-doctors'));
router.get('/admin/add-patient', isAuthenticated, pageGuard('add-patient'), (req, res) => res.render('admin/add-patient'));
router.get('/admin/add-staff', isAuthenticated, pageGuard('add-staff'), (req, res) => res.render('admin/add-staff'));
router.get('/admin/advanced-cards', isAuthenticated, pageGuard('advanced-cards'), (req, res) => res.render('admin/advanced-cards'));
router.get('/admin/alerts', isAuthenticated, pageGuard('alerts'), (req, res) => res.render('admin/alerts'));
router.get('/admin/appointment-success', isAuthenticated, pageGuard('appointment-success'), (req, res) => res.render('admin/appointment-success'));
router.get('/admin/appointments', isAuthenticated, pageGuard('appointments'), (req, res) => res.render('admin/appointments'));
router.get('/admin/appointments-details', isAuthenticated, pageGuard('appointments-details'), (req, res) => res.render('admin/appointments-details'));
router.get('/admin/appointments-list', isAuthenticated, pageGuard('appointments-list'), (req, res) => res.render('admin/appointments-list'));
router.get('/admin/badges', isAuthenticated, pageGuard('badges'), (req, res) => res.render('admin/badges'));
router.get('/admin/book-appointment', isAuthenticated, pageGuard('book-appointment'), (req, res) => res.render('admin/book-appointment'));
router.get('/admin/button-groups', isAuthenticated, pageGuard('button-groups'), (req, res) => res.render('admin/button-groups'));
router.get('/admin/buttons', isAuthenticated, pageGuard('buttons'), (req, res) => res.render('admin/buttons'));
router.get('/admin/cards', isAuthenticated, pageGuard('cards'), (req, res) => res.render('admin/cards'));
router.get('/admin/carousel', isAuthenticated, pageGuard('carousel'), (req, res) => res.render('admin/carousel'));
router.get('/admin/dash', isAuthenticated, pageGuard('dash'), (req, res) => res.render('admin/dash'));
router.get('/admin/doc-appointments', isAuthenticated, pageGuard('doc-appointments'), (req, res) => res.render('admin/doc-appointments'));
router.get('/admin/doctors-cards', isAuthenticated, pageGuard('doctors-cards'), (req, res) => res.render('admin/doctors-cards'));
router.get('/admin/doctors-grid', isAuthenticated, pageGuard('doctors-grid'), (req, res) => res.render('admin/doctors-grid'));
router.get('/admin/doctors-profile', isAuthenticated, pageGuard('doctors-profile'), (req, res) => res.render('admin/doctors-profile'));
router.get('/admin/dropdowns', isAuthenticated, pageGuard('dropdowns'), (req, res) => res.render('admin/dropdowns'));
router.get('/admin/edit-appointment', isAuthenticated, pageGuard('edit-appointment'), (req, res) => res.render('admin/edit-appointment'));
router.get('/admin/edit-doctors', isAuthenticated, pageGuard('edit-doctors'), (req, res) => res.render('admin/edit-doctors'));
router.get('/admin/edit-patient', isAuthenticated, pageGuard('edit-patient'), (req, res) => res.render('admin/edit-patient'));
router.get('/admin/edit-staff', isAuthenticated, pageGuard('edit-staff'), (req, res) => res.render('admin/edit-staff'));
router.get('/admin/expenses', isAuthenticated, pageGuard('expenses'), (req, res) => res.render('admin/expenses'));
router.get('/admin/forgot-password', isAuthenticated, pageGuard('forgot-password'), (req, res) => res.render('admin/forgot-password'));
router.get('/admin/full-post', isAuthenticated, pageGuard('full-post'), (req, res) => res.render('admin/full-post'));
router.get('/admin/icons', isAuthenticated, pageGuard('icons'), (req, res) => res.render('admin/icons'));
router.get('/admin/income', isAuthenticated, pageGuard('income'), (req, res) => res.render('admin/income'));
router.get('/admin/list-items', isAuthenticated, pageGuard('list-items'), (req, res) => res.render('admin/list-items'));
router.get('/admin/login-copy', isAuthenticated, pageGuard('login-copy'), (req, res) => res.render('admin/login-copy'));
router.get('/admin/maintenance', isAuthenticated, pageGuard('maintenance'), (req, res) => res.render('admin/maintenance'));
router.get('/admin/maps', isAuthenticated, pageGuard('maps'), (req, res) => res.render('admin/maps'));
router.get('/admin/my-patients', isAuthenticated, pageGuard('my-patients'), (req, res) => res.render('admin/my-patients'));
router.get('/admin/page-not-found', isAuthenticated, pageGuard('page-not-found'), (req, res) => res.render('admin/page-not-found'));
router.get('/admin/patient-dashboard', isAuthenticated, pageGuard('patient-dashboard'), (req, res) => res.render('admin/patient-dashboard'));
router.get('/admin/patient-profile', isAuthenticated, pageGuard('patient-profile'), (req, res) => res.render('admin/patient-profile'));
router.get('/admin/patients-list', isAuthenticated, pageGuard('patients-list'), (req, res) => res.render('admin/patients-list'));
router.get('/admin/placeholders', isAuthenticated, pageGuard('placeholders'), (req, res) => res.render('admin/placeholders'));
router.get('/admin/progress', isAuthenticated, pageGuard('progress'), (req, res) => res.render('admin/progress'));
router.get('/admin/reset-password', isAuthenticated, pageGuard('reset-password'), (req, res) => res.render('admin/reset-password'));
router.get('/admin/spinners', isAuthenticated, pageGuard('spinners'), (req, res) => res.render('admin/spinners'));
router.get('/admin/staff', isAuthenticated, pageGuard('staff'), (req, res) => res.render('admin/staff'));
router.get('/admin/tables', isAuthenticated, pageGuard('tables'), (req, res) => res.render('admin/tables'));
router.get('/admin/tabs', isAuthenticated, pageGuard('tabs'), (req, res) => res.render('admin/tabs'));
router.get('/admin/typography', isAuthenticated, pageGuard('typography'), (req, res) => res.render('admin/typography'));

module.exports = router;
