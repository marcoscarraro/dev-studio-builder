(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ element: renderElementComponent });

  function renderElementComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const tagName = context.getSafeTagName(definition.tagName || "div");

    return `<${tagName}${cssClassAttr}>${context.escapeHtml(props.text || "")}</${tagName}>`;
  }
}());
