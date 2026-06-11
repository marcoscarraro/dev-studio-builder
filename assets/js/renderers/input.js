(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    input: renderInputComponent
  });

  function renderInputComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const label = context.escapeHtml(props.label || "");
    const required = context.renderRequiredMark(props);
    const help = context.renderHelpText(props);
    const cssClass = context.getComponentClass(component);
    const inputType = props.inputType || definition.inputType || component.type || "text";
    const showToggle = inputType === "password" && context.toBooleanValue(props.showPasswordToggle);
    const allowNegative = inputType === "number" && context.toBooleanValue(props.allowNegative);
    const inputAttrs = context.renderInputAttributes({
      type: inputType,
      id: props.inputId || props.id,
      name: props.name,
      placeholder: props.placeholder,
      value: props.value,
      min: allowNegative ? "" : props.min,
      max: props.max,
      step: props.step,
      maxlength: props.maxLength || props.maxlength,
      minlength: props.minLength || props.minlength,
      pattern: props.pattern,
      autocomplete: props.autocomplete,
      accept: props.accept,
      multiple: props.multiple,
      disabled: props.disabled,
      readonly: props.readonly,
      required: props.required,
      dataMask: props.dataMask,
      dataMaskVisible: props.dataMaskVisible,
      title: props.title,
      customAttributes: props.customAttributes
    });
    const inputEl = `<input${context.classAttr(context.mergeClassNames(cssClass, props.textAlign, context.getValidationClass(props)))}${inputAttrs}>`;

    if (!showToggle) {
      return [
        context.renderFormLabel(label, required),
        inputEl,
        help,
        context.renderValidationFeedback(props)
      ].join("");
    }

    const inputId = context.sanitizeElementId(props.inputId, context.sanitizeElementId(component.id, "input"));
    const toggleId = inputId + "-toggle";
    const eyeIcon = context.renderTablerIcon("eye", "");
    const toggleBtn = `<span class="input-group-text"><a href="#" id="${context.escapeAttr(toggleId)}" class="link-secondary" title="Mostrar senha" data-password-toggle>${eyeIcon}</a></span>`;

    return [
      context.renderFormLabel(label, required),
      `<div class="input-group input-group-flat">${inputEl}${toggleBtn}</div>`,
      help,
      context.renderValidationFeedback(props)
    ].join("");
  }
}());
