# Inventario y limpieza del frontend: C&C Dental Studio

**Responsable:** Danny Omar Estrada González (3090-22-18093). Desarrollador frontend e identidad visual
**Rama:** `frontend`
**Fecha:** 2 de noviembre de 2026

Este documento contiene el inventario de vistas y recursos públicos, los archivos eliminados y cómo se comprobó que no se usaban, la revisión responsiva y las observaciones para el resto del equipo.

---

## 1. Resumen

| Concepto | Antes | Después |
|---|---|---|
| Vistas EJS (incluye parciales y modales) | 132 | 69 |
| Archivos en `assets/` y `public/` | 1509 | 95 |
| Tamaño de `assets/` + `public/` | 37.7 MB | 9.5 MB |
| Errores 404 al cargar las 34 páginas principales | `/usuario` en las 7 páginas públicas | 0 |
| Enlaces internos rotos | 1 (`/admin/doctoresInactivos`, error 500) | 0 |
| Errores JS propios del proyecto | Google Maps, `moment is not defined` | 0 |

**Archivos eliminados:** 1478. La lista completa está en [`archivos-eliminados.txt`](archivos-eliminados.txt).

Cada tipo de cambio está en un commit separado para poder revisarlo o revertirlo por partes:

1. Eliminar páginas de demostración de la plantilla admin
2. Eliminar vistas obsoletas y modales que no se incluyen
3. Quitar restos de la plantilla en Portafolio y Configuración
4. Corregir errores de consola en páginas públicas y perfil
5. Eliminar recursos públicos sin uso de la plantilla
6. Actualizar identidad de C&C Dental Studio
7. Corregir encabezado de Compras en teléfono
8. Corregir enlace roto a Doctores inactivos
9. Documentación (este archivo)

---

## 2. Inventario de vistas

### 2.1 Páginas públicas

| Vista | Ruta(s) | Estado |
|---|---|---|
| `index.ejs` | `/`, `/index` | Activa |
| `cliente/about.ejs` | `/about` | Activa |
| `cliente/services.ejs` | `/services` | Activa |
| `cliente/doctors.ejs` | `/doctors` | Activa |
| `cliente/odontopediatria.ejs` | `/odontopediatria` | Activa |
| `cliente/portfolio.ejs` | `/portfolio` | Activa (lee la tabla `portafolio_imagen`) |
| `cliente/contact.ejs` | `/contact` | Activa |
| `public/pre-registro-paciente.ejs` | `/pacientes/pre-registro/:token` | Activa (enlace enviado al paciente) |

`/cliente/:page` redirige con 301 a la URL limpia, por ejemplo `/cliente/about` → `/about`.

### 2.2 Acceso y errores

| Vista | Ruta(s) | Estado |
|---|---|---|
| `admin/login.ejs` | `/admin/login`, `/login` | Activa |
| `admin/signup.ejs` | `/signup` (`/admin/signup` redirige) | Activa |
| `admin/forgot-password.ejs` | `/recuperar-password`, `/admin/forgot-password` | Activa |
| `admin/reset-password.ejs` | `/restablecer-password`, `/admin/reset-password` | Activa |
| `admin/page-not-found.ejs` | Manejador 404/500 de `app.js` | Activa |

### 2.3 Panel administrativo con diseño actual

Usan el menú lateral `partials/adminSidebar.ejs`.

| Vista | Ruta(s) | Módulo |
|---|---|---|
| `dash.ejs` | `/admin/dash`, `/admin/dashboard` (`/admin` y `/admin/index` redirigen) | Panel principal |
| `appointments.ejs` | `/admin/appointments` (`/admin/citas` redirige) | Citas: calendario |
| `doc-appointments.ejs` | `/admin/doc-appointments` | Citas: lista |
| `edit-appointment.ejs` | `/admin/edit-appointment` | Citas: editar |
| `patients-list.ejs` | `/admin/pacientes`, `/admin/patients-list`, `/admin/my-patients` | Pacientes |
| `add-patient.ejs` | `/admin/pacientes/agregar`, `/admin/add-patient`, `/admin/pacientes/pre-registros/:id/crear` | Pacientes: agregar |
| `patient-dashboard.ejs` | `/admin/pacientes/ver/:id`, `/admin/patient-dashboard/:id` | Pacientes: ficha |
| `edit-patient.ejs` | `/admin/pacientes/editar/:id`, `/admin/edit-patient/:id` | Pacientes: editar |
| `consulta-activa.ejs` | `/admin/consultas/activas/:id` | Consulta en curso |
| `pago.ejs` | `/admin/pago` | Pagos |
| `productos.ejs` | `/admin/productos` | Inventario |
| `proveedores.ejs` | `/admin/proveedores` | Inventario |
| `comprasProductos.ejs` | `/admin/comprasProductos` | Inventario: compras |
| `salidasProductos.ejs` | `/admin/salidasProductos` | Inventario: kardex |
| `lista-compras.ejs` | `/admin/lista-compras` | Lista de compras |
| `gallery.ejs` | `/admin/gallery`, `/admin/portafolio` | Portafolio |
| `settings.ejs` | `/configuracion`, `/admin/configuracion`, `/admin/settings` | Configuración |
| `doctors-profile.ejs` | `/admin/perfil`, `/admin/doctores/perfil/:id` | Perfil |
| `edit-doctors.ejs` | `/admin/perfil/editar` | Perfil: editar |

### 2.4 Panel administrativo con diseño anterior

Estas páginas funcionan, pero tienen el diseño antiguo: Bootstrap 4 desde CDN y una barra lateral oscura. Ver la **observación O-1**.

| Vista | Ruta | ¿Está enlazada desde el diseño actual? |
|---|---|---|
| `archivados.ejs` | `/admin/archivados` | Sí, botón "Archivados" en Pacientes |
| `historial.ejs` | `/admin/historial` | No |
| `cotizaciones.ejs` | `/admin/cotizaciones` | No |
| `doctores.ejs` | `/admin/doctores` | No |
| `doctoresInactivos.ejs` | `/admin/doctores/inactivos` | No |
| `categorias.ejs` | `/admin/categorias` | No (Configuración > Catálogos cubre la función) |
| `marcas.ejs` | `/admin/marcas` | No (Configuración > Catálogos cubre la función) |

### 2.5 Parciales compartidos

| Parcial | Lo incluyen |
|---|---|
| `partials/adminSidebar.ejs` | Las 19 vistas de la sección 2.3 |
| `partials/inventoryNav.ejs` | productos, proveedores, comprasProductos, salidasProductos, lista-compras |
| `partials/uiFeedback.ejs` | 17 vistas (mensajes y confirmaciones) |
| `partials/searchableSelect.ejs` | 9 vistas (selects con búsqueda) |
| `partials/pageLoader.ejs` | 10 vistas (animación de carga) |

### 2.6 Modales y pestañas

| Carpeta | Lo incluye |
|---|---|
| `Citas/modals/addCita`, `infoCita` | appointments, doc-appointments |
| `Pacientes/modals/preRegistroPaciente` | add-patient |
| `Configuracion/tabs/*` (7) y `Configuracion/scripts/settingsScripts` | settings |
| `Cotizaciones/modals/treatmentModal` | cotizaciones |
| `Doctores/modals/*` (3) | doctores |
| `DoctoresInactivos/modals/*` (2) | doctoresInactivos |
| `Historial/modals/*` (2) | historial |
| `Categorias/modals/*` (3) | categorias |
| `Marcas/modals/*` (3) | marcas |

---

## 3. Inventario de recursos públicos que se conservan

`app.js` sirve `public/` en la raíz (`/css`, `/js`, `/images`, `/fonts`) y `assets/` en `/assets` y `/admin/assets`.

| Carpeta | Archivos | Uso |
|---|---|---|
| `assets/css/main.min.css` | 1 | Estilo base del panel administrativo |
| `assets/fonts/remix/` | 5 | Iconos Remix del panel (`ri-*`) |
| `assets/images/` | 5 | Fondos del login, error y mantenimiento, y banners del panel |
| `assets/js/` | 4 | jQuery, Bootstrap 5, moment y `custom.js` (menú, buscador y sesión) |
| `assets/vendor/calendar/` | 4 | FullCalendar de Citas |
| `assets/vendor/daterange/` | 3 | Selector de fechas del encabezado |
| `assets/vendor/gallery/` | 4 | Galería del Portafolio |
| `assets/vendor/overlay-scroll/` | 3 | Barra de desplazamiento del menú lateral |
| `public/css/` | 14 | Sitio público (`style.css`, `cnc-public.css`, plugins) y `dashboard.css` (páginas de diseño anterior) |
| `public/fonts/` | 19 | Iconos del sitio público (flaticon, icomoon, ionicons, open-iconic) y licencia de Flaticon |
| `public/images/` | 17 | Logos (`cnc-logo-alt.svg`, `cnc-favicon.svg`, `cnc-logo.svg`) y fotos del sitio público |
| `public/js/` | 16 | Plugins del sitio público, `main.js` y `dashboard.js` |

`cnc-logo.svg` no lo usa ninguna vista, pero se conserva porque es el logo de la clínica y sirve para manuales y la presentación.

---

## 4. Qué se eliminó y cómo se comprobó

### 4.1 Páginas de demostración de la plantilla: 40 vistas y 1 modal

`accordions`, `alerts`, `badges`, `buttons`, `button-groups`, `cards`, `advanced-cards`, `carousel`, `dropdowns`, `icons`, `list-items`, `placeholders`, `progress`, `spinners`, `tables`, `tabs`, `typography`, `maps`, `full-post`, `maintenance`, `login-copy`, `index` (del panel), `dashboard3`, `create-invoice`, `invoices`, `invoice-details`, `expenses`, `income`, `payments`, `staff`, `add-staff`, `edit-staff`, `add-doctors`, `doctors-cards`, `doctors-grid`, `patient-profile`, `appointment-success`, `appointments-list`, `appointments-details` (archivo vacío), `book-appointment` y `Staff/modals/deleteStaff`.

**Comprobación:**
- Las 39 con contenido tenían el título `Bootstrap Gallery - Dental Admin Template`.
- Ninguna vista que se conserva las incluye (`include`) ni las enlaza.
- Solo se podían abrir escribiendo la URL a mano. Se quitaron sus 34 rutas de `routes/generated.admin.pages.routes.js`.

### 4.2 Vistas obsoletas: 5 vistas

| Vista | Por qué ya no se mostraba |
|---|---|
| `citas.ejs` | `/admin/citas` redirige a `/admin/appointments` |
| `pacientes.ejs` | `/admin/pacientes` renderiza `patients-list.ejs` |
| `my-patients.ejs` | `/admin/my-patients` renderiza `patients-list.ejs` |
| `dashboard.ejs` | `/admin/dashboard` renderiza `dash.ejs` |
| `verPaciente.ejs` | Bloqueada en `admin.pages.fallback.routes.js` y sin `res.render` |

**Comprobación:** búsqueda de `res.render('admin/<vista>')` en `routes/` y `app.js`, y del orden de montaje de los routers en `app.js`. Las rutas propias se montan antes que las generadas y el fallback.

### 4.3 Modales sin `include`: 17 archivos

Carpetas `Pagos/`, `Productos/`, `Proveedores/`, `ComprasProductos/`, `SalidasProductos/` y los modales `addPaciente`, `infoPaciente`, `editPaciente` y `fichaMedica`, que solo los usaba `pacientes.ejs`.

**Comprobación:** búsqueda de `include('<Carpeta>/modals/...')` en todas las vistas. Ningún resultado fuera de la vista obsoleta.

### 4.4 Recursos públicos: 1414 archivos

**Comprobación:**
1. Un script recorrió las referencias de forma transitiva desde las vistas y el código del servidor: vista → `<link>`/`<script>`/`<img>` → `url()` dentro de los CSS usados. Un recurso cuenta como usado solo si lo referencia un archivo también en uso.
2. Se buscó el **nombre** de cada archivo eliminado en vistas, rutas, utilidades, CSS/JS en uso y en el SQL `clinica_dental.sql`. Las coincidencias resultaron falsos positivos, por ejemplo URLs de CDN como `jquery.dataTables.min.js`.
3. Se revisaron las rutas armadas dinámicamente en JS. Solo apuntan a `/uploads/...`, que no se tocó.
4. Se abrieron 34 páginas en computadora y teléfono (68 cargas) con el navegador y se registraron las respuestas HTTP: **0 respuestas 404**.

**Principales grupos:** 836 banderas SVG, fuentes SCSS de Bootstrap, gráficos de demo (apex, morris, jvectormap), plugins no usados (dropzone, quill, rating, input-tags, input-masks, jquery-ui), copias `(2)`, imágenes de ejemplo (doctores, pacientes, productos, tarjetas) y `assets/images/shine.png`.

### 4.5 Otros archivos

- `public/js/google-map.js`: mapa de la plantilla centrado en Nueva York. Las páginas que lo cargaban no tienen un `#map`. Contacto usa su propio `iframe` con la ubicación de la clínica.

---

## 5. Cambios en la interfaz (sin eliminar páginas)

| Archivo | Cambio |
|---|---|
| `gallery.ejs`, `settings.ejs` | Se quitaron el menú oculto de la plantilla, "Emergency Contact 0987654321", el selector de banderas y "Bookmarks", y las meta "Marketplace for Bootstrap Admin Dashboards" |
| `gallery.ejs`, `settings.ejs`, `add-patient.ejs`, `edit-patient.ejs`, `patients-list.ejs` | Buscador: "Search" → "Buscar" |
| `public/js/main.js` | Se quitó el bloque de la plantilla que pedía `/usuario` (404 en todas las páginas públicas) |
| `index.ejs`, `cliente/doctors.ejs` | Se quitó la API de Google Maps (cargada dos veces con `YOUR_API_KEY` y con una clave de la plantilla) |
| `doctors-profile.ejs`, `edit-doctors.ejs` | Se quitó daterange, que no tenía campos y lanzaba `moment is not defined` |
| `index.ejs`, `cliente/contact.ejs`, `cliente/doctors.ejs` | Pie de página: "All rights reserved" → "Copyright © año C&C Dental Studio." (igual que las demás páginas) |
| `package.json`, `package-lock.json` | Nombre `shinedentalproyec` → `cnc-dental-studio` |
| `comprasProductos.ejs` | Encabezado en teléfono: la campana y el avatar ya no bajan a una segunda fila |
| 7 vistas de diseño anterior | Enlace `/admin/doctoresInactivos` (error 500) → `/admin/doctores/inactivos` |

---

## 6. Revisión responsiva

**Método:** Playwright con Chromium. Computadora a 1366×800; teléfono a 390×844, el tamaño de un iPhone 12–14, con `isMobile`. Se midió `scrollWidth - innerWidth` en cada página para detectar desplazamiento horizontal.

| Grupo | Computadora | Teléfono | Notas |
|---|---|---|---|
| Sitio público (7 páginas) | OK | OK | Menú "MENÚ" desplegable correcto |
| Login, registro, recuperación | OK | OK | |
| Panel principal, Citas, Pacientes | OK | OK | Calendario adaptado |
| Inventario (5 páginas) | OK | OK | Compras corregido. La barra "Inventario" se desliza horizontalmente a propósito |
| Pagos, Portafolio, Configuración, Perfil | OK | OK | Pestañas de Configuración desplazables |
| Cotizaciones (diseño anterior) | Desborde de 20 px | Sin desborde | Ver O-1 |

Las capturas de antes y después, en computadora y teléfono, se entregan aparte como evidencia en la carpeta compartida del equipo, no en el repositorio.

---

## 7. Observaciones para el equipo (no corregidas en esta rama)

| Id | Para | Observación |
|---|---|---|
| O-1 | Julia (alcance) | 7 páginas usan todavía el **diseño anterior** (sección 2.4) y cargan Bootstrap 4, jQuery y DataTables desde CDN externos. Solo "Archivados" se enlaza desde el diseño actual. Hay que decidir si se excluyen de la entrega o se dejan como están. Rediseñarlas sería trabajo nuevo. |
| O-2 | Julia | En la tarjeta "Dr. Herbert Castillo" de Contacto el correo es `castilloherbert9@gmail.com`, pero en el resto del sitio y en Configuración es `castilloherbert@gmail.com`. Hay que confirmar cuál es el correcto. |
| O-3 | Julia | En el encabezado del panel aparece un selector de fechas (por ejemplo "04/10/2026 - 02/11/2026") que no filtra nada. Se puede dejar como indicador o quitar. |
| O-4 | Sergio / Kimberly | **Error con una base nueva:** el SQL crea `estadousuario` con `AUTO_INCREMENT = 3`, así que "Activo" queda con id 3, pero `POST /auth` exige `estadoUsuario_idestadoUsuario === 1`. Al importar en limpio, el primer administrador ve "Usuario inactivo" y no puede entrar. |
| O-5 | Sergio | `env/.env` está dentro del repositorio y no hay `.gitignore`. Además, `.env` usa `DB_PASS` y `DB_DATABASE`, pero `database/db.js` lee `DB_PASSWORD` y `DB_NAME`, y tiene un usuario y contraseña por defecto escritos en el código. |
| O-6 | Sergio / Kimberly | `uploads/` tiene PDFs de recetas y cotizaciones de pacientes (PT0001, PT0002) y una foto de perfil. No deberían estar en GitHub. Se recomienda agregar `uploads/` al `.gitignore` y quitarlos del repositorio. |
| O-7 | Sergio | `node_modules/` y `.DS_Store` también están en el repositorio. |
| O-8 | Sergio | `routes/public.routes.js` borra la cookie `shine.sid` al cerrar sesión (resto del proyecto anterior; no se ve en pantalla). |
| O-9 | Julia / Omar | La plantilla del sitio público es de Colorlib con licencia CC BY 3.0, que pide dar crédito al autor. El crédito ya se había quitado antes de esta rama. Se recomienda agregarlo en el README o en el pie de página. |
| O-10 | Kimberly (pruebas) | El SQL usa `utf8mb4_0900_ai_ci`, que solo existe en MySQL 8. En MariaDB hay que cambiarlo por `utf8mb4_unicode_ci` para importarlo. |
