(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ pageFooter: renderPageFooterComponent });

  function renderPageFooterComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const buttons = Array.isArray(props.buttons) && props.buttons.length ? props.buttons : [];
    const sticky = context.toBooleanValue(props.sticky);

    const stickyClass = sticky ? " sticky-footer" : "";

    const btns = buttons.map(function (btn) {
      const text = btn.text || "Acao";
      const type = btn.type || "button";
      const href = btn.href || "#";
      const cls = context.buildButtonClass("btn", btn.variant, context.toBooleanValue(btn.outline), btn.size, btn.cssClass);
      const content = context.renderButtonContent(text, btn.icon || "", btn.iconPosition || "left", btn.iconColor || "");

      if (type === "link") {
        return `<a href="${context.escapeAttr(href)}"${context.classAttr(cls)}>${content}</a>`;
      }
      return `<button type="${context.escapeAttr(type)}"${context.classAttr(cls)}>${content}</button>`;
    }).join("\n");

    return [
      `<div${cssClassAttr}${stickyClass ? ` data-sticky="true"` : ""}>`,
      `<div class="container-xl">`,
      `<div class="row align-items-center">`,
      `<div class="col-auto ms-auto"><div class="btn-list">`,
      btns,
      `</div></div>`,
      `</div></div></div>`
    ].join("\n");
  }
}());
