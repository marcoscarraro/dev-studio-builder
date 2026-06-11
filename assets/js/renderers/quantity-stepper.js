(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ quantityStepper: renderQuantityStepperComponent });

  function renderQuantityStepperComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const allowNegative = context.toBooleanValue(props.allowNegative);
    const inputAttrs = context.renderInputAttributes({
      type: props.inputType || "number",
      id: props.inputId,
      name: props.inputName,
      value: props.value,
      min: allowNegative ? "" : props.min,
      max: props.max,
      step: props.step,
      pattern: props.pattern,
      customAttributes: props.customAttributes
    });
    const style = context.styleAttr(props.width);

    return [
      `<div${cssClassAttr}${style}>`,
      `  <button${context.classAttr(props.minusCssClass || "btn btn-outline-secondary btn-qty-minus")} type="button" data-qty-action="minus">${context.renderButtonContent(props.minusText || "-", props.minusIcon, "left", props.minusIconColor)}</button>`,
      `  <input${context.classAttr(props.inputCssClass || "form-control text-center item-quantidade")}${inputAttrs}>`,
      `  <button${context.classAttr(props.plusCssClass || "btn btn-outline-secondary btn-qty-plus")} type="button" data-qty-action="plus">${context.renderButtonContent(props.plusText || "+", props.plusIcon, "left", props.plusIconColor)}</button>`,
      "</div>"
    ].join("\n");
  }
}());
