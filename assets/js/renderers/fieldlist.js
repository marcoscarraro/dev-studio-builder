(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    fieldList: renderFieldListHtml
  });

  function renderFieldListHtml(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const columns = context.getFieldListColumns(component);
    const rows = context.getRowContainerRows(component) || [];
    const indexStart = context.getFieldListIndexStart(props);
    const description = props.description ? `      <div class="text-secondary">${context.escapeHtml(props.description)}</div>` : "";
    const title = props.cardTitle ? `      <h3 class="card-title">${context.escapeHtml(props.cardTitle)}</h3>` : "";
    const header = columns.map((column) => {
      return `<th${context.classAttr(column.thClass)}${context.styleAttr(column.width)}>${context.escapeHtml(column.label)}</th>`;
    }).join("");
    const body = rows.map((row, rowIndex) => {
      return renderFieldListHtmlRow(component, row, columns, indexStart + rowIndex, false, context);
    }).join("\n");
    let templateRow;
    if (rows.length) {
      templateRow = renderFieldListHtmlRow(component, rows[0], columns, "__INDEX__", true, context);
    } else {
      templateRow = renderFieldListEmptyTemplateRow(props, columns, context);
    }
    let addButtonId;
    if (props.addButtonId) {
      addButtonId = context.idAttr(props.addButtonId);
    } else {
      addButtonId = "";
    }
    let cardId;
    if (props.cardId) {
      cardId = context.idAttr(props.cardId);
    } else {
      cardId = "";
    }
    let tableId;
    if (props.tableId) {
      tableId = context.idAttr(props.tableId);
    } else {
      tableId = "";
    }
    let tbodyId;
    if (props.tbodyId) {
      tbodyId = context.idAttr(props.tbodyId);
    } else {
      tbodyId = "";
    }

    return [
      `<article${cssClassAttr}${cardId} data-fieldlist="1"${context.attr("data-fieldlist-index-start", indexStart)}>`,
      `  <div${context.classAttr(props.headerCssClass || "card-header")}>`,
      "    <div>",
      title,
      description,
      "    </div>",
      '    <div class="card-actions">',
      `      <button type="button"${context.classAttr(props.addButtonCssClass || "btn btn-primary")}${addButtonId} data-fieldlist-add>${context.renderButtonContent(props.addButtonText || "Adicionar linha", props.addButtonIcon, props.addButtonIconPosition, props.addButtonIconColor)}</button>`,
      "    </div>",
      "  </div>",
      `  <div${context.classAttr(props.tableWrapperCssClass || "card-table")}>`,
      `    <table${context.classAttr(props.tableCssClass || "table card-table table-vcenter text-nowrap")}${tableId}>`,
      `      <thead><tr>${header}</tr></thead>`,
      `      <tbody${tbodyId} data-fieldlist-body>`,
      context.indent(body, 8),
      "      </tbody>",
      "    </table>",
      "  </div>",
      "  <template data-fieldlist-template>",
      context.indent(templateRow, 4),
      "  </template>",
      "</article>"
    ].filter((line) => line !== "").join("\n");
  }

  function renderFieldListHtmlRow(component, row, columns, indexValue, isTemplate, context) {
    const props = component.props || {};
    context.syncSingleFieldListRow(row, columns);
    const cells = columns.map((column, columnIndex) => {
      const content = row.columns[columnIndex].children.map((child) => {
        return renderFieldListChildHtml(child, indexValue, context);
      }).join("\n");

      return [
        `<td${context.classAttr(column.tdClass)}${context.styleAttr(column.width)}>`,
        context.indent(content, 2),
        "</td>"
      ].join("\n");
    }).join("\n");

    return [
      `<tr${context.classAttr(props.rowCssClass || "fieldlist-row")}${context.attr("data-index", indexValue)}${isTemplate ? " data-fieldlist-template-row" : ""}>`,
      context.indent(cells, 2),
      "</tr>"
    ].join("\n");
  }

  function renderFieldListEmptyTemplateRow(props, columns, context) {
    const cells = columns.map((column) => {
      return `<td${context.classAttr(column.tdClass)}${context.styleAttr(column.width)}></td>`;
    }).join("\n");

    return [
      `<tr${context.classAttr(props.rowCssClass || "fieldlist-row")}${context.attr("data-index", "__INDEX__")} data-fieldlist-template-row>`,
      context.indent(cells, 2),
      "</tr>"
    ].join("\n");
  }

  function renderFieldListChildHtml(component, indexValue, context) {
    let html;
    if (context.getComponentDefinition(component.type).kind === "hiddenInput") {
      html = context.renderHiddenInputHtml(component);
    } else {
      html = context.renderComponentHtml(component);
    }

    return context.applyFieldListIndexTemplates(html, indexValue);
  }
}());
