(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    fullcalendar: renderFullCalendarComponent
  });
  window.TemplateBuilderRenderers.registerInlineInits({ fullcalendar: renderFullCalendarPageInit });

  // === INIT INLINE DA PAGINA EXPORTADA ===
  // Gera o codigo de inicializacao DIRETO na lib (new FullCalendar.Calendar(el, options)),
  // com as opcoes ja resolvidas — legivel e editavel no bloco "Scripts da pagina".
  function renderFullCalendarPageInit(component, context) {
    var props = component.props || {};
    var calendarId = context.sanitizeElementId(props.calendarId, context.sanitizeElementId(component.id, "calendar"));
    var js = context.toJsString;
    var options = buildCalendarOptions(props);
    var ajaxUrl = (props.ajaxUrl || "").trim();
    var authHeaders = buildFcAuthHeaders(props);
    var dayClickUrl = (props.dayClickUrl || "").trim();
    var eventClickUrl = (props.eventClickUrl || "").trim();

    // Sem autenticacao, a URL de eventos pode ir direto nas opcoes (padrao da lib).
    if (ajaxUrl && !authHeaders) {
      options.events = ajaxUrl;
    }

    var lines = [];
    lines.push("$(function () {");
    lines.push("  var el = document.getElementById(" + js(calendarId) + ");");
    lines.push("  if (!el || el._fullCalendar) return;");
    lines.push("");
    lines.push("  // Opcoes do calendario (edite a vontade — doc: https://fullcalendar.io/docs)");
    lines.push("  var options = " + indentJsonLiteral(JSON.stringify(options, null, 2), "  ") + ";");
    if (ajaxUrl && authHeaders) {
      lines.push("");
      lines.push("  // Busca os eventos no servidor (com autenticacao)");
      lines.push("  options.events = function (info, successCallback, failureCallback) {");
      lines.push("    fetch(" + js(ajaxUrl) + ", { headers: " + JSON.stringify(authHeaders) + " })");
      lines.push("      .then(function (r) { return r.ok ? r.json() : []; })");
      lines.push("      .then(function (data) { successCallback(Array.isArray(data) ? data : []); })");
      lines.push("      .catch(function () { failureCallback(); });");
      lines.push("  };");
    }
    if (dayClickUrl) {
      lines.push("");
      lines.push("  // Clique no dia: abre a URL com {{date}} trocado pela data clicada (YYYY-MM-DD)");
      lines.push("  options.dateClick = function (info) {");
      lines.push("    var url = " + js(dayClickUrl) + ".replace(/\\{\\{\\s*date\\s*\\}\\}/g, encodeURIComponent(info.dateStr));");
      lines.push("    window.open(url, " + js((props.dayClickTarget || "_blank").trim() || "_blank") + ");");
      lines.push("  };");
    }
    if (eventClickUrl) {
      lines.push("");
      lines.push("  // Clique no evento: abre a URL com {{id}} trocado pelo id do evento");
      lines.push("  options.eventClick = function (info) {");
      lines.push("    if (info.jsEvent) { info.jsEvent.preventDefault(); }");
      lines.push("    var url = " + js(eventClickUrl) + ".replace(/\\{\\{\\s*id\\s*\\}\\}/g, encodeURIComponent(info.event.id || \"\"));");
      lines.push("    window.open(url, " + js((props.eventClickTarget || "_blank").trim() || "_blank") + ");");
      lines.push("  };");
    }
    lines.push("");
    lines.push("  el._fullCalendar = new FullCalendar.Calendar(el, options);");
    lines.push("  el._fullCalendar.render();");
    lines.push("});");

    return { title: "Calendario (FullCalendar) #" + calendarId, code: lines.join("\n") };
  }

  // Headers de autenticacao do fetch de eventos (mesma regra do runtime), ja resolvidos.
  function buildFcAuthHeaders(props) {
    var authType = (props.ajaxAuthType || "none").trim();
    var token = (props.ajaxAuthToken || "").trim();
    if (authType === "bearer" && token) {
      return { Authorization: "Bearer " + token };
    }
    if (authType === "header" && token) {
      var headers = {};
      headers[(props.ajaxAuthHeader || "X-API-Key").trim()] = token;
      return headers;
    }
    return null;
  }

  // Re-indenta um JSON.stringify multi-linha para alinhar dentro do bloco gerado.
  function indentJsonLiteral(jsonText, indent) {
    return jsonText.split("\n").map(function (line, index) {
      if (index === 0) { return line; }
      return indent + line;
    }).join("\n");
  }

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
      var authType = (props.ajaxAuthType || "none").trim();
      if (authType !== "none") {
        ajaxAttr += " data-fc-auth-type=\"" + context.escapeAttr(authType) + "\""
          + " data-fc-auth-token=\"" + context.escapeAttr(props.ajaxAuthToken || "") + "\"";
        if (authType === "header") {
          ajaxAttr += " data-fc-auth-header=\"" + context.escapeAttr(props.ajaxAuthHeader || "X-API-Key") + "\"";
        }
      }
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
