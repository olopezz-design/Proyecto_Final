-- C&C Dental Studio
-- Datos ficticios para la entrega final
-- Ejecutar después de importar la estructura SQL
-- No contiene información real de pacientes

USE clinica_dental_validacion_final;

-- Géneros
INSERT INTO genero (nombre, descripcion)
VALUES
('Masculino', 'Género masculino'),
('Femenino', 'Género femenino');

-- Tipos de paciente
INSERT INTO tipopaciente (nombre, descripcion)
VALUES
('Particular', 'Paciente que paga directamente sus servicios'),
('Seguro', 'Paciente atendido mediante una aseguradora');

-- Estados de paciente
INSERT INTO estadopaciente (nombre, descripcion)
VALUES
('Activo', 'Paciente activo en el sistema');

-- Pacientes ficticios para pruebas
-- Los identificadores se obtienen automáticamente

INSERT INTO paciente
(nombre, apellido, telefono, email, edad,
 tipoPaciente_idtipoPaciente, genero_idGenero, idestado)
VALUES
(
 'Carlos', 'Prueba QA', '00001001',
 'carlos.qa@example.com', 30,
 (SELECT idtipoPaciente FROM tipopaciente WHERE nombre = 'Particular' LIMIT 1),
 (SELECT idGenero FROM genero WHERE nombre = 'Masculino' LIMIT 1),
 (SELECT idestado FROM estadopaciente WHERE nombre = 'Activo' LIMIT 1)
),
(
 'Maria', 'Prueba QA', '00001002',
 'maria.qa@example.com', 25,
 (SELECT idtipoPaciente FROM tipopaciente WHERE nombre = 'Seguro' LIMIT 1),
 (SELECT idGenero FROM genero WHERE nombre = 'Femenino' LIMIT 1),
 (SELECT idestado FROM estadopaciente WHERE nombre = 'Activo' LIMIT 1)
),
(
 'Andrea', 'Prueba QA', '00001003',
 'andrea.qa@example.com', 35,
 (SELECT idtipoPaciente FROM tipopaciente WHERE nombre = 'Particular' LIMIT 1),
 (SELECT idGenero FROM genero WHERE nombre = 'Femenino' LIMIT 1),
 (SELECT idestado FROM estadopaciente WHERE nombre = 'Activo' LIMIT 1)
);