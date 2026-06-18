(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ progress: renderProgressComponent });

  function renderProgressComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const label = props.label || "";
    const value = Math.min(100, Math.max(0, Number(props.value) || 0));
    const variant = props.variant || "primary";
    const showLabel = context.toBooleanValue(props.showLabel);
    const striped = context.toBooleanValue(props.striped);
    const animated = context.toBooleanValue(props.animated);

    let barCls = `progress-bar bg-${variant}`;
    if (striped) barCls += " progress-bar-striped";
    if (animated) barCls += " progress-bar-animated";

    const labelText = showLabel ? `${value}%` : "";
    const bar = `<div${context.classAttr(barCls)} role="progressbar" style="width:${value}%" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100">${context.escapeHtml(labelText)}</div>`;

    const parts = [];
    if (label) {
      parts.push(`<div class="d-flex mb-1"><div>${context.escapeHtml(label)}</div><div class="ms-auto">${value}%</div></div>`);
    }
    parts.push(`<div class="progress">${bar}</div>`);

    return parts.join("\n");
  }
}());
