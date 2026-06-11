(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ choice: renderChoiceComponent });

  function renderChoiceComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const label = context.escapeHtml(props.label || "");
    const required = context.renderRequiredMark(props);
    const help = context.renderHelpText(props);
    const cssClass = context.getComponentClass(component);
    const choiceItems = context.parseChoiceItems(props.options);
    const hasCheckedItem = choiceItems.some((option) => option.checked);
    const options = choiceItems.map((option, index) => {
      return renderChoiceOption(component, definition, option, index, hasCheckedItem, context);
    }).join("");

    return `<label class="form-label">${label}${required}</label><div${context.classAttr(context.mergeClassNames(cssClass, context.toBooleanValue(props.inline) ? "option-list-inline" : ""))}>${options}</div>${help}`;
  }

  function renderChoiceOption(component, definition, option, index, hasCheckedItem, context) {
    const props = component.props || {};
    const type = definition.choiceType || component.type;
    const name = context.escapeAttr(props.name || "");
    const optionId = `${context.sanitizeElementId(props.inputId, context.sanitizeElementId(component.id, type))}-${index + 1}`;
    const customAttributes = context.renderCustomAttributes(props.customAttributes, ["id", "name", "class", "type", "value", "checked", "required", "disabled"]);
    const checked = option.checked || (!hasCheckedItem && index === 0);
    const labelClass = context.mergeClassNames(
      "form-check",
      context.toBooleanValue(props.inline) ? "form-check-inline" : "",
      props.displayStyle === "switch" ? "form-switch" : "",
      props.displayStyle === "switch" && ["2", "3"].includes(String(props.switchSize)) ? `form-switch-${props.switchSize}` : ""
    );
    const description = option.description ? `<span class="form-check-description">${context.escapeHtml(option.description)}</span>` : "";

    return `<label${context.classAttr(labelClass)} for="${context.escapeAttr(optionId)}"><input id="${context.escapeAttr(optionId)}" class="form-check-input" type="${type}" name="${name}${type === "checkbox" ? "[]" : ""}" value="${context.escapeAttr(option.value)}"${customAttributes}${checked ? " checked" : ""}${context.toBooleanValue(props.required) ? " required" : ""}${context.toBooleanValue(props.disabled) || option.disabled ? " disabled" : ""}> <span class="form-check-label">${context.escapeHtml(option.label)}</span>${description}</label>`;
  }
}());
