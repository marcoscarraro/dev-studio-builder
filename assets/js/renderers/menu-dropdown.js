(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ "menu-dropdown": renderMenuDropdownComponent });

  function renderMenuDropdownComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const label = context.escapeHtml(props.label || "Dropdown");
    const iconHtml = props.icon
      ? `<span class="nav-link-icon d-md-none d-lg-inline-block">${context.renderTablerIcon(props.icon)}</span>`
      : "";

    const items = Array.isArray(props.items) ? props.items : [];
    const itemsHtml = items.map((item) => {
      const itemLabel = context.escapeHtml(item.label || "");
      const itemHref = context.escapeAttr(item.href || "#");
      const itemTarget = item.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
      const itemIconHtml = item.icon
        ? context.renderTablerIcon(item.icon)
        : "";
      return `<a class="dropdown-item d-flex align-items-center gap-2" href="${itemHref}"${itemTarget}>${itemIconHtml}${itemLabel}</a>`;
    }).join("");

    const dropdownId = `dd-${component.id}`;
    return [
      `<a class="nav-link dropdown-toggle" href="#${dropdownId}" data-bs-toggle="dropdown" role="button" aria-expanded="false">`,
      iconHtml,
      `<span class="nav-link-title">${label}</span>`,
      `</a>`,
      `<div class="dropdown-menu" id="${dropdownId}">`,
      itemsHtml || '<span class="dropdown-item text-muted" style="pointer-events:none">Sem sub-itens</span>',
      `</div>`
    ].join("");
  }
}());
