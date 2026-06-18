(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    card: renderCardComponent
  });

  function renderCardComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const title = context.escapeHtml(props.title || "Card");
    const subtitle = props.subtitle ? `<p class="card-subtitle">${context.escapeHtml(props.subtitle)}</p>` : "";
    const content = context.escapeHtml(props.content || "");
    const statusColor = props.statusColor || "";

    const parts = [];

    if (statusColor) {
      parts.push(`<div class="card-status-top bg-${context.escapeAttr(statusColor)}"></div>`);
    }

    parts.push(`<header class="card-header"><h3 class="card-title">${title}</h3>${subtitle}</header>`);
    parts.push(`<div class="card-body">${content}</div>`);

    if (context.toBooleanValue(props.showFooter)) {
      const footerContent = context.escapeHtml(props.footerContent || "");
      parts.push(`<div class="card-footer">${footerContent}</div>`);
    }

    return `<article${cssClassAttr}>${parts.join("")}</article>`;
  }
}());
