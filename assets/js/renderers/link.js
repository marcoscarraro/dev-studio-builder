(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ link: renderLinkComponent });

  function renderLinkComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    let target;
    if (props.target) {
      target = ` target="${context.escapeAttr(props.target)}"`;
    } else {
      target = "";
    }
    let rel;
    if (props.target === "_blank") {
      rel = ' rel="noopener noreferrer"';
    } else {
      rel = "";
    }

    return `<a${cssClassAttr} href="${context.escapeAttr(props.href || "#")}"${target}${rel}>${context.escapeHtml(props.text || "Link")}</a>`;
  }
}());
