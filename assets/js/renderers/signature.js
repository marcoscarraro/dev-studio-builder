(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    signature: renderSignatureComponent
  });

  window.TemplateBuilderRenderers.registerPreviews({
    signature: renderSignaturePreview
  });

  window.TemplateBuilderRenderers.registerInlineInits({ signature: renderSignaturePageInit });

  // === INIT INLINE DA PAGINA EXPORTADA ===
  // Gera o codigo de inicializacao DIRETO na lib (new SignaturePad(canvas, {...})), com
  // limpar, ajuste de resolucao e gravacao no input oculto — tudo aberto para edicao.
  function renderSignaturePageInit(component, context) {
    const props = component.props || {};
    const canvasId = getCanvasId(component, props, context);
    const js = context.toJsString;
    const penColor = (props.penColor || "").trim();
    const hasHidden = Boolean(props.inputName);

    const lines = [];
    lines.push("$(function () {");
    lines.push(`  var canvas = document.getElementById(${js(canvasId)});`);
    lines.push("  if (!canvas || canvas._signaturePad) return;");
    lines.push("");
    lines.push("  var pad = new SignaturePad(canvas, {");
    lines.push(`    backgroundColor: ${js(props.backgroundColor || "transparent")},`);
    if (penColor) {
      lines.push(`    penColor: ${js(penColor)}`);
    } else {
      lines.push("    penColor: window.getComputedStyle(canvas).color  // acompanha o tema");
    }
    lines.push("  });");
    lines.push("  canvas._signaturePad = pad;");
    lines.push("");
    lines.push("  // Botao de limpar a assinatura");
    lines.push(`  var clearBtn = document.getElementById(${js(canvasId + "-clear")});`);
    lines.push("  if (clearBtn) {");
    lines.push("    clearBtn.addEventListener(\"click\", function () { pad.clear(); });");
    lines.push("  }");
    lines.push("");
    lines.push("  // Ajusta a resolucao do canvas ao tamanho exibido (telas retina incluidas)");
    lines.push("  function resizeCanvas() {");
    lines.push("    var ratio = Math.max(window.devicePixelRatio || 1, 1);");
    lines.push("    canvas.width = canvas.offsetWidth * ratio;");
    lines.push("    canvas.height = canvas.offsetHeight * ratio;");
    lines.push('    canvas.getContext("2d").scale(ratio, ratio);');
    lines.push("    pad.fromData(pad.toData());");
    lines.push("  }");
    lines.push('  window.addEventListener("resize", resizeCanvas);');
    lines.push("  resizeCanvas();");
    if (hasHidden) {
      lines.push("");
      lines.push("  // Grava a assinatura (data URL) no input oculto que vai no submit do form");
      lines.push(`  var hidden = document.getElementById(${js(canvasId + "-value")});`);
      lines.push("  if (hidden) {");
      lines.push('    pad.addEventListener("endStroke", function () {');
      lines.push('      hidden.value = pad.isEmpty() ? "" : pad.toDataURL();');
      lines.push("    });");
      lines.push("  }");
    }
    lines.push("});");

    return { title: "Assinatura (SignaturePad) #" + canvasId, code: lines.join("\n") };
  }

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
