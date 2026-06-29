(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ "menu-fullscreen": renderMenuFullscreenComponent });

  function renderMenuFullscreenComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const label = context.escapeHtml(props.label || "Tela cheia");
    const iconHtml = `<span class="nav-link-icon d-md-none d-lg-inline-block">${context.renderTablerIcon(props.icon || "maximize")}</span>`;

    return `<a class="nav-link" href="#" role="button">${iconHtml}<span class="nav-link-title">${label}</span></a>`;
  }
}());
