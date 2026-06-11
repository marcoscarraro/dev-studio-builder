(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ floatingInput: renderFloatingInputComponent });

  function renderFloatingInputComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const id = context.sanitizeElementId(props.inputId, context.sanitizeElementId(component.id, "floating"));
    let required;
    if (context.toBooleanValue(props.required)) {
      required = ' <span class="required-mark">*</span>';
    } else {
      required = "";
    }
    let control = "";

    if (props.controlType === "select") {
      const options = context.parseOptions(props.options).map(context.renderSelectOption).join("");
      const selectAttrs = [
        context.idAttr(id),
        context.attr("name", props.name),
        context.toBooleanValue(props.required) ? " required" : "",
        context.toBooleanValue(props.disabled) ? " disabled" : "",
        context.toBooleanValue(props.multiple) ? " multiple" : ""
      ].join("");
      control = `<select${context.classAttr(context.mergeClassNames(props.controlCssClass || "form-select", context.getValidationClass(props)))}${selectAttrs}>${options}</select>`;
    } else {
      const inputAttrs = context.renderInputAttributes({
        type: props.inputType || "text",
        id,
        name: props.name,
        placeholder: props.placeholder || " ",
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
      control = `<input${context.classAttr(context.mergeClassNames(props.controlCssClass || "form-control", props.textAlign, context.getValidationClass(props)))}${inputAttrs}>`;
    }

    return [
      `<div${cssClassAttr}>${control}<label for="${context.escapeAttr(id)}">${context.escapeHtml(props.label || "Campo")}${required}</label></div>`,
      props.help ? `<div class="help-text">${context.escapeHtml(props.help)}</div>` : "",
      context.renderValidationFeedback(props)
    ].filter(Boolean).join("\n");
  }
}());
