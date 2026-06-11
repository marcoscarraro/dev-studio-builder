(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ selectGroup: renderSelectGroupComponent });

  function renderSelectGroupComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    let type;
    if (props.choiceType === "radio") {
      type = "radio";
    } else {
      type = "checkbox";
    }
    const items = context.parseSelectGroupItems(props.items);
    const options = items.map((item, index) => {
      const optionId = `${context.sanitizeElementId(props.inputId, context.sanitizeElementId(component.id, "selectgroup"))}-${index + 1}`;
      const icon = context.renderTablerIcon(item.icon, item.iconColor);
      let content = context.escapeHtml(item.label || item.value);
      if (props.displayMode === "icon") {
        content = icon || content;
      } else if (props.displayMode === "iconText") {
        content = `${icon}${content}`;
      }
      return [
        '<label class="form-selectgroup-item">',
        `  <input id="${context.escapeAttr(optionId)}" type="${type}" name="${context.escapeAttr(props.name || "")}${type === "checkbox" ? "[]" : ""}" value="${context.escapeAttr(item.value)}" class="form-selectgroup-input"${item.checked ? " checked" : ""}${item.disabled ? " disabled" : ""}>`,
        `  <span class="form-selectgroup-label">${content}</span>`,
        "</label>"
      ].join("\n");
    }).join("\n");
    return [
      context.renderFormLabel(context.escapeHtml(props.label || ""), ""),
      `<div${cssClassAttr}>`,
      context.indent(options, 2),
      "</div>"
    ].filter(Boolean).join("\n");
  }
}());
