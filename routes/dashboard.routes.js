const express = require('express');
const { query } = require('../database/db');
const { isAuthenticated, requirePermission } = require('../middlewares/auth');
const { hasPermission } = require('../utils/permissions');

const router = express.Router();
const canViewDashboard = requirePermission('dashboard:ver');

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const WEEK_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

async function safeQuery(sql, params = [], fallback = []) {
  try {
    return await query(sql, params);
  } catch (error) {
    console.warn('[dashboard] consulta omitida:', error.message);
    return fallback;
  }
}

async function tableColumns(tableName) {
  const rows = await safeQuery(
    `SELECT COLUMN_NAME AS column_name
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?`,
    [tableName],
    []
  );

  return new Set(rows.map(row => row.column_name));
}

function firstNumber(rows, key) {
  return Number(rows?.[0]?.[key] || 0);
}

function can(permissions, permission) {
  return hasPermission(permissions || [], permission);
}

function roleName(roleId) {
  const roles = {
    1: 'Administrador',
    2: 'Doctor',
    3: 'Recepcionista',
  };
  return roles[Number(roleId)] || 'Equipo';
}

async function getDoctorProfile(user) {
  const userId = user?.id || user?.idusuario;
  if (!userId) return null;
  const columns = await tableColumns('doctor');
  const photoColumn = ['fotoPerfil', 'foto_perfil', 'foto'].find(column => columns.has(column));

  const rows = await safeQuery(
    `SELECT d.iddoctor, d.nombre, d.apellido, d.email, d.telefono, d.especialidad_idespecialidad,
            ${photoColumn ? `d.${photoColumn}` : 'NULL'} AS fotoPerfil
       FROM doctor d
      WHERE d.usuario_idusuario = ?
      LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

async function getApprovedRegistrationName(user) {
  const userId = user?.id || user?.idusuario;
  if (!userId) return '';

  const rows = await safeQuery(
    `SELECT nombre
       FROM registro_pendiente
      WHERE idusuario_creado = ? AND estado = 'aprobada'
      ORDER BY fecha_procesado DESC, id DESC
      LIMIT 1`,
    [userId]
  );

  return rows[0]?.nombre || '';
}

async function getUserProfileName(user) {
  const userId = user?.id || user?.idusuario;
  if (!userId) return '';

  const columns = await tableColumns('usuario');
  if (!columns.has('nombre') || !columns.has('apellido')) return '';

  const rows = await safeQuery(
    `SELECT TRIM(CONCAT(COALESCE(nombre, ''), ' ', COALESCE(apellido, ''))) AS nombre
       FROM usuario
      WHERE idusuario = ?
      LIMIT 1`,
    [userId]
  );

  return rows[0]?.nombre || '';
}

function buildMonthSeries(revenueRows, appointmentRows) {
  const revenueByMonth = new Map(revenueRows.map(row => [Number(row.mes), Number(row.total || 0)]));
  const appointmentByMonth = new Map(appointmentRows.map(row => [Number(row.mes), Number(row.total || 0)]));

  return MONTHS.map((label, index) => {
    const month = index + 1;
    return {
      label,
      revenue: revenueByMonth.get(month) || 0,
      appointments: appointmentByMonth.get(month) || 0,
    };
  });
}

function buildWeekSeries(rows) {
  const byDay = new Map(rows.map(row => [Number(row.dow), Number(row.total || 0)]));
  return WEEK_DAYS.map((label, index) => ({
    label: label.slice(0, 3),
    total: byDay.get(index + 1) || 0,
  }));
}

function buildWeekTabs() {
  const today = new Date();
  return WEEK_DAYS.map((label, index) => ({
    label,
    active: today.getDay() === index,
  }));
}

router.get(['/admin/dash', '/admin/dashboard'], isAuthenticated, canViewDashboard, async (req, res, next) => {
  try {
    const user = req.session.user || {};
    const permissions = user.permissions || [];
    const doctor = await getDoctorProfile(user);
    const registeredName = await getApprovedRegistrationName(user);
    const userProfileName = await getUserProfileName(user);
    const isAdmin = Number(user.rol) === 1 || can(permissions, '*');
    const isDoctor = Number(user.rol) === 2 || Boolean(doctor);
    const isReception = Number(user.rol) === 3;
    const scopedToDoctor = Boolean(doctor) && !isAdmin;
    const doctorFilter = scopedToDoctor ? ' AND c.doctor_iddoctor = ?' : '';
    const doctorParams = scopedToDoctor ? [doctor.iddoctor] : [];

    const [
      patientsRows,
      archivedPatientsRows,
      appointmentsTodayRows,
      appointmentsMonthRows,
      revenueMonthRows,
      pendingRows,
      doctorsRows,
      todayAppointments,
      visitRows,
      availableDoctors,
      revenueByMonthRows,
      appointmentsByMonthRows,
      weeklyPatientsRows,
      genderRows,
      consultationRows,
    ] = await Promise.all([
      safeQuery('SELECT COUNT(*) AS total FROM paciente WHERE COALESCE(idestado, 1) = 1'),
      safeQuery('SELECT COUNT(*) AS total FROM paciente WHERE COALESCE(idestado, 1) <> 1'),
      safeQuery(`SELECT COUNT(*) AS total FROM cita c WHERE c.fechaCita = CURDATE()${doctorFilter}`, doctorParams),
      safeQuery(`SELECT COUNT(*) AS total FROM cita c WHERE YEAR(c.fechaCita) = YEAR(CURDATE()) AND MONTH(c.fechaCita) = MONTH(CURDATE())${doctorFilter}`, doctorParams),
      safeQuery('SELECT COALESCE(SUM(abono), 0) AS total FROM pago WHERE YEAR(fecha) = YEAR(CURDATE()) AND MONTH(fecha) = MONTH(CURDATE())'),
      safeQuery('SELECT COALESCE(SUM(saldo_restante), 0) AS total FROM pago WHERE COALESCE(saldo_restante, 0) > 0'),
      safeQuery('SELECT COUNT(*) AS total FROM doctor WHERE COALESCE(idestado, 1) = 1'),
      safeQuery(
        `SELECT c.idcita, c.fechaCita, TIME_FORMAT(c.horaCita, '%H:%i') AS horaCita,
                c.motivoCita, c.estadoCita_idestadoCita,
                ec.nombre AS estado_nombre,
                p.nombre AS paciente_nombre, p.apellido AS paciente_apellido,
                d.nombre AS doctor_nombre, d.apellido AS doctor_apellido
           FROM cita c
           JOIN paciente p ON c.paciente_idPaciente = p.idPaciente
           JOIN doctor d ON c.doctor_iddoctor = d.iddoctor
           LEFT JOIN estadocita ec ON ec.idestadoCita = c.estadoCita_idestadoCita
          WHERE c.fechaCita = CURDATE()${doctorFilter}
          ORDER BY c.horaCita ASC
          LIMIT 8`,
        doctorParams
      ),
      safeQuery(
        `SELECT c.idcita, c.fechaCita, TIME_FORMAT(c.horaCita, '%H:%i') AS horaCita,
                c.motivoCita, c.estadoCita_idestadoCita,
                ec.nombre AS estado_nombre,
                p.idPaciente, p.nombre AS paciente_nombre, p.apellido AS paciente_apellido,
                COALESCE(p.edad, TIMESTAMPDIFF(YEAR, p.fechaNacimiento, CURDATE())) AS edad,
                d.nombre AS doctor_nombre, d.apellido AS doctor_apellido
           FROM cita c
           JOIN paciente p ON c.paciente_idPaciente = p.idPaciente
           JOIN doctor d ON c.doctor_iddoctor = d.iddoctor
           LEFT JOIN estadocita ec ON ec.idestadoCita = c.estadoCita_idestadoCita
          WHERE c.fechaCita >= CURDATE()${doctorFilter}
            AND LOWER(COALESCE(ec.nombre, 'pendiente')) NOT IN ('cancelada', 'cancelado', 'atendida', 'finalizada')
          ORDER BY c.fechaCita ASC, c.horaCita ASC
          LIMIT 5`,
        doctorParams
      ),
      safeQuery(
        `SELECT d.iddoctor, d.nombre, d.apellido, d.especialidad_idespecialidad,
                COUNT(c.idcita) AS citas_hoy
           FROM doctor d
           LEFT JOIN cita c ON c.doctor_iddoctor = d.iddoctor AND c.fechaCita = CURDATE()
          WHERE COALESCE(d.idestado, 1) = 1
          GROUP BY d.iddoctor, d.nombre, d.apellido, d.especialidad_idespecialidad
          ORDER BY citas_hoy ASC, d.nombre ASC
          LIMIT 3`
      ),
      safeQuery(
        `SELECT MONTH(fecha) AS mes, COALESCE(SUM(abono), 0) AS total
           FROM pago
          WHERE YEAR(fecha) = YEAR(CURDATE())
          GROUP BY MONTH(fecha)`
      ),
      safeQuery(
        `SELECT MONTH(fechaCita) AS mes, COUNT(*) AS total
           FROM cita c
          WHERE YEAR(fechaCita) = YEAR(CURDATE())${doctorFilter}
          GROUP BY MONTH(fechaCita)`,
        doctorParams
      ),
      safeQuery(
        `SELECT DAYOFWEEK(c.fechaCita) AS dow, COUNT(DISTINCT c.paciente_idPaciente) AS total
           FROM cita c
          WHERE c.fechaCita BETWEEN DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                                AND DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)
          ${scopedToDoctor ? 'AND c.doctor_iddoctor = ?' : ''}
          GROUP BY DAYOFWEEK(c.fechaCita)`,
        doctorParams
      ),
      safeQuery('SELECT genero_idGenero, COUNT(*) AS total FROM paciente GROUP BY genero_idGenero'),
      safeQuery(`SELECT COUNT(*) AS total FROM historial_clinico hc WHERE 1=1${scopedToDoctor ? ' AND hc.doctor_iddoctor = ?' : ''}`, doctorParams),
    ]);

    const genderMap = new Map(genderRows.map(row => [Number(row.genero_idGenero), Number(row.total || 0)]));
    const displayName = doctor
      ? `Dr. ${doctor.nombre} ${doctor.apellido}`
      : (userProfileName || registeredName || user.nombre || user.nombreCompleto || 'Nombre pendiente');

    const dashboard = {
      profile: {
        displayName,
        photoUrl: doctor?.fotoPerfil || '',
        roleLabel: roleName(user.rol),
        isAdmin,
        isDoctor,
        isReception,
      },
      visibility: {
        showFinance: isAdmin || can(permissions, 'pagos:ver'),
        showPatients: isAdmin || can(permissions, 'pacientes:ver'),
        showAppointments: isAdmin || can(permissions, 'citas:ver'),
        showDoctors: isAdmin || can(permissions, 'doctores:ver'),
        showClinical: isAdmin || isDoctor || can(permissions, 'historial:ver'),
      },
      stats: {
        patients: firstNumber(patientsRows, 'total'),
        archivedPatients: firstNumber(archivedPatientsRows, 'total'),
        appointmentsToday: firstNumber(appointmentsTodayRows, 'total'),
        appointmentsMonth: firstNumber(appointmentsMonthRows, 'total'),
        revenueMonth: firstNumber(revenueMonthRows, 'total'),
        pendingPayments: firstNumber(pendingRows, 'total'),
        activeDoctors: firstNumber(doctorsRows, 'total'),
        consultations: firstNumber(consultationRows, 'total'),
        malePatients: genderMap.get(1) || 0,
        femalePatients: genderMap.get(2) || 0,
      },
      todayTabs: buildWeekTabs(),
      todayAppointments,
      patientVisits: visitRows,
      availableDoctors,
      charts: {
        monthSeries: buildMonthSeries(revenueByMonthRows, appointmentsByMonthRows),
        weekPatients: buildWeekSeries(weeklyPatientsRows),
      },
    };

    res.render('admin/dash', { dashboard });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
