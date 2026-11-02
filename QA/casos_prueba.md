
# C&C Dental Studio
## Registro de casos de prueba – QA

**Área:** Base de Datos y Control de Calidad  
**Entorno:** Sistema web y MySQL  
**Responsable:** Área de QA

| Código | Prueba realizada | Resultado |
|---|---|---|
| CP-01 | Inicio de sesión del administrador | Aprobado |
| CP-02 | Navegación al módulo de citas | Aprobado |
| CP-03 | Registro de producto en inventario | Aprobado con observación |
| CP-04 | Entrada de 10 unidades al inventario | Parcial: inconsistencia en resumen |
| CP-05 | Salida de 5 unidades del inventario | Parcial: inconsistencia en resumen |
| CP-06 | Acceso al módulo de pacientes | No aprobado: error 404 |
| CP-07 | Acceso al módulo de pagos | No aprobado: error 404 |


## Incidencias identificadas

- El resumen de inventario presenta inconsistencias al clasificar entradas y salidas.
- Un producto registrado aparece con el mensaje "Sin proveedor".
- Los módulos de Pacientes y Pagos presentan errores 404 al acceder.

## Observaciones

Las pruebas permitieron comprobar operaciones básicas del sistema e identificar incidencias pendientes de corrección. Los resultados corresponden a las funcionalidades efectivamente verificadas y no representan una validación completa de todos los módulos.
