// PARSERS DE DADOS — normalizam os valores armazenados em props para o formato
// canonico esperado pelos renderers. Todos tolerantes a falha: aceitam array,
// objeto, string ou undefined. Modulo puro (sem state/DOM): builder.js importa
// tudo via window.TemplateBuilderParsers.
// parseOptions: [{value, label, selected, disabled}]
// parseChoiceItems: [{value, label, description, checked, disabled}]
// parseTableColumns / parseTableRows: colunas e linhas de tabela/datatable/fieldlist.
// parseDropdownItems / parseDropdownActions: itens de dropdown e acoes extras de botao.
(function () {
  "use strict";

  const helpers = window.TemplateBuilderHelpers || {};
  const toBooleanValue = helpers.toBooleanValue;

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  // ICONE: valor salvo em qualquer campo "field": "icon" e sempre uma string,
  // no formato "<biblioteca>:<nome>" (ex.: "fa-solid:house"). Sem prefixo
  // reconhecido = Tabler (compatibilidade com projetos salvos antes desta lib
  // existir, onde o valor e so o nome, ex.: "home").
  const ICON_LIBRARIES = ["tabler", "lineicons-regular", "lineicons-solid", "fa-solid", "fa-regular", "fa-brands"];

  function parseIconValue(raw) {
    const str = String(raw == null ? "" : raw).trim();
    if (!str) {
      return { lib: "tabler", name: "" };
    }
    const sep = str.indexOf(":");
    if (sep > 0) {
      const prefix = str.slice(0, sep);
      if (ICON_LIBRARIES.indexOf(prefix) !== -1) {
        return { lib: prefix, name: str.slice(sep + 1) };
      }
    }
    return { lib: "tabler", name: str };
  }

  function buildIconValue(lib, name) {
    const safeLib = ICON_LIBRARIES.indexOf(lib) !== -1 ? lib : "tabler";
    return safeLib + ":" + (name || "");
  }
  // String fallbacks in this parser block only migrate projects saved before registry v3.
  function parseOptions(value) {
    if (Array.isArray(value)) {
      return value.map((option, index) => {
        if (option && typeof option === "object") {
          if (hasOwn(option, "key")) {
            return {
              value: String(option.key == null ? "" : option.key),
              label: String(option.value == null ? "" : option.value),
              selected: toBooleanValue(option.selected),
              disabled: toBooleanValue(option.disabled)
            };
          }
          let optionValue;
          if (option.value == null) {
            optionValue = `opcao_${index + 1}`;
          } else {
            optionValue = option.value;
          }
          let optionLabel;
          if (option.label == null) {
            optionLabel = optionValue;
          } else {
            optionLabel = option.label;
          }
          return {
            value: String(optionValue),
            label: String(optionLabel),
            selected: toBooleanValue(option.selected),
            disabled: toBooleanValue(option.disabled)
          };
        }
        return { value: String(option), label: String(option), selected: false, disabled: false };
      });
    }

    if (value && typeof value === "object") {
      return Object.entries(value).map(([optionValue, optionLabel]) => ({
        value: optionValue,
        label: String(optionLabel == null ? "" : optionLabel),
        selected: false,
        disabled: false
      }));
    }

    return parseLines(value)
      .map((line) => {
        const parts = line.split("|");
        let label;
        if (parts[1]) {
          label = parts[1].trim();
        } else {
          label = parts[0].trim();
        }
        let optionValue;
        if (parts[1]) {
          optionValue = parts[0].trim();
        } else {
          optionValue = label;
        }
        return { value: optionValue, label, selected: false, disabled: false };
      });
  }

  function parseChoiceItems(value) {
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        if (item && typeof item === "object") {
          item = item;
        } else {
          item = { label: item, value: item };
        }
        let itemValue;
        if (hasOwn(item, "key")) {
          itemValue = item.key;
        } else {
          if (item.value == null) {
            itemValue = `opcao_${index + 1}`;
          } else {
            itemValue = item.value;
          }
        }
        let itemLabel;
        if (hasOwn(item, "key")) {
          itemLabel = item.value;
        } else {
          if (item.label == null) {
            itemLabel = itemValue;
          } else {
            itemLabel = item.label;
          }
        }
        return {
          value: String(itemValue == null ? "" : itemValue),
          label: String(itemLabel == null ? "" : itemLabel),
          description: String(item.description || ""),
          checked: toBooleanValue(item.checked),
          disabled: toBooleanValue(item.disabled)
        };
      });
    }
    return parseOptions(value).map((option) => ({
      value: option.value,
      label: option.label,
      description: "",
      checked: option.selected,
      disabled: option.disabled
    }));
  }

  function parseSelectGroupItems(value) {
    return parseChoiceItems(value).map((item, index) => {
      let source;
      if (Array.isArray(value) && value[index] && typeof value[index] === "object") {
        source = value[index];
      } else {
        source = {};
      }
      return Object.assign({}, item, {
        icon: String(source.icon || ""),
        iconColor: String(source.iconColor || "")
      });
    });
  }

  function parsePaymentMethods(value) {
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        if (item && typeof item === "object") {
          item = item;
        } else {
          item = { label: item };
        }
        return {
          provider: String(item.provider || "card"),
          value: String(item.value == null ? `pagamento_${index + 1}` : item.value),
          label: String(item.label || ""),
          checked: toBooleanValue(item.checked),
          disabled: toBooleanValue(item.disabled)
        };
      });
    }
    return parseLines(value).map((label, index) => ({
      provider: "card",
      value: `pagamento_${index + 1}`,
      label,
      checked: index === 0,
      disabled: false
    }));
  }

  function parseButtonGroupItems(value) {
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        if (item && typeof item === "object") {
          item = item;
        } else {
          item = { label: item };
        }
        return {
          value: String(item.value == null ? `opcao_${index + 1}` : item.value),
          label: String(item.label == null ? `Opcao ${index + 1}` : item.label),
          cssClass: String(item.cssClass || ""),
          checked: toBooleanValue(item.checked),
          disabled: toBooleanValue(item.disabled)
        };
      });
    }
    return parseLines(value).map((label, index) => ({
      value: `opcao_${index + 1}`,
      label,
      cssClass: "",
      checked: index === 0,
      disabled: false
    }));
  }

  function parseDropdownItems(value) {
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        if (item && typeof item === "object") {
          item = item;
        } else {
          item = { text: item };
        }
        return {
          text: String(item.text || `Item ${index + 1}`),
          href: String(item.href || "#"),
          id: String(item.id || ""),
          cssClass: String(item.cssClass || "dropdown-item"),
          icon: String(item.icon || ""),
          iconColor: String(item.iconColor || ""),
          iconPosition: item.iconPosition === "right" ? "right" : "left",
          fieldListAction: getSafeFieldListAction(item.fieldListAction),
          ajaxEnabled: toBooleanValue(item.ajaxEnabled),
          ajaxUrlTemplate: String(item.ajaxUrlTemplate || ""),
          ajaxMethod: getSafeAjaxMethod(item.ajaxMethod),
          ajaxMappings: normalizeKeyValueEntries(item.ajaxMappings)
        };
      });
    }
    return parseLines(value).map((line, index) => {
      const parts = line.split("|").map((part) => part.trim());
      return {
        text: parts[0] || `Item ${index + 1}`,
        href: parts[1] || "#",
        id: parts[2] || "",
        cssClass: parts[3] || "dropdown-item",
        icon: "",
        iconColor: "",
        iconPosition: "left",
        fieldListAction: "",
        ajaxEnabled: false,
        ajaxUrlTemplate: "",
        ajaxMethod: "GET",
        ajaxMappings: []
      };
    });
  }

  function parseDropdownActions(value) {
    if (Array.isArray(value)) {
      return value.map((action, index) => {
        if (action && typeof action === "object") {
          action = action;
        } else {
          action = { text: action };
        }
        let type;
        if (["button", "link"].includes(action.type)) {
          type = action.type;
        } else {
          type = "button";
        }
        return {
          type,
          // Texto vazio + icone => botao so com icone. Fallback "Acao N" so quando nao ha texto nem icone.
          text: String(action.text || (action.icon ? "" : `Acao ${index + 1}`)),
          href: String(action.href || "#"),
          id: String(action.id || ""),
          cssClass: String(action.cssClass || (type === "link" ? "btn btn-primary" : "btn btn-outline-secondary")),
          icon: String(action.icon || ""),
          iconColor: String(action.iconColor || ""),
          iconPosition: action.iconPosition === "right" ? "right" : "left",
          fieldListAction: getSafeFieldListAction(action.fieldListAction),
          ajaxEnabled: toBooleanValue(action.ajaxEnabled),
          ajaxUrlTemplate: String(action.ajaxUrlTemplate || ""),
          ajaxMethod: getSafeAjaxMethod(action.ajaxMethod),
          ajaxMappings: normalizeKeyValueEntries(action.ajaxMappings)
        };
      });
    }
    return parseLines(value).map((line, index) => {
      const parts = line.split("|").map((part) => part.trim());
      let type;
      if (["button", "link"].includes(parts[0])) {
        type = parts[0];
      } else {
        type = "button";
      }
      let offset;
      if (type === parts[0]) {
        offset = 1;
      } else {
        offset = 0;
      }
      return {
        type,
        text: parts[offset] || `Acao ${index + 1}`,
        href: parts[offset + 1] || "#",
        id: parts[offset + 2] || "",
        cssClass: parts[offset + 3] || (type === "link" ? "btn btn-primary" : "btn btn-outline-secondary"),
        icon: "",
        iconColor: "",
        iconPosition: "left",
        fieldListAction: "",
        ajaxEnabled: false,
        ajaxUrlTemplate: "",
        ajaxMethod: "GET",
        ajaxMappings: []
      };
    });
  }

  function parseLines(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item == null ? "" : item).trim()).filter(Boolean);
    }
    return String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function parseListItems(value) {
    if (Array.isArray(value)) {
      return value.map((item) => {
        if (item && typeof item === "object") {
          return { text: String(item.text == null ? "" : item.text) };
        }
        return { text: String(item == null ? "" : item) };
      });
    }
    return parseLines(value).map((text) => ({ text }));
  }

  function parseBreadcrumbItems(value) {
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        if (item && typeof item === "object") {
          item = item;
        } else {
          item = { text: item };
        }
        return {
          text: String(item.text || `Item ${index + 1}`),
          href: String(item.href || "#"),
          cssClass: String(item.cssClass || "breadcrumb-item"),
          active: toBooleanValue(item.active)
        };
      });
    }
    return parseLines(value).map((text, index, items) => ({
      text,
      href: "#",
      cssClass: "breadcrumb-item",
      active: index === items.length - 1
    }));
  }

  function parseTableColumns(columnsValue, stylesValue) {
    if (Array.isArray(columnsValue)) {
      return columnsValue.map((column, index) => {
        if (column && typeof column === "object") {
          column = column;
        } else {
          column = { label: column };
        }
        return {
          label: String(column.label || `Coluna ${index + 1}`),
          data: String(column.data || ""),
          thClass: String(column.thClass || ""),
          tdClass: String(column.tdClass || ""),
          width: String(column.width || "")
        };
      });
    }
    const styleRows = parseLines(stylesValue).map(parseTableColumnStyle);
    return parseLines(columnsValue).map((line, index) => {
      const parts = line.split("|").map((part) => part.trim());
      const inlineStyle = parseTableColumnStyle(parts.slice(1).join("|"));
      const style = mergeTableColumnStyle(inlineStyle, styleRows[index]);
      return {
        label: parts[0] || `Coluna ${index + 1}`,
        data: "",
        thClass: style.thClass,
        tdClass: style.tdClass,
        width: style.width
      };
    });
  }

  function parseTableColumnStyle(value) {
    const parts = String(value || "").split("|").map((part) => part.trim());
    return {
      thClass: parts[0] || "",
      tdClass: parts[1] || "",
      width: parts[2] || ""
    };
  }

  function mergeTableColumnStyle(primary, secondary) {
    secondary = secondary || {};
    return {
      thClass: secondary.thClass || primary.thClass || "",
      tdClass: secondary.tdClass || primary.tdClass || "",
      width: secondary.width || primary.width || ""
    };
  }

  function parseTableRows(value) {
    if (Array.isArray(value)) {
      return value.map((row) => {
        if (row && typeof row === "object" && !Array.isArray(row) && Array.isArray(row.cells)) {
          return { cells: row.cells.map((cell) => String(cell == null ? "" : cell)) };
        }
        if (Array.isArray(row)) {
          return { cells: row.map((cell) => String(cell == null ? "" : cell)) };
        }
        if (row && typeof row === "object") {
          return { cells: Object.values(row).map((cell) => String(cell == null ? "" : cell)) };
        }
        return { cells: [String(row == null ? "" : row)] };
      });
    }
    return parseLines(value).map((line) => {
      return { cells: line.split("|").map((cell) => cell.trim()) };
    });
  }


  function getSafeFieldListAction(value) {
    if (["clone", "remove", "move-up", "move-down"].includes(value)) {
      return value;
    } else {
      return "";
    }
  }

  function getSafeAjaxMethod(value) {
    const method = String(value || "GET").toUpperCase();
    if (["GET", "POST"].includes(method)) {
      return method;
    } else {
      return "GET";
    }
  }


  function normalizeKeyValueEntries(value) {
    if (Array.isArray(value)) {
      return value.map((entry, index) => {
        if (entry && typeof entry === "object") {
          if (hasOwn(entry, "key")) {
            return { key: String(entry.key || ""), value: String(entry.value == null ? "" : entry.value) };
          }
          let optionValue;
          if (entry.value == null) {
            optionValue = `opcao_${index + 1}`;
          } else {
            optionValue = entry.value;
          }
          let optionLabel;
          if (entry.label == null) {
            optionLabel = optionValue;
          } else {
            optionLabel = entry.label;
          }
          return { key: String(optionValue), value: String(optionLabel) };
        }
        return { key: String(entry), value: String(entry) };
      });
    }

    if (value && typeof value === "object") {
      return Object.entries(value).map(([key, entryValue]) => ({
        key,
        value: String(entryValue == null ? "" : entryValue)
      }));
    }

    return parseOptions(value).map((option) => ({
      key: String(option.value),
      value: String(option.label)
    }));
  }


  window.TemplateBuilderParsers = {
    ICON_LIBRARIES,
    parseIconValue,
    buildIconValue,
    parseOptions,
    parseChoiceItems,
    parseSelectGroupItems,
    parsePaymentMethods,
    parseButtonGroupItems,
    parseDropdownItems,
    parseDropdownActions,
    parseLines,
    parseListItems,
    parseBreadcrumbItems,
    parseTableColumns,
    parseTableColumnStyle,
    mergeTableColumnStyle,
    parseTableRows,
    normalizeKeyValueEntries,
    getSafeFieldListAction,
    getSafeAjaxMethod
  };
}());
