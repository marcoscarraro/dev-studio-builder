(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ offcanvas: renderOffcanvasComponent });

  function renderOffcanvasComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const offcanvasId = context.sanitizeElementId(props.offcanvasId, context.sanitizeElementId(component.id, "offcanvas"));
    const parts = [];

    if (context.toBooleanValue(props.showTrigger) !== false) {
      parts.push(renderTrigger(offcanvasId, props, context));
    }

    parts.push(renderOffcanvas(offcanvasId, props, context));
    return parts.filter(Boolean).join("\n");
  }

  function renderTrigger(offcanvasId, props, context) {
    const cssClass = props.triggerCssClass || "btn btn-primary";
    const text = context.escapeHtml(props.triggerText || "Abrir painel");
    return `<button type="button"${context.classAttr(cssClass)} data-bs-toggle="offcanvas" data-bs-target="#${context.escapeAttr(offcanvasId)}" aria-controls="${context.escapeAttr(offcanvasId)}">${text}</button>`;
  }

  function renderOffcanvas(offcanvasId, props, context) {
    const placement = ["start", "end", "top", "bottom"].includes(props.placement) ? props.placement : "end";
    const backdrop = props.backdrop == null ? true : context.toBooleanValue(props.backdrop);
    const scroll = context.toBooleanValue(props.scroll);
    const title = context.escapeHtml(props.title || "Painel");
    const bodyContent = context.escapeHtml(props.bodyContent || "Conteudo do painel.");
    const showClose = props.showClose == null ? true : context.toBooleanValue(props.showClose);

    const backdropAttr = backdrop ? "" : ' data-bs-backdrop="false"';
    const scrollAttr = scroll ? ' data-bs-scroll="true"' : "";

    const closeBtn = showClose
      ? '<button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Fechar"></button>'
      : "";

    return [
      `<div class="offcanvas offcanvas-${context.escapeAttr(placement)}" tabindex="-1" id="${context.escapeAttr(offcanvasId)}"${backdropAttr}${scrollAttr}>`,
      `  <div class="offcanvas-header">`,
      `    <h5 class="offcanvas-title">${title}</h5>`,
      `    ${closeBtn}`,
      `  </div>`,
      `  <div class="offcanvas-body">${bodyContent}</div>`,
      `</div>`
    ].join("\n");
  }
}());
