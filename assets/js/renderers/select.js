(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ select: renderSelectComponent });

  function renderSelectComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const label = context.escapeHtml(props.label || "");
    const required = context.renderRequiredMark(props);
    const help = context.renderHelpText(props);
    const cssClass = context.getComponentClass(component);
    const options = context.parseOptions(props.options).map((option) => {
      return context.renderSelectOption(option);
    }).join("");
    const selectAttrs = [
      context.idAttr(props.selectId || props.id),
      context.attr("name", props.name),
      context.renderCustomAttributes(props.customAttributes, ["id", "name", "class", "required", "disabled", "multiple"]),
      context.toBooleanValue(props.required) ? " required" : "",
      context.toBooleanValue(props.disabled) ? " disabled" : "",
      context.toBooleanValue(props.multiple) ? " multiple" : ""
    ].join("");

    return `<label class="form-label">${label}${required}</label><select${context.classAttr(context.mergeClassNames(cssClass, context.getValidationClass(props)))}${selectAttrs}>${options}</select>${help}${context.renderValidationFeedback(props)}`;
  }
}());
