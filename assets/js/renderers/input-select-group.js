(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ inputSelectGroup: renderInputSelectGroupComponent });

  function renderInputSelectGroupComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const options = context.parseOptions(props.options).map((option) => {
      return `<option value="${context.escapeAttr(option.value)}">${context.escapeHtml(option.label)}</option>`;
    }).join("");
    const inputAttrs = context.renderInputAttributes({
      type: props.inputType || "text",
      id: props.inputId,
      name: props.inputName,
      placeholder: props.placeholder,
      value: props.value,
      pattern: props.pattern,
      dataMask: props.dataMask,
      dataMaskVisible: props.dataMaskVisible,
      customAttributes: props.customAttributes
    });
    const selectAttrs = [
      context.idAttr(props.selectId),
      context.attr("name", props.selectName)
    ].join("");

    const input = `  <input${context.classAttr(context.mergeClassNames(props.inputCssClass || "form-control", props.textAlign))}${inputAttrs}>`;
    const select = `  <select${context.classAttr(props.selectCssClass || "form-select")}${selectAttrs}>${options}</select>`;
    let controls;
    if (props.selectPosition === "left") {
      controls = [select, input];
    } else {
      controls = [input, select];
    }
    return [
      context.renderFormLabel(context.escapeHtml(props.label || ""), ""),
      `<div${cssClassAttr}>`,
      ...controls,
      "</div>"
    ].filter((line) => line !== "").join("\n");
  }
}());
