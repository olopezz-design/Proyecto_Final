
# C&C Dental Studio
## Registro de casos de prueba – QA

**Área:** Base de Datos y Control de Calidad  
**Entorno:** Aplicación web C&C Dental Studio y MySQL  
**Responsable de QA:** Kimberly  
**Fecha de revisión:** 03/11/2026

## 1. Objetivo

Verificar el funcionamiento de los módulos principales de C&C Dental Studio, comprobar la integridad de la base de datos y documentar los resultados de las pruebas realizadas. Se utilizaron datos ficticios para evitar el uso de información real de pacientes.

## 2. Resumen de casos de prueba

| Código | Prueba realizada | Resultado |
|---|---|---|
| CP-01 | Inicio de sesión del administrador | Aprobado |
| CP-02 | Navegación al módulo de citas | Aprobado |
| CP-03 | Registro de producto en inventario | Aprobado |
| CP-04 | Entrada de 10 unidades al inventario | Aprobado |
| CP-05 | Salida de 5 unidades del inventario | Aprobado |
| CP-06 | Acceso al módulo de pacientes | Aprobado después de corrección |
| CP-07 | Acceso al módulo de pagos | Aprobado después de corrección |
| CP-08 | Importación de 56 tablas en una base nueva | Aprobado |
| CP-09 | Verificación de 70 referencias de claves foráneas | Aprobado |
| CP-10 | Verificación de 3 triggers | Aprobado |
| CP-11 | Importación de datos ficticios en una base limpia | Aprobado |
| CP-12 | Registro de tres pacientes ficticios mediante SQL | Aprobado |
| CP-13 | Verificación de relaciones de pacientes | Aprobado |
| CP-14 | Registro y persistencia de citas | Aprobado |
| CP-15 | Visualización de detalles de una cita | Aprobado |
| CP-16 | Edición de una cita | Pendiente de confirmar persistencia |
| CP-17 | Apertura del formulario Nuevo pago | Aprobado |
| CP-18 | Registro y visualización de métodos de pago | Aprobado |
| CP-19 | Filtro de consultas en pagos | Pendiente de verificación |

## 3. Detalle de los casos de prueba

### CP-01. Inicio de sesión del administrador

**Módulo:** Autenticación.

**Objetivo:** Verificar que el administrador pueda ingresar al sistema.

**Pasos realizados:**
1. Abrir la aplicación web.
2. Ingresar las credenciales del usuario de prueba.
3. Acceder al panel administrativo.

**Resultado esperado:** Acceso al panel administrativo.

**Resultado obtenido:** Se ingresó correctamente al sistema.

**Estado:** Aprobado.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** No aplica.

### CP-02. Navegación al módulo de citas

**Módulo:** Citas.

**Objetivo:** Comprobar que el administrador pueda acceder al calendario de citas.

**Pasos realizados:**
1. Iniciar sesión.
2. Seleccionar Citas en el menú.
3. Revisar la visualización del calendario.

**Resultado esperado:** Mostrar el calendario y las opciones de gestión.

**Resultado obtenido:** El calendario se abrió correctamente.

**Estado:** Aprobado.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** No aplica.

### CP-03. Registro de producto en inventario

**Módulo:** Inventario.

**Objetivo:** Verificar el registro de un producto ficticio.

**Datos utilizados:** Producto Prueba QA, marca Marca Dental QA, categoría Insumos Dentales QA, precio Q25.00 y stock mínimo de 5 unidades.

**Pasos realizados:**
1. Abrir Inventario y seleccionar Productos.
2. Ingresar los datos del producto.
3. Seleccionar la marca, categoría y proveedor.
4. Guardar y consultar el producto registrado.

**Resultado esperado:** Registrar y visualizar el producto.

**Resultado obtenido:** El producto se registró correctamente y mostró su marca, categoría, precio y proveedor.

**Estado:** Aprobado.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** No aplica.

### CP-04. Entrada de inventario

**Módulo:** Inventario.

**Objetivo:** Verificar el aumento del stock mediante una entrada manual.

**Datos utilizados:** Producto Prueba QA, entrada de 10 unidades.

**Pasos realizados:**
1. Abrir el producto registrado.
2. Seleccionar Entrada.
3. Registrar 10 unidades.
4. Guardar y revisar el stock.

**Resultado esperado:** Incrementar el stock de 0 a 10 unidades.

**Resultado obtenido:** El stock aumentó a 10 unidades y se registró la entrada en el historial.

**Estado:** Aprobado.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** No aplica.

### CP-05. Salida de inventario

**Módulo:** Inventario.

**Objetivo:** Verificar la reducción del stock y el registro de movimientos.

**Datos utilizados:** Producto Prueba QA, salida total de 5 unidades.

**Pasos realizados:**
1. Registrar una salida inicial de 1 unidad.
2. Registrar una salida adicional de 4 unidades.
3. Revisar el stock y el historial.
4. Consultar el Kardex.

**Resultado esperado:** Reducir el stock de 10 a 5 unidades y conservar los movimientos.

**Resultado obtenido:** El stock quedó en 5 unidades. El historial y Kardex mostraron una entrada y dos salidas, con las cantidades correctas.

**Estado:** Aprobado.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** No aplica.

**Observación:** Se comprobó la clasificación de stock bajo al alcanzar el mínimo configurado.

### CP-06. Acceso al módulo de pacientes

**Módulo:** Pacientes.

**Objetivo:** Comprobar el acceso y funcionamiento básico del módulo de pacientes.

**Pasos realizados:**
1. Acceder al módulo Pacientes.
2. Revisar el formulario y los datos requeridos.
3. Realizar una prueba de registro con información ficticia.

**Resultado esperado:** Permitir el acceso y registro de pacientes.

**Resultado obtenido:** Inicialmente se presentaron errores de acceso y una restricción de clave foránea relacionada con el estado del paciente. Después de completar los datos de configuración requeridos, se consiguió registrar y consultar un paciente ficticio.

**Estado:** Aprobado después de corrección para acceso y registro básico.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** Pendiente de asignación formal; se corrigieron datos de configuración durante QA.

### CP-07. Acceso al módulo de pagos

**Módulo:** Pagos.

**Objetivo:** Verificar que el administrador pueda acceder a la pantalla de pagos.

**Pasos realizados:**
1. Seleccionar Pagos en el menú administrativo.
2. Revisar el resumen de pagos.
3. Comprobar la visualización de filtros y listado.

**Resultado esperado:** Mostrar el módulo sin errores de navegación.

**Resultado obtenido:** El módulo abrió correctamente, sin el error 404 observado anteriormente.

**Estado:** Aprobado después de corrección para acceso y visualización.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** Pendiente de asignación formal.

**Observación:** Esta prueba no confirma el registro de un pago.

### CP-08. Importación de la estructura SQL

**Módulo:** Base de datos.

**Objetivo:** Comprobar que la estructura SQL pueda importarse en un entorno limpio.

**Datos utilizados:** Archivo clinica_dental_validacion_final.sql.

**Pasos realizados:**
1. Preparar una base de datos de validación.
2. Abrir el archivo SQL en MySQL Workbench.
3. Ejecutar el script completo.
4. Consultar la cantidad de tablas importadas.

**Resultado esperado:** Importación correcta de 56 tablas.

**Resultado obtenido:** Se importaron correctamente las 56 tablas.

**Estado:** Aprobado.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** No aplica.

**Evidencia:** Captura de importación y consulta de verificación.

### CP-09. Verificación de claves foráneas

**Módulo:** Base de datos.

**Objetivo:** Comprobar que las relaciones se conservaron después de importar la estructura SQL.

**Datos utilizados:** Base de datos clinica_dental_validacion_final.

**Pasos realizados:**
1. Importar la estructura SQL.
2. Consultar information_schema.KEY_COLUMN_USAGE.
3. Contar las referencias de claves foráneas.

**Resultado esperado:** Encontrar 70 referencias.

**Resultado obtenido:** Se identificaron 70 referencias de claves foráneas.

**Estado:** Aprobado.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** No aplica.

**Evidencia:** Consulta SQL y resultado de las relaciones.

### CP-10. Verificación de triggers

**Módulo:** Base de datos.

**Objetivo:** Comprobar que los triggers se conservaron después de importar la estructura.

**Datos utilizados:** Base de datos clinica_dental_validacion_final.

**Pasos realizados:**
1. Importar la estructura SQL.
2. Consultar information_schema.TRIGGERS.
3. Verificar la cantidad de triggers.

**Resultado esperado:** Encontrar 3 triggers.

**Resultado obtenido:** Se encontraron 3 triggers.

**Estado:** Aprobado.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** No aplica.

**Evidencia:** Consulta SQL y resultado de los triggers.

### CP-11. Importación de datos ficticios

**Módulo:** Base de datos.

**Objetivo:** Comprobar la importación de datos ficticios sin utilizar información real de pacientes.

**Datos utilizados:** Archivo datos_ficticios_entrega.sql

**Pasos realizados:**
1. Importar la estructura SQL.
2. Ejecutar el archivo de datos ficticios.
3. Consultar los registros insertados.
4. Verificar que los datos sean ficticios.

**Resultado esperado:** Registrar 2 géneros, 2 tipos de paciente, 1 estado y 3 pacientes.

**Resultado obtenido:** Se comprobaron las cantidades esperadas.

**Estado:** Aprobado.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** No aplica.

**Evidencia:** QA/Validacion_SQL_Datos_Ficticios.png.

### CP-12. Registro de pacientes ficticios mediante SQL

**Módulo:** Pacientes y base de datos.

**Objetivo:** Verificar la inserción de pacientes ficticios respetando las relaciones.

**Datos utilizados:** Carlos Prueba QA, María Prueba QA y Andrea Prueba QA.

**Pasos realizados:**
1. Preparar los registros ficticios.
2. Identificar las referencias de género, tipo de paciente y estado.
3. Ejecutar las inserciones SQL.
4. Consultar los registros almacenados.

**Resultado esperado:** Registrar tres pacientes correctamente.

**Resultado obtenido:** Se registraron los tres pacientes sin errores de inserción.

**Estado:** Aprobado.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** No aplica.

**Evidencia:** Captura de MySQL Workbench.

**Observación:** Esta prueba corresponde a SQL y no al formulario web.

### CP-13. Verificación de relaciones de pacientes

**Módulo:** Pacientes y base de datos.

**Objetivo:** Comprobar la relación de los pacientes con género, tipo y estado.

**Datos utilizados:** Tres pacientes ficticios.

**Pasos realizados:**
1. Registrar los pacientes.
2. Ejecutar una consulta con INNER JOIN.
3. Relacionar paciente, genero, tipopaciente y estadopaciente.
4. Revisar los resultados.

**Resultado esperado:** Mostrar los pacientes con sus relaciones correctas.

**Resultado obtenido:**
- Carlos: Masculino, Particular, Activo.
- María: Femenino, Seguro, Activo.
- Andrea: Femenino, Particular, Activo.

**Estado:** Aprobado.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** No aplica.

**Evidencia:** Captura de MySQL Workbench.

### CP-14. Registro y persistencia de citas

**Módulo:** Citas.

**Objetivo:** Verificar que una cita pueda registrarse y mantenerse guardada después de actualizar la página.

**Datos utilizados:** Carlos Doctor QA, paciente ficticio, fecha 04/11/2026 y hora 08:30.

**Pasos realizados:**
1. Seleccionar doctor y horario disponible.
2. Seleccionar paciente.
3. Completar el motivo.
4. Guardar la cita.
5. Actualizar la página y verificar el registro.

**Resultado esperado:** Registrar y conservar la cita.

**Resultado obtenido:** Se registró la cita #APT005 con estado Pendiente y permaneció visible después de actualizar la página.

**Estado:** Aprobado después de corregir la ausencia del estado de cita en la base de datos.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** Pendiente de asignación formal; se completaron datos de configuración durante QA.

**Evidencias:** QA_Registro_Cita_Exitoso.png y QA_Persistencia_Cita.png.

### CP-15. Visualización de detalles de una cita

**Módulo:** Citas.

**Objetivo:** Verificar que el sistema muestre los datos de una cita registrada.

**Datos utilizados:** Cita #APT005.

**Pasos realizados:**
1. Abrir el listado de citas.
2. Localizar la cita #APT005.
3. Seleccionar Detalles.
4. Revisar los datos presentados.

**Resultado esperado:** Mostrar paciente, doctor, fecha, hora, estado, motivo y notas.

**Resultado obtenido:** Se mostraron correctamente los datos de la cita registrada.

**Estado:** Aprobado.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** No aplica.

**Evidencia:** QA_Detalle_Cita.png.

### CP-16. Edición de una cita

**Módulo:** Citas.

**Objetivo:** Comprobar que el sistema permita editar una cita y conservar los cambios.

**Datos utilizados:** Cita #APT005.

**Pasos realizados:**
1. Abrir la opción Editar.
2. Revisar los datos cargados.
3. Modificar el motivo de la cita.
4. Seleccionar Guardar cambios.

**Resultado esperado:** Conservar el nuevo motivo después de guardar.

**Resultado obtenido:** Se comprobó que la pantalla de edición abre y carga los datos. No se confirmó posteriormente que el nuevo motivo quedara almacenado.

**Estado:** Pendiente de confirmar persistencia.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** Por asignar si se confirma un fallo.

### CP-17. Apertura del formulario Nuevo pago

**Módulo:** Pagos.

**Objetivo:** Comprobar que el formulario de registro de pagos abra correctamente.

**Pasos realizados:**
1. Ingresar al módulo Pagos.
2. Seleccionar Nuevo pago.
3. Revisar los campos disponibles.

**Resultado esperado:** Mostrar el formulario de registro.

**Resultado obtenido:** Se visualizaron consulta asociada, fecha, método de pago, forma de pago, cotización y evidencia de pago.

**Estado:** Aprobado.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** No aplica.

**Evidencia:** QA_Formulario_Nuevo_Pago.png.

**Observación:** No se realizó un pago completo de prueba.

### CP-18. Registro y visualización de métodos de pago

**Módulo:** Pagos y base de datos.

**Objetivo:** Verificar que los métodos registrados en MySQL estén disponibles en la aplicación.

**Datos utilizados:** Efectivo, Transferencia y Tarjeta.

**Pasos realizados:**
1. Consultar la tabla metodo_pago.
2. Identificar que inicialmente estaba vacía.
3. Registrar tres métodos de prueba.
4. Actualizar el módulo Pagos.
5. Revisar las opciones del filtro Método.

**Resultado esperado:** Mostrar los tres métodos registrados.

**Resultado obtenido:** Los tres métodos se registraron en MySQL y posteriormente estuvieron disponibles en la aplicación.

**Estado:** Aprobado.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** No aplica; se completaron datos de configuración.

### CP-19. Filtro de consultas en pagos

**Módulo:** Pagos.

**Objetivo:** Verificar las opciones disponibles en el filtro Consulta.

**Pasos realizados:**
1. Abrir el módulo Pagos.
2. Desplegar el filtro Consulta.
3. Revisar las opciones disponibles.

**Resultado esperado:** Mostrar las consultas disponibles para filtrar, cuando corresponda.

**Resultado obtenido:** El filtro solamente mostró la opción Todas.

**Estado:** Pendiente de verificación.

**Responsable de la prueba:** Kimberly.

**Responsable de corrección:** Por asignar si se confirma una incidencia.

**Observación:** No se determinó si la ausencia de opciones se debe a falta de consultas elegibles o a un problema de carga.

## 4. Incidencias identificadas y seguimiento

| Código | Incidencia | Seguimiento | Estado |
|---|---|---|---|
| INC-01 | Error 404 al acceder a Pacientes | Se comprobó posteriormente el acceso y registro básico. | Corregida |
| INC-02 | Error 404 al acceder a Pagos | El módulo abrió correctamente en la revisión posterior. | Corregida |
| INC-03 | Inconsistencia en movimientos de inventario | Se validaron entradas, salidas y existencias mediante Kardex. | Corregida |
| INC-04 | Producto mostrado sin proveedor | Se configuró un proveedor ficticio y se verificó su visualización. | Corregida |
| INC-05 | Falta de estado válido al registrar pacientes | Se completó la configuración y se registró un paciente ficticio. | Corregida |
| INC-06 | Falta de estado válido al registrar citas | Se configuró el estado Pendiente y se registró la cita APT005. | Corregida |
| INC-07 | Falta de horarios para el doctor de prueba | Se configuró el horario del miércoles y se continuó con el registro. | Corregida |
| INC-08 | Falta de métodos de pago registrados | Se agregaron Efectivo, Transferencia y Tarjeta. | Corregida |
| INC-09 | Filtro de consultas en pagos sin opciones | Falta determinar si existen consultas elegibles o un problema de carga. | Pendiente |
| INC-10 | Persistencia de cambios al editar una cita | Falta comprobar que los cambios permanezcan guardados. | Pendiente |

**Nota:** Las correcciones corresponden al entorno local utilizado durante las pruebas. No se ha comprobado su incorporación a la versión final integrada del equipo.

## 5. Observaciones generales

Durante las pruebas se verificó la importación de la estructura de la base de datos, sus claves foráneas y triggers, además de la inserción de información ficticia.

En inventario se comprobó el registro de un producto, una entrada de 10 unidades y salidas acumuladas de 5 unidades. El stock final fue de 5 unidades y los movimientos aparecieron en el Kardex.

En citas se logró registrar una cita después de completar los datos necesarios del doctor, su horario y el estado de la cita. También se comprobó su persistencia y la visualización de detalles.

En pagos se confirmó el acceso al módulo, la apertura del formulario y la disponibilidad de tres métodos registrados en MySQL.

No se ha comprobado el proceso completo de cobro, la persistencia de la edición de citas ni todas las funcionalidades del sistema.

## 6. Conclusión de QA

Las pruebas realizadas permitieron validar operaciones básicas de C&C Dental Studio y detectar problemas relacionados con datos de configuración, relaciones de base de datos y navegación.

Se corrigieron varias incidencias en el entorno local y se obtuvieron resultados satisfactorios en las pruebas repetidas. Sin embargo, la validación no representa una aprobación completa del sistema.

Antes de la liberación definitiva, el equipo deberá confirmar las funcionalidades pendientes, integrar las correcciones y ejecutar nuevamente las pruebas principales sobre la versión final.

**Responsable del registro:** Kimberly  
**Área:** Base de Datos y Control de Calidad  
**Resultado general:** Validación parcial satisfactoria, con pruebas pendientes.
