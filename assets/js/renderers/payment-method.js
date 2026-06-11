(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ paymentMethod: renderPaymentMethodComponent });

  function renderPaymentMethodComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const items = context.parsePaymentMethods(props.items);
    const options = items.map((item, index) => {
      const optionId = `${context.sanitizeElementId(props.inputId, context.sanitizeElementId(component.id, "pagamento"))}-${index + 1}`;
      const provider = String(item.provider || "card").toLowerCase().replace(/[^a-z0-9-]/g, "");
      return [
        '<label class="form-selectgroup-item flex-fill">',
        `  <input id="${context.escapeAttr(optionId)}" type="radio" name="${context.escapeAttr(props.name || "")}" value="${context.escapeAttr(item.value)}" class="form-selectgroup-input"${item.checked ? " checked" : ""}${item.disabled ? " disabled" : ""}>`,
        '  <div class="form-selectgroup-label d-flex align-items-center p-3">',
        '    <div class="me-3"><span class="form-selectgroup-check"></span></div>',
        `    <div><span class="payment payment-provider-${context.escapeAttr(provider)} payment-xs me-2"></span>${context.escapeHtml(item.label || "")}</div>`,
        "  </div>",
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
