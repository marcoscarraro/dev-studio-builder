(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    signature: renderSignatureComponent
  });

  window.TemplateBuilderRenderers.registerPreviews({
    signature: renderSignaturePreview
  });

  function renderSignaturePreview(component, context) {
    const props = component.props || {};
    const wrapperClass = context.getComponentClass(component) || "signature position-relative";
    const clearBtnClass = props.clearBtnCssClass || "btn btn-icon";
    const clearIcon = context.renderTablerIcon(props.clearIcon || "trash", "");

    return [
      `<div${context.classAttr(wrapperClass)}>`,
      context.indent(`<div class="position-absolute top-0 end-0 p-2">`, 2),
      context.indent(`<div${context.classAttr(clearBtnClass)}>`, 4),
      context.indent(clearIcon, 6),
      context.indent(`</div>`, 4),
      context.indent(`</div>`, 2),
      context.indent(`<canvas class="signature-canvas"></canvas>`, 2),
      `</div>`
    ].join("\n");
  }

  function renderSignatureComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const canvasId = getCanvasId(component, props, context);
    const clearId = canvasId + "-clear";
    const clearLabel = props.clearLabel || "Limpar assinatura";
    const wrapperClass = context.getComponentClass(component) || "signature position-relative";
    const canvasClass = props.canvasCssClass || "signature-canvas";
    const clearBtnClass = props.clearBtnCssClass || "btn btn-icon";
    const clearIcon = context.renderTablerIcon(props.clearIcon || "trash", "");
    const inputName = props.inputName || "";
    const hiddenId = canvasId + "-value";
    const backgroundColor = props.backgroundColor || "transparent";
    const signatureAttrs = " data-signature"
      + context.attr("data-signature-bg", backgroundColor)
      + context.attr("data-signature-pen", props.penColor);

    const clearBtn = [
      `<div class="position-absolute top-0 end-0 p-2">`,
      context.indent(`<div${context.classAttr(clearBtnClass)} id="${context.escapeAttr(clearId)}" title="${context.escapeAttr(clearLabel)}" data-bs-toggle="tooltip">`, 2),
      context.indent(clearIcon, 4),
      context.indent(`</div>`, 2),
      `</div>`
    ].join("\n");

    const lines = [
      `<div${context.classAttr(wrapperClass)}>`,
      context.indent(clearBtn, 2),
      context.indent(`<canvas id="${context.escapeAttr(canvasId)}"${context.classAttr(canvasClass)}${signatureAttrs}></canvas>`, 2)
    ];

    if (inputName) {
      lines.push(context.indent(`<input type="hidden" name="${context.escapeAttr(inputName)}" id="${context.escapeAttr(hiddenId)}">`, 2));
    }

    lines.push(`</div>`);
    return lines.join("\n");
  }

  function getCanvasId(component, props, context) {
    return context.sanitizeElementId(props.canvasId, context.sanitizeElementId(component.id, "signature"));
  }
}());
