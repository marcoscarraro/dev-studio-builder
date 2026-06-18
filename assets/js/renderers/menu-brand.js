(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ "menu-brand": renderMenuBrandComponent });

  function renderMenuBrandComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const text = context.escapeHtml(props.text || "Marca");
    const href = context.escapeAttr(props.href || "#");
    const target = props.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
    const logoUrl = context.escapeAttr(props.logoUrl || "");

    const imgHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${text}" class="navbar-brand-image" style="max-height:36px;max-width:120px;object-fit:contain;margin-right:8px">`
      : "";

    return [
      `<a class="navbar-brand navbar-brand-autodark" href="${href}"${target}>`,
      imgHtml,
      `<span class="navbar-brand-text" style="font-weight:700;font-size:1rem">${text}</span>`,
      `</a>`
    ].join("");
  }
}());
