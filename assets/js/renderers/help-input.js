(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ helpInput: renderHelpInputComponent });

  function renderHelpInputComponent(component, cssClassAttr, definition, context) {
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
    const helpIcon = `<span class="form-help" data-bs-toggle="popover"${context.attr("data-bs-placement", props.helpPlacement || "top")}${context.attr("data-bs-content", props.helpContent || "")}>${context.escapeHtml(props.helpMarker || "?")}</span>`;

    return [
      context.renderFormLabel(context.escapeHtml(props.label || ""), required),
      `<div${cssClassAttr}>`,
      `  <div class="col">${input}</div>`,
      `  <div class="col-auto align-self-center">${helpIcon}</div>`,
      "</div>",
      context.renderValidationFeedback(props)
    ].filter(Boolean).join("\n");
  }
}());
