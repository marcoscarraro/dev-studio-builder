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

    const menuLayout = context.state.page.props.menuLayout || "none";
    const menuTheme = context.state.page.props.menuTheme || "dark";
    const menuPosition = context.state.page.props.menuPosition || "left";
    const themeAttr = menuTheme === "dark" ? ' data-bs-theme="dark"' : "";
    const hasSidebar = menuLayout === "vertical" || menuLayout === "combo" || menuLayout === "combo-pill";
    const hasNavbar = menuLayout === "horizontal" || menuLayout === "combo" || menuLayout === "combo-pill";
    const isPillLayout = menuLayout === "combo-pill";
    const sidebarHtml = hasSidebar ? (isPillLayout ? exportIconSidebar(context) : exportSidebar(context, menuPosition, themeAttr)) : "";
    const navbarHtml = hasNavbar ? (isPillLayout ? exportPillNavbar(context, themeAttr) : exportNavbar(context, themeAttr)) : "";

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
      ...(isPillLayout ? ['  <link rel="stylesheet" href="public/components/css/pill-layout.css">'] : []),
      "</head>",
      '<body class="layout-fluid">',
      ...assets.headScripts.map((asset) => renderScriptAsset(context, asset)).filter(Boolean).map((line) => `  ${line}`),
      '  <div class="page">'
    ];

    if (sidebarHtml) {
      lines.push(context.indent(sidebarHtml, 4));
    }
    if (navbarHtml) {
      lines.push(context.indent(navbarHtml, 4));
    }

    lines.push('    <div class="page-wrapper">');

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

    if (isPillLayout) {
      lines.push('  <script src="public/components/js/pill-layout.js" defer></script>');
    }

    lines.push(
      "</body>",
      "</html>"
    );

    return lines.join("\n");
  }

  function exportSidebar(context, position, themeAttr) {
    const posClass = position === "right" ? " navbar-end" : "";
    const sidebarWidth = context.state.page.props.menuSidebarWidth || "normal";
    const widthClass = sidebarWidth === "compact" ? " navbar-vertical-sm" : "";
    const items = exportMenuItems(context, context.state.page.sidebar);
    return [
      `<aside class="navbar navbar-vertical navbar-expand-lg${posClass}${widthClass}"${themeAttr}>`,
      '  <div class="container-xl">',
      '    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#sidebar-menu" aria-controls="sidebar-menu" aria-expanded="false" aria-label="Toggle navigation">',
      '      <span class="navbar-toggler-icon"></span>',
      '    </button>',
      '    <div class="collapse navbar-collapse" id="sidebar-menu">',
      '      <ul class="navbar-nav pt-lg-3">',
      items ? context.indent(items, 8) : '',
      '      </ul>',
      '    </div>',
      '  </div>',
      '</aside>'
    ].filter((line) => line !== '').join("\n");
  }

  function exportNavbar(context, themeAttr) {
    const sticky = context.toBooleanValue(context.state.page.props.menuSticky);
    const stickyClass = sticky ? " navbar-sticky" : "";
    const navContent = exportMenuNavSections(context, context.state.page.navbar, "navbar-nav flex-row order-md-no-order");
    return [
      `<header class="navbar navbar-expand-md d-print-none${stickyClass}"${themeAttr}>`,
      '  <div class="container-xl">',
      '    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-menu" aria-controls="navbar-menu" aria-expanded="false" aria-label="Toggle navigation">',
      '      <span class="navbar-toggler-icon"></span>',
      '    </button>',
      '    <div class="collapse navbar-collapse" id="navbar-menu">',
      navContent ? context.indent(navContent, 6) : '',
      '    </div>',
      '  </div>',
      '</header>'
    ].filter((line) => line !== '').join("\n");
  }

  function exportMenuItems(context, rows) {
    if (!Array.isArray(rows) || !rows.length) {
      return "";
    }
    const lines = [];
    rows.forEach((row) => {
      if (!Array.isArray(row.columns)) return;
      row.columns.forEach((column) => {
        if (!Array.isArray(column.children)) return;
        column.children.forEach((component) => {
          lines.push(exportMenuComponent(context, component));
        });
      });
    });
    return lines.filter(Boolean).join("\n");
  }

  function hasMultiColumnRows(rows) {
    return Array.isArray(rows) && rows.some(function (r) {
      return Array.isArray(r.columns) && r.columns.length > 1;
    });
  }

  // Returns complete <ul class="navbar-nav"> section(s) for navbar export.
  // For single-column-only rows: one <ul singleGroupClass>all items</ul>.
  // For rows with multiple columns: one <ul navbar-nav> per column, with
  // me-auto / mx-auto alignment so they spread left / center / right.
  function exportMenuNavSections(context, rows, singleGroupClass) {
    if (!Array.isArray(rows) || !rows.length) return "";

    if (!hasMultiColumnRows(rows)) {
      const items = exportMenuItems(context, rows);
      return items ? `<ul class="${singleGroupClass}">\n${items}\n</ul>` : "";
    }

    // Multi-column mode: collect sections
    var sections = [];

    rows.forEach(function (row) {
      if (!Array.isArray(row.columns)) return;

      if (row.columns.length === 1) {
        var items = (row.columns[0].children || [])
          .map(function (c) { return exportMenuComponent(context, c); })
          .filter(Boolean).join("\n");
        if (!items) return;
        var last = sections[sections.length - 1];
        if (last && last.type === "single") {
          last.items += "\n" + items;
        } else {
          sections.push({ type: "single", items: items });
        }
      } else {
        var colItems = row.columns.map(function (col) {
          return (col.children || [])
            .map(function (c) { return exportMenuComponent(context, c); })
            .filter(Boolean).join("\n");
        });
        sections.push({ type: "columns", colItems: colItems });
      }
    });

    var parts = [];
    sections.forEach(function (section) {
      if (section.type === "single") {
        parts.push("<ul class=\"navbar-nav\">\n" + section.items + "\n</ul>");
      } else {
        var count = section.colItems.length;
        section.colItems.forEach(function (items, i) {
          var cls;
          if (i === 0) cls = "navbar-nav me-auto";
          else if (i === count - 1) cls = "navbar-nav";
          else cls = "navbar-nav mx-auto";
          parts.push("<ul class=\"" + cls + "\">\n" + (items || "") + "\n</ul>");
        });
      }
    });

    return parts.join("\n");
  }

  function exportMenuComponent(context, component) {
    const esc = context.escapeAttr;
    const html = context.escapeHtml;

    if (component.type === "menu-item") {
      const props = component.props || {};
      const label = html(props.label || "Item");
      const href = esc(props.href || "#");
      const target = props.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
      const iconHtml = props.icon
        ? `<span class="nav-link-icon d-md-none d-lg-inline-block"><i class="ti ti-${esc(props.icon)}"></i></span>`
        : "";
      return [
        '<li class="nav-item">',
        `  <a class="nav-link" href="${href}"${target}>${iconHtml}<span class="nav-link-title">${label}</span></a>`,
        '</li>'
      ].join("\n");
    }

    if (component.type === "menu-dropdown") {
      const props = component.props || {};
      const label = html(props.label || "Dropdown");
      const iconHtml = props.icon
        ? `<span class="nav-link-icon d-md-none d-lg-inline-block"><i class="ti ti-${esc(props.icon)}"></i></span>`
        : "";
      const items = Array.isArray(props.items) ? props.items : [];
      const subItemsHtml = items.map((item) => {
        const itemTarget = item.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
        const itemIconUrl = item.icon ? `public/tabler/icons/outline/${esc(String(item.icon).replace(/[^A-Za-z0-9_-]/g, ""))}.svg` : "";
        const itemIconHtml = itemIconUrl
          ? `<span class="button-icon me-2" style="-webkit-mask-image:url(&quot;${itemIconUrl}&quot;);mask-image:url(&quot;${itemIconUrl}&quot;)" aria-hidden="true"></span>`
          : "";
        return `  <a class="dropdown-item d-flex align-items-center" href="${esc(item.href || "#")}"${itemTarget}>${itemIconHtml}${html(item.label || "")}</a>`;
      }).join("\n");
      const dropdownId = `dd-${component.id}`;
      return [
        '<li class="nav-item dropdown">',
        `  <a class="nav-link dropdown-toggle" href="#${dropdownId}" data-bs-toggle="dropdown" role="button" aria-expanded="false">`,
        `    ${iconHtml}<span class="nav-link-title">${label}</span>`,
        '  </a>',
        `  <div class="dropdown-menu" id="${dropdownId}">`,
        subItemsHtml,
        '  </div>',
        '</li>'
      ].join("\n");
    }

    if (component.type === "menu-divider") {
      return '<li class="nav-item"><hr class="navbar-divider my-2"></li>';
    }

    if (component.type === "menu-label") {
      const props = component.props || {};
      const label = html(props.label || "");
      return `<li class="nav-item"><span class="nav-link nav-link-title text-uppercase" style="font-size:.65em;opacity:.7">${label}</span></li>`;
    }

    if (component.type === "menu-brand") {
      const props = component.props || {};
      const text = html(props.text || "Marca");
      const href = esc(props.href || "#");
      const target = props.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
      const logoUrl = esc(props.logoUrl || "");
      const imgHtml = logoUrl
        ? `<img src="${logoUrl}" alt="${text}" class="navbar-brand-image" style="max-height:36px">`
        : "";
      return `<div class="navbar-brand navbar-brand-autodark"><a href="${href}"${target}>${imgHtml}<span class="navbar-brand-text">${text}</span></a></div>`;
    }

    if (component.type === "menu-badge-item") {
      const props = component.props || {};
      const label = html(props.label || "Item");
      const href = esc(props.href || "#");
      const target = props.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
      const badgeText = html(props.badgeText || "");
      const badgeColor = esc(props.badgeColor || "red");
      const iconHtml = props.icon
        ? `<span class="nav-link-icon d-md-none d-lg-inline-block"><i class="ti ti-${esc(props.icon)}"></i></span>`
        : "";
      const badgeHtml = badgeText ? `<span class="badge bg-${badgeColor} ms-auto badge-sm">${badgeText}</span>` : "";
      return [
        '<li class="nav-item">',
        `  <a class="nav-link d-flex align-items-center" href="${href}"${target}>${iconHtml}<span class="nav-link-title">${label}</span>${badgeHtml}</a>`,
        '</li>'
      ].join("\n");
    }

    if (component.type === "menu-user") {
      const props = component.props || {};
      const name = html(props.name || "Usuario");
      const role = html(props.role || "");
      const avatarUrl = esc(props.avatarUrl || "");
      const initials = html((props.avatarInitials || (props.name || "U").substring(0, 2)).toUpperCase());
      const color = esc(props.avatarColor || "blue");
      const items = Array.isArray(props.items) ? props.items : [];
      const avatarHtml = avatarUrl
        ? `<span class="avatar avatar-sm" style="background-image:url('${avatarUrl}')"></span>`
        : `<span class="avatar avatar-sm bg-${color}-lt">${initials}</span>`;
      const subItemsHtml = items.map((item) => {
        return `    <a class="dropdown-item" href="${esc(item.href || "#")}">${html(item.label || "")}</a>`;
      }).join("\n");
      const dropdownId = `user-dd-${component.id}`;
      return [
        '<li class="nav-item dropdown">',
        `  <a href="#" class="nav-link d-flex align-items-center gap-2 px-1" data-bs-toggle="dropdown" aria-label="Menu do usuario" aria-expanded="false">`,
        `    ${avatarHtml}`,
        `    <div class="d-none d-xl-block"><div style="font-weight:600">${name}</div>${role ? `<div class="small text-secondary">${role}</div>` : ""}</div>`,
        `  </a>`,
        `  <div class="dropdown-menu dropdown-menu-end dropdown-menu-arrow" id="${dropdownId}">`,
        subItemsHtml,
        `  </div>`,
        '</li>'
      ].join("\n");
    }

    if (component.type === "menu-search") {
      const props = component.props || {};
      const placeholder = esc(props.placeholder || "Buscar...");
      return [
        '<li class="nav-item">',
        '  <div class="input-icon">',
        `    <input type="search" class="form-control form-control-sm" placeholder="${placeholder}">`,
        '    <span class="input-icon-addon"><svg xmlns="http://www.w3.org/2000/svg" class="icon icon-2" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/><path d="M21 21l-6 -6"/></svg></span>',
        '  </div>',
        '</li>'
      ].join("\n");
    }

    if (component.type === "menu-spacer") {
      return '<li class="nav-item flex-fill"></li>';
    }

    return "";
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
      if (componentAssets.init === "barcodeScanner") { neededRuntimes.add("barcodeScanner"); }
      if (componentAssets.init === "audioRecorder") { neededRuntimes.add("audioRecorder"); }
      if (context.toBooleanValue(props.showCopy)) { neededRuntimes.add("clipboard"); }
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

  // === LAYOUT COMBO-PILL: navbar flutuante (pill) + sidebar de icones ===

  function exportPillNavbar(context, themeAttr) {
    const navContent = exportMenuNavSections(context, context.state.page.navbar, "navbar-nav me-auto");
    const mobileModules = exportMobileSidebarItems(context, context.state.page.sidebar);
    const mobileSection = mobileModules
      ? [
          '      <div class="app-mobile-modules d-md-none">',
          '        <div class="app-mobile-modules-label">Menu</div>',
          '        <ul class="navbar-nav">',
          context.indent(mobileModules, 10),
          '        </ul>',
          '      </div>'
        ].join("\n")
      : '';
    return [
      `<header class="navbar navbar-expand-md app-pill-navbar d-print-none"${themeAttr}>`,
      '  <div class="container-fluid">',
      '    <button class="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#pillNavOffcanvas" aria-controls="pillNavOffcanvas" aria-expanded="false" aria-label="Abrir menu">',
      '      <span class="navbar-toggler-icon"></span>',
      '    </button>',
      '    <div class="offcanvas offcanvas-start offcanvas-md" tabindex="-1" id="pillNavOffcanvas" aria-labelledby="pillNavOffcanvasLabel">',
      '      <div class="offcanvas-header d-md-none">',
      '        <span class="offcanvas-title fw-bold" id="pillNavOffcanvasLabel">Menu</span>',
      '        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#pillNavOffcanvas" aria-label="Fechar"></button>',
      '      </div>',
      '      <div class="offcanvas-body">',
      navContent ? context.indent(navContent, 8) : '',
      mobileSection,
      '      </div>',
      '    </div>',
      '  </div>',
      '</header>'
    ].filter((line) => line !== '').join("\n");
  }

  function exportMobileSidebarItems(context, rows) {
    if (!Array.isArray(rows) || !rows.length) return "";
    const esc = context.escapeAttr;
    const html = context.escapeHtml;
    const lines = [];
    rows.forEach((row) => {
      if (!Array.isArray(row.columns)) return;
      row.columns.forEach((column) => {
        if (!Array.isArray(column.children)) return;
        column.children.forEach((component) => {
          const props = component.props || {};
          if (component.type === "menu-item") {
            const label = html(props.label || "Item");
            const href = esc(props.href || "#");
            const target = props.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
            const iconUrl = `public/tabler/icons/outline/${esc((props.icon || "circle").replace(/[^A-Za-z0-9_-]/g, ""))}.svg`;
            lines.push(
              '<li class="nav-item">',
              `  <a class="nav-link" href="${href}"${target}>`,
              `    <span class="button-icon me-2" style="-webkit-mask-image:url(&quot;${iconUrl}&quot;);mask-image:url(&quot;${iconUrl}&quot;)" aria-hidden="true"></span>`,
              `    <span class="nav-link-title">${label}</span>`,
              '  </a>',
              '</li>'
            );
          } else if (component.type === "menu-dropdown") {
            const label = html(props.label || "Dropdown");
            const iconUrl = `public/tabler/icons/outline/${esc((props.icon || "circle").replace(/[^A-Za-z0-9_-]/g, ""))}.svg`;
            const subItems = Array.isArray(props.items) ? props.items : [];
            const dropId = `mob-drop-${Math.random().toString(36).slice(2, 8)}`;
            const subHtml = subItems.map((item) => {
              const itemTarget = item.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
              const itemIconUrl = item.icon ? `public/tabler/icons/outline/${esc(String(item.icon).replace(/[^A-Za-z0-9_-]/g, ""))}.svg` : "";
              const itemIconHtml = itemIconUrl
                ? `<span class="button-icon me-2" style="-webkit-mask-image:url(&quot;${itemIconUrl}&quot;);mask-image:url(&quot;${itemIconUrl}&quot;)" aria-hidden="true"></span>`
                : "";
              return `    <a class="dropdown-item d-flex align-items-center" href="${esc(item.href || "#")}"${itemTarget}>${itemIconHtml}${html(item.label || "")}</a>`;
            }).join("\n");
            lines.push(
              '<li class="nav-item dropdown">',
              `  <a class="nav-link dropdown-toggle" href="#${dropId}" data-bs-toggle="dropdown" data-bs-auto-close="outside" role="button" aria-expanded="false">`,
              `    <span class="button-icon me-2" style="-webkit-mask-image:url(&quot;${iconUrl}&quot;);mask-image:url(&quot;${iconUrl}&quot;)" aria-hidden="true"></span>`,
              `    <span class="nav-link-title">${label}</span>`,
              '  </a>',
              `  <div class="dropdown-menu" data-bs-theme="light">`,
              subHtml,
              '  </div>',
              '</li>'
            );
          } else if (component.type === "menu-divider") {
            lines.push('<li class="nav-item"><hr class="dropdown-divider my-1"></li>');
          } else if (component.type === "menu-label") {
            lines.push(`<li class="nav-item"><span class="nav-link text-uppercase small fw-bold text-secondary" style="font-size:.65rem;letter-spacing:.06em">${html(props.label || "")}</span></li>`);
          }
        });
      });
    });
    return lines.join("\n");
  }

  function exportIconSidebar(context) {
    const rows = context.state.page.sidebar;
    const items = exportIconSidebarItems(context, rows);
    return [
      '<aside class="app-icon-sidebar" id="appIconSidebar">',
      '  <ul class="side-nav">',
      items ? context.indent(items, 4) : '',
      '  </ul>',
      '</aside>'
    ].filter((line) => line !== '').join("\n");
  }

  function makeSideIconHtml(iconName, esc) {
    const name = esc((iconName || "circle").replace(/[^A-Za-z0-9_-]/g, ""));
    const url = `public/tabler/icons/outline/${name}.svg`;
    return `<span class="side-icon"><span class="button-icon" style="-webkit-mask-image:url(&quot;${url}&quot;);mask-image:url(&quot;${url}&quot;)" aria-hidden="true"></span></span>`;
  }

  function exportIconSidebarItems(context, rows) {
    if (!Array.isArray(rows) || !rows.length) return "";
    const esc = context.escapeAttr;
    const html = context.escapeHtml;
    const caretSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6l-6 6"/></svg>';
    const lines = [];

    rows.forEach((row) => {
      if (!Array.isArray(row.columns)) return;
      row.columns.forEach((column) => {
        if (!Array.isArray(column.children)) return;
        column.children.forEach((component) => {
          const props = component.props || {};

          if (component.type === "menu-item") {
            const label = html(props.label || "Item");
            const href = esc(props.href || "#");
            const target = props.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
            const iconHtml = makeSideIconHtml(props.icon, esc);
            lines.push(
              '<li class="side-item">',
              `  <a class="side-link" href="${href}"${target} data-leaf data-bs-toggle="tooltip" data-bs-placement="right" title="${label}">`,
              `    ${iconHtml}`,
              `    <span class="side-text">${label}</span>`,
              '  </a>',
              '</li>'
            );
          } else if (component.type === "menu-dropdown") {
            const label = html(props.label || "Dropdown");
            const iconHtml = makeSideIconHtml(props.icon, esc);
            const subItems = Array.isArray(props.items) ? props.items : [];
            const subHtml = subItems.map((item) => {
              const itemTarget = item.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
              const itemIconUrl = item.icon ? `public/tabler/icons/outline/${esc(String(item.icon).replace(/[^A-Za-z0-9_-]/g, ""))}.svg` : "";
              const itemIconHtml = itemIconUrl
                ? `<span class="button-icon me-1" style="-webkit-mask-image:url(&quot;${itemIconUrl}&quot;);mask-image:url(&quot;${itemIconUrl}&quot;)" aria-hidden="true"></span>`
                : "";
              return `  <li><a class="side-sublink" href="${esc(item.href || "#")}"${itemTarget} data-leaf>${itemIconHtml}${html(item.label || "")}</a></li>`;
            }).join("\n");
            lines.push(
              '<li class="side-item">',
              `  <a class="side-link" href="#" data-sub data-bs-toggle="tooltip" data-bs-placement="right" title="${label}">`,
              `    ${iconHtml}`,
              `    <span class="side-text">${label}</span>`,
              `    <span class="side-caret">${caretSvg}</span>`,
              '  </a>',
              '  <ul class="side-sub">',
              subHtml,
              '  </ul>',
              '</li>'
            );
          } else if (component.type === "menu-divider") {
            lines.push('<li class="side-item"><hr style="margin:.4rem 0;opacity:.15"></li>');
          } else if (component.type === "menu-label") {
            const label = html(props.label || "");
            lines.push(`<li class="side-item"><span class="side-text" style="font-size:.6rem;text-transform:uppercase;letter-spacing:.06em;opacity:.6;padding:.4rem .6rem;display:block">${label}</span></li>`);
          }
        });
      });
    });

    return lines.join("\n");
  }

  window.TemplateBuilderExportHtml = {
    exportComponent: exportComponent,
    exportDocument: exportDocument,
    exportRow: exportRow,
    // Exposto para o editor preencher o textarea "Codigo JS (jQuery)" do form.
    renderFormAjaxScript: renderFormAjaxScript
  };
}());
