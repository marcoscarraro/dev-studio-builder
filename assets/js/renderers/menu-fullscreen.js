(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ "menu-fullscreen": renderMenuFullscreenComponent });

  function renderMenuFullscreenComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const label = context.escapeHtml(props.label || "Tela cheia");
    const icon = context.escapeAttr(props.icon || "maximize");
    const iconHtml = `<span class="nav-link-icon d-md-none d-lg-inline-block"><i class="ti ti-${icon}"></i></span>`;

    return `<a class="nav-link" href="#" role="button">${iconHtml}<span class="nav-link-title">${label}</span></a>`;
  }
}());
