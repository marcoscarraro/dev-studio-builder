(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ "menu-label": renderMenuLabelComponent });

  function renderMenuLabelComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const label = context.escapeHtml(props.label || "Secao");
    return `<span class="nav-link-title text-uppercase" style="display:block;font-size:.65em;font-weight:700;opacity:.7;padding:.5rem 0 .25rem">${label}</span>`;
  }
}());
