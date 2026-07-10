(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ link: renderLinkComponent });

  function renderLinkComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const align = props.align || "left";
    const target = props.target ? ` target="${context.escapeAttr(props.target)}"` : "";
    const rel = props.target === "_blank" ? ' rel="noopener noreferrer"' : "";
    const href = context.escapeAttr(props.href || "#");
    const content = context.renderButtonContent(props.text || "Link", props.icon, props.iconPosition, props.iconColor);

    // Se o dev sobrescreveu cssClass, usa direto; senao computa a partir de variant/outline/size.
    // variant "link" e um caso especial do Tabler (texto sem fundo, sem outline) — nao passa por
    // buildButtonClass, que so conhece a familia btn-{cor}/btn-outline-{cor}.
    let linkClassAttr;
    if (component.props && component.props.cssClass !== undefined) {
      linkClassAttr = cssClassAttr;
    } else if (props.variant === "link" || !props.variant) {
      linkClassAttr = context.classAttr("btn btn-link");
    } else {
      linkClassAttr = context.classAttr(context.buildButtonClass("btn", props.variant, context.toBooleanValue(props.outline), props.size, ""));
    }

    return `<div style="text-align:${context.escapeAttr(align)}"><a${linkClassAttr} href="${href}"${target}${rel}>${content}</a></div>`;
  }
}());
