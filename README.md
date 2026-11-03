# C&C Dental Studio

## Proyecto Final – Desarrollo Web

Sistema web para la gestión administrativa y clínica de una clínica dental, desarrollado como proyecto final del curso de Desarrollo Web.

El sistema permite gestionar pacientes, citas, consultas, tratamientos, inventario, pagos, usuarios y permisos, de acuerdo con los módulos implementados.


## Tecnologías utilizadas

- Node.js
- Express
- MySQL 8.0
- EJS
- HTML, CSS y JavaScript

## Base de datos

La base de datos del proyecto contiene 56 tablas, 70 referencias de claves foráneas y 3 triggers.

En la carpeta `database` se encuentran los siguientes archivos:

- `clinica_dental_final_qa_estructura.sql`: estructura de la base de datos sin registros.
- `clinica_dental_final_qa.sql`: script de creación de la base de datos original, incluyendo sus tablas, relaciones y triggers.
- `clinica_dental_validacion_final.sql`: estructura utilizada para comprobar la importación en un entorno limpio.
- `datos_ficticios_entrega.sql`: datos ficticios para las pruebas de pacientes.
- `Diagrama_ER_Clinica_Dental_Actualizado.png`: diagrama entidad-relación actualizado.
- `inventario_tablas.md`: inventario de las tablas de la base de datos.

## Importación de la base de datos

1. Abrir MySQL Workbench.
2. Conectarse al servidor MySQL.
3. Abrir el archivo `database/clinica_dental_validacion_final.sql`.
4. Ejecutar el script completo para crear la base de datos `clinica_dental_validacion_final`.
5. Abrir el archivo `database/datos_ficticios_entrega.sql`.
6. Ejecutarlo para registrar los datos ficticios.
7. Verificar que las tablas y los registros se hayan importado correctamente.

**Importante:** La base de datos de validación contiene datos ficticios limitados. No incluye necesariamente todos los registros de configuración, usuarios y permisos requeridos para utilizar todos los módulos del sistema web.

## Ejecución del sistema

1. Tener instalados Node.js y MySQL.
2. Abrir la carpeta de la aplicación web en Visual Studio Code.
3. Instalar las dependencias del proyecto con `npm install`.
4. Configurar la conexión a MySQL según las variables de entorno utilizadas por la aplicación.
5. Iniciar el servidor con el comando de arranque definido en el proyecto.
6. Abrir la dirección local indicada por el servidor.

**Nota:** Para ejecutar la aplicación es necesario configurar correctamente la conexión a la base de datos. La importación de la estructura y los datos ficticios, por sí sola, no garantiza el funcionamiento completo de todos los módulos.

## Pruebas y documentación

En la carpeta `QA` se encuentran los documentos y evidencias correspondientes a las pruebas realizadas:

- `casos_prueba.md`: registro de casos de prueba y resultados.
- `incidencias.md`: incidencias identificadas durante la verificación.
- Capturas de pantalla que documentan las pruebas realizadas.

Se verificaron la importación de la estructura SQL, las relaciones de claves foráneas, los triggers, los registros ficticios y determinadas funcionalidades del sistema web.

Las incidencias pendientes deben consultarse en la documentación de QA.

## Alcance de la validación

Las pruebas documentadas corresponden a las funcionalidades verificadas durante el desarrollo. No representan una certificación de que todos los módulos estén libres de errores.