(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ callout: renderCalloutComponent });

  function renderCalloutComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const variant = props.variant || "primary";
    const title = context.escapeHtml(props.title || "");
    const content = context.escapeHtml(props.content || "");
    const icon = props.icon ? context.renderTablerIcon(props.icon, props.iconColor) : "";

    const cls = `callout callout-${variant}`;
    const titleHtml = title ? `<h4 class="callout-title">${icon ? icon + " " : ""}${title}</h4>` : (icon ? `<div class="mb-2">${icon}</div>` : "");

    return [
      `<div${context.classAttr(cls)}>`,
      titleHtml ? `  ${titleHtml}` : null,
      `  <p class="mb-0">${content}</p>`,
      "</div>"
    ].filter(Boolean).join("\n");
  }
}());
