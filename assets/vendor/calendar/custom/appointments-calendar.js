document.addEventListener("DOMContentLoaded", function () {
  var calendarEl = document.getElementById("appointmentsCal");
  if (!calendarEl || !window.FullCalendar) return;

  var config = window.appointmentsCalendarConfig || {};
  var events = Array.isArray(config.events) ? config.events : [];
  var today = new Date().toISOString().slice(0, 10);

  var calendar = new FullCalendar.Calendar(calendarEl, {
    headerToolbar: {
      left: "prevYear,prev,next,nextYear today",
      center: "title",
      right: "dayGridMonth,dayGridWeek,dayGridDay",
    },
    initialDate: config.initialDate || today,
    locale: "es",
    buttonText: {
      today: "hoy",
      month: "mes",
      week: "semana",
      day: "día",
    },
    navLinks: true,
    editable: false,
    dayMaxEvents: true,
    events: events,
    dateClick: function (info) {
      window.location.href = "/admin/doc-appointments?fecha=" + encodeURIComponent(info.dateStr);
    },
    eventClick: function (info) {
      if (info.event.url) {
        info.jsEvent.preventDefault();
        window.location.href = info.event.url;
      }
    },
  });

  calendar.render();
});
