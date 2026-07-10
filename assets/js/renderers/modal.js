(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    modal: renderModalComponent
  });

  function renderModalComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const modalId = getModalId(component, props, context);
    const parts = [];

    if (context.toBooleanValue(props.showTrigger) !== false) {
      parts.push(renderTriggerButton(modalId, props, context));
    }

    parts.push(renderModal(modalId, props, context));

    return parts.filter(Boolean).join("\n");
  }

  function renderTriggerButton(modalId, props, context) {
    const cssClass = context.buildButtonClass("btn", props.triggerVariant, context.toBooleanValue(props.triggerOutline), props.triggerSize, props.triggerCssClass);
    const icon = context.renderTablerIcon(props.triggerIcon, props.triggerIconColor);
    const text = context.escapeHtml(props.triggerText || "Abrir modal");
    let content;

    if (icon && props.triggerIconPosition === "right") {
      content = `${text}${icon}`;
    } else if (icon) {
      content = `${icon}${text}`;
    } else {
      content = text;
    }

    return `<button type="button"${context.classAttr(cssClass)} data-bs-toggle="modal" data-bs-target="#${context.escapeAttr(modalId)}">${content}</button>`;
  }

  function renderModal(modalId, props, context) {
    const dialogClass = getDialogClass(props, context);
    const staticAttr = context.toBooleanValue(props.staticBackdrop) ? ' data-bs-backdrop="static"' : "";

    return [
      `<div class="modal"${context.attr("id", modalId)} tabindex="-1"${staticAttr}>`,
      context.indent(`<div${context.classAttr(dialogClass)} role="document">`, 2),
      context.indent("<div class=\"modal-content\">", 4),
      context.indent(renderModalInner(props, context), 6),
      context.indent("</div>", 4),
      context.indent("</div>", 2),
      "</div>"
    ].join("\n");
  }

  function getDialogClass(props, context) {
    let cls = "modal-dialog";
    const size = props.size || "";

    if (size) {
      cls = context.mergeClassNames(cls, size);
    }

    if (context.toBooleanValue(props.centered)) {
      cls = context.mergeClassNames(cls, "modal-dialog-centered");
    }

    if (context.toBooleanValue(props.scrollable)) {
      cls = context.mergeClassNames(cls, "modal-dialog-scrollable");
    }

    return cls;
  }

  function renderModalInner(props, context) {
    const parts = [];
    const showHeader = context.toBooleanValue(props.showHeader) !== false;
    const showClose = context.toBooleanValue(props.showClose) !== false;
    const showStatus = context.toBooleanValue(props.showStatus);

    if (!showHeader && showClose) {
      parts.push(`<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>`);
    }

    if (showStatus) {
      const color = props.statusColor || "danger";
      parts.push(`<div${context.classAttr(`modal-status bg-${context.escapeAttr(color)}`)}></div>`);
    }

    if (showHeader) {
      parts.push(renderHeader(props, showClose, context));
    }

    parts.push(renderBody(props, context));

    if (context.toBooleanValue(props.showFooter) !== false) {
      const buttons = getFooterButtons(props);
      if (buttons.length) {
        parts.push(renderFooter(buttons, props, context));
      }
    }

    return parts.filter(Boolean).join("\n");
  }

  function renderHeader(props, showClose, context) {
    const title = context.escapeHtml(props.title || "Titulo do modal");
    const titleTag = props.titleTag || "h5";
    const safeTag = ["h4", "h5", "h6"].includes(titleTag) ? titleTag : "h5";
    const closeBtn = showClose
      ? `\n  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>`
      : "";

    return [
      "<div class=\"modal-header\">",
      `  <${safeTag} class="modal-title">${title}</${safeTag}>${closeBtn}`,
      "</div>"
    ].join("\n");
  }

  function renderBody(props, context) {
    const bodyCssClass = props.bodyCssClass || "modal-body";
    const content = formatText(props.bodyContent || "", context);

    return [
      `<div${context.classAttr(bodyCssClass)}>`,
      `  ${content}`,
      "</div>"
    ].join("\n");
  }

  function renderFooter(buttons, props, context) {
    const footerLayout = props.footerLayout || "default";
    const footerCssClass = props.footerCssClass || "modal-footer";

    if (footerLayout === "grid") {
      return renderFooterGrid(buttons, footerCssClass, context);
    }

    const btnHtml = buttons.map((btn) => renderFooterButton(btn, context)).join("\n");

    return [
      `<div${context.classAttr(footerCssClass)}>`,
      context.indent(btnHtml, 2),
      "</div>"
    ].join("\n");
  }

  function renderFooterGrid(buttons, footerCssClass, context) {
    const cols = buttons.map((btn) => {
      return [
        "<div class=\"col\">",
        context.indent(renderFooterButton(btn, context), 2),
        "</div>"
      ].join("\n");
    }).join("\n");

    return [
      `<div${context.classAttr(footerCssClass)}>`,
      context.indent("<div class=\"w-100\">", 2),
      context.indent("<div class=\"row\">", 4),
      context.indent(cols, 6),
      context.indent("</div>", 4),
      context.indent("</div>", 2),
      "</div>"
    ].join("\n");
  }

  function renderFooterButton(btn, context) {
    const cssClass = context.buildButtonClass("btn", btn.variant, context.toBooleanValue(btn.outline), btn.size, btn.cssClass);
    const dismiss = context.toBooleanValue(btn.dismiss) ? ' data-bs-dismiss="modal"' : "";
    const content = context.renderButtonContent(btn.text || "Botao", btn.icon || "", btn.iconPosition || "left", btn.iconColor || "");
    const href = btn.href || "";

    if (href) {
      return `<a href="${context.escapeAttr(href)}"${context.classAttr(cssClass)}${dismiss}>${content}</a>`;
    }

    return `<button type="button"${context.classAttr(cssClass)}${dismiss}>${content}</button>`;
  }

  function getModalId(component, props, context) {
    return context.sanitizeElementId(props.modalId, context.sanitizeElementId(component.id, "modal"));
  }

  function getFooterButtons(props) {
    if (Array.isArray(props.footerButtons) && props.footerButtons.length) {
      return props.footerButtons.filter(Boolean);
    }

    return [
      { text: "Fechar", cssClass: "btn me-auto", dismiss: true, href: "" },
      { text: "Confirmar", cssClass: "btn btn-primary", dismiss: true, href: "" }
    ];
  }

  function formatText(value, context) {
    return context.escapeHtml(value).replace(/\r?\n/g, "<br>");
  }
}());
