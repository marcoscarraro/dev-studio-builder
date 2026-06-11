(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ paragraph: renderParagraphComponent });

  function renderParagraphComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    return `<p${cssClassAttr}>${context.escapeHtml(props.text || "")}</p>`;
  }
}());
