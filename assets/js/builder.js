// DEV STUDIO BUILDER — orquestrador principal do editor.
// Este arquivo concentra: estado global, renderizacao do canvas, painel de
// propriedades, historico de undo/redo e coordenacao entre os modulos externos.
// Consulte docs/MAPA_BUILDER_JS.md para um mapa detalhado de cada secao.
(function () {
  "use strict";

  // === CONSTANTES E IMPORTS ===
  // Helpers vindos de helpers.js via window.TemplateBuilderHelpers.
  const STORAGE_KEY = "template-builder-mvp";
  const HISTORY_LIMIT = 60;
  const COMPONENTS_URL = "assets/data/components.json";
  const TABLER_ICONS_URL = "assets/data/tabler-icons.json";
  // URLs das listas de nomes de icone por biblioteca (mesmo formato de tabler-icons.json:
  // {version, source, count, icons:[...]}), usadas pelo seletor de icone do painel.
  const ICON_LIBRARY_URLS = {
    tabler: TABLER_ICONS_URL,
    "lineicons-regular": "assets/data/lineicons-regular-icons.json",
    "lineicons-solid": "assets/data/lineicons-solid-icons.json",
    "fa-solid": "assets/data/fontawesome-solid-icons.json",
    "fa-regular": "assets/data/fontawesome-regular-icons.json",
    "fa-brands": "assets/data/fontawesome-brands-icons.json"
  };

  // Dados constantes (templates de regex e presets de AJAX) vivem em
  // assets/js/data/pattern-templates.js e sao consumidos pelo painel de
  // propriedades (core/properties-panel.js) via window.TemplateBuilderData.
  const helpers = window.TemplateBuilderHelpers || {};
  const attr = helpers.attr;
  const buildButtonClass = helpers.buildButtonClass;
  const classAttr = helpers.classAttr;
  const escapeAttr = helpers.escapeAttr;
  const escapeHtml = helpers.escapeHtml;
  const idAttr = helpers.idAttr;
  const indent = helpers.indent;
  const mergeClassNames = helpers.mergeClassNames;
  const normalizeCssClass = helpers.normalizeCssClass;
  const sanitizeElementId = helpers.sanitizeElementId;
  const toBooleanValue = helpers.toBooleanValue;
  const toJsLiteral = helpers.toJsLiteral;
  const toJsString = helpers.toJsString;
  const toPositiveInteger = helpers.toPositiveInteger;

  // Parsers de dados (props -> formato canonico dos renderers): core/parsers.js.
  const parsers = window.TemplateBuilderParsers || {};
  const parseOptions = parsers.parseOptions;
  const parseChoiceItems = parsers.parseChoiceItems;
  const parseSelectGroupItems = parsers.parseSelectGroupItems;
  const parsePaymentMethods = parsers.parsePaymentMethods;
  const parseButtonGroupItems = parsers.parseButtonGroupItems;
  const parseDropdownItems = parsers.parseDropdownItems;
  const parseDropdownActions = parsers.parseDropdownActions;
  const parseLines = parsers.parseLines;
  const parseListItems = parsers.parseListItems;
  const parseBreadcrumbItems = parsers.parseBreadcrumbItems;
  const parseTableColumns = parsers.parseTableColumns;
  const parseTableRows = parsers.parseTableRows;
  const normalizeKeyValueEntries = parsers.normalizeKeyValueEntries;
  const getSafeFieldListAction = parsers.getSafeFieldListAction;
  const getSafeAjaxMethod = parsers.getSafeAjaxMethod;
  const ICON_LIBRARIES = parsers.ICON_LIBRARIES;
  const parseIconValue = parsers.parseIconValue;
  const buildIconValue = parsers.buildIconValue;

  // === ESTADO GLOBAL ===
  // Toda a memoria do editor fica aqui. Nao modifique state diretamente de fora
  // de builder.js — use os objetos de contexto (getDragDropContext, etc.).
  const state = {
    page: createEmptyPage(),
    selectedId: null,
    selectedSection: null,
    drag: null,
    outputKind: "html",
    componentRegistry: null,
    componentsById: {},
    layoutBlocksById: {},
    // Nomes de icone por biblioteca (Tabler + Lineicons + Font Awesome), usados
    // pelo seletor de icone do painel de propriedades. Chaves: ver ICON_LIBRARY_URLS.
    iconLibraries: {},
    history: [],
    future: [],
    preview: false
  };

  const els = {};

  // Historico de undo/redo + persistencia (localStorage): core/history-storage.js.
  // normalizePage e render sao passados como arrows porque sao definidos mais abaixo
  // (a arrow so resolve a funcao na hora da chamada).
  const historyStore = window.TemplateBuilderHistory.create({
    state,
    storageKey: STORAGE_KEY,
    historyLimit: HISTORY_LIMIT,
    normalizePage: (page) => normalizePage(page),
    render: () => render()
  });
  const debounceHistory = historyStore.debounceHistory;
  const commitHistory = historyStore.commitHistory;
  const undo = historyStore.undo;
  const redo = historyStore.redo;
  const saveToStorage = historyStore.saveToStorage;
  const loadStoredPage = historyStore.loadStoredPage;

  // Preview "vivo" das libs no canvas (TomSelect, ApexCharts, Litepicker, Dropzone,
  // FullCalendar, Gantt, password toggle, quantity stepper): core/preview-libs.js.
  const previewLibs = window.TemplateBuilderPreviewLibs.create({
    collectExportComponents: () => collectExportComponents(),
    getComponentDefinition: (type) => getComponentDefinition(type),
    state
  });
  const initializePreviewComponents = previewLibs.initializePreviewComponents;
  const initializePreviewPasswordToggles = previewLibs.initializePreviewPasswordToggles;

  // Painel de propriedades (render dos grupos/campos e acoes de repeater, matrix,
  // keyvalue, subrepeater): core/properties-panel.js. As funcoes do builder sao
  // passadas como arrows (so resolvem na hora da chamada).
  const propertiesPanel = window.TemplateBuilderPropertiesPanel.create({
    state,
    els,
    deepClone: (...args) => deepClone(...args),
    ensureTableColumns: (...args) => ensureTableColumns(...args),
    findNode: (...args) => findNode(...args),
    findRowLocation: (...args) => findRowLocation(...args),
    getAllRows: (...args) => getAllRows(...args),
    getColumnClass: (...args) => getColumnClass(...args),
    getComponentClass: (...args) => getComponentClass(...args),
    getComponentDefinition: (...args) => getComponentDefinition(...args),
    getRowClass: (...args) => getRowClass(...args),
    getRowContainerRows: (...args) => getRowContainerRows(...args),
    hasOwn: (...args) => hasOwn(...args),
    isFieldListComponent: (...args) => isFieldListComponent(...args),
    render: (...args) => render(...args),
    syncFieldListRows: (...args) => syncFieldListRows(...args),
    commitHistory: (...args) => commitHistory(...args)
  });
  const renderProperties = propertiesPanel.renderProperties;
  const renderSummary = propertiesPanel.renderSummary;
  const applyAjaxPreset = propertiesPanel.applyAjaxPreset;
  const applyKeyValueAction = propertiesPanel.applyKeyValueAction;
  const applyMatrixAction = propertiesPanel.applyMatrixAction;
  const applyRepeaterAction = propertiesPanel.applyRepeaterAction;
  const applyRepeaterKeyValueAction = propertiesPanel.applyRepeaterKeyValueAction;
  const applySubRepeaterAction = propertiesPanel.applySubRepeaterAction;
  const propControlsVisibility = propertiesPanel.propControlsVisibility;
  const updateKeyValueProperty = propertiesPanel.updateKeyValueProperty;
  const updateMatrixProperty = propertiesPanel.updateMatrixProperty;
  const updateRepeaterKeyValueProperty = propertiesPanel.updateRepeaterKeyValueProperty;
  const updateRepeaterProperty = propertiesPanel.updateRepeaterProperty;
  const updateSubRepeaterProperty = propertiesPanel.updateSubRepeaterProperty;

  // === INICIALIZACAO ===
  // init() e chamado uma vez quando o DOM esta pronto. Carrega o catalogo,
  // constroi a paleta, vincula eventos e restaura a pagina salva.
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    els.shell = document.querySelector(".app-shell");
    els.canvas = document.getElementById("canvas");
    els.pageNavbar = document.getElementById("editor-page-navbar");
    els.pageSidebar = document.getElementById("editor-page-sidebar");
    els.pageBodyWrapper = document.getElementById("editor-page-body-wrapper");
    els.pageHeader = document.getElementById("editor-page-header");
    els.pageFooter = document.getElementById("editor-page-footer");
    els.propertiesForm = document.getElementById("properties-form");
    els.summary = document.getElementById("document-summary");
    els.search = document.getElementById("palette-search");
    els.paletteGroups = document.getElementById("palette-groups");
    els.outputDialog = document.getElementById("output-dialog");
    els.outputTitle = document.getElementById("output-title");
    els.outputContent = document.getElementById("output-content");
    els.pageName = document.getElementById("page-name");
    els.pageSettingsBtn = document.getElementById("btn-page-settings");
    els.importJsonFile = document.getElementById("import-json-file");

    await Promise.all([loadComponentRegistry(), loadIconLibraries()]).catch((err) => {
      document.body.innerHTML = `<div style="padding:2rem;font-family:sans-serif"><h2>Erro ao inicializar o builder</h2><pre>${err.message}</pre></div>`;
      throw err;
    });
    renderPalette();
    bindPalette();
    bindCanvas();
    bindToolbar();
    bindProperties();
    bindSearch();
    bindDevices();

    // Restaura automaticamente o trabalho salvo no navegador (mesmo
    // comportamento do Database Designer e do Report Builder). Se nao houver
    // nada salvo — ou estiver corrompido — comeca com a pagina vazia.
    state.page = loadStoredPage() || createEmptyPage();

    commitHistory();
    render();
  }

  // === CRIACAO DE PAGINA ===
  // createEmptyPage: pagina sem conteudo algum.
  // createStarterPage: pagina de exemplo com cabecalho e campos de cadastro.
  function createEmptyPage() {
    return {
      id: uid("page"),
      type: "page",
      name: "",
      props: {
        pretitle: "DEV STUDIO BUILDER",
        title: "Nova pagina",
        menuLayout: "none",
        menuPosition: "left",
        menuTheme: "dark",
        menuThemeColor: "#206bc4",
        menuSticky: false,
        menuSidebarWidth: "normal",
        pageType: "normal",
        loginSideColor: "#206bc4",
        loginSideImage: "",
        buttonDefaultVariant: "",
        buttonDefaultOutline: "",
        buttonDefaultSize: "",
        buttonDefaultIconColor: ""
      },
      navbar: [],
      sidebar: [],
      header: [],
      footer: [],
      children: []
    };
  }

  function createStarterPage() {
    return {
      id: uid("page"),
      type: "page",
      props: {
        pretitle: "DEV STUDIO BUILDER",
        title: "Cadastro",
        menuLayout: "none",
        menuPosition: "left",
        menuTheme: "dark",
        menuThemeColor: "#206bc4",
        menuSticky: false,
        menuSidebarWidth: "normal",
        buttonDefaultVariant: "",
        buttonDefaultOutline: "",
        buttonDefaultSize: "",
        buttonDefaultIconColor: ""
      },
      navbar: [],
      sidebar: [],
      header: [
        createRow([12], [
          [
            createComponent("html", {
              html: '<div class="page-pretitle">DEV STUDIO BUILDER</div><h2 class="page-title">Cadastro</h2>'
            })
          ]
        ])
      ],
      footer: [],
      children: [
        createRow([12], [
          [
            createComponent("paragraph", { text: "Preencha os dados principais." })
          ]
        ]),
        createRow([6, 6], [
          [createComponent("input", { label: "Nome", placeholder: "Nome completo", required: true })],
          [createComponent("input", { label: "Email", placeholder: "email@dominio.com", required: true })]
        ]),
        createRow([6, 6], [
          [createComponent("date", { label: "Nascimento" })],
          [createComponent("select", { label: "Situacao", options: { ativo: "Ativo", inativo: "Inativo", pendente: "Pendente" } })]
        ]),
        createRow([12], [
          [createComponent("button", { text: "Salvar", variant: "primary" })]
        ])
      ]
    };
  }

  // === CATALOGO DE COMPONENTES ===
  // Carrega components.json e monta os mapas componentsById / layoutBlocksById.
  // Sem fallback: se o fetch falhar, init() exibe erro claro em vez de carregar parcial.
  async function loadComponentRegistry() {
    const response = await fetch(COMPONENTS_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Falha ao carregar components.json: " + response.status);
    }
    setComponentRegistry(await response.json());
  }

  // Carrega, em paralelo, a lista de nomes de icone de cada biblioteca disponivel
  // (Tabler + Lineicons Regular/Solid + Font Awesome Solid/Regular/Brands). Falha
  // isolada por biblioteca: se uma nao carregar, as demais continuam disponiveis.
  async function loadIconLibraries() {
    const keys = Object.keys(ICON_LIBRARY_URLS);
    const failed = [];
    await Promise.all(keys.map(async (key) => {
      try {
        const response = await fetch(ICON_LIBRARY_URLS[key], { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`icon registry not found: ${key}`);
        }
        const registry = await response.json();
        state.iconLibraries[key] = Array.isArray(registry.icons) ? registry.icons.map(String) : [];
      } catch (error) {
        state.iconLibraries[key] = [];
        failed.push(key);
      }
    }));
    if (failed.length) {
      toast(`Aviso: icones nao carregados (${failed.join(", ")})`);
    }
  }

  function setComponentRegistry(registry) {
    if (!registry || !Array.isArray(registry.groups)) {
      throw new Error("components.json invalido: estrutura inesperada");
    }
    state.componentRegistry = registry;
    state.componentsById = {};
    state.layoutBlocksById = {};

    registry.groups.forEach((group) => {
      (group.blocks || []).forEach((block) => {
        if (!block || !block.id) {
          return;
        }
        if (block.kind === "layout") {
          state.layoutBlocksById[block.id] = block;
        } else {
          state.componentsById[block.id] = block;
        }
      });
    });
  }

  // === CRIACAO DE NOS (LINHAS, COLUNAS, COMPONENTES) ===
  // createRow: cria uma linha com colunas de tamanhos definidos por spans[].
  // createComponent: cria um componente a partir do tipo e da definicao em components.json.
  // syncFieldListRows: mantém as colunas de cada linha do FieldList sincronizadas
  //   com as colunas declaradas nas props do componente.
  function createRow(spans, componentGroups) {
    return {
      id: uid("row"),
      type: "row",
      props: {
        label: "Secao"
      },
      columns: spans.map((span, index) => ({
        id: uid("col"),
        type: "column",
        props: {
          span
        },
        children: componentGroups && componentGroups[index] ? componentGroups[index] : []
      }))
    };
  }

  function createRowByCount(count) {
    return createRow(distributeColumnSpans(count));
  }

  function createFieldListRow(component) {
    const columns = getFieldListColumns(component);
    const row = createRow(distributeColumnSpans(columns.length));
    if (component && component.props) {
      row.props.cssClass = component.props.rowCssClass || "fieldlist-row";
    } else {
      row.props.cssClass = "fieldlist-row";
    }
    return row;
  }

  function getFieldListColumns(component) {
    let props;
    if (component && component.props) {
      props = component.props;
    } else {
      props = {};
    }
    return ensureTableColumns(parseTableColumns(props.columns));
  }

  function syncFieldListRows(component, action, changedIndex) {
    if (!isFieldListComponent(component)) {
      return;
    }
    const columns = getFieldListColumns(component);
    const rows = getRowContainerRows(component) || component.rows || [];
    rows.forEach((row) => {
      if (action === "add") {
        const insertAt = Math.max(0, Math.min(Number(changedIndex), row.columns.length));
        row.columns.splice(insertAt, 0, createFieldListColumn(columns.length));
      }
      if (action === "remove" && row.columns.length) {
        const removeAt = Math.max(0, Math.min(Number(changedIndex), row.columns.length - 1));
        const removed = row.columns.splice(removeAt, 1)[0];
        if (!row.columns.length) {
          row.columns.push(createFieldListColumn(columns.length));
        }
        if (removed && removed.children && removed.children.length) {
          const target = row.columns[Math.min(removeAt, row.columns.length - 1)];
          target.children.push(...removed.children);
        }
      }
      syncSingleFieldListRow(row, columns);
    });
  }

  function syncSingleFieldListRow(row, columns) {
    let safeColumns;
    if (Array.isArray(columns) && columns.length) {
      safeColumns = columns;
    } else {
      safeColumns = [{ label: "Coluna 1" }];
    }
    if (Array.isArray(row.columns)) {
      row.columns = row.columns;
    } else {
      row.columns = [];
    }
    while (row.columns.length < safeColumns.length) {
      row.columns.push(createFieldListColumn(safeColumns.length));
    }
    if (row.columns.length > safeColumns.length) {
      const removed = row.columns.splice(safeColumns.length);
      const target = row.columns[row.columns.length - 1];
      removed.forEach((column) => {
        if (target && Array.isArray(column.children)) {
          target.children.push(...column.children);
        }
      });
    }
    const spans = distributeColumnSpans(safeColumns.length);
    row.columns.forEach((column, index) => {
      column.id = column.id || uid("col");
      column.type = "column";
      column.props = column.props || {};
      column.props.span = spans[index];
      if (Array.isArray(column.children)) {
        column.children = column.children;
      } else {
        column.children = [];
      }
    });
    return row;
  }

  function createFieldListColumn(columnCount) {
    return {
      id: uid("col"),
      type: "column",
      props: { span: distributeColumnSpans(columnCount)[0] },
      children: []
    };
  }

  function distributeColumnSpans(count) {
    const safeCount = Math.max(1, Math.min(12, Number(count) || 1));
    const base = Math.floor(12 / safeCount);
    let remainder = 12 - base * safeCount;

    return Array.from({ length: safeCount }, () => {
      const span = base + (remainder > 0 ? 1 : 0);
      remainder -= 1;
      return span;
    });
  }

  // Padrao de botao por pagina (properties da pagina, secao "Padrao de botoes"): se o dev
  // preencher, todo componente-botao NOVO (arrastado da paleta) ja nasce com esses valores —
  // so afeta criacao, nunca botoes ja existentes no canvas. Mapa por kind porque cada um usa
  // nomes de prop diferentes pro botao principal (button/link vs. o gatilho de dropdown/modal).
  const BUTTON_KIND_PROP_MAP = {
    button: { variant: "variant", outline: "outline", size: "size", iconColor: "iconColor" },
    link: { variant: "variant", outline: "outline", size: "size", iconColor: "iconColor" },
    buttonDropdown: { variant: "buttonVariant", outline: "buttonOutline", size: "buttonSize", iconColor: "buttonIconColor" },
    modal: { variant: "triggerVariant", outline: "triggerOutline", size: "triggerSize", iconColor: "triggerIconColor" }
  };

  function getPageButtonDefaultOverrides(kind) {
    const map = BUTTON_KIND_PROP_MAP[kind];
    if (!map) {
      return {};
    }
    const pageProps = (state.page && state.page.props) || {};
    const overrides = {};
    if (pageProps.buttonDefaultVariant) overrides[map.variant] = pageProps.buttonDefaultVariant;
    if (pageProps.buttonDefaultOutline) overrides[map.outline] = toBooleanValue(pageProps.buttonDefaultOutline);
    if (pageProps.buttonDefaultSize) overrides[map.size] = pageProps.buttonDefaultSize;
    if (pageProps.buttonDefaultIconColor) overrides[map.iconColor] = pageProps.buttonDefaultIconColor;
    return overrides;
  }

  function createComponent(type, overrides) {
    const definition = getComponentDefinition(type);

    const component = {
      id: uid(type),
      type,
      props: Object.assign({}, deepClone(definition.defaults || {}), getPageButtonDefaultOverrides(definition.kind), overrides || {})
    };
    applyGeneratedComponentProps(component, definition, false);
    normalizeStructuredComponentProps(component, definition);

    const containerConfig = getRowContainerConfig(definition);
    if (containerConfig) {
      getRowContainerZoneConfigs(definition).forEach((zone) => {
        component[zone.storage] = [];
      });
    }
    if (definition.kind === "fieldList") {
      component.rows = [createFieldListRow(component)];
    }

    return component;
  }

  function createBlock(type) {
    const layoutBlock = state.layoutBlocksById[type];
    if (layoutBlock) {
      if (layoutBlock.customCount) {
        const row = createRowByCount(layoutBlock.customCount);
        row.props.label = layoutBlock.label || "Colunas custom";
        return row;
      }
      return createRow(layoutBlock.spans || [12]);
    }

    return createComponent(type);
  }

  // === PALETA DE COMPONENTES ===
  // Constroi o HTML da lista de grupos/blocos no painel esquerdo.
  // bindPalette vincula o dragstart de cada item da paleta.
  function renderPalette() {
    els.paletteGroups.innerHTML = "";
    (state.componentRegistry.groups || []).forEach((group) => {
      const section = document.createElement("section");
      section.className = "palette-group";
      section.dataset.paletteGroup = "";

      const title = document.createElement("h2");
      title.textContent = group.label || group.id || "Componentes";
      section.appendChild(title);

      (group.blocks || []).forEach((block) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "palette-item";
        button.draggable = true;
        button.dataset.blockType = block.id;

        const icon = document.createElement("span");
        icon.className = block.icon || "block-icon";

        const textWrap = document.createElement("span");
        textWrap.className = "palette-item-text";

        const label = document.createElement("span");
        label.className = "palette-item-label";
        label.textContent = block.label || block.id;
        textWrap.appendChild(label);

        if (block.description) {
          const desc = document.createElement("span");
          desc.className = "palette-item-desc";
          desc.textContent = block.description;
          textWrap.appendChild(desc);
        }

        button.appendChild(icon);
        button.appendChild(textWrap);
        section.appendChild(button);
      });

      els.paletteGroups.appendChild(section);
    });
  }

  function bindPalette() {
    document.querySelectorAll(".palette-item").forEach((item) => {
      item.addEventListener("dragstart", (event) => {
        const type = item.dataset.blockType;
        state.drag = { source: "palette", type };
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("text/plain", JSON.stringify(state.drag));
      });

      item.addEventListener("dragend", clearDragState);
    });
  }

  function bindCanvas() {
    window.TemplateBuilderDragDrop.bindCanvas(getDragDropContext());
  }

  function getDragDropContext() {
    return {
      clearDragState,
      clearDropHighlights,
      commitHistory,
      createBlock,
      createRow,
      els,
      findColumn,
      findComponentLocation,
      findNode,
      findRowLocation,
      getAllRowContainerRows,
      getComponentDefinition,
      getComponentDropIndex,
      getContainerRowDropIndex,
      getContainerRows,
      getElementSection,
      getRowContainerZoneConfig,
      getRowDropIndex,
      getSurfaceSection,
      handleInlineAction,
      insertContainerRowAt,
      insertRowAt,
      isDraggingIntoOwnNode,
      removeComponent,
      removeRow,
      render,
      selectNode,
      state
    };
  }

  // === EVENTOS DE INTERFACE ===
  // bindToolbar: botoes Salvar, Carregar, JSON, HTML, Preview, Undo, Redo.
  // bindProperties: delega para properties.js via getPropertiesContext().
  // bindSearch: filtra itens da paleta em tempo real.
  // bindDevices: alterna classes desktop/tablet/mobile no canvas.
  function bindToolbar() {
    document.querySelector(".toolbar").addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) {
        return;
      }

      const action = button.dataset.action;

      if (action === "save") {
        saveToStorage();
        toast("Salvo no navegador");
      }

      if (action === "load") {
        loadFromStorage();
      }

      if (action === "clear") {
        if (window.confirm("Limpar a pagina inteira? Conteudo, cabecalho, rodape, menus (navbar/sidebar) e configuracoes da pagina (nome, layout, tema, login...) serao apagados.")) {
          state.page = createEmptyPage();
          state.selectedId = null;
          state.selectedSection = null;
          commitHistory();
          render();
        }
      }

      if (action === "import-json") {
        els.importJsonFile.click();
      }

      if (action === "export-json") {
        openOutput("JSON", JSON.stringify(state.page, null, 2), "json");
      }

      if (action === "export-html") {
        openOutput("HTML", exportHtmlDocument(), "html");
      }

      if (action === "preview") {
        togglePreview();
      }

      if (action === "undo") {
        undo();
      }

      if (action === "redo") {
        redo();
      }
    });

    document.querySelector(".canvas-toolbar").addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      if (button.dataset.action === "page-settings") {
        const alreadySelected = state.selectedId === state.page.id && state.selectedSection === null;
        if (alreadySelected) {
          state.selectedId = null;
          state.selectedSection = null;
          render();
        } else {
          selectNode(state.page.id);
        }
      }
    });

    document.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]");
      if (!action) {
        return;
      }

      if (action.dataset.action === "copy-output") {
        copyOutput();
      }

      if (action.dataset.action === "download-output") {
        downloadOutput();
      }
    });

    els.pageName.addEventListener("input", () => {
      state.page.name = els.pageName.value;
      state.page.props.title = els.pageName.value;
      const titleField = els.propertiesForm.querySelector('[data-prop="title"]');
      if (titleField && document.activeElement !== titleField) {
        titleField.value = els.pageName.value;
      }
      debounceHistory();
    });

    els.importJsonFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) { return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          state.page = normalizePage(parsed);
          state.selectedId = null;
          state.selectedSection = null;
          commitHistory();
          render();
          toast("Pagina importada");
        } catch (_) {
          toast("JSON invalido");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });
  }

  function bindProperties() {
    window.TemplateBuilderProperties.bind(getPropertiesContext());
    els.propertiesForm.addEventListener("change", (event) => {
      // Pattern-picker: preenche o campo de expressao de validacao com o template escolhido
      if (event.target.classList.contains("pattern-picker-select") && event.target.value) {
        const targetProp = event.target.dataset.patternProp || "pattern";
        const target = els.propertiesForm.querySelector(`[data-prop="${targetProp}"]`);
        if (target) {
          target.value = event.target.value;
          target.dispatchEvent(new Event("input", { bubbles: true }));
        }
        event.target.value = "";
        return;
      }
      // Ajax-preset: aplica um template de API pronto ao botao (URL + metodo + mapeamentos)
      // diretamente no modelo do repeater "buttons", e re-renderiza.
      if (event.target.classList.contains("ajax-preset-select") && event.target.value) {
        applyAjaxPreset(Number(event.target.dataset.presetIndex), event.target.value);
        event.target.value = "";
        return;
      }
      // Biblioteca de icone (Tabler/Lineicons/Font Awesome): troca a lib do campo de
      // icone irmao (data-icon-name-target aponta o id dele) e reseta o nome — ele
      // quase certamente nao existe com esse nome na biblioteca nova. O "input"
      // sintetico deixa o dispatch generico (core/properties.js) gravar o valor
      // combinado em node.props (funciona igual para campo simples/repeater/
      // subrepeater, pois o campo de nome ja carrega os data-* corretos). O
      // re-render completo troca a fonte de busca do TomSelect para a lib nova.
      if (event.target.classList.contains("icon-lib-select")) {
        const targetId = event.target.dataset.iconNameTarget;
        const nameField = targetId ? document.getElementById(targetId) : null;
        if (nameField) {
          nameField.value = buildIconValue(event.target.value, "");
          nameField.dispatchEvent(new Event("input", { bubbles: true }));
          render();
          commitHistory();
        }
        return;
      }
      // Re-render completo quando props de menu mudam (para mostrar/ocultar campos condicionais)
      const field = event.target.closest("[data-prop]");
      if (field && ["menuLayout", "menuPosition", "menuTheme", "menuSidebarWidth"].includes(field.dataset.prop)) {
        render();
        commitHistory();
      }
    });
  }

  function getPropertiesContext() {
    return {
      applyKeyValueAction,
      applyMatrixAction,
      applyRepeaterAction,
      applyRepeaterKeyValueAction,
      applySubRepeaterAction,
      commitHistory,
      debounceHistory,
      duplicateSelected,
      els,
      findColumn,
      findNode,
      generateFormAjaxCode,
      getColumnClass,
      getComponentClass,
      hasOwn,
      initializePreviewComponents,
      propControlsVisibility,
      removeSelected,
      render,
      renderCanvas,
      renderPageFooter,
      renderPageHeader,
      renderPageNavbar,
      renderPageSidebar,
      renderSummary,
      setRowColumnCount,
      state,
      updateKeyValueProperty,
      updateMatrixProperty,
      updateRepeaterKeyValueProperty,
      updateRepeaterProperty,
      updateSubRepeaterProperty
    };
  }

  function bindSearch() {
    els.search.addEventListener("input", () => {
      const query = els.search.value.trim().toLowerCase();
      document.querySelectorAll("[data-palette-group]").forEach((group) => {
        let visible = false;
        group.querySelectorAll(".palette-item").forEach((item) => {
          const match = item.textContent.toLowerCase().includes(query);
          item.hidden = query && !match;
          visible = visible || !item.hidden;
        });
        group.hidden = !visible;
      });
    });
  }

  function bindDevices() {
    const segmented = document.querySelector(".segmented-control");
    if (!segmented) return;
    segmented.addEventListener("click", (event) => {
      const button = event.target.closest("[data-device]");
      if (!button) {
        return;
      }

      document.querySelectorAll("[data-device]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      els.canvas.classList.remove("desktop", "tablet", "mobile");
      els.canvas.classList.add(button.dataset.device);
    });
  }

  // === NAVEGACAO NO ESTADO ===
  // Funcoes que mapeiam secao/elemento DOM para arrays de linhas no state,
  // e calculam indices de insercao durante o drop.
  function getSectionRows(section) {
    if (section === "navbar") {
      return state.page.navbar;
    }
    if (section === "sidebar") {
      return state.page.sidebar;
    }
    if (section === "header") {
      return state.page.header;
    }
    if (section === "footer") {
      return state.page.footer;
    }
    return state.page.children;
  }

  function getSectionElement(section) {
    if (section === "navbar") {
      return els.pageNavbar;
    }
    if (section === "sidebar") {
      return els.pageSidebar;
    }
    if (section === "header") {
      return els.pageHeader;
    }
    if (section === "footer") {
      return els.pageFooter;
    }
    return els.canvas;
  }

  function getElementSection(element) {
    const sectionNode = element.closest('[data-section="navbar"], [data-section="sidebar"], [data-section="header"], [data-section="page"], [data-section="footer"]');
    if (sectionNode) {
      return sectionNode.dataset.section;
    } else {
      return null;
    }
  }

  function getContainerRows(cardId, zoneId) {
    const card = findNode(cardId);
    return getRowContainerRows(card, zoneId);
  }

  function getRowDropIndex(section, clientY) {
    const sectionEl = getSectionElement(section);
    const rows = Array.from(sectionEl.querySelectorAll(':scope [data-row-id][data-section="' + section + '"]'));
    const targetIndex = rows.findIndex((row) => {
      const rect = row.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    });
    if (targetIndex === -1) {
      return getSectionRows(section).length;
    } else {
      return targetIndex;
    }
  }

  function getContainerRowDropIndex(target, clientY) {
    const body = target.closest("[data-row-container]");
    if (!body) {
      return 0;
    }

    const rows = Array.from(body.querySelectorAll(':scope > [data-row-id][data-section="row-container"]'));
    const targetIndex = rows.findIndex((row) => {
      const rect = row.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    });
    const cardRows = getContainerRows(body.dataset.cardId, body.dataset.cardZone) || [];
    if (targetIndex === -1) {
      return cardRows.length;
    } else {
      return targetIndex;
    }
  }

  function getComponentDropIndex(columnEl, clientY) {
    const components = Array.from(columnEl.querySelectorAll(":scope > [data-component-id]"));
    const targetIndex = components.findIndex((component) => {
      const rect = component.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    });
    if (targetIndex === -1) {
      return components.length;
    } else {
      return targetIndex;
    }
  }

  function insertContainerRowAt(row, index, cardId, zoneId) {
    const rows = getContainerRows(cardId, zoneId);
    if (!rows) {
      return;
    }
    const container = findNode(cardId);
    if (isFieldListComponent(container)) {
      syncSingleFieldListRow(row, getFieldListColumns(container));
    }
    const safeIndex = Math.max(0, Math.min(index, rows.length));
    rows.splice(safeIndex, 0, row);
  }

  function isDraggingIntoOwnNode(drag, target) {
    if (!drag || !target) {
      return false;
    }

    if (drag.source === "canvas-component") {
      return Boolean(findClosestDatasetNode(target, "componentId", drag.id));
    }

    if (drag.source === "canvas-row") {
      return Boolean(findClosestDatasetNode(target, "rowId", drag.id));
    }

    return false;
  }

  function findClosestDatasetNode(target, key, value) {
    let node = target;
    while (node && node !== document) {
      if (node.dataset && node.dataset[key] === value) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  // === DRAG AND DROP — ACOES POS-DROP ===
  // A logica de eventos (dragover, drop) fica em drag-drop.js.
  // Aqui ficam as acoes que o drop dispara: limpar highlights, selecionar no,
  // tratar o botao inline de adicionar linha no FieldList.
  function clearDragState() {
    state.drag = null;
    clearDropHighlights();
  }

  function clearDropHighlights() {
    document.querySelectorAll(".drop-zone-active").forEach((node) => {
      node.classList.remove("drop-zone-active");
    });
  }

  function handleInlineAction(button) {
    const action = button.dataset.action;
    const node = button.closest("[data-component-id], [data-row-id]");
    let id;
    if (node) {
      id = node.dataset.componentId || node.dataset.rowId;
    } else {
      id = null;
    }

    if (action === "fieldlist-add-row" && id) {
      if (state.preview) {
        return;
      }
      const component = findNode(id);
      if (isFieldListComponent(component)) {
        component.rows.push(createFieldListRow(component));
        state.selectedId = component.id;
        commitHistory();
        render();
      }
      return;
    }

    if (action === "select" && id) {
      selectNode(id);
      return;
    }

    if (id) {
      state.selectedId = id;
    }

    if (action === "duplicate") {
      duplicateSelected();
    }

    if (action === "remove") {
      removeSelected();
    }
  }

  function getSurfaceSection(surface) {
    if (surface === els.pageNavbar) {
      return "navbar";
    }
    if (surface === els.pageSidebar) {
      return "sidebar";
    }
    if (surface === els.pageHeader) {
      return "header";
    }
    if (surface === els.pageFooter) {
      return "footer";
    }
    return null;
  }

  // === SELECAO, DUPLICAR E REMOVER ===
  // selectNode: define selectedId e re-renderiza para mostrar o no selecionado.
  // duplicateSelected: clona o no selecionado e insere logo abaixo, remapeando IDs.
  // removeSelected: remove o no selecionado do state e re-renderiza.
  function selectNode(id, section) {
    state.selectedId = id;
    state.selectedSection = section || null;
    render();
  }

  function duplicateSelected() {
    if (!state.selectedId) {
      return;
    }

    const rowLocation = findRowLocation(state.selectedId);
    if (rowLocation) {
      const clone = deepClone(rowLocation.row);
      remapIds(clone);
      rowLocation.rows.splice(rowLocation.index + 1, 0, clone);
      state.selectedId = clone.id;
      commitHistory();
      render();
      return;
    }

    const location = findComponentLocation(state.selectedId);
    if (!location) {
      return;
    }

    const clone = deepClone(location.component);
    remapIds(clone);
    location.column.children.splice(location.index + 1, 0, clone);
    state.selectedId = clone.id;
    commitHistory();
    render();
  }

  function removeSelected() {
    if (!state.selectedId) {
      return;
    }

    if (removeRow(state.selectedId) || removeComponent(state.selectedId)) {
      state.selectedId = null;
      state.selectedSection = null;
      commitHistory();
      render();
    }
  }

  function insertRowAt(row, index, section) {
    const rows = getSectionRows(section || "page");
    const safeIndex = Math.max(0, Math.min(index, rows.length));
    rows.splice(safeIndex, 0, row);
  }

  function removeRow(id) {
    const location = findRowLocation(id);
    if (!location) {
      return null;
    }
    return location.rows.splice(location.index, 1)[0];
  }

  function removeComponent(id) {
    const location = findComponentLocation(id);
    if (!location) {
      return null;
    }
    return location.column.children.splice(location.index, 1)[0];
  }

  // === BUSCA DE NOS NO STATE ===
  // findNode: percorre toda a arvore (header + children + footer) por id.
  // findComponentLocation: retorna { row, column, index, component }.
  // findRowLocation: retorna { section, rows, index, row }.
  // getAllRows: lista plana de todas as linhas (incluindo linhas dentro de containers).
  function findNode(id) {
    if (!id) {
      return null;
    }

    if (id === state.page.id) {
      return state.page;
    }

    for (const row of getAllRows()) {
      if (row.id === id) {
        return row;
      }

      for (const column of row.columns) {
        if (column.id === id) {
          return column;
        }

        for (const component of column.children) {
          if (component.id === id) {
            return component;
          }
        }
      }
    }

    return null;
  }

  function findColumn(id) {
    for (const row of getAllRows()) {
      const column = row.columns.find((item) => item.id === id);
      if (column) {
        return column;
      }
    }
    return null;
  }

  function findComponentLocation(id) {
    for (const row of getAllRows()) {
      for (const column of row.columns) {
        const index = column.children.findIndex((component) => component.id === id);
        if (index > -1) {
          return {
            row,
            column,
            index,
            component: column.children[index]
          };
        }
      }
    }
    return null;
  }

  function findRowLocation(id) {
    for (const section of ["navbar", "sidebar", "header", "page", "footer"]) {
      const rows = getSectionRows(section);
      const location = findRowLocationInRows(id, rows, section);
      if (location) {
        return location;
      }
    }
    return null;
  }

  function findRowLocationInRows(id, rows, section) {
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (row.id === id) {
        return {
          section,
          rows,
          index,
          row
        };
      }

      for (const column of row.columns || []) {
        for (const component of column.children || []) {
          for (const containerRows of getAllRowContainerRows(component)) {
            const location = findRowLocationInRows(id, containerRows, "row-container");
            if (location) {
              location.card = location.card || component;
              return location;
            }
          }
        }
      }
    }
    return null;
  }

  function getAllRows() {
    return collectRows([...state.page.navbar, ...state.page.sidebar, ...state.page.header, ...state.page.children, ...state.page.footer], []);
  }

  function collectExportComponents() {
    const components = [];
    getAllRows().forEach((row) => {
      (row.columns || []).forEach((column) => {
        (column.children || []).forEach((component) => {
          components.push(component);
        });
      });
    });
    return components;
  }

  function collectRows(rows, bucket) {
    rows.forEach((row) => {
      bucket.push(row);
      (row.columns || []).forEach((column) => {
        (column.children || []).forEach((component) => {
          getAllRowContainerRows(component).forEach((containerRows) => {
            collectRows(containerRows, bucket);
          });
        });
      });
    });
    return bucket;
  }

  function setRowColumnCount(row, count) {
    const safeCount = Math.max(1, Math.min(12, Number(count) || 1));
    let columns;
    if (Array.isArray(row.columns)) {
      columns = row.columns;
    } else {
      columns = [];
    }

    while (columns.length < safeCount) {
      columns.push({
        id: uid("col"),
        type: "column",
        props: { span: 12 },
        children: []
      });
    }

    if (columns.length > safeCount) {
      const removed = columns.splice(safeCount);
      const target = columns[columns.length - 1];
      removed.forEach((column) => {
        target.children.push(...(column.children || []));
      });
    }

    const spans = distributeColumnSpans(safeCount);
    columns.forEach((column, index) => {
      column.props = column.props || {};
      column.props.span = spans[index];
    });

    row.columns = columns;
  }

  // === RENDERIZACAO DO CANVAS ===
  // render(): ponto central de atualizacao visual — chama todas as sub-renders.
  // initializePreviewComponents(): carrega scripts de bibliotecas externas
  //   (ApexCharts, Litepicker) de forma dinamica e inicializa os componentes no canvas.
  //   Os guards _apexChart / _templateBuilderLitepicker evitam dupla inicializacao.
  function applyLoginCanvasMode() {
    const pageType = state.page.props.pageType || "normal";
    const wrapper = els.pageBodyWrapper;
    if (!wrapper) return;
    if (pageType !== "normal") {
      wrapper.dataset.pageType = pageType;
    } else {
      delete wrapper.dataset.pageType;
    }
    if (pageType === "login-split") {
      const color = state.page.props.loginSideColor || "#206bc4";
      const img = state.page.props.loginSideImage || "";
      wrapper.style.setProperty("--login-side-color", color);
      wrapper.style.setProperty("--login-side-image", img ? `url("${img}")` : "none");
    } else {
      wrapper.style.removeProperty("--login-side-color");
      wrapper.style.removeProperty("--login-side-image");
    }
  }

  function render() {
    renderPageNavbar();
    renderPageSidebar();
    applyLoginCanvasMode();
    renderPageHeader();
    renderCanvas();
    renderPageFooter();
    renderProperties();
    renderSummary();
    initializePreviewComponents();
    initializePreviewPasswordToggles();
    const pageSelected = state.selectedId === state.page.id && state.selectedSection === null;
    if (els.pageSettingsBtn) {
      els.pageSettingsBtn.classList.toggle("active", pageSelected);
    }
  }

  // === RENDERIZACAO DAS SECOES DA PAGINA ===
  // Cada secao (header, canvas/body, footer) tem sua funcao de render.
  // renderRow: cria o elemento DOM de uma linha com suas colunas e componentes.

  function renderPageNavbar() {
    if ((state.page.props.pageType || "normal") !== "normal") {
      els.pageNavbar.className = "editor-page-navbar hidden";
      els.pageNavbar.removeAttribute("data-drop-zone");
      els.pageNavbar.removeAttribute("data-section");
      els.pageNavbar.innerHTML = "";
      return;
    }
    const menuLayout = state.page.props.menuLayout || "none";
    const isRail = menuLayout === "combo-pill" || menuLayout === "module-rail";
    const showNavbar = menuLayout === "horizontal" || menuLayout === "combo" || isRail;
    const theme = state.page.props.menuTheme || "dark";
    const sticky = toBooleanValue(state.page.props.menuSticky);

    if (!showNavbar) {
      els.pageNavbar.classList.add("hidden");
      els.pageNavbar.removeAttribute("data-drop-zone");
      els.pageNavbar.removeAttribute("data-section");
      els.pageNavbar.innerHTML = "";
      return;
    }

    const selected = (state.selectedId === state.page.id && state.selectedSection === "navbar") ? " selected" : "";
    const empty = state.page.navbar.length ? "" : " is-empty";
    const themeClass = theme === "dark" ? " navbar-theme-dark" : (theme === "primary" || theme === "custom") ? " navbar-theme-color" : "";
    const stickyClass = sticky && !isRail ? " navbar-sticky" : "";
    const pillClass = isRail ? " navbar-pill" : "";
    const pillFullClass = (menuLayout === "combo-pill" && state.page.props.menuPillNavbarStyle === "full") ? " navbar-pill-full" : "";
    const railFlatClass = menuLayout === "module-rail" ? " navbar-rail-flat" : "";

    els.pageNavbar.className = `editor-page-navbar${selected}${empty}${themeClass}${stickyClass}${pillClass}${pillFullClass}${railFlatClass}`;
    if (theme === "primary") {
      els.pageNavbar.style.setProperty("--menu-theme-bg", "var(--accent)");
    } else if (theme === "custom") {
      els.pageNavbar.style.setProperty("--menu-theme-bg", state.page.props.menuThemeColor || "#206bc4");
    } else {
      els.pageNavbar.style.removeProperty("--menu-theme-bg");
    }
    els.pageNavbar.dataset.dropZone = "navbar";
    els.pageNavbar.dataset.section = "navbar";
    els.pageNavbar.innerHTML = "";

    const container = document.createElement("div");
    container.className = "container-xl";

    if (!state.page.navbar.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "empty-canvas empty-navbar";
      placeholder.textContent = "Navbar vazio — arraste itens de menu aqui";
      container.appendChild(placeholder);
    } else {
      state.page.navbar.forEach((row) => {
        container.appendChild(renderRow(row, "navbar"));
      });
    }

    els.pageNavbar.appendChild(container);
  }

  function renderPageSidebar() {
    if ((state.page.props.pageType || "normal") !== "normal") {
      els.pageSidebar.className = "editor-page-sidebar hidden";
      els.pageSidebar.removeAttribute("data-drop-zone");
      els.pageSidebar.removeAttribute("data-section");
      els.pageSidebar.innerHTML = "";
      if (els.pageBodyWrapper) els.pageBodyWrapper.classList.remove("sidebar-right");
      return;
    }
    const menuLayout = state.page.props.menuLayout || "none";
    const isRail = menuLayout === "combo-pill" || menuLayout === "module-rail";
    const showSidebar = menuLayout === "vertical" || menuLayout === "combo" || isRail;
    const position = state.page.props.menuPosition || "left";
    const theme = state.page.props.menuTheme || "dark";
    const sidebarWidth = state.page.props.menuSidebarWidth || "normal";
    if (els.pageBodyWrapper) {
      els.pageBodyWrapper.classList.toggle("layout-module-rail", menuLayout === "module-rail");
    }

    if (!showSidebar) {
      els.pageSidebar.classList.add("hidden");
      els.pageSidebar.removeAttribute("data-drop-zone");
      els.pageSidebar.removeAttribute("data-section");
      els.pageSidebar.innerHTML = "";
      if (els.pageBodyWrapper) {
        els.pageBodyWrapper.classList.remove("sidebar-right");
      }
      return;
    }

    if (!isRail && els.pageBodyWrapper) {
      if (position === "right") {
        els.pageBodyWrapper.classList.add("sidebar-right");
      } else {
        els.pageBodyWrapper.classList.remove("sidebar-right");
      }
    } else if (els.pageBodyWrapper) {
      els.pageBodyWrapper.classList.remove("sidebar-right");
    }

    const selected = (state.selectedId === state.page.id && state.selectedSection === "sidebar") ? " selected" : "";
    const empty = state.page.sidebar.length ? "" : " is-empty";
    const posClass = !isRail && position === "right" ? " sidebar-right" : "";
    const themeClass = theme === "dark" ? " sidebar-theme-dark" : (theme === "primary" || theme === "custom") ? " sidebar-theme-color" : "";
    const widthClass = isRail
      ? " sidebar-icon-mode"
      : sidebarWidth === "compact" ? " sidebar-compact" : sidebarWidth === "wide" ? " sidebar-wide" : "";
    const railFlatClass = menuLayout === "module-rail" ? " sidebar-rail-flat" : "";

    els.pageSidebar.className = `editor-page-sidebar${selected}${empty}${posClass}${themeClass}${widthClass}${railFlatClass}`;
    if (theme === "primary") {
      els.pageSidebar.style.setProperty("--menu-theme-bg", "var(--accent)");
    } else if (theme === "custom") {
      els.pageSidebar.style.setProperty("--menu-theme-bg", state.page.props.menuThemeColor || "#206bc4");
    } else {
      els.pageSidebar.style.removeProperty("--menu-theme-bg");
    }
    els.pageSidebar.dataset.dropZone = "sidebar";
    els.pageSidebar.dataset.section = "sidebar";
    els.pageSidebar.innerHTML = "";

    const container = document.createElement("div");
    container.className = "container-xl";

    if (!state.page.sidebar.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "empty-canvas empty-sidebar";
      placeholder.textContent = "Sidebar vazio — arraste itens de menu aqui";
      container.appendChild(placeholder);
    } else {
      state.page.sidebar.forEach((row) => {
        container.appendChild(renderRow(row, "sidebar"));
      });
    }

    els.pageSidebar.appendChild(container);
  }

  function renderPageHeader() {
    if ((state.page.props.pageType || "normal") !== "normal") {
      els.pageHeader.className = "editor-page-header page-header d-print-none hidden";
      els.pageHeader.removeAttribute("data-drop-zone");
      els.pageHeader.removeAttribute("data-section");
      els.pageHeader.innerHTML = "";
      return;
    }
    let selected;
    if (state.selectedId === state.page.id && state.selectedSection === "header") {
      selected = " selected";
    } else {
      selected = "";
    }
    let empty;
    if (state.page.header.length) {
      empty = "";
    } else {
      empty = " is-empty";
    }
    els.pageHeader.className = `editor-page-header page-header d-print-none${selected}${empty}`;
    els.pageHeader.dataset.dropZone = "header";
    els.pageHeader.dataset.section = "header";
    els.pageHeader.innerHTML = "";

    const container = document.createElement("div");
    container.className = "container-xl";

    if (!state.page.header.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "empty-canvas empty-header";
      placeholder.textContent = "Cabecalho vazio";
      container.appendChild(placeholder);
    } else {
      state.page.header.forEach((row) => {
        container.appendChild(renderRow(row, "header"));
      });
    }

    els.pageHeader.appendChild(container);
  }

  function renderPageFooter() {
    if ((state.page.props.pageType || "normal") !== "normal") {
      els.pageFooter.className = "editor-page-footer page-footer d-print-none hidden";
      els.pageFooter.removeAttribute("data-drop-zone");
      els.pageFooter.removeAttribute("data-section");
      els.pageFooter.innerHTML = "";
      return;
    }
    let selected;
    if (state.selectedId === state.page.id && state.selectedSection === "footer") {
      selected = " selected";
    } else {
      selected = "";
    }
    let empty;
    if (state.page.footer.length) {
      empty = "";
    } else {
      empty = " is-empty";
    }
    els.pageFooter.className = `editor-page-footer page-footer d-print-none${selected}${empty}`;
    els.pageFooter.dataset.dropZone = "footer";
    els.pageFooter.dataset.section = "footer";
    els.pageFooter.innerHTML = "";

    const container = document.createElement("div");
    container.className = "container-xl";

    if (!state.page.footer.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "empty-canvas empty-footer";
      placeholder.textContent = "Rodape vazio";
      container.appendChild(placeholder);
    } else {
      state.page.footer.forEach((row) => {
        container.appendChild(renderRow(row, "footer"));
      });
    }

    els.pageFooter.appendChild(container);
  }

  function renderCanvas() {
    els.canvas.innerHTML = "";
    els.canvas.dataset.dropZone = "page";
    els.canvas.dataset.section = "page";

    if (!state.page.children.length) {
      const empty = document.createElement("div");
      empty.className = "empty-canvas";
      empty.textContent = "Pagina vazia";
      els.canvas.appendChild(empty);
      return;
    }

    state.page.children.forEach((row) => {
      els.canvas.appendChild(renderRow(row, "page"));
    });
  }

  function renderRow(row, section, cardId, cardZone) {
    const rowEl = document.createElement("div");
    rowEl.className = "builder-row";
    rowEl.dataset.rowId = row.id;
    rowEl.dataset.dropZone = section || "page";
    rowEl.dataset.section = section || "page";
    if (cardId) {
      rowEl.dataset.cardId = cardId;
    }
    if (cardZone) {
      rowEl.dataset.cardZone = cardZone;
    }
    rowEl.draggable = true;
    if (state.selectedId === row.id) {
      rowEl.classList.add("selected");
    }

    rowEl.appendChild(createRowActions());

    row.columns.forEach((column) => {
      const colEl = document.createElement("div");
      colEl.className = "builder-column";
      colEl.dataset.columnId = column.id;
      colEl.dataset.dropZone = "column";
      colEl.dataset.section = section || "page";
      if (cardId) {
        colEl.dataset.cardId = cardId;
      }
      if (cardZone) {
        colEl.dataset.cardZone = cardZone;
      }
      colEl.style.setProperty("--span", column.props.span);
      column.children.forEach((component) => {
        colEl.appendChild(renderComponent(component));
      });
      rowEl.appendChild(colEl);
    });

    return rowEl;
  }

  function createRowActions() {
    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.innerHTML = [
      '<button type="button" class="mini-button row-grip" data-action="select" title="Selecionar" aria-label="Selecionar">&vellip;</button>',
      '<button type="button" class="mini-button" data-action="duplicate" title="Duplicar" aria-label="Duplicar">&#10697;</button>',
      '<button type="button" class="mini-button danger" data-action="remove" title="Remover" aria-label="Remover">&times;</button>'
    ].join("");
    return actions;
  }

  function createComponentActions() {
    const actions = document.createElement("div");
    actions.className = "component-actions";
    actions.innerHTML = [
      '<button type="button" class="mini-button" data-action="select" title="Selecionar" aria-label="Selecionar">&vellip;</button>',
      '<button type="button" class="mini-button" data-action="duplicate" title="Duplicar" aria-label="Duplicar">&#10697;</button>',
      '<button type="button" class="mini-button danger" data-action="remove" title="Remover" aria-label="Remover">&times;</button>'
    ].join("");
    return actions;
  }

  // === RENDERIZACAO DE COMPONENTES NO CANVAS ===
  // renderComponent: cria o wrapper .builder-component com acoes e preview.
  // Containers especiais (Form, CardCustom, FieldList) tem renders proprias
  // porque precisam de zonas arrastaveis internas.
  // Para os demais, usa renderComponentHtml via getComponentHtmlRenderer.
  function renderComponent(component) {
    const wrapper = document.createElement("div");
    wrapper.className = "builder-component";
    wrapper.dataset.componentId = component.id;
    wrapper.draggable = true;
    if (state.selectedId === component.id) {
      wrapper.classList.add("selected");
    }

    wrapper.appendChild(createComponentActions());

    const preview = document.createElement("div");
    preview.className = "component-preview";
    if (isCustomCardComponent(component)) {
      renderCustomCardComponent(component, preview);
    } else if (isFormContainerComponent(component)) {
      renderFormContainerComponent(component, preview);
    } else if (isFieldListComponent(component)) {
      renderFieldListComponent(component, preview);
    } else if (isModalContainerComponent(component)) {
      renderModalContainerComponent(component, preview);
    } else {
      const previewRenderer = getComponentPreviewRenderer(component);
      if (previewRenderer) {
        if (getComponentDefinition(component.type).kind === "hiddenInput") {
          wrapper.classList.add("hidden-input-component");
        }
        preview.innerHTML = previewRenderer(component, getRendererContext());
      } else {
        preview.innerHTML = renderComponentHtml(component);
      }
    }
    wrapper.appendChild(preview);

    return wrapper;
  }

  function renderCustomCardComponent(component, preview) {
    const props = component.props || {};
    const card = document.createElement("article");
    card.className = mergeClassNames(getComponentClass(component), "custom-card-builder") || "custom-card-builder";
    if (rowContainerHasZone(component, "header")) {
      card.appendChild(renderCustomCardZone(component, "header", mergeClassNames(props.headerCssClass || "card-header", "custom-card-header"), "Arraste componentes para o titulo"));
    }
    card.appendChild(renderCustomCardZone(component, "body", mergeClassNames(props.bodyCssClass || "card-body", "custom-card-body"), "Arraste componentes para o conteudo"));
    preview.appendChild(card);
  }

  function renderCustomCardZone(component, zoneId, cssClass, placeholderText) {
    const zone = document.createElement("div");
    const rows = getRowContainerRows(component, zoneId) || [];
    zone.className = cssClass;
    zone.dataset.dropZone = "row-container";
    zone.dataset.rowContainer = "true";
    zone.dataset.cardId = component.id;
    zone.dataset.cardZone = zoneId;

    if (!rows.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "empty-canvas empty-custom-card-zone";
      placeholder.textContent = placeholderText;
      zone.appendChild(placeholder);
      return zone;
    }

    rows.forEach((row) => {
      zone.appendChild(renderRow(row, "row-container", component.id, zoneId));
    });
    return zone;
  }

  function renderModalContainerComponent(component, preview) {
    const props = component.props || {};
    const wrapper = document.createElement("div");
    wrapper.className = "modal-builder-wrapper";

    if (toBooleanValue(props.showTrigger) !== false) {
      const triggerArea = document.createElement("div");
      triggerArea.className = "modal-builder-trigger";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = props.triggerCssClass || "btn btn-primary";
      btn.disabled = true;
      btn.textContent = props.triggerText || "Abrir modal";
      triggerArea.appendChild(btn);
      wrapper.appendChild(triggerArea);
    }

    const panel = document.createElement("div");
    panel.className = "modal-builder-panel";

    if (toBooleanValue(props.showStatus)) {
      const status = document.createElement("div");
      status.className = `modal-status bg-${escapeAttr(props.statusColor || "danger")}`;
      panel.appendChild(status);
    }

    if (toBooleanValue(props.showHeader) !== false) {
      const header = document.createElement("div");
      header.className = "modal-header";
      const titleEl = document.createElement("h5");
      titleEl.className = "modal-title";
      titleEl.textContent = props.title || "Titulo do modal";
      header.appendChild(titleEl);
      if ((props.backdropStyle || "blur") === "blur") {
        const badge = document.createElement("span");
        badge.className = "badge bg-blue-lt ms-2";
        badge.textContent = "blur";
        titleEl.appendChild(badge);
      }
      if (toBooleanValue(props.showClose) !== false) {
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "btn-close";
        closeBtn.disabled = true;
        header.appendChild(closeBtn);
      }
      panel.appendChild(header);
    }

    const body = document.createElement("div");
    body.className = mergeClassNames(props.bodyCssClass || "modal-body", "modal-builder-body");
    body.dataset.dropZone = "row-container";
    body.dataset.rowContainer = "true";
    body.dataset.cardId = component.id;

    const rows = getRowContainerRows(component) || [];
    if (!rows.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "empty-canvas empty-custom-card-zone";
      placeholder.textContent = "Arraste componentes para o corpo do modal";
      body.appendChild(placeholder);
    } else {
      rows.forEach((row) => {
        body.appendChild(renderRow(row, "row-container", component.id));
      });
    }
    panel.appendChild(body);

    if (toBooleanValue(props.showFooter) !== false) {
      const buttons = Array.isArray(props.footerButtons) && props.footerButtons.length
        ? props.footerButtons.filter(Boolean)
        : [{ text: "Fechar", cssClass: "btn me-auto" }, { text: "Confirmar", cssClass: "btn btn-primary" }];
      if (buttons.length) {
        const footer = document.createElement("div");
        footer.className = props.footerCssClass || "modal-footer";
        buttons.forEach((btn) => {
          const el = document.createElement("button");
          el.type = "button";
          el.className = btn.cssClass || "btn";
          el.textContent = btn.text || "Botao";
          el.disabled = true;
          footer.appendChild(el);
        });
        panel.appendChild(footer);
      }
    }

    wrapper.appendChild(panel);
    preview.appendChild(wrapper);
  }

  function renderFormContainerComponent(component, preview) {
    const props = component.props || {};
    const rows = getRowContainerRows(component) || [];
    const form = document.createElement("form");
    form.className = mergeClassNames(getComponentClass(component), "form-container-builder") || "form-container-builder";
    form.dataset.dropZone = "row-container";
    form.dataset.rowContainer = "true";
    form.dataset.cardId = component.id;
    form.addEventListener("submit", (event) => event.preventDefault());

    const formId = sanitizeElementId(props.formId, "");
    if (formId) {
      form.id = formId;
    }
    if (props.action) {
      form.action = props.action;
    }
    if (props.method) {
      form.method = getSafeFormMethod(props.method);
    }
    if (props.enctype) {
      form.enctype = getSafeFormEnctype(props.enctype);
    }
    if (props.target) {
      form.target = props.target;
    }
    if (props.autocomplete) {
      form.autocomplete = getSafeAutocomplete(props.autocomplete);
    }
    if (toBooleanValue(props.novalidate)) {
      form.noValidate = true;
    }

    if (!rows.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "empty-canvas empty-form-container";
      placeholder.textContent = "Arraste linhas, colunas ou campos para o formulario";
      form.appendChild(placeholder);
    } else {
      rows.forEach((row) => {
        form.appendChild(renderRow(row, "row-container", component.id));
      });
    }

    preview.appendChild(form);
  }

  function renderFieldListComponent(component, preview) {
    const props = component.props || {};
    const columns = getFieldListColumns(component);
    const rows = getRowContainerRows(component) || [];
    const card = document.createElement("article");
    card.className = mergeClassNames(getComponentClass(component), "fieldlist-builder") || "fieldlist-builder";
    if (props.cardId) {
      card.id = sanitizeElementId(props.cardId, "");
    }

    const position = props.addButtonPosition || "top";
    const showTopButton = position === "top" || position === "both";
    const showBottomButton = position === "bottom" || position === "both";
    const addButtonHtml = `<button type="button"${classAttr(props.addButtonCssClass || "btn btn-primary")} data-action="fieldlist-add-row">${renderButtonContent(props.addButtonText || "Adicionar linha", props.addButtonIcon, props.addButtonIconPosition, props.addButtonIconColor)}</button>`;

    const header = document.createElement("div");
    header.className = props.headerCssClass || "card-header";
    const heading = document.createElement("div");
    heading.innerHTML = [
      props.cardTitle ? `<h3 class="card-title">${escapeHtml(props.cardTitle)}</h3>` : "",
      props.description ? `<div class="text-secondary">${escapeHtml(props.description)}</div>` : ""
    ].join("");
    header.appendChild(heading);
    if (showTopButton) {
      const actions = document.createElement("div");
      actions.className = "card-actions";
      actions.innerHTML = addButtonHtml;
      header.appendChild(actions);
    }
    card.appendChild(header);

    const tableWrapper = document.createElement("div");
    tableWrapper.className = props.tableWrapperCssClass || "card-table table-responsive overflow-y-visible";
    const table = document.createElement("table");
    table.className = props.tableCssClass || "table card-table table-vcenter text-nowrap";
    if (props.tableId) {
      table.id = sanitizeElementId(props.tableId, "");
    }
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const controlsHead = document.createElement("th");
    controlsHead.className = "fieldlist-builder-controls-head";
    controlsHead.textContent = "Linha";
    headRow.appendChild(controlsHead);
    columns.forEach((column) => {
      const th = document.createElement("th");
      th.className = column.thClass || "";
      th.textContent = column.label;
      applyElementWidth(th, column.width);
      headRow.appendChild(th);
    });
    head.appendChild(headRow);
    table.appendChild(head);

    const body = document.createElement("tbody");
    if (props.tbodyId) {
      body.id = sanitizeElementId(props.tbodyId, "");
    }
    body.dataset.dropZone = "row-container";
    body.dataset.rowContainer = "true";
    body.dataset.cardId = component.id;
    body.dataset.cardZone = "default";

    if (!rows.length) {
      const emptyRow = document.createElement("tr");
      emptyRow.className = "fieldlist-builder-empty-row";
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = columns.length + 1;
      emptyCell.innerHTML = '<div class="fieldlist-empty-placeholder" data-action="fieldlist-placeholder">Arraste um componente para criar a primeira linha</div>';
      emptyRow.appendChild(emptyCell);
      body.appendChild(emptyRow);
    } else {
      rows.forEach((row) => {
        body.appendChild(renderFieldListBuilderRow(component, row, columns));
      });
    }

    table.appendChild(body);
    tableWrapper.appendChild(table);
    card.appendChild(tableWrapper);

    if (showBottomButton) {
      const footer = document.createElement("div");
      footer.className = "card-footer";
      footer.innerHTML = addButtonHtml;
      card.appendChild(footer);
    }

    preview.appendChild(card);
  }

  function renderFieldListBuilderRow(component, row, columns) {
    syncSingleFieldListRow(row, columns);
    const props = component.props || {};
    const tr = document.createElement("tr");
    tr.className = mergeClassNames(props.rowCssClass || "fieldlist-row", "fieldlist-builder-row");
    tr.dataset.rowId = row.id;
    tr.dataset.section = "row-container";
    tr.dataset.cardId = component.id;
    tr.draggable = true;
    if (state.selectedId === row.id) {
      tr.classList.add("selected");
    }

    const controls = document.createElement("td");
    controls.className = "fieldlist-builder-controls";
    const rowActions = createRowActions();
    rowActions.classList.add("fieldlist-row-actions");
    controls.appendChild(rowActions);
    tr.appendChild(controls);

    columns.forEach((columnDefinition, index) => {
      const column = row.columns[index];
      const td = document.createElement("td");
      td.className = mergeClassNames(columnDefinition.tdClass || "", "fieldlist-builder-cell");
      td.dataset.columnId = column.id;
      td.dataset.dropZone = "column";
      td.dataset.section = "row-container";
      td.dataset.cardId = component.id;
      td.dataset.cardZone = "default";
      applyElementWidth(td, columnDefinition.width);
      column.children.forEach((child) => td.appendChild(renderComponent(child)));
      if (!column.children.length) {
        const placeholder = document.createElement("span");
        placeholder.className = "fieldlist-cell-placeholder";
        placeholder.dataset.action = "fieldlist-placeholder";
        placeholder.textContent = "Arraste aqui";
        td.appendChild(placeholder);
      }
      tr.appendChild(td);
    });

    return tr;
  }

  function applyElementWidth(element, value) {
    const width = normalizeTableWidth(value);
    if (width) {
      element.style.width = width;
    }
  }

  // === MAPA DE RENDERERS HTML ===
  // componentHtmlRenderers: mapa { kind: funcao } dos renderers inline (ainda nao extraidos).
  // getRegisteredComponentHtmlRenderers: carrega os renderers externos de renderers/*.js.
  // getRendererContext: contexto passado a todos os renderers — expoe helpers e funcoes de builder.
  // Para adicionar um renderer externo: criar arquivo em renderers/ e chamar
  // window.TemplateBuilderRenderers.register({ meuKind: minhaFuncao }).
  const componentHtmlRenderers = getRegisteredComponentHtmlRenderers();
  const componentPreviewRenderers = getRegisteredComponentPreviewRenderers();

  function renderComponentHtml(component) {
    const definition = getComponentDefinition(component.type);
    const kind = definition.kind || component.type;
    const cssClassAttr = classAttr(getComponentClass(component));
    const renderer = getComponentHtmlRenderer(component, kind);

    if (!renderer) {
      return "";
    }

    return renderer(component, cssClassAttr, definition, getRendererContext());
  }

  function getRegisteredComponentHtmlRenderers() {
    const registry = window.TemplateBuilderRenderers;
    if (registry && typeof registry.getAll === "function") {
      return registry.getAll();
    } else {
      return {};
    }
  }

  function getRegisteredComponentPreviewRenderers() {
    const registry = window.TemplateBuilderRenderers;
    if (registry && typeof registry.getAllPreviews === "function") {
      return registry.getAllPreviews();
    } else {
      return {};
    }
  }

  function getComponentPreviewRenderer(component) {
    const definition = getComponentDefinition(component.type);
    const kind = definition.kind || component.type;
    return componentPreviewRenderers[kind] || null;
  }

  function getRendererContext() {
    return {
      attr,
      buildButtonClass,
      classAttr,
      escapeAttr,
      escapeHtml,
      fieldListActionAttr,
      getComponentClass,
      getComponentDefinition,
      getDataTableId,
      getFieldListColumns,
      getFieldListIndexStart,
      getRowContainerRows,
      getSafeButtonType,
      getValidationClass,
      idAttr,
      indent,
      mergeClassNames,
      normalizeKeyValueEntries,
      parseDropdownActions,
      parseTableColumns,
      parseTableRows,
      ensureTableColumns,
      applyFieldListIndexTemplates,
      renderButtonContent,
      renderComponentHtml,
      renderCustomAttributes,
      renderDropdownAction,
      renderFormLabel,
      renderHelpText,
      renderHiddenInputHtml,
      renderInputAttributes,
      renderRequiredMark,
      renderTablerIcon,
      renderValidationFeedback,
      sanitizeElementId,
      styleAttr,
      syncSingleFieldListRow,
      toBooleanValue,
      toPositiveInteger,
      getSafeTagName,
      parseListItems,
      parseBreadcrumbItems,
      sanitizeEditorHtml,
      parseOptions,
      renderSelectOption,
      parseChoiceItems,
      parseSelectGroupItems,
      parseButtonGroupItems,
      parsePaymentMethods,
      parseDropdownItems,
      renderDropdownItem,
      getTomSelectId,
      getDatePickerId
    };
  }

  function getComponentHtmlRenderer(component, kind) {
    if (isCustomCardComponent(component)) {
      return renderCustomCardHtml;
    }

    if (isFormContainerComponent(component)) {
      return renderFormContainerHtml;
    }

    if (isFieldListComponent(component)) {
      return componentHtmlRenderers.fieldList || null;
    }

    if (isModalContainerComponent(component)) {
      return renderModalContainerHtml;
    }

    return componentHtmlRenderers[kind] || null;
  }

  // === RENDERERS HTML INLINE ===
  // Estes renderers ainda nao foram extraidos para arquivos em renderers/.
  // Cada funcao recebe (component, cssClassAttr, definition, context) e
  // retorna uma string HTML. Consulte COMO_CRIAR_COMPONENTE.md para o padrao.
  function renderHiddenInputHtml(component) {
    const definition = getComponentDefinition(component.type);
    const renderer = componentHtmlRenderers.hiddenInput;
    if (renderer) {
      return renderer(component, classAttr(getComponentClass(component)), definition, getRendererContext());
    } else {
      return "";
    }
  }

  function renderHiddenInputPreview(component) {
    const renderer = getComponentPreviewRenderer(component);
    if (renderer) {
      return renderer(component, getRendererContext());
    } else {
      return "";
    }
  }

  function renderDropdownItem(item) {
    let idAttr;
    if (item.id) {
      idAttr = ` id="${escapeAttr(sanitizeElementId(item.id, ""))}"`;
    } else {
      idAttr = "";
    }
    return `<a href="${escapeAttr(item.href || "#")}"${classAttr(item.cssClass || "dropdown-item")}${idAttr}${fieldListActionAttr(item.fieldListAction)}${ajaxFillAttrs(item)}>${renderButtonContent(item.text || "Item", item.icon, item.iconPosition, item.iconColor)}</a>`;
  }

  function renderDropdownAction(action) {
    let idAttr;
    if (action.id) {
      idAttr = ` id="${escapeAttr(sanitizeElementId(action.id, ""))}"`;
    } else {
      idAttr = "";
    }
    const actionText = action.text || (action.icon ? "" : "Acao");
    const actionClass = buildButtonClass("btn", action.variant, action.outline, action.size, action.cssClass);
    if (action.type === "link") {
      return `<a href="${escapeAttr(action.href || "#")}"${classAttr(actionClass)}${idAttr}${fieldListActionAttr(action.fieldListAction)}${ajaxFillAttrs(action)}${geoFillAttrs(action)}>${renderButtonContent(actionText, action.icon, action.iconPosition, action.iconColor)}</a>`;
    }
    return `<button type="button"${classAttr(actionClass)}${idAttr}${fieldListActionAttr(action.fieldListAction)}${ajaxFillAttrs(action)}${geoFillAttrs(action)}>${renderButtonContent(actionText, action.icon, action.iconPosition, action.iconColor)}</button>`;
  }

  function renderSelectOption(option) {
    return `<option value="${escapeAttr(option.value)}"${option.selected ? " selected" : ""}${option.disabled ? " disabled" : ""}>${escapeHtml(option.label)}</option>`;
  }

  function renderFormContainerHtml(component, cssClassAttr) {
    const props = component.props || {};
    const rows = (getRowContainerRows(component) || []).map(exportRow).join("\n");
    const lines = [
      `<form${renderFormContainerAttributes(component, cssClassAttr)}>`,
      indent(rows, 2),
      "</form>"
    ];
    if (toBooleanValue(props.unsavedGuard)) {
      lines.push(renderUnsavedGuardModal(component, getUnsavedModalId(component)));
    }
    return lines.join("\n");
  }

  function getUnsavedModalId(component) {
    const props = component.props || {};
    const base = props.formId ? props.formId + "-unsaved" : "unsaved-" + component.id;
    return sanitizeElementId(base, "unsaved-guard");
  }

  // Modal Tabler de confirmacao para o guard de alteracoes nao salvas.
  // Textos, cores e icones vem das props (100% editaveis).
  function renderUnsavedGuardModal(component, modalId) {
    const props = component.props || {};
    const statusColor = escapeAttr(props.unsavedStatusColor || "warning");
    const title = escapeHtml(props.unsavedTitle || "Alteracoes nao salvas");
    const message = props.unsavedMessage || "Ha alteracoes que nao foram salvas. Deseja realmente sair sem salvar?";
    const cancelContent = renderButtonContent(props.unsavedCancelText || "Continuar editando", props.unsavedCancelIcon, "left", props.unsavedCancelIconColor);
    const confirmContent = renderButtonContent(props.unsavedConfirmText || "Sair sem salvar", props.unsavedConfirmIcon, "left", props.unsavedConfirmIconColor);
    const cancelCls = mergeClassNames(props.unsavedCancelCssClass || "btn", "w-100");
    const confirmCls = mergeClassNames(props.unsavedConfirmCssClass || "btn btn-danger", "w-100");
    return [
      `<div class="modal modal-blur fade" id="${escapeAttr(modalId)}" tabindex="-1" role="dialog" aria-hidden="true"${attr("data-unsaved-message", message)}>`,
      `  <div class="modal-dialog modal-sm modal-dialog-centered" role="document">`,
      `    <div class="modal-content">`,
      `      <div${classAttr("modal-status bg-" + statusColor)}></div>`,
      `      <div class="modal-body text-center py-4">`,
      `        <h3>${title}</h3>`,
      `        <div class="text-secondary">${escapeHtml(message)}</div>`,
      `      </div>`,
      `      <div class="modal-footer">`,
      `        <div class="w-100">`,
      `          <div class="row">`,
      `            <div class="col"><button type="button"${classAttr(cancelCls)} data-bs-dismiss="modal">${cancelContent}</button></div>`,
      `            <div class="col"><button type="button"${classAttr(confirmCls)} data-unsaved-confirm>${confirmContent}</button></div>`,
      `          </div>`,
      `        </div>`,
      `      </div>`,
      `    </div>`,
      `  </div>`,
      `</div>`
    ].join("\n");
  }

  function renderCustomCardHtml(component, cssClassAttr) {
    const props = component.props || {};
    const bodyRows = (getRowContainerRows(component, "body") || []).map(exportRow).join("\n");
    const parts = [`<article${cssClassAttr}>`];
    if (rowContainerHasZone(component, "header")) {
      const headerRows = (getRowContainerRows(component, "header") || []).map(exportRow).join("\n");
      parts.push(
        `  <header${classAttr(mergeClassNames(props.headerCssClass || "card-header", "custom-card-header-content"))}>`,
        indent(headerRows, 4),
        "  </header>"
      );
    }
    parts.push(
      `  <div${classAttr(props.bodyCssClass || "card-body")}>`,
      indent(bodyRows, 4),
      "  </div>",
      "</article>"
    );
    return parts.join("\n");
  }

  function renderModalContainerHtml(component) {
    const props = component.props || {};
    const modalId = sanitizeElementId(props.modalId, sanitizeElementId(component.id, "modal"));
    const parts = [];

    if (toBooleanValue(props.showTrigger) !== false) {
      const btnCss = props.triggerCssClass || "btn btn-primary";
      const text = escapeHtml(props.triggerText || "Abrir modal");
      parts.push(`<button type="button"${classAttr(btnCss)} data-bs-toggle="modal" data-bs-target="#${escapeAttr(modalId)}">${text}</button>`);
    }

    const modalBlur = (props.backdropStyle || "blur") === "blur" ? " modal-blur" : "";
    let dialogCls = "modal-dialog";
    if (props.size) dialogCls += " " + escapeAttr(props.size);
    if (toBooleanValue(props.centered)) dialogCls += " modal-dialog-centered";
    if (toBooleanValue(props.scrollable)) dialogCls += " modal-dialog-scrollable";
    const staticAttr = toBooleanValue(props.staticBackdrop) ? ' data-bs-backdrop="static"' : "";

    const showHeader = toBooleanValue(props.showHeader) !== false;
    const showClose = toBooleanValue(props.showClose) !== false;
    const innerParts = [];

    if (!showHeader && showClose) {
      innerParts.push(`<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>`);
    }

    if (toBooleanValue(props.showStatus)) {
      innerParts.push(`<div class="modal-status bg-${escapeAttr(props.statusColor || "danger")}"></div>`);
    }

    if (showHeader) {
      const title = escapeHtml(props.title || "Titulo do modal");
      const titleTag = ["h4", "h5", "h6"].includes(props.titleTag) ? props.titleTag : "h5";
      const closeBtn = showClose
        ? `\n  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>`
        : "";
      innerParts.push(`<div class="modal-header">\n  <${titleTag} class="modal-title">${title}</${titleTag}>${closeBtn}\n</div>`);
    }

    const rows = getRowContainerRows(component) || [];
    let bodyContent;
    if (rows.length) {
      bodyContent = indent(rows.map((row) => exportRow(row)).join("\n"), 2);
    } else {
      const text = escapeHtml(props.bodyContent || "").replace(/\r?\n/g, "<br>");
      bodyContent = `  ${text}`;
    }
    innerParts.push(`<div${classAttr(props.bodyCssClass || "modal-body")}>\n${bodyContent}\n</div>`);

    if (toBooleanValue(props.showFooter) !== false) {
      const buttons = Array.isArray(props.footerButtons) && props.footerButtons.length
        ? props.footerButtons.filter(Boolean)
        : [{ text: "Fechar", cssClass: "btn me-auto", dismiss: true }, { text: "Confirmar", cssClass: "btn btn-primary", dismiss: true }];
      if (buttons.length) {
        const footerLayout = props.footerLayout || "default";
        const footerCssClass = props.footerCssClass || "modal-footer";
        let btnHtml;
        if (footerLayout === "grid") {
          const cols = buttons.map((btn) => {
            const dismiss = toBooleanValue(btn.dismiss) ? ' data-bs-dismiss="modal"' : "";
            const href = btn.href || "";
            const txt = escapeHtml(btn.text || "Botao");
            const inner = href
              ? `<a href="${escapeAttr(href)}"${classAttr(btn.cssClass || "btn")}${dismiss}>${txt}</a>`
              : `<button type="button"${classAttr(btn.cssClass || "btn")}${dismiss}>${txt}</button>`;
            return `<div class="col">\n  ${inner}\n</div>`;
          }).join("\n");
          btnHtml = `<div class="w-100">\n<div class="row">\n${indent(cols, 2)}\n</div>\n</div>`;
        } else {
          btnHtml = buttons.map((btn) => {
            const dismiss = toBooleanValue(btn.dismiss) ? ' data-bs-dismiss="modal"' : "";
            const href = btn.href || "";
            const txt = escapeHtml(btn.text || "Botao");
            return href
              ? `<a href="${escapeAttr(href)}"${classAttr(btn.cssClass || "btn")}${dismiss}>${txt}</a>`
              : `<button type="button"${classAttr(btn.cssClass || "btn")}${dismiss}>${txt}</button>`;
          }).join("\n");
        }
        innerParts.push(`<div${classAttr(footerCssClass)}>\n${indent(btnHtml, 2)}\n</div>`);
      }
    }

    parts.push([
      `<div class="modal${modalBlur}"${attr("id", modalId)} tabindex="-1"${staticAttr}>`,
      `  <div class="${dialogCls}" role="document">`,
      `    <div class="modal-content">`,
      indent(innerParts.join("\n"), 6),
      `    </div>`,
      `  </div>`,
      `</div>`
    ].join("\n"));

    return parts.join("\n");
  }

  function renderFormContainerAttributes(component, cssClassAttr) {
    const props = component.props || {};
    const isAjaxForm = toBooleanValue(props.ajaxEnabled) && String(props.ajaxUrl || "").trim() !== "";

    // Form com Envio AJAX habilitado: NAO emite action/method/enctype/target.
    // O envio e feito pelo script jQuery gerado; se esses atributos ficassem no <form>,
    // qualquer submit que escapasse do handler faria um POST nativo recarregando a
    // pagina (fallback indesejado e silencioso).
    let nativeSubmitAttrs;
    if (isAjaxForm) {
      nativeSubmitAttrs = "";
    } else {
      nativeSubmitAttrs = [
        attr("action", props.action),
        attr("method", getSafeFormMethod(props.method)),
        attr("enctype", getSafeFormEnctype(props.enctype)),
        attr("target", props.target)
      ].join("");
    }

    let guardAttrs = "";
    if (toBooleanValue(props.unsavedGuard)) {
      guardAttrs = ' data-unsaved-guard="1"' +
        attr("data-unsaved-modal", getUnsavedModalId(component)) +
        ' data-unsaved-beforeunload="' + (toBooleanValue(props.unsavedBeforeUnload) ? "true" : "false") + '"';
    }

    return [
      cssClassAttr,
      idAttr(props.formId),
      nativeSubmitAttrs,
      attr("autocomplete", getSafeAutocomplete(props.autocomplete)),
      toBooleanValue(props.novalidate) ? " novalidate" : "",
      guardAttrs
    ].join("");
  }

  // === FIELDLIST: TEMPLATES DE INDEX ===
  // Substitui name/id/for dos campos dentro de uma linha do FieldList pelo
  // padrao com __INDEX__ para que o runtime possa reindexar dinamicamente.
  // Ex: name="item[0]" vira data-fieldlist-name-template="item[__INDEX__]" name="item[1]".
  function applyFieldListIndexTemplates(html, indexValue) {
    return String(html || "")
      .replace(/\sname="([^"]*)"/g, (match, value) => {
        const template = createFieldListNameTemplate(value);
        if (template) {
          return `${attr("data-fieldlist-name-template", template)}${attr("name", applyFieldListTemplate(template, indexValue))}`;
        } else {
          return match;
        }
      })
      .replace(/\sid="([^"]*)"/g, (match, value) => {
        const template = createFieldListIdTemplate(value);
        if (template) {
          return `${attr("data-fieldlist-id-template", template)}${attr("id", applyFieldListTemplate(template, indexValue))}`;
        } else {
          return match;
        }
      })
      .replace(/\sfor="([^"]*)"/g, (match, value) => {
        const template = createFieldListIdTemplate(value);
        if (template) {
          return `${attr("data-fieldlist-for-template", template)}${attr("for", applyFieldListTemplate(template, indexValue))}`;
        } else {
          return match;
        }
      });
  }

  function createFieldListNameTemplate(value) {
    const name = String(value || "").trim();
    if (!name) {
      return "";
    }
    if (name.includes("__INDEX__")) {
      return name;
    }
    if (/\[\d+\]/.test(name)) {
      return name.replace(/\[\d+\]/, "[__INDEX__]");
    }
    if (/\[\]/.test(name)) {
      return name.replace(/\[\]/, "[__INDEX__]");
    }
    return `${name}[__INDEX__]`;
  }

  function createFieldListIdTemplate(value) {
    const id = String(value || "").trim();
    if (!id) {
      return "";
    }
    if (id.includes("__INDEX__")) {
      return id;
    } else {
      return `${id}-__INDEX__`;
    }
  }

  function applyFieldListTemplate(template, indexValue) {
    return String(template || "").replace(/__INDEX__/g, String(indexValue));
  }

  function getFieldListIndexStart(props) {
    const value = Number.parseInt(props && props.indexStart, 10);
    if (Number.isFinite(value)) {
      return value;
    } else {
      return 1;
    }
  }

  // === HELPERS DE CSS, DEFINICAO E CONTAINERS ===
  // getComponentClass: retorna a classe CSS do componente (props.cssClass ou defaultCssClass interpolado).
  // getComponentDefinition: busca a definicao no catalogo pelo tipo.
  // isFieldListComponent / isFormContainerComponent / isCustomCardComponent: detectores de tipo.
  // getRowContainerConfig / getRowContainerRows: acesso a configuracao e dados de containers.
  function getComponentClass(component) {
    const props = component.props || {};
    if (hasOwn(props, "cssClass")) {
      return normalizeCssClass(props.cssClass);
    }
    return getDefaultComponentClass(component);
  }

  function getComponentDefinition(type) {
    return state.componentsById[type] || {};
  }

  function isCustomCardComponent(component) {
    return getRowContainerRenderer(component) === "cardCustom";
  }

  function isFormContainerComponent(component) {
    return getRowContainerRenderer(component) === "form";
  }

  function isFieldListComponent(component) {
    return getRowContainerRenderer(component) === "fieldList";
  }

  function isModalContainerComponent(component) {
    return getRowContainerRenderer(component) === "modal";
  }

  function getRowContainerConfig(definition) {
    if (!definition) {
      return null;
    }

    if (definition.container) {
      if (definition.container.enabled === false) {
        return null;
      }
      const config = Object.assign({
        enabled: true,
        storage: "rows",
        renderer: definition.kind || "",
        accepts: ["layout", "component"],
        rejectKinds: []
      }, definition.container);
      if (typeof config.storage === "string" && config.storage) {
        config.storage = config.storage;
      } else {
        config.storage = "rows";
      }
      if (Array.isArray(config.accepts)) {
        config.accepts = config.accepts;
      } else {
        config.accepts = ["layout", "component"];
      }
      if (Array.isArray(config.rejectKinds)) {
        config.rejectKinds = config.rejectKinds;
      } else {
        config.rejectKinds = [];
      }
      if (Array.isArray(config.zones)) {
        config.zones = config.zones;
      } else {
        config.zones = [];
      }
      return config;
    }

    if (definition.kind === "formContainer") {
      return {
        enabled: true,
        storage: "rows",
        renderer: "form",
        accepts: ["layout", "component"],
        rejectKinds: ["formContainer"]
      };
    }

    return null;
  }

  function getRowContainerRenderer(component) {
    if (!component) {
      return "";
    }
    const definition = getComponentDefinition(component.type);
    const config = getRowContainerConfig(definition);
    let renderer;
    if (config) {
      renderer = config.renderer;
    } else {
      renderer = "";
    }
    if (renderer === "formContainer") {
      return "form";
    } else {
      return renderer;
    }
  }

  function getRowContainerZoneConfigs(definition) {
    const config = getRowContainerConfig(definition);
    if (!config) {
      return [];
    }
    let zones;
    if (Array.isArray(config.zones) && config.zones.length) {
      zones = config.zones;
    } else {
      zones = [{ id: "default", storage: config.storage }];
    }
    return zones.map((zone, index) => Object.assign({}, config, zone, {
      id: zone.id || `zone-${index + 1}`,
      storage: zone.storage || config.storage || "rows",
      accepts: Array.isArray(zone.accepts) ? zone.accepts : config.accepts,
      rejectKinds: Array.isArray(zone.rejectKinds) ? zone.rejectKinds : config.rejectKinds
    }));
  }

  function rowContainerHasZone(component, zoneId) {
    return getRowContainerZoneConfigs(getComponentDefinition(component.type)).some((zone) => zone.id === zoneId);
  }

  function getRowContainerZoneConfig(component, zoneId) {
    if (!component) {
      return null;
    }
    const zones = getRowContainerZoneConfigs(getComponentDefinition(component.type));
    return zones.find((zone) => zone.id === zoneId) || zones[0] || null;
  }

  function getRowContainerRows(component, zoneId) {
    if (!component) {
      return null;
    }
    const zones = getRowContainerZoneConfigs(getComponentDefinition(component.type));
    const zone = zones.find((item) => item.id === zoneId) || zones[0] || null;
    if (!zone) {
      return null;
    }
    const storage = zone.storage || "rows";
    if (storage !== "rows" && zone === zones[0] && !Array.isArray(component[storage]) && Array.isArray(component.rows)) {
      component[storage] = component.rows;
    }
    if (Array.isArray(component[storage])) {
      component[storage] = component[storage];
    } else {
      component[storage] = [];
    }
    return component[storage];
  }

  function getAllRowContainerRows(component) {
    if (!component) {
      return [];
    }
    return getRowContainerZoneConfigs(getComponentDefinition(component.type))
      .map((zone) => getRowContainerRows(component, zone.id))
      .filter(Boolean);
  }

  function getDefaultComponentClass(component) {
    const definition = getComponentDefinition(component.type);
    return interpolateTemplate(definition.defaultCssClass || "", component.props || {});
  }

  function interpolateTemplate(value, props) {
    return String(value || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      if (props[key] == null) {
        return "";
      } else {
        return props[key];
      }
    });
  }

  // === HELPERS DE RENDERIZACAO ===
  // Funcoes reutilizadas pelos renderers: atributos customizados, icones Tabler,
  // conteudo de botao, label, ajuda, validacao, atributos de input.
  // renderTablerIcon: usa mask-image CSS para exibir icone SVG com cor customizavel.
  function renderCustomAttributes(value, blockedNames) {
    const blocked = new Set((blockedNames || []).map((name) => String(name).toLowerCase()));
    return normalizeKeyValueEntries(value).map((entry) => {
      const name = String(entry.key || "").trim();
      const lowerName = name.toLowerCase();
      if (!/^[A-Za-z_:][A-Za-z0-9:._-]*$/.test(name) || lowerName.startsWith("on") || blocked.has(lowerName)) {
        return "";
      }
      if (entry.value === "") {
        return ` ${name}`;
      } else {
        return ` ${name}="${escapeAttr(entry.value)}"`;
      }
    }).join("");
  }

  function renderButtonContent(text, icon, iconPosition, iconColor) {
    const label = escapeHtml(text || "");
    const iconHtml = renderTablerIcon(icon, iconColor);
    if (!iconHtml) {
      return label;
    }
    if (iconPosition === "right") {
      return `${label}${iconHtml}`;
    } else {
      return `${iconHtml}${label}`;
    }
  }

  function fieldListActionAttr(value) {
    const action = getSafeFieldListAction(value);
    if (action) {
      return attr("data-fieldlist-action", action);
    } else {
      return "";
    }
  }

  function ajaxFillAttrs(action) {
    if (!toBooleanValue(action && action.ajaxEnabled)) {
      return "";
    }
    const mappings = normalizeKeyValueEntries(action.ajaxMappings).filter((entry) => entry.key && entry.value);
    if (!action.ajaxUrlTemplate || !mappings.length) {
      return "";
    }
    return [
      ' data-ajax-fill="1"',
      attr("data-ajax-url-template", action.ajaxUrlTemplate),
      attr("data-ajax-method", getSafeAjaxMethod(action.ajaxMethod)),
      attr("data-ajax-mappings", JSON.stringify(mappings))
    ].join("");
  }

  // Geolocalizacao: quando o botao tem geoEnabled + campos de destino, emite os
  // data-attrs que o ajax-fill-runtime usa para chamar navigator.geolocation.
  function geoFillAttrs(action) {
    if (!toBooleanValue(action && action.geoEnabled)) {
      return "";
    }
    const latField = String(action.geoLatField || "").trim();
    const lngField = String(action.geoLngField || "").trim();
    if (!latField || !lngField) {
      return "";
    }
    return [
      ' data-geo-fill="1"',
      attr("data-geo-lat", latField),
      attr("data-geo-lng", lngField)
    ].join("");
  }

  // Classe(s) HTML de cada biblioteca de icone de fonte (Lineicons/Font Awesome).
  // Tabler nao entra aqui: continua via mask-image (ver renderTablerIcon abaixo).
  const FONT_ICON_CLASS_BUILDERS = {
    "lineicons-regular": (name) => `lni lni-${name}`,
    "lineicons-solid": (name) => `lni lnis-${name}`,
    "fa-solid": (name) => `fa-solid fa-${name}`,
    "fa-regular": (name) => `fa-regular fa-${name}`,
    "fa-brands": (name) => `fa-brands fa-${name}`
  };

  // renderTablerIcon: renderiza o icone de qualquer campo "field": "icon" do painel.
  // O valor e sempre uma string "<biblioteca>:<nome>" (parseIconValue); sem prefixo
  // reconhecido = Tabler, para compatibilidade com projetos salvos antes de existir
  // suporte a Lineicons/Font Awesome (ver core/parsers.js). Assinatura (value, color)
  // NAO muda — os renderers continuam chamando context.renderTablerIcon(icon, iconColor)
  // exatamente como antes; so o corpo desta funcao passou a ramificar por biblioteca.
  function renderTablerIcon(value, color) {
    const parsed = parseIconValue(value);
    const iconColor = getSafeHexColor(color);

    if (parsed.lib === "tabler") {
      const icon = String(parsed.name || "").trim();
      if (!icon) {
        return "";
      }
      const cleanIcon = icon.replace(/[^A-Za-z0-9_./-]/g, "").replace(/\.svg$/i, "");
      let src;
      if (cleanIcon && !cleanIcon.includes("..")) {
        if (cleanIcon.includes("/")) {
          src = `${cleanIcon}.svg`;
        } else {
          src = `public/components/icons/outline/${cleanIcon}.svg`;
        }
      } else {
        src = "";
      }
      const maskStyle = `-webkit-mask-image:url(&quot;${escapeAttr(src)}&quot;);mask-image:url(&quot;${escapeAttr(src)}&quot;)`;
      let colorStyle;
      if (iconColor) {
        colorStyle = `;--button-icon-color:${iconColor}`;
      } else {
        colorStyle = "";
      }
      if (src) {
        return `<span class="button-icon" style="${maskStyle}${colorStyle}" aria-hidden="true"></span>`;
      } else {
        return "";
      }
    }

    // Icone de fonte (Lineicons/Font Awesome): glifo e texto, pinta via `color`.
    const classBuilder = FONT_ICON_CLASS_BUILDERS[parsed.lib];
    const cleanName = String(parsed.name || "").trim().replace(/[^A-Za-z0-9_-]/g, "");
    if (!classBuilder || !cleanName) {
      return "";
    }
    const styleAttr = iconColor ? ` style="color:${iconColor}"` : "";
    return `<i class="${classBuilder(cleanName)}"${styleAttr} aria-hidden="true"></i>`;
  }

  function getSafeHexColor(value) {
    const color = String(value || "").trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return color;
    } else {
      return "";
    }
  }

  function renderFormLabel(label, required) {
    if (label) {
      return `<label class="form-label">${label}${required || ""}</label>`;
    } else {
      return "";
    }
  }

  function renderRequiredMark(props) {
    if (toBooleanValue(props && props.required)) {
      return ' <span class="required-mark">*</span>';
    } else {
      return "";
    }
  }

  function renderHelpText(props) {
    if (props && props.help) {
      return `<div class="help-text">${escapeHtml(props.help)}</div>`;
    } else {
      return "";
    }
  }

  function getValidationClass(props) {
    let state;
    if (props && ["valid", "invalid"].includes(props.validationState)) {
      state = props.validationState;
    } else {
      state = "";
    }
    return mergeClassNames(
      state ? `is-${state}` : "",
      state && toBooleanValue(props.validationLite) ? `is-${state}-lite` : ""
    );
  }

  function renderValidationFeedback(props) {
    if (!props) {
      return "";
    }
    if (props.validationState === "valid" && props.validFeedback) {
      return `<div class="valid-feedback">${escapeHtml(props.validFeedback)}</div>`;
    }
    if (props.validationState === "invalid" && props.invalidFeedback) {
      return `<div class="invalid-feedback">${escapeHtml(props.invalidFeedback)}</div>`;
    }
    return "";
  }

  function renderInputAttributes(options) {
    return [
      attr("type", options.type || "text"),
      idAttr(options.id),
      attr("name", options.name),
      attr("placeholder", options.placeholder),
      attr("value", options.value),
      attr("min", options.min),
      attr("max", options.max),
      attr("step", options.step),
      attr("maxlength", options.maxlength),
      attr("minlength", options.minlength),
      attr("pattern", options.pattern),
      attr("autocomplete", options.autocomplete),
      attr("accept", options.accept),
      attr("title", options.title),
      renderCustomAttributes(options.customAttributes, ["id", "name", "class", "type", "placeholder", "value", "min", "max", "step", "maxlength", "minlength", "pattern", "autocomplete", "accept", "title", "multiple", "disabled", "readonly", "required"]),
      toBooleanValue(options.multiple) ? " multiple" : "",
      toBooleanValue(options.disabled) ? " disabled" : "",
      toBooleanValue(options.readonly) ? " readonly" : "",
      toBooleanValue(options.required) ? " required" : "",
      options.dataMask ? attr("data-mask", options.dataMask) : "",
      toBooleanValue(options.dataMaskVisible) ? ' data-mask-visible="true"' : ""
    ].join("");
  }

  function styleAttr(value) {
    const width = normalizeTableWidth(value);
    if (width) {
      return ` style="width:${escapeAttr(width)}"`;
    } else {
      return "";
    }
  }

  function normalizeTableWidth(value) {
    return String(value || "").replace(/[;"'<>]/g, "").trim();
  }

  function getDataTableId(component) {
    const props = component.props || {};
    return sanitizeElementId(props.tableId, sanitizeElementId(component.id, "datatable"));
  }

  function getTomSelectId(component) {
    const props = component.props || {};
    return sanitizeElementId(props.selectId, sanitizeElementId(component.id, "tomSelect"));
  }

  function getDropzoneId(component) {
    const props = component.props || {};
    return sanitizeElementId(props.dropzoneId, sanitizeElementId(component.id, "dropzone"));
  }

  function getDatePickerId(component) {
    const props = component.props || {};
    return sanitizeElementId(props.inputId, sanitizeElementId(component.id, "datepicker"));
  }

  function ensureTableColumns(columns) {
    if (columns.length) {
      return columns;
    } else {
      return [{ label: "Coluna 1", data: "", thClass: "", tdClass: "", width: "" }];
    }
  }

  function getSafeTagName(value) {
    const tagName = String(value || "").toLowerCase();
    const allowed = ["div", "span", "p", "label", "ul", "ol", "li", "small", "strong", "em"];
    if (allowed.includes(tagName)) {
      return tagName;
    } else {
      return "div";
    }
  }

  function getSafeFormMethod(value) {
    const method = String(value || "post").toLowerCase();
    if (["get", "post", "dialog"].includes(method)) {
      return method;
    } else {
      return "post";
    }
  }

  function getSafeFormEnctype(value) {
    const enctype = String(value || "");
    const allowed = ["", "application/x-www-form-urlencoded", "multipart/form-data", "text/plain"];
    if (allowed.includes(enctype)) {
      return enctype;
    } else {
      return "";
    }
  }

  function getSafeAutocomplete(value) {
    const autocomplete = String(value || "").toLowerCase();
    if (["on", "off"].includes(autocomplete)) {
      return autocomplete;
    } else {
      return "";
    }
  }

  function getSafeButtonType(value) {
    const type = String(value || "button").toLowerCase();
    if (["button", "submit", "reset"].includes(type)) {
      return type;
    } else {
      return "button";
    }
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function getRowClass(row) {
    const props = row.props || {};
    if (hasOwn(props, "cssClass")) {
      return normalizeCssClass(props.cssClass);
    }
    return interpolateTemplate(getLayoutDefaults().rowCssClass || "row g-3 mb-3", props);
  }

  function getColumnClass(column) {
    const props = column.props || {};
    if (hasOwn(props, "cssClass")) {
      return normalizeCssClass(props.cssClass);
    }
    return interpolateTemplate(getLayoutDefaults().columnCssClass || "col-12 col-md-{{span}}", {
      span: Number(props.span) || 12
    });
  }

  function getLayoutDefaults() {
    if (state.componentRegistry && state.componentRegistry.layoutDefaults) {
      return state.componentRegistry.layoutDefaults;
    } else {
      return {};
    }
  }

  // === NORMALIZACAO E MIGRACAO ===
  // normalizePage / normalizeRows / normalizeComponent: garantem que o state
  //   carregado do localStorage ou de um JSON importado tenha a estrutura esperada.
  // migrateLegacyExampleProps: limpa valores de exemplo fixos que projetos antigos
  //   podiam ter salvo (ex: inputId === "metragemCubica").
  function normalizePage(page) {
    if (!page || page.type !== "page" || !Array.isArray(page.children)) {
      return createEmptyPage();
    }

    page.id = page.id || uid("page");
    if (typeof page.name === "string") {
      page.name = page.name;
    } else {
      page.name = "";
    }
    page.props = page.props || { title: "Pagina" };
    page.props.title = page.props.title || "Pagina";
    page.props.menuLayout = page.props.menuLayout || "none";
    page.props.menuPosition = page.props.menuPosition || "left";
    page.props.menuTheme = page.props.menuTheme || "dark";
    page.props.menuThemeColor = page.props.menuThemeColor || "#206bc4";
    if (page.props.menuSticky === undefined) page.props.menuSticky = false;
    page.props.menuSidebarWidth = page.props.menuSidebarWidth || "normal";
    page.props.pageType = page.props.pageType || "normal";
    page.props.loginSideColor = page.props.loginSideColor || "#206bc4";
    if (page.props.loginSideImage === undefined) page.props.loginSideImage = "";
    if (page.props.buttonDefaultVariant === undefined) page.props.buttonDefaultVariant = "";
    if (page.props.buttonDefaultOutline === undefined) page.props.buttonDefaultOutline = "";
    if (page.props.buttonDefaultSize === undefined) page.props.buttonDefaultSize = "";
    if (page.props.buttonDefaultIconColor === undefined) page.props.buttonDefaultIconColor = "";
    if (!Array.isArray(page.header)) {
      page.header = createLegacyHeaderRows(page.props);
    }
    if (!Array.isArray(page.footer)) {
      page.footer = [];
    }
    if (!Array.isArray(page.navbar)) {
      page.navbar = [];
    }
    if (!Array.isArray(page.sidebar)) {
      page.sidebar = [];
    }
    page.header = normalizeRows(page.header);
    page.footer = normalizeRows(page.footer);
    page.navbar = normalizeRows(page.navbar);
    page.sidebar = normalizeRows(page.sidebar);
    page.children = normalizeRows(page.children);

    return page;
  }

  function normalizeRows(rows) {
    let rowList;
    if (Array.isArray(rows)) {
      rowList = rows;
    } else {
      rowList = [];
    }
    return rowList.filter((row) => row && row.type === "row").map((row) => {
      row.id = row.id || uid("row");
      row.props = row.props || {};
      if (Array.isArray(row.columns)) {
        row.columns = row.columns;
      } else {
        row.columns = [];
      }
      row.columns = row.columns.map((column) => {
        column.id = column.id || uid("col");
        column.props = column.props || { span: 12 };
        if (Array.isArray(column.children)) {
          column.children = column.children;
        } else {
          column.children = [];
        }
        column.children = column.children.map((component) => {
          return normalizeComponent(component);
        });
        return column;
      });
      return row;
    });
  }

  function normalizeComponent(component) {
    component = component || {};
    component.type = component.type || "component";
    component.id = component.id || uid(component.type);
    const definition = getComponentDefinition(component.type);
    component.props = Object.assign({}, deepClone(definition.defaults || {}), component.props || {});
    migrateLegacyExampleProps(component, definition);
    applyGeneratedComponentProps(component, definition, false);
    normalizeStructuredComponentProps(component, definition);

    const containerConfig = getRowContainerConfig(definition);
    if (containerConfig) {
      getRowContainerZoneConfigs(definition).forEach((zone, index) => {
        const storage = zone.storage || "rows";
        let storedRows;
        if (storage !== "rows" && index === 0 && !Array.isArray(component[storage])) {
          storedRows = component.rows;
        } else {
          storedRows = component[storage];
        }
        component[storage] = normalizeRows(storedRows);
      });
    }
    if (definition.kind === "fieldList") {
      syncFieldListRows(component);
    }

    return component;
  }

  function migrateLegacyExampleProps(component, definition) {
    const props = component.props || {};
    const controlName = definition.controlName || "";
    getGeneratedControlFields(definition).forEach((field) => {
      if (controlName && field.idProp && props[field.idProp] === controlName) {
        props[field.idProp] = "";
      }
      if (controlName && field.nameProp && props[field.nameProp] === controlName) {
        props[field.nameProp] = "";
      }
    });

    if (definition.kind === "tomSelect" && props.selectId === "categoria" && props.name === "categoria") {
      props.selectId = "";
      props.name = "";
    }

    if (definition.kind === "inputButtonGroup" && (props.inputId === "ean13" || props.inputName === "ean13")) {
      props.label = "Input com Botoes";
      props.inputId = "";
      props.inputName = "";
      props.placeholder = "Digite um valor";
      props.maxLength = "";
      props.buttonsPosition = props.buttonsPosition || "right";
      props.buttons = [{
        type: "button",
        text: "Nome do Botao",
        href: "#",
        id: "",
        cssClass: "btn btn-outline-secondary",
        icon: "",
        iconColor: "",
        iconPosition: "left"
      }];
      props.invalidFeedback = "Informe um valor valido.";
    }

    if (component.type === "number" && (props.inputId === "metragemCubica" || props.name === "metragem_cubica")) {
      props.label = "Numero";
      props.inputId = "";
      props.name = "";
      props.step = "1";
    }

    if (definition.kind === "inputSelectGroup" && (props.inputId === "descontoGeral" || props.selectId === "tipoDescontoGeral")) {
      props.label = "Input com Select";
      props.inputId = "";
      props.inputName = "";
      props.value = "";
      props.placeholder = "Digite um valor";
      props.dataMask = props.dataMask || "";
      props.selectPosition = props.selectPosition || "right";
      props.selectId = "";
      props.selectName = "";
      props.options = { opcao_1: "Opcao 1", opcao_2: "Opcao 2" };
    }
  }

  function normalizeStructuredComponentProps(component, definition) {
    if (!component || !component.props || !definition) {
      return;
    }
    const props = component.props;

    if (hasOwn(props, "customAttributes")) {
      props.customAttributes = normalizeKeyValueEntries(props.customAttributes);
    }

    if (definition.kind === "buttonDropdown") {
      props.items = parseDropdownItems(props.items);
      props.extraActions = parseDropdownActions(props.extraActions);
    }

    if (definition.kind === "inputButtonGroup") {
      props.buttons = parseDropdownActions(props.buttons);
    }

    if (definition.kind === "list") {
      props.items = parseListItems(props.items);
    }

    if (definition.kind === "breadcrumb") {
      props.items = parseBreadcrumbItems(props.items);
    }

    if (["select", "inputSelectGroup", "tomSelect", "floatingInput"].includes(definition.kind)) {
      props.options = parseOptions(props.options).map((option) => ({
        key: option.value,
        value: option.label,
        selected: option.selected,
        disabled: option.disabled
      }));
    }

    if (definition.kind === "choice") {
      props.options = parseChoiceItems(props.options);
    }

    if (definition.kind === "selectGroup") {
      props.items = parseSelectGroupItems(props.items);
    }

    if (definition.kind === "paymentMethod") {
      props.items = parsePaymentMethods(props.items);
    }

    if (definition.kind === "buttonGroup") {
      props.items = parseButtonGroupItems(props.items);
    }

    if (["table", "datatable", "fieldList"].includes(definition.kind)) {
      props.columns = parseTableColumns(props.columns, props.columnStyles);
      if (definition.kind !== "fieldList") {
        props.rows = parseTableRows(props.rows);
      }
      delete props.columnStyles;
    }

    if (definition.kind === "datatable") {
      props.ajaxHeaders = normalizeKeyValueEntries(props.ajaxHeaders);
    }

    if (definition.kind === "jsSnippet") {
      // Componente recem-criado vem com code vazio: preenche com o snippet do
      // template selecionado (fonte: window.TemplateBuilderJsSnippets, do renderer).
      const templates = window.TemplateBuilderJsSnippets || {};
      if (!String(props.code || "").trim() && templates[props.template]) {
        props.code = templates[props.template].code;
      }
    }

    if (definition.kind === "formContainer") {
      // Form com AJAX configurado mas sem codigo salvo (ex.: pagina salva em versao
      // anterior): preenche o textarea com o codigo gerado, para o dev ver/editar.
      if (toBooleanValue(props.ajaxEnabled) && String(props.ajaxUrl || "").trim() && !String(props.ajaxCode || "").trim()) {
        props.ajaxCode = generateFormAjaxCode(component);
      }
    }
  }

  // === GERACAO AUTOMATICA DE IDS E NAMES ===
  // applyGeneratedComponentProps: preenche inputId/name vazios com um valor unico
  //   derivado de controlName + sufixo do id do componente.
  // getGeneratedControlFields: define quais props recebem ID/name automatico por kind.
  function applyGeneratedComponentProps(component, definition, force) {
    if (!component || !component.props || !definition) {
      return;
    }

    getGeneratedControlFields(definition).forEach((field) => {
      const generated = getGeneratedControlIdentifier(component, field.base || definition.id || component.type);
      if (field.idProp && (force || !component.props[field.idProp])) {
        component.props[field.idProp] = generated;
      }
      if (field.nameProp && (force || !component.props[field.nameProp])) {
        component.props[field.nameProp] = generated;
      }
    });

    if (definition.kind === "datatable" && (force || !component.props.tableId)) {
      component.props.tableId = sanitizeElementId(component.id, "datatable");
    }

    if (definition.kind === "kpi" && (force || !component.props.valueId)) {
      component.props.valueId = sanitizeElementId(component.id, "kpiValor");
    }

    if (definition.kind === "formContainer" && (force || !component.props.formId)) {
      component.props.formId = sanitizeElementId(component.id, "form");
    }
  }

  function getGeneratedControlFields(definition) {
    if (Array.isArray(definition.generatedFields)) {
      return definition.generatedFields;
    }
    const base = definition.controlName || definition.id || definition.kind || "campo";
    if (["input", "textarea", "iconInput", "helpInput", "floatingInput", "datePicker", "selectGroup", "paymentMethod", "buttonGroup"].includes(definition.kind)) {
      return [{ idProp: "inputId", nameProp: "name", base }];
    }
    if (["select", "tomSelect"].includes(definition.kind)) {
      return [{ idProp: "selectId", nameProp: "name", base }];
    }
    if (definition.kind === "choice") {
      return [{ idProp: "inputId", nameProp: "name", base }];
    }
    if (definition.kind === "inputSelectGroup") {
      return [
        { idProp: "inputId", nameProp: "inputName", base: `${base}_input` },
        { idProp: "selectId", nameProp: "selectName", base: `${base}_select` }
      ];
    }
    if (["quantityStepper", "inputButtonGroup"].includes(definition.kind)) {
      return [{ idProp: "inputId", nameProp: "inputName", base }];
    }
    if (definition.kind === "dropzone") {
      // storeId: id do input file oculto que recebe os arquivos no submit.
      // Gerado pela mesma maquina do dropzoneId, entao os sufixos casam:
      // dropzoneId "dropzone-abc123" <-> storeId "dropzone-store-abc123".
      // O name do input acompanha o storeId (convencao do projeto: name = id gerado).
      return [
        { idProp: "dropzoneId", base },
        { idProp: "storeId", nameProp: "name", base: "dropzone-store" }
      ];
    }
    return [];
  }

  function getGeneratedControlIdentifier(component, base) {
    const prefix = String(base || component.type || "campo")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^[_-]+|[_-]+$/g, "") || "campo";
    const suffix = String(component.id || uid(prefix))
      .replace(/^[^_-]+[_-]?/, "")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(-12) || Math.random().toString(36).slice(2, 10);
    return `${prefix}-${suffix}`;
  }

  function createLegacyHeaderRows(props) {
    let title;
    if (props && props.title) {
      title = props.title;
    } else {
      title = "Pagina";
    }
    let pretitle;
    if (props && props.pretitle) {
      pretitle = props.pretitle;
    } else {
      pretitle = "DEV STUDIO BUILDER";
    }
    return [
      createRow([12], [
        [
          createComponent("html", {
            html: `<div class="page-pretitle">${escapeHtml(pretitle)}</div><h2 class="page-title">${escapeHtml(title)}</h2>`
          })
        ]
      ])
    ];
  }

  function loadFromStorage() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      toast("Nao ha versao salva");
      return;
    }
    const page = loadStoredPage();
    if (!page) {
      toast("JSON salvo invalido");
      return;
    }
    state.page = page;
    state.selectedId = null;
    state.selectedSection = null;
    commitHistory();
    render();
    toast("Carregado");
  }

  function togglePreview() {
    state.preview = !state.preview;
    els.shell.dataset.preview = String(state.preview);
    if (state.preview) {
      document.querySelector('[data-action="preview"]').textContent = "Editar";
    } else {
      document.querySelector('[data-action="preview"]').textContent = "Preview";
    }
  }

  function openOutput(title, content, kind) {
    state.outputKind = kind;
    els.outputTitle.textContent = title;
    els.outputContent.value = content;
    els.outputDialog.showModal();
  }

  function copyOutput() {
    els.outputContent.select();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(els.outputContent.value).then(() => {
        toast("Copiado");
      }).catch(() => {
        document.execCommand("copy");
        toast("Copiado");
      });
    } else {
      document.execCommand("copy");
      toast("Copiado");
    }
  }

  function downloadOutput() {
    let extension;
    if (state.outputKind === "json") {
      extension = "json";
    } else {
      extension = "html";
    }
    let type;
    if (state.outputKind === "json") {
      type = "application/json";
    } else {
      type = "text/html";
    }
    const blob = new Blob([els.outputContent.value], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const baseName = (state.page.name || "template-builder")
      .trim()
      .replace(/[^a-z0-9_\-]/gi, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .toLowerCase() || "template-builder";
    link.download = `${baseName}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // === SAIDA: EXPORT HTML / JSON ===
  // exportHtmlDocument: delega para export-html.js via getExportHtmlContext().
  // copyOutput: usa Clipboard API com fallback para execCommand em HTTP.
  // downloadOutput: cria Blob e dispara download do arquivo.
  function exportHtmlDocument() {
    return window.TemplateBuilderExportHtml.exportDocument(getExportHtmlContext());
  }

  // generateFormAjaxCode: gera o script de envio AJAX de um form (mesmo gerador do
  // export) para preencher o textarea "Codigo JS (jQuery)" no painel de propriedades.
  // Retorna "" quando o form ainda nao tem URL configurada.
  function generateFormAjaxCode(component) {
    const props = component.props || {};
    const formId = sanitizeElementId(props.formId, "");
    if (!formId || !String(props.ajaxUrl || "").trim()) {
      return "";
    }
    return window.TemplateBuilderExportHtml.renderFormAjaxScript(getExportHtmlContext(), props, formId);
  }

  function exportRow(row) {
    return window.TemplateBuilderExportHtml.exportRow(getExportHtmlContext(), row);
  }

  function exportComponent(component) {
    return window.TemplateBuilderExportHtml.exportComponent(getExportHtmlContext(), component);
  }

  function getExportHtmlContext() {
    return {
      buildButtonClass,
      classAttr,
      escapeAttr,
      escapeHtml,
      getAllRows,
      getColumnClass,
      getComponentDefinition,
      getDataTableId,
      getDatePickerId,
      getDropzoneId,
      getRowClass,
      getTomSelectId,
      indent,
      isFieldListComponent,
      isModalContainerComponent,
      normalizeKeyValueEntries,
      renderComponentHtml,
      renderHiddenInputHtml,
      renderTablerIcon,
      sanitizeElementId,
      state,
      toBooleanValue,
      toJsLiteral,
      toJsString,
      toPositiveInteger
    };
  }

  // === UTILIDADES ===
  // sanitizeEditorHtml: remove <script> e handlers on* do HTML livre para evitar XSS no canvas.
  // deepClone: clone via JSON (nao clona funcoes ou referencia circular).
  // remapIds: gera novos IDs para todos os nos de uma subarvore (usado ao duplicar).
  // uid: gera identificador unico prefixado com Math.random + timestamp.
  // toast: exibe mensagem temporaria no canto da tela.
  function sanitizeEditorHtml(html) {
    return String(html || "")
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
      .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function remapIds(node) {
    if (!node || typeof node !== "object") {
      return;
    }

    if (node.id) {
      node.id = uid(node.type || "node");
    }
    applyGeneratedComponentProps(node, getComponentDefinition(node.type), true);

    if (Array.isArray(node.columns)) {
      node.columns.forEach(remapIds);
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(remapIds);
    }

    getRowContainerZoneConfigs(getComponentDefinition(node.type)).forEach((zone) => {
      if (Array.isArray(node[zone.storage])) {
        node[zone.storage].forEach(remapIds);
      }
    });
  }

  function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
  }

  function toast(message) {
    const existing = document.querySelector(".toast");
    if (existing) {
      existing.remove();
    }
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    document.body.appendChild(node);
    window.setTimeout(() => node.remove(), 1800);
  }
})();
