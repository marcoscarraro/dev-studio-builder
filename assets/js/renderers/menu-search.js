(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ "menu-search": renderMenuSearchComponent });

  function renderMenuSearchComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const placeholder = context.escapeAttr(props.placeholder || "Buscar...");

    return [
      '<div class="input-icon" style="min-width:160px">',
      `  <input type="text" class="form-control form-control-sm" placeholder="${placeholder}" disabled style="padding-left:2rem">`,
      '  <span class="input-icon-addon" style="pointer-events:none">',
      '    ' + context.renderTablerIcon("search"),
      '  </span>',
      '</div>'
    ].join("\n");
  }
}());
