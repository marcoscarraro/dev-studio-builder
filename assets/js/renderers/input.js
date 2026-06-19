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
    const showCopy = inputType !== "password" && inputType !== "file" && context.toBooleanValue(props.showCopy);
    const allowNegative = inputType === "number" && context.toBooleanValue(props.allowNegative);
    const prefixText = props.prefixText || "";
    const suffixText = props.suffixText || "";
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

    const hasGroupAddons = prefixText || suffixText || showToggle || showCopy;

    if (!hasGroupAddons) {
      return [
        context.renderFormLabel(label, required),
        inputEl,
        help,
        context.renderValidationFeedback(props)
      ].join("");
    }

    const inputId = context.sanitizeElementId(props.inputId, context.sanitizeElementId(component.id, "input"));
    const prefixHtml = prefixText ? `<span class="input-group-text">${context.escapeHtml(prefixText)}</span>` : "";
    const suffixHtml = suffixText ? `<span class="input-group-text">${context.escapeHtml(suffixText)}</span>` : "";

    let toggleHtml = "";
    if (showToggle) {
      const toggleId = inputId + "-toggle";
      const eyeIcon = context.renderTablerIcon("eye", "");
      toggleHtml = `<span class="input-group-text"><a href="#" id="${context.escapeAttr(toggleId)}" class="link-secondary" title="Mostrar senha" data-password-toggle>${eyeIcon}</a></span>`;
    }

    const copyHtml = showCopy
      ? `<button type="button" class="btn btn-outline-secondary" data-copy-btn title="Copiar">${context.renderTablerIcon("copy", "")}</button>`
      : "";

    const groupCls = showToggle ? "input-group input-group-flat" : "input-group";

    return [
      context.renderFormLabel(label, required),
      `<div class="${groupCls}">${prefixHtml}${inputEl}${suffixHtml}${toggleHtml}${copyHtml}</div>`,
      help,
      context.renderValidationFeedback(props)
    ].join("");
  }
}());
