# C&C Dental Studio
## Registro de incidencias y resultados de validación

**Área:** Base de Datos y Control de Calidad (QA)  
**Entorno:** Aplicación web y base de datos MySQL

### INC-01 – Validación del módulo de Pacientes

**Módulo:** Pacientes.

**Objetivo:** Verificar el acceso al listado de pacientes y la consulta de sus fichas individuales.

**Resultado:** Se comprobó el funcionamiento del módulo mediante la visualización del listado de pacientes y el acceso a la ficha individual de CARLOS PRUEBA QA.

**Estado:** Corregida y validada.

**Evidencia:** Capturas del listado y de la ficha individual del paciente.

**Observación:** Las funciones de acceso y consulta se ejecutaron satisfactoriamente durante las pruebas.

### INC-02 – Validación del módulo de Pagos

**Módulo:** Pagos.

**Objetivo:** Comprobar el acceso y la visualización de las herramientas de gestión de pagos.

**Resultado:** Se ingresó correctamente al módulo y se verificó la visualización del resumen de pagos, los filtros de búsqueda y el listado de registros.

**Estado:** Acceso corregido y validado.

**Evidencia:** Captura del módulo de Pagos en funcionamiento.

**Observación:** La validación realizada corresponde al acceso y a la visualización de los componentes del módulo. El registro de pagos y la actualización de saldos no formaron parte de esta comprobación.

### INC-03 – Validación de movimientos de inventario

**Módulo:** Inventario.

**Objetivo:** Verificar el registro de entradas y salidas de productos, la actualización de existencias y la clasificación de movimientos en el Kardex.

**Datos utilizados:** Producto Prueba QA, una entrada de 10 unidades y dos salidas de 1 y 4 unidades.

**Resultado:** El sistema registró correctamente 10 unidades de entrada y 5 unidades de salida, obteniendo un stock final de 5 unidades. El Kardex reflejó un movimiento de entrada y dos movimientos de salida.

**Estado:** Corregida y validada.

**Evidencia:** Capturas del producto, los movimientos y el Kardex.

**Observación:** Los resultados fueron satisfactorios utilizando datos ficticios en el entorno de pruebas.

### INC-04 – Verificación de proveedor asociado al producto

**Módulo:** Inventario.

**Objetivo:** Comprobar la asociación de proveedores con los productos registrados.

**Datos utilizados:** Distribuidora Dental QA y Producto Prueba QA.

**Resultado:** Se registró un proveedor activo y se seleccionó al crear el producto. Posteriormente, se comprobó que la información del proveedor aparecía correctamente en la tarjeta del producto.

**Estado:** Validada satisfactoriamente.

**Evidencia:** Capturas del proveedor, formulario de registro y tarjeta del producto.

**Observación:** La asociación entre el proveedor y el producto funcionó correctamente con los datos utilizados.

### INC-05 – Validación del estado de pacientes

**Módulo:** Pacientes y base de datos.

**Objetivo:** Comprobar que el registro de pacientes utilice correctamente los estados configurados en la base de datos.

**Resultado:** Se completó la configuración del estado correspondiente y se registró satisfactoriamente un paciente ficticio, respetando las relaciones establecidas en la base de datos.

**Estado:** Corregida y validada en el entorno de pruebas.

**Observación:** La prueba permitió comprobar el funcionamiento del registro de pacientes con los datos de configuración utilizados.

### INC-06 – Validación del registro de citas

**Módulo:** Citas y base de datos.

**Objetivo:** Verificar el registro de citas y la conservación de la información almacenada.

**Resultado:** Se configuró el estado Pendiente y se registró correctamente la cita #APT005. Posteriormente, se actualizó la página y se comprobó que la cita permanecía almacenada.

**Estado:** Corregida y validada.

**Evidencia:** `QA_Registro_Cita_Exitoso.png`.

**Observación:** Se verificó satisfactoriamente el registro y la persistencia de la cita utilizando los datos de prueba.

### INC-07 – Configuración de horarios médicos

**Módulo:** Citas.

**Objetivo:** Comprobar la disponibilidad de horarios para programar citas médicas.

**Resultado:** Se configuró el horario correspondiente al miércoles para el doctor de prueba. Después de realizar esta configuración, el sistema permitió continuar con el registro de la cita.

**Estado:** Corregida y validada.

**Observación:** La prueba confirmó la importancia de mantener configurados los horarios de atención de cada doctor.

### INC-08 – Configuración de métodos de pago

**Módulo:** Pagos y base de datos.

**Objetivo:** Verificar la disponibilidad de métodos de pago en la aplicación.

**Resultado:** Se registraron los métodos Efectivo, Transferencia y Tarjeta. Posteriormente, se comprobó que las tres opciones aparecían correctamente en el sistema.

**Estado:** Corregida y validada.

**Observación:** Se verificó la disponibilidad de los métodos de pago configurados en el entorno de pruebas.

### INC-09 – Verificación del filtro de consultas en Pagos

**Módulo:** Pagos.

**Objetivo:** Revisar las opciones disponibles en el filtro de consultas.

**Resultado:** Se comprobó que el filtro se despliega correctamente y presenta la opción «Todas». Durante la revisión no se encontraron consultas disponibles para realizar una comparación entre diferentes opciones.

**Estado:** Verificación de interfaz realizada; comportamiento con consultas registradas no comprobado.

**Observación:** El resultado corresponde a las condiciones y registros disponibles durante la prueba. No se confirmó un defecto de funcionamiento del filtro.

### INC-10 – Validación de cambios en una cita

**Módulo:** Citas.

**Objetivo:** Verificar la modificación y conservación de la información de una cita registrada.

**Datos utilizados:** Cita #APT005.

**Resultado:** Se modificó el motivo de la cita y se comprobó que la información permanecía guardada después de actualizar la página. En una prueba posterior de modificación de fecha y hora, la aplicación presentó una respuesta 404 en la ruta de edición.

**Estado:** Persistencia del motivo validada; modificación de fecha y hora con incidencia identificada.

**Observación:** La prueba confirmó el almacenamiento correcto del motivo de la cita. La actualización de otros campos requiere revisar la ruta utilizada por el sistema.

---

## Conclusión

Las pruebas realizadas permitieron comprobar el funcionamiento de diferentes operaciones de C&C Dental Studio, incluyendo la gestión de pacientes, movimientos de inventario, configuración de proveedores, registro de citas y visualización de métodos de pago.

Se verificaron resultados satisfactorios mediante el uso de datos ficticios y se documentaron las observaciones correspondientes a los escenarios evaluados.

La información recopilada constituye evidencia del proceso de control de calidad y sirve como referencia para la revisión técnica e integración del proyecto.

**Responsable:** Kimberly  
**Área:** Base de Datos y Control de Calidad (QA)