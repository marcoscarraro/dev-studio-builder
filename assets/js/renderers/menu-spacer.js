(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ "menu-spacer": renderMenuSpacerComponent });

  function renderMenuSpacerComponent(component, cssClassAttr, definition, context) {
    return '<div class="flex-fill" style="min-width:16px"></div>';
  }
}());
