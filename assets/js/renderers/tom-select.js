(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ tomSelect: renderTomSelectComponent });

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
