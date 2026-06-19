(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ tomSelectCreate: renderTomSelectCreateComponent });

  function renderTomSelectCreateComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const remoteSearch = context.toBooleanValue(props.remoteSearch);
    const required = context.toBooleanValue(props.required)
      ? ' <span class="required-mark">*</span>'
      : "";

    const selectId = context.getTomSelectId(component);
    const modalId = context.sanitizeElementId(props.modalId, "create-modal-" + component.id);
    const createLabel = props.createLabel || "Criar novo";
    const modalTitle = props.modalTitle || "Novo Registro";
    const modalSize = props.modalSize || "modal-lg";
    const createUrl = props.createUrl || "";

    const selectAttrs = [
      context.idAttr(selectId),
      context.attr("name", props.name),
      ' data-tomselect=""',
      ' data-create-modal="true"',
      context.attr("data-modal-id", modalId),
      context.attr("data-create-label", createLabel),
      context.attr("data-create-url", createUrl),
      context.attr("data-response-value-field", props.responseValueField || "id"),
      context.attr("data-response-label-field", props.responseLabelField || "text"),
      context.attr("data-ajax-url", props.ajaxUrl),
      context.attr("data-json-path", props.jsonPath),
      context.attr("data-remote-search", remoteSearch ? "true" : "false"),
      remoteSearch ? context.attr("data-search-param", props.searchParam || "q") : "",
      remoteSearch ? context.attr("data-load-throttle", props.loadThrottle != null ? String(props.loadThrottle) : "300") : "",
      remoteSearch ? context.attr("data-preload", context.toBooleanValue(props.preload) ? "true" : "false") : "",
      context.attr("data-placeholder", props.placeholder),
      context.attr("data-value-field", props.valueField || "id"),
      context.attr("data-label-field", props.labelField || "text"),
      context.attr("data-search-field", props.searchField || props.labelField || "text"),
      context.attr("data-allow-empty-option", context.toBooleanValue(props.allowEmptyOption) ? "true" : "false"),
      context.attr("data-sort-field", props.sortField || "text"),
      context.attr("data-sort-direction", props.sortDirection || "asc"),
      context.attr("data-max-options", props.maxOptions != null ? String(props.maxOptions) : "100"),
      context.toBooleanValue(props.required) ? " required" : "",
      context.toBooleanValue(props.multiple) ? " multiple" : "",
      context.toBooleanValue(props.disabled) ? " disabled" : ""
    ].join("");

    const feedback = props.invalidFeedback
      ? `<div class="invalid-feedback">${context.escapeHtml(props.invalidFeedback)}</div>`
      : "";
    const help = props.help
      ? `<div class="help-text">${context.escapeHtml(props.help)}</div>`
      : "";

    const modal = [
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

    const selectClass = context.mergeClassNames(
      context.getComponentClass(component),
      context.getValidationClass(props)
    );

    const createBtn = [
      `<button type="button" class="btn btn-outline-secondary"`,
      `  data-bs-toggle="modal"`,
      `  data-bs-target="#${context.escapeAttr(modalId)}"`,
      `  title="${context.escapeAttr(createLabel)}">`,
      `  ${context.renderTablerIcon("plus", "")}`,
      `</button>`
    ].join("\n");

    const inputGroup = [
      `<div class="input-group">`,
      `  <select${context.classAttr(selectClass)}${selectAttrs}></select>`,
      createBtn,
      `</div>`
    ].join("\n");

    return [
      context.renderFormLabel(context.escapeHtml(props.label || ""), required),
      inputGroup,
      help,
      feedback || context.renderValidationFeedback(props),
      modal
    ].filter(Boolean).join("\n");
  }
}());
