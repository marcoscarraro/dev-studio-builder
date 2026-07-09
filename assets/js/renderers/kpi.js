(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ kpi: renderKpiComponent });

  function renderKpiComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const valueId = props.valueId
      ? ` id="${context.escapeAttr(context.sanitizeElementId(props.valueId, ""))}"`
      : "";

    const icon = props.icon ? context.renderTablerIcon(props.icon, props.iconColor) : "";

    const trend = props.trend || "";
    let trendHtml = "";
    if (trend && props.trendValue) {
      const trendClass = trend === "up" ? "text-success" : "text-danger";
      const trendArrow = trend === "up" ? "↑" : "↓";
      const trendLabelHtml = props.trendLabel ? ` <span class="text-secondary">${context.escapeHtml(String(props.trendLabel))}</span>` : "";
      trendHtml = ` <small class="${trendClass}">${trendArrow} ${context.escapeHtml(String(props.trendValue))}</small>${trendLabelHtml}`;
    }

    const labelHtml = `<div${context.classAttr(props.labelCssClass || "subheader")}>${context.escapeHtml(props.label || "Indicador")}</div>`;
    const valueHtml = `<div${context.classAttr(props.valueCssClass || "h2 mb-0")}${valueId}>${context.escapeHtml(props.value == null ? "0" : props.value)}${trendHtml}</div>`;

    let content;
    // iconBgColor preenchido: icone vira um avatar circular colorido, lado a lado com o
    // texto (row align-items-center) — layout equivalente ao antigo componente "Stat Card".
    // Sem iconBgColor (padrao): icone solto empilhado acima do texto, como sempre foi.
    if (icon && props.iconBgColor) {
      content = [
        `  <div class="row align-items-center">`,
        `    <div class="col-auto"><span class="avatar bg-${context.escapeAttr(props.iconBgColor)}-lt">${icon}</span></div>`,
        `    <div class="col">`,
        context.indent([labelHtml, valueHtml].join("\n"), 6),
        `    </div>`,
        `  </div>`
      ].join("\n");
    } else {
      content = [
        icon ? `  <div class="mb-2">${icon}</div>` : null,
        `  ${labelHtml}`,
        `  ${valueHtml}`
      ].filter(Boolean).join("\n");
    }

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
