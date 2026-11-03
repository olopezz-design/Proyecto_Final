const { query } = require('../database/db');

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DATE_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_ORDER_SQL = "FIELD(dia_semana,'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo')";
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

async function executeRows(executor, sql, params = []) {
  if (executor && typeof executor.execute === 'function') {
    const [rows] = await executor.execute(sql, params);
    return rows;
  }
  return query(sql, params);
}

function formatSqlDate(value) {
  if (!value) return null;
  if (!(value instanceof Date)) {
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeTime(value) {
  const match = String(value || '').trim().match(TIME_PATTERN);
  return match ? `${match[1]}:${match[2]}` : null;
}

function timeToMinutes(value) {
  const normalized = normalizeTime(value);
  if (!normalized) return null;
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function dayFromDate(value) {
  const sqlDate = formatSqlDate(value);
  if (!sqlDate) return null;
  const [year, month, day] = sqlDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return DATE_DAYS[date.getUTCDay()];
}

function normalizeScheduleRows(rows = []) {
  if (!Array.isArray(rows)) return [];

  return rows.reduce((items, row) => {
    const dia_semana = row?.dia_semana;
    const hora_inicio = normalizeTime(row?.hora_inicio);
    const hora_fin = normalizeTime(row?.hora_fin);
    const hasAnyValue = dia_semana || row?.hora_inicio || row?.hora_fin;

    if (!hasAnyValue) return items;
    if (!WEEK_DAYS.includes(dia_semana) || !hora_inicio || !hora_fin) {
      throw new Error('Cada horario debe tener día, hora de inicio y hora de fin válidos.');
    }
    if (timeToMinutes(hora_inicio) >= timeToMinutes(hora_fin)) {
      throw new Error('La hora de inicio debe ser menor que la hora de fin.');
    }

    items.push({ dia_semana, hora_inicio, hora_fin });
    return items;
  }, []);
}

function formatScheduleRows(rows = []) {
  return rows.map(row => ({
    id: row.id,
    doctor_id: row.doctor_id,
    dia_semana: row.dia_semana,
    hora_inicio: normalizeTime(row.hora_inicio),
    hora_fin: normalizeTime(row.hora_fin),
  }));
}

function groupSchedulesByDoctor(rows = []) {
  return formatScheduleRows(rows).reduce((grouped, row) => {
    const key = String(row.doctor_id);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
    return grouped;
  }, {});
}

async function loadAllDoctorSchedules() {
  const rows = await query(
    `SELECT id, doctor_id, dia_semana,
            TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio,
            TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin
       FROM horarios_laborales
      ORDER BY ${DAY_ORDER_SQL}, hora_inicio`
  );
  return rows;
}

async function loadDoctorSchedules(doctorId) {
  const rows = await query(
    `SELECT id, doctor_id, dia_semana,
            TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio,
            TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin
       FROM horarios_laborales
      WHERE doctor_id = ?
      ORDER BY ${DAY_ORDER_SQL}, hora_inicio`,
    [doctorId]
  );
  return formatScheduleRows(rows);
}

async function replaceDoctorSchedules(doctorId, schedules = [], executor = null) {
  const rows = normalizeScheduleRows(schedules);
  await executeRows(executor, 'DELETE FROM horarios_laborales WHERE doctor_id = ?', [doctorId]);

  for (const row of rows) {
    await executeRows(
      executor,
      'INSERT INTO horarios_laborales (doctor_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)',
      [doctorId, row.dia_semana, row.hora_inicio, row.hora_fin]
    );
  }

  return rows;
}

function generateSlots(schedules, busyTimes, durationMinutes) {
  const busy = new Set((busyTimes || []).map(normalizeTime).filter(Boolean));
  const slots = [];

  schedules.forEach(schedule => {
    const start = timeToMinutes(schedule.hora_inicio);
    const end = timeToMinutes(schedule.hora_fin);
    if (start === null || end === null) return;

    for (let current = start; current + durationMinutes <= end; current += durationMinutes) {
      const slot = minutesToTime(current);
      if (!busy.has(slot)) slots.push(slot);
    }
  });

  return slots;
}

async function loadDoctorAvailability(doctorId, dateValue, durationMinutes = 30) {
  const fecha = formatSqlDate(dateValue);
  const dia_semana = dayFromDate(fecha);
  const duration = Math.max(Number(durationMinutes) || 30, 5);

  if (!doctorId || !fecha || !dia_semana) {
    return { doctor_id: doctorId, fecha, dia_semana, horarios: [], ocupados: [], disponibles: [] };
  }

  const [scheduleRows, busyRows] = await Promise.all([
    query(
      `SELECT id, doctor_id, dia_semana,
              TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio,
              TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin
         FROM horarios_laborales
        WHERE doctor_id = ? AND dia_semana = ?
        ORDER BY hora_inicio`,
      [doctorId, dia_semana]
    ),
    query(
      `SELECT TIME_FORMAT(horaCita, '%H:%i') AS hora
         FROM cita c
         LEFT JOIN estadocita ec ON ec.idestadoCita = c.estadoCita_idestadoCita
        WHERE c.doctor_iddoctor = ?
          AND c.fechaCita = ?
          AND COALESCE(c.estadoCita_idestadoCita, 1) <> 3
          AND LOWER(COALESCE(ec.nombre, 'pendiente')) NOT IN ('cancelada', 'cancelado', 'atendida', 'finalizada')
        ORDER BY horaCita`,
      [doctorId, fecha]
    ),
  ]);

  const horarios = formatScheduleRows(scheduleRows);
  const ocupados = busyRows.map(row => normalizeTime(row.hora)).filter(Boolean);

  return {
    doctor_id: Number(doctorId),
    fecha,
    dia_semana,
    horarios,
    ocupados,
    disponibles: generateSlots(horarios, ocupados, duration),
  };
}

module.exports = {
  WEEK_DAYS,
  formatSqlDate,
  groupSchedulesByDoctor,
  loadAllDoctorSchedules,
  loadDoctorAvailability,
  loadDoctorSchedules,
  normalizeScheduleRows,
  normalizeTime,
  replaceDoctorSchedules,
};
