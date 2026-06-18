(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ heading: renderHeadingComponent });

  function renderHeadingComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const level = ["h1", "h2", "h3"].includes(props.level) ? props.level : "h2";
    const align = props.align || "";
    const subtitle = props.subtitle || "";

    const baseClass = context.getComponentClass(component);
    const headingClass = align ? context.mergeClassNames(baseClass, align) : baseClass;
    const heading = `<${level}${context.classAttr(headingClass)}>${context.escapeHtml(props.text || "Titulo")}</${level}>`;

    if (subtitle) {
      return `<div><div class="page-pretitle">${context.escapeHtml(subtitle)}</div>${heading}</div>`;
    }

    return heading;
  }
}());
