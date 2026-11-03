# C&C Dental Studio
## Inventario de tablas de la base de datos

**Responsable:** Área de Base de Datos y QA  
**Base de datos:** `clinica_dental_final_qa`  
**Total de tablas:** 56  
**Herramienta:** MySQL Workbench

| No. | Tabla | Función principal |
|---|---|---|
| 1 | actividadsistema | Registro de actividades realizadas en el sistema. |
| 2 | categoria | Clasificación de productos del inventario. |
| 3 | cita | Registro de citas de pacientes. |
| 4 | compraproducto | Registro de compras de productos. |
| 5 | configuracion_sistema | Almacenamiento de parámetros de configuración del sistema. |
| 6 | consulta | Información de consultas odontológicas. |
| 7 | consulta_activa | Gestión de consultas odontológicas en curso. |
| 8 | consulta_activa_archivos | Archivos asociados a consultas activas. |
| 9 | consulta_activa_materiales | Materiales asociados a consultas activas. |
| 10 | consulta_activa_medicamentos | Medicamentos asociados a consultas activas. |
| 11 | consulta_doctor | Relación entre consultas y doctores. |
| 12 | contactoemergencia | Contactos de emergencia de pacientes. |
| 13 | controlpago | Información para el control de pagos. |
| 14 | cotizaciones | Encabezados de cotizaciones. |
| 15 | detalle_cotizaciones | Detalle de servicios o conceptos cotizados. |
| 16 | detalle_pago_servicio | Detalle de pagos relacionados con servicios. |
| 17 | detallefactura | Detalle de conceptos facturados. |
| 18 | doctor | Información de profesionales odontológicos. |
| 19 | especialidad | Catálogo de especialidades. |
| 20 | estadocita | Estados de las citas. |
| 21 | estadopaciente | Estados de los pacientes. |
| 22 | estadousuario | Estados de las cuentas de usuario. |
| 23 | factura | Encabezados de facturas. |
| 24 | fichamedica | Información de fichas médicas. |
| 25 | genero | Catálogo de géneros. |
| 26 | historial_clinico | Registros del historial clínico. |
| 27 | horarios_laborales | Horarios de trabajo registrados. |
| 28 | inventario | Información de existencias del inventario. |
| 29 | lista_compra | Registro de listas de compra. |
| 30 | lista_compra_detalle | Detalle de productos incluidos en listas de compra. |
| 31 | loteproducto | Registro de lotes de productos. |
| 32 | marca | Catálogo de marcas. |
| 33 | metodo_pago | Métodos de pago disponibles. |
| 34 | movimientoinventario | Registro de movimientos de inventario. |
| 35 | paciente | Información de pacientes. |
| 36 | paciente_preregistro | Información de pacientes pendientes de completar su registro. |
| 37 | pago | Registro de pagos. |
| 38 | permisos | Catálogo de permisos del sistema. |
| 39 | portafolio_imagen | Imágenes del portafolio. |
| 40 | producto | Información de productos. |
| 41 | producto_marca | Relación entre productos y marcas. |
| 42 | producto_proveedor | Relación entre productos y proveedores. |
| 43 | proveedor | Información de proveedores. |
| 44 | proveedor_contacto | Información de contactos de proveedores. |
| 45 | recibo | Registro de recibos. |
| 46 | registro_pendiente | Registro de operaciones pendientes de completar. |
| 47 | rol | Catálogo de roles del sistema. |
| 48 | roles_permisos | Relación entre roles y permisos. |
| 49 | servicio | Catálogo de servicios odontológicos. |
| 50 | session_store | Almacenamiento de sesiones del sistema. |
| 51 | solicitudes_autorizacion | Registro de solicitudes de autorización. |
| 52 | tipopaciente | Clasificación de pacientes. |
| 53 | tiposervicio | Clasificación de servicios. |
| 54 | tratamiento_material | Relación entre tratamientos y materiales utilizados. |
| 55 | usuario | Información de usuarios del sistema. |
| 56 | usuarios_permisos | Relación entre usuarios y permisos. |

## Observaciones

El inventario identifica las 56 tablas existentes en la base de datos `clinica_dental_final_qa` de C&C Dental Studio, consultadas mediante MySQL Workbench.

En comparación con el inventario anterior, que contenía 37 tablas, se identificaron 19 tablas adicionales relacionadas principalmente con la gestión de consultas activas, inventario, proveedores, permisos, autorizaciones y procesos administrativos.

Las funciones descritas corresponden a una interpretación inicial de los nombres de las tablas y deberán verificarse con sus columnas, claves y reglas de negocio.

## Verificación de claves y relaciones

Se realizó anteriormente una revisión de claves primarias y foráneas mediante `information_schema.KEY_COLUMN_USAGE` sobre la base de datos `clinica_dental_qa`.

Para la versión actual `clinica_dental_final_qa`, queda pendiente repetir la verificación detallada de las relaciones, claves primarias, claves foráneas y cardinalidades.

## Diagrama Entidad-Relación

Se generó un nuevo Diagrama Entidad-Relación (DER) mediante ingeniería inversa en MySQL Workbench, utilizando la base de datos `clinica_dental_final_qa`.

El modelo actualizado incorpora las 56 tablas identificadas en el inventario y representa gráficamente las relaciones declaradas en la base de datos.

Se conservan los archivos del diagrama anterior como referencia histórica y se agregan los siguientes archivos actualizados:

- `Diagrama_ER_Clinica_Dental_Actualizado.mwb`
- `Diagrama_ER_Clinica_Dental_Actualizado.png`
- `Diagrama_ER_Clinica_Dental_Actualizado.pdf`

La correspondencia detallada entre el diagrama, las restricciones SQL y las reglas de negocio deberá verificarse antes de considerar completamente validado el modelo relacional.