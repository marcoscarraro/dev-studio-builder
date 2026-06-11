(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    inputButtonGroup: renderInputButtonGroupComponent
  });

  function renderInputButtonGroupComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const inputAttrs = context.renderInputAttributes({
      type: props.inputType || "text",
      id: props.inputId,
      name: props.inputName,
      placeholder: props.placeholder,
      value: props.value,
      maxlength: props.maxLength || props.maxlength,
      autocomplete: props.autocomplete,
      pattern: props.pattern,
      dataMask: props.dataMask,
      dataMaskVisible: props.dataMaskVisible,
      customAttributes: props.customAttributes
    });
    const buttons = context.parseDropdownActions(props.buttons).map(context.renderDropdownAction).join("\n");
    let feedback;
    if (props.invalidFeedback) {
      feedback = `<div class="invalid-feedback">${context.escapeHtml(props.invalidFeedback)}</div>`;
    } else {
      feedback = "";
    }
    const input = `  <input${context.classAttr(context.mergeClassNames(props.inputCssClass || "form-control", props.textAlign))}${inputAttrs} data-ajax-source>`;
    let controls;
    if (props.buttonsPosition === "left") {
      controls = [context.indent(buttons, 2), input];
    } else {
      controls = [input, context.indent(buttons, 2)];
    }

    return [
      context.renderFormLabel(context.escapeHtml(props.label || ""), ""),
      `<div${cssClassAttr} data-ajax-input-group>`,
      ...controls,
      "</div>",
      feedback
    ].filter((line) => line !== "").join("\n");
  }
}());
