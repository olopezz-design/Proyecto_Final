-- C&C DENTAL STUDIO
-- ESTRUCTURA DE BASE DE DATOS PARA INSTALACION DE PRUEBA
-- IMPORTANTE: Ejecutar únicamente en una base nueva y vacía.
-- Este script contiene instrucciones DROP TABLE IF EXISTS.
-- No ejecutar sobre bases de datos que contengan información real.
CREATE DATABASE  IF NOT EXISTS `clinica_dental_entrega` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `clinica_dental_entrega`;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: clinica_dental_entrega
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `actividadsistema`
--

DROP TABLE IF EXISTS `actividadsistema`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actividadsistema` (
  `idactividadSistema` int NOT NULL AUTO_INCREMENT,
  `registroInicial` datetime NOT NULL,
  `registroFinal` datetime DEFAULT NULL,
  `usuario_idusuario` int NOT NULL,
  PRIMARY KEY (`idactividadSistema`),
  KEY `idx_actividad_usuario` (`usuario_idusuario`),
  CONSTRAINT `fk_actividad_usuario` FOREIGN KEY (`usuario_idusuario`) REFERENCES `usuario` (`idusuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categoria`
--

DROP TABLE IF EXISTS `categoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categoria` (
  `idcategoria` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`idcategoria`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cita`
--

DROP TABLE IF EXISTS `cita`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cita` (
  `idcita` int NOT NULL AUTO_INCREMENT,
  `fechaCita` date NOT NULL,
  `horaCita` time NOT NULL,
  `motivoCita` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notasAdicionales` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paciente_idPaciente` int NOT NULL,
  `doctor_iddoctor` int NOT NULL,
  `estadoCita_idestadoCita` int DEFAULT NULL,
  PRIMARY KEY (`idcita`),
  KEY `idx_cita_paciente` (`paciente_idPaciente`),
  KEY `idx_cita_doctor` (`doctor_iddoctor`),
  KEY `idx_cita_estado` (`estadoCita_idestadoCita`),
  CONSTRAINT `fk_cita_doctor` FOREIGN KEY (`doctor_iddoctor`) REFERENCES `doctor` (`iddoctor`),
  CONSTRAINT `fk_cita_estado` FOREIGN KEY (`estadoCita_idestadoCita`) REFERENCES `estadocita` (`idestadoCita`),
  CONSTRAINT `fk_cita_paciente` FOREIGN KEY (`paciente_idPaciente`) REFERENCES `paciente` (`idPaciente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `compraproducto`
--

DROP TABLE IF EXISTS `compraproducto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `compraproducto` (
  `idcompra` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `proveedor_id` int NOT NULL,
  `fecha` date NOT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  PRIMARY KEY (`idcompra`),
  KEY `idx_compraproducto_producto` (`producto_id`),
  KEY `idx_compraproducto_proveedor` (`proveedor_id`),
  CONSTRAINT `fk_compraproducto_producto` FOREIGN KEY (`producto_id`) REFERENCES `producto` (`id`),
  CONSTRAINT `fk_compraproducto_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedor` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `consulta`
--

DROP TABLE IF EXISTS `consulta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consulta` (
  `idconsulta` int NOT NULL AUTO_INCREMENT,
  `nopieza` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `servicio_idservicio` int NOT NULL,
  `tiposervicio_idtiposervicio` int NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `proximaCita` date DEFAULT NULL,
  `cita_idcita` int NOT NULL,
  PRIMARY KEY (`idconsulta`),
  KEY `idx_consulta_cita` (`cita_idcita`),
  KEY `idx_consulta_servicio` (`servicio_idservicio`),
  KEY `idx_consulta_tiposervicio` (`tiposervicio_idtiposervicio`),
  CONSTRAINT `fk_consulta_cita` FOREIGN KEY (`cita_idcita`) REFERENCES `cita` (`idcita`),
  CONSTRAINT `fk_consulta_servicio` FOREIGN KEY (`servicio_idservicio`) REFERENCES `servicio` (`idservicio`),
  CONSTRAINT `fk_consulta_tiposervicio` FOREIGN KEY (`tiposervicio_idtiposervicio`) REFERENCES `tiposervicio` (`idtipoServicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `consulta_doctor`
--

DROP TABLE IF EXISTS `consulta_doctor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consulta_doctor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `consulta_idconsulta` int DEFAULT NULL,
  `doctor_iddoctor` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_consulta_doctor_consulta` (`consulta_idconsulta`),
  KEY `idx_consulta_doctor_doctor` (`doctor_iddoctor`),
  CONSTRAINT `fk_consulta_doctor_consulta` FOREIGN KEY (`consulta_idconsulta`) REFERENCES `consulta` (`idconsulta`),
  CONSTRAINT `fk_consulta_doctor_doctor` FOREIGN KEY (`doctor_iddoctor`) REFERENCES `doctor` (`iddoctor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contactoemergencia`
--

DROP TABLE IF EXISTS `contactoemergencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contactoemergencia` (
  `idContactoEmergencia` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parentesco` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paciente_idPaciente` int DEFAULT NULL,
  PRIMARY KEY (`idContactoEmergencia`),
  KEY `idx_contacto_paciente` (`paciente_idPaciente`),
  CONSTRAINT `fk_contacto_paciente` FOREIGN KEY (`paciente_idPaciente`) REFERENCES `paciente` (`idPaciente`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cotizaciones`
--

DROP TABLE IF EXISTS `cotizaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cotizaciones` (
  `id_cotizacion` int NOT NULL AUTO_INCREMENT,
  `id_paciente` int NOT NULL,
  `fecha_cotizacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `costo_total` decimal(10,2) DEFAULT '0.00',
  `notas_adicionales` text COLLATE utf8mb4_unicode_ci,
  `estado` enum('activa','finalizada','cancelada') COLLATE utf8mb4_unicode_ci DEFAULT 'activa',
  PRIMARY KEY (`id_cotizacion`),
  KEY `idx_cotizaciones_paciente` (`id_paciente`),
  CONSTRAINT `fk_cotizaciones_paciente` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`idPaciente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_cotizaciones`
--

DROP TABLE IF EXISTS `detalle_cotizaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_cotizaciones` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `id_cotizacion` int NOT NULL,
  `diente` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_servicio` int DEFAULT NULL,
  `id_tratamiento` int DEFAULT NULL,
  `costo_servicio` decimal(10,2) DEFAULT NULL,
  `costo_total_material` decimal(10,2) DEFAULT '0.00',
  `notas` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_detalle`),
  KEY `idx_detalle_cotizacion` (`id_cotizacion`),
  KEY `idx_detalle_servicio` (`id_servicio`),
  KEY `idx_detalle_tratamiento` (`id_tratamiento`),
  CONSTRAINT `fk_detalle_cotizacion` FOREIGN KEY (`id_cotizacion`) REFERENCES `cotizaciones` (`id_cotizacion`) ON DELETE CASCADE,
  CONSTRAINT `fk_detalle_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`idservicio`) ON DELETE SET NULL,
  CONSTRAINT `fk_detalle_tratamiento` FOREIGN KEY (`id_tratamiento`) REFERENCES `tiposervicio` (`idtipoServicio`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `actualizar_costo_total_insert` AFTER INSERT ON `detalle_cotizaciones` FOR EACH ROW BEGIN
  DECLARE nuevo_costo_total DECIMAL(10,2);
  SELECT COALESCE(SUM(COALESCE(costo_servicio,0) + COALESCE(costo_total_material,0)), 0)
    INTO nuevo_costo_total
  FROM detalle_cotizaciones
  WHERE id_cotizacion = NEW.id_cotizacion;

  UPDATE cotizaciones
     SET costo_total = nuevo_costo_total
   WHERE id_cotizacion = NEW.id_cotizacion;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `actualizar_costo_total_update` AFTER UPDATE ON `detalle_cotizaciones` FOR EACH ROW BEGIN
  DECLARE nuevo_costo_total DECIMAL(10,2);
  SELECT COALESCE(SUM(COALESCE(costo_servicio,0) + COALESCE(costo_total_material,0)), 0)
    INTO nuevo_costo_total
  FROM detalle_cotizaciones
  WHERE id_cotizacion = NEW.id_cotizacion;

  UPDATE cotizaciones
     SET costo_total = nuevo_costo_total
   WHERE id_cotizacion = NEW.id_cotizacion;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `actualizar_costo_total_delete` AFTER DELETE ON `detalle_cotizaciones` FOR EACH ROW BEGIN
  DECLARE nuevo_costo_total DECIMAL(10,2);
  SELECT COALESCE(SUM(COALESCE(costo_servicio,0) + COALESCE(costo_total_material,0)), 0)
    INTO nuevo_costo_total
  FROM detalle_cotizaciones
  WHERE id_cotizacion = OLD.id_cotizacion;

  UPDATE cotizaciones
     SET costo_total = nuevo_costo_total
   WHERE id_cotizacion = OLD.id_cotizacion;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `detallefactura`
--

DROP TABLE IF EXISTS `detallefactura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detallefactura` (
  `iddetalleFactura` int NOT NULL AUTO_INCREMENT,
  `cantidad` int NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `factura_idfactura` int NOT NULL,
  `producto_idproducto` int DEFAULT NULL,
  `proveedor_idproveedor` int DEFAULT NULL,
  PRIMARY KEY (`iddetalleFactura`),
  KEY `idx_detallefactura_factura` (`factura_idfactura`),
  KEY `idx_detallefactura_producto` (`producto_idproducto`),
  KEY `idx_detallefactura_proveedor` (`proveedor_idproveedor`),
  CONSTRAINT `fk_detallefactura_factura` FOREIGN KEY (`factura_idfactura`) REFERENCES `factura` (`idfactura`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_detallefactura_producto` FOREIGN KEY (`producto_idproducto`) REFERENCES `producto` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_detallefactura_proveedor` FOREIGN KEY (`proveedor_idproveedor`) REFERENCES `proveedor` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `doctor`
--

DROP TABLE IF EXISTS `doctor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctor` (
  `iddoctor` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `observacion` varchar(250) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario_idusuario` int DEFAULT NULL,
  `especialidad_idespecialidad` int NOT NULL,
  `dpi` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fechaNacimiento` date DEFAULT NULL,
  `tipoSangre` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `domicilio` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idestado` int NOT NULL,
  `genero_idGenero` int DEFAULT NULL,
  PRIMARY KEY (`iddoctor`),
  KEY `idx_doctor_usuario` (`usuario_idusuario`),
  KEY `idx_doctor_especialidad` (`especialidad_idespecialidad`),
  KEY `idx_doctor_genero` (`genero_idGenero`),
  CONSTRAINT `fk_doctor_especialidad` FOREIGN KEY (`especialidad_idespecialidad`) REFERENCES `especialidad` (`idespecialidad`),
  CONSTRAINT `fk_doctor_genero` FOREIGN KEY (`genero_idGenero`) REFERENCES `genero` (`idGenero`),
  CONSTRAINT `fk_doctor_usuario` FOREIGN KEY (`usuario_idusuario`) REFERENCES `usuario` (`idusuario`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `especialidad`
--

DROP TABLE IF EXISTS `especialidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `especialidad` (
  `idespecialidad` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`idespecialidad`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `estadocita`
--

DROP TABLE IF EXISTS `estadocita`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estadocita` (
  `idestadoCita` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`idestadoCita`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `estadopaciente`
--

DROP TABLE IF EXISTS `estadopaciente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estadopaciente` (
  `idestado` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`idestado`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `estadousuario`
--

DROP TABLE IF EXISTS `estadousuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estadousuario` (
  `idestadoUsuario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`idestadoUsuario`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `factura`
--

DROP TABLE IF EXISTS `factura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `factura` (
  `idfactura` int NOT NULL AUTO_INCREMENT,
  `fechaEmision` date NOT NULL,
  `montoTotal` decimal(10,2) NOT NULL,
  `metodo_pago_idmetodo_pago` int NOT NULL,
  PRIMARY KEY (`idfactura`),
  KEY `idx_factura_metodo_pago` (`metodo_pago_idmetodo_pago`),
  CONSTRAINT `fk_factura_metodo_pago` FOREIGN KEY (`metodo_pago_idmetodo_pago`) REFERENCES `metodo_pago` (`idmetodo_pago`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fichamedica`
--

DROP TABLE IF EXISTS `fichamedica`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fichamedica` (
  `idFicha` int NOT NULL AUTO_INCREMENT,
  `enfermedad_corazon` tinyint DEFAULT NULL,
  `presion_alta_baja` tinyint DEFAULT NULL,
  `diabetico` tinyint DEFAULT NULL,
  `operaciones_recientes` tinyint DEFAULT NULL,
  `hepatitis` tinyint DEFAULT NULL,
  `enfermedad_higado_rinones` tinyint DEFAULT NULL,
  `convulsiones_desmayos` tinyint DEFAULT NULL,
  `enfermedad_transmision_sexual` tinyint DEFAULT NULL,
  `alergias` tinyint DEFAULT NULL,
  `enfermedad_respiratoria` tinyint DEFAULT NULL,
  `embarazada` tinyint DEFAULT NULL,
  `artritis` tinyint DEFAULT NULL,
  `fiebre_reumatica` tinyint DEFAULT NULL,
  `hemorragias_espontaneas` tinyint DEFAULT NULL,
  `enfermedad_no_mencionada` tinyint DEFAULT NULL,
  `alergia_material_odontologico` tinyint DEFAULT NULL,
  `sangrado_encias` tinyint DEFAULT NULL,
  `halitosis` tinyint DEFAULT NULL,
  `alergia_medicamento` tinyint DEFAULT NULL,
  `aftas` tinyint DEFAULT NULL,
  `dolor_dental` tinyint DEFAULT NULL,
  `sensibilidad` tinyint DEFAULT NULL,
  `ultima_visita_dentista` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tratamiento_realizado` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contactoemergencia_idContactoEmergencia` int DEFAULT NULL,
  PRIMARY KEY (`idFicha`),
  KEY `idx_fichamedica_contacto` (`contactoemergencia_idContactoEmergencia`),
  CONSTRAINT `fk_fichamedica_contacto` FOREIGN KEY (`contactoemergencia_idContactoEmergencia`) REFERENCES `contactoemergencia` (`idContactoEmergencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `genero`
--

DROP TABLE IF EXISTS `genero`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `genero` (
  `idGenero` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`idGenero`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `historial_clinico`
--

DROP TABLE IF EXISTS `historial_clinico`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historial_clinico` (
  `idhistorialClinico` int NOT NULL AUTO_INCREMENT,
  `fecharegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `consulta_idconsulta` int NOT NULL,
  `doctor_iddoctor` int DEFAULT NULL,
  PRIMARY KEY (`idhistorialClinico`),
  KEY `idx_historial_consulta` (`consulta_idconsulta`),
  KEY `idx_historial_doctor` (`doctor_iddoctor`),
  CONSTRAINT `fk_historial_consulta` FOREIGN KEY (`consulta_idconsulta`) REFERENCES `consulta` (`idconsulta`),
  CONSTRAINT `fk_historial_doctor` FOREIGN KEY (`doctor_iddoctor`) REFERENCES `doctor` (`iddoctor`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `horarios_laborales`
--

DROP TABLE IF EXISTS `horarios_laborales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `horarios_laborales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_id` int DEFAULT NULL,
  `dia_semana` enum('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hora_inicio` time DEFAULT NULL,
  `hora_fin` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_horario_doctor` (`doctor_id`),
  CONSTRAINT `fk_horario_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctor` (`iddoctor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventario`
--

DROP TABLE IF EXISTS `inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `stock_actual` int DEFAULT '0',
  `stock_seguridad` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_inventario_producto` (`producto_id`),
  CONSTRAINT `fk_inventario_producto` FOREIGN KEY (`producto_id`) REFERENCES `producto` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `loteproducto`
--

DROP TABLE IF EXISTS `loteproducto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loteproducto` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `fecha_expiracion` date NOT NULL,
  `cantidad` int NOT NULL,
  `lote_codigo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_loteproducto_producto` (`producto_id`),
  CONSTRAINT `fk_loteproducto_producto` FOREIGN KEY (`producto_id`) REFERENCES `producto` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `marca`
--

DROP TABLE IF EXISTS `marca`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marca` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `metodo_pago`
--

DROP TABLE IF EXISTS `metodo_pago`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `metodo_pago` (
  `idmetodo_pago` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`idmetodo_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `movimientoinventario`
--

DROP TABLE IF EXISTS `movimientoinventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimientoinventario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `cantidad` int NOT NULL,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_movimientoinventario_producto` (`producto_id`),
  CONSTRAINT `fk_movimientoinventario_producto` FOREIGN KEY (`producto_id`) REFERENCES `producto` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `paciente`
--

DROP TABLE IF EXISTS `paciente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paciente` (
  `idPaciente` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `edad` int NOT NULL,
  `fechaNacimiento` date DEFAULT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dpi` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipoPaciente_idtipoPaciente` int NOT NULL,
  `genero_idGenero` int NOT NULL,
  `idestado` int DEFAULT '1',
  `fichaMedica_idfichaMedica` int DEFAULT NULL,
  PRIMARY KEY (`idPaciente`),
  KEY `idx_paciente_tipo` (`tipoPaciente_idtipoPaciente`),
  KEY `idx_paciente_genero` (`genero_idGenero`),
  KEY `idx_paciente_estado` (`idestado`),
  CONSTRAINT `fk_paciente_estado` FOREIGN KEY (`idestado`) REFERENCES `estadopaciente` (`idestado`),
  CONSTRAINT `fk_paciente_genero` FOREIGN KEY (`genero_idGenero`) REFERENCES `genero` (`idGenero`),
  CONSTRAINT `fk_paciente_tipo` FOREIGN KEY (`tipoPaciente_idtipoPaciente`) REFERENCES `tipopaciente` (`idtipoPaciente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pago`
--

DROP TABLE IF EXISTS `pago`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pago` (
  `idPago` int NOT NULL AUTO_INCREMENT,
  `fecha` date DEFAULT NULL,
  `lugar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `saldo` decimal(10,2) DEFAULT NULL,
  `abono` decimal(10,2) DEFAULT NULL,
  `nocuotas` int NOT NULL,
  `saldo_restante` decimal(10,2) DEFAULT NULL,
  `consulta_idconsulta` int DEFAULT NULL,
  `metodo_pago_idmetodo_pago` int NOT NULL,
  PRIMARY KEY (`idPago`),
  KEY `idx_pago_consulta` (`consulta_idconsulta`),
  KEY `idx_pago_metodo_pago` (`metodo_pago_idmetodo_pago`),
  CONSTRAINT `fk_pago_consulta` FOREIGN KEY (`consulta_idconsulta`) REFERENCES `consulta` (`idconsulta`),
  CONSTRAINT `fk_pago_metodo_pago` FOREIGN KEY (`metodo_pago_idmetodo_pago`) REFERENCES `metodo_pago` (`idmetodo_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `portafolio_imagen`
--

DROP TABLE IF EXISTS `portafolio_imagen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `portafolio_imagen` (
  `idportafolio_imagen` int NOT NULL AUTO_INCREMENT,
  `servicio_idservicio` int NOT NULL,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `imagen_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden` int NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`idportafolio_imagen`),
  KEY `fk_portafolio_servicio` (`servicio_idservicio`),
  CONSTRAINT `fk_portafolio_servicio` FOREIGN KEY (`servicio_idservicio`) REFERENCES `servicio` (`idservicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `producto`
--

DROP TABLE IF EXISTS `producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `producto` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `precio` decimal(10,2) NOT NULL,
  `stock` int DEFAULT '0',
  `fecha_expiracion` date DEFAULT NULL,
  `marca_id` int DEFAULT NULL,
  `categoria_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_producto_categoria` (`categoria_id`),
  KEY `idx_producto_marca` (`marca_id`),
  CONSTRAINT `fk_producto_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categoria` (`idcategoria`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_producto_marca` FOREIGN KEY (`marca_id`) REFERENCES `marca` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `proveedor`
--

DROP TABLE IF EXISTS `proveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contacto` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recibo`
--

DROP TABLE IF EXISTS `recibo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recibo` (
  `idRecibo` int NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `imagen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pago_idPago` int DEFAULT NULL,
  PRIMARY KEY (`idRecibo`),
  KEY `idx_recibo_pago` (`pago_idPago`),
  CONSTRAINT `fk_recibo_pago` FOREIGN KEY (`pago_idPago`) REFERENCES `pago` (`idPago`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rol`
--

DROP TABLE IF EXISTS `rol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rol` (
  `idrol` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`idrol`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `servicio`
--

DROP TABLE IF EXISTS `servicio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicio` (
  `idservicio` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `precio` decimal(10,2) NOT NULL,
  PRIMARY KEY (`idservicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `session_store`
--

DROP TABLE IF EXISTS `session_store`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `session_store` (
  `sid` varchar(255) NOT NULL,
  `data` longtext NOT NULL,
  `expires_at` datetime NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`sid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tipopaciente`
--

DROP TABLE IF EXISTS `tipopaciente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipopaciente` (
  `idtipoPaciente` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`idtipoPaciente`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tiposervicio`
--

DROP TABLE IF EXISTS `tiposervicio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tiposervicio` (
  `idtipoServicio` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`idtipoServicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuario`
--

DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario` (
  `idusuario` int NOT NULL AUTO_INCREMENT,
  `user` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol_idrol` int NOT NULL,
  `estadoUsuario_idestadoUsuario` int NOT NULL,
  PRIMARY KEY (`idusuario`),
  KEY `idx_usuario_rol` (`rol_idrol`),
  KEY `idx_usuario_estado` (`estadoUsuario_idestadoUsuario`),
  CONSTRAINT `fk_usuario_estado` FOREIGN KEY (`estadoUsuario_idestadoUsuario`) REFERENCES `estadousuario` (`idestadoUsuario`),
  CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`rol_idrol`) REFERENCES `rol` (`idrol`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-31 21:27:57
