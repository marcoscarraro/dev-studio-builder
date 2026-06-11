(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ textarea: renderTextareaComponent });

  function renderTextareaComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const label = context.escapeHtml(props.label || "");
    const required = context.renderRequiredMark(props);
    const help = context.renderHelpText(props);
    const cssClass = context.getComponentClass(component);
    const rows = Number(props.rows || 4);
    const textareaAttrs = [
      context.idAttr(props.inputId || props.id),
      context.attr("name", props.name),
      context.attr("rows", rows),
      context.attr("placeholder", props.placeholder),
      context.attr("maxlength", props.maxLength || props.maxlength),
      context.attr("minlength", props.minLength || props.minlength),
      context.renderCustomAttributes(props.customAttributes, ["id", "name", "class", "rows", "placeholder", "maxlength", "minlength"]),
      context.toBooleanValue(props.required) ? " required" : "",
      context.toBooleanValue(props.disabled) ? " disabled" : "",
      context.toBooleanValue(props.readonly) ? " readonly" : ""
    ].join("");

    return `<label class="form-label">${label}${required}</label><textarea${context.classAttr(context.mergeClassNames(cssClass, context.getValidationClass(props)))}${textareaAttrs}></textarea>${help}${context.renderValidationFeedback(props)}`;
  }
}());
