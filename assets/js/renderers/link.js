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

    return `<div style="text-align:${context.escapeAttr(align)}"><a${cssClassAttr} href="${href}"${target}${rel}>${content}</a></div>`;
  }
}());
