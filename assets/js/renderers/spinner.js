(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ spinner: renderSpinnerComponent });

  function renderSpinnerComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const type = props.type === "grow" ? "spinner-grow" : "spinner-border";
    const size = props.size || "";
    const variant = props.variant || "primary";
    const label = context.escapeHtml(props.label || "Carregando...");
    const align = props.align || "left";

    let cls = `${type} text-${variant}`;
    if (size) cls += ` ${size}`;

    const spinner = `<div${context.classAttr(cls)} role="status"><span class="visually-hidden">${label}</span></div>`;

    if (align === "center") {
      return `<div class="text-center">${spinner}</div>`;
    }
    if (align === "right") {
      return `<div class="text-end">${spinner}</div>`;
    }
    return spinner;
  }
}());
