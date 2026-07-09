// Runtime da Tabela em Arvore (tree-table): clique no botao [data-tree-toggle] expande/recolhe
// os descendentes da linha. A visibilidade de cada linha e recalculada subindo a cadeia
// data-tree-parent -> se algum ancestral estiver data-tree-collapsed="true", a linha fica
// escondida (row.hidden). Roda uma vez no load (para respeitar itens que ja nascem
// collapsed:true) e de novo a cada clique.
(function () {
  "use strict";

  var runtimeName = "TemplateBuilderTreeTableRuntime";
  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  function refreshVisibility(table) {
    var rows = table.querySelectorAll("[data-tree-row]");
    var byId = {};
    rows.forEach(function (row) {
      var id = row.getAttribute("data-tree-id");
      if (id) {
        byId[id] = row;
      }
    });

    rows.forEach(function (row) {
      var visible = true;
      var parentId = row.getAttribute("data-tree-parent");
      var guard = 0;
      while (parentId && guard < 20) {
        var parentRow = byId[parentId];
        if (!parentRow) {
          break;
        }
        if (parentRow.getAttribute("data-tree-collapsed") === "true") {
          visible = false;
          break;
        }
        parentId = parentRow.getAttribute("data-tree-parent");
        guard++;
      }
      row.hidden = !visible;
    });
  }

  function toggle(button) {
    var row = button.closest("[data-tree-row]");
    if (!row) {
      return;
    }
    var table = button.closest("[data-tree-table]");
    if (!table) {
      return;
    }
    var collapsed = row.getAttribute("data-tree-collapsed") === "true";
    row.setAttribute("data-tree-collapsed", collapsed ? "false" : "true");
    button.setAttribute("aria-expanded", collapsed ? "true" : "false");
    refreshVisibility(table);
  }

  var bound = false;
  function init() {
    if (bound) {
      return;
    }
    bound = true;

    document.querySelectorAll("[data-tree-table]").forEach(function (table) {
      refreshVisibility(table);
    });

    document.addEventListener("click", function (event) {
      var button = event.target.closest ? event.target.closest("[data-tree-toggle]") : null;
      if (!button) {
        return;
      }
      event.preventDefault();
      toggle(button);
    });
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
