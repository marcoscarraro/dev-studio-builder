(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ divider: renderDividerComponent });

  function renderDividerComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const label = props.label || "";
    const cls = context.getComponentClass(component);

    if (label) {
      return `<div${context.classAttr(context.mergeClassNames("hr-text", cls))}>${context.escapeHtml(label)}</div>`;
    }
    return `<hr${context.classAttr(cls)}>`;
  }
}());
