// Runtime do componente DataTable (jQuery DataTables) na pagina exportada.
// Varre o DOM por [data-datatable] e inicializa cada tabela lendo a config dos data-dt-*.
// As partes que "quase nunca mudam" (string dom do layout, botao de colunas e os textos
// em portugues) ficam como constantes aqui. Depende de jQuery + DataTables, carregados
// antes deste runtime. Equivale ao antigo renderDataTableInitializer de export-html.js.
(function () {
  var runtimeName = "TemplateBuilderDataTableRuntime";

  // Layout do DataTable no padrao Tabler (cabecalho, corpo e rodape em cards).
  var DOM_LAYOUT = "<'card-body border-bottom py-3'<'d-flex flex-wrap gap-2 align-items-center justify-content-between'<'text-secondary'l><'d-flex flex-wrap gap-2 align-items-center'Bf>>>rt<'card-footer d-flex align-items-center justify-content-between flex-wrap gap-2'ip>";
  var COLVIS_BUTTONS = [{ extend: "colvis", text: "Colunas", className: "btn btn-outline-secondary" }];

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

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
    var emptyText = table.getAttribute("data-dt-empty-text") || "Nenhum registro encontrado";

    var options = {
      pageLength: parseInt(table.getAttribute("data-dt-page-length"), 10) || 10,
      responsive: table.getAttribute("data-dt-responsive") === "true",
      colReorder: table.getAttribute("data-dt-col-reorder") === "true",
      searching: table.getAttribute("data-dt-searching") === "true",
      lengthChange: table.getAttribute("data-dt-length-change") === "true",
      language: buildLanguage(emptyText)
    };

    if (ajaxUrl) {
      options.ajax = { url: ajaxUrl, dataSrc: "data" };
    }

    if (table.getAttribute("data-dt-buttons") === "true") {
      options.dom = DOM_LAYOUT;
      options.buttons = COLVIS_BUTTONS;
    }

    window.jQuery(table).DataTable(options);
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

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
