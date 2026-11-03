// Date Range
$(".datepicker").daterangepicker({
	singleDatePicker: true,
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY",
	},
});

// Date Range Opens Left
$(".datepicker-opens-left").daterangepicker({
	singleDatePicker: true,
	opens: "left",
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY",
	},
});

$(".datepicker-week-numbers").daterangepicker({
	singleDatePicker: true,
	showWeekNumbers: true,
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY",
	},
});

$(".datepicker-iso-week-numbers").daterangepicker({
	singleDatePicker: true,
	showISOWeekNumbers: true,
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY",
	},
});

$(".datepicker-time").daterangepicker({
	singleDatePicker: true,
	timePicker: true,
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY hh:mm A",
	},
});

$(".datepicker-time-24").daterangepicker({
	drops: "up",
	singleDatePicker: true,
	timePicker: true,
	timePicker24Hour: true,
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY hh:mm A",
	},
});

$(".datepicker-time-seconds").daterangepicker({
	drops: "up",
	singleDatePicker: true,
	timePicker: true,
	timePicker24Hour: true,
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY hh:mm:ss A",
	},
});

$(".datepicker-range").daterangepicker({
	drops: "up",
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY",
	},
});

$(".datepicker-range-week-numbers").daterangepicker({
	drops: "up",
	showWeekNumbers: true,
	opens: "left",
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY",
	},
});

$(".datepicker-range-iso-week-numbers").daterangepicker({
	drops: "up",
	opens: "left",
	showWeekNumbers: true,
	showISOWeekNumbers: true,
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY",
	},
});

$(".datepicker-range-time").daterangepicker({
	drops: "up",
	timePicker: true,
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY hh:mm A",
	},
});

$(".datepicker-range-time-24").daterangepicker({
	drops: "up",
	timePicker: true,
	timePicker24Hour: true,
	opens: "left",
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY hh:mm A",
	},
});

$(".datepicker-range-left").daterangepicker({
	opens: "left",
	drops: "up",
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY",
	},
});

$(".datepicker-range-right").daterangepicker({
	opens: "right",
	drops: "up",
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY",
	},
});

$(".datepicker-range-top-right").daterangepicker({
	opens: "right",
	drops: "up",
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY",
	},
});

$(".datepicker-range-top-left").daterangepicker({
	opens: "left",
	drops: "up",
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY",
	},
});

$(".datepicker-range-auto-apply").daterangepicker({
	autoApply: true,
	drops: "up",
	opens: "left",
	startDate: moment().startOf("hour"),
	endDate: moment().startOf("hour").add(32, "hour"),
	locale: {
		format: "DD/MM/YYYY",
	},
});

// Custom Date Range
$(function () {
	if (typeof moment === "undefined" || !$.fn.daterangepicker) return;
	var locale = {
		format: "DD/MM/YYYY",
		separator: " - ",
		applyLabel: "Aplicar",
		cancelLabel: "Cancelar",
		fromLabel: "Desde",
		toLabel: "Hasta",
		customRangeLabel: "Personalizado",
		weekLabel: "S",
		daysOfWeek: ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"],
		monthNames: [
			"Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
			"Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
		],
		firstDay: 1,
	};
	var ranges = {
		Hoy: [moment(), moment()],
		Ayer: [moment().subtract(1, "days"), moment().subtract(1, "days")],
		"Ultimos 7 dias": [moment().subtract(6, "days"), moment()],
		"Ultimos 30 dias": [moment().subtract(29, "days"), moment()],
		"Mes anterior": [
			moment().subtract(1, "month").startOf("month"),
			moment().subtract(1, "month").endOf("month"),
		],
	};

	function applyValue($element, start, end) {
		var value = start.format("DD/MM/YYYY") + " - " + end.format("DD/MM/YYYY");
		if ($element.is("input")) $element.val(value);
		else $element.find("span").text(value);
	}

	$(".custom-daterange, .custom-daterange2").each(function () {
		var $element = $(this);
		if ($element.data("daterangepicker")) return;
		var start = moment().subtract(29, "days");
		var end = moment();
		$element.daterangepicker({
			autoApply: $element.hasClass("custom-daterange2"),
			opens: $element.hasClass("custom-daterange2") ? "left" : "right",
			startDate: start,
			endDate: end,
			ranges: ranges,
			locale: locale,
		}, function (selectedStart, selectedEnd) {
			applyValue($element, selectedStart, selectedEnd);
			$element.trigger("cnc:date-range-change", [selectedStart, selectedEnd]);
		});
		applyValue($element, start, end);
	});
});
