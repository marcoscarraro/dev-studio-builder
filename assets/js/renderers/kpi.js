(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ kpi: renderKpiComponent });

  function renderKpiComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const valueId = props.valueId
      ? ` id="${context.escapeAttr(context.sanitizeElementId(props.valueId, ""))}"`
      : "";

    const icon = props.icon ? context.renderTablerIcon(props.icon, props.iconColor) : "";
    const iconHtml = icon ? `<div class="mb-2">${icon}</div>` : "";

    const trend = props.trend || "";
    let trendHtml = "";
    if (trend && props.trendValue) {
      const trendClass = trend === "up" ? "text-success" : "text-danger";
      const trendArrow = trend === "up" ? "↑" : "↓";
      trendHtml = ` <small class="${trendClass}">${trendArrow} ${context.escapeHtml(String(props.trendValue))}</small>`;
    }

    const content = [
      iconHtml ? `  ${iconHtml}` : null,
      `  <div${context.classAttr(props.labelCssClass || "subheader")}>${context.escapeHtml(props.label || "Indicador")}</div>`,
      `  <div${context.classAttr(props.valueCssClass || "h2 mb-0")}${valueId}>${context.escapeHtml(props.value == null ? "0" : props.value)}${trendHtml}</div>`
    ].filter(Boolean).join("\n");

    const useBody = props.bodyWrapper == null ? true : context.toBooleanValue(props.bodyWrapper);

    if (!useBody) {
      return [`<div${cssClassAttr}>`, content, "</div>"].join("\n");
    }

    return [
      `<div${cssClassAttr}>`,
      `  <div${context.classAttr(props.bodyCssClass || "card-body")}>`,
      context.indent(content, 4),
      "  </div>",
      "</div>"
    ].join("\n");
  }
}());
