(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ label: renderLabelComponent });

  function renderLabelComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    let forAttr;
    if (props.forId) {
      forAttr = ` for="${context.escapeAttr(props.forId)}"`;
    } else {
      forAttr = "";
    }

    return `<label${cssClassAttr}${forAttr}>${context.escapeHtml(props.text || "Label")}</label>`;
  }
}());
