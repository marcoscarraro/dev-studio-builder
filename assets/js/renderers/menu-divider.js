(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ "menu-divider": renderMenuDividerComponent });

  function renderMenuDividerComponent(component, cssClassAttr, definition, context) {
    return `<hr class="navbar-divider my-2">`;
  }
}());
