(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    hiddenInput: renderHiddenInputHtml
  });

  window.TemplateBuilderRenderers.registerPreviews({
    hiddenInput: renderHiddenInputPreview
  });

  function renderHiddenInputHtml(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const customAttributes = context.renderCustomAttributes(props.customAttributes, ["id", "name", "class", "type", "value"]);

    return `<input type="hidden"${context.idAttr(props.inputId)}${context.attr("name", props.name)}${context.attr("value", props.value)}${cssClassAttr}${customAttributes}>`;
  }

  function renderHiddenInputPreview(component, context) {
    const props = component.props || {};
    const name = props.name || props.inputId || "campo_oculto";
    let value;
    if (props.value === "") {
      value = "(vazio)";
    } else {
      value = props.value;
    }

    return `<div class="hidden-input-preview"><strong>Hidden</strong><span>${context.escapeHtml(name)}</span><code>${context.escapeHtml(value)}</code></div>`;
  }
}());
