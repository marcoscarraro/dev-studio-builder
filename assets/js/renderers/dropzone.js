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
  window.TemplateBuilderRenderers.registerInlineInits({ dropzone: renderDropzonePageInit });

  // === INIT INLINE DA PAGINA EXPORTADA ===
  // Gera o codigo de inicializacao DIRETO na lib (new Dropzone(el, options)), com os
  // valores resolvidos. No modo "junto com o form" tambem gera a sincronizacao dos
  // arquivos aceitos para o input file oculto (que vai no submit do formulario).
  function renderDropzonePageInit(component, context) {
    var props = component.props || {};
    var id = getDropzoneId(props, component, context);
    var js = context.toJsString;
    var multiple = props.multiple === true || props.multiple === "true";
    var autoProcess = context.toBooleanValue(props.autoProcess);
    var storeId = String(props.storeId || "").trim() || (id + "-store");
    var acceptedFiles = (props.acceptedFiles || "").trim();

    var lines = [];
    lines.push("// O Dropzone tenta se auto-inicializar em elementos .dropzone; desligamos");
    lines.push("// porque a inicializacao e feita explicitamente abaixo.");
    lines.push("Dropzone.autoDiscover = false;");
    lines.push("");
    lines.push("$(function () {");
    lines.push("  var el = document.getElementById(" + js(id) + ");");
    lines.push("  if (!el || el._dropzone) return;");
    lines.push("");
    lines.push("  var options = {");
    if (autoProcess) {
      lines.push("    autoProcessQueue: true,   // o Dropzone envia cada arquivo sozinho para a URL");
    } else {
      lines.push("    autoProcessQueue: false,  // os arquivos vao JUNTO no submit do form (input oculto)");
    }
    lines.push("    url: " + js((props.action || "#")) + ",");
    lines.push("    maxFiles: " + (multiple ? (context.toPositiveInteger(props.maxFiles) || 10) : 1) + ",");
    lines.push("    maxFilesize: " + (context.toPositiveInteger(props.maxFileSizeMb) || 10) + ",  // MB");
    if (acceptedFiles) {
      lines.push("    acceptedFiles: " + js(acceptedFiles) + ",");
    }
    lines.push("    addRemoveLinks: true");
    lines.push("  };");
    lines.push("");
    lines.push("  // Laravel: envia o token CSRF junto (se existir a <meta name=\"csrf-token\">)");
    lines.push("  var csrfMeta = document.querySelector('meta[name=\"csrf-token\"]');");
    lines.push("  if (csrfMeta && csrfMeta.content) {");
    lines.push('    options.headers = { "X-CSRF-TOKEN": csrfMeta.content };');
    lines.push("  }");
    lines.push("");
    lines.push("  var dz = new Dropzone(el, options);");
    lines.push("  el._dropzone = dz;");
    if (!autoProcess) {
      lines.push("");
      lines.push("  // Copia os arquivos aceitos para o input file oculto #" + storeId + " — assim");
      lines.push("  // eles vao junto no submit do formulario (FormData / multipart).");
      lines.push("  var store = document.getElementById(" + js(storeId) + ");");
      lines.push("  if (store && window.DataTransfer) {");
      lines.push("    var syncStore = function () {");
      lines.push("      var dt = new DataTransfer();");
      lines.push("      dz.getAcceptedFiles().forEach(function (file) { dt.items.add(file); });");
      lines.push("      store.files = dt.files;");
      lines.push("    };");
      lines.push("    // addedfile dispara antes da validacao terminar; o setTimeout(0) espera ela.");
      lines.push("    dz.on(\"addedfile\", function () { setTimeout(syncStore, 0); });");
      lines.push("    dz.on(\"removedfile\", syncStore);");
      lines.push("    dz.on(\"error\", function () { setTimeout(syncStore, 0); });");
      lines.push("  }");
    }
    lines.push("});");

    return { title: "Dropzone #" + id, code: lines.join("\n") };
  }

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
