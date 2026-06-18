(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ badge: renderBadgeComponent });

  function renderBadgeComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const text = context.escapeHtml(props.text || "Badge");
    const variant = props.variant || "primary";
    const pill = context.toBooleanValue(props.pill);
    const outline = context.toBooleanValue(props.outline);

    let cls = outline ? `badge badge-outline text-${variant}` : `badge bg-${variant}`;
    if (pill) cls += " rounded-pill";

    return `<span${context.classAttr(cls)}>${text}</span>`;
  }
}());
