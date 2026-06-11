(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ html: renderHtmlComponent });

  function renderHtmlComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const cssClass = context.getComponentClass(component);
    const html = context.sanitizeEditorHtml(props.html || "");

    if (cssClass) {
      return `<div${cssClassAttr}>${html}</div>`;
    }

    return html;
  }
}());
