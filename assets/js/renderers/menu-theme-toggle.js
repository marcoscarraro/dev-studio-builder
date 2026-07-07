(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ "menu-theme-toggle": renderMenuThemeToggleComponent });

  function renderMenuThemeToggleComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const label = context.escapeHtml(props.label || "Tema");
    const iconHtml = `<span class="nav-link-icon d-md-none d-lg-inline-block">${context.renderTablerIcon(props.iconLight || "sun")}</span>`;

    return `<a class="nav-link" href="#" role="button">${iconHtml}<span class="nav-link-title">${label}</span></a>`;
  }
}());
