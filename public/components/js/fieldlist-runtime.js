(function () {
  var runtimeName = "TemplateBuilderFieldListRuntime";

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

    scope.querySelectorAll("[data-fieldlist]").forEach(function (fieldList) {
      setupFieldList(fieldList);
    });
  }

  function setupFieldList(fieldList) {
    if (fieldList.getAttribute("data-fieldlist-runtime-ready") === "1") {
      return;
    }

    var body = fieldList.querySelector("[data-fieldlist-body]");
    var template = fieldList.querySelector("template[data-fieldlist-template]");
    var indexStart = parseInt(fieldList.getAttribute("data-fieldlist-index-start") || "1", 10);

    if (isNaN(indexStart)) {
      indexStart = 1;
    }

    if (!body) {
      return;
    }

    fieldList.setAttribute("data-fieldlist-runtime-ready", "1");

    function getRows() {
      return Array.prototype.filter.call(body.children, function (child) {
        return child.matches && child.matches("tr");
      });
    }

    function previousRow(row) {
      var prev = row.previousElementSibling;
      while (prev && !(prev.matches && prev.matches("tr"))) {
        prev = prev.previousElementSibling;
      }
      return prev;
    }

    function nextRow(row) {
      var next = row.nextElementSibling;
      while (next && !(next.matches && next.matches("tr"))) {
        next = next.nextElementSibling;
      }
      return next;
    }

    function applyTemplate(element, templateAttribute, targetAttribute, index) {
      var templateValue = element.getAttribute(templateAttribute);

      if (!templateValue) {
        return;
      }

      element.setAttribute(targetAttribute, templateValue.replace(/__INDEX__/g, String(index)));
    }

    function applyRowIndex(row, index) {
      row.setAttribute("data-index", String(index));

      row.querySelectorAll("[data-fieldlist-name-template]").forEach(function (element) {
        applyTemplate(element, "data-fieldlist-name-template", "name", index);
      });

      row.querySelectorAll("[data-fieldlist-id-template]").forEach(function (element) {
        applyTemplate(element, "data-fieldlist-id-template", "id", index);
      });

      row.querySelectorAll("[data-fieldlist-for-template]").forEach(function (element) {
        applyTemplate(element, "data-fieldlist-for-template", "for", index);
      });
    }

    function resetRowValues(row) {
      row.querySelectorAll("input, textarea, select").forEach(function (element) {
        var type = String(element.type || "").toLowerCase();
        var tagName = String(element.tagName || "").toLowerCase();

        if (type === "button" || type === "submit" || type === "reset") {
          return;
        }

        if (type === "checkbox" || type === "radio") {
          element.checked = false;
          return;
        }

        if (tagName === "select") {
          if (element.multiple) {
            element.selectedIndex = -1;
          } else {
            element.selectedIndex = 0;
          }
          return;
        }

        element.value = "";
      });
    }

    function copyRowValues(sourceRow, targetRow) {
      var sourceFields = sourceRow.querySelectorAll("input, textarea, select");
      var targetFields = targetRow.querySelectorAll("input, textarea, select");

      sourceFields.forEach(function (source, position) {
        var target = targetFields[position];

        if (!target) {
          return;
        }

        var type = String(source.type || "").toLowerCase();

        if (type === "checkbox" || type === "radio") {
          target.checked = source.checked;
          return;
        }

        if (source.tagName && String(source.tagName).toLowerCase() === "select") {
          Array.prototype.forEach.call(source.options, function (option, optionIndex) {
            if (target.options[optionIndex]) {
              target.options[optionIndex].selected = option.selected;
            }
          });
          return;
        }

        target.value = source.value;
      });
    }

    function cleanupClonedRow(row) {
      row.querySelectorAll(".ts-wrapper").forEach(function (wrapper) {
        wrapper.remove();
      });

      row.querySelectorAll("[data-tomselect]").forEach(function (select) {
        select.classList.remove("tomselected", "ts-hidden-accessible");
        select.removeAttribute("tabindex");
      });
    }

    function emitRowEvent(name, row) {
      fieldList.dispatchEvent(new CustomEvent(name, {
        bubbles: true,
        detail: {
          row: row,
          index: Number(row.getAttribute("data-index"))
        }
      }));
    }

    function reindexRows() {
      getRows().forEach(function (row, position) {
        applyRowIndex(row, indexStart + position);
      });
    }

    // Adiciona uma nova linha a partir do template. Reutilizado por qualquer
    // botao [data-fieldlist-add] (topo, rodape ou multiplos).
    function addRow() {
      if (!template) {
        return;
      }

      var fragment = template.content.cloneNode(true);
      var row = fragment.querySelector("tr");

      if (!row) {
        return;
      }

      body.appendChild(row);
      resetRowValues(row);
      reindexRows();
      emitRowEvent("fieldlist:row-added", row);
    }

    fieldList.addEventListener("click", function (event) {
      var target;
      if (event.target && event.target.closest) {
        target = event.target;
      } else {
        target = null;
      }

      // Botao(oes) de adicionar — delegado, suporta N botoes em qualquer lugar.
      var addTrigger;
      if (target) {
        addTrigger = target.closest("[data-fieldlist-add]");
      } else {
        addTrigger = null;
      }

      if (addTrigger && fieldList.contains(addTrigger)) {
        event.preventDefault();
        addRow();
        return;
      }

      var trigger;
      if (target) {
        trigger = target.closest("[data-fieldlist-action]");
      } else {
        trigger = null;
      }

      if (!trigger || !fieldList.contains(trigger)) {
        return;
      }

      var action = trigger.getAttribute("data-fieldlist-action");

      if (action !== "clone" && action !== "remove" && action !== "move-up" && action !== "move-down") {
        return;
      }

      var row = trigger.closest("tr");

      if (!row || !body.contains(row)) {
        return;
      }

      event.preventDefault();

      if (action === "move-up" || action === "move-down") {
        if (action === "move-up") {
          var prev = previousRow(row);
          if (!prev) {
            return;
          }
          body.insertBefore(row, prev);
        } else {
          var next = nextRow(row);
          if (!next) {
            return;
          }
          body.insertBefore(next, row);
        }
        reindexRows();
        emitRowEvent("fieldlist:row-moved", row);
        return;
      }

      if (action === "remove") {
        row.remove();
        reindexRows();
        fieldList.dispatchEvent(new CustomEvent("fieldlist:row-removed", { bubbles: true }));
        return;
      }

      var clone = row.cloneNode(true);

      cleanupClonedRow(clone);
      copyRowValues(row, clone);
      row.parentNode.insertBefore(clone, row.nextSibling);
      reindexRows();
      emitRowEvent("fieldlist:row-cloned", clone);
      emitRowEvent("fieldlist:row-added", clone);
    });

    reindexRows();
  }

  window[runtimeName] = {
    init: init
  };

  init();
}());