(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ gantt: renderGanttComponent });

  // Gantt / timeline horizontal (recursos em linhas, tempo no eixo X, reservas como barras).
  // O markup so descreve o container + data-*; o runtime (gantt-runtime.js) busca os dados
  // (AJAX) e monta a timeline. Espelha o padrao do FullCalendar.
  function renderGanttComponent(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var ganttId = context.sanitizeElementId(props.ganttId, context.sanitizeElementId(component.id, "gantt"));

    var title = "";
    if (props.title) {
      title = "  <div class=\"card-header\"><h3 class=\"card-title\">" + context.escapeHtml(props.title) + "</h3></div>";
    }

    var options = buildGanttOptions(props);
    var optionsAttr = context.escapeAttr(JSON.stringify(options));

    var dataUrl = (props.dataUrl || "").trim();
    var dataAttr = "";
    if (dataUrl) {
      dataAttr = " data-gantt-url=\"" + context.escapeAttr(dataUrl) + "\"";
      var authType = (props.ajaxAuthType || "none").trim();
      if (authType !== "none") {
        dataAttr += " data-gantt-auth-type=\"" + context.escapeAttr(authType) + "\""
          + " data-gantt-auth-token=\"" + context.escapeAttr(props.ajaxAuthToken || "") + "\"";
        if (authType === "header") {
          dataAttr += " data-gantt-auth-header=\"" + context.escapeAttr(props.ajaxAuthHeader || "X-API-Key") + "\"";
        }
      }
    }

    return [
      "<article" + cssClassAttr + ">",
      title,
      "  <div class=\"card-body p-0\">",
      "    <div id=\"" + context.escapeAttr(ganttId) + "\" class=\"dsb-gantt\" data-gantt" + dataAttr + " data-gantt-options=\"" + optionsAttr + "\"></div>",
      "  </div>",
      "</article>"
    ].filter(Boolean).join("\n");
  }

  function buildGanttOptions(props) {
    return {
      granularity: props.granularity || "day",   // hour | day | week | month
      rangeMode: props.rangeMode || "auto",       // auto | fixed
      rangeStart: props.rangeStart || "",
      rangeEnd: props.rangeEnd || "",
      rowHeight: parseInt(props.rowHeight, 10) || 44,
      showToday: props.showToday !== false && props.showToday !== "false",
      groupBy: props.groupBy === true || props.groupBy === "true",
      barClickUrl: props.barClickUrl || "",       // suporta token {{id}}
      barClickTarget: props.barClickTarget || "_self"
    };
  }
}());
