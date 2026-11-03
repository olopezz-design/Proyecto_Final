## BACKEND

El archivo principal es app.js. En él se configuran las sesiones, los archivos estáticos, el control de inactividad, las rutas y el manejo de errores.

Ya con el archivo principal de nuestra app detectado procedo a listar las rutas, y asociarlas con su funcion las cuales son las siguientes:


ARCHIVO/CARPETA 			       FUNCION 
app.js					           Inicio y configuración del servidor Express
database/db.js				       Conexión y consultas a MySQL
middlewares/auth.js			       Autenticación y autorización
middlewares/validate.js			   Validación de entradas
routes/auth.routes.js			   Inicio y gestión de autenticación
routes/pacientes.routes.js	       Módulo de pacientes
routes/doctores.routes.js		   Módulo de doctores
routes/usuarios.routes.js		   Administración de usuarios
routes/productos.routes.js		   Inventario, productos y proveedores
routes/pagos.routes.js	           Pagos
routes/cotizaciones.routes.js	   Cotizaciones
routes/configuracion.routes.js	   Configuración del sistema
routes/dashboard.routes.js		   Panel principal
routes/notificaciones.routes.js	   Notificaciones
routes/perfil.routes.js			   Perfil de usuario
routes/portafolio.routes.js	       Portafolio e imágenes
utils/					           Permisos, sesiones y otras funciones     auxiliares

# Inventario del backend – Clínica Dental

**Responsable:** Sergio Luis Salguero Najarro  
**Alcance:** inventario estático del código entregado en `ClinicaDental-main.zip`. No se modificaron rutas ni controladores durante este inventario.

## 1. Punto de entrada y configuración

- **Punto de entrada real:** `app.js` (los scripts `start` y `dev` ejecutan `app.js`).
- **`package.json`:** declara `main: index.js`, pero no se encontró `index.js` en la raíz. Es una inconsistencia documental/configuración; no se cambia todavía porque el comando de ejecución sí apunta a `app.js`.
- **Motor web:** Express.
- **Vistas:** EJS, directorio `views/`.
- **Base de datos:** MySQL mediante `mysql2/promise`, conexión centralizada en `database/db.js`.
- **Sesiones:** `express-session`; almacenamiento MySQL opcional mediante `utils/mysqlSessionStore.js`.
- **Variables de entorno:** `app.js` y `database/db.js` cargan `./env/.env`.

## 2. Middlewares, utilidades y persistencia

| Componente | Responsabilidad observada |
|---|---|
| `middlewares/auth.js` | Autenticación de sesión, roles y permisos (`isAuthenticated`, `requireRole`, `requirePermission`, `attachLocals`). |
| `middlewares/validate.js` | Validación de solicitudes; se usa en rutas con esquemas Joi. |
| `utils/permissions.js` | Resolución y comprobación de permisos. |
| `utils/mysqlSessionStore.js` | Persistencia de sesiones en MySQL. |
| `utils/adminProfile.js` | Funciones auxiliares relacionadas con perfil administrativo. |
| `utils/consultasActivas.js` | Funciones auxiliares de consultas activas. |
| `utils/doctorSchedules.js` | Funciones auxiliares de horarios de doctores. |
| `utils/notificaciones.js` | Funciones auxiliares de notificaciones. |
| `database/db.js` | Pool, inicialización y ejecución de consultas MySQL. |
| `scripts/generate-admin-routes.js` | Generador del archivo de rutas administrativas generado. |

## 3. Montaje de rutas desde `app.js`

- L287: `app.use(publicRoutes);`
- L290: `app.use(authRoutes);`
- L293: `app.use(configuracionRoutes);`
- L296: `app.use(cotizacionesRoutes);`
- L299: `app.use(doctoresRoutes);`
- L302: `app.use(pacientesRoutes);`
- L305: `app.use(pagosRoutes);`
- L308: `app.use(productosRoutes);`
- L311: `app.use(usuariosRoutes);`
- L314: `app.use(portafolioRoutes);`
- L317: `app.use(notificacionesRoutes);`
- L320: `app.use(dashboardRoutes);`
- L323: `app.use(perfilRoutes);`
- L326: `app.use(adminPagesRoutes);`
- L329: `app.use(adminPagesFallback);`

## 4. Rutas registradas por archivo

Las declaraciones se listan tal como aparecen en el código, incluyendo arreglos de alias. Los números corresponden a líneas del ZIP entregado.

### `routes/admin.pages.fallback.routes.js`
- L45: `router.get('/admin', isAuthenticated, requirePermission('dashboard:ver'), (req, res, next) => {`
- L55: `router.get('/admin/:page', isAuthenticated, (req, res, next) => {`

### `routes/auth.routes.js`
- L195: `router.get('/signup', async (req, res, next) => {`
- L214: `router.post('/signup/access', async (req, res, next) => {`
- L236: `router.post('/auth', async (req, res, next) => {`
- L265: `router.post('/auth/register', async (req, res, next) => {`

### `routes/configuracion.routes.js`
- L191: `router.get(['/configuracion', '/admin/configuracion', '/admin/settings'], isAuthenticated, canViewConfig, async (req, res, next) => {`
- L207: `router.put('/configuracion/api/usuarios/:id/estado', isAuthenticated, canEditConfig, async (req, res, next) => {`
- L238: `router.get('/configuracion/api/usuarios', isAuthenticated, canViewConfig, async (_req, res, next) => {`
- L287: `router.get('/configuracion/api/system-settings', isAuthenticated, canViewConfig, async (_req, res, next) => {`
- L294: `router.put('/configuracion/api/system-settings', isAuthenticated, canEditConfig, async (req, res, next) => {`
- L324: `router.put('/configuracion/api/password', isAuthenticated, async (req, res, next) => {`
- L350: `router.get('/configuracion/api/catalogs', isAuthenticated, canViewCatalogs, (_req, res) => {`
- L354: `router.get('/configuracion/api/config/catalogs/:catalog', isAuthenticated, canViewCatalogs, async (req, res, next) => {`
- L381: `router.post('/configuracion/api/config/catalogs/:catalog', isAuthenticated, canCreateCatalogs, async (req, res, next) => {`
- L417: `router.put('/configuracion/api/config/catalogs/:catalog/:id', isAuthenticated, canEditCatalogs, async (req, res, next) => {`
- L455: `router.delete('/configuracion/api/config/catalogs/:catalog/:id', isAuthenticated, canDeleteCatalogs, async (req, res, next) => {`
- L531: `router.get('/configuracion/api/permissions', isAuthenticated, canViewPermissions, async (_req, res, next) => {`
- L538: `router.get('/configuracion/api/roles-permisos', isAuthenticated, canViewPermissions, async (_req, res, next) => {`
- L554: `router.put('/configuracion/api/roles/:id/permisos', isAuthenticated, canEditPermissions, async (req, res, next) => {`
- L575: `router.get('/configuracion/api/usuarios-permisos', isAuthenticated, canViewPermissions, async (_req, res, next) => {`
- L600: `router.put('/configuracion/api/usuarios/:id/permisos', isAuthenticated, canEditPermissions, async (req, res, next) => {`
- L621: `router.post(['/configuracion/api/solicitudes-autorizacion/crear', '/api/solicitudes-autorizacion'], isAuthenticated, async (req, res, next) => {`
- L665: `router.get('/configuracion/api/solicitudes-autorizacion', isAuthenticated, canViewAuthorizationRequests, async (_req, res, next) => {`
- L683: `router.post('/configuracion/api/solicitudes-autorizacion/:id/aprobar', isAuthenticated, canApproveAuthorizationRequests, async (req, res, next) => {`
- L726: `router.post('/configuracion/api/solicitudes-autorizacion/:id/rechazar', isAuthenticated, canRejectAuthorizationRequests, async (req, res, next) => {`
- L772: `router.get('/configuracion/api/solicitudes-registro', isAuthenticated, canViewAuthorizationRequests, async (_req, res, next) => {`
- L789: `router.post('/configuracion/api/solicitudes-registro/:id/aprobar', isAuthenticated, canApproveAuthorizationRequests, async (req, res, next) => {`
- L866: `router.post('/configuracion/api/solicitudes-registro/:id/rechazar', isAuthenticated, canRejectAuthorizationRequests, async (req, res, next) => {`
- L1256: `router.get('/configuracion/api/limpieza/opciones', isAuthenticated, canRunCleanup, (_req, res) => {`
- L1264: `router.post('/configuracion/api/limpieza/preview', isAuthenticated, canRunCleanup, async (req, res, next) => {`
- L1273: `router.post('/configuracion/api/limpieza/execute', isAuthenticated, canRunCleanup, async (req, res, next) => {`

### `routes/cotizaciones.routes.js`
- L12: `router.get('/admin/cotizaciones', isAuthenticated, canViewQuotes, async (_req, res, next) => {`
- L50: `router.post(['/api/admin/cotizaciones', '/api/cotizaciones/agregar'], isAuthenticated, canCreateQuotes, validate(cotizacionSchema), async (req, res, next) => {`

### `routes/dashboard.routes.js`
- L133: `router.get(['/admin/dash', '/admin/dashboard'], isAuthenticated, canViewDashboard, async (req, res, next) => {`

### `routes/doctores.routes.js`
- L87: `router.get('/admin/doctores', isAuthenticated, canViewDoctors, async (_req, res, next) => {`
- L104: `router.get('/admin/doctores/inactivos', isAuthenticated, canViewDoctors, async (_req, res, next) => {`
- L118: `router.post('/admin/doctores', isAuthenticated, canCreateDoctors, validate(doctorCreateSchema), async (req, res, next) => {`
- L160: `router.put('/admin/doctores/:id', isAuthenticated, canEditDoctors, validate(idParam, 'params'), validate(doctorEditSchema), async (req, res, next) => {`
- L212: `router.put(['/api/admin/doctores/:id/inactivar', '/api/doctores/inactivar/:id'], isAuthenticated, canDeactivateDoctors, validate(idParam, 'params'), async (req, res, next) => {`
- L219: `router.put(['/api/admin/doctores/:id/reactivar', '/api/doctores/reactivar/:id'], isAuthenticated, canDeactivateDoctors, validate(idParam, 'params'), async (req, res, next) => {`
- L228: `router.post(['/admin/doctores/horarios', '/guardar-horario'], isAuthenticated, canManageDoctorSchedules, validate(horarioSchema), async (req, res, next) => {`
- L237: `router.get('/api/admin/doctores/:id/horarios', isAuthenticated, canViewDoctors, validate(idParam, 'params'), async (req, res, next) => {`
- L243: `router.delete(['/admin/doctores/horarios/:id', '/eliminar-horario/:id'], isAuthenticated, canManageDoctorSchedules, validate(idParam, 'params'), async (req, res, next) => {`
- L252: `router.get(['/api/admin/doctores/:id', '/get-doctor/:id'], isAuthenticated, canViewDoctors, validate(idParam, 'params'), async (req, res, next) => {`

### `routes/generated.admin.pages.routes.js`
- L12: `router.get('/admin/accordions', isAuthenticated, pageGuard('accordions'), (req, res) => res.render('admin/accordions'));`
- L13: `router.get('/admin/add-doctors', isAuthenticated, pageGuard('add-doctors'), (req, res) => res.render('admin/add-doctors'));`
- L14: `router.get('/admin/add-patient', isAuthenticated, pageGuard('add-patient'), (req, res) => res.render('admin/add-patient'));`
- L15: `router.get('/admin/add-staff', isAuthenticated, pageGuard('add-staff'), (req, res) => res.render('admin/add-staff'));`
- L16: `router.get('/admin/advanced-cards', isAuthenticated, pageGuard('advanced-cards'), (req, res) => res.render('admin/advanced-cards'));`
- L17: `router.get('/admin/alerts', isAuthenticated, pageGuard('alerts'), (req, res) => res.render('admin/alerts'));`
- L18: `router.get('/admin/appointment-success', isAuthenticated, pageGuard('appointment-success'), (req, res) => res.render('admin/appointment-success'));`
- L19: `router.get('/admin/appointments', isAuthenticated, pageGuard('appointments'), (req, res) => res.render('admin/appointments'));`
- L20: `router.get('/admin/appointments-details', isAuthenticated, pageGuard('appointments-details'), (req, res) => res.render('admin/appointments-details'));`
- L21: `router.get('/admin/appointments-list', isAuthenticated, pageGuard('appointments-list'), (req, res) => res.render('admin/appointments-list'));`
- L22: `router.get('/admin/badges', isAuthenticated, pageGuard('badges'), (req, res) => res.render('admin/badges'));`
- L23: `router.get('/admin/book-appointment', isAuthenticated, pageGuard('book-appointment'), (req, res) => res.render('admin/book-appointment'));`
- L24: `router.get('/admin/button-groups', isAuthenticated, pageGuard('button-groups'), (req, res) => res.render('admin/button-groups'));`
- L25: `router.get('/admin/buttons', isAuthenticated, pageGuard('buttons'), (req, res) => res.render('admin/buttons'));`
- L26: `router.get('/admin/cards', isAuthenticated, pageGuard('cards'), (req, res) => res.render('admin/cards'));`
- L27: `router.get('/admin/carousel', isAuthenticated, pageGuard('carousel'), (req, res) => res.render('admin/carousel'));`
- L28: `router.get('/admin/dash', isAuthenticated, pageGuard('dash'), (req, res) => res.render('admin/dash'));`
- L29: `router.get('/admin/doc-appointments', isAuthenticated, pageGuard('doc-appointments'), (req, res) => res.render('admin/doc-appointments'));`
- L30: `router.get('/admin/doctors-cards', isAuthenticated, pageGuard('doctors-cards'), (req, res) => res.render('admin/doctors-cards'));`
- L31: `router.get('/admin/doctors-grid', isAuthenticated, pageGuard('doctors-grid'), (req, res) => res.render('admin/doctors-grid'));`
- L32: `router.get('/admin/doctors-profile', isAuthenticated, pageGuard('doctors-profile'), (req, res) => res.render('admin/doctors-profile'));`
- L33: `router.get('/admin/dropdowns', isAuthenticated, pageGuard('dropdowns'), (req, res) => res.render('admin/dropdowns'));`
- L34: `router.get('/admin/edit-appointment', isAuthenticated, pageGuard('edit-appointment'), (req, res) => res.render('admin/edit-appointment'));`
- L35: `router.get('/admin/edit-doctors', isAuthenticated, pageGuard('edit-doctors'), (req, res) => res.render('admin/edit-doctors'));`
- L36: `router.get('/admin/edit-patient', isAuthenticated, pageGuard('edit-patient'), (req, res) => res.render('admin/edit-patient'));`
- L37: `router.get('/admin/edit-staff', isAuthenticated, pageGuard('edit-staff'), (req, res) => res.render('admin/edit-staff'));`
- L38: `router.get('/admin/expenses', isAuthenticated, pageGuard('expenses'), (req, res) => res.render('admin/expenses'));`
- L39: `router.get('/admin/forgot-password', isAuthenticated, pageGuard('forgot-password'), (req, res) => res.render('admin/forgot-password'));`
- L40: `router.get('/admin/full-post', isAuthenticated, pageGuard('full-post'), (req, res) => res.render('admin/full-post'));`
- L41: `router.get('/admin/icons', isAuthenticated, pageGuard('icons'), (req, res) => res.render('admin/icons'));`
- L42: `router.get('/admin/income', isAuthenticated, pageGuard('income'), (req, res) => res.render('admin/income'));`
- L43: `router.get('/admin/list-items', isAuthenticated, pageGuard('list-items'), (req, res) => res.render('admin/list-items'));`
- L44: `router.get('/admin/login-copy', isAuthenticated, pageGuard('login-copy'), (req, res) => res.render('admin/login-copy'));`
- L45: `router.get('/admin/maintenance', isAuthenticated, pageGuard('maintenance'), (req, res) => res.render('admin/maintenance'));`
- L46: `router.get('/admin/maps', isAuthenticated, pageGuard('maps'), (req, res) => res.render('admin/maps'));`
- L47: `router.get('/admin/my-patients', isAuthenticated, pageGuard('my-patients'), (req, res) => res.render('admin/my-patients'));`
- L48: `router.get('/admin/page-not-found', isAuthenticated, pageGuard('page-not-found'), (req, res) => res.render('admin/page-not-found'));`
- L49: `router.get('/admin/patient-dashboard', isAuthenticated, pageGuard('patient-dashboard'), (req, res) => res.render('admin/patient-dashboard'));`
- L50: `router.get('/admin/patient-profile', isAuthenticated, pageGuard('patient-profile'), (req, res) => res.render('admin/patient-profile'));`
- L51: `router.get('/admin/patients-list', isAuthenticated, pageGuard('patients-list'), (req, res) => res.render('admin/patients-list'));`
- L52: `router.get('/admin/placeholders', isAuthenticated, pageGuard('placeholders'), (req, res) => res.render('admin/placeholders'));`
- L53: `router.get('/admin/progress', isAuthenticated, pageGuard('progress'), (req, res) => res.render('admin/progress'));`
- L54: `router.get('/admin/reset-password', isAuthenticated, pageGuard('reset-password'), (req, res) => res.render('admin/reset-password'));`
- L55: `router.get('/admin/spinners', isAuthenticated, pageGuard('spinners'), (req, res) => res.render('admin/spinners'));`
- L56: `router.get('/admin/staff', isAuthenticated, pageGuard('staff'), (req, res) => res.render('admin/staff'));`
- L57: `router.get('/admin/tables', isAuthenticated, pageGuard('tables'), (req, res) => res.render('admin/tables'));`
- L58: `router.get('/admin/tabs', isAuthenticated, pageGuard('tabs'), (req, res) => res.render('admin/tabs'));`
- L59: `router.get('/admin/typography', isAuthenticated, pageGuard('typography'), (req, res) => res.render('admin/typography'));`

### `routes/notificaciones.routes.js`
- L13: `router.get('/api/admin/notificaciones', isAuthenticated, async (req, res, next) => {`
- L22: `router.post('/api/admin/notificaciones/:id/leida', isAuthenticated, async (req, res, next) => {`
- L33: `router.post('/api/admin/notificaciones/marcar-leidas', isAuthenticated, async (req, res, next) => {`

### `routes/pacientes.routes.js`
- L566: `router.get(['/admin/pacientes', '/admin/patients-list', '/admin/my-patients'], isAuthenticated, canViewPatients, async (req, res, next) => {`
- L574: `router.get(['/admin/pacientes/agregar', '/admin/add-patient'], isAuthenticated, canCreatePatients, async (req, res, next) => {`
- L593: `router.post('/admin/pacientes/pre-registro', isAuthenticated, canCreatePatients, async (req, res, next) => {`
- L633: `router.get('/pacientes/pre-registro/:token', validate(tokenParam, 'params'), async (req, res, next) => {`
- L671: `router.post('/pacientes/pre-registro/:token', validate(tokenParam, 'params'), async (req, res, next) => {`
- L729: `router.get('/admin/pacientes/pre-registros/:id/crear', isAuthenticated, canCreatePatients, validate(idParam, 'params'), async (req, res, next) => {`
- L759: `router.post('/admin/pacientes/agregar', isAuthenticated, canCreatePatients, normalizePacienteCreateBody, validate(pacienteCreateSchema), ensureFichaDetailsComplete, async (req, res, next) => {`
- L837: `router.get('/admin/pacientes/ver/:id', isAuthenticated, canViewPatients, validate(idParam, 'params'), async (req, res, next) => {`
- L846: `router.get('/admin/patient-dashboard/:id', isAuthenticated, canViewPatients, validate(idParam, 'params'), async (req, res, next) => {`
- L855: `router.get(['/admin/pacientes/editar/:id', '/admin/edit-patient/:id'], isAuthenticated, canEditPatients, validate(idParam, 'params'), async (req, res, next) => {`
- L873: `router.get('/admin/edit-patient', isAuthenticated, canViewPatients, (_req, res) => {`
- L878: `router.post('/admin/pacientes/editar', isAuthenticated, canEditPatients, normalizePacienteCreateBody, validate(pacienteEditSchema), ensureFichaDetailsComplete, async (req, res, next) => {`
- L984: `router.get(['/api/admin/pacientes/fichamedica/:id', '/api/fichamedica/:id'], isAuthenticated, canViewPatients, validate(idParam, 'params'), async (req, res, next) => {`
- L992: `router.put(['/api/admin/pacientes/:id/archivar', '/api/pacientes/archivar/:id'], isAuthenticated, canArchivePatients, validate(idParam, 'params'), async (req, res, next) => {`
- L999: `router.put(['/api/admin/pacientes/:id/desarchivar', '/api/archivados/archivar/:id'], isAuthenticated, canArchivePatients, validate(idParam, 'params'), async (req, res, next) => {`
- L1007: `router.get('/admin/archivados', isAuthenticated, canViewPatients, async (_req, res, next) => {`
- L1842: `router.get('/admin/appointments', isAuthenticated, canViewAppointments, async (req, res, next) => {`
- L1875: `router.get('/admin/doc-appointments', isAuthenticated, canViewAppointments, async (req, res, next) => {`
- L1896: `router.get('/admin/edit-appointment', isAuthenticated, canViewAppointments, async (req, res, next) => {`
- L1911: `router.post('/admin/edit-appointment/:id', isAuthenticated, canViewAppointments, validate(idParam, 'params'), validate(citaEditSchema), async (req, res, next) => {`
- L1968: `router.get('/admin/citas', isAuthenticated, canViewAppointments, (_req, res) => {`
- L1972: `router.get('/api/admin/doctores/:id/disponibilidad', isAuthenticated, canViewAppointments, validate(idParam, 'params'), validate(disponibilidadQuerySchema, 'query'), async (req, res, next) => {`
- L1979: `router.post('/admin/citas', isAuthenticated, canViewAppointments, validate(citasFilterSchema), async (req, res, next) => {`
- L1988: `router.post('/admin/citas/agregar', isAuthenticated, canCreateAppointments, validate(citaCreateSchema), async (req, res, next) => {`
- L2020: `router.post('/api/admin/citas/:id/iniciar-consulta', isAuthenticated, validate(idParam, 'params'), async (req, res, next) => {`
- L2040: `router.put(['/api/admin/citas/:id/atender', '/api/citas/atender/:id'], isAuthenticated, validate(idParam, 'params'),`
- L2050: `router.put(['/api/admin/citas/:id/cancelar', '/api/citas/cancelarCita/:id'], isAuthenticated, validate(idParam, 'params'), async (req, res, next) => {`
- L2067: `router.get('/admin/consultas/activas/:id', isAuthenticated, validate(idParam, 'params'), async (req, res, next) => {`
- L2079: `router.patch('/api/admin/consultas/activas/:id', isAuthenticated, validate(idParam, 'params'), validate(consultaActivaFieldsSchema), async (req, res, next) => {`
- L2087: `router.put('/api/admin/consultas/activas/:id/medicamentos', isAuthenticated, validate(idParam, 'params'), validate(medicamentosConsultaSchema), async (req, res, next) => {`
- L2095: `router.put('/api/admin/consultas/activas/:id/materiales', isAuthenticated, validate(idParam, 'params'), validate(materialesConsultaSchema), async (req, res, next) => {`
- L2103: `router.post('/api/admin/consultas/activas/:id/cotizaciones', isAuthenticated, validate(idParam, 'params'), validate(cotizacionConsultaSchema), async (req, res, next) => {`
- L2123: `router.get('/admin/consultas/activas/:id/cotizaciones/:cotizacionId/documento', isAuthenticated, validate(consultaCotizacionParam, 'params'), async (req, res, next) => {`
- L2132: `router.post('/api/admin/consultas/activas/:id/archivos', isAuthenticated, validate(idParam, 'params'), async (req, res, next) => {`
- L2143: `router.post('/api/admin/consultas/activas/:id/finalizar', isAuthenticated, validate(idParam, 'params'), async (req, res, next) => {`
- L2177: `router.get('/admin/historial', isAuthenticated, canViewHistory, async (_req, res, next) => {`
- L2202: `router.post('/admin/historial', isAuthenticated, canViewHistory, validate(historialFilterSchema), async (req, res, next) => {`
- L2232: `router.post(['/api/admin/consultas', '/api/consultas/agregar'], isAuthenticated, canCreateHistory, validate(consultaSchema), async (req, res, next) => {`

### `routes/pagos.routes.js`
- L415: `router.get('/admin/pago', isAuthenticated, canViewPayments, async (req, res, next) => {`
- L431: `router.post('/admin/pago', isAuthenticated, canViewPayments, validate(filtroPagosSchema), async (req, res, next) => {`
- L448: `router.post(['/api/admin/pagos', '/api/pagos'], isAuthenticated, canCreatePayments, async (req, res, next) => {`
- L537: `router.post(['/api/admin/pagos/abonos', '/guardarAbono'], isAuthenticated, canRegisterPayments, async (req, res, next) => {`
- L610: `router.get(['/api/admin/pagos/:idPago/detalles', '/obtenerPagoDetalles/:idPago'], isAuthenticated, canViewPayments, validate(idParam, 'params'), async (req, res, next) => {`

### `routes/perfil.routes.js`
- L192: `router.get('/admin/perfil', isAuthenticated, async (req, res, next) => {`
- L209: `router.get('/admin/doctores/perfil/:id', isAuthenticated, requirePermission('doctores:ver'), async (req, res, next) => {`
- L228: `router.get('/admin/perfil/editar', isAuthenticated, async (req, res, next) => {`
- L248: `router.post('/admin/perfil/editar', isAuthenticated, async (req, res, next) => {`

### `routes/portafolio.routes.js`
- L261: `router.get(['/admin/gallery', '/admin/portafolio'], isAuthenticated, canViewPortfolio, async (req, res, next) => {`
- L285: `router.post('/admin/portafolio/grupos', isAuthenticated, canCreatePortfolio, async (req, res, next) => {`
- L330: `router.put('/admin/portafolio/grupos/:id', isAuthenticated, canEditPortfolio, async (req, res, next) => {`
- L371: `router.delete('/admin/portafolio/grupos/:id', isAuthenticated, canDeletePortfolio, async (req, res, next) => {`
- L394: `router.post('/admin/portafolio/imagenes', isAuthenticated, canCreatePortfolio, async (req, res, next) => {`
- L442: `router.put('/admin/portafolio/imagenes/:id', isAuthenticated, canEditPortfolio, async (req, res, next) => {`
- L500: `router.delete('/admin/portafolio/imagenes/:id', isAuthenticated, canDeletePortfolio, async (req, res, next) => {`

### `routes/productos.routes.js`
- L372: `router.get('/admin/categorias', isAuthenticated, canViewCatalogs, renderCategorias);`
- L373: `router.post('/admin/categorias', isAuthenticated, canCreateCatalogs, validate(catalogItemSchema), createCategoria);`
- L374: `router.put('/admin/categorias/:id', isAuthenticated, canEditCatalogs, validate(categoriaIdParam, 'params'), validate(catalogItemSchema), updateCategoria);`
- L375: `router.delete('/admin/categorias/:id', isAuthenticated, canDeleteCatalogs, validate(categoriaIdParam, 'params'), deleteCategoria);`
- L377: `router.get('/admin/marcas', isAuthenticated, canViewCatalogs, renderMarcas);`
- L378: `router.post('/admin/marcas', isAuthenticated, canCreateCatalogs, validate(catalogItemSchema), createMarca);`
- L379: `router.put('/admin/marcas/:id', isAuthenticated, canEditCatalogs, validate(idParam, 'params'), validate(catalogItemSchema), updateMarca);`
- L380: `router.delete('/admin/marcas/:id', isAuthenticated, canDeleteCatalogs, validate(idParam, 'params'), deleteMarca);`
- L383: `router.post('/categorias', isAuthenticated, canCreateCatalogs, validate(catalogItemSchema), createCategoria);`
- L384: `router.put('/categorias/:id', isAuthenticated, canEditCatalogs, validate(categoriaIdParam, 'params'), validate(catalogItemSchema), updateCategoria);`
- L385: `router.delete('/categorias/:id', isAuthenticated, canDeleteCatalogs, validate(categoriaIdParam, 'params'), deleteCategoria);`
- L386: `router.post('/marcas', isAuthenticated, canCreateCatalogs, validate(catalogItemSchema), createMarca);`
- L387: `router.put('/marcas/:id', isAuthenticated, canEditCatalogs, validate(idParam, 'params'), validate(catalogItemSchema), updateMarca);`
- L388: `router.delete('/marcas/:id', isAuthenticated, canDeleteCatalogs, validate(idParam, 'params'), deleteMarca);`
- L412: `router.get('/admin/productos', isAuthenticated, canViewInventory, async (req, res, next) => {`
- L425: `router.post('/admin/agregarProducto', isAuthenticated, canCreateInventory, validate(productoSchema), async (req, res, next) => {`
- L456: `router.post('/admin/editarProducto', isAuthenticated, canEditInventory, validate(productoSchema.keys({ productoId: Joi.number().integer().required() })), async (req, res, next) => {`
- L488: `router.delete('/admin/eliminarProducto/:id', isAuthenticated, canDeleteInventory, validate(idParam, 'params'), async (req, res, next) => {`
- L599: `router.get('/admin/proveedores', isAuthenticated, canViewInventory, async (req, res, next) => {`
- L697: `router.post('/admin/proveedores', isAuthenticated, canCreateInventory, validate(proveedorSchema), createProveedor);`
- L698: `router.put('/admin/proveedores/:id', isAuthenticated, canEditInventory, validate(idParam, 'params'), validate(proveedorSchema), updateProveedor);`
- L699: `router.delete('/admin/proveedores/:id', isAuthenticated, canDeleteInventory, validate(idParam, 'params'), deleteProveedor);`
- L702: `router.post('/proveedores', isAuthenticated, canCreateInventory, validate(proveedorSchema), createProveedor);`
- L703: `router.put('/proveedores/:id', isAuthenticated, canEditInventory, validate(idParam, 'params'), validate(proveedorSchema), updateProveedor);`
- L704: `router.delete('/proveedores/:id', isAuthenticated, canDeleteInventory, validate(idParam, 'params'), deleteProveedor);`
- L722: `router.get('/admin/comprasProductos', isAuthenticated, canBuyInventory, async (req, res, next) => {`
- L740: `router.get('/admin/get-proveedores', isAuthenticated, canBuyInventory, async (_req, res, next) => {`
- L747: `router.get('/admin/get-productos', isAuthenticated, canBuyInventory, async (_req, res, next) => {`
- L754: `router.post('/admin/comprar-producto', isAuthenticated, canBuyInventory, validate(compraSchema), async (req, res, next) => {`
- L806: `router.get('/admin/get-detalles-factura/:idfactura', isAuthenticated, canBuyInventory, validate(idFacturaParam, 'params'), async (req, res, next) => {`
- L818: `router.post('/admin/eliminar-factura', isAuthenticated, canBuyInventory, validate(Joi.object({ facturaId: Joi.number().integer().positive().required() })), async (req, res, next) => {`
- L850: `router.get('/admin/salidasProductos', isAuthenticated, canMoveInventory, async (req, res, next) => {`
- L877: `router.get('/admin/getProductos', isAuthenticated, canMoveInventory, async (_req, res, next) => {`
- L884: `router.post('/admin/salidasProducto', isAuthenticated, canMoveInventory, validate(salidaSchema), async (req, res, next) => {`
- L910: `router.post('/admin/eliminarMovimiento', isAuthenticated, canMoveInventory, validate(Joi.object({ id: Joi.number().integer().positive().required() })), async (req, res, next) => {`
- L942: `router.post('/api/admin/inventario/movimientos', isAuthenticated, canMoveInventory, validate(movimientoRapidoSchema), async (req, res, next) => {`
- L965: `router.get('/api/admin/productos/:id/historial', isAuthenticated, canViewInventory, validate(idParam, 'params'), async (req, res, next) => {`
- L1047: `router.get('/admin/lista-compras', isAuthenticated, canViewInventory, async (req, res, next) => {`
- L1065: `router.get('/api/admin/tratamientos/:id/materiales', isAuthenticated, canViewInventory, validate(idParam, 'params'), async (req, res, next) => {`
- L1088: `router.post('/api/admin/listas-compras', isAuthenticated, canCreateInventory, validate(listaCompraSchema), async (req, res, next) => {`
- L1115: `router.put('/api/admin/listas-compras/:id/estado', isAuthenticated, canEditInventory, validate(idParam, 'params'), validate(Joi.object({`
- L1197: `router.get('/admin/listas-compras/:id/pdf', isAuthenticated, canViewInventory, validate(idParam, 'params'), async (req, res, next) => {`
- L1204: `router.get('/admin/listas-compras/:id/imagen', isAuthenticated, canViewInventory, validate(idParam, 'params'), async (req, res, next) => {`

### `routes/public.routes.js`
- L65: `router.get('/', (req, res) => {`
- L70: `router.get(['/admin/login', '/login'], (req, res) => {`
- L79: `router.get('/admin/signup', (_req, res) => res.redirect('/signup'));`
- L80: `router.get(['/recuperar-password', '/admin/forgot-password'], (_req, res) => res.render('admin/forgot-password'));`
- L81: `router.get(['/restablecer-password', '/admin/reset-password'], (_req, res) => res.render('admin/reset-password'));`
- L84: `router.get('/about', (req, res) => res.render('cliente/about'));`
- L85: `router.get('/contact', (req, res) => res.render('cliente/contact'));`
- L86: `router.get('/doctors', (req, res) => res.render('cliente/doctors'));`
- L87: `router.get('/odontopediatria', (req, res) => res.render('cliente/odontopediatria'));`
- L88: `router.get('/portfolio', async (_req, res, next) => {`
- L103: `router.get('/services', (req, res) => res.render('cliente/services'));`
- L105: `router.get('/cliente/:page', (req, res, next) => {`
- L112: `router.get('/logout', (req, res) => {`

### `routes/usuarios.routes.js`
- L18: `router.get('/admin/usuarios', isAuthenticated, canViewUsers, async (_req, res, next) => {`
- L34: `router.post('/admin/usuarios', isAuthenticated, canCreateUsers, validate(userCreateSchema), async (req, res, next) => {`
- L60: `router.put('/admin/usuarios/:id', isAuthenticated, canEditUsers, validate(idParam, 'params'), validate(userUpdateSchema), async (req, res, next) => {`
- L80: `router.put('/admin/usuarios/:id/estado', isAuthenticated, canEditUsers, validate(idParam, 'params'), validate(Joi.object({ estado: Joi.number().valid(1,2).required() })), async (req, res, next) => {`

## 5. Duplicados y solapamientos que requieren validación

1. **`GET /admin/dash`:** aparece en `routes/dashboard.routes.js` como vista del dashboard y también en `routes/generated.admin.pages.routes.js` como página generada. En `app.js`, `dashboardRoutes` se monta antes de `adminPagesRoutes`; por el orden de Express, la ruta del dashboard puede responder primero. Es un duplicado potencial confirmado en el registro, pero no se elimina sin probar ambos comportamientos y revisar el generador.
2. **`GET /admin`:** está declarado en `routes/admin.pages.fallback.routes.js`. El fallback también declara `GET /admin/:page`, que es una ruta comodín intencional para vistas administrativas no registradas individualmente; no debe confundirse automáticamente con duplicados.
3. **Aliases en arreglos:** varias rutas ofrecen dos o más URL para la misma operación (por ejemplo, rutas de doctores, pagos, categorías y proveedores). Esto parece compatibilidad con formularios o JavaScript anteriores; no es duplicación de lógica por sí sola.
4. **`GET /` y `/index`:** `app.js` declara ambas rutas y `public.routes.js` también declara `GET /`. Revisar orden y respuesta efectiva: `app.js` registra `/` antes de montar `publicRoutes`, por lo que la primera ruta puede impedir que la ruta pública posterior atienda `/`.
5. **Páginas administrativas generadas y fallback:** `generated.admin.pages.routes.js` contiene páginas concretas y `admin.pages.fallback.routes.js` resuelve páginas dinámicamente desde `views/admin`. Son mecanismos distintos; revisar si todas las páginas generadas siguen enlazadas antes de retirar cualquiera.

## 6. Estado de revisión

- Inventario de declaraciones `router.get/post/put/patch/delete/all` realizado mediante lectura estática.
- Se identificaron los puntos de solapamiento anteriores para pruebas funcionales.
- **No se declara que una ruta esté sin uso solo por no encontrar referencias en una búsqueda simple.** Para confirmar uso se deben revisar vistas EJS, JavaScript del cliente, enlaces, formularios, peticiones `fetch`/XHR y pruebas.
- No se eliminaron rutas, controladores, servicios ni dependencias en esta etapa.

## 7. Observación importante de configuración (no corregida en esta etapa)

El archivo de entorno original utiliza nombres `DB_PASS` y `DB_DATABASE`, mientras que `database/db.js` lee `DB_PASSWORD` y `DB_NAME`. El ejemplo limpio usa los nombres que realmente consume el código. Confirmar con el responsable de la base de datos qué nombres se utilizan en el entorno local antes de cambiar la configuración funcional. Además, `database/db.js` contiene valores predeterminados para usuario/contraseña/nombre de BD; conviene retirar esos valores de respaldo en una etapa separada y probar la conexión con variables explícitas.