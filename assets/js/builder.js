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

  const PATTERN_TEMPLATES = [
    { label: "E-mail", value: "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$" },
    { label: "CPF", value: "^\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}$" },
    { label: "CNPJ", value: "^\\d{2}\\.?\\d{3}\\.?\\d{3}\\/?\\d{4}-?\\d{2}$" },
    { label: "CPF ou CNPJ", value: "^(\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}|\\d{2}\\.?\\d{3}\\.?\\d{3}\\/?\\d{4}-?\\d{2})$" },
    { label: "Celular com DDD (BR)", value: "^\\(?[1-9]{2}\\)?\\s?9[0-9]{4}-?[0-9]{4}$" },
    { label: "Telefone fixo com DDD (BR)", value: "^\\(?[1-9]{2}\\)?\\s?[2-8][0-9]{3}-?[0-9]{4}$" },
    { label: "Telefone (celular ou fixo)", value: "^\\(?[1-9]{2}\\)?\\s?[2-9][0-9]{3,4}-?[0-9]{4}$" },
    { label: "Data DD/MM/AAAA", value: "^(0[1-9]|[12][0-9]|3[01])\\/(0[1-9]|1[012])\\/\\d{4}$" },
    { label: "Data DD/MM/AA", value: "^(0[1-9]|[12][0-9]|3[01])\\/(0[1-9]|1[012])\\/\\d{2}$" },
    { label: "IP (IPv4)", value: "^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$" },
    { label: "Somente letras (sem acento)", value: "^[A-Za-z]+$" },
    { label: "Somente letras (com acento)", value: "^[A-Za-zÀ-ɏ]+$" },
    { label: "Nome completo", value: "^[A-Za-zÀ-ɏ]{2,}(\\s[A-Za-zÀ-ɏ]+)+$" },
    { label: "Somente numeros", value: "^[0-9]+$" },
    { label: "Numero inteiro (pos/neg)", value: "^-?[0-9]+$" },
    { label: "Numero decimal (virgula)", value: "^-?[0-9]+,[0-9]+$" },
    { label: "Numero decimal (ponto)", value: "^-?[0-9]+\\.[0-9]+$" },
    { label: "Cartao de credito", value: "^[0-9]{4}[\\s\\-]?[0-9]{4}[\\s\\-]?[0-9]{4}[\\s\\-]?[0-9]{4}$" },
    { label: "CEP", value: "^\\d{5}-?\\d{3}$" },
    { label: "RG", value: "^\\d{1,2}\\.?\\d{3}\\.?\\d{3}-?[0-9Xx]$" },
    { label: "PIS / PASEP", value: "^\\d{3}\\.?\\d{5}\\.?\\d{2}-?\\d$" },
    { label: "Placa Mercosul", value: "^[A-Z]{3}[0-9][A-Z][0-9]{2}$" },
    { label: "Placa antiga (ABC-1234)", value: "^[A-Z]{3}-?[0-9]{4}$" },
    { label: "Placa (Mercosul ou antiga)", value: "^([A-Z]{3}-?[0-9]{4}|[A-Z]{3}[0-9][A-Z][0-9]{2})$" },
    { label: "URL (http/https)", value: "^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)$" },
    { label: "Senha forte (min 8, mai/min/num/especial)", value: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$" },
    { label: "Cor hexadecimal (#RRGGBB)", value: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" },
    { label: "Slug (letras, numeros e hifens)", value: "^[a-z0-9]+(-[a-z0-9]+)*$" },
    { label: "Alfanumerico sem espacos", value: "^[A-Za-z0-9]+$" },
    { label: "Alfanumerico com espacos", value: "^[A-Za-z0-9 ]+$" },
  ];
  const previewAssetPromises = new Map();
  const helpers = window.TemplateBuilderHelpers || {};
  const attr = helpers.attr;
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
    tablerIcons: [],
    tablerIconOptions: [],
    history: [],
    future: [],
    preview: false
  };

  const els = {};

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
    els.importJsonFile = document.getElementById("import-json-file");

    await Promise.all([loadComponentRegistry(), loadTablerIcons()]).catch((err) => {
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

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        state.page = normalizePage(JSON.parse(saved));
      } catch (error) {
        state.page = createStarterPage();
        toast("Aviso: dado salvo estava corrompido, iniciando nova pagina");
      }
    } else {
      state.page = createEmptyPage();
    }

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
        menuSticky: false,
        menuSidebarWidth: "normal"
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
        menuSticky: false,
        menuSidebarWidth: "normal"
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

  async function loadTablerIcons() {
    try {
      const response = await fetch(TABLER_ICONS_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("tabler icons registry not found");
      }
      const registry = await response.json();
      if (Array.isArray(registry.icons)) {
        state.tablerIcons = registry.icons.map(String);
      } else {
        state.tablerIcons = [];
      }
    } catch (error) {
      state.tablerIcons = [];
      toast("Aviso: icones Tabler nao carregados");
    }
    state.tablerIconOptions = state.tablerIcons.map((icon) => ({ value: icon, text: icon }));
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

  function createComponent(type, overrides) {
    const definition = getComponentDefinition(type);

    const component = {
      id: uid(type),
      type,
      props: Object.assign({}, deepClone(definition.defaults || {}), overrides || {})
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

        const label = document.createElement("span");
        label.textContent = block.label || block.id;

        button.appendChild(icon);
        button.appendChild(label);
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.page));
        toast("Salvo no navegador");
      }

      if (action === "load") {
        loadFromStorage();
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
      updateRepeaterProperty
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
  function render() {
    renderPageNavbar();
    renderPageSidebar();
    renderPageHeader();
    renderCanvas();
    renderPageFooter();
    renderProperties();
    renderSummary();
    initializePreviewComponents();
    initializePreviewPasswordToggles();
  }

  function initializePreviewComponents() {
    const definitions = collectExportComponents().map((component) => getComponentDefinition(component.type));
    const definitionsWithAssets = definitions.filter((definition) => definition.assets);
    if (!definitionsWithAssets.length) {
      return;
    }

    const stylePromises = definitionsWithAssets.flatMap((definition) => {
      return (definition.assets.styles || []).map((asset) => loadPreviewAsset(asset, "style"));
    });
    const scriptPromises = definitionsWithAssets
      .filter((definition) => ["litepicker", "apexchart", "dropzone", "fullcalendar"].includes(definition.assets.init))
      .flatMap((definition) => (definition.assets.scripts || []).map((asset) => loadPreviewAsset(asset, "script")));
    initializePreviewQuantitySteppers();
    Promise.all([...stylePromises, ...scriptPromises]).then(() => {
      initializePreviewLitePickers();
      initializePreviewTomSelects();
      initializePreviewApexCharts();
      initializePreviewDropzones();
      initializePreviewFullCalendars();
    }).catch(() => {});
  }

  function getAssetUrl(asset) {
    if (typeof asset === "string") {
      return asset;
    }
    if (asset && typeof asset === "object") {
      return asset.src || asset.href || null;
    }
    return null;
  }

  function loadPreviewAsset(asset, type) {
    const url = getAssetUrl(asset);
    if (!url) {
      return Promise.resolve();
    }
    const key = `${type}:${url}`;
    if (previewAssetPromises.has(key)) {
      return previewAssetPromises.get(key);
    }

    let tagName;
    if (type === "style") {
      tagName = "link";
    } else {
      tagName = "script";
    }
    let attributeName;
    if (type === "style") {
      attributeName = "href";
    } else {
      attributeName = "src";
    }
    const existingAsset = Array.from(document.querySelectorAll(tagName)).some((element) => {
      return element.getAttribute(attributeName) === url;
    });
    if (existingAsset) {
      const existingPromise = Promise.resolve();
      previewAssetPromises.set(key, existingPromise);
      return existingPromise;
    }

    const promise = new Promise((resolve, reject) => {
      const element = document.createElement(type === "style" ? "link" : "script");
      if (type === "style") {
        element.rel = "stylesheet";
        element.href = url;
      } else {
        element.src = url;
      }
      element.addEventListener("load", resolve, { once: true });
      element.addEventListener("error", reject, { once: true });
      document.head.appendChild(element);
    });
    previewAssetPromises.set(key, promise);
    return promise;
  }

  function initializePreviewLitePickers() {
    if (!window.Litepicker) {
      return;
    }
    document.querySelectorAll(".component-preview [data-litepicker]").forEach((element) => {
      if (element._templateBuilderLitepicker) {
        return;
      }
      const isRange = element.dataset.litepickerRange === "true";
      const hasTime = element.dataset.litepickerTime === "true";
      const timeStep = parseInt(element.dataset.litepickerTimeStep, 10) || 5;
      let endId;
      if (element.id) {
        endId = element.id + "-end";
      } else {
        endId = null;
      }
      let endElement;
      if (isRange && endId) {
        endElement = document.getElementById(endId);
      } else {
        endElement = null;
      }
      const options = {
        element,
        inlineMode: element.dataset.litepickerInline === "true",
        singleMode: !isRange,
        format: element.dataset.litepickerFormat || "YYYY-MM-DD",
        lang: element.dataset.litepickerLang || "pt-BR"
      };
      if (hasTime) {
        options.timePicker = true;
        options.timePickerMinutes = timeStep;
      }
      if (isRange && endElement) {
        options.elementEnd = endElement;
      }
      element._templateBuilderLitepicker = new window.Litepicker(options);
    });
  }

  function initializePreviewTomSelects() {
    if (!window.TomSelect) {
      return;
    }
    document.querySelectorAll(".component-preview select[data-tomselect]").forEach((select) => {
      if (select.tomselect) {
        return;
      }
      const createEnabled = select.dataset.tomselectCreate === "true";
      const createUrl = (select.dataset.createUrl || "").trim();
      let createOpt;
      if (createEnabled && createUrl) {
        createOpt = function () {
          window.open(createUrl, "_blank");
          return false;
        };
      } else {
        createOpt = createEnabled;
      }
      const ajaxUrl = (select.dataset.ajaxUrl || "").trim();
      const jsonPath = select.dataset.jsonPath || "";
      const remoteSearch = select.dataset.remoteSearch === "true" && Boolean(ajaxUrl);
      const searchParam = select.dataset.searchParam || "q";
      let loadThrottle = parseInt(select.dataset.loadThrottle, 10);
      if (isNaN(loadThrottle) || loadThrottle < 0) { loadThrottle = 300; }
      const preloadOnFocus = select.dataset.preload === "true";
      const valueField = select.dataset.valueField || "id";
      const labelField = select.dataset.labelField || "text";
      const searchFields = (select.dataset.searchField || labelField).split(",").map((s) => s.trim()).filter(Boolean);
      const allowEmptyOption = select.dataset.allowEmptyOption !== "false";
      const sortField = (select.dataset.sortField || "text").trim();
      const sortDirection = (select.dataset.sortDirection || "asc").trim();
      const maxOptions = parseInt(select.dataset.maxOptions, 10) || 100;
      const readItems = (response) => {
        if (!response) { return []; }
        let items;
        if (jsonPath) {
          items = jsonPath.split(".").reduce((v, k) => v && v[k], response);
        } else {
          items = response;
        }
        if (!Array.isArray(items)) { return []; }
        return items;
      };
      const settings = {
        plugins: select.multiple ? ["remove_button", "clear_button"] : ["clear_button"],
        copyClassesToDropdown: false,
        dropdownParent: "body",
        valueField,
        labelField,
        searchField: searchFields,
        create: createOpt,
        placeholder: select.dataset.placeholder || "",
        allowEmptyOption,
        sortField: [{ field: sortField, direction: sortDirection }],
        maxOptions
      };
      if (remoteSearch) {
        // Mesmo comportamento do tomselect-runtime: busca remota com debounce
        settings.loadThrottle = loadThrottle;
        if (preloadOnFocus) { settings.preload = "focus"; }
        settings.load = (query, callback) => {
          const separator = ajaxUrl.includes("?") ? "&" : "?";
          fetch(`${ajaxUrl}${separator}${encodeURIComponent(searchParam)}=${encodeURIComponent(query || "")}`)
            .then((r) => r.ok ? r.json() : null)
            .then((response) => callback(readItems(response)))
            .catch(() => callback());
        };
      }
      const ts = new window.TomSelect(select, settings);
      if (ajaxUrl && !remoteSearch) {
        fetch(ajaxUrl)
          .then((r) => r.ok ? r.json() : null)
          .then((response) => {
            const items = readItems(response);
            if (!items.length) { return; }
            ts.addOptions(items);
            ts.refreshOptions(false);
          })
          .catch(() => {});
      }
    });
  }

  function initializePreviewDropzones() {
    if (!window.Dropzone) {
      return;
    }
    window.Dropzone.autoDiscover = false;
    document.querySelectorAll(".component-preview div[data-dropzone]").forEach((form) => {
      if (form._dropzone) {
        return;
      }
      try {
        form._dropzone = new window.Dropzone(form, {
          url: "#",
          autoProcessQueue: false,
          addRemoveLinks: false
        });
      } catch (e) {}
    });
  }

  function initializePreviewApexCharts() {
    if (!window.ApexCharts) {
      return;
    }
    document.querySelectorAll(".component-preview [data-apex-chart]").forEach(function (el) {
      if (el._apexChart) {
        return;
      }
      try {
        const options = JSON.parse(el.dataset.chartOptions || "{}");
        const ajaxUrl = (el.dataset.chartAjaxUrl || "").trim();
        const chartType = el.dataset.chartType || "";
        if (ajaxUrl) {
          fetch(ajaxUrl).then((r) => r.ok ? r.json() : null).then((data) => {
            if (data) { mergeApexChartData(options, data, chartType); }
            el._apexChart = new window.ApexCharts(el, options);
            el._apexChart.render();
          }).catch(() => {
            el._apexChart = new window.ApexCharts(el, options);
            el._apexChart.render();
          });
        } else {
          el._apexChart = new window.ApexCharts(el, options);
          el._apexChart.render();
        }
      } catch (e) {}
    });
  }

  function mergeApexChartData(options, data, chartType) {
    if (chartType === "pie" || chartType === "donut") {
      if (Array.isArray(data.values)) { options.series = data.values; }
      if (Array.isArray(data.labels)) { options.labels = data.labels; }
    } else {
      if (Array.isArray(data.series)) { options.series = data.series; }
      if (Array.isArray(data.categories)) {
        options.xaxis = options.xaxis || {};
        options.xaxis.categories = data.categories;
      }
    }
  }

  function initializePreviewPasswordToggles() {
    document.querySelectorAll(".component-preview [data-password-toggle]").forEach((toggle) => {
      if (toggle._passwordToggleInitialized) {
        return;
      }
      toggle._passwordToggleInitialized = true;
      toggle.addEventListener("click", function (e) {
        e.preventDefault();
        const input = this.closest(".input-group").querySelector("input");
        if (input) {
          if (input.type === "password") {
            input.type = "text";
          } else {
            input.type = "password";
          }
        }
      });
    });
  }

  function initializePreviewQuantitySteppers() {
    const canvas = document.getElementById("canvas");
    if (!canvas || canvas._qtyHandlerAttached) { return; }
    canvas._qtyHandlerAttached = true;
    canvas.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-qty-action]");
      if (!btn) { return; }
      const group = btn.closest(".input-group");
      if (!group) { return; }
      const input = group.querySelector("input[type='number']");
      if (!input) { return; }
      const step = parseFloat(input.step) || 1;
      let min;
      if (input.min !== "") {
        min = parseFloat(input.min);
      } else {
        min = -Infinity;
      }
      let max;
      if (input.max !== "") {
        max = parseFloat(input.max);
      } else {
        max = Infinity;
      }
      let value = parseFloat(input.value) || 0;
      if (btn.dataset.qtyAction === "minus") {
        value = Math.max(min, value - step);
      } else {
        value = Math.min(max, value + step);
      }
      input.value = parseFloat(value.toFixed(10));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function initializePreviewFullCalendars() {
    if (!window.FullCalendar) { return; }
    document.querySelectorAll(".component-preview [data-fullcalendar]").forEach(function (el) {
      if (el._fullCalendar) { return; }
      try {
        var options = JSON.parse(el.dataset.fcOptions || "{}");
        var ajaxUrl = (el.dataset.fcAjaxUrl || "").trim();
        if (ajaxUrl) { options.events = ajaxUrl; }
        el._fullCalendar = new window.FullCalendar.Calendar(el, options);
        el._fullCalendar.render();
      } catch (e) {}
    });
  }

  // === RENDERIZACAO DAS SECOES DA PAGINA ===
  // Cada secao (header, canvas/body, footer) tem sua funcao de render.
  // renderRow: cria o elemento DOM de uma linha com suas colunas e componentes.

  function renderPageNavbar() {
    const menuLayout = state.page.props.menuLayout || "none";
    const showNavbar = menuLayout === "horizontal" || menuLayout === "combo" || menuLayout === "combo-pill";
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
    const themeClass = theme === "dark" ? " navbar-theme-dark" : "";
    const stickyClass = sticky && menuLayout !== "combo-pill" ? " navbar-sticky" : "";
    const pillClass = menuLayout === "combo-pill" ? " navbar-pill" : "";

    els.pageNavbar.className = `editor-page-navbar${selected}${empty}${themeClass}${stickyClass}${pillClass}`;
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
    const menuLayout = state.page.props.menuLayout || "none";
    const showSidebar = menuLayout === "vertical" || menuLayout === "combo" || menuLayout === "combo-pill";
    const position = state.page.props.menuPosition || "left";
    const theme = state.page.props.menuTheme || "dark";
    const sidebarWidth = state.page.props.menuSidebarWidth || "normal";

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

    if (menuLayout !== "combo-pill" && els.pageBodyWrapper) {
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
    const posClass = menuLayout !== "combo-pill" && position === "right" ? " sidebar-right" : "";
    const themeClass = theme === "dark" ? " sidebar-theme-dark" : "";
    const widthClass = menuLayout === "combo-pill"
      ? " sidebar-icon-mode"
      : sidebarWidth === "compact" ? " sidebar-compact" : sidebarWidth === "wide" ? " sidebar-wide" : "";

    els.pageSidebar.className = `editor-page-sidebar${selected}${empty}${posClass}${themeClass}${widthClass}`;
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
    card.appendChild(renderCustomCardZone(component, "header", mergeClassNames(props.headerCssClass || "card-header", "custom-card-header"), "Arraste componentes para o titulo"));
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

    const header = document.createElement("div");
    header.className = props.headerCssClass || "card-header";
    const heading = document.createElement("div");
    heading.innerHTML = [
      props.cardTitle ? `<h3 class="card-title">${escapeHtml(props.cardTitle)}</h3>` : "",
      props.description ? `<div class="text-secondary">${escapeHtml(props.description)}</div>` : ""
    ].join("");
    const actions = document.createElement("div");
    actions.className = "card-actions";
    actions.innerHTML = `<button type="button"${classAttr(props.addButtonCssClass || "btn btn-primary")} data-action="fieldlist-add-row">${renderButtonContent(props.addButtonText || "Adicionar linha", props.addButtonIcon, props.addButtonIconPosition, props.addButtonIconColor)}</button>`;
    header.appendChild(heading);
    header.appendChild(actions);
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
    if (action.type === "link") {
      return `<a href="${escapeAttr(action.href || "#")}"${classAttr(action.cssClass || "btn btn-primary")}${idAttr}${fieldListActionAttr(action.fieldListAction)}${ajaxFillAttrs(action)}>${renderButtonContent(action.text || "Acao", action.icon, action.iconPosition, action.iconColor)}</a>`;
    }
    return `<button type="button"${classAttr(action.cssClass || "btn btn-outline-secondary")}${idAttr}${fieldListActionAttr(action.fieldListAction)}${ajaxFillAttrs(action)}>${renderButtonContent(action.text || "Acao", action.icon, action.iconPosition, action.iconColor)}</button>`;
  }

  function renderSelectOption(option) {
    return `<option value="${escapeAttr(option.value)}"${option.selected ? " selected" : ""}${option.disabled ? " disabled" : ""}>${escapeHtml(option.label)}</option>`;
  }

  function renderFormContainerHtml(component, cssClassAttr) {
    const rows = (getRowContainerRows(component) || []).map(exportRow).join("\n");
    return [
      `<form${renderFormContainerAttributes(component, cssClassAttr)}>`,
      indent(rows, 2),
      "</form>"
    ].join("\n");
  }

  function renderCustomCardHtml(component, cssClassAttr) {
    const props = component.props || {};
    const headerRows = (getRowContainerRows(component, "header") || []).map(exportRow).join("\n");
    const bodyRows = (getRowContainerRows(component, "body") || []).map(exportRow).join("\n");
    return [
      `<article${cssClassAttr}>`,
      `  <header${classAttr(mergeClassNames(props.headerCssClass || "card-header", "custom-card-header-content"))}>`,
      indent(headerRows, 4),
      "  </header>",
      `  <div${classAttr(props.bodyCssClass || "card-body")}>`,
      indent(bodyRows, 4),
      "  </div>",
      "</article>"
    ].join("\n");
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

    return [
      cssClassAttr,
      idAttr(props.formId),
      nativeSubmitAttrs,
      attr("autocomplete", getSafeAutocomplete(props.autocomplete)),
      toBooleanValue(props.novalidate) ? " novalidate" : ""
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

  function getSafeFieldListAction(value) {
    if (["clone", "remove"].includes(value)) {
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

  function renderTablerIcon(value, color) {
    const icon = String(value || "").trim();
    if (!icon) {
      return "";
    }
    const cleanIcon = icon.replace(/[^A-Za-z0-9_./-]/g, "").replace(/\.svg$/i, "");
    let src;
    if (cleanIcon && !cleanIcon.includes("..")) {
      if (cleanIcon.includes("/")) {
        src = `${cleanIcon}.svg`;
      } else {
        src = `public/tabler/icons/outline/${cleanIcon}.svg`;
      }
    } else {
      src = "";
    }
    const iconColor = getSafeHexColor(color);
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

  // === PAINEL DE PROPRIEDADES ===
  // renderProperties: decide qual formulario mostrar (pagina, linha, componente).
  // renderComponentProperties: monta os grupos e campos do painel lateral.
  // getComponentPropertySchema: busca campos em components.json (propertySets + properties).
  // getFallbackPropertySchema: esquema fixo para componentes sem definicao em components.json.
  function renderProperties() {
    const node = findNode(state.selectedId);

    if (!node) {
      els.propertiesForm.innerHTML = '<div class="properties-empty">Nada selecionado</div>';
      return;
    }

    if (node.type === "page") {
      els.propertiesForm.innerHTML = renderPageProperties(node);
      return;
    }

    if (node.type === "row") {
      const location = findRowLocation(node.id);
      if (location && isFieldListComponent(location.card)) {
        els.propertiesForm.innerHTML = renderFieldListRowProperties(node, location.card);
        return;
      }
      els.propertiesForm.innerHTML = renderRowProperties(node);
      return;
    }

    els.propertiesForm.innerHTML = renderComponentProperties(node);
    initializeIconSelects();
  }

  function renderPageProperties(page) {
    const menuLayout = page.props.menuLayout || "none";
    const showPositionAndTheme = menuLayout !== "none";
    const showNavbarOptions = menuLayout === "horizontal" || menuLayout === "combo";
    const showSidebarOptions = menuLayout === "vertical" || menuLayout === "combo";
    return [
      '<section class="property-group"><h3>Pagina</h3>',
      fieldInput("Titulo do documento", "title", page.props.title || "Pagina"),
      '</section>',
      '<section class="property-group"><h3>Menu de navegacao</h3>',
      fieldSelect("Tipo de layout", "menuLayout", menuLayout, [
        ["none", "Nenhum"],
        ["horizontal", "Superior (navbar)"],
        ["vertical", "Lateral (sidebar)"],
        ["combo", "Lateral + Superior"],
        ["combo-pill", "Pill + Icone lateral (moderno)"]
      ]),
      showPositionAndTheme ? fieldSelect("Tema", "menuTheme", page.props.menuTheme || "dark", [
        ["dark", "Escuro"],
        ["light", "Claro"]
      ]) : "",
      showSidebarOptions ? fieldSelect("Posicao do sidebar", "menuPosition", page.props.menuPosition || "left", [
        ["left", "Esquerda"],
        ["right", "Direita"]
      ]) : "",
      showSidebarOptions ? fieldSelect("Largura do sidebar", "menuSidebarWidth", page.props.menuSidebarWidth || "normal", [
        ["compact", "Compacto (so icones)"],
        ["normal", "Normal (220px)"],
        ["wide", "Largo (280px)"]
      ]) : "",
      showNavbarOptions ? fieldCheckbox("Navbar fixa no scroll (sticky)", "menuSticky", page.props.menuSticky) : "",
      '</section>'
    ].join("");
  }

  function renderRowProperties(row) {
    const columnFields = row.columns.map((column, index) => {
      return [
        fieldSelect(`Coluna ${index + 1}`, "span-" + column.id, column.props.span, getColumnSpanOptions(), `data-column-span="${column.id}"`),
        fieldInput(`Classe CSS coluna ${index + 1}`, "class-" + column.id, getColumnClass(column), "text", `data-column-class="${column.id}"`)
      ].join("");
    }).join("");

    return [
      fieldInput("Nome", "label", row.props.label || ""),
      fieldInput("Classe CSS da linha", "cssClass", getRowClass(row)),
      fieldSelect("Quantidade de colunas", "columnCount", row.columns.length, getColumnCountOptions(), `data-row-columns="${row.id}"`),
      columnFields,
      propertyActions()
    ].join("");
  }

  function renderFieldListRowProperties(row, fieldList) {
    const rows = getRowContainerRows(fieldList) || [];
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
      { label: "Classe CSS", prop: "cssClass", field: "text", group: "Aparencia", value: getComponentClass(component) }
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
    const definition = getComponentDefinition(component.type);
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
    return getFallbackPropertySchema(definition);
  }

  function getComponentPropertySets(definition) {
    let registrySets;
    if (state.componentRegistry && state.componentRegistry.propertySets) {
      registrySets = state.componentRegistry.propertySets;
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

  function getFallbackPropertySchema(definition) {
    const kind = definition.kind;
    const commonField = (label, prop, field) => ({ label, prop, field: field || "text" });
    const labelNameHelp = [
      commonField("Label", "label"),
      commonField("Nome", "name"),
      commonField("Obrigatorio", "required", "checkbox"),
      commonField("Ajuda", "help")
    ];
    const actionItemFields = [
      { label: "Tipo", prop: "type", field: "select", default: "button", options: [["button", "Botao"], ["link", "Link"]] },
      { label: "Texto", prop: "text", field: "text", default: "Nova acao" },
      { label: "Icone Tabler", prop: "icon", field: "icon", default: "" },
      { label: "Cor do icone (hex)", prop: "iconColor", field: "text", default: "", placeholder: "#206bc4", pattern: "^#[0-9A-Fa-f]{6}$" },
      { label: "Posicao do icone", prop: "iconPosition", field: "select", default: "left", options: [["left", "Esquerda"], ["right", "Direita"]] },
      { label: "Href", prop: "href", field: "text", default: "#" },
      { label: "ID", prop: "id", field: "text", default: "" },
      { label: "Classe CSS", prop: "cssClass", field: "text", default: "btn btn-outline-secondary" },
      { label: "Acao FieldList", prop: "fieldListAction", field: "select", default: "", options: [["", "Nenhuma"], ["clone", "Clonar linha"], ["remove", "Remover linha"]] },
      { label: "Buscar JSON via AJAX", prop: "ajaxEnabled", field: "checkbox", default: false },
      { label: "URL AJAX", prop: "ajaxUrlTemplate", field: "text", default: "https://viacep.com.br/ws/{{value}}/json" },
      { label: "Metodo AJAX", prop: "ajaxMethod", field: "select", default: "GET", options: [["GET", "GET"], ["POST", "POST"]] },
      { label: "Mapeamentos JSON", prop: "ajaxMappings", field: "keyvalue", default: [{ key: "logradouro", value: "cliente_rua" }, { key: "bairro", value: "cliente_bairro" }], keyLabel: "Caminho JSON", valueLabel: "Campo destino", addLabel: "Adicionar mapeamento", keyPrefix: "atributo" }
    ];
    const dropdownItemFields = [
      { label: "Texto", prop: "text", field: "text", default: "Novo item" },
      { label: "Icone Tabler", prop: "icon", field: "icon", default: "" },
      { label: "Cor do icone (hex)", prop: "iconColor", field: "text", default: "", placeholder: "#206bc4", pattern: "^#[0-9A-Fa-f]{6}$" },
      { label: "Posicao do icone", prop: "iconPosition", field: "select", default: "left", options: [["left", "Esquerda"], ["right", "Direita"]] },
      { label: "Href", prop: "href", field: "text", default: "#" },
      { label: "ID", prop: "id", field: "text", default: "" },
      { label: "Classe CSS", prop: "cssClass", field: "text", default: "dropdown-item" },
      { label: "Acao FieldList", prop: "fieldListAction", field: "select", default: "", options: [["", "Nenhuma"], ["clone", "Clonar linha"], ["remove", "Remover linha"]] },
      { label: "Buscar JSON via AJAX", prop: "ajaxEnabled", field: "checkbox", default: false },
      { label: "URL AJAX", prop: "ajaxUrlTemplate", field: "text", default: "https://viacep.com.br/ws/{{value}}/json" },
      { label: "Metodo AJAX", prop: "ajaxMethod", field: "select", default: "GET", options: [["GET", "GET"], ["POST", "POST"]] },
      { label: "Mapeamentos JSON", prop: "ajaxMappings", field: "keyvalue", default: [{ key: "logradouro", value: "cliente_rua" }, { key: "bairro", value: "cliente_bairro" }], keyLabel: "Caminho JSON", valueLabel: "Campo destino", addLabel: "Adicionar mapeamento", keyPrefix: "atributo" }
    ];
    const tableColumnFields = [
      { label: "Titulo", prop: "label", field: "text", default: "Nova coluna" },
      { label: "Campo data", prop: "data", field: "text", default: "" },
      { label: "Classe CSS TH", prop: "thClass", field: "text", default: "" },
      { label: "Classe CSS TD", prop: "tdClass", field: "text", default: "" },
      { label: "Largura", prop: "width", field: "text", default: "" }
    ];

    if (kind === "input") {
      return [
        commonField("Label", "label"),
        commonField("ID", "inputId"),
        commonField("Nome", "name"),
        commonField("Placeholder", "placeholder"),
        commonField("Valor", "value"),
        commonField("Minimo", "min"),
        commonField("Maximo", "max"),
        commonField("Step", "step"),
        commonField("Maxlength", "maxLength"),
        { label: "Template de expressao", prop: "_patternPicker", field: "pattern-picker" },
        commonField("Expressao de validacao", "pattern"),
        commonField("Autocomplete", "autocomplete"),
        commonField("Mascara (data-mask)", "dataMask"),
        commonField("Exibir mascara", "dataMaskVisible", "checkbox"),
        commonField("Atributos personalizados", "customAttributes", "attributes"),
        commonField("Obrigatorio", "required", "checkbox"),
        commonField("Ajuda", "help")
      ];
    }

    if (kind === "hiddenInput") {
      return [
        commonField("ID", "inputId"),
        commonField("Nome", "name"),
        commonField("Valor", "value"),
        commonField("Atributos personalizados", "customAttributes", "attributes")
      ];
    }

    if (kind === "formContainer") {
      return [
        commonField("ID do formulario", "formId"),
        commonField("Action", "action"),
        { label: "Method", prop: "method", field: "select", options: [["post", "POST"], ["get", "GET"], ["dialog", "Dialog"]] },
        { label: "Enctype", prop: "enctype", field: "select", options: [["", "Padrao"], ["application/x-www-form-urlencoded", "application/x-www-form-urlencoded"], ["multipart/form-data", "multipart/form-data"], ["text/plain", "text/plain"]] },
        { label: "Target", prop: "target", field: "select", options: [["", "Mesma aba"], ["_self", "_self"], ["_blank", "_blank"], ["_parent", "_parent"], ["_top", "_top"]] },
        { label: "Autocomplete", prop: "autocomplete", field: "select", options: [["off", "Off"], ["on", "On"]] },
        commonField("Novalidate", "novalidate", "checkbox")
      ];
    }

    if (kind === "textarea") {
      return [
        commonField("Label", "label"),
        commonField("ID", "inputId"),
        commonField("Nome", "name"),
        commonField("Placeholder", "placeholder"),
        commonField("Linhas", "rows", "number"),
        commonField("Atributos personalizados", "customAttributes", "attributes"),
        commonField("Obrigatorio", "required", "checkbox"),
        commonField("Ajuda", "help")
      ];
    }

    if (kind === "select" || kind === "choice") {
      return [
        commonField("Label", "label"),
        commonField("ID", kind === "select" ? "selectId" : "inputId"),
        commonField("Nome", "name"),
        commonField("Opcoes", "options", "keyvalue"),
        commonField("Obrigatorio", "required", "checkbox"),
        commonField("Ajuda", "help")
      ];
    }

    if (kind === "button") {
      return [
        commonField("Texto", "text"),
        commonField("Icone Tabler", "icon", "icon"),
        { label: "Cor do icone (hex)", prop: "iconColor", field: "text", placeholder: "#206bc4", pattern: "^#[0-9A-Fa-f]{6}$" },
        { label: "Posicao do icone", prop: "iconPosition", field: "select", options: [["left", "Esquerda"], ["right", "Direita"]] },
        { label: "Tipo", prop: "buttonType", field: "select", options: [["button", "Button"], ["submit", "Submit"], ["reset", "Reset"]] },
        { label: "Cor", prop: "variant", field: "select", options: [["primary", "Primaria"], ["secondary", "Secundaria"], ["success", "Sucesso"], ["danger", "Perigo"]] },
        { label: "Alinhamento", prop: "align", field: "select", options: [["left", "Esquerda"], ["center", "Centro"], ["right", "Direita"]] },
        { label: "Acao FieldList", prop: "fieldListAction", field: "select", options: [["", "Nenhuma"], ["clone", "Clonar linha"], ["remove", "Remover linha"]] }
      ];
    }

    if (kind === "buttonDropdown") {
      return [
        commonField("Texto do botao", "buttonText"),
        commonField("Icone do botao", "buttonIcon", "icon"),
        { label: "Cor do icone (hex)", prop: "buttonIconColor", field: "text", placeholder: "#206bc4", pattern: "^#[0-9A-Fa-f]{6}$" },
        { label: "Posicao do icone", prop: "buttonIconPosition", field: "select", options: [["left", "Esquerda"], ["right", "Direita"]] },
        commonField("Classe CSS do botao", "buttonCssClass"),
        commonField("Classe CSS do menu", "menuCssClass"),
        { label: "Itens dropdown", prop: "items", field: "repeater", addLabel: "Adicionar item", itemFields: dropdownItemFields },
        { label: "Acoes ao lado", prop: "extraActions", field: "repeater", addLabel: "Adicionar acao", itemFields: actionItemFields }
      ];
    }

    if (kind === "inputSelectGroup") {
      return [
        commonField("Label", "label"),
        commonField("Tipo do input", "inputType"),
        commonField("ID input", "inputId"),
        commonField("Nome input", "inputName"),
        commonField("Classe CSS input", "inputCssClass"),
        commonField("Valor", "value"),
        commonField("Placeholder", "placeholder"),
        { label: "Posicao do select", prop: "selectPosition", field: "select", options: [["right", "Direita"], ["left", "Esquerda"]] },
        { label: "Template de expressao", prop: "_patternPicker", field: "pattern-picker" },
        commonField("Expressao de validacao", "pattern"),
        commonField("Atributos personalizados", "customAttributes", "attributes"),
        commonField("Mascara (data-mask)", "dataMask"),
        commonField("Exibir mascara", "dataMaskVisible", "checkbox"),
        commonField("ID select", "selectId"),
        commonField("Nome select", "selectName"),
        commonField("Classe CSS select", "selectCssClass"),
        commonField("Opcoes", "options", "keyvalue")
      ];
    }

    if (kind === "quantityStepper") {
      return [
        commonField("Largura", "width"),
        commonField("ID input", "inputId"),
        commonField("Nome input", "inputName"),
        commonField("Classe CSS input", "inputCssClass"),
        commonField("Permitir negativo", "allowNegative", "checkbox"),
        commonField("Minimo", "min"),
        commonField("Step", "step"),
        commonField("Valor", "value"),
        { label: "Template de expressao", prop: "_patternPicker", field: "pattern-picker" },
        commonField("Expressao de validacao", "pattern"),
        commonField("Atributos personalizados", "customAttributes", "attributes"),
        commonField("Texto botao menos", "minusText"),
        commonField("Icone botao menos", "minusIcon", "icon"),
        { label: "Cor icone botao menos (hex)", prop: "minusIconColor", field: "text", placeholder: "#206bc4", pattern: "^#[0-9A-Fa-f]{6}$" },
        commonField("Classe CSS botao menos", "minusCssClass"),
        commonField("Texto botao mais", "plusText"),
        commonField("Icone botao mais", "plusIcon", "icon"),
        { label: "Cor icone botao mais (hex)", prop: "plusIconColor", field: "text", placeholder: "#206bc4", pattern: "^#[0-9A-Fa-f]{6}$" },
        commonField("Classe CSS botao mais", "plusCssClass")
      ];
    }

    if (kind === "inputButtonGroup") {
      return [
        commonField("Label", "label"),
        commonField("Tipo input", "inputType"),
        commonField("ID input", "inputId"),
        commonField("Nome input", "inputName"),
        commonField("Classe CSS input", "inputCssClass"),
        commonField("Placeholder", "placeholder"),
        commonField("Valor", "value"),
        commonField("Maxlength", "maxLength"),
        commonField("Autocomplete", "autocomplete"),
        { label: "Posicao dos botoes", prop: "buttonsPosition", field: "select", options: [["right", "Direita"], ["left", "Esquerda"]] },
        { label: "Template de expressao", prop: "_patternPicker", field: "pattern-picker" },
        commonField("Expressao de validacao", "pattern"),
        commonField("Atributos personalizados", "customAttributes", "attributes"),
        commonField("Mascara (data-mask)", "dataMask"),
        commonField("Exibir mascara", "dataMaskVisible", "checkbox"),
        { label: "Botoes", prop: "buttons", field: "repeater", addLabel: "Adicionar botao", itemFields: actionItemFields },
        commonField("Feedback invalido", "invalidFeedback")
      ];
    }

    if (kind === "heading") {
      return [
        commonField("Texto", "text"),
        { label: "Nivel", prop: "level", field: "select", options: [["h1", "H1"], ["h2", "H2"], ["h3", "H3"]] }
      ];
    }

    if (kind === "paragraph") {
      return [commonField("Texto", "text", "textarea")];
    }

    if (kind === "element") {
      return [commonField("Texto", "text", "textarea")];
    }

    if (kind === "label") {
      return [commonField("Texto", "text"), commonField("For", "forId")];
    }

    if (kind === "list") {
      return [{ label: "Itens", prop: "items", field: "repeater", addLabel: "Adicionar item", itemFields: [{ label: "Texto", prop: "text", field: "text", default: "Novo item" }] }];
    }

    if (kind === "breadcrumb") {
      return [
        commonField("Aria label", "ariaLabel"),
        {
          label: "Itens",
          prop: "items",
          field: "repeater",
          addLabel: "Adicionar item",
          itemFields: [
            { label: "Texto", prop: "text", field: "text", default: "Novo item" },
            { label: "Href", prop: "href", field: "text", default: "#" },
            { label: "Classe CSS", prop: "cssClass", field: "text", default: "breadcrumb-item" },
            { label: "Ativo", prop: "active", field: "checkbox", default: false }
          ]
        }
      ];
    }

    if (kind === "link") {
      return [
        commonField("Texto", "text"),
        commonField("Href", "href"),
        { label: "Target", prop: "target", field: "select", options: [["", "Mesma aba"], ["_blank", "Nova aba"]] }
      ];
    }

    if (kind === "image") {
      return [commonField("URL", "src"), commonField("Alt", "alt"), commonField("Largura", "width")];
    }

    if (kind === "card") {
      return [commonField("Titulo", "title"), commonField("Conteudo", "content", "textarea")];
    }

    if (kind === "cardCustom") {
      return [
        commonField("Classe CSS do titulo", "headerCssClass"),
        commonField("Classe CSS do conteudo", "bodyCssClass")
      ];
    }

    if (kind === "kpi") {
      return [
        commonField("Titulo", "label"),
        commonField("Valor", "value"),
        commonField("ID do valor", "valueId"),
        commonField("Usar corpo", "bodyWrapper", "checkbox"),
        commonField("Classe CSS do corpo", "bodyCssClass"),
        commonField("Classe CSS do titulo", "labelCssClass"),
        commonField("Classe CSS do valor", "valueCssClass")
      ];
    }

    if (kind === "html") {
      return [{ label: "HTML", prop: "html", field: "textarea", rows: 10 }];
    }

    if (kind === "table") {
      return [
        { label: "Colunas", prop: "columns", field: "repeater", addLabel: "Adicionar coluna", itemFields: tableColumnFields },
        { label: "Linhas", prop: "rows", field: "matrix", columnsProp: "columns", addLabel: "Adicionar linha" }
      ];
    }

    if (kind === "datatable") {
      return [
        commonField("Titulo do card", "cardTitle"),
        commonField("Descricao", "description"),
        commonField("ID da tabela", "tableId"),
        commonField("URL dos dados JSON", "ajaxUrl"),
        commonField("Processamento server-side", "serverSide", "checkbox"),
        { label: "Metodo AJAX", prop: "ajaxMethod", field: "select", options: [["GET", "GET"], ["POST", "POST"]] },
        { label: "Formato do corpo POST", prop: "ajaxBodyFormat", field: "select", options: [["form", "Form URL-encoded"], ["json", "JSON"]] },
        commonField("JSON path dos registros", "ajaxDataSrc"),
        { label: "Autenticacao", prop: "ajaxAuthType", field: "select", options: [["none", "Nenhuma"], ["bearer", "Bearer token"], ["header", "Chave em header"]] },
        commonField("Token / chave", "ajaxAuthToken"),
        commonField("Nome do header da chave", "ajaxAuthHeader"),
        { label: "Headers extras", prop: "ajaxHeaders", field: "keyvalue", keyLabel: "Header", valueLabel: "Valor", addLabel: "Adicionar header", keyPrefix: "header" },
        { label: "Colunas", prop: "columns", field: "repeater", addLabel: "Adicionar coluna", itemFields: tableColumnFields },
        { label: "Linhas", prop: "rows", field: "matrix", columnsProp: "columns", addLabel: "Adicionar linha" },
        commonField("Registros por pagina", "pageLength", "number"),
        commonField("Responsiva", "responsive", "checkbox"),
        commonField("Reordenar colunas", "colReorder", "checkbox"),
        commonField("Botao de colunas", "buttons", "checkbox"),
        commonField("Busca", "searching", "checkbox"),
        commonField("Seletor de quantidade", "lengthChange", "checkbox"),
        commonField("Texto vazio", "emptyText")
      ];
    }

    if (kind === "tomSelect") {
      return [
        commonField("Label", "label"),
        commonField("ID", "selectId"),
        commonField("Nome", "name"),
        commonField("Placeholder", "placeholder"),
        commonField("Opcao vazia", "emptyOptionText"),
        commonField("Opcoes locais", "options", "keyvalue"),
        commonField("URL AJAX", "ajaxUrl"),
        commonField("JSON path", "jsonPath"),
        commonField("Obrigatorio", "required", "checkbox"),
        commonField("Multiplo", "multiple", "checkbox"),
        commonField("Permitir criar", "create", "checkbox"),
        commonField("URL do formulario de criacao", "createUrl"),
        commonField("Campo valor", "valueField"),
        commonField("Campo texto", "labelField"),
        commonField("Campo busca", "searchField"),
        commonField("Feedback invalido", "invalidFeedback")
      ];
    }

    return [];
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
    if (!field.showWhen || !field.showWhen.prop) {
      return true;
    }
    const actual = props[field.showWhen.prop];
    const expected = field.showWhen.equals;
    if (typeof expected === "boolean") {
      return toBooleanValue(actual) === expected;
    }
    return String(actual == null ? "" : actual) === String(expected);
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
    if (hasOwn(field, "value")) {
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

  function iconSelectControl(label, inputId, value, dataAttrs) {
    const selectedIcon = String(value || "");
    let selectedOption;
    if (selectedIcon) {
      selectedOption = `<option value="${escapeAttr(selectedIcon)}" selected>${escapeHtml(selectedIcon)}</option>`;
    } else {
      selectedOption = "";
    }
    return [
      '<div class="field icon-select-field">',
      `  <label class="form-label" for="${escapeAttr(inputId)}">${escapeHtml(label)}</label>`,
      `  <select id="${escapeAttr(inputId)}" class="form-select" data-icon-select ${dataAttrs || ""}>`,
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

    els.propertiesForm.querySelectorAll("select[data-icon-select]").forEach((select) => {
      if (select.tomselect) {
        return;
      }
      const currentValue = select.value;
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
          const icons = state.tablerIcons;
          let results;
          if (q) {
            results = icons.filter((icon) => icon.includes(q));
          } else {
            results = icons;
          }
          callback(results.slice(0, 50).map((icon) => ({ value: icon, text: icon })));
        },
        render: {
          option: renderIconSelectOption,
          item: renderIconSelectOption
        },
        onChange: function () {
          select.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
    });
  }

  function renderIconSelectOption(data, escape) {
    const icon = String(data.value || "").replace(/[^A-Za-z0-9_-]/g, "");
    if (!icon) {
      return `<div>${escape(data.text || "Sem icone")}</div>`;
    }
    const src = `public/tabler/icons/outline/${icon}.svg`;
    const maskStyle = `-webkit-mask-image:url(&quot;${src}&quot;);mask-image:url(&quot;${src}&quot;)`;
    return `<div class="icon-select-option"><span class="icon-select-preview" style="${maskStyle}"></span><span>${escape(data.text)}</span></div>`;
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
          if (hasOwn(option, "key")) {
            value = option.key;
          } else {
            value = option.value;
          }
          let label;
          if (hasOwn(option, "label")) {
            label = option.label;
          } else {
            if (hasOwn(option, "text")) {
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
      if (hasOwn(itemField, "default")) {
        item[itemField.prop] = deepClone(itemField.default);
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
    if (field.field === "keyvalue" || field.field === "attributes") {
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
    if (prop === "columns" && isFieldListComponent(node) && !items.length) {
      items.push({
        label: "Coluna 1",
        thClass: "",
        tdClass: "",
        width: ""
      });
    }
    node.props[prop] = items;
    if (prop === "columns") {
      if (isFieldListComponent(node)) {
        let changedIndex;
        if (action === "add") {
          changedIndex = items.length - 1;
        } else {
          changedIndex = index;
        }
        syncFieldListRows(node, action, changedIndex);
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

  function fieldMatrix(field, props) {
    const columns = ensureTableColumns(parseTableColumns(props[field.columnsProp || "columns"]));
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
      const columns = ensureTableColumns(parseTableColumns(node.props[button.dataset.matrixColumnsProp || "columns"]));
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
    const count = getAllRows().reduce((total, row) => {
      return total + row.columns.reduce((sum, column) => sum + column.children.length, 0);
    }, 0);
    els.summary.textContent = `${count} componente${count === 1 ? "" : "s"}`;
    syncPageName();
  }

  function syncPageName() {
    if (els.pageName && document.activeElement !== els.pageName) {
      els.pageName.value = state.page.name || "";
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
    if (page.props.menuSticky === undefined) page.props.menuSticky = false;
    page.props.menuSidebarWidth = page.props.menuSidebarWidth || "normal";
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
    if (["input", "textarea", "iconInput", "separatedInput", "helpInput", "floatingInput", "datePicker", "selectGroup", "paymentMethod", "buttonGroup"].includes(definition.kind)) {
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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      toast("Nao ha versao salva");
      return;
    }

    try {
      state.page = normalizePage(JSON.parse(saved));
      state.selectedId = null;
      state.selectedSection = null;
      commitHistory();
      render();
      toast("Carregado");
    } catch (error) {
      toast("JSON salvo invalido");
    }
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
      normalizeKeyValueEntries,
      renderComponentHtml,
      renderHiddenInputHtml,
      sanitizeElementId,
      state,
      toBooleanValue,
      toJsLiteral,
      toJsString,
      toPositiveInteger
    };
  }

  // === HISTORICO DE UNDO / REDO ===
  // commitHistory: salva snapshot JSON do state.page no array history.
  // debounceHistory: versao com delay de 300ms para nao criar snapshot a cada tecla.
  // undo / redo: restaura estado anterior ou futuro do array history/future.
  let historyTimer = null;

  function debounceHistory() {
    window.clearTimeout(historyTimer);
    historyTimer = window.setTimeout(commitHistory, 300);
  }

  function commitHistory() {
    window.clearTimeout(historyTimer);
    const snapshot = JSON.stringify(state.page);
    if (state.history[state.history.length - 1] === snapshot) {
      return;
    }
    state.history.push(snapshot);
    if (state.history.length > HISTORY_LIMIT) {
      state.history.shift();
    }
    state.future = [];
  }

  function undo() {
    if (state.history.length <= 1) {
      return;
    }
    const current = state.history.pop();
    state.future.push(current);
    state.page = normalizePage(JSON.parse(state.history[state.history.length - 1]));
    state.selectedId = null;
    state.selectedSection = null;
    render();
  }

  function redo() {
    if (!state.future.length) {
      return;
    }
    const next = state.future.pop();
    state.history.push(next);
    state.page = normalizePage(JSON.parse(next));
    state.selectedId = null;
    state.selectedSection = null;
    render();
  }

  // === PARSERS DE DADOS ===
  // Normalizam os dados armazenados em props para o formato canonico esperado pelos renderers.
  // Todos sao tolerantes a falha: aceitam array, objeto, string ou undefined.
  // parseOptions: [{value, label, selected, disabled}]
  // parseChoiceItems: [{value, label, description, checked, disabled}]
  // parseTableColumns / parseTableRows: colunas e linhas de tabela/datatable/fieldlist.
  // parseDropdownItems / parseDropdownActions: itens de dropdown e acoes extras de botao.

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
          text: String(action.text || `Acao ${index + 1}`),
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
