(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ statCard: renderStatCardComponent });

  function renderStatCardComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const title = context.escapeHtml(props.title || "Indicador");
    const value = context.escapeHtml(props.value == null ? "0" : props.value);
    const valueId = props.valueId ? ` id="${context.escapeAttr(context.sanitizeElementId(props.valueId, ""))}"` : "";
    const icon = props.icon ? context.renderTablerIcon(props.icon, props.iconColor) : "";
    const iconBgColor = props.iconBgColor || "primary";
    const trend = props.trend || "";
    const trendValue = props.trendValue ? context.escapeHtml(String(props.trendValue)) : "";
    const trendLabel = props.trendLabel ? context.escapeHtml(String(props.trendLabel)) : "";

    let trendHtml = "";
    if (trend && trendValue) {
      const trendClass = trend === "up" ? "text-success" : "text-danger";
      const trendArrow = trend === "up" ? "↑" : "↓";
      const trendLabelHtml = trendLabel ? ` <span class="text-secondary">${trendLabel}</span>` : "";
      trendHtml = `<div class="mt-1"><span class="${trendClass}">${trendArrow} ${trendValue}</span>${trendLabelHtml}</div>`;
    }

    const iconHtml = icon
      ? `<div class="col-auto"><span class="avatar bg-${context.escapeAttr(iconBgColor)}-lt">${icon}</span></div>`
      : "";

    const contentCol = [
      `<div class="font-weight-medium">${title}</div>`,
      `<div class="h2 mb-0"${valueId}>${value}</div>`,
      trendHtml
    ].filter(Boolean).join("\n        ");

    if (iconHtml) {
      return [
        `<div${cssClassAttr}>`,
        "  <div class=\"card-body\">",
        "    <div class=\"row align-items-center\">",
        `      ${iconHtml}`,
        "      <div class=\"col\">",
        `        ${contentCol}`,
        "      </div>",
        "    </div>",
        "  </div>",
        "</div>"
      ].join("\n");
    }

    return [
      `<div${cssClassAttr}>`,
      "  <div class=\"card-body\">",
      `    <div class="font-weight-medium">${title}</div>`,
      `    <div class="h2 mb-0"${valueId}>${value}</div>`,
      trendHtml ? `    ${trendHtml}` : null,
      "  </div>",
      "</div>"
    ].filter(Boolean).join("\n");
  }
}());
