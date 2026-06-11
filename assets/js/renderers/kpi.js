(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ kpi: renderKpiComponent });

  function renderKpiComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    let valueId;
    if (props.valueId) {
      valueId = ` id="${context.escapeAttr(context.sanitizeElementId(props.valueId, ""))}"`;
    } else {
      valueId = "";
    }
    const content = [
      `  <div${context.classAttr(props.labelCssClass || "subheader")}>${context.escapeHtml(props.label || "Indicador")}</div>`,
      `  <div${context.classAttr(props.valueCssClass || "h2 mb-0")}${valueId}>${context.escapeHtml(props.value == null ? "0" : props.value)}</div>`
    ].join("\n");
    let useBody;
    if (props.bodyWrapper == null) {
      useBody = true;
    } else {
      useBody = context.toBooleanValue(props.bodyWrapper);
    }

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
