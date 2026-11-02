SELECT COUNT(*) AS total_tablas
FROM information_schema.tables
WHERE table_schema = 'clinica_dental'
AND table_type = 'BASE TABLE';



SELECT COUNT(*) AS Total_Tablas
FROM information_schema.tables
WHERE table_schema = 'clinica_dental_qa'
AND table_type = 'BASE TABLE';

SELECT 'paciente' AS Tabla, COUNT(*) AS Registros
FROM clinica_dental_qa.paciente
UNION ALL
SELECT 'usuario', COUNT(*)
FROM clinica_dental_qa.usuario
UNION ALL
SELECT 'producto', COUNT(*)
FROM clinica_dental_qa.producto;

SELECT
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = 'clinica_dental'
     AND table_type = 'BASE TABLE') AS Base_Original,

    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = 'clinica_dental_qa'
     AND table_type = 'BASE TABLE') AS Base_Pruebas;
     
     SELECT
    TABLE_NAME AS Tabla
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'clinica_dental_qa'
  AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
     
     
   SHOW CREATE TABLE clinica_dental_qa.genero;  
   
   DESCRIBE clinica_dental_qa.genero;
     
     INSERT INTO clinica_dental_qa.genero (nombre, descripcion)
VALUES
('Masculino', 'Registro de prueba'),
('Femenino', 'Registro de prueba'),
('Otro', 'Registro de prueba');
  
  DESCRIBE clinica_dental_qa.estadopaciente;

     INSERT INTO clinica_dental_qa.estadopaciente (nombre, descripcion)
VALUES
('Activo', 'Paciente activo en el sistema de pruebas'),
('Inactivo', 'Paciente inactivo en el sistema de pruebas');
     
SELECT * FROM clinica_dental_qa.estadopaciente;

DESCRIBE clinica_dental_qa.categoria;


INSERT INTO clinica_dental_qa.categoria (nombre, descripcion)
VALUES
('Materiales odontológicos QA', 'Materiales utilizados en procedimientos dentales de prueba'),
('Instrumental dental QA', 'Instrumentos para procedimientos odontológicos de prueba'),
('Productos de higiene oral QA', 'Productos de cuidado e higiene bucal de prueba');


SELECT * FROM clinica_dental_qa.categoria;

DESCRIBE clinica_dental_qa.marca;


INSERT INTO clinica_dental_qa.marca (nombre, descripcion)
VALUES
('Marca Dental QA', 'Marca ficticia para materiales odontológicos'),
('Instrumental Test QA', 'Marca ficticia para instrumental dental'),
('Higiene Oral QA', 'Marca ficticia para productos de higiene bucal');


SELECT * FROM clinica_dental_qa.marca;

DESCRIBE clinica_dental_qa.proveedor;

INSERT INTO clinica_dental_qa.proveedor
(nombre, contacto, email, telefono, direccion)
VALUES
('Proveedor Dental QA', 'Contacto de prueba',
 'proveedor1@example.com', '00000001', 'Dirección ficticia 1'),
('Distribuidora Odontológica QA', 'Encargado de prueba',
 'proveedor2@example.com', '00000002', 'Dirección ficticia 2'),
('Suministros Clínicos QA', 'Representante de prueba',
 'proveedor3@example.com', '00000003', 'Dirección ficticia 3');

SELECT * FROM clinica_dental_qa.proveedor;

DESCRIBE clinica_dental_qa.producto;

SELECT
    COLUMN_NAME AS Columna,
    REFERENCED_TABLE_NAME AS Tabla_Relacionada,
    REFERENCED_COLUMN_NAME AS Columna_Relacionada
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'clinica_dental_qa'
  AND TABLE_NAME = 'producto'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

INSERT INTO clinica_dental_qa.producto
(nombre, descripcion, precio, stock, fecha_expiracion, marca_id, categoria_id)
VALUES
('Guantes de nitrilo QA', 'Caja de guantes para pruebas', 45.00, 20, '2027-12-31', 2, 2),
('Espejo dental QA', 'Instrumental odontologico de prueba', 35.00, 15, NULL, 3, 3),
('Enjuague bucal QA', 'Producto de higiene oral de prueba', 28.50, 30, '2027-10-31', 4, 4);


SELECT * FROM clinica_dental_qa.producto;

SELECT
    p.id,
    p.nombre AS Producto,
    c.nombre AS Categoria,
    m.nombre AS Marca,
    p.precio,
    p.stock
FROM clinica_dental_qa.producto p
INNER JOIN clinica_dental_qa.categoria c
    ON p.categoria_id = c.idcategoria
INNER JOIN clinica_dental_qa.marca m
    ON p.marca_id = m.id
ORDER BY p.id;


DESCRIBE clinica_dental_qa.paciente;

DESCRIBE clinica_dental_qa.tipopaciente;

INSERT INTO clinica_dental_qa.tipopaciente
(nombre, descripcion)
VALUES
('Particular QA', 'Paciente particular de prueba'),
('Seguro QA', 'Paciente con seguro de prueba');

SELECT * FROM clinica_dental_qa.tipopaciente;

SELECT
    COLUMN_NAME AS Columna,
    REFERENCED_TABLE_NAME AS Tabla_Relacionada,
    REFERENCED_COLUMN_NAME AS Columna_Relacionada
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'clinica_dental_qa'
  AND TABLE_NAME = 'paciente'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

INSERT INTO clinica_dental_qa.paciente
(nombre, apellido, telefono, email, edad,
 tipoPaciente_idtipoPaciente, genero_idGenero, idestado)
VALUES
('Carlos', 'Prueba QA', '00001001',
 'carlos.qa@example.com', 30, 7, 6, 2),

('Maria', 'Prueba QA', '00001002',
 'maria.qa@example.com', 25, 8, 7, 2),

('Andrea', 'Prueba QA', '00001003',
 'andrea.qa@example.com', 35, 7, 7, 3);


SELECT
    idPaciente,
    nombre,
    apellido,
    telefono,
    email,
    edad
FROM clinica_dental_qa.paciente;

SELECT
    p.idPaciente,
    p.nombre,
    p.apellido,
    g.nombre AS Genero,
    t.nombre AS Tipo_Paciente,
    e.nombre AS Estado
FROM clinica_dental_qa.paciente p
INNER JOIN clinica_dental_qa.genero g
    ON p.genero_idGenero = g.idGenero
INNER JOIN clinica_dental_qa.tipopaciente t
    ON p.tipoPaciente_idtipoPaciente = t.idtipoPaciente
LEFT JOIN clinica_dental_qa.estadopaciente e
    ON p.idestado = e.idestado
ORDER BY p.idPaciente;







































