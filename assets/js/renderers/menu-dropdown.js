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
    const renderLeaf = (item) => {
      const itemLabel = context.escapeHtml(item.label || "");
      const itemHref = context.escapeAttr(item.href || "#");
      const itemTarget = item.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
      const itemIconHtml = item.icon ? context.renderTablerIcon(item.icon) : "";
      return `<a class="dropdown-item d-flex align-items-center gap-2" href="${itemHref}"${itemTarget}>${itemIconHtml}${itemLabel}</a>`;
    };
    const itemsHtml = items.map((item) => {
      const children = Array.isArray(item.children) ? item.children : [];
      if (!children.length) {
        return renderLeaf(item);
      }
      // Preview do submenu (2o nivel): cabecalho + itens indentados sempre visiveis.
      const itemLabel = context.escapeHtml(item.label || "");
      const itemIconHtml = item.icon ? context.renderTablerIcon(item.icon) : "";
      const childHtml = children.map((child) => {
        const childLabel = context.escapeHtml(child.label || "");
        const childHref = context.escapeAttr(child.href || "#");
        const childTarget = child.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
        const childIconHtml = child.icon ? context.renderTablerIcon(child.icon) : "";
        return `<a class="dropdown-item dsb-submenu-link d-flex align-items-center gap-2" href="${childHref}"${childTarget} style="padding-left:2.25rem">${childIconHtml}${childLabel}</a>`;
      }).join("");
      return `<div class="dropdown-item dsb-submenu-toggle d-flex align-items-center gap-2" aria-expanded="true">${itemIconHtml}<span>${itemLabel}</span><span class="dsb-submenu-caret ms-auto" aria-hidden="true">&rsaquo;</span></div><div class="dsb-submenu open">${childHtml}</div>`;
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
