(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    fullcalendar: renderFullCalendarComponent
  });

  function renderFullCalendarComponent(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var calendarId = context.sanitizeElementId(props.calendarId, context.sanitizeElementId(component.id, "calendar"));
    var title;
    if (props.title) {
      title = "  <div class=\"card-header\"><h3 class=\"card-title\">" + context.escapeHtml(props.title) + "</h3></div>";
    } else {
      title = "";
    }
    var options = buildCalendarOptions(props);
    var optionsAttr = context.escapeAttr(JSON.stringify(options));
    var ajaxUrl = (props.ajaxUrl || "").trim();
    var ajaxAttr;
    if (ajaxUrl) {
      ajaxAttr = " data-fc-ajax-url=\"" + context.escapeAttr(ajaxUrl) + "\"";
    } else {
      ajaxAttr = "";
    }
    // Cliques no dia e no evento: a URL e o alvo vao em data-* proprios (nao no
    // data-fc-options JSON) porque o runtime precisa transformar isso em funcoes
    // (dateClick / eventClick), e funcao nao passa por JSON.
    var dayClickUrl = (props.dayClickUrl || "").trim();
    var dayClickAttrs;
    if (dayClickUrl) {
      dayClickAttrs = " data-fc-day-click-url=\"" + context.escapeAttr(dayClickUrl) + "\""
        + " data-fc-day-click-target=\"" + context.escapeAttr(props.dayClickTarget || "_blank") + "\"";
    } else {
      dayClickAttrs = "";
    }
    var eventClickUrl = (props.eventClickUrl || "").trim();
    var eventClickAttrs;
    if (eventClickUrl) {
      eventClickAttrs = " data-fc-event-click-url=\"" + context.escapeAttr(eventClickUrl) + "\""
        + " data-fc-event-click-target=\"" + context.escapeAttr(props.eventClickTarget || "_blank") + "\"";
    } else {
      eventClickAttrs = "";
    }

    return [
      "<article" + cssClassAttr + ">",
      title,
      "  <div class=\"card-body\">",
      "    <div id=\"" + context.escapeAttr(calendarId) + "\" data-fullcalendar" + ajaxAttr + dayClickAttrs + eventClickAttrs + " data-fc-options=\"" + optionsAttr + "\"></div>",
      "  </div>",
      "</article>"
    ].filter(Boolean).join("\n");
  }

  function buildCalendarOptions(props) {
    return {
      initialView: props.initialView || "dayGridMonth",
      // locale pt-br: o FullCalendar v6 usa Intl.DateTimeFormat, entao os nomes de
      // meses/dias saem em portugues sem precisar de arquivo de locale separado.
      locale: "pt-br",
      firstDay: parseInt(props.firstDay, 10) || 1,
      weekends: props.weekends !== false && props.weekends !== "false",
      editable: props.editable === true || props.editable === "true",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "multiMonthYear,dayGridMonth,timeGridWeek,timeGridDay,listMonth"
      },
      buttonText: {
        today: "Hoje",
        year: "Ano",
        month: "Mês",
        week: "Semana",
        day: "Dia",
        list: "Lista"
      },
      eventTimeFormat: { hour: "2-digit", minute: "2-digit", hour12: false },
      slotLabelFormat: { hour: "2-digit", minute: "2-digit", hour12: false },
      allDayText: "Dia inteiro",
      noEventsText: "Sem eventos para exibir",
      moreLinkText: "mais"
    };
  }
}());
