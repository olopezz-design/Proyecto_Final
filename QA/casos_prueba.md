# C&C Dental Studio
## Registro de casos de prueba – Control de Calidad (QA)

**Área:** Base de Datos y Control de Calidad  
**Entorno:** Aplicación web C&C Dental Studio y MySQL  
**Responsable:** Kimberly  
**Fecha de revisión:** 03/11/2026

## 1. Objetivo

Verificar el funcionamiento de los principales módulos de C&C Dental Studio, comprobar la integridad de la base de datos y documentar los resultados obtenidos durante las pruebas funcionales. Para realizar las validaciones se utilizaron registros ficticios, evitando el uso de información personal de pacientes reales.

## 2. Resumen de casos de prueba

| Código | Prueba realizada | Resultado |
|---|---|---|
| CP-01 | Inicio de sesión del administrador | Aprobado |
| CP-02 | Acceso al módulo de citas | Aprobado |
| CP-03 | Registro de producto en inventario | Aprobado |
| CP-04 | Entrada de inventario | Aprobado |
| CP-05 | Salida de inventario | Aprobado |
| CP-06 | Acceso y registro de pacientes | Aprobado |
| CP-07 | Acceso al módulo de pagos | Aprobado |
| CP-08 | Importación de 56 tablas | Aprobado |
| CP-09 | Verificación de 70 referencias de claves foráneas | Aprobado |
| CP-10 | Verificación de 3 triggers | Aprobado |
| CP-11 | Importación de datos ficticios | Aprobado |
| CP-12 | Registro de tres pacientes mediante SQL | Aprobado |
| CP-13 | Verificación de relaciones de pacientes | Aprobado |
| CP-14 | Registro y persistencia de citas | Aprobado |
| CP-15 | Visualización de detalles de una cita | Aprobado |
| CP-16 | Edición y persistencia del motivo de una cita | Aprobado |
| CP-17 | Apertura del formulario Nuevo pago | Aprobado |
| CP-18 | Registro y visualización de métodos de pago | Aprobado |
| CP-19 | Visualización del filtro de consultas en pagos | Interfaz verificada |
| CP-20 | Validación de importación del SQL limpio | Aprobado |

## 3. Detalle de los casos de prueba

### CP-01. Inicio de sesión del administrador

**Módulo:** Autenticación.

**Objetivo:** Comprobar que un usuario con permisos de administrador pueda ingresar correctamente al sistema.

**Procedimiento:**
1. Abrir la aplicación web.
2. Ingresar las credenciales del usuario de prueba.
3. Acceder al panel administrativo.

**Resultado esperado:** Permitir el acceso al panel administrativo.

**Resultado obtenido:** Se ingresó correctamente al sistema y se visualizó el panel correspondiente al administrador.

**Estado:** Aprobado.

**Responsable:** Kimberly.

### CP-02. Acceso al módulo de citas

**Módulo:** Citas.

**Objetivo:** Verificar el acceso a las herramientas de gestión de citas.

**Procedimiento:**
1. Iniciar sesión en la aplicación.
2. Seleccionar Citas en el menú.
3. Revisar la visualización del calendario.

**Resultado esperado:** Mostrar el calendario y las opciones disponibles para gestionar citas.

**Resultado obtenido:** El módulo se abrió correctamente y permitió visualizar el calendario.

**Estado:** Aprobado.

**Responsable:** Kimberly.

### CP-03. Registro de producto en inventario

**Módulo:** Inventario.

**Objetivo:** Comprobar el registro de un producto utilizando información ficticia.

**Datos utilizados:** Producto Prueba QA, Marca Dental QA, Insumos Dentales QA, precio Q25.00 y stock mínimo de 5 unidades.

**Procedimiento:**
1. Ingresar al módulo Inventario.
2. Seleccionar la opción Productos.
3. Completar la información del producto.
4. Seleccionar marca, categoría y proveedor.
5. Guardar y consultar el producto.

**Resultado esperado:** Registrar correctamente el producto y mostrar su información.

**Resultado obtenido:** El producto se registró satisfactoriamente y mostró su marca, categoría, precio y proveedor.

**Estado:** Aprobado.

**Responsable:** Kimberly.

### CP-04. Entrada de inventario

**Módulo:** Inventario.

**Objetivo:** Verificar la actualización de existencias mediante una entrada de productos.

**Datos utilizados:** Producto Prueba QA, entrada de 10 unidades.

**Procedimiento:**
1. Abrir el producto registrado.
2. Seleccionar Entrada.
3. Ingresar 10 unidades.
4. Guardar el movimiento.
5. Consultar el stock actualizado.

**Resultado esperado:** Incrementar las existencias de 0 a 10 unidades.

**Resultado obtenido:** El inventario aumentó correctamente a 10 unidades y el movimiento quedó registrado en el historial.

**Estado:** Aprobado.

**Responsable:** Kimberly.

### CP-05. Salida de inventario

**Módulo:** Inventario.

**Objetivo:** Comprobar la reducción de existencias y el registro de movimientos en el Kardex.

**Datos utilizados:** Producto Prueba QA, dos salidas de 1 y 4 unidades.

**Procedimiento:**
1. Registrar una salida de 1 unidad.
2. Registrar una segunda salida de 4 unidades.
3. Consultar las existencias.
4. Revisar el historial y el Kardex.

**Resultado esperado:** Reducir el stock de 10 a 5 unidades y conservar el registro de los movimientos.

**Resultado obtenido:** El stock final fue de 5 unidades. El historial y el Kardex mostraron correctamente una entrada y dos salidas.

**Estado:** Aprobado.

**Responsable:** Kimberly.

**Observación:** También se verificó la clasificación de stock bajo al alcanzar el mínimo configurado.

### CP-06. Acceso y registro de pacientes

**Módulo:** Pacientes.

**Objetivo:** Verificar el acceso al módulo y el registro básico de pacientes.

**Procedimiento:**
1. Ingresar al módulo Pacientes.
2. Revisar el formulario y los campos disponibles.
3. Completar la información de un paciente ficticio.
4. Guardar el registro.
5. Consultar la ficha individual.

**Resultado esperado:** Permitir el registro y la consulta de pacientes.

**Resultado obtenido:** Después de completar los datos de configuración necesarios, se registró un paciente ficticio y se comprobó el acceso al listado y a su ficha individual.

**Estado:** Aprobado.

**Responsable:** Kimberly.

### CP-07. Acceso al módulo de pagos

**Módulo:** Pagos.

**Objetivo:** Comprobar el acceso y la visualización de la pantalla de gestión de pagos.

**Procedimiento:**
1. Seleccionar Pagos en el menú administrativo.
2. Revisar el resumen de pagos.
3. Verificar los filtros disponibles.
4. Consultar el listado de registros.

**Resultado esperado:** Mostrar correctamente la interfaz de gestión de pagos.

**Resultado obtenido:** El módulo abrió satisfactoriamente y mostró el resumen, los filtros y el listado correspondiente.

**Estado:** Aprobado para acceso y visualización.

**Responsable:** Kimberly.

### CP-08. Importación de la estructura SQL

**Módulo:** Base de datos.

**Objetivo:** Verificar que la estructura de la base de datos pueda importarse correctamente.

**Datos utilizados:** `clinica_dental_validacion_final.sql`.

**Procedimiento:**
1. Preparar una base de datos de validación.
2. Abrir el archivo SQL en MySQL Workbench.
3. Ejecutar la estructura.
4. Consultar la cantidad de tablas importadas.

**Resultado esperado:** Importar correctamente 56 tablas.

**Resultado obtenido:** Se comprobó la importación de las 56 tablas.

**Estado:** Aprobado.

**Responsable:** Kimberly.

**Evidencia:** Captura de importación y consulta de verificación.

### CP-09. Verificación de claves foráneas

**Módulo:** Base de datos.

**Objetivo:** Comprobar que las relaciones entre tablas se conservaron después de la importación.

**Procedimiento:**
1. Importar la estructura SQL.
2. Consultar `information_schema.KEY_COLUMN_USAGE`.
3. Contar las referencias de claves foráneas.

**Resultado esperado:** Identificar 70 referencias de claves foráneas.

**Resultado obtenido:** Se identificaron correctamente 70 referencias.

**Estado:** Aprobado.

**Responsable:** Kimberly.

**Evidencia:** Consulta SQL y resultado de verificación.

### CP-10. Verificación de triggers

**Módulo:** Base de datos.

**Objetivo:** Comprobar la importación de los triggers definidos en la estructura.

**Procedimiento:**
1. Importar la estructura SQL.
2. Consultar `information_schema.TRIGGERS`.
3. Verificar la cantidad de triggers.

**Resultado esperado:** Encontrar 3 triggers.

**Resultado obtenido:** Se identificaron 3 triggers en la base de datos importada.

**Estado:** Aprobado.

**Responsable:** Kimberly.

**Evidencia:** Consulta SQL y resultado de verificación.

### CP-11. Importación de datos ficticios

**Módulo:** Base de datos.

**Objetivo:** Comprobar la inserción de información ficticia para las pruebas del sistema.

**Datos utilizados:** `datos_ficticios_entrega.sql`.

**Procedimiento:**
1. Importar la estructura de la base de datos.
2. Ejecutar el archivo de datos ficticios.
3. Consultar los registros insertados.
4. Verificar las cantidades obtenidas.

**Resultado esperado:** Registrar 2 géneros, 2 tipos de paciente, 1 estado y 3 pacientes ficticios.

**Resultado obtenido:** Se comprobaron las cantidades esperadas durante la importación.

**Estado:** Aprobado.

**Responsable:** Kimberly.

**Evidencia:** `QA/Validacion_SQL_Datos_Ficticios.png`.

### CP-12. Registro de pacientes ficticios mediante SQL

**Módulo:** Pacientes y base de datos.

**Objetivo:** Verificar el registro de pacientes mediante instrucciones SQL.

**Datos utilizados:** Carlos Prueba QA, María Prueba QA y Andrea Prueba QA.

**Procedimiento:**
1. Preparar los registros ficticios.
2. Identificar las referencias de género, tipo de paciente y estado.
3. Ejecutar las inserciones.
4. Consultar los registros almacenados.

**Resultado esperado:** Registrar correctamente tres pacientes ficticios.

**Resultado obtenido:** Se insertaron los tres pacientes sin errores de registro.

**Estado:** Aprobado.

**Responsable:** Kimberly.

**Evidencia:** Captura de MySQL Workbench.

### CP-13. Verificación de relaciones de pacientes

**Módulo:** Pacientes y base de datos.

**Objetivo:** Comprobar las relaciones de los pacientes con las tablas de género, tipo y estado.

**Procedimiento:**
1. Consultar los pacientes ficticios.
2. Ejecutar una consulta con `INNER JOIN`.
3. Relacionar las tablas correspondientes.
4. Revisar los resultados.

**Resultado esperado:** Mostrar correctamente los datos relacionados de cada paciente.

**Resultado obtenido:**
- Carlos: Masculino, Particular, Activo.
- María: Femenino, Seguro, Activo.
- Andrea: Femenino, Particular, Activo.

**Estado:** Aprobado.

**Responsable:** Kimberly.

**Evidencia:** Captura de MySQL Workbench.

### CP-14. Registro y persistencia de citas

**Módulo:** Citas.

**Objetivo:** Verificar el registro y almacenamiento de una cita.

**Datos utilizados:** Doctor Carlos Doctor QA, paciente ficticio y cita #APT005.

**Procedimiento:**
1. Seleccionar el doctor y un horario disponible.
2. Seleccionar el paciente.
3. Completar el motivo de la consulta.
4. Guardar la cita.
5. Actualizar la página y consultar el registro.

**Resultado esperado:** Registrar la cita y conservarla después de actualizar la página.

**Resultado obtenido:** Se registró la cita #APT005 con estado Pendiente y se comprobó que permanecía almacenada.

**Estado:** Aprobado.

**Responsable:** Kimberly.

**Evidencias:** `QA_Registro_Cita_Exitoso.png` y `QA_Persistencia_Cita.png`.

### CP-15. Visualización de detalles de una cita

**Módulo:** Citas.

**Objetivo:** Comprobar la visualización de la información de una cita registrada.

**Datos utilizados:** Cita #APT005.

**Procedimiento:**
1. Abrir el listado de citas.
2. Localizar la cita registrada.
3. Seleccionar Detalles.
4. Revisar la información presentada.

**Resultado esperado:** Mostrar paciente, doctor, fecha, hora, estado, motivo y notas.

**Resultado obtenido:** Se visualizaron correctamente los datos correspondientes a la cita.

**Estado:** Aprobado.

**Responsable:** Kimberly.

**Evidencia:** `QA_Detalle_Cita.png`.

### CP-16. Edición y persistencia del motivo de una cita

**Módulo:** Citas.

**Objetivo:** Comprobar que el motivo de una cita pueda modificarse y conservarse después de guardar.

**Datos utilizados:** Cita #APT005.

**Procedimiento:**
1. Abrir la opción Editar.
2. Revisar los datos cargados.
3. Modificar el motivo de la cita.
4. Guardar los cambios.
5. Actualizar la página y verificar el motivo.

**Resultado esperado:** Conservar correctamente el nuevo motivo de la cita.

**Resultado obtenido:** Se modificó el motivo de la cita #APT005 y se comprobó que permanecía guardado después de actualizar la página.

**Estado:** Aprobado para la edición y persistencia del motivo.

**Responsable:** Kimberly.

**Observación:** La validación corresponde al cambio del motivo. En una prueba posterior de fecha y hora se identificó una incidencia de navegación, documentada en el registro de incidencias.

### CP-17. Apertura del formulario Nuevo pago

**Módulo:** Pagos.

**Objetivo:** Verificar que el formulario de registro de pagos se abra correctamente.

**Procedimiento:**
1. Ingresar al módulo Pagos.
2. Seleccionar Nuevo pago.
3. Revisar los campos disponibles.

**Resultado esperado:** Mostrar el formulario correspondiente al registro de pagos.

**Resultado obtenido:** Se visualizaron los campos de consulta asociada, fecha, método de pago, forma de pago, cotización y evidencia de pago.

**Estado:** Aprobado para apertura y visualización.

**Responsable:** Kimberly.

**Evidencia:** `QA_Formulario_Nuevo_Pago.png`.

### CP-18. Registro y visualización de métodos de pago

**Módulo:** Pagos y base de datos.

**Objetivo:** Comprobar que los métodos registrados en MySQL estén disponibles en la aplicación.

**Datos utilizados:** Efectivo, Transferencia y Tarjeta.

**Procedimiento:**
1. Consultar la tabla `metodo_pago`.
2. Registrar los tres métodos de prueba.
3. Actualizar el módulo Pagos.
4. Revisar las opciones del filtro Método.

**Resultado esperado:** Mostrar los tres métodos registrados.

**Resultado obtenido:** Los métodos se registraron correctamente en MySQL y posteriormente estuvieron disponibles en la aplicación.

**Estado:** Aprobado.

**Responsable:** Kimberly.

### CP-19. Visualización del filtro de consultas en pagos

**Módulo:** Pagos.

**Objetivo:** Verificar la visualización y las opciones disponibles en el filtro Consulta.

**Procedimiento:**
1. Ingresar al módulo Pagos.
2. Desplegar el filtro Consulta.
3. Revisar las opciones disponibles.

**Resultado esperado:** Mostrar las opciones correspondientes a las consultas disponibles en el sistema.

**Resultado obtenido:** El filtro se desplegó correctamente y presentó la opción «Todas». Durante la revisión, el sistema no mostraba consultas pendientes de cobro.

**Estado:** Interfaz verificada. Filtrado con múltiples consultas no evaluado.

**Responsable:** Kimberly.

**Observación:** El comportamiento observado corresponde a los registros disponibles durante la prueba y no permite confirmar un defecto en el filtro.

### CP-20. Validación de importación del SQL limpio

**Módulo:** Base de datos.

**Objetivo:** Verificar que la estructura SQL pueda importarse en una base nueva y utilizarse con registros ficticios.

**Datos utilizados:** `clinica_dental_validacion_final.sql` y `datos_ficticios_entrega.sql`.

**Procedimiento:**
1. Crear la base de prueba `clinica_dental_prueba_entrega`.
2. Importar la estructura SQL.
3. Verificar las tablas, claves foráneas y triggers.
4. Importar los datos ficticios.
5. Consultar los pacientes registrados.
6. Revisar el archivo de estructura en busca de instrucciones de inserción de datos.

**Resultado esperado:** Importar correctamente la estructura y los datos ficticios.

**Resultado obtenido:** Se comprobaron 56 tablas, 70 referencias de claves foráneas, 3 triggers y 3 pacientes ficticios. La búsqueda de instrucciones `INSERT INTO`, `REPLACE INTO` y `VALUES` no mostró coincidencias en el archivo de estructura.

**Estado:** Aprobado.

**Responsable:** Kimberly.

**Observación:** La revisión realizada permitió verificar la importación y las instrucciones buscadas; no constituye una auditoría exhaustiva de información sensible.

## 4. Incidencias identificadas y seguimiento

| Código | Área evaluada | Resultado de seguimiento |
|---|---|---|
| INC-01 | Acceso al módulo de Pacientes | Corregido y validado |
| INC-02 | Acceso al módulo de Pagos | Corregido y validado |
| INC-03 | Movimientos de inventario | Validado satisfactoriamente |
| INC-04 | Asociación de proveedores | Validado satisfactoriamente |
| INC-05 | Estados de pacientes | Configuración y registro verificados |
| INC-06 | Estados de citas | Configuración y registro verificados |
| INC-07 | Horarios médicos | Configuración verificada |
| INC-08 | Métodos de pago | Configuración verificada |
| INC-09 | Filtro de consultas | Interfaz verificada; sin consultas elegibles para probar el filtrado |
| INC-10 | Edición de citas | Persistencia del motivo verificada; incidencia adicional documentada |

Las validaciones se realizaron en el entorno local utilizando información ficticia. Los resultados documentados corresponden a los escenarios ejecutados durante el proceso de control de calidad.

## 5. Observaciones generales

Durante las pruebas se verificó la importación de la estructura de la base de datos, sus relaciones y triggers, así como la inserción de registros ficticios para comprobar su funcionamiento.

En el módulo de Inventario se validó el registro de productos y la actualización de existencias mediante entradas y salidas. También se comprobó la visualización de los movimientos en el Kardex.

En el módulo de Pacientes se verificó el acceso al listado, el registro básico y la consulta de fichas individuales.

En Citas se comprobó el registro, la visualización de detalles y la persistencia del motivo modificado después de actualizar la página.

En Pagos se validó el acceso al módulo, la apertura del formulario y la disponibilidad de los métodos de pago configurados en MySQL. La prueba del filtro de consultas se realizó con los registros disponibles en ese momento.

## 6. Conclusión de QA

Las pruebas realizadas permitieron verificar satisfactoriamente diferentes funciones de C&C Dental Studio, principalmente en los módulos de Pacientes, Citas, Inventario, Pagos y Base de Datos.

Se comprobó la correcta importación de la estructura SQL, la integridad de las relaciones principales y el uso de información ficticia para ejecutar las pruebas.

Asimismo, se documentaron los procedimientos, resultados y observaciones de cada caso, proporcionando evidencia del trabajo realizado en el área de Base de Datos y Control de Calidad.

La documentación generada permite presentar de manera organizada las validaciones realizadas y facilita su revisión durante la integración final del proyecto.

**Responsable:** Kimberly  
**Área:** Base de Datos y Control de Calidad  
**Resultado general:** Pruebas funcionales y de base de datos realizadas y documentadas conforme a los escenarios evaluados.