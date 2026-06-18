(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ "menu-item": renderMenuItemComponent });

  function renderMenuItemComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const label = context.escapeHtml(props.label || "Item");
    const href = context.escapeAttr(props.href || "#");
    const target = props.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
    const iconHtml = props.icon
      ? `<span class="nav-link-icon d-md-none d-lg-inline-block"><i class="ti ti-${context.escapeAttr(props.icon)}"></i></span>`
      : "";

    return `<a class="nav-link" href="${href}"${target}>${iconHtml}<span class="nav-link-title">${label}</span></a>`;
  }
}());
