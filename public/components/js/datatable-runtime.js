// Runtime do componente DataTable (jQuery DataTables) na pagina exportada.
// Varre o DOM por [data-datatable] e inicializa cada tabela lendo a config dos data-dt-*.
// As partes que "quase nunca mudam" (string dom do layout, botao de colunas e os textos
// em portugues) ficam como constantes aqui. Depende de jQuery + DataTables, carregados
// antes deste runtime. Equivale ao antigo renderDataTableInitializer de export-html.js.
//
// Selecao de linhas (data-dt-select="true") — dois modos, no padrao Gmail:
// - Modo "ids": o checkbox do cabecalho marca a PAGINA visivel; os IDs ficam num Set e
//   sao re-marcados a cada draw (a selecao sobrevive a paginacao/busca/ordenacao).
// - Modo "todos": quando a pagina inteira esta marcada e ha mais registros filtrados,
//   um aviso oferece "Selecionar todos os N registros". Em server-side o navegador nao
//   conhece os IDs das outras paginas (podem ser milhoes), entao a selecao vira uma
//   FLAG + lista de excecoes (linhas desmarcadas depois); mudar a busca desfaz o modo
//   "todos" (o filtro faz parte da selecao). Em client-side os IDs sao enumerados de
//   verdade e o modo continua "ids".
// Contrato dos inputs ocultos (base = "Name dos inputs ocultos", ex. "selecionados"):
//   sempre:        selecionados_modo = "ids" | "todos"
//   modo "ids":    selecionados[] = um input por ID
//   modo "todos":  selecionados_excluidos[] (IDs desmarcados), selecionados_busca
//                  (filtro ativo ao selecionar tudo) e selecionados_total (informativo).
//   O backend em modo "todos" deve refazer a consulta com o filtro e excluir as excecoes.
// API JS: window.TemplateBuilderDataTableSelection.get/clear("<id da tabela>").
(function () {
  var runtimeName = "TemplateBuilderDataTableRuntime";

  // Layout do DataTable no padrao Tabler (cabecalho, corpo e rodape em cards).
  var DOM_LAYOUT = "<'card-body border-bottom py-3'<'d-flex flex-wrap gap-2 align-items-center justify-content-between'<'text-secondary'l><'d-flex flex-wrap gap-2 align-items-center'Bf>>>rt<'card-footer d-flex align-items-center justify-content-between flex-wrap gap-2'ip>";
  var COLVIS_BUTTONS = [{ extend: "colvis", text: "Colunas", className: "btn btn-outline-secondary" }];

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  // Estados de selecao por id da tabela.
  var selectionStates = {};

  function init(root) {
    var scope;
    if (root && root.querySelectorAll) {
      scope = root;
    } else {
      scope = document;
    }

    // Seletor qualificado com a tag (mesma protecao do fullcalendar-runtime).
    scope.querySelectorAll("table[data-datatable]").forEach(function (table) {
      setup(table);
    });
  }

  function setup(table) {
    if (table.getAttribute("data-datatable-ready") === "1") {
      return;
    }

    if (!window.jQuery || !window.jQuery.fn.DataTable) {
      return;
    }

    table.setAttribute("data-datatable-ready", "1");

    var ajaxUrl = table.getAttribute("data-dt-ajax-url") || "";
    var ajaxMethod = getAjaxMethod(table.getAttribute("data-dt-ajax-method"));
    var ajaxBodyFormat = getAjaxBodyFormat(table.getAttribute("data-dt-ajax-body-format"));
    var ajaxDataSrc = table.getAttribute("data-dt-ajax-data-src") || "data";
    var ajaxHeaders = parseHeaders(table.getAttribute("data-dt-ajax-headers"));
    var serverSide = table.getAttribute("data-dt-server-side") === "true";
    var emptyText = table.getAttribute("data-dt-empty-text") || "Nenhum registro encontrado";
    var columns = parseOptions(table.getAttribute("data-dt-columns"));
    var selectable = table.getAttribute("data-dt-select") === "true";

    var options = {
      pageLength: parseInt(table.getAttribute("data-dt-page-length"), 10) || 10,
      responsive: table.getAttribute("data-dt-responsive") === "true",
      colReorder: table.getAttribute("data-dt-col-reorder") === "true",
      searching: table.getAttribute("data-dt-searching") === "true",
      lengthChange: table.getAttribute("data-dt-length-change") === "true",
      language: buildLanguage(emptyText)
    };

    if (serverSide && ajaxUrl) {
      options.serverSide = true;
      options.processing = true;
    }

    if (Array.isArray(columns) && columns.length) {
      options.columns = columns;
    }

    if (ajaxUrl) {
      options.ajax = {
        url: ajaxUrl,
        type: ajaxMethod,
        dataType: "json",
        dataSrc: function (response) {
          return readJsonPath(response, ajaxDataSrc);
        }
      };

      if (Object.keys(ajaxHeaders).length) {
        options.ajax.headers = ajaxHeaders;
      }

      if (ajaxMethod === "POST" && ajaxBodyFormat === "json") {
        options.ajax.contentType = "application/json; charset=utf-8";
        options.ajax.data = function (data) {
          return JSON.stringify(data);
        };
      }
    }

    var selectionState = null;
    if (selectable) {
      selectionState = createSelectionState(table, {
        name: table.getAttribute("data-dt-select-name") || "selecionados",
        idSource: table.getAttribute("data-dt-select-id-src") || "id",
        serverSide: serverSide,
        ajaxMode: Boolean(ajaxUrl)
      });
      applySelectionColumns(table, options, selectionState);
    }

    if (table.getAttribute("data-dt-buttons") === "true") {
      options.dom = DOM_LAYOUT;
      options.buttons = COLVIS_BUTTONS;
    }

    var api = window.jQuery(table).DataTable(options);

    if (selectionState) {
      wireSelection(table, api, selectionState);
    }
  }

  // ============================================
  // SELECAO DE LINHAS (checkbox)
  // ============================================

  // Estado + container dos inputs ocultos + aviso de selecao (criados antes do init;
  // o DataTables move a tabela para o wrapper dele, mas estes elementos ficam no pai
  // original — dentro do card e do form que houver em volta).
  function createSelectionState(table, config) {
    var container = document.createElement("div");
    container.setAttribute("data-dt-selection-store", "");
    container.hidden = true;
    table.parentNode.insertBefore(container, table.nextSibling);

    var banner = document.createElement("div");
    banner.className = "alert alert-info py-2 my-2 dt-select-banner";
    banner.hidden = true;
    table.parentNode.insertBefore(banner, table);

    var state = {
      table: table,
      api: null,
      mode: "ids",          // "ids" | "all"
      set: new Set(),        // IDs marcados (modo "ids")
      except: new Set(),     // IDs desmarcados (modo "all")
      search: "",            // filtro ativo ao entrar no modo "all"
      total: 0,              // recordsDisplay ao entrar no modo "all"
      name: config.name,
      idSource: config.idSource,
      serverSide: config.serverSide,
      ajaxMode: config.ajaxMode,
      container: container,
      banner: banner
    };
    selectionStates[table.id || ""] = state;
    syncStore(state);
    return state;
  }

  // Extrai o ID da linha: campo (dados em objeto) ou indice (dados em array).
  function rowIdOf(row, idSource) {
    if (Array.isArray(row)) {
      var idx = parseInt(idSource, 10);
      if (isNaN(idx)) idx = 0;
      return String(row[idx]);
    }
    if (row && typeof row === "object") {
      return String(row[idSource]);
    }
    return "";
  }

  function isRowSelected(state, id) {
    if (state.mode === "all") {
      return !state.except.has(id);
    }
    return state.set.has(id);
  }

  // Encaixa a coluna do checkbox nas opcoes, conforme a fonte de dados.
  function applySelectionColumns(table, options, state) {
    var checkboxColumn = {
      data: null,
      orderable: false,
      searchable: false,
      className: "dt-check-cell all",
      defaultContent: "",
      render: function (data, type, row) {
        var id = rowIdOf(row, state.idSource);
        var checked = "";
        if (isRowSelected(state, id)) checked = " checked";
        return '<input type="checkbox" class="form-check-input dt-row-check" value="' + escapeAttr(id) + '"' + checked + ">";
      }
    };

    if (Array.isArray(options.columns) && options.columns.length) {
      // Colunas nomeadas (data-dt-columns): checkbox entra como primeira coluna.
      options.columns = [checkboxColumn].concat(options.columns);
    } else if (options.ajax) {
      // Dados em arrays sem config explicita: mapeia os indices na ordem dos <th>.
      var thCount = table.querySelectorAll("thead th").length;
      var cols = [checkboxColumn];
      for (var i = 1; i < thCount; i += 1) {
        cols.push({ data: i - 1 });
      }
      options.columns = cols;
    } else {
      // Linhas estaticas no DOM: o renderer ja emitiu os checkboxes nas celulas.
      options.columnDefs = (options.columnDefs || []).concat([
        { targets: 0, orderable: false, searchable: false }
      ]);
    }

    // Sem ordenacao inicial (a coluna 0 agora e o checkbox) e sem o ColReorder
    // poder mover a coluna do checkbox.
    options.order = [];
    if (options.colReorder === true) {
      options.colReorder = { fixedColumnsLeft: 1 };
    }
  }

  function wireSelection(table, api, state) {
    var $ = window.jQuery;
    state.api = api;

    api.on("draw", function () {
      // No modo "todos" o filtro faz parte da selecao: busca mudou = selecao desfeita.
      if (state.mode === "all" && api.search() !== state.search) {
        resetSelection(state);
      }
      refreshPage(state);
    });
    refreshPage(state);

    // Checkbox de linha (delegado: as linhas trocam a cada draw).
    $(table).on("change", "input.dt-row-check", function () {
      var id = String(this.value);
      if (state.mode === "all") {
        if (this.checked) {
          state.except.delete(id);
        } else {
          state.except.add(id);
        }
      } else if (this.checked) {
        state.set.add(id);
      } else {
        state.set.delete(id);
      }
      syncStore(state);
      updateHeaderCheckbox(state);
      updateBanner(state);
    });

    // Checkbox do cabecalho: marca/desmarca a PAGINA visivel (no modo "todos",
    // desmarcar desfaz a selecao inteira — comportamento previsivel).
    $(table).on("change", "input[data-dt-select-all]", function () {
      var check = this.checked;
      if (state.mode === "all") {
        resetSelection(state);
        refreshPage(state);
        return;
      }
      table.querySelectorAll("tbody input.dt-row-check").forEach(function (input) {
        var id = String(input.value);
        if (check) {
          state.set.add(id);
        } else {
          state.set.delete(id);
        }
      });
      syncStore(state);
      refreshPage(state);
    });

    // Acoes do aviso: "Selecionar todos os N registros" / "Limpar selecao".
    state.banner.addEventListener("click", function (event) {
      var action = event.target.getAttribute("data-dt-banner-action");
      if (!action) return;
      event.preventDefault();
      if (action === "select-all") {
        selectAllFiltered(state);
      }
      if (action === "clear") {
        resetSelection(state);
        refreshPage(state);
      }
    });
  }

  // "Selecionar todos os registros do filtro" — adaptativo:
  // server-side vira flag + excecoes; client-side enumera os IDs de verdade.
  function selectAllFiltered(state) {
    var api = state.api;
    if (state.serverSide) {
      state.mode = "all";
      state.set.clear();
      state.except.clear();
      state.search = api.search();
      state.total = api.page.info().recordsDisplay;
    } else if (state.ajaxMode) {
      api.rows({ search: "applied" }).data().each(function (row) {
        state.set.add(rowIdOf(row, state.idSource));
      });
    } else {
      api.rows({ search: "applied" }).nodes().each(function (node) {
        var input = node.querySelector("input.dt-row-check");
        if (input) state.set.add(String(input.value));
      });
    }
    syncStore(state);
    refreshPage(state);
  }

  function resetSelection(state) {
    state.mode = "ids";
    state.set.clear();
    state.except.clear();
    state.search = "";
    state.total = 0;
    syncStore(state);
  }

  // Re-marca os checkboxes visiveis + cabecalho + aviso conforme o estado.
  function refreshPage(state) {
    state.table.querySelectorAll("tbody input.dt-row-check").forEach(function (input) {
      input.checked = isRowSelected(state, String(input.value));
    });
    updateHeaderCheckbox(state);
    updateBanner(state);
  }

  // Cabecalho: marcado se a pagina inteira esta selecionada; indeterminado se parcial.
  function updateHeaderCheckbox(state) {
    var header = state.table.querySelector("thead input[data-dt-select-all]");
    if (!header) return;
    var inputs = state.table.querySelectorAll("tbody input.dt-row-check");
    var total = inputs.length;
    var checked = 0;
    inputs.forEach(function (input) {
      if (isRowSelected(state, String(input.value))) checked += 1;
    });
    header.checked = total > 0 && checked === total;
    header.indeterminate = checked > 0 && checked < total;
  }

  // Aviso acima da tabela (padrao Gmail): oferece o "selecionar todos" quando a
  // pagina inteira esta marcada e ha mais registros; mostra o resumo da selecao.
  function updateBanner(state) {
    var banner = state.banner;
    var api = state.api;
    if (!api) {
      banner.hidden = true;
      return;
    }

    if (state.mode === "all") {
      var message = "Todos os <strong>" + formatNumber(state.total) + "</strong> registros do filtro atual estao selecionados";
      if (state.except.size) {
        message += " (exceto " + formatNumber(state.except.size) + ")";
      }
      banner.innerHTML = message + '. <a href="#" data-dt-banner-action="clear">Limpar selecao</a>';
      banner.hidden = false;
      return;
    }

    var inputs = state.table.querySelectorAll("tbody input.dt-row-check");
    var totalFiltered = api.page.info().recordsDisplay;
    var allPageChecked = inputs.length > 0;
    inputs.forEach(function (input) {
      if (!state.set.has(String(input.value))) allPageChecked = false;
    });

    if (allPageChecked && totalFiltered > inputs.length) {
      banner.innerHTML = "Os <strong>" + formatNumber(inputs.length) + "</strong> registros desta pagina estao selecionados. " +
        '<a href="#" data-dt-banner-action="select-all">Selecionar todos os ' + formatNumber(totalFiltered) + " registros</a>";
      banner.hidden = false;
      return;
    }

    if (state.set.size) {
      banner.innerHTML = "<strong>" + formatNumber(state.set.size) + "</strong> registro(s) selecionado(s). " +
        '<a href="#" data-dt-banner-action="clear">Limpar selecao</a>';
      banner.hidden = false;
      return;
    }

    banner.hidden = true;
  }

  // Inputs ocultos da selecao (ver contrato no topo do arquivo).
  function syncStore(state) {
    var base = escapeAttr(state.name);
    var html = "";
    if (state.mode === "all") {
      html += '<input type="hidden" name="' + base + '_modo" value="todos">';
      html += '<input type="hidden" name="' + base + '_busca" value="' + escapeAttr(state.search) + '">';
      html += '<input type="hidden" name="' + base + '_total" value="' + escapeAttr(String(state.total)) + '">';
      state.except.forEach(function (id) {
        html += '<input type="hidden" name="' + base + '_excluidos[]" value="' + escapeAttr(id) + '">';
      });
    } else {
      html += '<input type="hidden" name="' + base + '_modo" value="ids">';
      state.set.forEach(function (id) {
        html += '<input type="hidden" name="' + base + '[]" value="' + escapeAttr(id) + '">';
      });
    }
    state.container.innerHTML = html;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("pt-BR");
  }

  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function buildLanguage(emptyText) {
    return {
      search: "Buscar:",
      lengthMenu: "_MENU_ registros por pagina",
      info: "Mostrando _START_ ate _END_ de _TOTAL_ registros",
      infoEmpty: emptyText,
      zeroRecords: emptyText,
      paginate: {
        previous: "Anterior",
        next: "Proximo"
      }
    };
  }

  function getAjaxMethod(value) {
    if (String(value || "").toUpperCase() === "POST") {
      return "POST";
    }
    return "GET";
  }

  function getAjaxBodyFormat(value) {
    if (String(value || "").toLowerCase() === "json") {
      return "json";
    }
    return "form";
  }

  function parseHeaders(raw) {
    var parsed = parseOptions(raw);
    var headers = {};

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return headers;
    }

    Object.keys(parsed).forEach(function (key) {
      var headerName = String(key || "").trim();
      if (headerName) {
        headers[headerName] = String(parsed[key] == null ? "" : parsed[key]);
      }
    });

    return headers;
  }

  function parseOptions(raw) {
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function readJsonPath(response, jsonPath) {
    if (!jsonPath) {
      return response;
    }
    if (jsonPath === ".") {
      return response;
    }
    return jsonPath.split(".").reduce(function (value, key) {
      return value && value[key];
    }, response) || [];
  }

  window[runtimeName] = { init: init };

  // API publica da selecao (por id da tabela). get() devolve:
  //   { mode: "ids", ids: [...] }  ou
  //   { mode: "todos", except: [...], search: "...", total: N }
  window.TemplateBuilderDataTableSelection = {
    get: function (tableId) {
      var state = selectionStates[tableId];
      if (!state) return null;
      if (state.mode === "all") {
        return { mode: "todos", except: Array.from(state.except), search: state.search, total: state.total };
      }
      return { mode: "ids", ids: Array.from(state.set) };
    },
    clear: function (tableId) {
      var state = selectionStates[tableId];
      if (!state) return;
      resetSelection(state);
      if (state.api) refreshPage(state);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
