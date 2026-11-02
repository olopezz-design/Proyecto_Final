
# C&C Dental Studio
## Inventario de tablas de la base de datos

**Responsable:** Área de Base de Datos y QA  
**Base de datos:** clinica_dental_qa  
**Total de tablas:** 37

| No. | Tabla | Función principal |
|---|---|---|
| 1 | actividadsistema | Registro de actividades realizadas en el sistema. |
| 2 | categoria | Clasificación de productos del inventario. |
| 3 | cita | Registro de citas de pacientes. |
| 4 | compraproducto | Registro de compras de productos. |
| 5 | consulta | Información de consultas odontológicas. |
| 6 | consulta_doctor | Relación entre consultas y doctores. |
| 7 | contactoemergencia | Contactos de emergencia de pacientes. |
| 8 | cotizaciones | Encabezados de cotizaciones. |
| 9 | detalle_cotizaciones | Detalle de servicios o conceptos cotizados. |
| 10 | detallefactura | Detalle de conceptos facturados. |
| 11 | doctor | Información de profesionales odontológicos. |
| 12 | especialidad | Catálogo de especialidades. |
| 13 | estadocita | Estados de las citas. |
| 14 | estadopaciente | Estados de los pacientes. |
| 15 | estadousuario | Estados de las cuentas de usuario. |
| 16 | factura | Encabezados de facturas. |
| 17 | fichamedica | Información de fichas médicas. |
| 18 | genero | Catálogo de géneros. |
| 19 | historial_clinico | Registros del historial clínico. |
| 20 | horarios_laborales | Horarios de trabajo registrados. |
| 21 | inventario | Información de existencias del inventario. |
| 22 | loteproducto | Registro de lotes de productos. |
| 23 | marca | Catálogo de marcas. |
| 24 | metodo_pago | Métodos de pago disponibles. |
| 25 | movimientoinventario | Registro de movimientos de inventario. |
| 26 | paciente | Información de pacientes. |
| 27 | pago | Registro de pagos. |
| 28 | portafolio_imagen | Imágenes del portafolio. |
| 29 | producto | Información de productos. |
| 30 | proveedor | Información de proveedores. |
| 31 | recibo | Registro de recibos. |
| 32 | rol | Catálogo de roles del sistema. |
| 33 | servicio | Catálogo de servicios odontológicos. |
| 34 | session_store | Almacenamiento de sesiones del sistema. |
| 35 | tipopaciente | Clasificación de pacientes. |
| 36 | tiposervicio | Clasificación de servicios. |
| 37 | usuario | Información de usuarios del sistema. |

## Observaciones

El inventario identifica las 37 tablas existentes en la base de datos de pruebas de C&C Dental Studio.

Las funciones descritas son preliminares y deberán verificarse con la estructura SQL y las consultas utilizadas por la aplicación.

La revisión de claves primarias, claves foráneas y dependencias se documentará por separado antes de considerar validado el modelo relacional.


## Verificación de claves y relaciones

Se consultó information_schema.KEY_COLUMN_USAGE en MySQL
para identificar las claves primarias y foráneas de la
base de datos clinica_dental_qa.

Se verificaron las relaciones declaradas entre las tablas
de pacientes, citas, consultas, doctores, productos,
inventario, pagos, usuarios y otros módulos del sistema.

La revisión permitió identificar las tablas relacionadas
y las columnas utilizadas como claves foráneas.

Queda pendiente comparar estas relaciones con el
Diagrama Entidad-Relación de la versión final del sistema.

## Diagrama Entidad-Relación

Se dispone de un Diagrama Entidad-Relación (DER)
de C&C Dental Studio, elaborado en MySQL Workbench.

El modelo contiene las 37 tablas identificadas
en el inventario de la base de datos.

Se conservan los siguientes archivos:

- DER_Final_CyC_Dental_Studio_Entrega.mwb
- DER_Final_CyC_Dental_Studio.pdf

La correspondencia de las relaciones y cardinalidades
entre el DER y el SQL de entrega queda pendiente
de validación detallada.