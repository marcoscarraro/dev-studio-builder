(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ pageHeader: renderPageHeaderComponent });

  function renderPageHeaderComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const title = context.escapeHtml(props.title || "Titulo da Pagina");
    const subtitle = props.subtitle || "";
    const showActions = context.toBooleanValue(props.showActions);
    const actions = Array.isArray(props.actions) && props.actions.length ? props.actions : [];

    const pretitle = subtitle
      ? `<div class="page-pretitle">${context.escapeHtml(subtitle)}</div>`
      : "";

    let actionsHtml = "";
    if (showActions && actions.length) {
      const btns = actions.map(function (action) {
        const text = action.text || "Acao";
        const href = action.href || "#";
        const cls = action.cssClass || "btn btn-primary";
        const content = context.renderButtonContent(text, action.icon, action.iconPosition || "left", action.iconColor);
        return `<a href="${context.escapeAttr(href)}"${context.classAttr(cls)}>${content}</a>`;
      }).join("\n");
      actionsHtml = `<div class="col-auto ms-auto d-print-none"><div class="btn-list">\n${btns}\n</div></div>`;
    }

    return [
      `<div${cssClassAttr}>`,
      `<div class="container-xl">`,
      `<div class="row g-2 align-items-center">`,
      `<div class="col">${pretitle}<h2 class="page-title">${title}</h2></div>`,
      actionsHtml,
      `</div></div></div>`
    ].join("\n");
  }
}());
