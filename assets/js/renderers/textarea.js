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

    const showCopy = context.toBooleanValue(props.showCopy);
    const textareaEl = `<textarea${context.classAttr(context.mergeClassNames(cssClass, context.getValidationClass(props)))}${textareaAttrs}></textarea>`;
    const labelEl = `<label class="form-label">${label}${required}</label>`;

    if (!showCopy) {
      return `${labelEl}${textareaEl}${help}${context.renderValidationFeedback(props)}`;
    }

    const copyBtn = `<button type="button" class="btn btn-outline-secondary" data-copy-btn title="Copiar">${context.renderTablerIcon("copy", "")}</button>`;
    return `${labelEl}<div class="input-group align-items-start">${textareaEl}${copyBtn}</div>${help}${context.renderValidationFeedback(props)}`;
  }
}());
