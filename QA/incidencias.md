## INC-01 – Error al ingresar al módulo de Pacientes

- **Módulo:** Pacientes.
- **Resultado esperado:** Mostrar correctamente el listado de pacientes y permitir consultar sus fichas.
- **Resultado obtenido inicialmente:** El sistema mostraba un error 404.
- **Resultado de la nueva prueba:** El listado de pacientes y la ficha individual de CARLOS PRUEBA QA se abrieron correctamente, sin errores 404.
- **Estado:** Corregida y validada.
- **Responsable de la prueba:** Kimberly.
- **Evidencia:** Capturas del listado de pacientes y de la ficha individual.
- **Observación:** Se confirmó el acceso y la visualización; las demás operaciones del módulo requieren pruebas independientes.

## INC-02 – Error al ingresar al módulo de Pagos

- **Módulo:** Pagos.
- **Resultado esperado:** Mostrar correctamente la pantalla de gestión de pagos.
- **Resultado obtenido inicialmente:** El sistema mostraba un error 404.
- **Resultado de la nueva prueba:** El módulo de Pagos abrió correctamente y mostró el resumen, los filtros y el listado de pagos sin errores 404.
- **Estado:** Corregida y validada respecto al acceso al módulo.
- **Responsable de la prueba:** Kimberly.
- **Evidencia:** Captura del módulo de Pagos en funcionamiento.
- **Observación:** Queda pendiente comprobar el registro de pagos y la actualización de saldos mediante pruebas independientes.

## INC-03 – Inconsistencia en los movimientos de inventario

- **Módulo:** Inventario.
- **Resultado esperado:** Registrar correctamente las entradas y salidas, actualizar el stock y clasificar los movimientos en el Kardex.
- **Resultado obtenido inicialmente:** El resumen mostraba inconsistencias en las entradas y salidas.
- **Datos de la nueva prueba:** Producto Prueba QA, entrada de 10 unidades y dos salidas de 1 y 4 unidades.
- **Resultado de la nueva prueba:** El sistema registró correctamente 10 unidades de entrada, 5 unidades de salida y un stock final de 5 unidades. El Kardex mostró 1 movimiento de entrada y 2 movimientos de salida, correctamente clasificados.
- **Estado:** Corregida y validada en la nueva prueba.
- **Responsable de la prueba:** Kimberly.
- **Evidencia:** Capturas del producto, movimientos y Kardex.
- **Observación:** La validación corresponde al escenario probado con datos ficticios.

## INC-04 – Proveedor no mostrado en el producto

- **Módulo:** Inventario.
- **Resultado esperado:** Mostrar correctamente el proveedor seleccionado al registrar un producto.
- **Resultado obtenido inicialmente:** La tarjeta del producto mostraba el mensaje «Sin proveedor».
- **Datos de la nueva prueba:** Proveedor Distribuidora Dental QA y Producto Prueba QA.
- **Resultado de la nueva prueba:** Se registró un proveedor activo, se seleccionó al crear el producto y posteriormente se comprobó que aparece asociado en su tarjeta.
- **Estado:** Validada satisfactoriamente en la nueva prueba.
- **Responsable de la prueba:** Kimberly.
- **Evidencia:** Capturas del proveedor registrado, formulario de producto y tarjeta del producto.
- **Observación:** El problema inicial no se reprodujo con los nuevos datos ficticios. No se ha determinado si existía un defecto de código o si faltaban datos en el catálogo.

## INC-05 – Falta de estado válido al registrar pacientes

- **Módulo:** Pacientes y base de datos.
- **Resultado esperado:** Registrar pacientes correctamente.
- **Resultado obtenido inicialmente:** Se presentó una restricción de clave foránea relacionada con el estado del paciente.
- **Resultado de la nueva prueba:** Se completaron los datos de configuración y se logró registrar un paciente ficticio.
- **Estado:** Corregida y validada en el entorno de pruebas.
- **Responsable de la prueba:** Kimberly.
- **Observación:** Se debe confirmar que los datos de configuración estén incluidos en la versión final.


## INC-06 – Falta de estado válido al registrar citas

- **Módulo:** Citas y base de datos.
- **Resultado esperado:** Registrar correctamente una cita y conservarla en el sistema.
- **Resultado obtenido inicialmente:** No se podía completar el registro porque faltaba un estado de cita válido en la base de datos.
- **Resultado de la nueva prueba:** Se registró el estado Pendiente y posteriormente se creó correctamente la cita #APT005, que permaneció guardada después de actualizar la página.
- **Estado:** Corregida y validada en el entorno de pruebas.
- **Responsable de la prueba:** Kimberly.
- **Evidencia:** QA_Registro_Cita_Exitoso.png.
- **Observación:** Se debe confirmar que el estado Pendiente esté incluido en los datos de configuración de la versión final.

## INC-07 – Falta de horarios para el doctor de prueba

- **Módulo:** Citas.
- **Resultado esperado:** Mostrar horarios disponibles para poder registrar una cita.
- **Resultado obtenido inicialmente:** No aparecían horarios disponibles para el doctor seleccionado.
- **Resultado de la nueva prueba:** Se configuró el horario del miércoles para el doctor de prueba y posteriormente se pudo continuar con el registro de la cita.
- **Estado:** Corregida y validada en el entorno de pruebas.
- **Responsable de la prueba:** Kimberly.
- **Observación:** Es necesario que los doctores tengan sus horarios configurados para permitir la programación de citas.

## INC-08 – Falta de métodos de pago registrados

- **Módulo:** Pagos y base de datos.
- **Resultado esperado:** Mostrar los métodos de pago disponibles en el sistema.
- **Resultado obtenido inicialmente:** La tabla `metodo_pago` estaba vacía y no aparecían opciones para seleccionar.
- **Resultado de la nueva prueba:** Se registraron tres métodos de pago: Efectivo, Transferencia y Tarjeta. Posteriormente, se comprobó que aparecían correctamente en la aplicación.
- **Estado:** Corregida y validada en el entorno de pruebas.
- **Responsable de la prueba:** Kimberly.
- **Observación:** Se debe verificar que los métodos de pago estén configurados en la versión final del sistema.

## INC-09 – Filtro de consultas en pagos sin opciones

- **Módulo:** Pagos.
- **Resultado esperado:** Mostrar las consultas disponibles para filtrar los pagos, cuando existan registros correspondientes.
- **Resultado obtenido:** Al desplegar el filtro Consulta, únicamente apareció la opción «Todas».
- **Estado:** Pendiente de verificación.
- **Responsable de la prueba:** Kimberly.
- **Observación:** Todavía no se ha determinado si faltan consultas registradas o si existe un problema en la carga de información. Se requiere realizar una prueba con consultas disponibles antes de clasificarlo como error.

## INC-10 – Persistencia de cambios al editar una cita

- **Módulo:** Citas.
- **Resultado esperado:** Permitir modificar una cita y conservar los cambios después de guardar.
- **Resultado obtenido:** Se comprobó que el formulario de edición abre correctamente y muestra los datos de la cita #APT005. Sin embargo, no se confirmó que los cambios realizados permanecieran guardados.
- **Estado:** Pendiente de verificación.
- **Responsable de la prueba:** Kimberly.
- **Observación:** Se debe modificar el motivo de una cita de prueba, guardar los cambios y actualizar la página para comprobar que la información se conserve.