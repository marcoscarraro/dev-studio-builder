(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ datePicker: renderDatePickerComponent });

  function renderDatePickerComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const id = context.getDatePickerId(component);

    if (context.toBooleanValue(props.inline)) {
      return [
        context.renderFormLabel(context.escapeHtml(props.label || ""), ""),
        `<div${cssClassAttr} id="${context.escapeAttr(id)}" data-litepicker data-litepicker-inline="true"${context.attr("data-litepicker-format", props.format || "YYYY-MM-DD")}${context.attr("data-litepicker-lang", props.lang || "pt-BR")}></div>`
      ].filter(Boolean).join("\n");
    }

    const mode = props.mode || "date";
    const isRange = mode === "daterange" || mode === "datetimerange";
    const hasTime = mode === "datetime" || mode === "datetimerange";
    let required;
    if (context.toBooleanValue(props.required)) {
      required = ' <span class="required-mark">*</span>';
    } else {
      required = "";
    }
    const icon = context.renderTablerIcon(props.icon, props.iconColor);
    let addon;
    if (icon) {
      addon = `<span class="input-icon-addon">${icon}</span>`;
    } else {
      addon = "";
    }
    const format = props.format || (hasTime ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD");
    const litepickerAttrs = [
      " data-litepicker",
      context.attr("data-litepicker-format", format),
      context.attr("data-litepicker-lang", props.lang || "pt-BR"),
      isRange ? ' data-litepicker-range="true"' : "",
      hasTime ? ' data-litepicker-time="true"' : "",
      hasTime && props.timeStep ? context.attr("data-litepicker-time-step", props.timeStep) : ""
    ].join("");

    const startAttrs = context.renderInputAttributes({
      type: "text",
      id,
      name: props.name,
      placeholder: props.placeholder || (isRange ? "Data inicial" : "Selecione uma data"),
      value: props.value,
      disabled: props.disabled,
      readonly: props.readonly,
      required: props.required,
      customAttributes: props.customAttributes
    });
    const startInput = `<input${context.classAttr(props.inputCssClass || "form-control")}${startAttrs}${litepickerAttrs}>`;
    let startControls;
    if (props.iconPosition === "left") {
      startControls = [addon, startInput];
    } else {
      startControls = [startInput, addon];
    }

    if (!isRange) {
      return [
        context.renderFormLabel(context.escapeHtml(props.label || ""), required),
        `<div${cssClassAttr}>${startControls.join("")}</div>`,
        props.help ? `<div class="help-text">${context.escapeHtml(props.help)}</div>` : ""
      ].filter(Boolean).join("\n");
    }

    const endId = id + "-end";
    const endAttrs = context.renderInputAttributes({
      type: "text",
      id: endId,
      name: props.endName,
      placeholder: props.endPlaceholder || "Data final",
      value: props.endValue,
      disabled: props.disabled,
      readonly: props.readonly
    });
    const endInput = `<input${context.classAttr(props.inputCssClass || "form-control")}${endAttrs}>`;
    let endControls;
    if (props.iconPosition === "left") {
      endControls = [addon, endInput];
    } else {
      endControls = [endInput, addon];
    }

    return [
      context.renderFormLabel(context.escapeHtml(props.label || ""), required),
      `<div class="row g-2">`,
      `  <div class="col-6"><div${cssClassAttr}>${startControls.join("")}</div></div>`,
      `  <div class="col-6"><div${cssClassAttr}>${endControls.join("")}</div></div>`,
      `</div>`,
      props.help ? `<div class="help-text">${context.escapeHtml(props.help)}</div>` : ""
    ].filter(Boolean).join("\n");
  }
}());
