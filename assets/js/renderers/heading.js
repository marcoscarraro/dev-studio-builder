(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ heading: renderHeadingComponent });

  function renderHeadingComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    let level;
    if (["h1", "h2", "h3"].includes(props.level)) {
      level = props.level;
    } else {
      level = "h2";
    }

    return `<${level}${cssClassAttr}>${context.escapeHtml(props.text || "Titulo")}</${level}>`;
  }
}());
