(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ paragraph: renderParagraphComponent });

  function renderParagraphComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const align = props.align || "";
    const muted = context.toBooleanValue(props.muted);

    let cls = context.getComponentClass(component);
    if (align) cls = context.mergeClassNames(cls, align);
    if (muted) cls = context.mergeClassNames(cls, "text-secondary");

    return `<p${context.classAttr(cls)}>${context.escapeHtml(props.text || "")}</p>`;
  }
}());
