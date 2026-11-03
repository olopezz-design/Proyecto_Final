// routes/pacientes.routes.js
const express = require('express');
const crypto = require('crypto');
const fsSync = require('fs');
const fs = require('fs/promises');
const path = require('path');
const Joi = require('joi');
const PDFDocument = require('pdfkit');
const { query, initPool } = require('../database/db');
const { isAuthenticated, requirePermission } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { getAdminProfile } = require('../utils/adminProfile');
const { loadDoctorAvailability, normalizeTime } = require('../utils/doctorSchedules');
const { hasPermission } = require('../utils/permissions');
const { createNotification } = require('../utils/notificaciones');
const {
  addConsultationAttachment,
  createConsultationQuotation,
  ensureActiveConsultationStorage,
  finalizeConsultation,
  loadActiveConsultationData,
  loadQuotationDocumentData,
  replaceConsultationMaterials,
  replaceMedications,
  startActiveConsultation,
  updateConsultationFields,
} = require('../utils/consultasActivas');

const router = express.Router();
const canViewPatients = requirePermission('pacientes:ver');
const canCreatePatients = requirePermission('pacientes:crear');
const canEditPatients = requirePermission('pacientes:editar');
const canArchivePatients = requirePermission('pacientes:archivar');
const canViewAppointments = requirePermission('citas:ver');
const canCreateAppointments = requirePermission('citas:crear');
const canAttendAppointments = requirePermission('citas:atender');
const canCancelAppointments = requirePermission('citas:cancelar');
const canViewHistory = requirePermission('historial:ver');
const canCreateHistory = requirePermission('historial:crear');
const canViewQuotes = requirePermission('cotizaciones:ver');
const canCreateQuotes = requirePermission('cotizaciones:crear');

const idParam = Joi.object({ id: Joi.number().integer().positive().required() });
const tokenParam = Joi.object({ token: Joi.string().trim().min(32).max(160).required() });
const fichaCheckboxFields = [
  'enfermedad_corazon',
  'presion_alta_baja',
  'diabetico',
  'operaciones_recientes',
  'hepatitis',
  'enfermedad_higado_rinones',
  'convulsiones_desmayos',
  'enfermedad_transmision_sexual',
  'alergias',
  'enfermedad_respiratoria',
  'embarazada',
  'artritis',
  'fiebre_reumatica',
  'hemorragias_espontaneas',
  'enfermedad_no_mencionada',
  'alergia_material_odontologico',
  'alergia_medicamento',
  'aftas',
  'sangrado_encias',
  'halitosis',
  'dolor_dental',
  'sensibilidad',
];

const fichaDetailPrompts = {
  enfermedad_corazon: 'Indique diagnóstico o tratamiento actual',
  presion_alta_baja: 'Indique si es alta o baja y si está controlada',
  diabetico: 'Indique tipo, tratamiento o control actual',
  operaciones_recientes: 'Indique qué operación y cuándo fue',
  hepatitis: 'Indique tipo o fecha aproximada',
  enfermedad_higado_rinones: 'Indique cuál enfermedad',
  convulsiones_desmayos: 'Indique cuándo ocurrió o con qué frecuencia',
  enfermedad_transmision_sexual: 'Indique detalle clínico relevante',
  alergias: 'Indique a qué es alérgico',
  enfermedad_respiratoria: 'Indique cuál enfermedad respiratoria',
  embarazada: 'Indique semanas o meses de embarazo',
  hemorragias_espontaneas: 'Indique cuándo o en qué situación',
  enfermedad_no_mencionada: 'Indique cuál enfermedad',
  alergia_material_odontologico: 'Indique material, anestesia, látex u otro',
  alergia_medicamento: 'Indique cuáles medicamentos',
  aftas: 'Indique frecuencia o ubicación',
  dolor_dental: 'Indique ubicación y desde cuándo',
  sensibilidad: 'Indique a qué presenta sensibilidad',
};

const fichaDetailFields = Object.keys(fichaDetailPrompts).map(field => `${field}_detalle`);
const fichaRequiredSchema = Object.fromEntries(
  fichaCheckboxFields.map(field => [field, Joi.number().valid(0, 1).required()])
);
const fichaQuestionLabels = {
  enfermedad_corazon: 'Padece de alguna enfermedad del corazón',
  presion_alta_baja: 'Padece de presión alta o baja',
  diabetico: 'Es diabético/a',
  operaciones_recientes: 'Ha tenido operaciones en los últimos 6 meses',
  hepatitis: 'Ha tenido hepatitis',
  enfermedad_higado_rinones: 'Padece de alguna enfermedad de los riñones o hígado',
  convulsiones_desmayos: 'Sufre de convulsiones o desmayos',
  enfermedad_transmision_sexual: 'Ha tenido o tiene alguna enfermedad de transmisión sexual',
  alergias: 'Padece de alergias',
  enfermedad_respiratoria: 'Padece de alguna enfermedad respiratoria',
  embarazada: 'Se encuentra embarazada',
  artritis: 'Padece de artritis',
  fiebre_reumatica: 'Padece o ha padecido fiebre reumática',
  hemorragias_espontaneas: 'Sufre de hemorragias espontáneas',
  enfermedad_no_mencionada: 'Padece de alguna enfermedad no mencionada anteriormente',
  alergia_material_odontologico: 'Es alérgico/a a algún material odontológico',
  alergia_medicamento: 'Es alérgico/a a algún medicamento',
  aftas: 'Tiene fuegos o aftas dentro o fuera de la boca',
  sangrado_encias: 'Le sangran las encías',
  halitosis: 'Padece de halitosis o mal aliento',
  dolor_dental: 'Tiene dolor dental',
  sensibilidad: 'Tiene sensibilidad dental',
};

function normalizePacienteCreateBody(req, _res, next) {
  for (const field of fichaCheckboxFields) {
    if (typeof req.body[field] !== 'undefined') {
      req.body[field] = String(req.body[field]) === '1' ? 1 : 0;
    }
  }
  for (const field of fichaDetailFields) {
    const baseField = field.replace(/_detalle$/, '');
    req.body[field] = req.body[baseField] ? String(req.body[field] || '').trim() : '';
  }
  next();
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getAbsoluteUrl(req, pathname) {
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  return `${proto}://${host}${pathname}`;
}

function wantsJsonResponse(req) {
  return req.xhr
    || req.get('x-requested-with') === 'XMLHttpRequest'
    || String(req.get('accept') || '').includes('application/json');
}

function sendPreregisterError(req, res, message, statusCode = 400) {
  if (wantsJsonResponse(req)) {
    return res.status(statusCode).json({ ok: false, error: message });
  }
  return res.redirect(`/admin/add-patient?error=${encodeURIComponent(message)}`);
}

function calculateAge(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const birthDate = new Date(fechaNacimiento);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const hasNotHadBirthday = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate());
  if (hasNotHadBirthday) age -= 1;
  return age >= 0 ? age : null;
}

async function tableHasColumn(tableName, columnName) {
  const rows = await query(
    `SELECT 1
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [tableName, columnName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function tableExists(tableName) {
  const rows = await query(
    `SELECT 1
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      LIMIT 1`,
    [tableName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function patientBloodTypeColumn() {
  return (await tableHasColumn('paciente', 'tipoSangre')) ? 'tipoSangre' : null;
}

async function fichaDetailsColumn() {
  return (await tableHasColumn('fichamedica', 'ficha_respuestas_json')) ? 'ficha_respuestas_json' : null;
}

function formatDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

async function loadPatientList() {
  const bloodColumn = await patientBloodTypeColumn();
  const pacientes = await query(
    `SELECT p.idPaciente, p.nombre, p.apellido, p.telefono, p.email, p.edad, p.fechaNacimiento,
            p.direccion, p.nit, p.dpi, p.idestado,
            ${bloodColumn ? `p.${bloodColumn}` : 'NULL'} AS tipoSangre,
            g.nombre AS genero_nombre,
            tp.nombre AS tipo_paciente,
            ep.nombre AS estado_nombre,
            cs.ultima_cita,
            COALESCE(cs.total_citas, 0) AS total_citas
       FROM paciente p
       LEFT JOIN genero g ON g.idGenero = p.genero_idGenero
       LEFT JOIN tipopaciente tp ON tp.idtipoPaciente = p.tipoPaciente_idtipoPaciente
       LEFT JOIN estadopaciente ep ON ep.idestado = p.idestado
       LEFT JOIN (
          SELECT c.paciente_idPaciente,
                 MAX(CASE
                       WHEN LOWER(COALESCE(ec.nombre, '')) IN ('finalizada', 'atendida')
                       THEN COALESCE(ca.finalized_at, TIMESTAMP(c.fechaCita, COALESCE(c.horaCita, '00:00:00')))
                       WHEN TIMESTAMP(c.fechaCita, COALESCE(c.horaCita, '00:00:00')) <= NOW()
                            AND LOWER(COALESCE(ec.nombre, '')) <> 'cancelada'
                       THEN TIMESTAMP(c.fechaCita, COALESCE(c.horaCita, '00:00:00'))
                     END) AS ultima_cita,
                 COUNT(*) AS total_citas
            FROM cita c
            LEFT JOIN estadocita ec ON ec.idestadoCita = c.estadoCita_idestadoCita
            LEFT JOIN consulta_activa ca ON ca.cita_idcita = c.idcita
           GROUP BY c.paciente_idPaciente
       ) cs ON cs.paciente_idPaciente = p.idPaciente
      WHERE COALESCE(p.idestado, 1) = 1
      ORDER BY p.idPaciente DESC`
  );

  const [stats] = await query(
    `SELECT
        SUM(CASE WHEN COALESCE(idestado, 1) = 1 THEN 1 ELSE 0 END) AS activos,
        SUM(CASE WHEN COALESCE(idestado, 1) <> 1 THEN 1 ELSE 0 END) AS inactivos,
        COUNT(*) AS total
       FROM paciente`
  );

  return {
    pacientes,
    stats: {
      activos: Number(stats?.activos || 0),
      inactivos: Number(stats?.inactivos || 0),
      total: Number(stats?.total || 0),
    },
  };
}

async function loadPatientDashboard(idPaciente) {
  const [paciente] = await query(
    `SELECT p.*,
            g.nombre AS genero_nombre,
            tp.nombre AS tipo_paciente,
            ep.nombre AS estado_nombre,
            fm.*,
            ce.nombre AS emergencia_nombre,
            ce.numero AS emergencia_numero,
            ce.parentesco AS emergencia_parentesco
       FROM paciente p
       LEFT JOIN genero g ON g.idGenero = p.genero_idGenero
       LEFT JOIN tipopaciente tp ON tp.idtipoPaciente = p.tipoPaciente_idtipoPaciente
       LEFT JOIN estadopaciente ep ON ep.idestado = p.idestado
       LEFT JOIN fichamedica fm ON fm.idFicha = p.fichaMedica_idfichaMedica
       LEFT JOIN contactoemergencia ce ON ce.paciente_idPaciente = p.idPaciente
      WHERE p.idPaciente = ?
      LIMIT 1`,
    [idPaciente]
  );

  if (!paciente) return null;

  const citas = await query(
    `SELECT c.idcita, c.fechaCita, c.horaCita, c.motivoCita, c.notasAdicionales,
            ec.nombre AS estado_cita,
            d.nombre AS doctor_nombre, d.apellido AS doctor_apellido,
            ca.idconsultaActiva, ca.estado AS consulta_activa_estado, ca.finalized_at
       FROM cita c
       LEFT JOIN estadocita ec ON ec.idestadoCita = c.estadoCita_idestadoCita
       LEFT JOIN doctor d ON d.iddoctor = c.doctor_iddoctor
       LEFT JOIN consulta_activa ca ON ca.cita_idcita = c.idcita
      WHERE c.paciente_idPaciente = ?
      ORDER BY c.fechaCita DESC, c.horaCita DESC
      LIMIT 10`,
    [idPaciente]
  );

  const historial = await query(
    `SELECT hc.idhistorialClinico, hc.fecharegistro,
            co.nopieza, co.descripcion, co.proximaCita,
            s.nombre AS servicio_nombre,
            ts.nombre AS tipo_servicio_nombre,
            d.nombre AS doctor_nombre, d.apellido AS doctor_apellido
       FROM historial_clinico hc
       JOIN consulta co ON co.idconsulta = hc.consulta_idconsulta
       JOIN cita ci ON ci.idcita = co.cita_idcita
       LEFT JOIN servicio s ON s.idservicio = co.servicio_idservicio
       LEFT JOIN tiposervicio ts ON ts.idtipoServicio = co.tiposervicio_idtiposervicio
       LEFT JOIN doctor d ON d.iddoctor = hc.doctor_iddoctor
      WHERE ci.paciente_idPaciente = ?
      ORDER BY hc.fecharegistro DESC
      LIMIT 12`,
    [idPaciente]
  );

  const [recentConsultation] = await query(
    `SELECT ca.idconsultaActiva, ca.cita_idcita, ca.motivoConsulta, ca.sintomas, ca.observaciones,
            ca.evolucion, ca.diagnosticoPrincipal, ca.diagnosticoSecundario, ca.tratamiento,
            ca.proximaCita, ca.finalized_at,
            c.fechaCita, c.horaCita, c.motivoCita,
            d.nombre AS doctor_nombre, d.apellido AS doctor_apellido
       FROM consulta_activa ca
       JOIN cita c ON c.idcita = ca.cita_idcita
       LEFT JOIN doctor d ON d.iddoctor = ca.doctor_iddoctor
      WHERE ca.paciente_idPaciente = ?
        AND ca.estado = 'finalizada'
      ORDER BY ca.finalized_at DESC, ca.updated_at DESC
      LIMIT 1`,
    [idPaciente]
  );

  let recentTreatment = null;
  if (recentConsultation) {
    const [medicamentos, archivos, cotizaciones] = await Promise.all([
      query(
        `SELECT idmedicamento, nombre, dosis, frecuencia, duracion
           FROM consulta_activa_medicamentos
          WHERE consulta_activa_id = ?
          ORDER BY idmedicamento ASC`,
        [recentConsultation.idconsultaActiva]
      ),
      query(
        `SELECT idarchivoConsulta, nombre_original, ruta, mime_type, tamano, created_at
           FROM consulta_activa_archivos
          WHERE consulta_activa_id = ?
          ORDER BY created_at DESC`,
        [recentConsultation.idconsultaActiva]
      ),
      query(
        `SELECT id_cotizacion, fecha_cotizacion, costo_total, estado
           FROM cotizaciones
          WHERE consulta_activa_id = ?
          ORDER BY id_cotizacion DESC`,
        [recentConsultation.idconsultaActiva]
      ),
    ]);
    recentTreatment = { ...recentConsultation, medicamentos, archivos, cotizaciones };
  }

  const patientFilesRows = await query(
    `SELECT a.idarchivoConsulta, a.nombre_original, a.ruta, a.mime_type, a.tamano, a.created_at,
            ca.idconsultaActiva, ca.cita_idcita
       FROM consulta_activa_archivos a
       JOIN consulta_activa ca ON ca.idconsultaActiva = a.consulta_activa_id
      WHERE ca.paciente_idPaciente = ?
      ORDER BY a.created_at DESC`,
    [idPaciente]
  );
  const storedFiles = await listPatientStoredFiles(idPaciente);
  const seenFiles = new Set();
  const patientFiles = patientFilesRows
    .concat(storedFiles)
    .filter(file => {
      const key = String(file.ruta || '');
      if (!key || seenFiles.has(key)) return false;
      seenFiles.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const medicalFlags = fichaCheckboxFields
    .filter(field => Number(paciente[field] || 0) === 1)
    .map(field => fichaQuestionLabels[field] || field.replace(/_/g, ' '));

  return {
    paciente: {
      ...paciente,
      fichaDetalles: parseJsonObject(paciente.ficha_respuestas_json),
      fechaNacimientoInput: formatDateValue(paciente.fechaNacimiento),
      edad: paciente.edad || calculateAge(paciente.fechaNacimiento),
    },
    citas,
    historial,
    recentTreatment,
    patientFiles,
    medicalFlags,
  };
}

function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function buildFichaDetails(body) {
  return fichaCheckboxFields.reduce((acc, field) => {
    const detail = String(body[`${field}_detalle`] || '').trim();
    if (Number(body[field] || 0) === 1 && detail) acc[field] = detail;
    return acc;
  }, {});
}

function missingFichaDetailMessages(body) {
  return Object.entries(fichaDetailPrompts)
    .filter(([field]) => Number(body[field] || 0) === 1 && !String(body[`${field}_detalle`] || '').trim())
    .map(([, prompt]) => prompt);
}

function ensureFichaDetailsComplete(req, res, next) {
  const missing = missingFichaDetailMessages(req.body);
  if (missing.length) {
    return res.status(400).json({
      message: 'Completa las explicaciones de la ficha médica',
      errors: missing,
    });
  }
  return next();
}

function buildPatientPrefill(data = {}) {
  const fichaDetalles = parseJsonObject(data.fichaDetalles || data.ficha_respuestas_json);
  return {
    ...data,
    fichaDetalles,
    fechaNacimientoInput: formatDateValue(data.fechaNacimiento) || data.fechaNacimiento || '',
  };
}

async function loadPendingPatientPreregisters() {
  if (!(await tableExists('paciente_preregistro'))) return [];
  const rows = await query(
    `SELECT id, nombre_referencia, email, telefono, estado, created_at, expires_at, submitted_at
       FROM paciente_preregistro
      WHERE estado IN ('pendiente', 'completado')
      ORDER BY COALESCE(submitted_at, created_at) DESC
      LIMIT 10`
  );
  return rows;
}

async function loadPatientFormOptions() {
  const [generos, tiposPaciente] = await Promise.all([
    query('SELECT idGenero, nombre FROM genero ORDER BY nombre'),
    query('SELECT idtipoPaciente, nombre FROM tipopaciente ORDER BY nombre'),
  ]);
  return { generos, tiposPaciente };
}

/* ========== Pacientes ========== */
const pacienteCreateSchema = Joi.object({
  preregistroId: Joi.number().integer().positive().allow(null).empty(''),
  nombre: Joi.string().required(),
  apellido: Joi.string().required(),
  telefono: Joi.string().required(),
  email: Joi.string().email().required(),
  edad: Joi.number().integer().min(0).allow(null).empty(''),
  fechaNacimiento: Joi.date().required(),
  tipoSangre: Joi.string().trim().allow('', null).max(5),
  direccion: Joi.string().required(),
  nit: Joi.string().allow('', null),
  dpi: Joi.string().allow('', null),
  genero_idGenero: Joi.number().integer().required(),
  tipoPaciente_idtipoPaciente: Joi.number().integer().required(),
  // Ficha médica
  enfermedad_corazon: Joi.number().valid(0,1).default(0),
  presion_alta_baja: Joi.number().valid(0,1).default(0),
  diabetico: Joi.number().valid(0,1).default(0),
  operaciones_recientes: Joi.number().valid(0,1).default(0),
  hepatitis: Joi.number().valid(0,1).default(0),
  enfermedad_higado_rinones: Joi.number().valid(0,1).default(0),
  convulsiones_desmayos: Joi.number().valid(0,1).default(0),
  enfermedad_transmision_sexual: Joi.number().valid(0,1).default(0),
  alergias: Joi.number().valid(0,1).default(0),
  enfermedad_respiratoria: Joi.number().valid(0,1).default(0),
  embarazada: Joi.number().valid(0,1).default(0),
  artritis: Joi.number().valid(0,1).default(0),
  fiebre_reumatica: Joi.number().valid(0,1).default(0),
  hemorragias_espontaneas: Joi.number().valid(0,1).default(0),
  enfermedad_no_mencionada: Joi.number().valid(0,1).default(0),
  alergia_material_odontologico: Joi.number().valid(0,1).default(0),
  alergia_medicamento: Joi.number().valid(0,1).default(0),
  aftas: Joi.number().valid(0,1).default(0),
  sangrado_encias: Joi.number().valid(0,1).default(0),
  halitosis: Joi.number().valid(0,1).default(0),
  dolor_dental: Joi.number().valid(0,1).default(0),
  sensibilidad: Joi.number().valid(0,1).default(0),
  ...fichaRequiredSchema,
  ultima_visita_dentista: Joi.string().allow('', null),
  tratamiento_realizado: Joi.string().allow('', null),
  ...Object.fromEntries(fichaDetailFields.map(field => [field, Joi.string().trim().allow('', null).max(500)])),
  contactoemergencia_nombre: Joi.string().required(),
  contactoemergencia_numero: Joi.string().required(),
  contactoemergencia_parentesco: Joi.string().required(),
});

const pacienteEditSchema = Joi.object({
  idPaciente: Joi.number().integer().positive().required(),
  nombre: Joi.string().required(),
  apellido: Joi.string().required(),
  telefono: Joi.string().required(),
  email: Joi.string().email().required(),
  edad: Joi.number().integer().min(0).allow(null).empty(''),
  fechaNacimiento: Joi.date().required(),
  tipoSangre: Joi.string().trim().allow('', null).max(5),
  direccion: Joi.string().required(),
  nit: Joi.string().allow('', null),
  dpi: Joi.string().allow('', null),
  genero_idGenero: Joi.number().integer().required(),
  tipoPaciente_idtipoPaciente: Joi.number().integer().required(),
  enfermedad_corazon: Joi.number().valid(0,1).default(0),
  presion_alta_baja: Joi.number().valid(0,1).default(0),
  diabetico: Joi.number().valid(0,1).default(0),
  operaciones_recientes: Joi.number().valid(0,1).default(0),
  hepatitis: Joi.number().valid(0,1).default(0),
  enfermedad_higado_rinones: Joi.number().valid(0,1).default(0),
  convulsiones_desmayos: Joi.number().valid(0,1).default(0),
  enfermedad_transmision_sexual: Joi.number().valid(0,1).default(0),
  alergias: Joi.number().valid(0,1).default(0),
  enfermedad_respiratoria: Joi.number().valid(0,1).default(0),
  embarazada: Joi.number().valid(0,1).default(0),
  artritis: Joi.number().valid(0,1).default(0),
  fiebre_reumatica: Joi.number().valid(0,1).default(0),
  hemorragias_espontaneas: Joi.number().valid(0,1).default(0),
  enfermedad_no_mencionada: Joi.number().valid(0,1).default(0),
  alergia_material_odontologico: Joi.number().valid(0,1).default(0),
  alergia_medicamento: Joi.number().valid(0,1).default(0),
  aftas: Joi.number().valid(0,1).default(0),
  sangrado_encias: Joi.number().valid(0,1).default(0),
  halitosis: Joi.number().valid(0,1).default(0),
  dolor_dental: Joi.number().valid(0,1).default(0),
  sensibilidad: Joi.number().valid(0,1).default(0),
  ...fichaRequiredSchema,
  ultima_visita_dentista: Joi.string().allow('', null),
  tratamiento_realizado: Joi.string().allow('', null),
  ...Object.fromEntries(fichaDetailFields.map(field => [field, Joi.string().trim().allow('', null).max(500)])),
  contactoemergencia_nombre: Joi.string().required(),
  contactoemergencia_numero: Joi.string().required(),
  contactoemergencia_parentesco: Joi.string().required(),
});

const preregistroCreateSchema = Joi.object({
  nombre_referencia: Joi.string().trim().allow('', null).max(160),
  email: Joi.string().trim().email().allow('', null).max(160),
  telefono: Joi.string().trim().allow('', null).max(30),
  vigencia_dias: Joi.number().integer().min(1).max(30).default(7),
});

// Lista
router.get(['/admin/pacientes', '/admin/patients-list', '/admin/my-patients'], isAuthenticated, canViewPatients, async (req, res, next) => {
  try {
    const { pacientes, stats } = await loadPatientList();
    const adminProfile = await getAdminProfile(req.session.user);
    res.render('admin/patients-list', { pacientes, stats, adminProfile });
  } catch (e) { next(e); }
});

router.get(['/admin/pacientes/agregar', '/admin/add-patient'], isAuthenticated, canCreatePatients, async (req, res, next) => {
  try {
    const [adminProfile, options, preregistrosPendientes] = await Promise.all([
      getAdminProfile(req.session.user),
      loadPatientFormOptions(),
      loadPendingPatientPreregisters(),
    ]);
    res.render('admin/add-patient', {
      adminProfile,
      ...options,
      preregistrosPendientes,
      generatedPreregisterLink: req.query.prelink || null,
      prefillPaciente: {},
      preregistroId: null,
      error: req.query.error || null,
    });
  } catch (e) { next(e); }
});

router.post('/admin/pacientes/pre-registro', isAuthenticated, canCreatePatients, async (req, res, next) => {
  const { error, value } = preregistroCreateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) return sendPreregisterError(req, res, 'Datos de pre-registro inválidos');

  try {
    if (!(await tableExists('paciente_preregistro'))) {
      return sendPreregisterError(req, res, 'Falta crear la tabla paciente_preregistro', 409);
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + value.vigencia_dias * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO paciente_preregistro
        (token_hash, estado, nombre_referencia, email, telefono, creado_por_usuario_id, expires_at)
       VALUES (?, 'pendiente', ?, ?, ?, ?, ?)`,
      [
        tokenHash,
        value.nombre_referencia || null,
        value.email || null,
        value.telefono || null,
        req.session.user?.idusuario || req.session.user?.id || null,
        expiresAt,
      ]
    );

    const link = getAbsoluteUrl(req, `/pacientes/pre-registro/${token}`);
    if (wantsJsonResponse(req)) {
      return res.json({
        ok: true,
        link,
        expiresAt: expiresAt.toISOString(),
        message: 'Enlace de pre-registro generado.',
      });
    }
    res.redirect(`/admin/add-patient?prelink=${encodeURIComponent(link)}`);
  } catch (e) { next(e); }
});

router.get('/pacientes/pre-registro/:token', validate(tokenParam, 'params'), async (req, res, next) => {
  try {
    const [row] = await query(
      `SELECT id, nombre_referencia, email, telefono, estado, expires_at
         FROM paciente_preregistro
        WHERE token_hash=?
        LIMIT 1`,
      [hashToken(req.params.token)]
    );

    if (!row || row.estado !== 'pendiente' || new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(404).render('public/pre-registro-paciente', {
        token: null,
        solicitud: null,
        generos: [],
        tiposPaciente: [],
        formData: {},
        error: 'Este enlace no existe, ya fue usado o venció.',
        completed: false,
      });
    }

    const options = await loadPatientFormOptions();
    res.render('public/pre-registro-paciente', {
      token: req.params.token,
      solicitud: row,
      ...options,
      formData: {
        nombre: row.nombre_referencia || '',
        email: row.email || '',
        telefono: row.telefono || '',
      },
      error: null,
      completed: false,
    });
  } catch (e) { next(e); }
});

router.post('/pacientes/pre-registro/:token', validate(tokenParam, 'params'), async (req, res, next) => {
  const tokenHash = hashToken(req.params.token);
  try {
    const [row] = await query(
      `SELECT id, estado, expires_at
         FROM paciente_preregistro
        WHERE token_hash=?
        LIMIT 1`,
      [tokenHash]
    );

    const options = await loadPatientFormOptions();
    const renderForm = (errorMessage) => res.status(400).render('public/pre-registro-paciente', {
      token: req.params.token,
      solicitud: row || null,
      ...options,
      formData: req.body,
      error: errorMessage,
      completed: false,
    });

    if (!row || row.estado !== 'pendiente' || new Date(row.expires_at).getTime() < Date.now()) {
      return renderForm('Este enlace no existe, ya fue usado o venció.');
    }

    for (const field of fichaCheckboxFields) {
      if (typeof req.body[field] !== 'undefined') {
        req.body[field] = String(req.body[field]) === '1' ? 1 : 0;
      }
    }
    for (const field of fichaDetailFields) {
      const baseField = field.replace(/_detalle$/, '');
      req.body[field] = req.body[baseField] ? String(req.body[field] || '').trim() : '';
    }

    const { error, value } = pacienteCreateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return renderForm('Revisa los campos obligatorios antes de enviar la ficha.');
    const missingDetails = missingFichaDetailMessages(value);
    if (missingDetails.length) return renderForm(`Completa estas explicaciones: ${missingDetails.join(', ')}`);

    await query(
      `UPDATE paciente_preregistro
          SET estado='completado', datos_json=?, submitted_at=NOW()
        WHERE id=?`,
      [JSON.stringify({ ...value, fichaDetalles: buildFichaDetails(value) }), row.id]
    );

    res.render('public/pre-registro-paciente', {
      token: null,
      solicitud: row,
      ...options,
      formData: {},
      error: null,
      completed: true,
    });
  } catch (e) { next(e); }
});

router.get('/admin/pacientes/pre-registros/:id/crear', isAuthenticated, canCreatePatients, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const [row] = await query(
      `SELECT id, datos_json, estado
         FROM paciente_preregistro
        WHERE id=? AND estado='completado'
        LIMIT 1`,
      [req.params.id]
    );
    if (!row) return res.redirect('/admin/add-patient?error=Pre-registro%20no%20encontrado%20o%20sin%20completar');

    const [adminProfile, options, preregistrosPendientes] = await Promise.all([
      getAdminProfile(req.session.user),
      loadPatientFormOptions(),
      loadPendingPatientPreregisters(),
    ]);

    res.render('admin/add-patient', {
      adminProfile,
      ...options,
      preregistrosPendientes,
      generatedPreregisterLink: null,
      prefillPaciente: buildPatientPrefill(parseJsonObject(row.datos_json)),
      preregistroId: row.id,
      error: null,
    });
  } catch (e) { next(e); }
});

// Agregar (transacción)
router.post('/admin/pacientes/agregar', isAuthenticated, canCreatePatients, normalizePacienteCreateBody, validate(pacienteCreateSchema), ensureFichaDetailsComplete, async (req, res, next) => {
  const p = req.body;
  const edad = Number.isInteger(p.edad) ? p.edad : calculateAge(p.fechaNacimiento);
  const bloodColumn = await patientBloodTypeColumn();
  const detailsColumn = await fichaDetailsColumn();
  const fichaDetalles = buildFichaDetails(p);
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rF] = await conn.execute(
      `INSERT INTO fichamedica (enfermedad_corazon, presion_alta_baja, diabetico, operaciones_recientes, hepatitis,
        enfermedad_higado_rinones, convulsiones_desmayos, enfermedad_transmision_sexual, alergias,
        enfermedad_respiratoria, embarazada, artritis, fiebre_reumatica, hemorragias_espontaneas,
        enfermedad_no_mencionada, alergia_material_odontologico, alergia_medicamento, aftas,
        sangrado_encias, halitosis, dolor_dental, sensibilidad,
        ultima_visita_dentista, tratamiento_realizado)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        p.enfermedad_corazon, p.presion_alta_baja, p.diabetico, p.operaciones_recientes, p.hepatitis,
        p.enfermedad_higado_rinones, p.convulsiones_desmayos, p.enfermedad_transmision_sexual, p.alergias,
        p.enfermedad_respiratoria, p.embarazada, p.artritis, p.fiebre_reumatica, p.hemorragias_espontaneas,
        p.enfermedad_no_mencionada, p.alergia_material_odontologico, p.alergia_medicamento, p.aftas,
        p.sangrado_encias, p.halitosis, p.dolor_dental, p.sensibilidad,
        p.ultima_visita_dentista || null, p.tratamiento_realizado || null
      ]
    );
    const fichaId = rF.insertId;

    if (detailsColumn) {
      await conn.execute(
        `UPDATE fichamedica SET ${detailsColumn}=? WHERE idFicha=?`,
        [JSON.stringify(fichaDetalles), fichaId]
      );
    }

    const patientColumns = ['nombre', 'apellido', 'telefono', 'email', 'edad', 'fechaNacimiento'];
    const patientValues = [p.nombre, p.apellido, p.telefono, p.email, edad, p.fechaNacimiento || null];
    if (bloodColumn) {
      patientColumns.push(bloodColumn);
      patientValues.push(p.tipoSangre || null);
    }
    patientColumns.push('direccion', 'nit', 'dpi', 'genero_idGenero', 'tipoPaciente_idtipoPaciente', 'fichaMedica_idfichaMedica', 'idestado');
    patientValues.push(p.direccion, p.nit, p.dpi, p.genero_idGenero, p.tipoPaciente_idtipoPaciente, fichaId, 1);

    const [rP] = await conn.execute(
      `INSERT INTO paciente (${patientColumns.join(', ')})
       VALUES (${patientColumns.map(() => '?').join(', ')})`,
      patientValues
    );
    const idPaciente = rP.insertId;

    await conn.execute(
      'INSERT INTO contactoemergencia (nombre, numero, parentesco, paciente_idPaciente) VALUES (?, ?, ?, ?)',
      [p.contactoemergencia_nombre, p.contactoemergencia_numero, p.contactoemergencia_parentesco, idPaciente]
    );

    if (p.preregistroId) {
      await conn.execute(
        `UPDATE paciente_preregistro
            SET estado='aprobado', paciente_idPaciente=?, approved_at=NOW()
          WHERE id=?`,
        [idPaciente, p.preregistroId]
      );
    }

    await conn.commit();
    res.redirect(`/admin/pacientes/ver/${idPaciente}`);
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

// Ver uno
router.get('/admin/pacientes/ver/:id', isAuthenticated, canViewPatients, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const data = await loadPatientDashboard(req.params.id);
    if (!data) return res.status(404).send('Paciente no encontrado');
    const adminProfile = await getAdminProfile(req.session.user);
    res.render('admin/patient-dashboard', { ...data, adminProfile });
  } catch (e) { next(e); }
});

router.get('/admin/patient-dashboard/:id', isAuthenticated, canViewPatients, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const data = await loadPatientDashboard(req.params.id);
    if (!data) return res.status(404).send('Paciente no encontrado');
    const adminProfile = await getAdminProfile(req.session.user);
    res.render('admin/patient-dashboard', { ...data, adminProfile });
  } catch (e) { next(e); }
});

router.get(['/admin/pacientes/editar/:id', '/admin/edit-patient/:id'], isAuthenticated, canEditPatients, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const [data, adminProfile, options] = await Promise.all([
      loadPatientDashboard(req.params.id),
      getAdminProfile(req.session.user),
      loadPatientFormOptions(),
    ]);
    if (!data) return res.status(404).send('Paciente no encontrado');
    res.render('admin/edit-patient', {
      ...data,
      adminProfile,
      ...options,
      error: req.query.error || null,
      saved: req.query.saved === '1',
    });
  } catch (e) { next(e); }
});

router.get('/admin/edit-patient', isAuthenticated, canViewPatients, (_req, res) => {
  res.redirect('/admin/pacientes');
});

// Editar
router.post('/admin/pacientes/editar', isAuthenticated, canEditPatients, normalizePacienteCreateBody, validate(pacienteEditSchema), ensureFichaDetailsComplete, async (req, res, next) => {
  const p = req.body;
  const edad = Number.isInteger(p.edad) ? p.edad : calculateAge(p.fechaNacimiento);
  const bloodColumn = await patientBloodTypeColumn();
  const detailsColumn = await fichaDetailsColumn();
  const fichaDetalles = buildFichaDetails(p);
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[pacienteActual]] = await conn.execute(
      'SELECT fichaMedica_idfichaMedica FROM paciente WHERE idPaciente=? LIMIT 1',
      [p.idPaciente]
    );
    if (!pacienteActual) {
      await conn.rollback();
      return res.status(404).send('Paciente no encontrado');
    }

    let fichaId = pacienteActual.fichaMedica_idfichaMedica;
    const fichaValues = [
      p.enfermedad_corazon, p.presion_alta_baja, p.diabetico, p.operaciones_recientes, p.hepatitis,
      p.enfermedad_higado_rinones, p.convulsiones_desmayos, p.enfermedad_transmision_sexual, p.alergias,
      p.enfermedad_respiratoria, p.embarazada, p.artritis, p.fiebre_reumatica, p.hemorragias_espontaneas,
      p.enfermedad_no_mencionada, p.alergia_material_odontologico, p.alergia_medicamento, p.aftas,
      p.sangrado_encias, p.halitosis, p.dolor_dental, p.sensibilidad,
      p.ultima_visita_dentista || null, p.tratamiento_realizado || null
    ];

    if (!fichaId) {
      const [rF] = await conn.execute(
        `INSERT INTO fichamedica (enfermedad_corazon, presion_alta_baja, diabetico, operaciones_recientes, hepatitis,
          enfermedad_higado_rinones, convulsiones_desmayos, enfermedad_transmision_sexual, alergias,
          enfermedad_respiratoria, embarazada, artritis, fiebre_reumatica, hemorragias_espontaneas,
          enfermedad_no_mencionada, alergia_material_odontologico, alergia_medicamento, aftas,
          sangrado_encias, halitosis, dolor_dental, sensibilidad,
          ultima_visita_dentista, tratamiento_realizado)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        fichaValues
      );
      fichaId = rF.insertId;
    } else {
      await conn.execute(
        `UPDATE fichamedica
            SET enfermedad_corazon=?, presion_alta_baja=?, diabetico=?, operaciones_recientes=?, hepatitis=?,
                enfermedad_higado_rinones=?, convulsiones_desmayos=?, enfermedad_transmision_sexual=?, alergias=?,
                enfermedad_respiratoria=?, embarazada=?, artritis=?, fiebre_reumatica=?, hemorragias_espontaneas=?,
                enfermedad_no_mencionada=?, alergia_material_odontologico=?, alergia_medicamento=?, aftas=?,
                sangrado_encias=?, halitosis=?, dolor_dental=?, sensibilidad=?,
                ultima_visita_dentista=?, tratamiento_realizado=?
          WHERE idFicha=?`,
        [...fichaValues, fichaId]
      );
    }

    if (detailsColumn) {
      await conn.execute(
        `UPDATE fichamedica SET ${detailsColumn}=? WHERE idFicha=?`,
        [JSON.stringify(fichaDetalles), fichaId]
      );
    }

    const patientAssignments = ['nombre=?', 'apellido=?', 'telefono=?', 'email=?', 'edad=?', 'fechaNacimiento=?'];
    const patientValues = [p.nombre, p.apellido, p.telefono, p.email, edad, p.fechaNacimiento || null];
    if (bloodColumn) {
      patientAssignments.push(`${bloodColumn}=?`);
      patientValues.push(p.tipoSangre || null);
    }
    patientAssignments.push('direccion=?', 'nit=?', 'dpi=?', 'genero_idGenero=?', 'tipoPaciente_idtipoPaciente=?', 'fichaMedica_idfichaMedica=?');
    patientValues.push(p.direccion, p.nit, p.dpi, p.genero_idGenero, p.tipoPaciente_idtipoPaciente, fichaId, p.idPaciente);

    await conn.execute(
      `UPDATE paciente
          SET ${patientAssignments.join(', ')}
        WHERE idPaciente=?`,
      patientValues
    );

    const [[contactoActual]] = await conn.execute(
      'SELECT idContactoEmergencia FROM contactoemergencia WHERE paciente_idPaciente=? LIMIT 1',
      [p.idPaciente]
    );
    if (contactoActual) {
      await conn.execute(
        'UPDATE contactoemergencia SET nombre=?, numero=?, parentesco=? WHERE idContactoEmergencia=?',
        [p.contactoemergencia_nombre, p.contactoemergencia_numero, p.contactoemergencia_parentesco, contactoActual.idContactoEmergencia]
      );
    } else {
      await conn.execute(
        'INSERT INTO contactoemergencia (nombre, numero, parentesco, paciente_idPaciente) VALUES (?, ?, ?, ?)',
        [p.contactoemergencia_nombre, p.contactoemergencia_numero, p.contactoemergencia_parentesco, p.idPaciente]
      );
    }

    await conn.commit();
    res.redirect(`/admin/pacientes/ver/${p.idPaciente}`);
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

// Ficha médica
router.get(['/api/admin/pacientes/fichamedica/:id', '/api/fichamedica/:id'], isAuthenticated, canViewPatients, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const [ficha] = await query('SELECT * FROM fichamedica WHERE idFicha=?', [req.params.id]);
    res.json(ficha || {});
  } catch (e) { next(e); }
});

// Archivar / Desarchivar
router.put(['/api/admin/pacientes/:id/archivar', '/api/pacientes/archivar/:id'], isAuthenticated, canArchivePatients, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const r = await query('UPDATE paciente SET idestado=2 WHERE idPaciente=?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
    res.json({ success: true });
  } catch (e) { next(e); }
});
router.put(['/api/admin/pacientes/:id/desarchivar', '/api/archivados/archivar/:id'], isAuthenticated, canArchivePatients, validate(idParam, 'params'), async (req, res, next) => {
  try {
    const r = await query('UPDATE paciente SET idestado=1 WHERE idPaciente=?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.get('/admin/archivados', isAuthenticated, canViewPatients, async (_req, res, next) => {
  try {
    const pacientes = await query('SELECT * FROM paciente WHERE idestado=2 ORDER BY idPaciente DESC');
    res.render('admin/archivados', { pacientes });
  } catch (e) { next(e); }
});

/* ========== Citas ========== */
const citasFilterSchema = Joi.object({
  filtro: Joi.string().valid('todas', 'rangoFecha').allow('', null).empty(''),
  fechaInicio: Joi.date().allow(null).empty(''),
  fechaFin: Joi.date().allow(null).empty(''),
  estadoCita: Joi.alternatives().try(Joi.string().valid('todas'), Joi.number().integer()).allow(null).empty(''),
});

const citaCreateSchema = Joi.object({
  fechaCita: Joi.date().required(),
  horaCita: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  motivoCita: Joi.string().trim().max(255).required(),
  notasAdicionales: Joi.string().trim().allow('', null).empty(''),
  paciente_idPaciente: Joi.number().integer().positive().required(),
  doctor_iddoctor: Joi.number().integer().positive().required(),
});

const citaEditSchema = citaCreateSchema.keys({
  estadoCita_idestadoCita: Joi.number().integer().positive().allow('', null).empty(''),
});

const disponibilidadQuerySchema = Joi.object({
  fecha: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  duracion: Joi.number().integer().min(5).max(240).default(30),
});

const consultaActivaFieldsSchema = Joi.object({
  motivoConsulta: Joi.string().allow('', null),
  sintomas: Joi.string().allow('', null),
  observaciones: Joi.string().allow('', null),
  evolucion: Joi.string().allow('', null),
  diagnosticoPrincipal: Joi.string().allow('', null),
  diagnosticoSecundario: Joi.string().allow('', null),
  tratamiento: Joi.string().allow('', null),
  proximaCita: Joi.date().allow('', null),
}).min(1);

const medicamentosConsultaSchema = Joi.object({
  medicamentos: Joi.array().items(Joi.object({
    nombre: Joi.string().allow('', null),
    dosis: Joi.string().allow('', null),
    frecuencia: Joi.string().allow('', null),
    duracion: Joi.string().allow('', null),
  })).default([]),
});

const materialesConsultaSchema = Joi.object({
  materiales: Joi.array().items(Joi.object({
    productoId: Joi.number().integer().positive().required(),
    servicioId: Joi.number().integer().positive().allow(null),
    tratamientoId: Joi.number().integer().positive().allow(null),
    cantidad: Joi.number().min(0.01).required(),
    motivo: Joi.string().allow('', null),
  })).default([]),
});

const cotizacionConsultaSchema = Joi.object({
  procedimientos: Joi.array().items(Joi.object({
    dientes: Joi.alternatives().try(
      Joi.string().valid('1-32'),
      Joi.array().items(Joi.string().trim().max(5)).min(1)
    ).required(),
    tipoServicio: Joi.number().integer().positive().required(),
    servicio: Joi.number().integer().positive().required(),
    piezaDental: Joi.string().allow('', null),
    diente: Joi.string().allow('', null),
    nombre: Joi.string().trim().allow('', null),
    descripcion: Joi.string().allow('', null),
    cantidad: Joi.number().min(1).default(1),
    precio: Joi.number().min(0).default(0),
  })).min(1).required(),
});

const consultaCotizacionParam = Joi.object({
  id: Joi.number().integer().positive().required(),
  cotizacionId: Joi.number().integer().positive().required(),
});

function formatDateValueForSql(value) {
  if (!value) return null;
  if (!(value instanceof Date)) {
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function todaySqlDate() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const allowedConsultationMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

function makeHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  error.expose = true;
  return error;
}

function isFullAppointmentAdmin(req) {
  const user = req.session?.user || {};
  const permissions = user.permissions || resLocalsPermissions(req) || [];
  return Number(user.rol || user.rol_idrol) === 1 || hasPermission(permissions, '*');
}

function resLocalsPermissions(req) {
  return req.res?.locals?.permissions || [];
}

async function getSessionDoctorId(user) {
  const userId = user?.id || user?.idusuario;
  if (!userId) return null;
  const [doctor] = await query(
    'SELECT iddoctor FROM doctor WHERE usuario_idusuario = ? LIMIT 1',
    [userId]
  );
  return doctor ? Number(doctor.iddoctor) : null;
}

async function buildAppointmentScope(req, adminProfile = {}) {
  const currentDoctorId = Number(adminProfile.doctorId || 0) || await getSessionDoctorId(req.session?.user);
  return {
    currentDoctorId: currentDoctorId || null,
    isAdmin: isFullAppointmentAdmin(req),
  };
}

async function ensureCanManageAppointment(req, appointmentId) {
  const [appointment] = await query(
    `SELECT idcita, DATE_FORMAT(fechaCita, '%Y-%m-%d') AS fechaCita,
            TIME_FORMAT(horaCita, '%H:%i') AS horaCita,
            doctor_iddoctor
       FROM cita
      WHERE idcita = ?
      LIMIT 1`,
    [appointmentId]
  );
  if (!appointment) throw makeHttpError(404, 'Cita no encontrada.');
  if (isFullAppointmentAdmin(req)) return appointment;

  const doctorId = await getSessionDoctorId(req.session?.user);
  if (doctorId && Number(appointment.doctor_iddoctor) === Number(doctorId)) return appointment;

  throw makeHttpError(403, 'Solo el administrador o el doctor asignado puede modificar esta cita.');
}

async function ensureCanManageConsultation(req, consultationId) {
  const [consultation] = await query(
    `SELECT idconsultaActiva, cita_idcita, doctor_iddoctor
       FROM consulta_activa
      WHERE idconsultaActiva = ?
      LIMIT 1`,
    [consultationId]
  );
  if (!consultation) throw makeHttpError(404, 'Consulta activa no encontrada.');
  if (isFullAppointmentAdmin(req)) return consultation;

  const doctorId = await getSessionDoctorId(req.session?.user);
  if (doctorId && Number(consultation.doctor_iddoctor) === Number(doctorId)) return consultation;

  throw makeHttpError(403, 'Solo el administrador o el doctor asignado puede modificar esta consulta.');
}

function sanitizeUploadName(name) {
  return path.basename(String(name || 'archivo')).replace(/[^\w.\- ]+/g, '_').trim() || 'archivo';
}

function patientFolderName(patientId) {
  return `PT${String(patientId || 0).padStart(4, '0')}`;
}

function patientDocumentPath(patientId, section, fileName) {
  const folder = patientFolderName(patientId);
  return {
    absoluteDir: path.join(process.cwd(), 'uploads', 'pacientes', folder, section),
    publicPath: `/uploads/pacientes/${folder}/${section}/${fileName}`,
  };
}

async function listPatientStoredFiles(patientId) {
  const sections = ['cotizaciones', 'recetas', 'archivos'];
  const files = [];

  for (const section of sections) {
    const { absoluteDir, publicPath } = patientDocumentPath(patientId, section, '');
    try {
      const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const ruta = `${publicPath}${encodeURIComponent(entry.name).replace(/%2F/g, '/')}`;
        const stat = await fs.stat(path.join(absoluteDir, entry.name));
        files.push({
          idarchivoConsulta: `fs-${section}-${entry.name}`,
          nombre_original: entry.name,
          ruta,
          mime_type: entry.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
          tamano: stat.size,
          created_at: stat.mtime,
        });
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  return files;
}

function parseMultipartUpload(req, maxBytes = 12 * 1024 * 1024) {
  const contentType = String(req.headers['content-type'] || '');
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return Promise.reject(makeHttpError(400, 'Solicitud de archivo no valida.'));
  const boundary = boundaryMatch[1] || boundaryMatch[2];

  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;

    const fail = error => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    req.on('data', chunk => {
      total += chunk.length;
      if (total > maxBytes) {
        fail(makeHttpError(413, 'El archivo supera el limite permitido.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('error', fail);
    req.on('end', () => {
      if (settled) return;
      settled = true;

      const raw = Buffer.concat(chunks).toString('latin1');
      const parts = raw.split(`--${boundary}`);
      const files = [];
      const fields = {};

      for (let part of parts) {
        if (!part || part === '--\r\n' || part === '--') continue;
        if (part.startsWith('\r\n')) part = part.slice(2);
        if (part.endsWith('\r\n')) part = part.slice(0, -2);
        if (part.endsWith('--')) part = part.slice(0, -2);

        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd < 0) continue;
        const headerBlock = part.slice(0, headerEnd);
        let body = part.slice(headerEnd + 4);
        if (body.endsWith('\r\n')) body = body.slice(0, -2);

        const disposition = headerBlock.match(/content-disposition:\s*form-data;([^\r\n]+)/i);
        if (!disposition) continue;
        const nameMatch = disposition[1].match(/name="([^"]+)"/i);
        const filenameMatch = disposition[1].match(/filename="([^"]*)"/i);
        const contentTypeMatch = headerBlock.match(/content-type:\s*([^\r\n]+)/i);
        const fieldName = nameMatch?.[1];
        if (!fieldName) continue;

        if (filenameMatch) {
          const originalName = sanitizeUploadName(filenameMatch[1]);
          if (!originalName) continue;
          files.push({
            fieldName,
            originalName,
            mimeType: String(contentTypeMatch?.[1] || 'application/octet-stream').trim().toLowerCase(),
            buffer: Buffer.from(body, 'latin1'),
          });
        } else {
          fields[fieldName] = Buffer.from(body, 'latin1').toString('utf8');
        }
      }

      resolve({ fields, files });
    });
  });
}

async function storeConsultationFile(file, patientId) {
  if (!file || !file.buffer?.length) throw makeHttpError(400, 'Selecciona un archivo para subir.');
  if (!allowedConsultationMimeTypes.has(file.mimeType)) {
    throw makeHttpError(400, 'Solo se permiten imagenes o PDF.');
  }

  const extension = path.extname(file.originalName).toLowerCase()
    || (file.mimeType === 'application/pdf' ? '.pdf' : '.bin');
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;
  const { absoluteDir, publicPath } = patientDocumentPath(patientId, 'archivos', fileName);
  await fs.mkdir(absoluteDir, { recursive: true });
  const absolutePath = path.join(absoluteDir, fileName);
  await fs.writeFile(absolutePath, file.buffer);

  return {
    originalName: file.originalName,
    fileName,
    publicPath,
    mimeType: file.mimeType,
    size: file.buffer.length,
  };
}

function money(value) {
  return `Q${Number(value || 0).toFixed(2)}`;
}

const QUOTATION_TAX_RATE = 0.12;
const CLINIC_DOCUMENT_INFO = {
  name: 'C&C Dental Studio',
  phone: '+502 3515-5503',
  email: 'castilloherbert@gmail.com',
  address: '9na Avenida, Apartamento B, Condominio Fuentes del Valle 2, zona 5 de Villa Nueva, Guatemala',
};
let clinicLogoBufferCache;

function quotationDetailSubtotal(item) {
  const stored = Number(item.costo_servicio || 0);
  if (stored > 0) return stored;
  return Number(item.cantidad || 1) * Number(item.precio || 0);
}

function quotationTotals(cotizacion) {
  const details = Array.isArray(cotizacion.detalles) ? cotizacion.detalles : [];
  const subtotal = Number((details.length
    ? details.reduce((sum, item) => sum + quotationDetailSubtotal(item), 0)
    : Number(cotizacion.subtotal || cotizacion.costo_total || 0)).toFixed(2));
  const impuestos = Number((subtotal * QUOTATION_TAX_RATE).toFixed(2));
  const total = Number((subtotal + impuestos).toFixed(2));
  return { subtotal, impuestos, total };
}

function getClinicLogoBuffer() {
  if (clinicLogoBufferCache !== undefined) return clinicLogoBufferCache;
  try {
    const svg = fsSync.readFileSync(path.join(process.cwd(), 'public', 'images', 'cnc-logo-alt.svg'), 'utf8');
    const match = svg.match(/data:image\/png;base64,([^"]+)/);
    clinicLogoBufferCache = match ? Buffer.from(match[1], 'base64') : null;
  } catch {
    clinicLogoBufferCache = null;
  }
  return clinicLogoBufferCache;
}

function preservePdfCursor(doc, draw) {
  const x = doc.x;
  const y = doc.y;
  draw();
  doc.x = x;
  doc.y = y;
}

function drawClinicWatermark(doc) {
  const logo = getClinicLogoBuffer();
  if (!logo) return;
  preservePdfCursor(doc, () => {
    doc.save();
    doc.opacity(0.055);
    doc.image(logo, (doc.page.width - 270) / 2, 252, { fit: [270, 185] });
    doc.restore();
  });
}

function drawDocumentFooter(doc) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.page.height - 64;
  preservePdfCursor(doc, () => {
    doc.save();
    doc.moveTo(left, y - 10).lineTo(left + width, y - 10).strokeColor('#dde2ee').stroke();
    doc.font('Helvetica').fontSize(8).fillColor('#4b5563')
      .text(`${CLINIC_DOCUMENT_INFO.name} | Tel. ${CLINIC_DOCUMENT_INFO.phone} | ${CLINIC_DOCUMENT_INFO.email}`, left, y, { width, align: 'center' });
    doc.text(CLINIC_DOCUMENT_INFO.address, left, y + 12, { width, align: 'center' });
    doc.restore();
  });
}

function drawQuotationHeader(doc) {
  const logo = getClinicLogoBuffer();
  drawClinicWatermark(doc);
  if (logo) doc.image(logo, doc.page.margins.left, 34, { fit: [54, 46] });
  doc.fontSize(18).fillColor('#7367f0').text(CLINIC_DOCUMENT_INFO.name, 108, 42);
  doc.moveDown(0.2);
  doc.fontSize(15).fillColor('#111827').text('Cotización', 108, doc.y);
  doc.moveTo(doc.page.margins.left, 96).lineTo(doc.page.width - doc.page.margins.right, 96).strokeColor('#dde2ee').stroke();
  doc.x = doc.page.margins.left;
  doc.y = 118;
}

const dentalPdfPaths = {
  molar: 'M 46 0 C 44 23 66 19 60 60 C 48 73 36 62 33 57 C 25 67 8 69 5 60 C 0 20 19 23 18 0 C 22.6667 7.3333 27.3333 14.6667 32 22 Z',
  canine: 'M 25 0 C 30 15 50 20 45 60 C 27 60 17 77 26 52 C 25 77 22 60 0 60 C 0 20 20 15 25 0 Z',
  premolar: 'M 25 0 C 30 15 50 20 45 60 C 25 72 22 77 25 65 C 29 77 25 72 0 60 C 0 20 20 15 25 0 Z',
  incisor: 'M 25 0 C 30 15 50 20 41 56 C 38 62 10 62 9 56 C 0 20 20 15 25 0 Z',
  wide: 'M 25 0 C 30 15 50 20 50 60 C 46 74 11 68 1 60 C 0 20 20 15 25 0 Z',
  lowerCanine: 'M 25 0 C 20 25 47 21 45 60 C 30 63 6 78 34 56 C 18 79 18 63 0 60 C -4 20 20 15 25 0 Z',
  lowerPremolar: 'M 25 0 C 30 15 50 20 46 60 C 45 62 43 63 41 63 C 28 63 42 56 31 60 C 29.3333 62.6667 26 66 19 60 C 13 58 21 64 5 60 C 0 20 20 15 25 0 Z',
  lowerWide: 'M 25 0 C 30 15 50 20 46 60 C 45 62 43 63 41 63 C 36 64 38 56 32 63 C 32 65 25 67 20 63 C 16 56 16 69 5 60 C 0 20 20 15 25 0 Z',
  lowerIncisor: 'M 25 0 C 30 15 40 22 40 60 C 34 60 15 60 10 60 C 10 22 20 15 25 0 Z',
};

const dentalPdfRows = [
  [
    ['1', '1', dentalPdfPaths.molar], ['2', '2', dentalPdfPaths.molar], ['3', '3', dentalPdfPaths.molar],
    ['4', '4a', dentalPdfPaths.canine], ['5', '5b', dentalPdfPaths.premolar], ['6', '6c', dentalPdfPaths.premolar],
    ['7', '7d', dentalPdfPaths.incisor], ['8', '8e', dentalPdfPaths.wide], ['9', '9f', dentalPdfPaths.wide],
    ['10', '10g', dentalPdfPaths.incisor], ['11', '11h', dentalPdfPaths.premolar], ['12', '12i', dentalPdfPaths.premolar],
    ['13', '13j', dentalPdfPaths.canine], ['14', '14', dentalPdfPaths.molar], ['15', '15', dentalPdfPaths.molar], ['16', '16', dentalPdfPaths.molar],
  ],
  [
    ['32', '32', dentalPdfPaths.molar, true], ['31', '31', dentalPdfPaths.molar, true], ['30', '30', dentalPdfPaths.molar, true],
    ['29', '29t', dentalPdfPaths.lowerCanine, true], ['28', '28s', dentalPdfPaths.lowerPremolar, true], ['27', '27r', dentalPdfPaths.lowerWide, true],
    ['26', '26q', dentalPdfPaths.incisor, true], ['25', '25p', dentalPdfPaths.lowerIncisor, true], ['24', '24o', dentalPdfPaths.lowerIncisor, true],
    ['23', '23n', dentalPdfPaths.incisor, true], ['22', '22m', dentalPdfPaths.lowerWide, true], ['21', '21l', dentalPdfPaths.lowerPremolar, true],
    ['20', '20k', dentalPdfPaths.lowerCanine, true], ['19', '19', dentalPdfPaths.molar, true], ['18', '18', dentalPdfPaths.molar, true], ['17', '17', dentalPdfPaths.molar, true],
  ],
];

function drawQuotationToothDiagram(doc, details) {
  const selected = new Set(details.map(item => String(item.diente || '').trim()).filter(value => value && value !== 'N/A'));
  const allSelected = selected.has('1-32');
  const startX = doc.page.margins.left;
  let y = doc.y + 8;
  const scale = 0.36;
  const toothWidth = 65 * scale;
  const toothHeight = 70 * scale;
  const gap = 8;

  doc.fontSize(12).fillColor('#1f2937').text('Diagrama dental', startX, y);
  y += 22;

  dentalPdfRows.forEach((row, rowIndex) => {
    row.forEach(([value, label, pathValue, lower], index) => {
      const x = startX + index * (toothWidth + gap);
      const active = allSelected || selected.has(label) || selected.has(value);
      const fill = active ? '#7367f0' : '#e3e3e3';
      const stroke = active ? '#7367f0' : '#d5d8e3';
      const textY = rowIndex === 0 ? y - 10 : y + toothHeight + 3;

      doc.fillColor('#111827').fontSize(7).text(label, x - 2, textY, { width: toothWidth + 4, align: 'center' });
      doc.save();
      if (lower) {
        doc.translate(x, y + toothHeight).scale(scale, -scale);
      } else {
        doc.translate(x, y).scale(scale, scale);
      }
      doc.path(pathValue).fillAndStroke(fill, stroke);
      doc.restore();
    });
    y += toothHeight + (rowIndex === 0 ? 26 : 0);
  });

  doc.x = startX;
  doc.y = y + 22;
  doc.fillColor('#1f2937');
}

function drawProcedureTable(doc, details) {
  const left = doc.page.margins.left;
  const widths = [24, 52, 150, 118, 38, 58, 58];
  const headers = ['#', 'Diente', 'Tratamiento / servicio', 'Descripción', 'Cant.', 'Precio', 'Total'];
  const pageBottom = doc.page.height - doc.page.margins.bottom;
  const rowPadding = 6;

  const drawHeader = () => {
    let x = left;
    const headerY = doc.y;
    doc.roundedRect(left, headerY, widths.reduce((sum, width) => sum + width, 0), 24, 4).fill('#f4f1ff');
    doc.fillColor('#4338ca').fontSize(8).font('Helvetica-Bold');
    headers.forEach((header, index) => {
      doc.text(header, x + rowPadding, headerY + 8, { width: widths[index] - rowPadding * 2 });
      x += widths[index];
    });
    doc.y = headerY + 30;
    doc.font('Helvetica');
  };

  doc.fontSize(12).fillColor('#111827').font('Helvetica-Bold').text('Procedimientos', left, doc.y);
  doc.y += 8;
  drawHeader();

  details.forEach((item, index) => {
    const title = [item.nombre_tratamiento, item.nombre_servicio].filter(Boolean).join(' / ') || item.nombre || 'Procedimiento';
    const lineTotal = Number(item.costo_servicio || (item.cantidad * item.precio) || 0);
    const values = [
      String(index + 1),
      item.diente || 'N/A',
      title,
      item.descripcion || 'Sin descripción',
      String(Number(item.cantidad || 1)),
      money(item.precio),
      money(lineTotal),
    ];
    const heights = values.map((value, valueIndex) => doc.heightOfString(value, { width: widths[valueIndex] - rowPadding * 2 }));
    const rowHeight = Math.max(34, Math.max(...heights) + rowPadding * 2);

    if (doc.y + rowHeight > pageBottom) {
      doc.addPage();
      drawHeader();
    }

    let x = left;
    const y = doc.y;
    doc.roundedRect(left, y, widths.reduce((sum, width) => sum + width, 0), rowHeight, 4).stroke('#dde2ee');
    doc.fillColor('#111827').fontSize(8).font('Helvetica');
    values.forEach((value, valueIndex) => {
      doc.text(value, x + rowPadding, y + rowPadding, { width: widths[valueIndex] - rowPadding * 2 });
      x += widths[valueIndex];
    });
    doc.y = y + rowHeight + 6;
  });
}

function renderQuotationPdfContent(doc, data) {
  const { paciente, doctor, consulta, cotizacion } = data;
  const patientName = `${paciente.nombre || ''} ${paciente.apellido || ''}`.trim() || 'Paciente';
  const doctorName = `${doctor.nombre || ''} ${doctor.apellido || ''}`.trim() || 'Doctor';
  const { subtotal, impuestos, total } = quotationTotals(cotizacion);

  drawQuotationHeader(doc);
  doc.fontSize(10).fillColor('#4b5563');
  doc.text(`Paciente: ${patientName}`);
  doc.text(`Doctor: ${doctorName}`);
  doc.text(`Cita: #APT${String(consulta.cita_idcita).padStart(3, '0')}`);
  doc.text(`Fecha: ${new Date(cotizacion.fecha_cotizacion || Date.now()).toLocaleDateString('es-GT')}`);
  doc.moveDown(1);

  drawQuotationToothDiagram(doc, cotizacion.detalles);

  drawProcedureTable(doc, cotizacion.detalles);

  const pageBottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + 84 > pageBottom) doc.addPage();
  const summaryWidth = 178;
  const summaryX = doc.page.width - doc.page.margins.right - summaryWidth;
  const summaryY = doc.y + 8;
  doc.roundedRect(summaryX, summaryY, summaryWidth, 76, 6).stroke('#dde2ee');
  doc.fontSize(10).fillColor('#4b5563');
  doc.text('Subtotal', summaryX + 12, summaryY + 13, { width: 78 });
  doc.text(money(subtotal), summaryX + 94, summaryY + 13, { width: 70, align: 'right' });
  doc.text('IVA 12%', summaryX + 12, summaryY + 34, { width: 78 });
  doc.text(money(impuestos), summaryX + 94, summaryY + 34, { width: 70, align: 'right' });
  doc.fontSize(12).fillColor('#7367f0').font('Helvetica-Bold');
  doc.text('Total', summaryX + 12, summaryY + 55, { width: 78 });
  doc.text(money(total), summaryX + 94, summaryY + 55, { width: 70, align: 'right' });
  doc.font('Helvetica');
  drawDocumentFooter(doc);
}

async function saveQuotationPdfCopy(data) {
  const patientId = data.paciente?.idPaciente;
  if (!patientId) return null;
  const fileName = `cotizacion-${data.cotizacion.id_cotizacion}.pdf`;
  const { absoluteDir, publicPath } = patientDocumentPath(patientId, 'cotizaciones', fileName);
  await fs.mkdir(absoluteDir, { recursive: true });
  const absolutePath = path.join(absoluteDir, fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 42 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', async () => {
      try {
        await fs.writeFile(absolutePath, Buffer.concat(chunks));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    try {
      renderQuotationPdfContent(doc, data);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });

  return publicPath;
}

function streamQuotationPdf(res, data) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 42 });
  const fileName = `cotizacion-${data.cotizacion.id_cotizacion}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  doc.pipe(res);
  renderQuotationPdfContent(doc, data);
  doc.end();
}

async function loadAppointmentOptions() {
  const [pacientes, doctores, estadosCita] = await Promise.all([
    query('SELECT idPaciente, nombre, apellido FROM paciente WHERE COALESCE(idestado, 1)=1 ORDER BY nombre, apellido'),
    query('SELECT iddoctor, nombre, apellido FROM doctor WHERE COALESCE(idestado, 1)=1 ORDER BY nombre, apellido'),
    query('SELECT idestadoCita, nombre FROM estadocita ORDER BY idestadoCita'),
  ]);
  return { pacientes, doctores, estadosCita };
}

async function loadAppointmentsPageData(filters = {}) {
  await ensureActiveConsultationStorage();
  let q = `
    SELECT c.idcita, DATE_FORMAT(c.fechaCita, '%Y-%m-%d') AS fechaCita,
           TIME_FORMAT(c.horaCita, '%H:%i') AS horaCita,
           c.motivoCita, c.notasAdicionales, c.estadoCita_idestadoCita,
           c.paciente_idPaciente, c.doctor_iddoctor,
           p.nombre AS nombrePaciente, p.apellido AS apellidoPaciente, p.email AS emailPaciente, p.telefono AS telefonoPaciente,
           d.nombre AS nombreDoctor, d.apellido AS apellidoDoctor,
           ec.nombre AS estado_nombre,
           ca.idconsultaActiva AS consultaActivaId,
           ca.estado AS consulta_activa_estado,
           cp.idconsulta AS consultaId,
           COALESCE(cp.total_pagos, 0) AS totalPagos,
           COALESCE(cp.saldo_restante, 0) AS saldoRestantePago
      FROM cita c
      JOIN paciente p ON c.paciente_idPaciente=p.idPaciente
      JOIN doctor d   ON c.doctor_iddoctor=d.iddoctor
      LEFT JOIN estadocita ec ON ec.idestadoCita=c.estadoCita_idestadoCita
      LEFT JOIN consulta_activa ca ON ca.cita_idcita=c.idcita
      LEFT JOIN (
        SELECT co.cita_idcita,
               MIN(co.idconsulta) AS idconsulta,
               COUNT(p.idPago) AS total_pagos,
               SUM(COALESCE(p.saldo_restante, 0)) AS saldo_restante
          FROM consulta co
          LEFT JOIN pago p ON p.consulta_idconsulta = co.idconsulta
         GROUP BY co.cita_idcita
      ) cp ON cp.cita_idcita=c.idcita
     WHERE 1=1
  `;
  const params = [];

  const fechaInicio = formatDateValueForSql(filters.fechaInicio);
  const fechaFin = formatDateValueForSql(filters.fechaFin);
  const fecha = formatDateValueForSql(filters.fecha);
  if (fecha) {
    q += ' AND c.fechaCita = ?';
    params.push(fecha);
  }
  if (fechaInicio && fechaFin) {
    q += ' AND c.fechaCita BETWEEN ? AND ?';
    params.push(fechaInicio, fechaFin);
  }
  if (filters.estadoCita && filters.estadoCita !== 'todas') {
    q += ' AND c.estadoCita_idestadoCita = ?';
    params.push(filters.estadoCita);
  }
  if (filters.doctorId) {
    q += ' AND c.doctor_iddoctor = ?';
    params.push(Number(filters.doctorId));
  }

  q += fecha ? ' ORDER BY c.horaCita ASC' : ' ORDER BY c.fechaCita DESC, c.horaCita DESC';

  const [citas, options] = await Promise.all([
    query(q, params),
    loadAppointmentOptions(),
  ]);

  return { citas, ...options };
}

async function loadAppointmentForEdit(appointmentId) {
  const [appointment] = await query(
    `SELECT c.idcita, DATE_FORMAT(c.fechaCita, '%Y-%m-%d') AS fechaCita,
            TIME_FORMAT(c.horaCita, '%H:%i') AS horaCita,
            c.motivoCita, c.notasAdicionales, c.estadoCita_idestadoCita,
            c.paciente_idPaciente, c.doctor_iddoctor,
            p.nombre AS nombrePaciente, p.apellido AS apellidoPaciente, p.email AS emailPaciente, p.telefono AS telefonoPaciente,
            d.nombre AS nombreDoctor, d.apellido AS apellidoDoctor,
            ec.nombre AS estado_nombre
       FROM cita c
       JOIN paciente p ON p.idPaciente = c.paciente_idPaciente
       JOIN doctor d ON d.iddoctor = c.doctor_iddoctor
       LEFT JOIN estadocita ec ON ec.idestadoCita = c.estadoCita_idestadoCita
      WHERE c.idcita = ?
      LIMIT 1`,
    [appointmentId]
  );
  return appointment || null;
}

async function loadPendingFollowUps() {
  const sources = [
    `SELECT DATE_FORMAT(co.proximaCita, '%Y-%m-%d') AS fecha,
            CONCAT('consulta-', co.idconsulta) AS sourceKey,
            co.idconsulta AS consultaId,
            ci.idcita AS citaOrigenId,
            ci.paciente_idPaciente AS pacienteId,
            ci.doctor_iddoctor AS doctorId,
            TRIM(CONCAT(COALESCE(p.nombre, ''), ' ', COALESCE(p.apellido, ''))) AS pacienteNombre,
            TRIM(CONCAT(COALESCE(d.nombre, ''), ' ', COALESCE(d.apellido, ''))) AS doctorNombre,
            COALESCE(NULLIF(ci.motivoCita, ''), 'Seguimiento dental') AS motivo
       FROM consulta co
       JOIN cita ci ON ci.idcita = co.cita_idcita
       LEFT JOIN paciente p ON p.idPaciente = ci.paciente_idPaciente
       LEFT JOIN doctor d ON d.iddoctor = ci.doctor_iddoctor
       LEFT JOIN cita citaConfirmada
         ON citaConfirmada.paciente_idPaciente = ci.paciente_idPaciente
        AND DATE(citaConfirmada.fechaCita) = DATE(co.proximaCita)
        AND citaConfirmada.idcita <> ci.idcita
        AND COALESCE(citaConfirmada.estadoCita_idestadoCita, 1) <> 3
      WHERE co.proximaCita IS NOT NULL
        AND DATE(co.proximaCita) >= CURDATE()
        AND citaConfirmada.idcita IS NULL`
  ];

  if (await tableExists('consulta_activa')) {
    sources.push(
      `SELECT DATE_FORMAT(ca.proximaCita, '%Y-%m-%d') AS fecha,
              CONCAT('activa-', ca.idconsultaActiva) AS sourceKey,
              NULL AS consultaId,
              ca.cita_idcita AS citaOrigenId,
              ca.paciente_idPaciente AS pacienteId,
              ca.doctor_iddoctor AS doctorId,
              TRIM(CONCAT(COALESCE(p.nombre, ''), ' ', COALESCE(p.apellido, ''))) AS pacienteNombre,
              TRIM(CONCAT(COALESCE(d.nombre, ''), ' ', COALESCE(d.apellido, ''))) AS doctorNombre,
              COALESCE(NULLIF(ca.motivoConsulta, ''), NULLIF(ci.motivoCita, ''), 'Seguimiento dental') AS motivo
         FROM consulta_activa ca
         LEFT JOIN cita ci ON ci.idcita = ca.cita_idcita
         LEFT JOIN paciente p ON p.idPaciente = ca.paciente_idPaciente
         LEFT JOIN doctor d ON d.iddoctor = ca.doctor_iddoctor
         LEFT JOIN consulta co ON co.cita_idcita = ca.cita_idcita
         LEFT JOIN cita citaConfirmada
           ON citaConfirmada.paciente_idPaciente = ca.paciente_idPaciente
          AND DATE(citaConfirmada.fechaCita) = DATE(ca.proximaCita)
          AND citaConfirmada.idcita <> ca.cita_idcita
          AND COALESCE(citaConfirmada.estadoCita_idestadoCita, 1) <> 3
        WHERE ca.proximaCita IS NOT NULL
          AND DATE(ca.proximaCita) >= CURDATE()
          AND co.idconsulta IS NULL
          AND citaConfirmada.idcita IS NULL`
    );
  }

  const rows = await query(`${sources.join('\nUNION ALL\n')} ORDER BY fecha ASC, pacienteNombre ASC`);
  return rows.map(row => ({
    fecha: row.fecha,
    sourceKey: row.sourceKey,
    consultaId: row.consultaId || null,
    citaOrigenId: row.citaOrigenId || null,
    pacienteId: row.pacienteId || null,
    doctorId: row.doctorId || null,
    pacienteNombre: row.pacienteNombre || 'Paciente sin nombre',
    doctorNombre: row.doctorNombre || 'Doctor sin asignar',
    motivo: row.motivo || 'Seguimiento dental',
  }));
}

async function loadAppointmentCalendarData() {
  const rows = await query(
    `SELECT DATE_FORMAT(c.fechaCita, '%Y-%m-%d') AS fecha,
            COUNT(*) AS total,
            SUM(CASE WHEN c.estadoCita_idestadoCita = 1 THEN 1 ELSE 0 END) AS pendientes,
            SUM(CASE WHEN c.estadoCita_idestadoCita = 2 THEN 1 ELSE 0 END) AS atendidas,
            SUM(CASE WHEN c.estadoCita_idestadoCita = 3 THEN 1 ELSE 0 END) AS canceladas
       FROM cita c
      GROUP BY DATE_FORMAT(c.fechaCita, '%Y-%m-%d')
      ORDER BY fecha ASC`
  );
  const pendingFollowUps = await loadPendingFollowUps();
  const today = todaySqlDate();
  const firstUpcoming = rows.find(row => String(row.fecha) >= today)?.fecha;
  const firstPendingFollowUp = pendingFollowUps.find(row => String(row.fecha) >= today)?.fecha;
  const followUpsByDate = pendingFollowUps.reduce((items, row) => {
    if (!items[row.fecha]) items[row.fecha] = [];
    items[row.fecha].push(row);
    return items;
  }, {});
  const calendarEvents = rows.map(row => ({
    title: `${Number(row.total || 0)} ${Number(row.total || 0) === 1 ? 'cita' : 'citas'}`,
    start: row.fecha,
    url: `/admin/doc-appointments?fecha=${row.fecha}`,
    textColor: '#7367f0',
    color: '#ffffff',
    borderColor: '#7367f0',
    extendedProps: {
      pendientes: Number(row.pendientes || 0),
      atendidas: Number(row.atendidas || 0),
      canceladas: Number(row.canceladas || 0),
    },
  }));
  Object.entries(followUpsByDate).forEach(([fecha, items]) => {
    calendarEvents.push({
      title: `${items.length} por confirmar`,
      start: fecha,
      url: `/admin/appointments?followupDate=${encodeURIComponent(fecha)}`,
      textColor: '#b45309',
      color: '#fff7ed',
      borderColor: '#f59e0b',
      extendedProps: {
        seguimientoPorConfirmar: true,
        total: items.length,
      },
    });
  });

  return {
    calendarEvents,
    calendarInitialDate: firstUpcoming || firstPendingFollowUp || rows[0]?.fecha || today,
    pendingFollowUps,
    calendarStats: {
      diasConCitas: rows.length,
      total: rows.reduce((sum, row) => sum + Number(row.total || 0), 0),
      pendientes: rows.reduce((sum, row) => sum + Number(row.pendientes || 0), 0),
      porConfirmar: pendingFollowUps.length,
    },
  };
}

router.get('/admin/appointments', isAuthenticated, canViewAppointments, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const [adminProfile, calendarData, options] = await Promise.all([
      getAdminProfile(req.session.user),
      loadAppointmentCalendarData(),
      loadAppointmentOptions(),
    ]);
    const followupDate = formatDateValueForSql(req.query.followupDate);
    const followupPatientId = Number(req.query.followupPatientId || req.query.patientId || 0) || null;
    const followupMatches = followupDate
      ? calendarData.pendingFollowUps.filter(item => (
        item.fecha === followupDate
        && (!followupPatientId || Number(item.pacienteId) === followupPatientId)
      ))
      : [];
    const selectedFollowUp = followupMatches.length === 1 ? followupMatches[0] : null;
    res.render('admin/appointments', {
      adminProfile,
      ...calendarData,
      ...options,
      selectedFollowUpDate: followupDate || null,
      appointmentPrefill: selectedFollowUp ? {
        fechaCita: selectedFollowUp.fecha,
        pacienteId: selectedFollowUp.pacienteId,
        doctorId: selectedFollowUp.doctorId,
        motivoCita: selectedFollowUp.motivo,
        notasAdicionales: 'Seguimiento pendiente de confirmar desde la consulta.',
      } : null,
    });
  } catch (e) { next(e); }
});

router.get('/admin/doc-appointments', isAuthenticated, canViewAppointments, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const fecha = formatDateValueForSql(req.query.fecha);
    const doctorId = Number(req.query.doctorId || req.query.doctor || 0) || null;
    const filters = { ...(fecha ? { fecha } : {}), ...(doctorId ? { doctorId } : {}) };
    const [adminProfile, pageData] = await Promise.all([
      getAdminProfile(req.session.user),
      loadAppointmentsPageData(filters),
    ]);
    const appointmentScope = await buildAppointmentScope(req, adminProfile);
    res.render('admin/doc-appointments', {
      ...pageData,
      adminProfile,
      appointmentScope,
      selectedDate: fecha || null,
      filters: { estadoCita: 'todas', doctorId },
    });
  } catch (e) { next(e); }
});

router.get('/admin/edit-appointment', isAuthenticated, canViewAppointments, async (req, res, next) => {
  try {
    const appointmentId = Number(req.query.id || 0);
    if (!appointmentId) return res.redirect('/admin/doc-appointments');
    await ensureCanManageAppointment(req, appointmentId);
    const [adminProfile, appointment, options] = await Promise.all([
      getAdminProfile(req.session.user),
      loadAppointmentForEdit(appointmentId),
      loadAppointmentOptions(),
    ]);
    if (!appointment) return res.redirect('/admin/doc-appointments');
    return res.render('admin/edit-appointment', { adminProfile, appointment, ...options });
  } catch (e) { next(e); }
});

router.post('/admin/edit-appointment/:id', isAuthenticated, canViewAppointments, validate(idParam, 'params'), validate(citaEditSchema), async (req, res, next) => {
  try {
    const appointment = await ensureCanManageAppointment(req, req.params.id);
    const {
      fechaCita,
      horaCita,
      motivoCita,
      notasAdicionales,
      paciente_idPaciente,
      doctor_iddoctor,
      estadoCita_idestadoCita,
    } = req.body;
    const fechaSql = formatDateValueForSql(fechaCita);
    const selectedTime = normalizeTime(horaCita);
    const changingSchedule = Number(appointment.doctor_iddoctor) !== Number(doctor_iddoctor)
      || formatDateValueForSql(appointment.fechaCita) !== fechaSql
      || normalizeTime(appointment.horaCita) !== selectedTime;

    if (changingSchedule) {
      const availability = await loadDoctorAvailability(doctor_iddoctor, fechaSql);
      if (!availability.horarios.length) {
        throw makeHttpError(400, 'El doctor no tiene horario configurado para esa fecha.');
      }
      if (!availability.disponibles.includes(selectedTime)) {
        throw makeHttpError(400, 'El horario seleccionado ya no está disponible para ese doctor.');
      }
    }

    await query(
      `UPDATE cita
          SET fechaCita = ?, horaCita = ?, motivoCita = ?, notasAdicionales = ?,
              paciente_idPaciente = ?, doctor_iddoctor = ?,
              estadoCita_idestadoCita = COALESCE(?, estadoCita_idestadoCita)
        WHERE idcita = ?`,
      [
        fechaSql,
        horaCita,
        motivoCita,
        notasAdicionales || '',
        paciente_idPaciente,
        doctor_iddoctor,
        estadoCita_idestadoCita || null,
        req.params.id,
      ]
    );
    await createNotification({
      tipo: 'cita',
      titulo: 'Cita actualizada',
      mensaje: `Cita #${req.params.id} actualizada para ${fechaSql} a las ${horaCita}.`,
      url: `/admin/doc-appointments?fecha=${encodeURIComponent(fechaSql || '')}`,
      referenciaTipo: 'cita',
      referenciaId: req.params.id,
    });
    res.redirect(`/admin/doc-appointments?fecha=${encodeURIComponent(fechaSql || '')}&actualizado=${Date.now()}`);
  } catch (e) { next(e); }
});

router.get('/admin/citas', isAuthenticated, canViewAppointments, (_req, res) => {
  res.redirect('/admin/appointments');
});

router.get('/api/admin/doctores/:id/disponibilidad', isAuthenticated, canViewAppointments, validate(idParam, 'params'), validate(disponibilidadQuerySchema, 'query'), async (req, res, next) => {
  try {
    const availability = await loadDoctorAvailability(req.params.id, req.query.fecha, req.query.duracion);
    res.json(availability);
  } catch (e) { next(e); }
});

router.post('/admin/citas', isAuthenticated, canViewAppointments, validate(citasFilterSchema), async (req, res, next) => {
  try {
    const fechaInicio = formatDateValueForSql(req.body.fechaInicio);
    const fechaFin = formatDateValueForSql(req.body.fechaFin);
    const singleDate = fechaInicio && fechaInicio === fechaFin ? `?fecha=${encodeURIComponent(fechaInicio)}` : '';
    res.redirect(`/admin/doc-appointments${singleDate}`);
  } catch (e) { next(e); }
});

router.post('/admin/citas/agregar', isAuthenticated, canCreateAppointments, validate(citaCreateSchema), async (req, res, next) => {
  try {
    const { fechaCita, horaCita, motivoCita, notasAdicionales, paciente_idPaciente, doctor_iddoctor } = req.body;
    const fechaSql = formatDateValueForSql(fechaCita);
    const availability = await loadDoctorAvailability(doctor_iddoctor, fechaSql);
    const selectedTime = normalizeTime(horaCita);

    if (!availability.horarios.length) {
      return res.status(400).send('El doctor no tiene horario configurado para esa fecha.');
    }
    if (!availability.disponibles.includes(selectedTime)) {
      return res.status(400).send('El horario seleccionado ya no está disponible para ese doctor.');
    }

    const created = await query(
      `INSERT INTO cita (fechaCita, horaCita, motivoCita, notasAdicionales, paciente_idPaciente, doctor_iddoctor, estadoCita_idestadoCita)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [fechaSql, horaCita, motivoCita, notasAdicionales || '', paciente_idPaciente, doctor_iddoctor]
    );
    await createNotification({
      tipo: 'cita',
      titulo: 'Nueva cita',
      mensaje: `Cita programada para ${fechaSql} a las ${horaCita}.`,
      url: `/admin/doc-appointments?fecha=${encodeURIComponent(fechaSql || '')}`,
      referenciaTipo: 'cita',
      referenciaId: created.insertId,
    });
    const redirectDate = encodeURIComponent(fechaSql || '');
    res.redirect(`/admin/doc-appointments?fecha=${redirectDate}&actualizado=${Date.now()}`);
  } catch (e) { next(e); }
});

router.post('/api/admin/citas/:id/iniciar-consulta', isAuthenticated, validate(idParam, 'params'), async (req, res, next) => {
  try {
    await ensureCanManageAppointment(req, req.params.id);
    const { idconsultaActiva } = await startActiveConsultation(req.params.id);
    await createNotification({
      tipo: 'consulta',
      titulo: 'Paciente en consulta',
      mensaje: `Se inició la consulta de la cita #${req.params.id}.`,
      url: `/admin/consultas/activas/${idconsultaActiva}`,
      referenciaTipo: 'consulta_activa',
      referenciaId: idconsultaActiva,
    });
    res.json({
      success: true,
      idconsultaActiva,
      redirectUrl: `/admin/consultas/activas/${idconsultaActiva}`,
    });
  } catch (e) { next(e); }
});

router.put(['/api/admin/citas/:id/atender', '/api/citas/atender/:id'], isAuthenticated, validate(idParam, 'params'),
  validate(Joi.object({ estado: Joi.number().valid(2).required() })), async (req, res, next) => {
    try {
      await ensureCanManageAppointment(req, req.params.id);
      const r = await query('UPDATE cita SET estadoCita_idestadoCita=? WHERE idcita=?', [req.body.estado, req.params.id]);
      if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Cita no encontrada' });
      res.json({ success: true });
    } catch (e) { next(e); }
  });

router.put(['/api/admin/citas/:id/cancelar', '/api/citas/cancelarCita/:id'], isAuthenticated, validate(idParam, 'params'), async (req, res, next) => {
    try {
      await ensureCanManageAppointment(req, req.params.id);
      const r = await query('UPDATE cita SET estadoCita_idestadoCita=3 WHERE idcita=?', [req.params.id]);
      if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Cita no encontrada' });
      await createNotification({
        tipo: 'cita',
        titulo: 'Cita cancelada',
        mensaje: `La cita #${req.params.id} fue cancelada y el horario quedó disponible.`,
        url: '/admin/doc-appointments',
        referenciaTipo: 'cita',
        referenciaId: req.params.id,
      });
      res.json({ success: true });
  } catch (e) { next(e); }
});

router.get('/admin/consultas/activas/:id', isAuthenticated, validate(idParam, 'params'), async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    await ensureCanManageConsultation(req, req.params.id);
    const [adminProfile, data] = await Promise.all([
      getAdminProfile(req.session.user),
      loadActiveConsultationData(req.params.id),
    ]);
    res.render('admin/consulta-activa', { ...data, adminProfile });
  } catch (e) { next(e); }
});

router.patch('/api/admin/consultas/activas/:id', isAuthenticated, validate(idParam, 'params'), validate(consultaActivaFieldsSchema), async (req, res, next) => {
  try {
    await ensureCanManageConsultation(req, req.params.id);
    await updateConsultationFields(req.params.id, req.body);
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.put('/api/admin/consultas/activas/:id/medicamentos', isAuthenticated, validate(idParam, 'params'), validate(medicamentosConsultaSchema), async (req, res, next) => {
  try {
    await ensureCanManageConsultation(req, req.params.id);
    const result = await replaceMedications(req.params.id, req.body.medicamentos || []);
    res.json(result);
  } catch (e) { next(e); }
});

router.put('/api/admin/consultas/activas/:id/materiales', isAuthenticated, validate(idParam, 'params'), validate(materialesConsultaSchema), async (req, res, next) => {
  try {
    await ensureCanManageConsultation(req, req.params.id);
    const result = await replaceConsultationMaterials(req.params.id, req.body.materiales || []);
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/api/admin/consultas/activas/:id/cotizaciones', isAuthenticated, validate(idParam, 'params'), validate(cotizacionConsultaSchema), async (req, res, next) => {
  try {
    await ensureCanManageConsultation(req, req.params.id);
    const result = await createConsultationQuotation(req.params.id, req.body.procedimientos || []);
    await createNotification({
      tipo: 'cotizacion',
      titulo: 'Nueva cotización',
      mensaje: 'Se generó una cotización.',
      url: `/admin/consultas/activas/${req.params.id}`,
      referenciaTipo: 'cotizacion',
      referenciaId: result.id_cotizacion,
    });
    res.json({
      success: true,
      ...result,
      documentUrl: `/admin/consultas/activas/${req.params.id}/cotizaciones/${result.id_cotizacion}/documento`,
    });
  } catch (e) { next(e); }
});

router.get('/admin/consultas/activas/:id/cotizaciones/:cotizacionId/documento', isAuthenticated, validate(consultaCotizacionParam, 'params'), async (req, res, next) => {
  try {
    await ensureCanManageConsultation(req, req.params.id);
    const data = await loadQuotationDocumentData(req.params.id, req.params.cotizacionId);
    await saveQuotationPdfCopy(data);
    streamQuotationPdf(res, data);
  } catch (e) { next(e); }
});

router.post('/api/admin/consultas/activas/:id/archivos', isAuthenticated, validate(idParam, 'params'), async (req, res, next) => {
  try {
    await ensureCanManageConsultation(req, req.params.id);
    const { files } = await parseMultipartUpload(req);
    const data = await loadActiveConsultationData(req.params.id);
    const stored = await storeConsultationFile(files[0], data.paciente.idPaciente);
    const created = await addConsultationAttachment(req.params.id, stored);
    res.json({ success: true, ...created, file: stored });
  } catch (e) { next(e); }
});

router.post('/api/admin/consultas/activas/:id/finalizar', isAuthenticated, validate(idParam, 'params'), async (req, res, next) => {
  try {
    await ensureCanManageConsultation(req, req.params.id);
    const result = await finalizeConsultation(req.params.id);
    await createNotification({
      tipo: 'consulta',
      titulo: 'Consulta finalizada',
      mensaje: `La consulta #${req.params.id} fue finalizada.`,
      url: '/admin/doc-appointments',
      referenciaTipo: 'consulta_activa',
      referenciaId: req.params.id,
    });
    res.json({ success: true, ...result, redirectUrl: '/admin/doc-appointments' });
  } catch (e) { next(e); }
});

/* ========== Historial ========== */
const historialFilterSchema = Joi.object({
  filtro: Joi.string().valid('rangoFecha').allow('', null),
  fechaInicio: Joi.date().allow(null),
  fechaFin: Joi.date().allow(null),
  idDoctor: Joi.number().integer().allow(null),
});

const consultaSchema = Joi.object({
  idcita: Joi.number().integer().required(),
  tipoServicio: Joi.number().integer().required(),
  servicio: Joi.number().integer().required(),
  piezaDental: Joi.string().allow('', null),
  descripcionConsulta: Joi.string().required(),
  proximaCita: Joi.date().allow(null),
  doctorSelect: Joi.number().integer().required(),
});

router.get('/admin/historial', isAuthenticated, canViewHistory, async (_req, res, next) => {
  try {
    const q = `
      SELECT hc.idhistorialClinico, hc.fecharegistro, co.idconsulta, co.nopieza, co.descripcion, co.proximaCita,
             d.nombre AS nombreDoctor, d.apellido AS apellidoDoctor, s.nombre AS nombreServicio, ts.nombre AS nombreTipoServicio,
             p.nombre AS nombrePaciente, p.apellido AS apellidoPaciente
      FROM historial_clinico hc
      JOIN consulta co ON hc.consulta_idconsulta=co.idconsulta
      JOIN doctor d ON hc.doctor_iddoctor=d.iddoctor
      JOIN servicio s ON co.servicio_idservicio=s.idservicio
      JOIN tiposervicio ts ON co.tiposervicio_idtiposervicio=ts.idtipoServicio
      JOIN cita ci ON co.cita_idcita=ci.idcita
      JOIN paciente p ON ci.paciente_idPaciente=p.idPaciente
      ORDER BY hc.fecharegistro DESC
    `;
    const historial = await query(q);
    const doctores = await query('SELECT iddoctor, nombre, apellido FROM doctor');
    const servicios = await query('SELECT idservicio, nombre FROM servicio');
    const tiposServicios = await query('SELECT idtipoServicio AS idtiposervicio, nombre FROM tiposervicio');
    const citas = await query('SELECT * FROM cita WHERE estadoCita_idestadoCita = 1');
    const pacientes = await query('SELECT idPaciente, nombre, apellido FROM paciente');
    res.render('admin/historial', { historial, doctores, servicios, tiposServicios, citas, pacientes });
  } catch (e) { next(e); }
});

router.post('/admin/historial', isAuthenticated, canViewHistory, validate(historialFilterSchema), async (req, res, next) => {
  try {
    const { filtro, fechaInicio, fechaFin, idDoctor } = req.body;
    let q = `
      SELECT hc.idhistorialClinico, hc.fecharegistro, co.idconsulta, co.nopieza, co.descripcion, co.proximaCita,
             d.nombre AS nombreDoctor, d.apellido AS apellidoDoctor, s.nombre AS nombreServicio, ts.nombre AS nombreTipoServicio,
             p.nombre AS nombrePaciente, p.apellido AS apellidoPaciente
      FROM historial_clinico hc
      JOIN consulta co ON hc.consulta_idconsulta=co.idconsulta
      JOIN doctor d ON hc.doctor_iddoctor=d.iddoctor
      JOIN servicio s ON co.servicio_idservicio=s.idservicio
      JOIN tiposervicio ts ON co.tiposervicio_idtiposervicio=ts.idtipoServicio
      JOIN cita ci ON co.cita_idcita=ci.idcita
      JOIN paciente p ON ci.paciente_idPaciente=p.idPaciente
      WHERE 1=1
    `;
    const params = [];
    if (filtro === 'rangoFecha' && fechaInicio && fechaFin) { q += ' AND hc.fecharegistro BETWEEN ? AND ?'; params.push(fechaInicio, fechaFin); }
    if (idDoctor) { q += ' AND hc.doctor_iddoctor = ?'; params.push(idDoctor); }

    const historial = await query(q, params);
    const doctores = await query('SELECT iddoctor, nombre, apellido FROM doctor');
    const servicios = await query('SELECT idservicio, nombre FROM servicio');
    const tiposServicios = await query('SELECT idtipoServicio AS idtiposervicio, nombre FROM tiposervicio');
    const citas = await query('SELECT * FROM cita WHERE estadoCita_idestadoCita = 1');
    const pacientes = await query('SELECT idPaciente, nombre, apellido FROM paciente');
    res.render('admin/historial', { historial, doctores, servicios, tiposServicios, citas, pacientes });
  } catch (e) { next(e); }
});

router.post(['/api/admin/consultas', '/api/consultas/agregar'], isAuthenticated, canCreateHistory, validate(consultaSchema), async (req, res, next) => {
  const { idcita, tipoServicio, servicio, piezaDental, descripcionConsulta, proximaCita, doctorSelect } = req.body;
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rC] = await conn.execute(
      `INSERT INTO consulta (nopieza, descripcion, proximaCita, servicio_idservicio, tiposervicio_idtiposervicio, cita_idcita)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [piezaDental, descripcionConsulta, proximaCita || null, servicio, tipoServicio, idcita]
    );
    await conn.execute(
      'INSERT INTO historial_clinico (consulta_idconsulta, doctor_iddoctor) VALUES (?, ?)',
      [rC.insertId, doctorSelect]
    );
    await conn.commit();
    res.json({ message: 'Consulta y historial clínico guardados exitosamente.' });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

module.exports = router;
