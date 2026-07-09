// PAINEL DE PROPRIEDADES do builder — renderiza os grupos/campos do painel lateral
// (renderProperties/renderComponentProperties/renderPropertyField e os controles
// fieldRepeater/fieldMatrix/fieldKeyValue/fieldSubRepeater), alem das acoes de
// atualizacao chamadas pelo core/properties.js (updateXxx/applyXxx).
// As propriedades de cada componente vem SEMPRE de components.json (properties +
// propertySets) — resolvidas em getComponentPropertySchema.
// Uso (builder.js): TemplateBuilderPropertiesPanel.create({ state, els, ...funcoes })
// devolve a API consumida pelo builder e pelo properties.js.
(function () {
  "use strict";

  const helpers = window.TemplateBuilderHelpers || {};
  const escapeAttr = helpers.escapeAttr;
  const escapeHtml = helpers.escapeHtml;
  const toBooleanValue = helpers.toBooleanValue;

  const parsers = window.TemplateBuilderParsers || {};
  const parseTableColumns = parsers.parseTableColumns;
  const parseTableRows = parsers.parseTableRows;
  const normalizeKeyValueEntries = parsers.normalizeKeyValueEntries;
  const parseIconValue = parsers.parseIconValue;
  const buildIconValue = parsers.buildIconValue;

  // Bibliotecas de icone disponiveis no seletor (chave interna -> rotulo no select).
  // Precisa bater com ICON_LIBRARIES (core/parsers.js) e ICON_LIBRARY_URLS (builder.js).
  const ICON_LIBRARY_OPTIONS = [
    ["tabler", "Tabler (padrao)"],
    ["lineicons-regular", "Lineicons - Regular"],
    ["lineicons-solid", "Lineicons - Solid"],
    ["fa-solid", "Font Awesome - Solid"],
    ["fa-regular", "Font Awesome - Regular"],
    ["fa-brands", "Font Awesome - Brands"]
  ];
  // Classe(s) HTML por biblioteca de fonte, para a previa do seletor (renderIconSelectOption).
  // Mesmo mapeamento de FONT_ICON_CLASS_BUILDERS em builder.js (duplicado aqui de proposito:
  // e so a previa visual da lista, modulo separado, nao vale a pena compartilhar por 5 linhas).
  const ICON_PREVIEW_CLASS_BUILDERS = {
    "lineicons-regular": (name) => `lni lni-${name}`,
    "lineicons-solid": (name) => `lni lnis-${name}`,
    "fa-solid": (name) => `fa-solid fa-${name}`,
    "fa-regular": (name) => `fa-regular fa-${name}`,
    "fa-brands": (name) => `fa-brands fa-${name}`
  };

  const PATTERN_TEMPLATES = (window.TemplateBuilderData || {}).PATTERN_TEMPLATES || [];
  const AJAX_PRESETS = (window.TemplateBuilderData || {}).AJAX_PRESETS || [];

  // Referencias do builder (state, els e funcoes de arvore/render) — ver create().
  let ctx = null;

  function create(context) {
    ctx = context;
    return {
      renderProperties,
      renderSummary,
      applyAjaxPreset,
      applyKeyValueAction,
      applyMatrixAction,
      applyRepeaterAction,
      applyRepeaterKeyValueAction,
      applySubRepeaterAction,
      propControlsVisibility,
      updateKeyValueProperty,
      updateMatrixProperty,
      updateRepeaterKeyValueProperty,
      updateRepeaterProperty,
      updateSubRepeaterProperty
    };
  }

  // renderProperties: decide qual formulario mostrar (pagina, linha, componente).
  // renderComponentProperties: monta os grupos e campos do painel lateral.
  // getComponentPropertySchema: busca campos em components.json (propertySets + properties).
  // As propriedades vem SEMPRE de components.json (properties + propertySets).
  function renderProperties() {
    const node = ctx.findNode(ctx.state.selectedId);

    if (!node) {
      ctx.els.propertiesForm.innerHTML = '<div class="properties-empty">Nada selecionado</div>';
      return;
    }

    if (node.type === "page") {
      ctx.els.propertiesForm.innerHTML = renderPageProperties(node);
      return;
    }

    if (node.type === "row") {
      const location = ctx.findRowLocation(node.id);
      if (location && ctx.isFieldListComponent(location.card)) {
        ctx.els.propertiesForm.innerHTML = renderFieldListRowProperties(node, location.card);
        return;
      }
      ctx.els.propertiesForm.innerHTML = renderRowProperties(node);
      return;
    }

    ctx.els.propertiesForm.innerHTML = renderComponentProperties(node);
    initializeIconSelects();
  }

  function renderPageProperties(page) {
    const pageType = page.props.pageType || "normal";
    const isLoginPage = pageType !== "normal";
    const isLoginSplit = pageType === "login-split";
    const menuLayout = page.props.menuLayout || "none";
    const showPositionAndTheme = menuLayout !== "none";
    const showNavbarOptions = menuLayout === "horizontal" || menuLayout === "combo";
    const showSidebarOptions = menuLayout === "vertical" || menuLayout === "combo";
    const isPill = menuLayout === "combo-pill";

    const menuSection = isLoginPage
      ? '<section class="property-group"><h3>Menu de navegacao</h3><p class="properties-note">Indisponivel em paginas de login.</p></section>'
      : [
          '<section class="property-group"><h3>Menu de navegacao</h3>',
          fieldSelect("Tipo de layout", "menuLayout", menuLayout, [
            ["none", "Nenhum"],
            ["horizontal", "Superior (navbar)"],
            ["vertical", "Lateral (sidebar)"],
            ["combo", "Lateral + Superior"],
            ["combo-pill", "Pill + Icone lateral (moderno)"],
            ["module-rail", "Rail de modulos + topo (Metronic)"]
          ]),
          showPositionAndTheme ? fieldSelect("Tema", "menuTheme", page.props.menuTheme || "dark", [
            ["dark", "Escuro"],
            ["light", "Claro"],
            ["primary", "Cor do tema"],
            ["custom", "Cor informada"]
          ]) : "",
          showPositionAndTheme && page.props.menuTheme === "custom"
            ? fieldInput("Cor do menu", "menuThemeColor", page.props.menuThemeColor || "#206bc4", "color")
            : "",
          showSidebarOptions ? fieldSelect("Posicao do sidebar", "menuPosition", page.props.menuPosition || "left", [
            ["left", "Esquerda"],
            ["right", "Direita"]
          ]) : "",
          showSidebarOptions ? fieldSelect("Largura do sidebar", "menuSidebarWidth", page.props.menuSidebarWidth || "normal", [
            ["compact", "Compacto (so icones)"],
            ["normal", "Normal (220px)"],
            ["wide", "Largo (280px)"]
          ]) : "",
          showSidebarOptions ? fieldCheckbox("Permitir recolher o menu (collapse)", "menuCollapsible", page.props.menuCollapsible !== false) : "",
          isPill ? fieldSelect("Altura do menu lateral", "menuPillSidebarHeight", page.props.menuPillSidebarHeight || "center", [
            ["center", "Centralizado (altura dinamica)"],
            ["full", "Altura total"]
          ]) : "",
          isPill ? fieldSelect("Barra superior", "menuPillNavbarStyle", page.props.menuPillNavbarStyle || "pill", [
            ["pill", "Flutuante (pill)"],
            ["full", "Largura total (mais alta)"]
          ]) : "",
          showNavbarOptions ? fieldCheckbox("Navbar fixa no scroll (sticky)", "menuSticky", page.props.menuSticky) : "",
          "</section>"
        ].join("");

    return [
      '<section class="property-group"><h3>Pagina</h3>',
      fieldInput("Titulo do documento", "title", page.props.title || "Pagina"),
      '</section>',
      '<section class="property-group"><h3>Tipo de pagina</h3>',
      fieldSelect("Tipo", "pageType", pageType, [
        ["normal", "Pagina normal"],
        ["login-centered", "Login — formulario centralizado"],
        ["login-split", "Login — foto a esquerda + formulario"]
      ]),
      isLoginSplit ? fieldInput("Cor do painel esquerdo", "loginSideColor", page.props.loginSideColor || "#206bc4", "color") : "",
      isLoginSplit ? fieldInput("Imagem do painel esquerdo (URL)", "loginSideImage", page.props.loginSideImage || "") : "",
      '</section>',
      menuSection
    ].join("");
  }

  function renderRowProperties(row) {
    const columnFields = row.columns.map((column, index) => {
      return [
        fieldSelect(`Coluna ${index + 1}`, "span-" + column.id, column.props.span, getColumnSpanOptions(), `data-column-span="${column.id}"`),
        fieldInput(`Classe CSS coluna ${index + 1}`, "class-" + column.id, ctx.getColumnClass(column), "text", `data-column-class="${column.id}"`)
      ].join("");
    }).join("");

    return [
      fieldInput("Nome", "label", row.props.label || ""),
      fieldInput("Classe CSS da linha", "cssClass", ctx.getRowClass(row)),
      fieldSelect("Quantidade de colunas", "columnCount", row.columns.length, getColumnCountOptions(), `data-row-columns="${row.id}"`),
      columnFields,
      propertyActions()
    ].join("");
  }

  function renderFieldListRowProperties(row, fieldList) {
    const rows = ctx.getRowContainerRows(fieldList) || [];
    const index = rows.findIndex((item) => item.id === row.id);
    return [
      '<section class="property-group">',
      "<h3>Linha FieldList</h3>",
      `<div class="properties-note">Linha ${index + 1} de ${rows.length}. Arraste componentes diretamente para as celulas.</div>`,
      "</section>",
      propertyActions()
    ].join("");
  }

  function getColumnCountOptions() {
    return Array.from({ length: 12 }, (_, index) => {
      const value = String(index + 1);
      return [value, value];
    });
  }

  function getColumnSpanOptions() {
    return Array.from({ length: 12 }, (_, index) => {
      const value = String(index + 1);
      return [value, value];
    });
  }

  function renderComponentProperties(component) {
    const props = component.props || {};
    const fields = getComponentPropertySchema(component).concat([
      { label: "Classe CSS", prop: "cssClass", field: "text", group: "Aparencia", value: ctx.getComponentClass(component) }
    ]).filter((field) => matchesShowWhen(field, props));
    const groups = groupPropertyFields(fields).map((group) => {
      return renderPropertyGroup(group.label, group.fields, props);
    }).join("");

    return [
      groups,
      propertyActions()
    ].join("");
  }

  function getComponentPropertySchema(component) {
    const definition = ctx.getComponentDefinition(component.type);
    const sharedProperties = getComponentPropertySets(definition);
    let componentProperties;
    if (Array.isArray(definition.properties)) {
      componentProperties = definition.properties;
    } else {
      componentProperties = [];
    }
    if (sharedProperties.length || componentProperties.length) {
      return mergePropertySchemas(sharedProperties, componentProperties);
    }
    // components.json e a UNICA fonte de propriedades: sem "properties"/"propertySets"
    // no bloco, o painel fica vazio (nao existe mais fallback em JS).
    return [];
  }

  function getComponentPropertySets(definition) {
    let registrySets;
    if (ctx.state.componentRegistry && ctx.state.componentRegistry.propertySets) {
      registrySets = ctx.state.componentRegistry.propertySets;
    } else {
      registrySets = {};
    }
    let setNames;
    if (Array.isArray(definition.propertySets)) {
      setNames = definition.propertySets;
    } else {
      setNames = [];
    }
    return setNames.reduce((properties, setName) => {
      const propertySet = registrySets[setName];
      if (!propertySet) {
        return properties;
      }
      let fields;
      if (Array.isArray(propertySet)) {
        fields = propertySet;
      } else {
        fields = propertySet.properties;
      }
      if (!Array.isArray(fields)) {
        return properties;
      }
      let group;
      if (Array.isArray(propertySet)) {
        group = "";
      } else {
        group = propertySet.group;
      }
      fields.forEach((field) => {
        properties.push(Object.assign({}, field, {
          group: field.group || group || "Geral"
        }));
      });
      return properties;
    }, []);
  }

  function mergePropertySchemas() {
    const fields = [];
    const positions = new Map();
    Array.from(arguments).forEach((schema) => {
      (Array.isArray(schema) ? schema : []).forEach((field) => {
        if (!field || !field.prop) {
          return;
        }
        if (positions.has(field.prop)) {
          const index = positions.get(field.prop);
          fields[index] = Object.assign({}, fields[index], field);
          return;
        }
        positions.set(field.prop, fields.length);
        fields.push(Object.assign({}, field));
      });
    });
    return fields;
  }

  function groupPropertyFields(fields) {
    const groups = [];
    const groupsByLabel = new Map();
    fields.forEach((field) => {
      const label = field.group || "Geral";
      if (!groupsByLabel.has(label)) {
        const group = { label, fields: [] };
        groupsByLabel.set(label, group);
        groups.push(group);
      }
      groupsByLabel.get(label).fields.push(field);
    });
    return groups;
  }

  function renderPropertyGroup(label, fields, props) {
    const content = fields.map((field) => renderPropertyField(field, props)).join("");
    return `<section class="property-group"><h3>${escapeHtml(label)}</h3>${content}</section>`;
  }

  // === CONTROLES DO PAINEL DE PROPRIEDADES ===
  // fieldInput, fieldTextarea, fieldCheckbox, fieldSelect: constroem o HTML de cada campo.
  // fieldKeyValue: campo de pares chave/valor (ex: opcoes de select, atributos customizados).
  // fieldRepeater: lista de objetos editaveis (ex: itens de dropdown, botoes).
  // fieldMatrix: grade de celulas editaveis (ex: linhas de tabela).
  // initializeIconSelects: inicializa TomSelect nos campos de icone com busca lazy.
  // matchesShowWhen: suporte a campos condicionais no painel. Em components.json,
  // um campo pode ter "showWhen": { "prop": "outraProp", "equals": valor } — ele so
  // aparece quando a prop indicada tem o valor esperado (booleans usam toBooleanValue).
  function matchesShowWhen(field, props) {
    const showWhen = field.showWhen;
    if (!showWhen) {
      return true;
    }
    // Array de condicoes = todas precisam casar (AND).
    if (Array.isArray(showWhen)) {
      return showWhen.every((condition) => matchesShowWhenCondition(condition, props));
    }
    return matchesShowWhenCondition(showWhen, props);
  }

  function matchesShowWhenCondition(condition, props) {
    if (!condition || !condition.prop) {
      return true;
    }
    const actual = props[condition.prop];
    const expected = condition.equals;
    if (typeof expected === "boolean") {
      return toBooleanValue(actual) === expected;
    }
    return String(actual == null ? "" : actual) === String(expected);
  }

  // True se algum campo do painel deste componente tem showWhen referenciando propName
  // (ou seja, mudar propName deve re-renderizar o painel para atualizar a visibilidade).
  function propControlsVisibility(node, propName) {
    return getComponentPropertySchema(node).some((field) => {
      const showWhen = field.showWhen;
      if (!showWhen) {
        return false;
      }
      if (Array.isArray(showWhen)) {
        return showWhen.some((condition) => condition && condition.prop === propName);
      }
      return showWhen.prop === propName;
    });
  }

  // interpolatePropertyTemplate: troca tokens {{prop}}, {{prop:literal}} ou {{prop||fallbackProp}}.
  //   {{prop}}             — valor da prop ou vazio se ausente
  //   {{prop:literal}}     — usa "literal" quando prop estiver vazia
  //   {{prop||outraProp}}  — usa outraProp (de props) quando prop estiver vazia
  function interpolatePropertyTemplate(template, props) {
    return String(template || "").replace(/\{\{\s*(\w+)(?::([^|}]*))?(?:\|\|(\w+))?\s*\}\}/g, (match, name, literalFallback, propFallback) => {
      const val = props[name];
      if (val != null && String(val).trim() !== "") {
        return String(val);
      }
      if (propFallback != null) {
        const fallbackVal = props[propFallback];
        if (fallbackVal != null && String(fallbackVal).trim() !== "") {
          return String(fallbackVal);
        }
      }
      return literalFallback != null ? literalFallback : "";
    });
  }

  function renderPropertyField(field, props) {
    let value;
    if (ctx.hasOwn(field, "value")) {
      value = field.value;
    } else {
      value = props[field.prop];
    }
    const rows = Number(field.rows || 5);

    // Campo "info": somente leitura, sem data-prop (nunca grava). O valor vem de
    // valueTemplate com placeholders {{prop}} (ex.: "{{dropzoneId}}-store").
    if (field.field === "info") {
      return fieldInfo(field.label, interpolatePropertyTemplate(field.valueTemplate, props));
    }

    // Campo "code-info": textarea somente leitura com botao de copiar. Valor vem de
    // valueTemplate com placeholders {{prop:fallback}}. Ideal para snippets de referencia.
    if (field.field === "code-info") {
      return fieldCodeInfo(field.label, interpolatePropertyTemplate(field.valueTemplate, props), rows);
    }

    if (field.field === "keyvalue") {
      return fieldKeyValue(field.label, field.prop, value);
    }

    if (field.field === "attributes") {
      return fieldKeyValue(field.label, field.prop, value, {
        keyLabel: "Atributo",
        valueLabel: "Valor",
        addLabel: "Adicionar atributo",
        keyPrefix: "data-atributo"
      });
    }

    if (field.field === "pattern-picker") {
      const targetProp = escapeAttr(field.patternProp || "pattern");
      const opts = PATTERN_TEMPLATES.map((t) =>
        `<option value="${escapeAttr(t.value)}">${escapeHtml(t.label)}</option>`
      ).join("");
      return [
        '<div class="field">',
        `  <label class="form-label">Template de expressao</label>`,
        `  <select class="form-select form-select-sm pattern-picker-select" data-pattern-prop="${targetProp}">`,
        `    <option value="">— escolher template —</option>`,
        opts,
        `  </select>`,
        '</div>'
      ].join("");
    }

    if (field.field === "repeater") {
      return fieldRepeater(field, value);
    }

    if (field.field === "matrix") {
      return fieldMatrix(field, props);
    }

    if (field.field === "textarea") {
      return fieldTextarea(field.label, field.prop, value, rows);
    }

    if (field.field === "checkbox") {
      return fieldCheckbox(field.label, field.prop, value);
    }

    if (field.field === "select") {
      return fieldSelect(field.label, field.prop, value, field.options || []);
    }

    if (field.field === "icon") {
      return fieldIconSelect(field.label, field.prop, value);
    }

    return fieldInput(field.label, field.prop, value, getSafePropertyInputType(field.field), renderPropertyInputAttributes(field));
  }

  function renderPropertyInputAttributes(field) {
    const attributes = {
      min: field.min,
      max: field.max,
      step: field.step,
      minlength: field.minlength == null ? field.minLength : field.minlength,
      maxlength: field.maxlength == null ? field.maxLength : field.maxlength,
      pattern: field.pattern,
      placeholder: field.placeholder
    };
    return Object.entries(attributes).map(([name, value]) => {
      if (value == null || value === "") {
        return "";
      } else {
        return `${name}="${escapeAttr(value)}"`;
      }
    }).filter(Boolean).join(" ");
  }

  function getSafePropertyInputType(value) {
    const type = String(value || "text").toLowerCase();
    if (["text", "number", "url", "email", "color", "date", "time", "datetime-local", "password"].includes(type)) {
      return type;
    } else {
      return "text";
    }
  }

  function fieldInput(label, prop, value, type, extraAttrs) {
    let attrs;
    if (extraAttrs) {
      attrs = " " + extraAttrs;
    } else {
      attrs = "";
    }
    return `<div class="field"><label class="form-label" for="prop-${prop}">${label}</label><input id="prop-${prop}" class="form-control" type="${type || "text"}" data-prop="${prop}" value="${escapeAttr(value == null ? "" : value)}"${attrs}></div>`;
  }

  function fieldInfo(label, value) {
    return `<div class="field"><label class="form-label">${escapeHtml(label)}</label><input class="form-control" type="text" value="${escapeAttr(value == null ? "" : value)}" readonly tabindex="-1"></div>`;
  }

  function fieldCodeInfo(label, value, rows) {
    const clipboardIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    const safeValue = escapeHtml(value == null ? "" : value);
    return [
      '<div class="field">',
      `  <div class="d-flex align-items-center justify-content-between mb-1">`,
      `    <label class="form-label mb-0">${escapeHtml(label)}</label>`,
      `    <button type="button" class="btn btn-sm btn-ghost-secondary py-0 px-1" data-property-action="copy-code-info" title="Copiar codigo">${clipboardIcon}</button>`,
      `  </div>`,
      `  <textarea class="form-control font-monospace" rows="${rows || 6}" readonly tabindex="-1" style="font-size:0.7rem;resize:none;line-height:1.5">${safeValue}</textarea>`,
      '</div>'
    ].join("\n");
  }

  function fieldTextarea(label, prop, value, rows) {
    return `<div class="field"><label class="form-label" for="prop-${prop}">${label}</label><textarea id="prop-${prop}" class="form-control" data-prop="${prop}" rows="${rows || 5}">${escapeHtml(value == null ? "" : value)}</textarea></div>`;
  }

  function fieldCheckbox(label, prop, value) {
    return `<label class="field form-check form-switch"><input id="prop-${prop}" class="form-check-input" type="checkbox" data-prop="${prop}"${toBooleanValue(value) ? " checked" : ""}><span class="form-check-label">${label}</span></label>`;
  }

  function fieldSelect(label, prop, value, options, extraAttrs) {
    const htmlOptions = normalizePropertySelectOptions(options).map(([optionValue, optionLabel]) => {
      let selected;
      if (String(value) === String(optionValue)) {
        selected = " selected";
      } else {
        selected = "";
      }
      return `<option value="${escapeAttr(optionValue)}"${selected}>${escapeHtml(optionLabel)}</option>`;
    }).join("");
    return `<div class="field"><label class="form-label" for="prop-${prop}">${label}</label><select id="prop-${prop}" class="form-select" data-prop="${prop}" ${extraAttrs || ""}>${htmlOptions}</select></div>`;
  }

  function fieldIconSelect(label, prop, value) {
    return iconSelectControl(label, `prop-${prop}`, value, `data-prop="${escapeAttr(prop)}"`);
  }

  // iconSelectControl: renderiza DOIS controles por campo de icone —
  //   1. um <select> compacto de biblioteca (Tabler/Lineicons/Font Awesome), classe
  //      "icon-lib-select", que so troca a biblioteca (o nome e resetado — ver o
  //      handler ".icon-lib-select" em bindProperties, builder.js);
  //   2. o <select data-icon-select> de busca do NOME do icone (upgrade TomSelect em
  //      initializeIconSelects), que continua sendo o campo "real" — e ele que carrega
  //      dataAttrs (data-prop / data-repeater-prop / data-subrepeater-field, conforme o
  //      chamador), e seu valor final e a string combinada "<biblioteca>:<nome>".
  // O valor bruto (value) e sempre a string prefixada; aqui decompomos so para exibir.
  function iconSelectControl(label, inputId, value, dataAttrs) {
    const parsed = parseIconValue(value);
    const libOptions = ICON_LIBRARY_OPTIONS.map(([libKey, libLabel]) => {
      const selected = parsed.lib === libKey ? " selected" : "";
      return `<option value="${escapeAttr(libKey)}"${selected}>${escapeHtml(libLabel)}</option>`;
    }).join("");
    let selectedOption;
    if (parsed.name) {
      selectedOption = `<option value="${escapeAttr(parsed.name)}" selected>${escapeHtml(parsed.name)}</option>`;
    } else {
      selectedOption = "";
    }
    return [
      '<div class="field icon-select-field">',
      `  <label class="form-label" for="${escapeAttr(inputId)}">${escapeHtml(label)}</label>`,
      `  <select class="form-select form-select-sm icon-lib-select" data-icon-name-target="${escapeAttr(inputId)}" aria-label="Biblioteca de icone">${libOptions}</select>`,
      `  <select id="${escapeAttr(inputId)}" class="form-select" data-icon-select data-icon-lib="${escapeAttr(parsed.lib)}" ${dataAttrs || ""}>`,
      '    <option value="">Sem icone</option>',
      selectedOption,
      "  </select>",
      "</div>"
    ].join("");
  }

  function initializeIconSelects() {
    if (!window.TomSelect) {
      return;
    }

    ctx.els.propertiesForm.querySelectorAll("select[data-icon-select]").forEach((select) => {
      if (select.tomselect) {
        return;
      }
      const currentValue = select.value;
      // Biblioteca fixada na criacao deste controle (o valor completo do campo, com o
      // prefixo, so muda via re-render — ver ".icon-lib-select" em bindProperties).
      const lib = select.dataset.iconLib || "tabler";
      const icons = (ctx.state.iconLibraries && ctx.state.iconLibraries[lib]) || [];
      new window.TomSelect(select, {
        options: currentValue ? [{ value: currentValue, text: currentValue }] : [],
        items: currentValue ? [currentValue] : [],
        valueField: "value",
        labelField: "text",
        searchField: ["text"],
        maxItems: 1,
        maxOptions: 50,
        allowEmptyOption: true,
        closeAfterSelect: true,
        preload: "focus",
        loadThrottle: 150,
        placeholder: "Digite para buscar icone",
        plugins: ["clear_button"],
        load: function (query, callback) {
          const q = (query || "").toLowerCase().trim();
          let results;
          if (q) {
            results = icons.filter((icon) => icon.includes(q));
          } else {
            results = icons;
          }
          callback(results.slice(0, 50).map((icon) => ({ value: icon, text: icon })));
        },
        render: {
          option: (data, escape) => renderIconSelectOption(data, escape, lib),
          item: (data, escape) => renderIconSelectOption(data, escape, lib)
        },
        onChange: function (value) {
          // O select nativo guarda so o nome (bare); a prop precisa da string
          // completa "<biblioteca>:<nome>" — combina antes de disparar o "input"
          // que o dispatch generico (core/properties.js) vai gravar em node.props.
          select.value = buildIconValue(lib, value);
          select.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
    });
  }

  function renderIconSelectOption(data, escape, lib) {
    const name = String(data.value || "").replace(/[^A-Za-z0-9_-]/g, "");
    if (!name) {
      return `<div>${escape(data.text || "Sem icone")}</div>`;
    }
    if (!lib || lib === "tabler") {
      const src = `public/components/icons/outline/${name}.svg`;
      const maskStyle = `-webkit-mask-image:url(&quot;${src}&quot;);mask-image:url(&quot;${src}&quot;)`;
      return `<div class="icon-select-option"><span class="icon-select-preview" style="${maskStyle}"></span><span>${escape(data.text)}</span></div>`;
    }
    const classBuilder = ICON_PREVIEW_CLASS_BUILDERS[lib];
    if (!classBuilder) {
      return `<div>${escape(data.text)}</div>`;
    }
    return `<div class="icon-select-option"><i class="${classBuilder(name)}" aria-hidden="true"></i><span>${escape(data.text)}</span></div>`;
  }

  function normalizePropertySelectOptions(options) {
    if (Array.isArray(options)) {
      return options.map((option) => {
        if (Array.isArray(option)) {
          let value;
          if (option[0] == null) {
            value = "";
          } else {
            value = option[0];
          }
          let label;
          if (option[1] == null) {
            label = value;
          } else {
            label = option[1];
          }
          return [String(value), String(label)];
        }
        if (option && typeof option === "object") {
          let value;
          if (ctx.hasOwn(option, "key")) {
            value = option.key;
          } else {
            value = option.value;
          }
          let label;
          if (ctx.hasOwn(option, "label")) {
            label = option.label;
          } else {
            if (ctx.hasOwn(option, "text")) {
              label = option.text;
            } else {
              label = option.value;
            }
          }
          return [String(value == null ? "" : value), String(label == null ? value : label)];
        }
        return [String(option == null ? "" : option), String(option == null ? "" : option)];
      });
    }
    if (options && typeof options === "object") {
      return Object.entries(options).map(([value, label]) => [value, String(label == null ? "" : label)]);
    }
    return [];
  }

  function fieldKeyValue(label, prop, value, config) {
    config = config || {};
    const keyLabel = config.keyLabel || "Valor";
    const valueLabel = config.valueLabel || "Texto";
    const entries = normalizeKeyValueEntries(value);
    const rows = entries.map((entry, index) => {
      return [
        '<div class="keyvalue-row">',
        `  <input class="form-control" type="text" value="${escapeAttr(entry.key)}" data-keyvalue-prop="${escapeAttr(prop)}" data-keyvalue-index="${index}" data-keyvalue-role="key" aria-label="${escapeAttr(keyLabel)}">`,
        `  <input class="form-control" type="text" value="${escapeAttr(entry.value)}" data-keyvalue-prop="${escapeAttr(prop)}" data-keyvalue-index="${index}" data-keyvalue-role="value" aria-label="${escapeAttr(valueLabel)}">`,
        `  <button type="button" class="keyvalue-remove" data-keyvalue-action="remove" data-keyvalue-prop="${escapeAttr(prop)}" data-keyvalue-index="${index}" title="Remover opcao" aria-label="Remover opcao">&times;</button>`,
        "</div>"
      ].join("");
    }).join("");

    return [
      '<div class="field keyvalue-field">',
      `  <label class="form-label">${escapeHtml(label)}</label>`,
      `  <div class="keyvalue-head"><span>${escapeHtml(keyLabel)}</span><span>${escapeHtml(valueLabel)}</span><span></span></div>`,
      `  <div class="keyvalue-rows">${rows}</div>`,
      `  <button type="button" class="btn btn-outline-secondary keyvalue-add" data-keyvalue-action="add" data-keyvalue-prop="${escapeAttr(prop)}" data-keyvalue-prefix="${escapeAttr(config.keyPrefix || "opcao")}">${escapeHtml(config.addLabel || "Adicionar opcao")}</button>`,
      "</div>"
    ].join("");
  }

  function updateKeyValueProperty(node, field) {
    const prop = field.dataset.keyvalueProp;
    const index = Number(field.dataset.keyvalueIndex);
    const role = field.dataset.keyvalueRole;
    const entries = normalizeKeyValueEntries(node.props[prop]);
    if (!entries[index] || !["key", "value"].includes(role)) {
      return;
    }
    entries[index][role] = field.value;
    node.props[prop] = entries;
  }

  function applyKeyValueAction(node, button) {
    const prop = button.dataset.keyvalueProp;
    const entries = normalizeKeyValueEntries(node.props[prop]);
    if (button.dataset.keyvalueAction === "add") {
      const number = entries.length + 1;
      const prefix = button.dataset.keyvaluePrefix || "opcao";
      entries.push({
        key: prefix === "opcao" ? `opcao_${number}` : `${prefix}-${number}`,
        value: prefix === "opcao" ? `Opcao ${number}` : ""
      });
    }
    if (button.dataset.keyvalueAction === "remove") {
      entries.splice(Number(button.dataset.keyvalueIndex), 1);
    }
    node.props[prop] = entries;
  }

  function getRepeaterItemFields(field) {
    if (Array.isArray(field.itemFields)) return field.itemFields;
    if (Array.isArray(field.fields)) return field.fields;
    return [];
  }

  function fieldRepeater(field, value) {
    const itemFields = getRepeaterItemFields(field);
    const items = normalizeRepeaterItems(value, itemFields);
    const rows = items.map((item, index) => {
      const inputs = itemFields.map((itemField) => renderRepeaterItemField(field.prop, index, itemField, item[itemField.prop])).join("");
      return [
        '<div class="repeater-item">',
        `  <div class="repeater-item-head"><strong>${escapeHtml(getRepeaterItemTitle(item, index))}</strong><button type="button" class="structured-remove" data-repeater-action="remove" data-repeater-prop="${escapeAttr(field.prop)}" data-repeater-index="${index}" title="Remover item" aria-label="Remover item">&times;</button></div>`,
        `  <div class="repeater-item-fields">${inputs}</div>`,
        "</div>"
      ].join("");
    }).join("");

    return [
      '<div class="field structured-field">',
      `  <label class="form-label">${escapeHtml(field.label)}</label>`,
      `  <div class="repeater-items">${rows}</div>`,
      `  <button type="button" class="btn btn-outline-secondary structured-add" data-repeater-action="add" data-repeater-prop="${escapeAttr(field.prop)}">${escapeHtml(field.addLabel || "Adicionar item")}</button>`,
      "</div>"
    ].join("");
  }

  function renderRepeaterItemField(prop, index, field, value) {
    const inputId = `repeater-${prop}-${index}-${field.prop}`;
    const dataAttrs = `data-repeater-prop="${escapeAttr(prop)}" data-repeater-index="${index}" data-repeater-key="${escapeAttr(field.prop)}"`;
    // Seletor de template de API pronto: nao usa data-repeater-* (o handler generico
    // de input o ignora); o change e tratado em bindProperties, que aplica no modelo.
    if (field.field === "ajax-preset") {
      const opts = AJAX_PRESETS.map((preset) =>
        `<option value="${escapeAttr(preset.id)}">${escapeHtml(preset.label)}</option>`
      ).join("");
      return [
        '<div class="field">',
        `  <label class="form-label" for="${inputId}">${escapeHtml(field.label || "Template de API pronto")}</label>`,
        `  <select id="${inputId}" class="form-select form-select-sm ajax-preset-select" data-preset-index="${index}">`,
        `    <option value="">— aplicar template —</option>`,
        opts,
        `  </select>`,
        '</div>'
      ].join("");
    }
    if (field.field === "repeater") {
      return fieldSubRepeater(prop, index, field, value);
    }
    if (field.field === "keyvalue" || field.field === "attributes") {
      return fieldRepeaterKeyValue(prop, index, field, value, {
        keyLabel: field.keyLabel || (field.field === "attributes" ? "Atributo" : "Caminho JSON"),
        valueLabel: field.valueLabel || (field.field === "attributes" ? "Valor" : "Campo destino"),
        addLabel: field.addLabel || "Adicionar mapeamento",
        keyPrefix: field.keyPrefix || "json"
      });
    }
    if (field.field === "select") {
      const options = normalizePropertySelectOptions(field.options || []).map(([optionValue, optionLabel]) => {
        let selected;
        if (String(value) === String(optionValue)) {
          selected = " selected";
        } else {
          selected = "";
        }
        return `<option value="${escapeAttr(optionValue)}"${selected}>${escapeHtml(optionLabel)}</option>`;
      }).join("");
      return `<div class="field"><label class="form-label" for="${inputId}">${escapeHtml(field.label)}</label><select id="${inputId}" class="form-select" ${dataAttrs}>${options}</select></div>`;
    }
    if (field.field === "icon") {
      return iconSelectControl(field.label, inputId, value, dataAttrs);
    }
    if (field.field === "checkbox") {
      return `<label class="field form-check form-switch"><input id="${inputId}" class="form-check-input" type="checkbox" ${dataAttrs}${toBooleanValue(value) ? " checked" : ""}><span class="form-check-label">${escapeHtml(field.label)}</span></label>`;
    }
    if (field.field === "textarea") {
      return `<div class="field"><label class="form-label" for="${inputId}">${escapeHtml(field.label)}</label><textarea id="${inputId}" class="form-control" ${dataAttrs} rows="${Number(field.rows || 3)}">${escapeHtml(value == null ? "" : value)}</textarea></div>`;
    }
    const inputType = getSafePropertyInputType(field.field);
    const attributes = renderPropertyInputAttributes(field);
    let extraAttrs;
    if (attributes) {
      extraAttrs = " " + attributes;
    } else {
      extraAttrs = "";
    }
    return `<div class="field"><label class="form-label" for="${inputId}">${escapeHtml(field.label)}</label><input id="${inputId}" class="form-control" type="${inputType}" ${dataAttrs} value="${escapeAttr(value == null ? "" : value)}"${extraAttrs}></div>`;
  }

  // Repeater aninhado (2o nivel): renderiza uma lista dentro de um item de repeater.
  // Usa data-subrepeater-* para nao colidir com os handlers do repeater de 1o nivel.
  function fieldSubRepeater(parentProp, parentIndex, field, value) {
    const itemFields = getRepeaterItemFields(field);
    const items = normalizeRepeaterItems(value, itemFields);
    const rows = items.map((item, childIndex) => {
      const inputs = itemFields
        .map((itemField) => renderSubRepeaterItemField(parentProp, parentIndex, field.prop, childIndex, itemField, item[itemField.prop]))
        .join("");
      return [
        '<div class="repeater-item repeater-subitem">',
        `  <div class="repeater-item-head"><strong>${escapeHtml(getRepeaterItemTitle(item, childIndex))}</strong><button type="button" class="structured-remove" data-subrepeater-action="remove" data-subrepeater-prop="${escapeAttr(parentProp)}" data-subrepeater-index="${parentIndex}" data-subrepeater-key="${escapeAttr(field.prop)}" data-subrepeater-child="${childIndex}" title="Remover item" aria-label="Remover item">&times;</button></div>`,
        `  <div class="repeater-item-fields">${inputs}</div>`,
        "</div>"
      ].join("");
    }).join("");

    return [
      '<div class="field structured-field structured-subfield">',
      `  <label class="form-label">${escapeHtml(field.label)}</label>`,
      `  <div class="repeater-items">${rows}</div>`,
      `  <button type="button" class="btn btn-outline-secondary structured-add" data-subrepeater-action="add" data-subrepeater-prop="${escapeAttr(parentProp)}" data-subrepeater-index="${parentIndex}" data-subrepeater-key="${escapeAttr(field.prop)}">${escapeHtml(field.addLabel || "Adicionar item")}</button>`,
      "</div>"
    ].join("");
  }

  function renderSubRepeaterItemField(parentProp, parentIndex, childKey, childIndex, field, value) {
    const inputId = `subrepeater-${parentProp}-${parentIndex}-${childKey}-${childIndex}-${field.prop}`;
    const dataAttrs = `data-subrepeater-prop="${escapeAttr(parentProp)}" data-subrepeater-index="${parentIndex}" data-subrepeater-key="${escapeAttr(childKey)}" data-subrepeater-child="${childIndex}" data-subrepeater-field="${escapeAttr(field.prop)}"`;
    if (field.field === "select") {
      const options = normalizePropertySelectOptions(field.options || []).map(([optionValue, optionLabel]) => {
        const selected = String(value) === String(optionValue) ? " selected" : "";
        return `<option value="${escapeAttr(optionValue)}"${selected}>${escapeHtml(optionLabel)}</option>`;
      }).join("");
      return `<div class="field"><label class="form-label" for="${inputId}">${escapeHtml(field.label)}</label><select id="${inputId}" class="form-select" ${dataAttrs}>${options}</select></div>`;
    }
    if (field.field === "icon") {
      return iconSelectControl(field.label, inputId, value, dataAttrs);
    }
    if (field.field === "checkbox") {
      return `<label class="field form-check form-switch"><input id="${inputId}" class="form-check-input" type="checkbox" ${dataAttrs}${toBooleanValue(value) ? " checked" : ""}><span class="form-check-label">${escapeHtml(field.label)}</span></label>`;
    }
    if (field.field === "textarea") {
      return `<div class="field"><label class="form-label" for="${inputId}">${escapeHtml(field.label)}</label><textarea id="${inputId}" class="form-control" ${dataAttrs} rows="${Number(field.rows || 3)}">${escapeHtml(value == null ? "" : value)}</textarea></div>`;
    }
    const inputType = getSafePropertyInputType(field.field);
    return `<div class="field"><label class="form-label" for="${inputId}">${escapeHtml(field.label)}</label><input id="${inputId}" class="form-control" type="${inputType}" ${dataAttrs} value="${escapeAttr(value == null ? "" : value)}"></div>`;
  }

  function fieldRepeaterKeyValue(parentProp, parentIndex, field, value, config) {
    config = config || {};
    const keyLabel = config.keyLabel || "Chave";
    const valueLabel = config.valueLabel || "Valor";
    const entries = normalizeKeyValueEntries(value);
    const rows = entries.map((entry, entryIndex) => {
      const dataAttrs = [
        `data-repeater-keyvalue-prop="${escapeAttr(parentProp)}"`,
        `data-repeater-keyvalue-index="${parentIndex}"`,
        `data-repeater-keyvalue-key="${escapeAttr(field.prop)}"`,
        `data-repeater-keyvalue-entry="${entryIndex}"`
      ].join(" ");
      return [
        '<div class="keyvalue-row">',
        `  <input class="form-control" type="text" value="${escapeAttr(entry.key)}" ${dataAttrs} data-repeater-keyvalue-role="key" aria-label="${escapeAttr(keyLabel)}">`,
        `  <input class="form-control" type="text" value="${escapeAttr(entry.value)}" ${dataAttrs} data-repeater-keyvalue-role="value" aria-label="${escapeAttr(valueLabel)}">`,
        `  <button type="button" class="keyvalue-remove" data-repeater-keyvalue-action="remove" data-repeater-keyvalue-prop="${escapeAttr(parentProp)}" data-repeater-keyvalue-index="${parentIndex}" data-repeater-keyvalue-key="${escapeAttr(field.prop)}" data-repeater-keyvalue-entry="${entryIndex}" title="Remover mapeamento" aria-label="Remover mapeamento">&times;</button>`,
        "</div>"
      ].join("");
    }).join("");

    return [
      '<div class="field keyvalue-field">',
      `  <label class="form-label">${escapeHtml(field.label)}</label>`,
      `  <div class="keyvalue-head"><span>${escapeHtml(keyLabel)}</span><span>${escapeHtml(valueLabel)}</span><span></span></div>`,
      `  <div class="keyvalue-rows">${rows}</div>`,
      `  <button type="button" class="btn btn-outline-secondary keyvalue-add" data-repeater-keyvalue-action="add" data-repeater-keyvalue-prop="${escapeAttr(parentProp)}" data-repeater-keyvalue-index="${parentIndex}" data-repeater-keyvalue-key="${escapeAttr(field.prop)}" data-repeater-keyvalue-prefix="${escapeAttr(config.keyPrefix || "json")}">${escapeHtml(config.addLabel || "Adicionar item")}</button>`,
      "</div>"
    ].join("");
  }

  function getRepeaterItemTitle(item, index) {
    return item.text || item.label || item.title || `Item ${index + 1}`;
  }

  function normalizeRepeaterItems(value, itemFields) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return Object.assign({}, item);
      }
      let firstField;
      if (itemFields[0]) {
        firstField = itemFields[0].prop;
      } else {
        firstField = "value";
      }
      return { [firstField]: item == null ? "" : item };
    });
  }

  function createRepeaterItem(field) {
    return getRepeaterItemFields(field).reduce((item, itemField) => {
      if (ctx.hasOwn(itemField, "default")) {
        item[itemField.prop] = ctx.deepClone(itemField.default);
      } else {
        item[itemField.prop] = getDefaultPropertyFieldValue(itemField);
      }
      return item;
    }, {});
  }

  function getDefaultPropertyFieldValue(field) {
    if (field.field === "checkbox") {
      return false;
    }
    if (field.field === "keyvalue" || field.field === "attributes" || field.field === "repeater") {
      return [];
    }
    if (field.field === "select" && normalizePropertySelectOptions(field.options || []).length) {
      return normalizePropertySelectOptions(field.options)[0][0];
    }
    return "";
  }

  function updateRepeaterProperty(node, input) {
    const prop = input.dataset.repeaterProp;
    const index = Number(input.dataset.repeaterIndex);
    const key = input.dataset.repeaterKey;
    const items = normalizeRepeaterItems(node.props[prop], []);
    if (!items[index] || !key) {
      return;
    }
    if (input.type === "checkbox") {
      items[index][key] = input.checked;
    } else {
      items[index][key] = input.value;
    }
    node.props[prop] = items;
  }

  // Aplica um preset de AJAX (AJAX_PRESETS) ao botao de indice informado do
  // componente selecionado: liga ajaxEnabled e preenche URL, metodo e mapeamentos.
  function applyAjaxPreset(index, presetId) {
    if (!ctx.state.selectedId || Number.isNaN(index)) {
      return;
    }
    const node = ctx.findNode(ctx.state.selectedId);
    const preset = AJAX_PRESETS.find((p) => p.id === presetId);
    if (!node || !preset) {
      return;
    }
    const items = normalizeRepeaterItems(node.props.buttons, []);
    if (!items[index]) {
      return;
    }
    items[index].ajaxEnabled = true;
    items[index].ajaxUrlTemplate = preset.url;
    items[index].ajaxMethod = preset.method || "GET";
    items[index].ajaxMappings = preset.mappings.map((m) => ({ key: m.key, value: m.value }));
    node.props.buttons = items;
    ctx.render();
    ctx.commitHistory();
  }

  function updateRepeaterKeyValueProperty(node, input) {
    const prop = input.dataset.repeaterKeyvalueProp;
    const index = Number(input.dataset.repeaterKeyvalueIndex);
    const key = input.dataset.repeaterKeyvalueKey;
    const entryIndex = Number(input.dataset.repeaterKeyvalueEntry);
    const role = input.dataset.repeaterKeyvalueRole;
    const items = normalizeRepeaterItems(node.props[prop], []);
    if (!items[index] || !key || !["key", "value"].includes(role)) {
      return;
    }
    const entries = normalizeKeyValueEntries(items[index][key]);
    if (!entries[entryIndex]) {
      return;
    }
    entries[entryIndex][role] = input.value;
    items[index][key] = entries;
    node.props[prop] = items;
  }

  function applyRepeaterKeyValueAction(node, button) {
    const prop = button.dataset.repeaterKeyvalueProp;
    const index = Number(button.dataset.repeaterKeyvalueIndex);
    const key = button.dataset.repeaterKeyvalueKey;
    const items = normalizeRepeaterItems(node.props[prop], []);
    if (!items[index] || !key) {
      return;
    }
    const entries = normalizeKeyValueEntries(items[index][key]);
    if (button.dataset.repeaterKeyvalueAction === "add") {
      const number = entries.length + 1;
      const prefix = button.dataset.repeaterKeyvaluePrefix || "json";
      entries.push({
        key: prefix === "json" ? `atributo_${number}` : `${prefix}-${number}`,
        value: ""
      });
    }
    if (button.dataset.repeaterKeyvalueAction === "remove") {
      entries.splice(Number(button.dataset.repeaterKeyvalueEntry), 1);
    }
    items[index][key] = entries;
    node.props[prop] = items;
  }

  function applyRepeaterAction(node, button) {
    const prop = button.dataset.repeaterProp;
    const field = getComponentPropertySchema(node).find((item) => item.prop === prop);
    const items = normalizeRepeaterItems(node.props[prop], field ? getRepeaterItemFields(field) : []);
    const action = button.dataset.repeaterAction;
    const index = Number(button.dataset.repeaterIndex);
    if (action === "add") {
      items.push(createRepeaterItem(field || {}));
    }
    if (action === "remove") {
      items.splice(index, 1);
    }
    if (prop === "columns" && ctx.isFieldListComponent(node) && !items.length) {
      items.push({
        label: "Coluna 1",
        thClass: "",
        tdClass: "",
        width: ""
      });
    }
    node.props[prop] = items;
    if (prop === "columns") {
      if (ctx.isFieldListComponent(node)) {
        let changedIndex;
        if (action === "add") {
          changedIndex = items.length - 1;
        } else {
          changedIndex = index;
        }
        ctx.syncFieldListRows(node, action, changedIndex);
        return;
      }
      node.props.rows = parseTableRows(node.props.rows).map((row) => {
        const cells = row.cells.slice();
        if (action === "add") {
          cells.push("");
        }
        if (action === "remove") {
          cells.splice(index, 1);
        }
        return { cells };
      });
      syncTableRowCellCounts(node);
    }
  }

  // Atualiza um campo de um item do repeater aninhado (2o nivel): node.props[prop][index][key][child][field].
  function updateSubRepeaterProperty(node, input) {
    const prop = input.dataset.subrepeaterProp;
    const index = Number(input.dataset.subrepeaterIndex);
    const key = input.dataset.subrepeaterKey;
    const child = Number(input.dataset.subrepeaterChild);
    const fieldKey = input.dataset.subrepeaterField;
    const items = normalizeRepeaterItems(node.props[prop], []);
    if (!items[index] || !key || !fieldKey) {
      return;
    }
    const children = normalizeRepeaterItems(items[index][key], []);
    if (!children[child]) {
      return;
    }
    if (input.type === "checkbox") {
      children[child][fieldKey] = input.checked;
    } else {
      children[child][fieldKey] = input.value;
    }
    items[index][key] = children;
    node.props[prop] = items;
  }

  function applySubRepeaterAction(node, button) {
    const prop = button.dataset.subrepeaterProp;
    const index = Number(button.dataset.subrepeaterIndex);
    const key = button.dataset.subrepeaterKey;
    const items = normalizeRepeaterItems(node.props[prop], []);
    if (!items[index] || !key) {
      return;
    }
    const children = normalizeRepeaterItems(items[index][key], []);
    const action = button.dataset.subrepeaterAction;
    if (action === "add") {
      const parentField = getComponentPropertySchema(node).find((item) => item.prop === prop);
      const parentItemFields = parentField ? getRepeaterItemFields(parentField) : [];
      const childField = parentItemFields.find((item) => item.prop === key && item.field === "repeater");
      children.push(createRepeaterItem(childField || {}));
    }
    if (action === "remove") {
      children.splice(Number(button.dataset.subrepeaterChild), 1);
    }
    items[index][key] = children;
    node.props[prop] = items;
  }

  function fieldMatrix(field, props) {
    const columns = ctx.ensureTableColumns(parseTableColumns(props[field.columnsProp || "columns"]));
    const rows = parseTableRows(props[field.prop]);
    const header = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
    const body = rows.map((row, rowIndex) => {
      const cells = columns.map((column, cellIndex) => {
        let value;
        if (row.cells[cellIndex] == null) {
          value = "";
        } else {
          value = row.cells[cellIndex];
        }
        return `<td><input class="form-control" type="text" value="${escapeAttr(value)}" data-matrix-prop="${escapeAttr(field.prop)}" data-matrix-row-index="${rowIndex}" data-matrix-cell-index="${cellIndex}" aria-label="${escapeAttr(column.label)}"></td>`;
      }).join("");
      return `<tr>${cells}<td class="matrix-actions"><button type="button" class="structured-remove" data-matrix-action="remove" data-matrix-prop="${escapeAttr(field.prop)}" data-matrix-row-index="${rowIndex}" title="Remover linha" aria-label="Remover linha">&times;</button></td></tr>`;
    }).join("");

    return [
      '<div class="field structured-field matrix-field">',
      `  <label class="form-label">${escapeHtml(field.label)}</label>`,
      '  <div class="matrix-scroll">',
      '    <table class="matrix-table">',
      `      <thead><tr>${header}<th></th></tr></thead>`,
      `      <tbody>${body}</tbody>`,
      "    </table>",
      "  </div>",
      `  <button type="button" class="btn btn-outline-secondary structured-add" data-matrix-action="add" data-matrix-prop="${escapeAttr(field.prop)}" data-matrix-columns-prop="${escapeAttr(field.columnsProp || "columns")}">${escapeHtml(field.addLabel || "Adicionar linha")}</button>`,
      "</div>"
    ].join("");
  }

  function updateMatrixProperty(node, input) {
    const prop = input.dataset.matrixProp;
    const rowIndex = Number(input.dataset.matrixRowIndex);
    const cellIndex = Number(input.dataset.matrixCellIndex);
    const rows = parseTableRows(node.props[prop]);
    if (!rows[rowIndex]) {
      return;
    }
    rows[rowIndex].cells[cellIndex] = input.value;
    node.props[prop] = rows;
  }

  function applyMatrixAction(node, button) {
    const prop = button.dataset.matrixProp;
    const rows = parseTableRows(node.props[prop]);
    if (button.dataset.matrixAction === "add") {
      const columns = ctx.ensureTableColumns(parseTableColumns(node.props[button.dataset.matrixColumnsProp || "columns"]));
      rows.push({ cells: columns.map(() => "") });
    }
    if (button.dataset.matrixAction === "remove") {
      rows.splice(Number(button.dataset.matrixRowIndex), 1);
    }
    node.props[prop] = rows;
  }

  function syncTableRowCellCounts(node) {
    const columnCount = parseTableColumns(node.props.columns).length;
    node.props.rows = parseTableRows(node.props.rows).map((row) => {
      const cells = row.cells.slice(0, columnCount);
      while (cells.length < columnCount) {
        cells.push("");
      }
      return { cells };
    });
  }

  function propertyActions() {
    return [
      '<div class="property-actions">',
      '<button type="button" class="btn btn-outline-primary" data-property-action="duplicate">Duplicar</button>',
      '<button type="button" class="btn btn-outline-danger" data-property-action="remove">Remover</button>',
      '</div>'
    ].join("");
  }

  function renderSummary() {
    const count = ctx.getAllRows().reduce((total, row) => {
      return total + row.columns.reduce((sum, column) => sum + column.children.length, 0);
    }, 0);
    ctx.els.summary.textContent = `${count} componente${count === 1 ? "" : "s"}`;
    syncPageName();
  }

  function syncPageName() {
    if (ctx.els.pageName && document.activeElement !== ctx.els.pageName) {
      ctx.els.pageName.value = ctx.state.page.name || "";
    }
  }


  window.TemplateBuilderPropertiesPanel = { create };
}());
