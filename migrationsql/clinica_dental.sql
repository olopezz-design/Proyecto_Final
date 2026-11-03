-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
-- -----------------------------------------------------
-- Schema clinica_dental
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema clinica_dental
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `clinica_dental` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci ;
USE `clinica_dental` ;

-- -----------------------------------------------------
-- Table `clinica_dental`.`estadousuario`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`estadousuario` (
  `idestadoUsuario` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(255) NOT NULL,
  `descripcion` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`idestadoUsuario`))
ENGINE = InnoDB
AUTO_INCREMENT = 3
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `clinica_dental`.`rol`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`rol` (
  `idrol` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`idrol`))
ENGINE = InnoDB
AUTO_INCREMENT = 4
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `clinica_dental`.`usuario`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`usuario` (
  `idusuario` INT NOT NULL AUTO_INCREMENT,
  `user` VARCHAR(100) NOT NULL,
  `password` VARCHAR(250) NOT NULL,
  `rol_idrol` INT NOT NULL,
  `estadoUsuario_idestadoUsuario` INT NOT NULL,
  PRIMARY KEY (`idusuario`),
  CONSTRAINT `fk_usuario_estado`
    FOREIGN KEY (`estadoUsuario_idestadoUsuario`)
    REFERENCES `clinica_dental`.`estadousuario` (`idestadoUsuario`),
  CONSTRAINT `fk_usuario_rol`
    FOREIGN KEY (`rol_idrol`)
    REFERENCES `clinica_dental`.`rol` (`idrol`))
ENGINE = InnoDB
AUTO_INCREMENT = 2
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_usuario_rol` ON `clinica_dental`.`usuario` (`rol_idrol` ASC) VISIBLE;

CREATE INDEX `idx_usuario_estado` ON `clinica_dental`.`usuario` (`estadoUsuario_idestadoUsuario` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`actividadsistema`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`actividadsistema` (
  `idactividadSistema` INT NOT NULL AUTO_INCREMENT,
  `registroInicial` DATETIME NOT NULL,
  `registroFinal` DATETIME NULL DEFAULT NULL,
  `usuario_idusuario` INT NOT NULL,
  PRIMARY KEY (`idactividadSistema`),
  CONSTRAINT `fk_actividad_usuario`
    FOREIGN KEY (`usuario_idusuario`)
    REFERENCES `clinica_dental`.`usuario` (`idusuario`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_actividad_usuario` ON `clinica_dental`.`actividadsistema` (`usuario_idusuario` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`categoria`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`categoria` (
  `idcategoria` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`idcategoria`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `clinica_dental`.`especialidad`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`especialidad` (
  `idespecialidad` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(255) NOT NULL,
  `descripcion` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`idespecialidad`))
ENGINE = InnoDB
AUTO_INCREMENT = 10
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `clinica_dental`.`genero`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`genero` (
  `idGenero` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  `descripcion` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`idGenero`))
ENGINE = InnoDB
AUTO_INCREMENT = 4
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `clinica_dental`.`doctor`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`doctor` (
  `iddoctor` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `apellido` VARCHAR(100) NOT NULL,
  `telefono` VARCHAR(45) NOT NULL,
  `email` VARCHAR(60) NOT NULL,
  `observacion` VARCHAR(250) NULL DEFAULT NULL,
  `usuario_idusuario` INT NULL DEFAULT NULL,
  `especialidad_idespecialidad` INT NOT NULL,
  `dpi` VARCHAR(20) NULL DEFAULT NULL,
  `fechaNacimiento` DATE NULL DEFAULT NULL,
  `tipoSangre` VARCHAR(5) NULL DEFAULT NULL,
  `domicilio` VARCHAR(255) NULL DEFAULT NULL,
  `idestado` INT NOT NULL,
  `genero_idGenero` INT NULL DEFAULT NULL,
  PRIMARY KEY (`iddoctor`),
  CONSTRAINT `fk_doctor_especialidad`
    FOREIGN KEY (`especialidad_idespecialidad`)
    REFERENCES `clinica_dental`.`especialidad` (`idespecialidad`),
  CONSTRAINT `fk_doctor_genero`
    FOREIGN KEY (`genero_idGenero`)
    REFERENCES `clinica_dental`.`genero` (`idGenero`),
  CONSTRAINT `fk_doctor_usuario`
    FOREIGN KEY (`usuario_idusuario`)
    REFERENCES `clinica_dental`.`usuario` (`idusuario`))
ENGINE = InnoDB
AUTO_INCREMENT = 2
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_doctor_usuario` ON `clinica_dental`.`doctor` (`usuario_idusuario` ASC) VISIBLE;

CREATE INDEX `idx_doctor_especialidad` ON `clinica_dental`.`doctor` (`especialidad_idespecialidad` ASC) VISIBLE;

CREATE INDEX `idx_doctor_genero` ON `clinica_dental`.`doctor` (`genero_idGenero` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`estadocita`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`estadocita` (
  `idestadoCita` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(255) NOT NULL,
  `descripcion` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`idestadoCita`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `clinica_dental`.`estadopaciente`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`estadopaciente` (
  `idestado` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  `descripcion` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`idestado`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `clinica_dental`.`tipopaciente`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`tipopaciente` (
  `idtipoPaciente` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`idtipoPaciente`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `clinica_dental`.`paciente`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`paciente` (
  `idPaciente` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `apellido` VARCHAR(100) NOT NULL,
  `telefono` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `edad` INT NOT NULL,
  `fechaNacimiento` DATE NULL DEFAULT NULL,
  `direccion` VARCHAR(255) NULL DEFAULT NULL,
  `nit` VARCHAR(20) NULL DEFAULT NULL,
  `dpi` VARCHAR(20) NULL DEFAULT NULL,
  `tipoPaciente_idtipoPaciente` INT NOT NULL,
  `genero_idGenero` INT NOT NULL,
  `idestado` INT NULL DEFAULT '1',
  `fichaMedica_idfichaMedica` INT NULL DEFAULT NULL,
  PRIMARY KEY (`idPaciente`),
  CONSTRAINT `fk_paciente_estado`
    FOREIGN KEY (`idestado`)
    REFERENCES `clinica_dental`.`estadopaciente` (`idestado`),
  CONSTRAINT `fk_paciente_genero`
    FOREIGN KEY (`genero_idGenero`)
    REFERENCES `clinica_dental`.`genero` (`idGenero`),
  CONSTRAINT `fk_paciente_tipo`
    FOREIGN KEY (`tipoPaciente_idtipoPaciente`)
    REFERENCES `clinica_dental`.`tipopaciente` (`idtipoPaciente`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_paciente_tipo` ON `clinica_dental`.`paciente` (`tipoPaciente_idtipoPaciente` ASC) VISIBLE;

CREATE INDEX `idx_paciente_genero` ON `clinica_dental`.`paciente` (`genero_idGenero` ASC) VISIBLE;

CREATE INDEX `idx_paciente_estado` ON `clinica_dental`.`paciente` (`idestado` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`cita`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`cita` (
  `idcita` INT NOT NULL AUTO_INCREMENT,
  `fechaCita` DATE NOT NULL,
  `horaCita` TIME NOT NULL,
  `motivoCita` VARCHAR(250) NOT NULL,
  `notasAdicionales` VARCHAR(250) NOT NULL,
  `paciente_idPaciente` INT NOT NULL,
  `doctor_iddoctor` INT NOT NULL,
  `estadoCita_idestadoCita` INT NULL DEFAULT NULL,
  PRIMARY KEY (`idcita`),
  CONSTRAINT `fk_cita_doctor`
    FOREIGN KEY (`doctor_iddoctor`)
    REFERENCES `clinica_dental`.`doctor` (`iddoctor`),
  CONSTRAINT `fk_cita_estado`
    FOREIGN KEY (`estadoCita_idestadoCita`)
    REFERENCES `clinica_dental`.`estadocita` (`idestadoCita`),
  CONSTRAINT `fk_cita_paciente`
    FOREIGN KEY (`paciente_idPaciente`)
    REFERENCES `clinica_dental`.`paciente` (`idPaciente`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_cita_paciente` ON `clinica_dental`.`cita` (`paciente_idPaciente` ASC) VISIBLE;

CREATE INDEX `idx_cita_doctor` ON `clinica_dental`.`cita` (`doctor_iddoctor` ASC) VISIBLE;

CREATE INDEX `idx_cita_estado` ON `clinica_dental`.`cita` (`estadoCita_idestadoCita` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`marca`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`marca` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `clinica_dental`.`producto`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`producto` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NULL DEFAULT NULL,
  `precio` DECIMAL(10,2) NOT NULL,
  `stock` INT NULL DEFAULT '0',
  `fecha_expiracion` DATE NULL DEFAULT NULL,
  `marca_id` INT NULL DEFAULT NULL,
  `categoria_id` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_producto_categoria`
    FOREIGN KEY (`categoria_id`)
    REFERENCES `clinica_dental`.`categoria` (`idcategoria`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_producto_marca`
    FOREIGN KEY (`marca_id`)
    REFERENCES `clinica_dental`.`marca` (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_producto_categoria` ON `clinica_dental`.`producto` (`categoria_id` ASC) VISIBLE;

CREATE INDEX `idx_producto_marca` ON `clinica_dental`.`producto` (`marca_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`proveedor`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`proveedor` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `contacto` VARCHAR(100) NULL DEFAULT NULL,
  `email` VARCHAR(100) NULL DEFAULT NULL,
  `telefono` VARCHAR(20) NULL DEFAULT NULL,
  `direccion` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `clinica_dental`.`compraproducto`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`compraproducto` (
  `idcompra` INT NOT NULL AUTO_INCREMENT,
  `producto_id` INT NOT NULL,
  `proveedor_id` INT NOT NULL,
  `fecha` DATE NOT NULL,
  `cantidad` INT NOT NULL,
  `precio_unitario` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`idcompra`),
  CONSTRAINT `fk_compraproducto_producto`
    FOREIGN KEY (`producto_id`)
    REFERENCES `clinica_dental`.`producto` (`id`),
  CONSTRAINT `fk_compraproducto_proveedor`
    FOREIGN KEY (`proveedor_id`)
    REFERENCES `clinica_dental`.`proveedor` (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_compraproducto_producto` ON `clinica_dental`.`compraproducto` (`producto_id` ASC) VISIBLE;

CREATE INDEX `idx_compraproducto_proveedor` ON `clinica_dental`.`compraproducto` (`proveedor_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`servicio`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`servicio` (
  `idservicio` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(255) NOT NULL,
  `descripcion` VARCHAR(255) NULL DEFAULT NULL,
  `precio` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`idservicio`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `clinica_dental`.`tiposervicio`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`tiposervicio` (
  `idtipoServicio` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(255) NOT NULL,
  `descripcion` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`idtipoServicio`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `clinica_dental`.`consulta`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`consulta` (
  `idconsulta` INT NOT NULL AUTO_INCREMENT,
  `nopieza` VARCHAR(200) NULL DEFAULT NULL,
  `servicio_idservicio` INT NOT NULL,
  `tiposervicio_idtiposervicio` INT NOT NULL,
  `descripcion` TEXT NOT NULL,
  `proximaCita` DATE NULL DEFAULT NULL,
  `cita_idcita` INT NOT NULL,
  PRIMARY KEY (`idconsulta`),
  CONSTRAINT `fk_consulta_cita`
    FOREIGN KEY (`cita_idcita`)
    REFERENCES `clinica_dental`.`cita` (`idcita`),
  CONSTRAINT `fk_consulta_servicio`
    FOREIGN KEY (`servicio_idservicio`)
    REFERENCES `clinica_dental`.`servicio` (`idservicio`),
  CONSTRAINT `fk_consulta_tiposervicio`
    FOREIGN KEY (`tiposervicio_idtiposervicio`)
    REFERENCES `clinica_dental`.`tiposervicio` (`idtipoServicio`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_consulta_cita` ON `clinica_dental`.`consulta` (`cita_idcita` ASC) VISIBLE;

CREATE INDEX `idx_consulta_servicio` ON `clinica_dental`.`consulta` (`servicio_idservicio` ASC) VISIBLE;

CREATE INDEX `idx_consulta_tiposervicio` ON `clinica_dental`.`consulta` (`tiposervicio_idtiposervicio` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`consulta_doctor`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`consulta_doctor` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `consulta_idconsulta` INT NULL DEFAULT NULL,
  `doctor_iddoctor` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_consulta_doctor_consulta`
    FOREIGN KEY (`consulta_idconsulta`)
    REFERENCES `clinica_dental`.`consulta` (`idconsulta`),
  CONSTRAINT `fk_consulta_doctor_doctor`
    FOREIGN KEY (`doctor_iddoctor`)
    REFERENCES `clinica_dental`.`doctor` (`iddoctor`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_consulta_doctor_consulta` ON `clinica_dental`.`consulta_doctor` (`consulta_idconsulta` ASC) VISIBLE;

CREATE INDEX `idx_consulta_doctor_doctor` ON `clinica_dental`.`consulta_doctor` (`doctor_iddoctor` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`contactoemergencia`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`contactoemergencia` (
  `idContactoEmergencia` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `numero` VARCHAR(15) NOT NULL,
  `parentesco` VARCHAR(50) NOT NULL,
  `paciente_idPaciente` INT NULL DEFAULT NULL,
  PRIMARY KEY (`idContactoEmergencia`),
  CONSTRAINT `fk_contacto_paciente`
    FOREIGN KEY (`paciente_idPaciente`)
    REFERENCES `clinica_dental`.`paciente` (`idPaciente`)
    ON DELETE SET NULL
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_contacto_paciente` ON `clinica_dental`.`contactoemergencia` (`paciente_idPaciente` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`cotizaciones`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`cotizaciones` (
  `id_cotizacion` INT NOT NULL AUTO_INCREMENT,
  `id_paciente` INT NOT NULL,
  `fecha_cotizacion` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `costo_total` DECIMAL(10,2) NULL DEFAULT '0.00',
  `notas_adicionales` TEXT NULL DEFAULT NULL,
  `estado` ENUM('activa', 'finalizada', 'cancelada') NULL DEFAULT 'activa',
  PRIMARY KEY (`id_cotizacion`),
  CONSTRAINT `fk_cotizaciones_paciente`
    FOREIGN KEY (`id_paciente`)
    REFERENCES `clinica_dental`.`paciente` (`idPaciente`)
    ON DELETE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_cotizaciones_paciente` ON `clinica_dental`.`cotizaciones` (`id_paciente` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`detalle_cotizaciones`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`detalle_cotizaciones` (
  `id_detalle` INT NOT NULL AUTO_INCREMENT,
  `id_cotizacion` INT NOT NULL,
  `diente` VARCHAR(5) NOT NULL,
  `id_servicio` INT NULL DEFAULT NULL,
  `id_tratamiento` INT NULL DEFAULT NULL,
  `costo_servicio` DECIMAL(10,2) NULL DEFAULT NULL,
  `costo_total_material` DECIMAL(10,2) NULL DEFAULT '0.00',
  `notas` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id_detalle`),
  CONSTRAINT `fk_detalle_cotizacion`
    FOREIGN KEY (`id_cotizacion`)
    REFERENCES `clinica_dental`.`cotizaciones` (`id_cotizacion`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_detalle_servicio`
    FOREIGN KEY (`id_servicio`)
    REFERENCES `clinica_dental`.`servicio` (`idservicio`)
    ON DELETE SET NULL,
  CONSTRAINT `fk_detalle_tratamiento`
    FOREIGN KEY (`id_tratamiento`)
    REFERENCES `clinica_dental`.`tiposervicio` (`idtipoServicio`)
    ON DELETE SET NULL)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_detalle_cotizacion` ON `clinica_dental`.`detalle_cotizaciones` (`id_cotizacion` ASC) VISIBLE;

CREATE INDEX `idx_detalle_servicio` ON `clinica_dental`.`detalle_cotizaciones` (`id_servicio` ASC) VISIBLE;

CREATE INDEX `idx_detalle_tratamiento` ON `clinica_dental`.`detalle_cotizaciones` (`id_tratamiento` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`metodo_pago`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`metodo_pago` (
  `idmetodo_pago` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`idmetodo_pago`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `clinica_dental`.`factura`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`factura` (
  `idfactura` INT NOT NULL AUTO_INCREMENT,
  `fechaEmision` DATE NOT NULL,
  `montoTotal` DECIMAL(10,2) NOT NULL,
  `metodo_pago_idmetodo_pago` INT NOT NULL,
  PRIMARY KEY (`idfactura`),
  CONSTRAINT `fk_factura_metodo_pago`
    FOREIGN KEY (`metodo_pago_idmetodo_pago`)
    REFERENCES `clinica_dental`.`metodo_pago` (`idmetodo_pago`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_factura_metodo_pago` ON `clinica_dental`.`factura` (`metodo_pago_idmetodo_pago` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`detallefactura`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`detallefactura` (
  `iddetalleFactura` INT NOT NULL AUTO_INCREMENT,
  `cantidad` INT NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `factura_idfactura` INT NOT NULL,
  `producto_idproducto` INT NULL DEFAULT NULL,
  `proveedor_idproveedor` INT NULL DEFAULT NULL,
  PRIMARY KEY (`iddetalleFactura`),
  CONSTRAINT `fk_detallefactura_factura`
    FOREIGN KEY (`factura_idfactura`)
    REFERENCES `clinica_dental`.`factura` (`idfactura`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_detallefactura_producto`
    FOREIGN KEY (`producto_idproducto`)
    REFERENCES `clinica_dental`.`producto` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_detallefactura_proveedor`
    FOREIGN KEY (`proveedor_idproveedor`)
    REFERENCES `clinica_dental`.`proveedor` (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_detallefactura_factura` ON `clinica_dental`.`detallefactura` (`factura_idfactura` ASC) VISIBLE;

CREATE INDEX `idx_detallefactura_producto` ON `clinica_dental`.`detallefactura` (`producto_idproducto` ASC) VISIBLE;

CREATE INDEX `idx_detallefactura_proveedor` ON `clinica_dental`.`detallefactura` (`proveedor_idproveedor` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`fichamedica`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`fichamedica` (
  `idFicha` INT NOT NULL AUTO_INCREMENT,
  `enfermedad_corazon` TINYINT NULL DEFAULT NULL,
  `presion_alta_baja` TINYINT NULL DEFAULT NULL,
  `diabetico` TINYINT NULL DEFAULT NULL,
  `operaciones_recientes` TINYINT NULL DEFAULT NULL,
  `hepatitis` TINYINT NULL DEFAULT NULL,
  `enfermedad_higado_rinones` TINYINT NULL DEFAULT NULL,
  `convulsiones_desmayos` TINYINT NULL DEFAULT NULL,
  `enfermedad_transmision_sexual` TINYINT NULL DEFAULT NULL,
  `alergias` TINYINT NULL DEFAULT NULL,
  `enfermedad_respiratoria` TINYINT NULL DEFAULT NULL,
  `embarazada` TINYINT NULL DEFAULT NULL,
  `artritis` TINYINT NULL DEFAULT NULL,
  `fiebre_reumatica` TINYINT NULL DEFAULT NULL,
  `hemorragias_espontaneas` TINYINT NULL DEFAULT NULL,
  `enfermedad_no_mencionada` TINYINT NULL DEFAULT NULL,
  `alergia_material_odontologico` TINYINT NULL DEFAULT NULL,
  `sangrado_encias` TINYINT NULL DEFAULT NULL,
  `halitosis` TINYINT NULL DEFAULT NULL,
  `alergia_medicamento` TINYINT NULL DEFAULT NULL,
  `aftas` TINYINT NULL DEFAULT NULL,
  `dolor_dental` TINYINT NULL DEFAULT NULL,
  `sensibilidad` TINYINT NULL DEFAULT NULL,
  `ultima_visita_dentista` VARCHAR(255) NULL DEFAULT NULL,
  `tratamiento_realizado` VARCHAR(255) NULL DEFAULT NULL,
  `contactoemergencia_idContactoEmergencia` INT NULL DEFAULT NULL,
  PRIMARY KEY (`idFicha`),
  CONSTRAINT `fk_fichamedica_contacto`
    FOREIGN KEY (`contactoemergencia_idContactoEmergencia`)
    REFERENCES `clinica_dental`.`contactoemergencia` (`idContactoEmergencia`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_fichamedica_contacto` ON `clinica_dental`.`fichamedica` (`contactoemergencia_idContactoEmergencia` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`historial_clinico`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`historial_clinico` (
  `idhistorialClinico` INT NOT NULL AUTO_INCREMENT,
  `fecharegistro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `consulta_idconsulta` INT NOT NULL,
  `doctor_iddoctor` INT NULL DEFAULT NULL,
  PRIMARY KEY (`idhistorialClinico`),
  CONSTRAINT `fk_historial_consulta`
    FOREIGN KEY (`consulta_idconsulta`)
    REFERENCES `clinica_dental`.`consulta` (`idconsulta`),
  CONSTRAINT `fk_historial_doctor`
    FOREIGN KEY (`doctor_iddoctor`)
    REFERENCES `clinica_dental`.`doctor` (`iddoctor`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_historial_consulta` ON `clinica_dental`.`historial_clinico` (`consulta_idconsulta` ASC) VISIBLE;

CREATE INDEX `idx_historial_doctor` ON `clinica_dental`.`historial_clinico` (`doctor_iddoctor` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`horarios_laborales`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`horarios_laborales` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `doctor_id` INT NULL DEFAULT NULL,
  `dia_semana` ENUM('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo') NULL DEFAULT NULL,
  `hora_inicio` TIME NULL DEFAULT NULL,
  `hora_fin` TIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_horario_doctor`
    FOREIGN KEY (`doctor_id`)
    REFERENCES `clinica_dental`.`doctor` (`iddoctor`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_horario_doctor` ON `clinica_dental`.`horarios_laborales` (`doctor_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`inventario`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`inventario` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `producto_id` INT NOT NULL,
  `stock_actual` INT NULL DEFAULT '0',
  `stock_seguridad` INT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_inventario_producto`
    FOREIGN KEY (`producto_id`)
    REFERENCES `clinica_dental`.`producto` (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_inventario_producto` ON `clinica_dental`.`inventario` (`producto_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`loteproducto`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`loteproducto` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `producto_id` INT NOT NULL,
  `fecha_expiracion` DATE NOT NULL,
  `cantidad` INT NOT NULL,
  `lote_codigo` VARCHAR(50) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_loteproducto_producto`
    FOREIGN KEY (`producto_id`)
    REFERENCES `clinica_dental`.`producto` (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_loteproducto_producto` ON `clinica_dental`.`loteproducto` (`producto_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`movimientoinventario`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`movimientoinventario` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `producto_id` INT NOT NULL,
  `cantidad` INT NOT NULL,
  `fecha` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `descripcion` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_movimientoinventario_producto`
    FOREIGN KEY (`producto_id`)
    REFERENCES `clinica_dental`.`producto` (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_movimientoinventario_producto` ON `clinica_dental`.`movimientoinventario` (`producto_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`pago`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`pago` (
  `idPago` INT NOT NULL AUTO_INCREMENT,
  `fecha` DATE NULL DEFAULT NULL,
  `lugar` VARCHAR(255) NULL DEFAULT NULL,
  `saldo` DECIMAL(10,2) NULL DEFAULT NULL,
  `abono` DECIMAL(10,2) NULL DEFAULT NULL,
  `nocuotas` INT NOT NULL,
  `saldo_restante` DECIMAL(10,2) NULL DEFAULT NULL,
  `consulta_idconsulta` INT NULL DEFAULT NULL,
  `metodo_pago_idmetodo_pago` INT NOT NULL,
  PRIMARY KEY (`idPago`),
  CONSTRAINT `fk_pago_consulta`
    FOREIGN KEY (`consulta_idconsulta`)
    REFERENCES `clinica_dental`.`consulta` (`idconsulta`),
  CONSTRAINT `fk_pago_metodo_pago`
    FOREIGN KEY (`metodo_pago_idmetodo_pago`)
    REFERENCES `clinica_dental`.`metodo_pago` (`idmetodo_pago`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_pago_consulta` ON `clinica_dental`.`pago` (`consulta_idconsulta` ASC) VISIBLE;

CREATE INDEX `idx_pago_metodo_pago` ON `clinica_dental`.`pago` (`metodo_pago_idmetodo_pago` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `clinica_dental`.`recibo`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clinica_dental`.`recibo` (
  `idRecibo` INT NOT NULL AUTO_INCREMENT,
  `fecha` DATE NOT NULL,
  `monto` DECIMAL(10,2) NOT NULL,
  `imagen` VARCHAR(255) NULL DEFAULT NULL,
  `pago_idPago` INT NULL DEFAULT NULL,
  PRIMARY KEY (`idRecibo`),
  CONSTRAINT `fk_recibo_pago`
    FOREIGN KEY (`pago_idPago`)
    REFERENCES `clinica_dental`.`pago` (`idPago`)
    ON DELETE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE INDEX `idx_recibo_pago` ON `clinica_dental`.`recibo` (`pago_idPago` ASC) VISIBLE;

USE `clinica_dental`;

DELIMITER $$
USE `clinica_dental`$$
CREATE
DEFINER=`root`@`localhost`
TRIGGER `clinica_dental`.`actualizar_costo_total_delete`
AFTER DELETE ON `clinica_dental`.`detalle_cotizaciones`
FOR EACH ROW
BEGIN
  DECLARE nuevo_costo_total DECIMAL(10,2);
  SELECT COALESCE(SUM(COALESCE(costo_servicio,0) + COALESCE(costo_total_material,0)), 0)
    INTO nuevo_costo_total
  FROM detalle_cotizaciones
  WHERE id_cotizacion = OLD.id_cotizacion;

  UPDATE cotizaciones
     SET costo_total = nuevo_costo_total
   WHERE id_cotizacion = OLD.id_cotizacion;
END$$

USE `clinica_dental`$$
CREATE
DEFINER=`root`@`localhost`
TRIGGER `clinica_dental`.`actualizar_costo_total_insert`
AFTER INSERT ON `clinica_dental`.`detalle_cotizaciones`
FOR EACH ROW
BEGIN
  DECLARE nuevo_costo_total DECIMAL(10,2);
  SELECT COALESCE(SUM(COALESCE(costo_servicio,0) + COALESCE(costo_total_material,0)), 0)
    INTO nuevo_costo_total
  FROM detalle_cotizaciones
  WHERE id_cotizacion = NEW.id_cotizacion;

  UPDATE cotizaciones
     SET costo_total = nuevo_costo_total
   WHERE id_cotizacion = NEW.id_cotizacion;
END$$

USE `clinica_dental`$$
CREATE
DEFINER=`root`@`localhost`
TRIGGER `clinica_dental`.`actualizar_costo_total_update`
AFTER UPDATE ON `clinica_dental`.`detalle_cotizaciones`
FOR EACH ROW
BEGIN
  DECLARE nuevo_costo_total DECIMAL(10,2);
  SELECT COALESCE(SUM(COALESCE(costo_servicio,0) + COALESCE(costo_total_material,0)), 0)
    INTO nuevo_costo_total
  FROM detalle_cotizaciones
  WHERE id_cotizacion = NEW.id_cotizacion;

  UPDATE cotizaciones
     SET costo_total = nuevo_costo_total
   WHERE id_cotizacion = NEW.id_cotizacion;
END$$


DELIMITER ;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;