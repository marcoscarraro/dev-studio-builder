(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ "menu-switcher": renderMenuSwitcherComponent });

  function renderMenuSwitcherComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const currentLabel = context.escapeHtml(props.currentLabel || "Empresa");
    const currentSublabel = context.escapeHtml(props.currentSublabel || "");
    const logoUrl = context.escapeAttr(props.logoUrl || "");
    const initials = context.escapeHtml((props.badgeText || currentLabel.substring(0, 2)).toUpperCase());
    const color = context.escapeAttr(props.badgeColor || "blue");
    const items = Array.isArray(props.items) ? props.items : [];

    const badgeHtml = logoUrl
      ? `<span class="avatar avatar-sm" style="background-image:url('${logoUrl}')"></span>`
      : `<span class="avatar avatar-sm bg-${color}-lt">${initials}</span>`;

    const checkHtml = context.renderTablerIcon("check", "");
    const dropdownId = `switcher-dd-${component.id}`;
    const itemsHtml = items.map((item) => {
      const label = context.escapeHtml(item.label || "");
      const sublabel = context.escapeHtml(item.sublabel || "");
      const active = context.toBooleanValue(item.active);
      return [
        `<a class="dropdown-item d-flex align-items-center justify-content-between gap-2" href="${context.escapeAttr(item.href || "#")}">`,
        `  <span style="line-height:1.2">`,
        `    <span style="display:block">${label}</span>`,
        sublabel ? `    <span style="display:block;font-size:.75rem;opacity:.7">${sublabel}</span>` : "",
        `  </span>`,
        active && checkHtml ? `  ${checkHtml}` : "",
        `</a>`
      ].filter(Boolean).join("\n");
    }).join("");

    // Chevrons up/down (selector): sinaliza que ha um menu com opcoes.
    const selectorHtml = '<span class="button-icon ms-auto" style="-webkit-mask-image:url(&quot;public/components/icons/outline/selector.svg&quot;);mask-image:url(&quot;public/components/icons/outline/selector.svg&quot;)" aria-hidden="true"></span>';

    return [
      `<div class="nav-item dropdown" style="display:flex">`,
      `  <a href="#" class="nav-link d-flex align-items-center gap-2 px-1" data-bs-toggle="dropdown" aria-label="Trocar empresa ou sistema" aria-expanded="false">`,
      `    ${badgeHtml}`,
      `    <div style="line-height:1.2">`,
      `      <div style="font-weight:600;font-size:.875rem">${currentLabel}</div>`,
      currentSublabel ? `      <div style="font-size:.75rem;opacity:.7">${currentSublabel}</div>` : "",
      `    </div>`,
      `    ${selectorHtml}`,
      `  </a>`,
      `  <div class="dropdown-menu" id="${dropdownId}">`,
      itemsHtml || '<span class="dropdown-item text-muted" style="pointer-events:none">Sem opcoes</span>',
      `  </div>`,
      `</div>`
    ].filter(Boolean).join("\n");
  }
}());
