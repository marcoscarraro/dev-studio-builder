(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    wysiwyg: renderWysiwygComponent
  });

  window.TemplateBuilderRenderers.registerPreviews({
    wysiwyg: renderWysiwygPreview
  });

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
