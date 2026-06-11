(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ buttonGroup: renderButtonGroupComponent });

  function renderButtonGroupComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    let type;
    if (props.choiceType === "checkbox") {
      type = "checkbox";
    } else {
      type = "radio";
    }
    const items = context.parseButtonGroupItems(props.items);
    const options = items.map((item, index) => {
      const optionId = `${context.sanitizeElementId(props.inputId, context.sanitizeElementId(component.id, "grupo_botao"))}-${index + 1}`;
      return [
        `<input type="${type}" class="btn-check" name="${context.escapeAttr(props.name || "")}${type === "checkbox" ? "[]" : ""}" id="${context.escapeAttr(optionId)}" value="${context.escapeAttr(item.value)}" autocomplete="off"${item.checked ? " checked" : ""}${item.disabled ? " disabled" : ""}>`,
        `<label for="${context.escapeAttr(optionId)}"${context.classAttr(item.cssClass || props.buttonCssClass || "btn")}>${context.escapeHtml(item.label || item.value)}</label>`
      ].join("\n");
    }).join("\n");
    return [
      context.renderFormLabel(context.escapeHtml(props.label || ""), ""),
      `<div${cssClassAttr} role="group">`,
      context.indent(options, 2),
      "</div>"
    ].filter(Boolean).join("\n");
  }
}());
