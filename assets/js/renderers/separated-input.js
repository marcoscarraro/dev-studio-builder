(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ separatedInput: renderSeparatedInputComponent });

  function renderSeparatedInputComponent(component, cssClassAttr, definition, context) {
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
      disabled: props.disabled,
      readonly: props.readonly,
      required: props.required,
      customAttributes: props.customAttributes
    });
    const input = `<input${context.classAttr(context.mergeClassNames(props.inputCssClass || "form-control", context.getValidationClass(props)))}${inputAttrs}>`;
    const actionContent = context.renderButtonContent(props.actionText || "", props.actionIcon, props.actionIconPosition, props.actionIconColor) || "Acao";
    const actionClass = context.classAttr(props.actionCssClass || "btn btn-2 btn-icon");
    let action;
    if (props.actionType === "button") {
      action = `<button type="${context.escapeAttr(context.getSafeButtonType(props.buttonType))}"${actionClass}>${actionContent}</button>`;
    } else {
      action = `<a href="${context.escapeAttr(props.href || "#")}"${actionClass}>${actionContent}</a>`;
    }

    return [
      context.renderFormLabel(context.escapeHtml(props.label || ""), required),
      `<div${cssClassAttr}>`,
      `  <div class="col">${input}</div>`,
      `  <div class="col-auto">${action}</div>`,
      "</div>",
      props.help ? `<div class="help-text">${context.escapeHtml(props.help)}</div>` : "",
      context.renderValidationFeedback(props)
    ].filter(Boolean).join("\n");
  }
}());
