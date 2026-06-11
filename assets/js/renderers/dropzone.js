// Renderer para componente Dropzone (kind: "dropzone").
// Gera um <div class="dropzone"> compativel com a biblioteca Dropzone.js do Tabler.
// IMPORTANTE: e <div>, NAO <form> — o Dropzone aceita qualquer elemento, e um <form>
// aqui quebraria a pagina quando o componente esta dentro do Form container (HTML nao
// permite form aninhado: o navegador fecharia o form externo no lugar errado e o
// submit pararia de funcionar). A URL de upload vai em data-dropzone-url.
// Expoe window.TemplateBuilderDropzoneHelpers.getDropzoneId para reutilizacao no export.
(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ dropzone: renderDropzone });

  function renderDropzone(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var id = getDropzoneId(props, component, context);
    var label;
    if (props.label) {
      label = "<label class=\"form-label\">" + context.escapeHtml(props.label) + "</label>";
    } else {
      label = "";
    }
    var multiple = props.multiple === true || props.multiple === "true";
    // Dois modos de envio (prop autoProcess):
    // - false (padrao): os arquivos vao JUNTO no submit do form, via input oculto "-store".
    // - true: o Dropzone envia sozinho cada arquivo para a "URL de upload" (autoProcessQueue).
    var autoProcess = context.toBooleanValue(props.autoProcess);
    var dzAttrs = " data-dropzone-auto=\"" + (autoProcess ? "true" : "false") + "\""
      + context.attr("data-dropzone-max-files", String(multiple ? (context.toPositiveInteger(props.maxFiles) || 10) : 1))
      + context.attr("data-dropzone-max-filesize", String(context.toPositiveInteger(props.maxFileSizeMb) || 10))
      + context.attr("data-dropzone-accepted-files", (props.acceptedFiles || "").trim());
    // Input file oculto que LEVA os arquivos no submit do formulario. O Dropzone guarda
    // os arquivos numa fila interna (nao sao campos do form); o runtime copia os aceitos
    // para este input via DataTransfer. Com isso, FormData(form) no envio AJAX e o POST
    // tradicional (com enctype multipart/form-data) enviam os arquivos normalmente.
    // O id vem da prop auto-gerada storeId (convencao "dropzone-store-<sufixo>").
    // Nao usar class "fallback": o Dropzone REMOVE elementos .fallback ao inicializar.
    var storeId = String(props.storeId || "").trim() || (id + "-store");
    var store = "<input type=\"file\" id=\"" + context.escapeAttr(storeId) + "\" name=\"" + context.escapeAttr(props.name || "file") + "\"" + (multiple ? " multiple" : "") + " hidden tabindex=\"-1\" aria-hidden=\"true\" data-dropzone-store>";
    var title;
    if (props.title) {
      title = "    <h3 class=\"dropzone-msg-title\">" + context.escapeHtml(props.title) + "</h3>";
    } else {
      title = "";
    }
    var desc;
    if (props.description) {
      desc = "    <span class=\"dropzone-msg-desc\">" + context.escapeHtml(props.description) + "</span>";
    } else {
      desc = "";
    }
    var dzMessage;
    if (title || desc) {
      dzMessage = "  <div class=\"dz-message\">\n" + [title, desc].filter(Boolean).join("\n") + "\n  </div>";
    } else {
      dzMessage = "";
    }
    var help;
    if (props.help) {
      help = "<div class=\"help-text\">" + context.escapeHtml(props.help) + "</div>";
    } else {
      help = "";
    }

    return [
      label,
      "<div" + cssClassAttr + " id=\"" + context.escapeAttr(id) + "\" data-dropzone data-dropzone-store-id=\"" + context.escapeAttr(storeId) + "\" data-dropzone-url=\"" + context.escapeAttr(props.action || "#") + "\"" + dzAttrs + ">",
      dzMessage,
      "</div>",
      store,
      help
    ].filter(Boolean).join("\n");
  }

  window.TemplateBuilderDropzoneHelpers = {
    getDropzoneId: getDropzoneId
  };

  function getDropzoneId(props, component, context) {
    var explicit;
    if (props.dropzoneId) {
      explicit = String(props.dropzoneId).trim();
    } else {
      explicit = "";
    }
    return explicit || context.sanitizeElementId(component.id, "dropzone");
  }
}());
