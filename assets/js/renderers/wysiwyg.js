(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    wysiwyg: renderWysiwygComponent
  });

  window.TemplateBuilderRenderers.registerPreviews({
    wysiwyg: renderWysiwygPreview
  });

  window.TemplateBuilderRenderers.registerInlineInits({ hugerte: renderWysiwygPageInit });

  // === INIT INLINE DA PAGINA EXPORTADA ===
  // Gera o codigo de inicializacao DIRETO na lib (hugeRTE.init({...})), com plugins e
  // barra de ferramentas abertos — o dev da pagina pode enxugar/estender a vontade.
  function renderWysiwygPageInit(component, context) {
    const props = component.props || {};
    const id = context.sanitizeElementId(props.inputId, context.sanitizeElementId(component.id, "wysiwyg"));
    const js = context.toJsString;
    const height = Math.max(100, context.toPositiveInteger(props.height) || 300);

    const lines = [];
    lines.push("$(function () {");
    lines.push(`  var textarea = document.getElementById(${js(id)});`);
    lines.push('  if (!textarea || textarea.getAttribute("data-hugerte-ready") === "1") return;');
    lines.push('  textarea.setAttribute("data-hugerte-ready", "1");');
    lines.push("");
    lines.push("  var options = {");
    lines.push(`    selector: ${js("#" + id)},`);
    lines.push(`    height: ${height},`);
    lines.push("    menubar: false,");
    lines.push("    statusbar: false,");
    lines.push('    plugins: ["advlist", "autolink", "lists", "link", "charmap", "anchor", "searchreplace", "visualblocks", "code", "fullscreen", "insertdatetime", "media", "table", "help", "wordcount"],');
    lines.push('    toolbar: "undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat",');
    lines.push("    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", sans-serif; font-size: 14px; }'");
    lines.push("  };");
    lines.push("");
    lines.push("  // Tema escuro do Tabler: acompanha o data-bs-theme aplicado no <html>");
    lines.push('  if (document.documentElement.getAttribute("data-bs-theme") === "dark") {');
    lines.push('    options.skin = "oxide-dark";');
    lines.push('    options.content_css = "dark";');
    lines.push("  }");
    lines.push("");
    lines.push("  hugeRTE.init(options);");
    lines.push("});");

    return { title: "Editor WYSIWYG (hugeRTE) #" + id, code: lines.join("\n") };
  }

  function renderWysiwygPreview(component, context) {
    const props = component.props || {};
    const label = context.escapeHtml(props.label || "");
    const height = Math.max(100, parseInt(props.height, 10) || 300);

    return [
      label ? `<label class="form-label">${label}</label>` : "",
      `<div style="height:${height}px;border:1px solid var(--tblr-border-color);border-radius:var(--tblr-border-radius);background:var(--tblr-body-bg);">`,
      `  <div class="d-flex align-items-center justify-content-center h-100 text-muted small">`,
      `    <span>Editor WYSIWYG (${height}px)</span>`,
      `  </div>`,
      `</div>`
    ].filter(Boolean).join("\n");
  }

  function renderWysiwygComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const label = context.escapeHtml(props.label || "");
    const id = context.sanitizeElementId(props.inputId, context.sanitizeElementId(component.id, "wysiwyg"));
    const content = props.initialContent || "";
    const height = Math.max(100, context.toPositiveInteger(props.height) || 300);
    let help;
    if (props.help) {
      help = `<div class="help-text">${context.escapeHtml(props.help)}</div>`;
    } else {
      help = "";
    }

    return [
      label ? `<label class="form-label">${label}</label>` : "",
      `<textarea id="${context.escapeAttr(id)}"${context.attr("name", props.name)} data-hugerte${context.attr("data-hugerte-height", String(height))}>${context.escapeHtml(content)}</textarea>`,
      help
    ].filter(Boolean).join("\n");
  }
}());
