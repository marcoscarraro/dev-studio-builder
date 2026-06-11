(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    table: renderTableComponent,
    datatable: renderDataTableComponent
  });

  function renderTableComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const columns = context.parseTableColumns(props.columns);
    const rows = context.parseTableRows(props.rows);
    const header = columns.map((column) => {
      return `<th${context.classAttr(column.thClass)}${context.styleAttr(column.width)}>${context.escapeHtml(column.label)}</th>`;
    }).join("");
    const body = rows.map((row) => {
      const cells = columns.map((column, index) => {
        return `<td${context.classAttr(column.tdClass)}${context.styleAttr(column.width)}>${context.escapeHtml(row.cells[index] || "")}</td>`;
      }).join("");
      return `<tr>${cells}</tr>`;
    }).join("");

    return [
      '<div class="table-responsive">',
      `  <table${cssClassAttr}>`,
      `    <thead><tr>${header}</tr></thead>`,
      `    <tbody>${body}</tbody>`,
      "  </table>",
      "</div>"
    ].join("\n");
  }

  function renderDataTableComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const columns = context.ensureTableColumns(context.parseTableColumns(props.columns));
    const header = columns.map((column) => {
      return `<th${context.classAttr(column.thClass)}${context.styleAttr(column.width)}>${context.escapeHtml(column.label)}</th>`;
    }).join("");
    let body;
    if (props.ajaxUrl && String(props.ajaxUrl).trim()) {
      body = "";
    } else {
      body = context.parseTableRows(props.rows).map((row) => {
        const cells = columns.map((column, index) => {
          return `<td${context.classAttr(column.tdClass)}${context.styleAttr(column.width)}>${context.escapeHtml(row.cells[index] || "")}</td>`;
        }).join("");
        return `<tr>${cells}</tr>`;
      }).join("");
    }
    const tableId = context.getDataTableId(component);
    const ajaxUrl = props.ajaxUrl && String(props.ajaxUrl).trim() ? String(props.ajaxUrl).trim() : "";
    const dataTableAttrs = [
      " data-datatable",
      context.attr("data-dt-page-length", String(context.toPositiveInteger(props.pageLength, 10))),
      context.attr("data-dt-responsive", context.toBooleanValue(props.responsive) ? "true" : "false"),
      context.attr("data-dt-col-reorder", context.toBooleanValue(props.colReorder) ? "true" : "false"),
      context.attr("data-dt-searching", context.toBooleanValue(props.searching) ? "true" : "false"),
      context.attr("data-dt-length-change", context.toBooleanValue(props.lengthChange) ? "true" : "false"),
      context.attr("data-dt-buttons", context.toBooleanValue(props.buttons) ? "true" : "false"),
      context.attr("data-dt-ajax-url", ajaxUrl),
      context.attr("data-dt-empty-text", props.emptyText)
    ].join("");
    let description;
    if (props.description) {
      description = `      <div class="text-secondary">${context.escapeHtml(props.description)}</div>`;
    } else {
      description = "";
    }

    return [
      '<div class="card">',
      '  <div class="card-header">',
      '    <div>',
      `      <h3 class="card-title">${context.escapeHtml(props.cardTitle || "Registros")}</h3>`,
      description,
      '    </div>',
      '  </div>',
      '  <div class="card-table table-responsive">',
      `    <table id="${context.escapeAttr(tableId)}"${cssClassAttr}${dataTableAttrs}>`,
      `      <thead><tr>${header}</tr></thead>`,
      `      <tbody>${body}</tbody>`,
      "    </table>",
      "  </div>",
      "</div>"
    ].filter((line) => line !== "").join("\n");
  }
}());
