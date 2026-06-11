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

    return `<div style="text-align:${context.escapeAttr(align)}"><button type="${context.escapeAttr(buttonType)}"${cssClassAttr}${actionAttr}>${content}</button></div>`;
  }
}());
