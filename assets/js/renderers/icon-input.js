(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ iconInput: renderIconInputComponent });

  function renderIconInputComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    let required;
    if (context.toBooleanValue(props.required)) {
      required = ' <span class="required-mark">*</span>';
    } else {
      required = "";
    }
    const inputAttrs = context.renderInputAttributes({
      type: props.inputType || "text",
      id: props.inputId,
      name: props.name,
      placeholder: props.placeholder,
      value: props.value,
      pattern: props.pattern,
      autocomplete: props.autocomplete,
      disabled: props.disabled,
      readonly: props.readonly,
      required: props.required,
      dataMask: props.dataMask,
      dataMaskVisible: props.dataMaskVisible,
      customAttributes: props.customAttributes
    });
    const input = `<input${context.classAttr(context.mergeClassNames(props.inputCssClass || "form-control", props.textAlign, context.getValidationClass(props)))}${inputAttrs}>`;
    const icon = context.renderTablerIcon(props.icon, props.iconColor);
    let addon;
    if (icon) {
      addon = `<span class="input-icon-addon">${icon}</span>`;
    } else {
      addon = "";
    }
    let controls;
    if (props.iconPosition === "left") {
      controls = [addon, input];
    } else {
      controls = [input, addon];
    }

    return [
      context.renderFormLabel(context.escapeHtml(props.label || ""), required),
      `<div${cssClassAttr}>${controls.join("")}</div>`,
      props.help ? `<div class="help-text">${context.escapeHtml(props.help)}</div>` : "",
      context.renderValidationFeedback(props)
    ].filter(Boolean).join("\n");
  }
}());
