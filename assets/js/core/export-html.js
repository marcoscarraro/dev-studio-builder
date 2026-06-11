// Gera o HTML completo da pagina exportada.
// Exportado como window.TemplateBuilderExportHtml.
// Recebe um objeto "context" de builder.js com acesso ao state e helpers.
(function () {
  "use strict";

  // === EXPORTACAO DO DOCUMENTO ===
  // exportDocument: monta o HTML completo com <!doctype>, <head>, <body> e os assets
  //   (CSS/JS de terceiros + runtimes). A pagina exportada NAO tem <script> inline: a
  //   inicializacao de cada componente "vivo" e feita pelos runtimes em public/components/js,
  //   que varrem o DOM por atributos data-* (auto-discovery).
  // exportRow / exportComponent: convertem nos do state para HTML de producao.
  // A diferenca do canvas: aqui nao ha wrappers do editor (.builder-row, etc.).
  function exportDocument(context) {
    const assets = collectExportAssets(context);
    const body = context.state.page.children.map((row) => exportRow(context, row)).join("\n");
    let header;
    if (hasRenderableRows(context.state.page.header)) {
      header = context.state.page.header.map((row) => exportRow(context, row)).join("\n");
    } else {
      header = "";
    }
    let footer;
    if (hasRenderableRows(context.state.page.footer)) {
      footer = context.state.page.footer.map((row) => exportRow(context, row)).join("\n");
    } else {
      footer = "";
    }
    const title = context.escapeHtml(context.state.page.props.title || "Pagina");
    const lines = [
      "<!doctype html>",
      '<html lang="pt-BR">',
      "<head>",
      '  <meta charset="utf-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
      '  <meta http-equiv="X-UA-Compatible" content="ie=edge">',
      `  <title>${title}</title>`,
      ...[renderFaviconAsset(context, assets.favicon)].filter(Boolean).map((line) => `  ${line}`),
      ...assets.styles.map((asset) => renderStyleAsset(context, asset)).filter(Boolean).map((line) => `  ${line}`),
      "</head>",
      '<body class="layout-fluid">',
      ...assets.headScripts.map((asset) => renderScriptAsset(context, asset)).filter(Boolean).map((line) => `  ${line}`),
      '  <div class="page">',
      '    <div class="page-wrapper">'
    ];

    if (header) {
      lines.push(
        '      <div class="page-header d-print-none">',
        '        <div class="container-xl">',
        context.indent(header, 10),
        '        </div>',
        '      </div>'
      );
    }

    lines.push(
      '      <div class="page-body">',
      '        <div class="container-xl">',
      '          <div class="export-page">',
      context.indent(body, 10),
      '          </div>',
      '        </div>',
      '      </div>'
    );

    if (footer) {
      lines.push(
        '      <footer class="page-footer footer footer-transparent d-print-none">',
        '        <div class="container-xl">',
        context.indent(footer, 10),
        '        </div>',
        '      </footer>'
      );
    }

    lines.push(
      '    </div>',
      '  </div>',
      ...assets.scripts.map((asset) => renderScriptAsset(context, asset)).filter(Boolean).map((line) => `  ${line}`)
    );

    // Bloco unico com os codigos da pagina (componentes Script JS + envio AJAX de
    // formularios). Emitido DEPOIS das libs para o jQuery ja estar carregado.
    if (assets.pageScripts.length) {
      lines.push("  <script>");
      lines.push("  // === Scripts da pagina ===");
      assets.pageScripts.forEach((snippet) => {
        lines.push(`  // --- ${snippet.title} ---`);
        lines.push(context.indent(sanitizeInlineScript(snippet.code), 2));
      });
      lines.push("  </script>");
    }

    lines.push(
      "</body>",
      "</html>"
    );

    return lines.join("\n");
  }

  function exportRow(context, row) {
    const columns = row.columns.map((column) => {
      const children = column.children.map((component) => exportComponent(context, component)).filter(Boolean).join("\n");
      return [
        `  <div${context.classAttr(context.getColumnClass(column))}>`,
        context.indent(children, 4),
        "  </div>"
      ].join("\n");
    }).join("\n");

    return [
      `<section${context.classAttr(context.getRowClass(row))}>`,
      context.indent(columns, 2),
      "</section>"
    ].join("\n");
  }

  function exportComponent(context, component) {
    const kind = context.getComponentDefinition(component.type).kind;

    if (kind === "hiddenInput") {
      return context.renderHiddenInputHtml(component);
    }

    // Script JS nao sai na posicao do componente: o codigo e emitido no bloco unico
    // de scripts da pagina, depois das libs (ver exportDocument / collectExportAssets).
    if (kind === "jsSnippet") {
      return "";
    }

    return `<div class="export-component">${context.renderComponentHtml(component)}</div>`;
  }

  // === COLETA DE ASSETS E RUNTIMES ===
  // collectExportAssets: percorre todos os componentes da pagina e acumula CSS, scripts de
  //   terceiros e os runtimes (public/components/js) necessarios, sem duplicar URLs.
  //   Cada componente "vivo" apenas marca qual runtime precisa (via assets.init no
  //   components.json); o runtime varre o DOM na pagina exportada e inicializa lendo os
  //   atributos data-*. Para suportar uma lib nova: declarar a chave em assets.runtimes,
  //   apontar assets.init do componente para ela e criar o arquivo <nome>-runtime.js.
  function collectExportAssets(context) {
    const registryAssets = getRegistryAssets(context);
    const assets = {
      favicon: registryAssets.favicon || null,
      styles: [],
      headScripts: [],
      scripts: [],
      // Codigos da pagina (componentes Script JS + envio AJAX de formularios),
      // emitidos num <script> unico apos as libs.
      pageScripts: []
    };
    const seenStyles = new Set();
    const seenHeadScripts = new Set();
    const seenScripts = new Set();
    // Chaves de assets.runtimes que esta pagina precisa (auto-discovery).
    const neededRuntimes = new Set();
    // Mascara (IMask) precisa da lib + do runtime; e disparada por qualquer data-mask.
    let needsMask = false;
    // jQuery e exigido pelo script de envio AJAX do formulario (gerado por pagina).
    let needsJquery = false;

    appendUniqueAssets(assets.styles, seenStyles, registryAssets.styles, "href");
    appendUniqueAssets(assets.headScripts, seenHeadScripts, registryAssets.headScripts, "src");

    collectExportComponents(context).forEach((component) => {
      const definition = context.getComponentDefinition(component.type);
      const componentAssets = definition.assets || {};
      const props = component.props || {};
      appendUniqueAssets(assets.styles, seenStyles, componentAssets.styles, "href");
      appendUniqueAssets(assets.headScripts, seenHeadScripts, componentAssets.headScripts, "src");
      appendUniqueAssets(assets.scripts, seenScripts, componentAssets.scripts, "src");

      // assets.init: "xxx" => precisa do runtime de mesmo nome (chave em assets.runtimes).
      if (componentAssets.init === "datatable") { neededRuntimes.add("datatable"); }
      if (componentAssets.init === "tomselect") { neededRuntimes.add("tomselect"); }
      if (componentAssets.init === "litepicker") { neededRuntimes.add("litepicker"); }
      if (componentAssets.init === "signature") { neededRuntimes.add("signature"); }
      if (componentAssets.init === "hugerte") { neededRuntimes.add("hugerte"); }
      if (componentAssets.init === "apexchart") { neededRuntimes.add("apexchart"); }
      if (componentAssets.init === "fullcalendar") { neededRuntimes.add("fullcalendar"); }
      if (componentAssets.init === "dropzone") { neededRuntimes.add("dropzone"); }
      if (componentAssets.init === "passwordToggle") {
        const inputType = props.inputType || definition.inputType || component.type || "text";
        if (inputType === "password" && context.toBooleanValue(props.showPasswordToggle)) {
          neededRuntimes.add("passwordToggle");
        }
      }
      if (definition.kind === "quantityStepper") {
        neededRuntimes.add("quantityStepper");
      }
      // Formulario com "Enviar via AJAX" habilitado: usa o codigo do textarea
      // "Codigo JS (jQuery)" (props.ajaxCode — editavel e salvo no JSON da pagina).
      // Se estiver vazio, gera a partir das configuracoes. Inclui o jQuery.
      if (definition.kind === "formContainer" && context.toBooleanValue(props.ajaxEnabled) && String(props.ajaxUrl || "").trim()) {
        const formId = context.sanitizeElementId(props.formId, "");
        if (formId) {
          needsJquery = true;
          const code = String(props.ajaxCode || "").trim() || renderFormAjaxScript(context, props, formId);
          assets.pageScripts.push({
            title: `Envio AJAX do formulario #${formId}`,
            code: code
          });
        }
      }
      // Componente Script JS: guarda o codigo para o bloco de scripts da pagina.
      if (definition.kind === "jsSnippet") {
        const code = String(props.code || "").trim();
        if (code) {
          assets.pageScripts.push({
            title: String(props.description || "").replace(/\s+/g, " ").trim() || "Script JS",
            code: code
          });
        }
      }
      if (props.dataMask) {
        needsMask = true;
      }
      if (context.isFieldListComponent(component)) {
        neededRuntimes.add("fieldList");
      }
      if (componentHasAjaxFillAction(context, component)) {
        neededRuntimes.add("ajaxFill");
      }
    });

    appendUniqueAssets(assets.scripts, seenScripts, registryAssets.scripts, "src");

    const runtimes = registryAssets.runtimes || {};
    // A lib imask (defer) vem antes do runtime de mascara.
    if (needsMask) {
      appendRuntime(assets.scripts, seenScripts, runtimes.mask, true);
      appendRuntime(assets.scripts, seenScripts, runtimes.maskInit, false);
    }
    // O script de envio AJAX do form usa jQuery: inclui a lib (deduplicada se o
    // DataTable ou um Script JS ja a incluiu).
    if (needsJquery) {
      appendRuntime(assets.scripts, seenScripts, runtimes.jquery, false);
    }
    // Demais runtimes: a lib de terceiros ja foi anexada no loop (componentAssets.scripts),
    // entao o runtime entra logo depois dela.
    neededRuntimes.forEach((key) => {
      appendRuntime(assets.scripts, seenScripts, runtimes[key], false);
    });

    return assets;
  }

  // sanitizeInlineScript: impede que o conteudo do snippet feche a tag <script> da pagina.
  function sanitizeInlineScript(code) {
    return String(code || "").replace(/<\/script/gi, "<\\/script");
  }

  // === SCRIPT DE ENVIO AJAX DO FORMULARIO ===
  // Gera o script de envio de UM formulario (jQuery), no estilo da documentacao do
  // Laravel. O codigo sai ABERTO no bloco de scripts da pagina exportada, para o dev
  // personalizar a vontade: envio silencioso, SweetAlert, mensagem num elemento, etc.
  function renderFormAjaxScript(context, props, formId) {
    const method = getSafeFormAjaxMethod(props.ajaxMethod);
    const isFormData = props.ajaxFormat === "formdata";
    const headers = buildFormAjaxHeaders(context, props);
    const hasHeaders = Object.keys(headers).length > 0;
    const successMessage = props.ajaxSuccessMessage || "Dados enviados com sucesso";
    const errorMessage = props.ajaxErrorMessage || "Erro ao enviar os dados";
    const redirectUrl = String(props.ajaxRedirectUrl || "").trim();

    const lines = [];
    lines.push("$(function () {");
    lines.push('  // Para Laravel com CSRF (Blade), descomente e garanta a <meta name="csrf-token"> na pagina:');
    lines.push('  // $.ajaxSetup({ headers: { "X-CSRF-TOKEN": $(\'meta[name="csrf-token"]\').attr("content") } });');
    lines.push("");
    lines.push(`  $("#${formId}").on("submit", function (e) {`);
    lines.push("    e.preventDefault(); // evita o reload padrao da pagina");
    lines.push("");
    lines.push("    var form = this;");
    lines.push("");
    lines.push("    // Validacao nativa dos campos (required, type, minlength...).");
    lines.push("    if (!form.checkValidity()) {");
    lines.push("      form.reportValidity();");
    lines.push("      return;");
    lines.push("    }");
    lines.push("");

    if (isFormData) {
      lines.push("    // FormData direto: suporta campo de arquivo; o navegador define o Content-Type.");
      lines.push("    var dados = new FormData(form);");
    } else {
      lines.push("    // Monta { name: valor } com os campos; chaves repetidas (ex.: tags[]) viram array.");
      lines.push("    var dados = {};");
      lines.push("    new FormData(form).forEach(function (valor, chave) {");
      lines.push("      if (Object.prototype.hasOwnProperty.call(dados, chave)) {");
      lines.push("        if (!Array.isArray(dados[chave])) { dados[chave] = [dados[chave]]; }");
      lines.push("        dados[chave].push(valor);");
      lines.push("      } else {");
      lines.push("        dados[chave] = valor;");
      lines.push("      }");
      lines.push("    });");
    }

    lines.push("");
    lines.push("    var botoes = $(form).find(\"button[type='submit'], input[type='submit']\").prop(\"disabled\", true);");
    lines.push("");
    lines.push("    $.ajax({");
    lines.push(`      url: ${context.toJsString(String(props.ajaxUrl).trim())},`);
    lines.push(`      type: ${context.toJsString(method)},`);

    if (hasHeaders) {
      lines.push(`      headers: ${context.toJsLiteral(headers)},`);
    }

    if (isFormData) {
      lines.push("      data: dados,");
      lines.push("      processData: false,");
      lines.push("      contentType: false,");
    } else {
      lines.push("      data: JSON.stringify(dados),");
      lines.push('      contentType: "application/json",');
    }

    lines.push('      dataType: "json",');
    lines.push("      success: function (response) {");
    lines.push("        // Personalize aqui: SweetAlert, mensagem num elemento, envio silencioso...");
    lines.push('        $(form).find(".ajax-form-alert").remove();');
    lines.push('        $(\'<div class="alert alert-success ajax-form-alert" role="alert"></div>\')');
    lines.push(`          .text(${context.toJsString(successMessage)}).prependTo(form);`);

    if (redirectUrl) {
      lines.push(`        window.location.href = ${context.toJsString(redirectUrl)};`);
    } else {
      lines.push('        // window.location.href = "pagina-de-sucesso.html";');
    }

    lines.push("      },");
    lines.push("      error: function (xhr) {");
    lines.push("        console.log(xhr.responseText);");
    lines.push('        $(form).find(".ajax-form-alert").remove();');
    lines.push('        $(\'<div class="alert alert-danger ajax-form-alert" role="alert"></div>\')');
    lines.push(`          .text(${context.toJsString(errorMessage)}).prependTo(form);`);
    lines.push("      },");
    lines.push("      complete: function () {");
    lines.push('        botoes.prop("disabled", false);');
    lines.push("      }");
    lines.push("    });");
    lines.push("  });");
    lines.push("});");

    return lines.join("\n");
  }

  function getSafeFormAjaxMethod(value) {
    const method = String(value || "").toUpperCase();
    if (method === "PUT" || method === "PATCH") {
      return method;
    }
    return "POST";
  }

  // Mescla autenticacao (Bearer / chave em header) + headers extras num objeto unico.
  // Atencao: o token fica visivel no HTML exportado (qualquer auth client-side e visivel).
  function buildFormAjaxHeaders(context, props) {
    const headers = {};
    const token = String(props.ajaxAuthToken || "").trim();

    if (props.ajaxAuthType === "bearer" && token) {
      headers.Authorization = "Bearer " + token;
    }

    if (props.ajaxAuthType === "header" && token) {
      const headerName = String(props.ajaxAuthHeader || "").trim() || "X-API-Key";
      headers[headerName] = token;
    }

    context.normalizeKeyValueEntries(props.ajaxHeaders).forEach((entry) => {
      if (entry.key) {
        headers[entry.key] = entry.value;
      }
    });

    return headers;
  }

  // appendRuntime: anexa um script de runtime (se a URL existir), evitando duplicatas.
  function appendRuntime(target, seen, url, defer) {
    if (!url) {
      return;
    }
    let asset;
    if (defer) {
      asset = { src: url, defer: true };
    } else {
      asset = { src: url };
    }
    appendUniqueAssets(target, seen, [asset], "src");
  }

  function getRegistryAssets(context) {
    if (context.state.componentRegistry && context.state.componentRegistry.assets) {
      return context.state.componentRegistry.assets;
    } else {
      return {};
    }
  }

  function componentHasAjaxFillAction(context, component) {
    let props;
    if (component && component.props) {
      props = component.props;
    } else {
      props = {};
    }
    return [props]
      .concat(Array.isArray(props.buttons) ? props.buttons : [])
      .concat(Array.isArray(props.items) ? props.items : [])
      .concat(Array.isArray(props.extraActions) ? props.extraActions : [])
      .some((action) => context.toBooleanValue(action && action.ajaxEnabled) && action.ajaxUrlTemplate && context.normalizeKeyValueEntries(action.ajaxMappings).length);
  }

  function collectExportComponents(context) {
    const components = [];
    context.getAllRows().forEach((row) => {
      (row.columns || []).forEach((column) => {
        (column.children || []).forEach((component) => {
          components.push(component);
        });
      });
    });
    return components;
  }

  function appendUniqueAssets(target, seen, values, urlKey) {
    (Array.isArray(values) ? values : []).forEach((value) => {
      const url = getAssetUrl(value, urlKey);
      if (!url || seen.has(url)) {
        return;
      }
      seen.add(url);
      target.push(value);
    });
  }

  function getAssetUrl(asset, urlKey) {
    if (typeof asset === "string") {
      return asset;
    }
    if (!asset || typeof asset !== "object") {
      return "";
    }
    return asset[urlKey] || asset.src || asset.href || "";
  }

  function renderFaviconAsset(context, asset) {
    const href = getAssetUrl(asset, "href");
    if (!href) {
      return "";
    }
    return `<link rel="icon" href="${context.escapeAttr(href)}"${renderAssetAttributes(context, asset, ["type"])}>`;
  }

  function renderStyleAsset(context, asset) {
    const href = getAssetUrl(asset, "href");
    if (!href) {
      return "";
    }
    return `<link rel="stylesheet" href="${context.escapeAttr(href)}"${renderAssetAttributes(context, asset, ["media", "integrity", "crossorigin", "referrerpolicy"])}>`;
  }

  function renderScriptAsset(context, asset) {
    const src = getAssetUrl(asset, "src");
    if (!src) {
      return "";
    }
    return `<script src="${context.escapeAttr(src)}"${renderAssetAttributes(context, asset, ["defer", "async", "type", "integrity", "crossorigin", "referrerpolicy"])}></script>`;
  }

  function renderAssetAttributes(context, asset, allowedKeys) {
    if (!asset || typeof asset !== "object") {
      return "";
    }

    return allowedKeys.map((key) => {
      const value = asset[key];
      if (value === true) {
        return ` ${key}`;
      }
      if (value === false || value == null || value === "") {
        return "";
      }
      return ` ${key}="${context.escapeAttr(value)}"`;
    }).join("");
  }

  function hasRenderableRows(rows) {
    return rows.some((row) => {
      return row.columns.some((column) => column.children.length > 0);
    });
  }

  window.TemplateBuilderExportHtml = {
    exportComponent: exportComponent,
    exportDocument: exportDocument,
    exportRow: exportRow,
    // Exposto para o editor preencher o textarea "Codigo JS (jQuery)" do form.
    renderFormAjaxScript: renderFormAjaxScript
  };
}());
