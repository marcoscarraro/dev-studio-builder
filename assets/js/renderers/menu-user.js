(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ "menu-user": renderMenuUserComponent });

  function renderMenuUserComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const name = context.escapeHtml(props.name || "Usuario");
    const role = context.escapeHtml(props.role || "");
    const avatarUrl = context.escapeAttr(props.avatarUrl || "");
    const initials = context.escapeHtml((props.avatarInitials || name.substring(0, 2)).toUpperCase());
    const color = context.escapeAttr(props.avatarColor || "blue");
    const items = Array.isArray(props.items) ? props.items : [];

    const avatarHtml = avatarUrl
      ? `<span class="avatar avatar-sm" style="background-image:url('${avatarUrl}')"></span>`
      : `<span class="avatar avatar-sm bg-${color}-lt">${initials}</span>`;

    const dropdownId = `user-dd-${component.id}`;
    const itemsHtml = items.map((item) => {
      return `<a class="dropdown-item" href="${context.escapeAttr(item.href || "#")}">${context.escapeHtml(item.label || "")}</a>`;
    }).join("");

    // Chevrons up/down (selector): sinaliza que ha um menu com opcoes.
    const selectorHtml = '<span class="button-icon ms-auto" style="-webkit-mask-image:url(&quot;public/components/icons/outline/selector.svg&quot;);mask-image:url(&quot;public/components/icons/outline/selector.svg&quot;)" aria-hidden="true"></span>';

    return [
      `<div class="nav-item dropdown" style="display:flex">`,
      `  <a href="#" class="nav-link d-flex align-items-center gap-2 px-1" data-bs-toggle="dropdown" aria-label="Menu do usuario" aria-expanded="false">`,
      `    ${avatarHtml}`,
      `    <div style="line-height:1.2">`,
      `      <div style="font-weight:600;font-size:.875rem">${name}</div>`,
      role ? `      <div style="font-size:.75rem;opacity:.7">${role}</div>` : "",
      `    </div>`,
      `    ${selectorHtml}`,
      `  </a>`,
      `  <div class="dropdown-menu dropdown-menu-end" id="${dropdownId}">`,
      itemsHtml || '<span class="dropdown-item text-muted" style="pointer-events:none">Sem itens</span>',
      `  </div>`,
      `</div>`
    ].filter(Boolean).join("\n");
  }
}());
