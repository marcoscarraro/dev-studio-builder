(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    button: renderButtonComponent
  });

  function renderButtonComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const align = props.align || "left";
    const buttonType = context.getSafeButtonType(props.buttonType);
    const actionAttr = context.fieldListActionAttr(props.fieldListAction);
    const content = context.renderButtonContent(props.text || "Botao", props.icon, props.iconPosition, props.iconColor);
    const disabled = context.toBooleanValue(props.disabled);
    const href = props.href || "";
    const target = props.target || "";
    const disabledAttr = disabled ? " disabled" : "";

    // If user overrode cssClass, use it directly; otherwise build from variant + outline + size
    let btnClassAttr;
    if (component.props && component.props.cssClass !== undefined) {
      btnClassAttr = cssClassAttr;
    } else {
      const variant = props.variant || "primary";
      const outline = context.toBooleanValue(props.outline);
      const size = props.size || "";
      const variantClass = outline ? `btn-outline-${variant}` : `btn-${variant}`;
      let cls = `button-preview btn ${variantClass}`;
      if (size) cls += ` ${size}`;
      btnClassAttr = context.classAttr(cls);
    }

    if (href) {
      const targetAttr = target ? ` target="${context.escapeAttr(target)}"` : "";
      return `<div style="text-align:${context.escapeAttr(align)}"><a href="${context.escapeAttr(href)}"${btnClassAttr}${targetAttr}${disabledAttr}>${content}</a></div>`;
    }

    return `<div style="text-align:${context.escapeAttr(align)}"><button type="${context.escapeAttr(buttonType)}"${btnClassAttr}${actionAttr}${disabledAttr}>${content}</button></div>`;
  }
}());
