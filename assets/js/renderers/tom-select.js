(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ tomSelect: renderTomSelectComponent });
  window.TemplateBuilderRenderers.registerInlineInits({ tomselect: renderTomSelectPageInit });

  // === INIT INLINE DA PAGINA EXPORTADA ===
  // Gera o codigo de inicializacao DIRETO na lib (new TomSelect(...)), com os valores
  // do componente ja resolvidos — legivel e editavel no bloco "Scripts da pagina".
  // Devolve null nos casos que precisam do maquinario do runtime generico:
  // criar via modal (iframe + postMessage). O export tambem mantem o runtime quando a
  // pagina tem FieldList (linhas clonadas precisam de re-init via evento).
  function renderTomSelectPageInit(component, context) {
    const props = component.props || {};
    const createModal = context.toBooleanValue(props.createModal);
    const buttonMode = props.createButtonMode === "newtab" ? "newtab" : "modal";
    if (createModal && buttonMode === "modal") {
      return null; // modal de criacao: usa o runtime generico (tomselect-runtime.js)
    }

    const id = context.getTomSelectId(component);
    const js = context.toJsString;
    const isStatic = props.dataSource === "static";
    const ajaxUrl = isStatic ? "" : String(props.ajaxUrl || "").trim();
    const jsonPath = isStatic ? "" : String(props.jsonPath || "").trim();
    const remoteSearch = !isStatic && context.toBooleanValue(props.remoteSearch) && Boolean(ajaxUrl);
    const searchParam = props.searchParam || "q";
    let loadThrottle = parseInt(props.loadThrottle, 10);
    if (isNaN(loadThrottle) || loadThrottle < 0) loadThrottle = 300;
    const valueField = props.valueField || "id";
    const labelField = props.labelField || "text";
    const searchFields = String(props.searchField || labelField).split(",").map((f) => f.trim()).filter(Boolean);
    const htmlMode = !isStatic && context.toBooleanValue(props.htmlMode);
    const optionHtmlField = htmlMode ? (props.optionHtmlField || "html_option") : "";
    const itemHtmlField = htmlMode ? (props.itemHtmlField || "html_selected") : "";
    const createEnabled = !createModal && context.toBooleanValue(props.create);
    const createUrl = String(props.createUrl || "").trim();
    const maxOptions = parseInt(props.maxOptions, 10) || 100;

    const plugins = context.toBooleanValue(props.multiple) ? ["remove_button", "clear_button"] : ["clear_button"];
    if (context.toBooleanValue(props.checkboxOptions)) plugins.push("checkbox_options");

    const lines = [];
    lines.push("$(function () {");
    lines.push(`  var select = document.getElementById(${js(id)});`);
    lines.push("  if (!select || select.tomselect) return;");
    lines.push("");
    lines.push("  var ts = new TomSelect(select, {");
    lines.push(`    plugins: ${JSON.stringify(plugins)},`);
    lines.push("    copyClassesToDropdown: false,");
    lines.push('    dropdownParent: "body",');
    lines.push(`    valueField: ${js(valueField)},`);
    lines.push(`    labelField: ${js(labelField)},`);
    lines.push(`    searchField: ${JSON.stringify(searchFields)},`);
    if (createEnabled && createUrl) {
      lines.push("    // Criar novo: abre o cadastro em outra aba");
      lines.push("    create: function () {");
      lines.push(`      window.open(${js(createUrl)}, "_blank");`);
      lines.push("      return false;");
      lines.push("    },");
    } else {
      lines.push(`    create: ${createEnabled ? "true" : "false"},`);
    }
    lines.push(`    placeholder: ${js(props.placeholder || "")},`);
    lines.push(`    allowEmptyOption: ${context.toBooleanValue(props.allowEmptyOption) ? "true" : "false"},`);
    lines.push(`    sortField: [{ field: ${js(String(props.sortField || "text").trim())}, direction: ${js(String(props.sortDirection || "asc").trim())} }],`);
    lines.push(`    maxOptions: ${maxOptions},`);
    if (remoteSearch) {
      lines.push(`    loadThrottle: ${loadThrottle},`);
      if (context.toBooleanValue(props.preload)) {
        lines.push('    preload: "focus",');
      }
      const sep = ajaxUrl.indexOf("?") >= 0 ? "&" : "?";
      lines.push("    // Busca remota: consulta o servidor a cada digitacao");
      lines.push("    load: function (query, callback) {");
      lines.push(`      fetch(${js(ajaxUrl + sep + encodeURIComponent(searchParam) + "=")} + encodeURIComponent(query || ""))`);
      lines.push("        .then(function (r) { return r.ok ? r.json() : null; })");
      lines.push("        .then(function (response) {");
      lines.push("          if (!response) { callback(); return; }");
      lines.push(`          var items = ${jsonPathExpr("response", jsonPath)};`);
      lines.push("          callback(Array.isArray(items) ? items : []);");
      lines.push("        })");
      lines.push("        .catch(function () { callback(); });");
      lines.push("    },");
    }
    lines.push("    render: {");
    lines.push("      no_results: function () {");
    lines.push("        return '<div class=\"no-results px-2 py-2 text-secondary\">Nenhum resultado encontrado</div>';");
    lines.push("      }" + (optionHtmlField || itemHtmlField ? "," : ""));
    if (optionHtmlField) {
      lines.push("      // HTML do option (campo vindo do JSON)");
      lines.push("      option: function (data, escape) {");
      lines.push(`        var h = data[${js(optionHtmlField)}];`);
      lines.push(`        return '<div class="ts-html-option">' + (h != null && h !== "" ? h : escape(data[${js(labelField)}] || "")) + "</div>";`);
      lines.push("      }" + (itemHtmlField ? "," : ""));
    }
    if (itemHtmlField) {
      lines.push("      // HTML do item selecionado (chip)");
      lines.push("      item: function (data, escape) {");
      lines.push(`        var h = data[${js(itemHtmlField)}];`);
      lines.push(`        return '<div class="ts-html-item">' + (h != null && h !== "" ? h : escape(data[${js(labelField)}] || "")) + "</div>";`);
      lines.push("      }");
    }
    lines.push("    }");
    lines.push("  });");
    if (ajaxUrl && !remoteSearch) {
      lines.push("");
      lines.push("  // Carga inicial das opcoes via AJAX (depois a busca filtra localmente)");
      lines.push(`  fetch(${js(ajaxUrl)})`);
      lines.push("    .then(function (r) { return r.ok ? r.json() : null; })");
      lines.push("    .then(function (response) {");
      lines.push("      if (!response) return;");
      lines.push(`      var items = ${jsonPathExpr("response", jsonPath)};`);
      lines.push("      if (!Array.isArray(items) || !items.length) return;");
      lines.push("      ts.addOptions(items);");
      lines.push("      ts.refreshOptions(false);");
      lines.push("    })");
      lines.push("    .catch(function () {});");
    }
    lines.push("});");

    return { title: "TomSelect #" + id, code: lines.join("\n") };
  }

  // "data.items" -> "response && response.data && response.data.items" (acesso seguro e legivel)
  function jsonPathExpr(base, jsonPath) {
    if (!jsonPath) {
      return base;
    }
    let expr = base;
    const guards = [base];
    jsonPath.split(".").forEach((segment) => {
      if (/^[A-Za-z_$][\w$]*$/.test(segment)) {
        expr += "." + segment;
      } else {
        expr += "[" + JSON.stringify(segment) + "]";
      }
      guards.push(expr);
    });
    return guards.join(" && ");
  }

  function renderTomSelectComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    // Origem dos dados: "static" = opcoes fixas informadas pelo dev (sem AJAX); "ajax" = comportamento atual.
    const isStatic = props.dataSource === "static";
    const options = isStatic
      ? context.parseOptions(props.staticOptions).map(context.renderSelectOption).join("")
      : "";
    const remoteSearch = !isStatic && context.toBooleanValue(props.remoteSearch);
    const createModal = context.toBooleanValue(props.createModal);
    // Acao do botao "+": "modal" (iframe) ou "newtab" (abre o link em nova aba).
    const buttonMode = props.createButtonMode === "newtab" ? "newtab" : "modal";
    const modalMode = createModal && buttonMode === "modal";
    const modalId = context.sanitizeElementId(props.modalId, "create-modal-" + component.id);
    const createUrl = props.createUrl || "";
    let required;
    if (context.toBooleanValue(props.required)) {
      required = ' <span class="required-mark">*</span>';
    } else {
      required = "";
    }
    const selectAttrs = [
      context.idAttr(context.getTomSelectId(component)),
      context.attr("name", props.name),
      ' data-tomselect=""',
      // Modo static: nao emite atributos de AJAX (o runtime/preview so buscam se houver data-ajax-url).
      !isStatic ? context.attr("data-ajax-url", props.ajaxUrl) : "",
      !isStatic ? context.attr("data-json-path", props.jsonPath) : "",
      !isStatic ? context.attr("data-remote-search", remoteSearch ? "true" : "false") : "",
      remoteSearch ? context.attr("data-search-param", props.searchParam || "q") : "",
      remoteSearch ? context.attr("data-load-throttle", props.loadThrottle != null ? String(props.loadThrottle) : "300") : "",
      remoteSearch ? context.attr("data-preload", context.toBooleanValue(props.preload) ? "true" : "false") : "",
      context.attr("data-placeholder", props.placeholder),
      context.attr("data-value-field", props.valueField || "id"),
      context.attr("data-label-field", props.labelField || "text"),
      context.attr("data-search-field", props.searchField || props.labelField || "text"),
      !isStatic && context.toBooleanValue(props.htmlMode) ? context.attr("data-option-html-field", props.optionHtmlField || "html_option") : "",
      !isStatic && context.toBooleanValue(props.htmlMode) ? context.attr("data-item-html-field", props.itemHtmlField || "html_selected") : "",
      // Criar inline (nova aba) — desligado quando o modo modal esta ativo.
      !createModal ? context.attr("data-tomselect-create", context.toBooleanValue(props.create) ? "true" : "") : "",
      context.attr("data-create-url", createUrl),
      // Criar via botao + modal (iframe) — so no modo modal; o newtab e um link puro.
      modalMode ? ' data-create-modal="true"' : "",
      modalMode ? context.attr("data-modal-id", modalId) : "",
      modalMode ? context.attr("data-create-label", props.createLabel || "Criar novo") : "",
      modalMode ? context.attr("data-response-value-field", props.responseValueField || "id") : "",
      modalMode ? context.attr("data-response-label-field", props.responseLabelField || "text") : "",
      context.attr("data-allow-empty-option", context.toBooleanValue(props.allowEmptyOption) ? "true" : "false"),
      context.attr("data-sort-field", props.sortField || "text"),
      context.attr("data-sort-direction", props.sortDirection || "asc"),
      context.attr("data-max-options", props.maxOptions != null ? String(props.maxOptions) : "100"),
      context.attr("data-checkbox-options", context.toBooleanValue(props.checkboxOptions) ? "true" : ""),
      context.toBooleanValue(props.required) ? " required" : "",
      context.toBooleanValue(props.multiple) ? " multiple" : "",
      context.toBooleanValue(props.disabled) ? " disabled" : ""
    ].join("");
    let feedback;
    if (props.invalidFeedback) {
      feedback = `<div class="invalid-feedback">${context.escapeHtml(props.invalidFeedback)}</div>`;
    } else {
      feedback = "";
    }
    let help;
    if (props.help) {
      help = `<div class="help-text">${context.escapeHtml(props.help)}</div>`;
    } else {
      help = "";
    }

    const selectClass = context.classAttr(context.mergeClassNames(context.getComponentClass(component), context.getValidationClass(props)));
    const selectEl = `<select${selectClass}${selectAttrs}>${options}</select>`;

    let control = selectEl;
    let modalHtml = "";
    if (createModal) {
      const createLabel = props.createLabel || "Criar novo";
      const modalTitle = props.modalTitle || "Novo Registro";
      const modalSize = props.modalSize || "modal-lg";
      const plusIcon = context.renderTablerIcon("plus", "");
      let createBtn;
      if (modalMode) {
        createBtn = `<button type="button" class="btn btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#${context.escapeAttr(modalId)}" title="${context.escapeAttr(createLabel)}">${plusIcon}</button>`;
      } else {
        // Link em nova aba (sem modal).
        createBtn = `<a href="${context.escapeAttr(createUrl || "#")}" target="_blank" rel="noopener" class="btn btn-outline-secondary" title="${context.escapeAttr(createLabel)}">${plusIcon}</a>`;
      }
      control = ['<div class="input-group">', "  " + selectEl, "  " + createBtn, "</div>"].join("\n");
      modalHtml = !modalMode ? "" : [
        `<div class="modal" id="${context.escapeAttr(modalId)}" tabindex="-1" data-bs-backdrop="static">`,
        `  <div class="modal-dialog ${context.escapeAttr(modalSize)} modal-dialog-scrollable" role="document">`,
        `    <div class="modal-content">`,
        `      <div class="modal-header">`,
        `        <h5 class="modal-title">${context.escapeHtml(modalTitle)}</h5>`,
        `        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>`,
        `      </div>`,
        `      <div class="modal-body p-0">`,
        `        <iframe data-create-iframe style="width:100%;border:0;min-height:520px;display:block;"></iframe>`,
        `      </div>`,
        `    </div>`,
        `  </div>`,
        `</div>`
      ].join("\n");
    }

    return [
      context.renderFormLabel(context.escapeHtml(props.label || ""), required),
      control,
      help,
      feedback || context.renderValidationFeedback(props),
      modalHtml
    ].filter((line) => line !== "").join("\n");
  }
}());
