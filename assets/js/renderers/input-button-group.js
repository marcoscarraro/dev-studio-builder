(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    inputButtonGroup: renderInputButtonGroupComponent
  });

  function renderInputButtonGroupComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const inputAttrs = context.renderInputAttributes({
      type: props.inputType || "text",
      id: props.inputId,
      name: props.inputName,
      placeholder: props.placeholder,
      value: props.value,
      maxlength: props.maxLength || props.maxlength,
      autocomplete: props.autocomplete,
      pattern: props.pattern,
      dataMask: props.dataMask,
      dataMaskVisible: props.dataMaskVisible,
      customAttributes: props.customAttributes
    });
    const parsedButtons = context.parseDropdownActions(props.buttons);
    let feedback;
    if (props.invalidFeedback) {
      feedback = `<div class="invalid-feedback">${context.escapeHtml(props.invalidFeedback)}</div>`;
    } else {
      feedback = "";
    }
    const inputEl = `<input${context.classAttr(context.mergeClassNames(props.inputCssClass || "form-control", props.textAlign))}${inputAttrs} data-ajax-source>`;

    // buttonsLayout "separated": input e botoes ficam em colunas irmas (row g-2),
    // em vez de dentro do mesmo .input-group — equivale ao antigo "Input com Acao".
    let controls;
    if (props.buttonsLayout === "separated") {
      const inputCol = `  <div class="col">${inputEl}</div>`;
      const buttonCols = parsedButtons.map((action) => `  <div class="col-auto">${context.renderDropdownAction(action)}</div>`);
      if (props.buttonsPosition === "left") {
        controls = [...buttonCols, inputCol];
      } else {
        controls = [inputCol, ...buttonCols];
      }
    } else {
      const buttons = parsedButtons.map(context.renderDropdownAction).join("\n");
      const input = `  ${inputEl}`;
      if (props.buttonsPosition === "left") {
        controls = [context.indent(buttons, 2), input];
      } else {
        controls = [input, context.indent(buttons, 2)];
      }
    }

    return [
      context.renderFormLabel(context.escapeHtml(props.label || ""), ""),
      `<div${cssClassAttr} data-ajax-input-group>`,
      ...controls,
      "</div>",
      feedback
    ].filter((line) => line !== "").join("\n");
  }
}());
