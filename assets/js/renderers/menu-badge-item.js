(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ "menu-badge-item": renderMenuBadgeItemComponent });

  function renderMenuBadgeItemComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const label = context.escapeHtml(props.label || "Item");
    const href = context.escapeAttr(props.href || "#");
    const target = props.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
    const badgeText = context.escapeHtml(props.badgeText || "");
    const badgeColor = context.escapeAttr(props.badgeColor || "red");
    const iconHtml = props.icon
      ? `<span class="nav-link-icon d-md-none d-lg-inline-block">${context.renderTablerIcon(props.icon)}</span>`
      : "";
    const badgeHtml = badgeText
      ? `<span class="badge bg-${badgeColor} ms-auto badge-sm">${badgeText}</span>`
      : "";

    return `<a class="nav-link d-flex align-items-center" href="${href}"${target}>${iconHtml}<span class="nav-link-title">${label}</span>${badgeHtml}</a>`;
  }
}());
