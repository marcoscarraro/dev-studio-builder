(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    card: renderCardComponent
  });

  function renderCardComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const title = context.escapeHtml(props.title || "Card");
    const content = context.escapeHtml(props.content || "");

    return `<article${cssClassAttr}><header class="card-header"><h3 class="card-title">${title}</h3></header><div class="card-body">${content}</div></article>`;
  }
}());
