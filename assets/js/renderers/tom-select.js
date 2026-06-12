(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ tomSelect: renderTomSelectComponent });

  function renderTomSelectComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const options = "";
    const remoteSearch = context.toBooleanValue(props.remoteSearch);
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
      context.attr("data-tomselect-create", context.toBooleanValue(props.create) ? "true" : ""),
      context.attr("data-create-url", props.createUrl),
      context.attr("data-allow-empty-option", context.toBooleanValue(props.allowEmptyOption) ? "true" : "false"),
      context.attr("data-sort-field", props.sortField || "text"),
      context.attr("data-sort-direction", props.sortDirection || "asc"),
      context.attr("data-max-options", props.maxOptions != null ? String(props.maxOptions) : "100"),
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

    return [
      context.renderFormLabel(context.escapeHtml(props.label || ""), required),
      `<select${context.classAttr(context.mergeClassNames(context.getComponentClass(component), context.getValidationClass(props)))}${selectAttrs}>${options}</select>`,
      help,
      feedback || context.renderValidationFeedback(props)
    ].filter((line) => line !== "").join("\n");
  }
}());
