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

    // Build table class with optional modifiers
    let tableCls = context.getComponentClass(component);
    if (context.toBooleanValue(props.striped)) tableCls = context.mergeClassNames(tableCls, "table-striped");
    if (context.toBooleanValue(props.hover)) tableCls = context.mergeClassNames(tableCls, "table-hover");
    if (context.toBooleanValue(props.bordered)) tableCls = context.mergeClassNames(tableCls, "table-bordered");
    if (context.toBooleanValue(props.small)) tableCls = context.mergeClassNames(tableCls, "table-sm");

    const tableClassAttr = component.props && component.props.cssClass !== undefined ? cssClassAttr : context.classAttr(tableCls);

    const header = columns.map((column) => {
      return `<th${context.classAttr(column.thClass)}${context.styleAttr(column.width)}>${context.escapeHtml(column.label)}</th>`;
    }).join("");
    const body = rows.map((row) => {
      const cells = columns.map((column, index) => {
        return `<td${context.classAttr(column.tdClass)}${context.styleAttr(column.width)}>${context.escapeHtml(row.cells[index] || "")}</td>`;
      }).join("");
      return `<tr>${cells}</tr>`;
    }).join("");

    const showThead = props.showThead == null ? true : context.toBooleanValue(props.showThead);
    const showTfoot = context.toBooleanValue(props.showTfoot);
    const responsive = props.responsive == null ? true : context.toBooleanValue(props.responsive);

    const theadHtml = showThead ? `    <thead><tr>${header}</tr></thead>\n` : "";
    const tfootHtml = showTfoot ? `    <tfoot><tr>${header}</tr></tfoot>\n` : "";

    const tableHtml = [
      `  <table${tableClassAttr}>`,
      theadHtml ? `    <thead><tr>${header}</tr></thead>` : null,
      `    <tbody>${body}</tbody>`,
      showTfoot ? `    <tfoot><tr>${header}</tr></tfoot>` : null,
      "  </table>"
    ].filter(Boolean).join("\n");

    if (responsive) {
      return `<div class="table-responsive">\n${tableHtml}\n</div>`;
    }

    return tableHtml.replace(/^  /gm, "");
  }

  function renderDataTableComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const columns = context.ensureTableColumns(context.parseTableColumns(props.columns));
    const rowSelect = context.toBooleanValue(props.rowSelect);
    // Campo do ID nos dados (objetos) ou indice (arrays/linhas estaticas)
    const rowIdSource = String(props.rowIdSource || "id").trim() || "id";
    let header = columns.map((column) => {
      return `<th${context.classAttr(column.thClass)}${context.styleAttr(column.width)}>${context.escapeHtml(column.label)}</th>`;
    }).join("");
    if (rowSelect) {
      // Coluna extra de selecao (classe "all" = sempre visivel no modo responsivo);
      // o runtime liga o "selecionar todos" e o aviso de selecao total.
      header = '<th class="dt-check-cell all" style="width:36px"><input type="checkbox" class="form-check-input" data-dt-select-all aria-label="Selecionar todos"></th>' + header;
    }
    let body;
    if (props.ajaxUrl && String(props.ajaxUrl).trim()) {
      body = "";
    } else {
      body = context.parseTableRows(props.rows).map((row, rowIndex) => {
        const cells = columns.map((column, index) => {
          return `<td${context.classAttr(column.tdClass)}${context.styleAttr(column.width)}>${context.escapeHtml(row.cells[index] || "")}</td>`;
        }).join("");
        let checkCell = "";
        if (rowSelect) {
          // Linhas estaticas: o ID e a celula do indice configurado (fallback: indice da linha)
          const idIndex = parseInt(rowIdSource, 10);
          let rowId = row.cells[isNaN(idIndex) ? 0 : idIndex];
          if (rowId == null || rowId === "") rowId = String(rowIndex);
          checkCell = `<td class="dt-check-cell"><input type="checkbox" class="form-check-input dt-row-check" value="${context.escapeAttr(String(rowId))}"></td>`;
        }
        return `<tr>${checkCell}${cells}</tr>`;
      }).join("");
    }
    const tableId = context.getDataTableId(component);
    const ajaxUrl = props.ajaxUrl && String(props.ajaxUrl).trim() ? String(props.ajaxUrl).trim() : "";
    const serverSide = context.toBooleanValue(props.serverSide);
    const ajaxMethod = getDataTableAjaxMethod(props.ajaxMethod, serverSide);
    const ajaxBodyFormat = getDataTableAjaxBodyFormat(props.ajaxBodyFormat);
    const ajaxDataSrc = String(props.ajaxDataSrc || "data").trim() || "data";
    const ajaxHeaders = buildDataTableAjaxHeaders(props, context);
    const ajaxHeadersAttr = Object.keys(ajaxHeaders).length ? JSON.stringify(ajaxHeaders) : "";
    const ajaxColumnsAttr = buildDataTableColumnsConfig(columns);
    const dataTableAttrs = [
      " data-datatable",
      context.attr("data-dt-page-length", String(context.toPositiveInteger(props.pageLength, 10))),
      context.attr("data-dt-responsive", context.toBooleanValue(props.responsive) ? "true" : "false"),
      context.attr("data-dt-col-reorder", context.toBooleanValue(props.colReorder) ? "true" : "false"),
      context.attr("data-dt-searching", context.toBooleanValue(props.searching) ? "true" : "false"),
      context.attr("data-dt-length-change", context.toBooleanValue(props.lengthChange) ? "true" : "false"),
      context.attr("data-dt-buttons", context.toBooleanValue(props.buttons) ? "true" : "false"),
      context.attr("data-dt-server-side", serverSide ? "true" : "false"),
      context.attr("data-dt-ajax-url", ajaxUrl),
      context.attr("data-dt-ajax-method", ajaxMethod),
      context.attr("data-dt-ajax-body-format", ajaxBodyFormat),
      context.attr("data-dt-ajax-data-src", ajaxDataSrc),
      context.attr("data-dt-ajax-headers", ajaxHeadersAttr),
      context.attr("data-dt-columns", ajaxColumnsAttr),
      context.attr("data-dt-select", rowSelect ? "true" : "false"),
      rowSelect ? context.attr("data-dt-select-id-src", rowIdSource) : "",
      rowSelect ? context.attr("data-dt-select-name", props.rowSelectName || "selecionados") : "",
      context.attr("data-dt-empty-text", props.emptyText)
    ].join("");
    // Titulo e descricao do card sao opcionais: se ambos vazios, o card-header nem e renderizado.
    let cardTitleHtml;
    if (props.cardTitle) {
      cardTitleHtml = `      <h3 class="card-title">${context.escapeHtml(props.cardTitle)}</h3>`;
    } else {
      cardTitleHtml = "";
    }
    let description;
    if (props.description) {
      description = `      <div class="text-secondary">${context.escapeHtml(props.description)}</div>`;
    } else {
      description = "";
    }
    let cardHeader;
    if (cardTitleHtml || description) {
      cardHeader = [
        '  <div class="card-header">',
        '    <div>',
        cardTitleHtml,
        description,
        '    </div>',
        '  </div>'
      ].filter((line) => line !== "").join("\n");
    } else {
      cardHeader = "";
    }

    return [
      '<div class="card">',
      cardHeader,
      '  <div class="card-table table-responsive">',
      `    <table id="${context.escapeAttr(tableId)}"${cssClassAttr}${dataTableAttrs}>`,
      `      <thead><tr>${header}</tr></thead>`,
      `      <tbody>${body}</tbody>`,
      "    </table>",
      "  </div>",
      "</div>"
    ].filter((line) => line !== "").join("\n");
  }

  function getDataTableAjaxMethod(value, serverSide) {
    const method = String(value || "").toUpperCase();
    if (method === "POST") {
      return "POST";
    }
    if (!value && serverSide) {
      return "POST";
    }
    return "GET";
  }

  function getDataTableAjaxBodyFormat(value) {
    const format = String(value || "").toLowerCase();
    if (format === "json") {
      return "json";
    }
    return "form";
  }

  function buildDataTableAjaxHeaders(props, context) {
    const headers = {};
    const token = String(props.ajaxAuthToken || "").trim();

    if (props.ajaxAuthType === "bearer" && token) {
      headers.Authorization = "Bearer " + token;
    }

    if (props.ajaxAuthType === "header" && token) {
      const headerName = String(props.ajaxAuthHeader || "").trim() || "X-API-Key";
      headers[headerName] = token;
    }

    normalizeKeyValueEntries(props.ajaxHeaders, context).forEach((entry) => {
      const key = String(entry.key || "").trim();
      if (key) {
        headers[key] = String(entry.value == null ? "" : entry.value);
      }
    });

    return headers;
  }

  function normalizeKeyValueEntries(value, context) {
    if (context && typeof context.normalizeKeyValueEntries === "function") {
      return context.normalizeKeyValueEntries(value);
    }
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((entry) => {
      if (!entry || typeof entry !== "object") {
        return { key: "", value: "" };
      }
      return {
        key: String(entry.key || ""),
        value: String(entry.value == null ? "" : entry.value)
      };
    });
  }

  function buildDataTableColumnsConfig(columns) {
    const normalized = columns.map((column, index) => {
      const data = String(column.data || "").trim();
      if (data) {
        return { data: data };
      }
      return { data: index };
    });
    const hasExplicitData = normalized.some((column, index) => column.data !== index);
    if (!hasExplicitData) {
      return "";
    }
    return JSON.stringify(normalized);
  }
}());
