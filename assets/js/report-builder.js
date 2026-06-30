(function () {
  "use strict";

  const STORAGE_KEY = "report_builder_v1";
  const HISTORY_LIMIT = 60;

  // =====================================================
  // STATE
  // =====================================================
  const state = {
    selectedId: null,
    report: createDefaultReport(),
    history: [],
    future: []
  };

  const els = {};
  let historyTimer = null;
  let exportFormat = "html";

  // Tamanhos de pagina. Nomeados usam keyword CSS @page; termicos (cupom) emitem
  // "{largura}mm {altura}mm". w/h em mm (h dos termicos vem de pageSettings.thermalHeight).
  const PAGE_SIZES = {
    A4:      { label: "A4 (210 × 297 mm)",      css: "A4",     w: 210, h: 297 },
    Letter:  { label: "Carta / Letter",          css: "Letter", w: 216, h: 279 },
    Legal:   { label: "Oficio / Legal",          css: "Legal",  w: 216, h: 356 },
    A3:      { label: "A3 (297 × 420 mm)",       css: "A3",     w: 297, h: 420 },
    A5:      { label: "A5 (148 × 210 mm)",       css: "A5",     w: 148, h: 210 },
    cupom80: { label: "Cupom 80 mm (termico)",   thermal: true, w: 80 },
    cupom58: { label: "Cupom 58 mm (termico)",   thermal: true, w: 58 },
    cupom50: { label: "Cupom 50 mm (termico)",   thermal: true, w: 50 }
  };
  const PX_PER_MM = 96 / 25.4;

  function getPageSizeDef() {
    return PAGE_SIZES[state.report.pageSettings.size] || PAGE_SIZES.A4;
  }

  // Dimensoes do papel em mm, respeitando orientacao (nomeados) e altura termica (cupom).
  function getPaperDims() {
    const ps = state.report.pageSettings;
    const def = getPageSizeDef();
    if (def.thermal) {
      return { w: def.w, h: parseFloat(ps.thermalHeight) || 297 };
    }
    let w = def.w, h = def.h;
    if (ps.orientation === "landscape") { const t = w; w = h; h = t; }
    return { w: w, h: h };
  }

  function createDefaultReport() {
    return {
      name: "Novo Relatorio",
      pageSettings: {
        size: "A4",
        orientation: "portrait",
        thermalHeight: "297",
        marginTop: "15",
        marginRight: "10",
        marginBottom: "20",
        marginLeft: "10",
        fontFamily: "Arial, sans-serif",
        fontSize: "10",
        primaryColor: "#206bc4",
        tableHeaderTextColor: "#ffffff",
        lineColor: "#dddddd",
        stripedRows: true
      },
      pageHeader: {
        showLogo: false,
        logoUrl: "",
        logoHeight: "40",
        companyName: "Nome da Empresa",
        reportTitle: "Relatorio",
        reportSubtitle: "",
        showDate: true,
        height: "20"
      },
      pageFooter: {
        leftText: "",
        showPageNum: true,
        rightText: "",
        height: "10"
      },
      sections: []
    };
  }

  // =====================================================
  // SECTION DEFINITIONS
  // =====================================================
  const SECTION_TYPES = {
    reportInfo: {
      label: "Informacoes",
      badge: "INFO",
      badgeClass: "badge-info",
      defaultProps: function () {
        return {
          title: "Informacoes do Relatorio",
          showTitle: true,
          style: {},
          rows: [
            { label: "Periodo", placeholder: "PERIODO" },
            { label: "Filtro", placeholder: "FILTRO" }
          ]
        };
      }
    },
    dataTable: {
      label: "Tabela de Dados",
      badge: "TABELA",
      badgeClass: "badge-table",
      defaultProps: function () {
        return {
          title: "Dados",
          showTitle: true,
          style: {},
          columns: [
            { label: "Coluna 1", placeholder: "col_1", width: "", align: "left" },
            { label: "Coluna 2", placeholder: "col_2", width: "", align: "left" },
            { label: "Valor", placeholder: "col_valor", width: "80", align: "right" }
          ],
          showFooter: false,
          footerRows: [
            { label: "Total:", placeholder: "TOTAL", align: "right" }
          ]
        };
      }
    },
    summary: {
      label: "Resumo / Totais",
      badge: "RESUMO",
      badgeClass: "badge-sum",
      defaultProps: function () {
        return {
          title: "Resumo",
          showTitle: false,
          style: {},
          rows: [
            { label: "Total Geral:", placeholder: "TOTAL_GERAL", bold: true },
            { label: "Quantidade:", placeholder: "QTD_ITENS", bold: false }
          ]
        };
      }
    },
    divider: {
      label: "Divisor",
      badge: "DIVISOR",
      badgeClass: "badge-div",
      defaultProps: function () {
        return { color: "#dddddd", thickness: "1" };
      }
    },
    customHtml: {
      label: "HTML Livre",
      badge: "HTML",
      badgeClass: "badge-html",
      defaultProps: function () {
        return { content: "<!-- Digite seu HTML ou texto aqui -->" };
      }
    },
    qrCode: {
      label: "QR Code",
      badge: "QRCODE",
      badgeClass: "badge-qr",
      defaultProps: function () {
        return {
          srcToken: "QRCODE_SRC",
          size: "30",
          align: "center",
          caption: "",
          style: {}
        };
      }
    },
    barcode: {
      label: "Codigo de Barras",
      badge: "BARRAS",
      badgeClass: "badge-barcode",
      defaultProps: function () {
        return {
          srcToken: "BARCODE_SRC",
          symbology: "CODE128",
          widthMode: "full",
          width: "60",
          height: "15",
          align: "center",
          caption: "",
          showCaption: false,
          style: {}
        };
      }
    },
    gridTable: {
      label: "Tabela de Layout",
      badge: "GRADE",
      badgeClass: "badge-grid",
      defaultProps: function () {
        return createGridTableProps(2, 2);
      }
    }
  };

  function uid() {
    return "s" + Math.random().toString(36).slice(2, 9);
  }

  // ---- Modelo recursivo da Tabela de Layout (grid) ----
  function createCell() {
    return { id: uid(), align: "left", valign: "top", bg: "", blocks: [] };
  }

  function createGridTableProps(rows, cols) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) row.push(createCell());
      grid.push(row);
    }
    return {
      style: {},
      border: true,
      borderColor: "#333333",
      cellPadding: "4",
      width: "full",
      rows: grid
    };
  }

  function createBlock(type) {
    const props = blockDefaultProps(type);
    return { id: uid(), type: type, props: props };
  }

  function blockDefaultProps(type) {
    switch (type) {
      case "text":    return { content: "Texto", align: "left", bold: false, size: "" };
      case "image":   return { srcToken: "IMG_SRC", width: "", height: "", align: "left", alt: "" };
      case "link":    return { text: "Link", href: "#", align: "left" };
      case "qrcode":  return { srcToken: "QRCODE_SRC", size: "20", align: "center", caption: "" };
      case "barcode": return { srcToken: "BARCODE_SRC", symbology: "CODE128", widthMode: "full", width: "40", height: "12", align: "center", caption: "", showCaption: false };
      case "table":   return createGridTableProps(1, 2);
      default:        return {};
    }
  }

  const BLOCK_LABELS = {
    text: "Texto", image: "Imagem", link: "Link",
    qrcode: "QR Code", barcode: "Cod. Barras", table: "Tabela aninhada"
  };

  // Busca recursiva de celula ou bloco por id (atravessa tabelas aninhadas).
  function findNode(id) {
    const sections = state.report.sections;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].type === "gridTable") {
        const hit = findInTable(sections[i].props, id);
        if (hit) return hit;
      }
    }
    return null;
  }

  function findInTable(tp, id) {
    const rows = (tp && tp.rows) || [];
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const cell = rows[r][c];
        if (cell.id === id) return { kind: "cell", node: cell, table: tp };
        const blocks = cell.blocks || [];
        for (let b = 0; b < blocks.length; b++) {
          const blk = blocks[b];
          if (blk.id === id) return { kind: "block", node: blk, parentArray: blocks, index: b, cell: cell };
          if (blk.type === "table") {
            const deep = findInTable(blk.props, id);
            if (deep) return deep;
          }
        }
      }
    }
    return null;
  }

  // Retorna o tableProps de uma secao gridTable OU de um bloco-tabela aninhado, por id.
  function findTableProps(id) {
    const sec = state.report.sections.find(function (s) { return s.id === id; });
    if (sec && sec.type === "gridTable") return sec.props;
    const hit = findNode(id);
    if (hit && hit.kind === "block" && hit.node.type === "table") return hit.node.props;
    return null;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return String(str || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // =====================================================
  // INIT
  // =====================================================
  function init() {
    els.paperCanvas     = document.getElementById("paper-canvas");
    els.paperHeaderZone = document.getElementById("paper-header-zone");
    els.paperFooterZone = document.getElementById("paper-footer-zone");
    els.paperBodyZone   = document.getElementById("paper-body-zone");
    els.paperBodyEmpty  = document.getElementById("paper-body-empty");
    els.sectionsContainer = document.getElementById("sections-container");
    els.headerPreview   = document.getElementById("header-preview");
    els.footerPreview   = document.getElementById("footer-preview");
    els.propertiesForm  = document.getElementById("rpt-properties-form");
    els.pageInfo        = document.getElementById("rpt-page-info");
    els.sectionCount    = document.getElementById("rpt-section-count");
    els.exportOutput    = document.getElementById("export-output");
    els.exportDialog    = document.getElementById("export-dialog");

    loadFromStorage();
    bindEvents();
    resetHistory();
    render();
  }

  // =====================================================
  // PERSISTENCE
  // =====================================================
  function saveToStorage(silent) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.report));
      if (!silent) showToast("Salvo");
    } catch (e) {
      showToast("Erro ao salvar");
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        state.report = normalizeReport(saved);
        showToast("Carregado");
      }
    } catch (e) {
      state.report = createDefaultReport();
    }
  }

  function normalizeReport(r) {
    const def = createDefaultReport();
    r.pageSettings = Object.assign({}, def.pageSettings, r.pageSettings || {});
    r.pageHeader   = Object.assign({}, def.pageHeader,   r.pageHeader   || {});
    r.pageFooter   = Object.assign({}, def.pageFooter,   r.pageFooter   || {});
    if (!Array.isArray(r.sections)) r.sections = [];
    r.sections.forEach(function (s) {
      if (!s.props) s.props = {};
      if (!s.props.style || typeof s.props.style !== "object") s.props.style = {};
      if (s.type === "gridTable") normalizeTableProps(s.props);
    });
    return r;
  }

  // Garante ids em celulas/blocos e estrutura de grade (recursivo p/ tabelas aninhadas).
  function normalizeTableProps(tp) {
    if (!tp || !Array.isArray(tp.rows)) { if (tp) tp.rows = []; return; }
    tp.rows.forEach(function (row) {
      if (!Array.isArray(row)) return;
      row.forEach(function (cell) {
        if (!cell.id) cell.id = uid();
        if (!Array.isArray(cell.blocks)) cell.blocks = [];
        cell.blocks.forEach(function (blk) {
          if (!blk.id) blk.id = uid();
          if (!blk.props) blk.props = {};
          if (blk.type === "table") normalizeTableProps(blk.props);
        });
      });
    });
  }

  // =====================================================
  // HISTORICO (UNDO / REDO)
  // =====================================================
  // commitHistory: salva snapshot JSON de state.report (com dedupe e limite).
  // debounceHistory: versao com atraso de 300ms para nao gravar a cada tecla.
  // resetHistory: reinicia o historico com o estado atual (contexto novo).
  function commitHistory() {
    clearTimeout(historyTimer);
    const snap = JSON.stringify(state.report);
    if (state.history[state.history.length - 1] === snap) return;
    state.history.push(snap);
    if (state.history.length > HISTORY_LIMIT) state.history.shift();
    state.future = [];
    updateHistoryButtons();
  }

  function debounceHistory() {
    clearTimeout(historyTimer);
    historyTimer = setTimeout(commitHistory, 300);
  }

  function resetHistory() {
    clearTimeout(historyTimer);
    state.history = [JSON.stringify(state.report)];
    state.future = [];
    updateHistoryButtons();
  }

  function undo() {
    if (state.history.length <= 1) return;
    state.future.push(state.history.pop());
    state.report = normalizeReport(JSON.parse(state.history[state.history.length - 1]));
    state.selectedId = null;
    render();
  }

  function redo() {
    if (!state.future.length) return;
    const next = state.future.pop();
    state.history.push(next);
    state.report = normalizeReport(JSON.parse(next));
    state.selectedId = null;
    render();
  }

  function updateHistoryButtons() {
    if (els.undoBtn) els.undoBtn.disabled = state.history.length <= 1;
    if (els.redoBtn) els.redoBtn.disabled = state.future.length === 0;
  }

  // Abre o dialog de saida com o conteudo (HTML ou JSON), ajustando titulo e
  // rotulo do botao de download conforme o formato.
  function openExportDialog(format, content, title) {
    exportFormat = format;
    els.exportOutput.value = content;
    if (els.exportTitle) els.exportTitle.textContent = title;
    if (els.exportDownloadBtn) els.exportDownloadBtn.textContent = format === "json" ? "Baixar .json" : "Baixar .html";
    els.exportDialog.showModal();
  }

  // =====================================================
  // EVENTS
  // =====================================================
  function bindEvents() {
    document.getElementById("btn-new").addEventListener("click", function () {
      if (confirm("Criar novo relatorio? O relatorio atual sera perdido.")) {
        state.report = createDefaultReport();
        state.selectedId = null;
        resetHistory();
        render();
      }
    });

    document.getElementById("btn-save").addEventListener("click", function () { saveToStorage(); });
    document.getElementById("btn-load").addEventListener("click", function () {
      loadFromStorage();
      state.selectedId = null;
      resetHistory();
      render();
    });

    document.getElementById("btn-clear").addEventListener("click", function () {
      if (confirm("Limpar todas as secoes do corpo? Cabecalho, rodape e configuracoes sao mantidos.")) {
        state.report.sections = [];
        state.selectedId = null;
        commitHistory();
        // Persiste o estado limpo para que os dados nao voltem ao recarregar.
        saveToStorage(true);
        render();
      }
    });

    els.undoBtn = document.getElementById("btn-undo");
    els.redoBtn = document.getElementById("btn-redo");
    els.undoBtn.addEventListener("click", undo);
    els.redoBtn.addEventListener("click", redo);

    els.exportTitle = document.getElementById("export-title");
    els.exportDownloadBtn = document.getElementById("export-download");

    document.getElementById("btn-export").addEventListener("click", function () {
      openExportDialog("html", exportHtml(), "HTML Exportado (DOMPDF)");
    });

    document.getElementById("btn-export-json").addEventListener("click", function () {
      openExportDialog("json", JSON.stringify(state.report, null, 2), "JSON do Relatorio (para reimportar/editar)");
    });

    document.getElementById("btn-import").addEventListener("click", function () {
      els.importFile.click();
    });

    els.importFile = document.getElementById("rpt-import-file");
    els.importFile.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (ev) {
        try {
          const parsed = JSON.parse(ev.target.result);
          state.report = normalizeReport(parsed);
          state.selectedId = null;
          resetHistory();
          render();
          showToast("Relatorio importado");
        } catch (_) {
          showToast("JSON invalido");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });

    document.getElementById("export-copy").addEventListener("click", function () {
      navigator.clipboard.writeText(els.exportOutput.value).catch(function () {
        els.exportOutput.select();
        document.execCommand("copy");
      });
      showToast("Copiado!");
    });

    els.exportDownloadBtn.addEventListener("click", function () {
      const isJson = exportFormat === "json";
      const blob = new Blob([els.exportOutput.value], { type: isJson ? "application/json" : "text/html" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (state.report.name || "relatorio").replace(/\s+/g, "_").toLowerCase() + (isJson ? ".json" : ".html");
      a.click();
      URL.revokeObjectURL(a.href);
    });

    // Palette: add section
    document.querySelector(".palette-panel").addEventListener("click", function (e) {
      const item = e.target.closest("[data-add-section]");
      if (item) {
        addSection(item.dataset.addSection);
        return;
      }
      const zone = e.target.closest("[data-select-zone]");
      if (zone) {
        state.selectedId = zone.dataset.selectZone;
        render();
      }
    });

    // Canvas: select zones and sections
    els.paperHeaderZone.addEventListener("click", function () {
      state.selectedId = "header";
      render();
    });
    els.paperFooterZone.addEventListener("click", function () {
      state.selectedId = "footer";
      render();
    });

    // Section actions via event delegation
    els.sectionsContainer.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-section-action]");
      if (btn) {
        e.stopPropagation();
        const action = btn.dataset.sectionAction;
        const id = btn.dataset.sectionId;
        if (action === "remove") removeSection(id);
        if (action === "up")     moveSection(id, -1);
        if (action === "down")   moveSection(id, 1);
        return;
      }
      // Bloco/celula tem prioridade sobre a secao. Usa o ancestral MAIS PROXIMO
      // de qualquer um dos dois (importante p/ tabelas aninhadas, onde celulas e
      // blocos se alternam na arvore).
      const node = e.target.closest("[data-cell-id],[data-block-id]");
      if (node) {
        state.selectedId = node.dataset.blockId || node.dataset.cellId;
        render();
        return;
      }
      const sec = e.target.closest(".paper-section");
      if (sec) {
        state.selectedId = sec.dataset.sectionId;
        render();
      }
    });

    // Properties form: delegate all input/change events
    els.propertiesForm.addEventListener("input", handlePropInput);
    els.propertiesForm.addEventListener("change", handlePropInput);
    els.propertiesForm.addEventListener("click", handlePropClick);
  }

  // =====================================================
  // SECTION OPERATIONS
  // =====================================================
  function addSection(type) {
    if (!SECTION_TYPES[type]) return;
    const def = SECTION_TYPES[type];
    const section = { id: uid(), type: type, props: def.defaultProps() };
    state.report.sections.push(section);
    state.selectedId = section.id;
    commitHistory();
    render();
  }

  function removeSection(id) {
    const idx = state.report.sections.findIndex(function (s) { return s.id === id; });
    if (idx === -1) return;
    state.report.sections.splice(idx, 1);
    if (state.selectedId === id) state.selectedId = null;
    commitHistory();
    render();
  }

  function moveSection(id, dir) {
    const sections = state.report.sections;
    const idx = sections.findIndex(function (s) { return s.id === id; });
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const temp = sections[idx];
    sections[idx] = sections[newIdx];
    sections[newIdx] = temp;
    commitHistory();
    render();
  }

  // =====================================================
  // PROPERTY HANDLERS
  // =====================================================
  function handlePropInput(e) {
    const el = e.target;

    // Toggle de cor (liga/desliga cor de texto ou fundo). Rebuild completo para
    // mostrar/ocultar o seletor de cor abaixo do checkbox.
    const styleToggle = el.dataset.propStyleToggle;
    if (styleToggle) {
      const section = state.report.sections.find(function (s) { return s.id === el.dataset.propSection; });
      if (section) {
        if (!section.props.style) section.props.style = {};
        section.props.style[styleToggle] = el.checked ? (styleToggle === "bgColor" ? "#f4f6fa" : "#333333") : "";
        commitHistory();
        render();
      }
      return;
    }

    const key = el.dataset.propKey;
    if (!key) return;
    const target = el.dataset.propTarget;
    const sectionId = el.dataset.propSection;
    const isStyle = el.dataset.propStyle === "true";
    const rowIndex = el.dataset.propRow !== undefined ? parseInt(el.dataset.propRow, 10) : null;
    const colIndex = el.dataset.propCol !== undefined ? parseInt(el.dataset.propCol, 10) : null;

    let value;
    if (el.type === "checkbox") {
      value = el.checked;
    } else {
      value = el.value;
    }

    if (target === "report") {
      state.report[key] = value;
    } else if (target === "pageSettings") {
      state.report.pageSettings[key] = value;
    } else if (target === "pageHeader") {
      state.report.pageHeader[key] = value;
    } else if (target === "pageFooter") {
      state.report.pageFooter[key] = value;
    } else if (target === "section" && sectionId) {
      const section = state.report.sections.find(function (s) { return s.id === sectionId; });
      if (!section) return;
      if (isStyle) {
        if (!section.props.style) section.props.style = {};
        section.props.style[key] = value;
      } else if (colIndex !== null && !isNaN(colIndex)) {
        // column field: key is column sub-prop
        if (section.props.columns) section.props.columns[colIndex][key] = value;
      } else if (rowIndex !== null && !isNaN(rowIndex)) {
        // row field
        const rowsKey = el.dataset.propRowsKey || "rows";
        if (section.props[rowsKey]) section.props[rowsKey][rowIndex][key] = value;
      } else {
        section.props[key] = value;
      }
    } else if (target === "node") {
      const hit = findNode(el.dataset.propNode);
      if (!hit) return;
      if (hit.kind === "cell") {
        hit.node[key] = value;
      } else {
        if (!hit.node.props) hit.node.props = {};
        hit.node.props[key] = value;
      }
    }

    // Trocar o tamanho da pagina mostra/oculta campos dependentes (orientacao x
    // altura termica) -> rebuild completo. Demais campos: so o canvas, para nao
    // perder o foco do input enquanto o usuario digita.
    if (target === "pageSettings" && key === "size") {
      render();
    } else {
      renderCanvas();
    }

    // Historico: digitar (input) usa debounce (1 entrada por sessao de edicao);
    // checkbox/select/blur (change) gravam imediatamente.
    if (e.type === "change") {
      commitHistory();
    } else {
      debounceHistory();
    }
  }

  function handlePropClick(e) {
    const btn = e.target.closest("[data-prop-action]");
    if (!btn) return;
    const action = btn.dataset.propAction;

    // ----- Acoes da Tabela de Layout (grid): identificadas por data-prop-table -----
    const tableId = btn.dataset.propTable;
    if (tableId) {
      const tp = findTableProps(tableId);
      if (!tp) return;
      if (action === "add-col")         gridAddCol(tp);
      else if (action === "remove-col") gridRemoveCol(tp);
      else if (action === "add-row")    gridAddRow(tp);
      else if (action === "remove-row") gridRemoveRow(tp);
      commitHistory();
      render();
      return;
    }

    // ----- Acoes de blocos de celula -----
    if (action === "add-block") {
      const cellHit = findNode(btn.dataset.propCell);
      if (cellHit && cellHit.kind === "cell") {
        const blk = createBlock(btn.dataset.propBlockType);
        cellHit.node.blocks.push(blk);
        state.selectedId = blk.id;
        commitHistory();
        render();
      }
      return;
    }
    if (action === "select-block") {
      state.selectedId = btn.dataset.propBlock;
      render();
      return;
    }
    if (action === "remove-block" || action === "move-block-up" || action === "move-block-down") {
      const hit = findNode(btn.dataset.propBlock);
      if (hit && hit.kind === "block") {
        const arr = hit.parentArray;
        const i = hit.index;
        if (action === "remove-block") {
          arr.splice(i, 1);
          if (state.selectedId === btn.dataset.propBlock) state.selectedId = hit.cell.id;
        } else if (action === "move-block-up" && i > 0) {
          const t = arr[i]; arr[i] = arr[i - 1]; arr[i - 1] = t;
        } else if (action === "move-block-down" && i < arr.length - 1) {
          const t = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = t;
        }
        commitHistory();
        render();
      }
      return;
    }
    if (action === "clear-node-key") {
      const hit = findNode(btn.dataset.propNode);
      if (hit) {
        if (hit.kind === "cell") hit.node[btn.dataset.propKey] = "";
        else if (hit.node.props) hit.node.props[btn.dataset.propKey] = "";
        commitHistory();
        render();
      }
      return;
    }

    // ----- Acoes dos repeaters de secao (dataTable/info/summary) -----
    const sectionId = btn.dataset.propSection;
    const rowIndex = btn.dataset.propRow !== undefined ? parseInt(btn.dataset.propRow, 10) : null;
    const colIndex = btn.dataset.propCol !== undefined ? parseInt(btn.dataset.propCol, 10) : null;
    const rowsKey = btn.dataset.propRowsKey || "rows";

    const section = state.report.sections.find(function (s) { return s.id === sectionId; });

    if (action === "add-row" && section) {
      if (!Array.isArray(section.props[rowsKey])) section.props[rowsKey] = [];
      if (rowsKey === "columns") {
        section.props.columns.push({ label: "Coluna", placeholder: "col_" + (section.props.columns.length + 1), width: "", align: "left" });
      } else if (rowsKey === "footerRows") {
        section.props.footerRows.push({ label: "Total:", placeholder: "TOTAL", align: "right" });
      } else {
        section.props[rowsKey].push({ label: "Label", placeholder: "VALOR" });
      }
      commitHistory();
      render();
    } else if (action === "remove-row" && section && rowIndex !== null) {
      section.props[rowsKey].splice(rowIndex, 1);
      commitHistory();
      render();
    } else if (action === "remove-col" && section && colIndex !== null) {
      section.props.columns.splice(colIndex, 1);
      commitHistory();
      render();
    }
  }

  // ---- Manipulacao da grade da Tabela de Layout ----
  function gridCols(tp) { return (tp.rows && tp.rows[0]) ? tp.rows[0].length : 0; }
  function gridAddCol(tp) {
    (tp.rows || []).forEach(function (row) { row.push(createCell()); });
  }
  function gridRemoveCol(tp) {
    if (gridCols(tp) <= 1) return;
    (tp.rows || []).forEach(function (row) { row.pop(); });
  }
  function gridAddRow(tp) {
    const cols = gridCols(tp) || 1;
    const row = [];
    for (let c = 0; c < cols; c++) row.push(createCell());
    if (!Array.isArray(tp.rows)) tp.rows = [];
    tp.rows.push(row);
  }
  function gridRemoveRow(tp) {
    if ((tp.rows || []).length <= 1) return;
    tp.rows.pop();
  }

  // =====================================================
  // RENDER
  // =====================================================
  function renderCanvas() {
    renderPageInfo();
    renderHeaderZone();
    renderFooterZone();
    renderSections();
  }

  function render() {
    renderCanvas();
    renderProperties();
    updateHistoryButtons();
  }

  function renderPageInfo() {
    const ps = state.report.pageSettings;
    const def = getPageSizeDef();
    const orientation = ps.orientation === "landscape" ? "Paisagem" : "Retrato";
    els.pageInfo.textContent = def.thermal ? def.label : (def.label + " · " + orientation);
    // Reflete o tamanho real do papel no canvas (largura/altura proporcionais).
    if (els.paperCanvas) {
      const dims = getPaperDims();
      els.paperCanvas.style.width = Math.round(dims.w * PX_PER_MM) + "px";
      els.paperCanvas.style.minHeight = Math.round(dims.h * PX_PER_MM) + "px";
    }
    const n = state.report.sections.length;
    els.sectionCount.textContent = n + (n === 1 ? " secao" : " secoes");
  }

  // ---- Header zone preview ----
  function renderHeaderZone() {
    const h = state.report.pageHeader;
    els.paperHeaderZone.classList.toggle("selected", state.selectedId === "header");

    const pc = escapeHtml(state.report.pageSettings.primaryColor || "#206bc4");
    const parts = [];

    parts.push('<table style="width:100%; border-collapse:collapse">');
    parts.push("<tr>");

    if (h.showLogo && h.logoUrl) {
      parts.push('<td style="width:80px; vertical-align:middle"><img src="' + escapeAttr(h.logoUrl) + '" height="' + escapeAttr(h.logoHeight || "40") + '" style="display:block"></td>');
    }

    parts.push('<td style="vertical-align:middle">');
    if (h.companyName) parts.push("<strong>" + escapeHtml(h.companyName) + "</strong><br>");
    if (h.reportTitle) parts.push('<span style="font-size:13px">' + escapeHtml(h.reportTitle) + "</span>");
    if (h.reportSubtitle) parts.push("<br><small>" + escapeHtml(h.reportSubtitle) + "</small>");
    parts.push("</td>");

    if (h.showDate) {
      parts.push('<td style="text-align:right; vertical-align:top; font-size:10px; color:#777">Gerado em:<br><em><!-- DATA_GERACAO --></em></td>');
    }

    parts.push("</tr></table>");
    parts.push('<hr class="zone-hr" style="border:none; border-top:2px solid ' + escapeAttr(pc) + '; margin:6px 0 2px">');

    els.headerPreview.innerHTML = parts.join("");
  }

  // ---- Footer zone preview ----
  function renderFooterZone() {
    const f = state.report.pageFooter;
    els.paperFooterZone.classList.toggle("selected", state.selectedId === "footer");

    const parts = [];
    parts.push('<hr style="border:none; border-top:1px solid #ccc; margin:2px 0 4px">');
    parts.push('<table style="width:100%; font-size:10px; color:#777; border-collapse:collapse"><tr>');
    parts.push('<td>' + escapeHtml(f.leftText || "") + "</td>");
    const center = f.showPageNum ? 'Página <span class="pagenum-placeholder"><!-- Num --></span> de <!-- Total -->' : "";
    parts.push('<td style="text-align:center">' + center + "</td>");
    parts.push('<td style="text-align:right">' + escapeHtml(f.rightText || "") + "</td>");
    parts.push("</tr></table>");

    els.footerPreview.innerHTML = parts.join("");
  }

  // ---- Sections ----
  function renderSections() {
    els.sectionsContainer.innerHTML = "";
    const sections = state.report.sections;
    els.paperBodyEmpty.classList.toggle("hidden", sections.length > 0);

    sections.forEach(function (section, idx) {
      const div = document.createElement("div");
      div.className = "paper-section" + (state.selectedId === section.id ? " selected" : "");
      div.dataset.sectionId = section.id;

      const def = SECTION_TYPES[section.type];
      const badge = def ? def.badge : section.type;
      const badgeClass = def ? def.badgeClass : "";

      let html = '<span class="section-type-badge ' + badgeClass + '">' + escapeHtml(badge) + "</span>";
      const styleStr = buildStyleStr(section.props && section.props.style);
      html += '<div class="section-style-wrap"' + (styleStr ? ' style="' + escapeAttr(styleStr) + '"' : "") + ">" +
              renderSectionPreview(section) + "</div>";

      // Actions
      html += '<div class="section-actions">';
      if (idx > 0) {
        html += '<button type="button" class="section-action-btn" data-section-action="up" data-section-id="' + section.id + '" title="Mover para cima">↑</button>';
      }
      if (idx < sections.length - 1) {
        html += '<button type="button" class="section-action-btn" data-section-action="down" data-section-id="' + section.id + '" title="Mover para baixo">↓</button>';
      }
      html += '<button type="button" class="section-action-btn danger" data-section-action="remove" data-section-id="' + section.id + '" title="Remover">×</button>';
      html += "</div>";

      div.innerHTML = html;
      els.sectionsContainer.appendChild(div);
    });
  }

  function renderSectionPreview(section) {
    const p = section.props || {};
    switch (section.type) {
      case "reportInfo": return renderInfoPreview(p);
      case "dataTable":  return renderDataTablePreview(p);
      case "summary":    return renderSummaryPreview(p);
      case "divider":    return renderDividerPreview(p);
      case "customHtml": return renderCustomHtmlPreview(p);
      case "qrCode":     return renderQrCodePreview(p);
      case "barcode":    return renderBarcodePreview(p);
      case "gridTable":  return renderGridTablePreview(p);
      default: return "";
    }
  }

  // ---- Tabela de Layout (grid) — preview recursivo ----
  function renderGridTablePreview(tp) {
    const rows = (tp && tp.rows) || [];
    const borderCls = tp.border === false ? " no-border" : "";
    const widthStyle = tp.width === "auto" ? "" : ' style="width:100%"';
    let html = '<table class="rpt-grid-table' + borderCls + '"' + widthStyle + ">";
    rows.forEach(function (row) {
      html += "<tr>";
      row.forEach(function (cell) {
        const sel = state.selectedId === cell.id ? " selected" : "";
        const align = cell.align || "left";
        const valign = cell.valign || "top";
        const bg = cell.bg ? "background:" + escapeAttr(cell.bg) + ";" : "";
        html += '<td class="rpt-grid-cell' + sel + '" data-cell-id="' + escapeAttr(cell.id) +
                '" style="text-align:' + align + ";vertical-align:" + valign + ";" + bg + '">';
        const blocks = cell.blocks || [];
        if (!blocks.length) {
          html += '<div class="rpt-cell-empty">clique para selecionar</div>';
        } else {
          blocks.forEach(function (blk) {
            const bsel = state.selectedId === blk.id ? " selected" : "";
            html += '<div class="rpt-cell-block' + bsel + '" data-block-id="' + escapeAttr(blk.id) + '">' +
                    renderBlockPreview(blk) + "</div>";
          });
        }
        html += "</td>";
      });
      html += "</tr>";
    });
    html += "</table>";
    return html;
  }

  function renderBlockPreview(blk) {
    const p = blk.props || {};
    switch (blk.type) {
      case "text": {
        const st = "text-align:" + (p.align || "left") + ";" + (p.bold ? "font-weight:700;" : "") + (p.size ? "font-size:" + escapeAttr(p.size) + "pt;" : "");
        return '<div style="' + st + '">' + escapeHtml(p.content || "Texto") + "</div>";
      }
      case "image":
        return '<div style="text-align:' + (p.align || "left") + '"><span class="rpt-block-img">IMG</span></div>';
      case "link":
        return '<div style="text-align:' + (p.align || "left") + '"><span class="rpt-block-link">' + escapeHtml(p.text || "Link") + "</span></div>";
      case "qrcode":
        return '<div style="text-align:' + (p.align || "center") + '">' + fakeQrSvg(56) + "</div>";
      case "barcode":
        return '<div style="text-align:' + (p.align || "center") + '"><div class="preview-barcode" style="width:80%;height:28px"></div></div>';
      case "table":
        return renderGridTablePreview(p);
      default: return "";
    }
  }

  // Gera um SVG de QR Code falso (apenas para visualizacao no canvas):
  // 3 finder patterns nos cantos + modulos pseudo-aleatorios deterministicos.
  function fakeQrSvg(px) {
    const n = 23;
    const cell = px / n;
    function rect(x, y, s, fill) {
      return '<rect x="' + (x * cell).toFixed(2) + '" y="' + (y * cell).toFixed(2) +
             '" width="' + (s * cell).toFixed(2) + '" height="' + (s * cell).toFixed(2) + '" fill="' + fill + '"/>';
    }
    function finder(ox, oy) {
      return rect(ox, oy, 7, "#111") + rect(ox + 1, oy + 1, 5, "#fff") + rect(ox + 2, oy + 2, 3, "#111");
    }
    let body = finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if ((x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)) continue;
        if (((x * 7 + y * 13 + x * y) % 3) === 0) body += rect(x, y, 1, "#111");
      }
    }
    return '<svg viewBox="0 0 ' + px + ' ' + px + '" width="' + px + '" height="' + px +
           '" xmlns="http://www.w3.org/2000/svg"><rect width="' + px + '" height="' + px +
           '" fill="#fff"/>' + body + "</svg>";
  }

  function renderQrCodePreview(p) {
    const align = p.align || "center";
    let html = '<div class="preview-qr-wrap" style="text-align:' + escapeAttr(align) + '">';
    html += fakeQrSvg(96);
    if (p.caption) {
      html += '<div style="font-size:10px;color:#666;margin-top:2px">' + escapeHtml(p.caption) + "</div>";
    }
    html += "</div>";
    return html;
  }

  function renderBarcodePreview(p) {
    const align = p.align || "center";
    const widthStyle = p.widthMode === "fixed" ? "width:60%" : "width:100%";
    let html = '<div class="preview-barcode-wrap" style="text-align:' + escapeAttr(align) + '">';
    html += '<div class="preview-barcode" style="' + widthStyle + '"></div>';
    if (p.showCaption && p.caption) {
      html += '<div class="preview-barcode-caption">' + escapeHtml(p.caption) + "</div>";
    }
    html += '<div style="font-size:9px;color:#999;margin-top:2px">' + escapeHtml(p.symbology || "CODE128") + "</div>";
    html += "</div>";
    return html;
  }

  function renderInfoPreview(p) {
    const rows = Array.isArray(p.rows) ? p.rows : [];
    let html = "";
    if (p.showTitle && p.title) {
      html += '<div style="font-weight:700;font-size:11px;margin-bottom:4px">' + escapeHtml(p.title) + "</div>";
    }
    html += '<table class="preview-info-table"><tbody>';
    rows.forEach(function (row) {
      html += '<tr><td class="info-label">' + escapeHtml(row.label || "") + ":</td>" +
              '<td class="info-value">&lt;!-- ' + escapeHtml(row.placeholder || "") + " --&gt;</td></tr>";
    });
    html += "</tbody></table>";
    return html;
  }

  function renderDataTablePreview(p) {
    const cols = Array.isArray(p.columns) ? p.columns : [];
    let html = "";
    if (p.showTitle && p.title) {
      html += '<div style="font-weight:700;font-size:11px;margin-bottom:4px">' + escapeHtml(p.title) + "</div>";
    }
    html += '<table class="preview-data-table"><thead><tr>';
    cols.forEach(function (col) {
      const align = col.align || "left";
      const width = col.width ? ' style="width:' + escapeAttr(col.width) + 'px; text-align:' + align + '"' : ' style="text-align:' + align + '"';
      html += "<th" + width + ">" + escapeHtml(col.label || "") + "</th>";
    });
    html += "</tr></thead><tbody>";
    // 2 sample rows
    for (var i = 0; i < 2; i++) {
      html += "<tr>";
      cols.forEach(function (col) {
        const align = col.align || "left";
        html += '<td style="text-align:' + align + '">&lt;!-- ' + escapeHtml(col.placeholder || "") + " --&gt;</td>";
      });
      html += "</tr>";
    }
    html += "</tbody>";
    if (p.showFooter && Array.isArray(p.footerRows) && p.footerRows.length) {
      html += "<tfoot>";
      p.footerRows.forEach(function (row) {
        html += '<tr><td colspan="' + Math.max(1, cols.length - 1) + '" style="text-align:right">' +
                escapeHtml(row.label || "") + "</td>" +
                '<td style="text-align:' + escapeAttr(row.align || "right") + '">&lt;!-- ' + escapeHtml(row.placeholder || "") + " --&gt;</td></tr>";
      });
      html += "</tfoot>";
    }
    html += "</table>";
    return html;
  }

  function renderSummaryPreview(p) {
    const rows = Array.isArray(p.rows) ? p.rows : [];
    let html = "";
    if (p.showTitle && p.title) {
      html += '<div style="font-weight:700;font-size:11px;margin-bottom:4px">' + escapeHtml(p.title) + "</div>";
    }
    html += '<table class="preview-summary-table"><tbody>';
    rows.forEach(function (row) {
      const bold = row.bold ? " font-weight:700;" : "";
      html += '<tr><td class="sum-label" style="' + bold + '">' + escapeHtml(row.label || "") + "</td>" +
              '<td class="sum-value">&lt;!-- ' + escapeHtml(row.placeholder || "") + " --&gt;</td></tr>";
    });
    html += "</tbody></table>";
    return html;
  }

  function renderDividerPreview(p) {
    const color = escapeAttr(p.color || "#dddddd");
    const thickness = escapeAttr(p.thickness || "1");
    return '<hr class="preview-divider" style="border:none; border-top:' + thickness + 'px solid ' + color + '; margin:6px 0">';
  }

  function renderCustomHtmlPreview(p) {
    const content = String(p.content || "").slice(0, 200);
    return '<div class="preview-custom-html">' + escapeHtml(content) + (content.length >= 200 ? "..." : "") + "</div>";
  }

  // =====================================================
  // PROPERTIES PANEL
  // =====================================================
  function renderProperties() {
    const form = els.propertiesForm;
    const id = state.selectedId;

    if (!id || id === "settings") {
      form.innerHTML = renderPageSettingsProps();
    } else if (id === "header") {
      form.innerHTML = renderPageHeaderProps();
    } else if (id === "footer") {
      form.innerHTML = renderPageFooterProps();
    } else {
      const section = state.report.sections.find(function (s) { return s.id === id; });
      if (section) {
        form.innerHTML = renderSectionProps(section);
      } else {
        const hit = findNode(id);
        if (hit && hit.kind === "cell") {
          form.innerHTML = renderCellProps(hit.node);
        } else if (hit && hit.kind === "block") {
          form.innerHTML = renderBlockProps(hit.node);
        } else {
          form.innerHTML = renderPageSettingsProps();
        }
      }
    }
  }

  function propTarget(target) { return ' data-prop-target="' + target + '"'; }
  function propKey(key) { return ' data-prop-key="' + escapeAttr(key) + '"'; }
  function propSection(id) { return ' data-prop-section="' + escapeAttr(id) + '"'; }

  function inputRow(label, key, value, target, inputType) {
    inputType = inputType || "text";
    return '<div class="rpt-prop-row"><label>' + escapeHtml(label) + '</label>' +
           '<input type="' + inputType + '" value="' + escapeAttr(String(value || "")) + '"' +
           propKey(key) + propTarget(target) + '></div>';
  }

  function checkboxRow(label, key, value, target) {
    const checked = value ? " checked" : "";
    return '<div class="rpt-checkbox-row"><input type="checkbox"' + checked +
           propKey(key) + propTarget(target) + '><label>' + escapeHtml(label) + "</label></div>";
  }

  function selectRow(label, key, value, options, target) {
    let opts = "";
    options.forEach(function (opt) {
      opts += '<option value="' + escapeAttr(opt[0]) + '"' + (value === opt[0] ? " selected" : "") + ">" + escapeHtml(opt[1]) + "</option>";
    });
    return '<div class="rpt-prop-row"><label>' + escapeHtml(label) + "</label>" +
           '<select' + propKey(key) + propTarget(target) + ">" + opts + "</select></div>";
  }

  function groupHeader(title) {
    return '<div class="rpt-prop-group"><h3>' + escapeHtml(title) + "</h3>";
  }
  function groupEnd() { return "</div>"; }

  // Monta a string de estilo inline a partir do objeto style da secao.
  function buildStyleStr(style) {
    if (!style) return "";
    const p = [];
    if (style.textColor) p.push("color:" + style.textColor);
    if (style.bgColor) p.push("background-color:" + style.bgColor);
    if (style.fontSize) p.push("font-size:" + style.fontSize + "pt");
    if (style.align) p.push("text-align:" + style.align);
    return p.join(";");
  }

  // Grupo de propriedades de aparencia (cor do texto, cor de fundo, fonte, alinhamento).
  // As cores usam um checkbox de liga/desliga para permitir "herdar" (sem cor definida).
  function appearanceGroup(id, style) {
    style = style || {};
    const hasText = !!style.textColor;
    const hasBg = !!style.bgColor;
    const sid = escapeAttr(id);
    const out = [groupHeader("Aparencia")];

    out.push('<div class="rpt-checkbox-row"><input type="checkbox"' + (hasText ? " checked" : "") +
      ' data-prop-section="' + sid + '" data-prop-style-toggle="textColor"><label>Cor do texto personalizada</label></div>');
    if (hasText) {
      out.push('<div class="rpt-prop-row"><input type="color" value="' + escapeAttr(style.textColor) + '"' +
        ' data-prop-target="section" data-prop-section="' + sid + '" data-prop-style="true" data-prop-key="textColor"></div>');
    }

    out.push('<div class="rpt-checkbox-row"><input type="checkbox"' + (hasBg ? " checked" : "") +
      ' data-prop-section="' + sid + '" data-prop-style-toggle="bgColor"><label>Cor de fundo</label></div>');
    if (hasBg) {
      out.push('<div class="rpt-prop-row"><input type="color" value="' + escapeAttr(style.bgColor) + '"' +
        ' data-prop-target="section" data-prop-section="' + sid + '" data-prop-style="true" data-prop-key="bgColor"></div>');
    }

    out.push('<div class="rpt-prop-row"><label>Tamanho da fonte (pt)</label>' +
      '<input type="number" min="6" max="48" value="' + escapeAttr(style.fontSize || "") + '" placeholder="padrao"' +
      ' data-prop-target="section" data-prop-section="' + sid + '" data-prop-style="true" data-prop-key="fontSize"></div>');

    const alignOpts = [["", "Padrao"], ["left", "Esquerda"], ["center", "Centro"], ["right", "Direita"]].map(function (o) {
      return '<option value="' + o[0] + '"' + (style.align === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
    }).join("");
    out.push('<div class="rpt-prop-row"><label>Alinhamento do texto</label>' +
      '<select data-prop-target="section" data-prop-section="' + sid + '" data-prop-style="true" data-prop-key="align">' + alignOpts + "</select></div>");

    out.push(groupEnd());
    return out.join("");
  }

  function renderPageSettingsProps() {
    const ps = state.report.pageSettings;
    const t = "pageSettings";
    return [
      groupHeader("Geral"),
      inputRow("Nome do relatorio", "name", state.report.name, "report"),
      groupEnd(),
      groupHeader("Pagina"),
      selectRow("Tamanho", "size", ps.size, Object.keys(PAGE_SIZES).map(function (k) { return [k, PAGE_SIZES[k].label]; }), t),
      getPageSizeDef().thermal
        ? inputRow("Altura do papel (mm)", "thermalHeight", ps.thermalHeight || "297", t, "number")
        : selectRow("Orientacao", "orientation", ps.orientation, [["portrait","Retrato"],["landscape","Paisagem"]], t),
      groupEnd(),
      groupHeader("Margens (mm)"),
      '<div class="rpt-repeater-grid rpt-repeater-grid-2" style="margin-bottom:8px">',
      '<div><span class="rpt-repeater-label">Superior</span><input class="rpt-repeater-input" type="number" value="' + escapeAttr(ps.marginTop) + '"' + propKey("marginTop") + propTarget(t) + '></div>',
      '<div><span class="rpt-repeater-label">Inferior</span><input class="rpt-repeater-input" type="number" value="' + escapeAttr(ps.marginBottom) + '"' + propKey("marginBottom") + propTarget(t) + '></div>',
      '<div><span class="rpt-repeater-label">Esquerda</span><input class="rpt-repeater-input" type="number" value="' + escapeAttr(ps.marginLeft) + '"' + propKey("marginLeft") + propTarget(t) + '></div>',
      '<div><span class="rpt-repeater-label">Direita</span><input class="rpt-repeater-input" type="number" value="' + escapeAttr(ps.marginRight) + '"' + propKey("marginRight") + propTarget(t) + '></div>',
      "</div>",
      groupEnd(),
      groupHeader("Tipografia e Cores"),
      inputRow("Fonte (CSS)", "fontFamily", ps.fontFamily, t),
      inputRow("Tamanho da fonte (pt)", "fontSize", ps.fontSize, t, "number"),
      inputRow("Cor primaria", "primaryColor", ps.primaryColor, t, "color"),
      inputRow("Cor do texto do cabecalho da tabela", "tableHeaderTextColor", ps.tableHeaderTextColor, t, "color"),
      inputRow("Cor das linhas", "lineColor", ps.lineColor, t, "color"),
      checkboxRow("Linhas zebradas (striped)", "stripedRows", ps.stripedRows, t),
      groupEnd()
    ].join("");
  }

  function renderPageHeaderProps() {
    const h = state.report.pageHeader;
    const t = "pageHeader";
    return [
      groupHeader("Cabecalho da Pagina"),
      checkboxRow("Exibir logotipo", "showLogo", h.showLogo, t),
      inputRow("URL do logotipo", "logoUrl", h.logoUrl, t, "url"),
      inputRow("Altura do logo (px)", "logoHeight", h.logoHeight, t, "number"),
      inputRow("Nome da empresa", "companyName", h.companyName, t),
      inputRow("Titulo do relatorio", "reportTitle", h.reportTitle, t),
      inputRow("Subtitulo", "reportSubtitle", h.reportSubtitle, t),
      checkboxRow("Exibir data de geracao", "showDate", h.showDate, t),
      groupEnd()
    ].join("");
  }

  function renderPageFooterProps() {
    const f = state.report.pageFooter;
    const t = "pageFooter";
    return [
      groupHeader("Rodape da Pagina"),
      inputRow("Texto da esquerda", "leftText", f.leftText, t),
      checkboxRow("Exibir numero de pagina (centro)", "showPageNum", f.showPageNum, t),
      inputRow("Texto da direita", "rightText", f.rightText, t),
      groupEnd()
    ].join("");
  }

  function renderSectionProps(section) {
    const p = section.props || {};
    const id = section.id;
    switch (section.type) {
      case "reportInfo":  return renderInfoProps(id, p);
      case "dataTable":   return renderDataTableProps(id, p);
      case "summary":     return renderSummaryProps(id, p);
      case "divider":     return renderDividerProps(id, p);
      case "customHtml":  return renderCustomHtmlProps(id, p);
      case "qrCode":      return renderQrCodeProps(id, p);
      case "barcode":     return renderBarcodeProps(id, p);
      case "gridTable":   return renderGridTableProps(id, p, true);
      default: return "<p>Secao desconhecida.</p>";
    }
  }

  function sectionInput(id, label, key, value, inputType) {
    return inputRow(label, key, value, "section", inputType).replace(propTarget("section"), propTarget("section") + propSection(id));
  }
  function sectionSelect(id, label, key, value, options) {
    return selectRow(label, key, value, options, "section").replace(propTarget("section"), propTarget("section") + propSection(id));
  }
  function sectionCheckbox(id, label, key, value) {
    return checkboxRow(label, key, value, "section").replace(propTarget("section"), propTarget("section") + propSection(id));
  }

  const ALIGN_OPTS = [["left", "Esquerda"], ["center", "Centro"], ["right", "Direita"]];

  // Helpers para celulas/blocos: target="node" + data-prop-node="id".
  function nodeInput(id, label, key, value, inputType) {
    return inputRow(label, key, value, "node", inputType).replace(propTarget("node"), propTarget("node") + ' data-prop-node="' + escapeAttr(id) + '"');
  }
  function nodeSelect(id, label, key, value, options) {
    return selectRow(label, key, value, options, "node").replace(propTarget("node"), propTarget("node") + ' data-prop-node="' + escapeAttr(id) + '"');
  }
  function nodeCheckbox(id, label, key, value) {
    return checkboxRow(label, key, value, "node").replace(propTarget("node"), propTarget("node") + ' data-prop-node="' + escapeAttr(id) + '"');
  }

  const VALIGN_OPTS = [["top", "Topo"], ["middle", "Meio"], ["bottom", "Base"]];
  const SYMBOLOGY_OPTS = [["CODE128", "Code 128"], ["EAN13", "EAN-13"], ["EAN8", "EAN-8"], ["CODE39", "Code 39"], ["UPCA", "UPC-A"], ["ITF", "ITF / 2 de 5"]];

  function counterButtons(id, kind, count) {
    return '<div class="rpt-counter">' +
      '<button type="button" class="rpt-counter-btn" data-prop-action="remove-' + kind + '" data-prop-table="' + escapeAttr(id) + '" title="Remover">&minus;</button>' +
      '<span class="rpt-counter-val">' + count + "</span>" +
      '<button type="button" class="rpt-counter-btn" data-prop-action="add-' + kind + '" data-prop-table="' + escapeAttr(id) + '" title="Adicionar">+</button>' +
      "</div>";
  }

  // Propriedades da Tabela de Layout (secao ou bloco-tabela aninhado).
  function renderGridTableProps(id, tp, isSection) {
    const inp = isSection ? sectionInput : nodeInput;
    const sel = isSection ? sectionSelect : nodeSelect;
    const chk = isSection ? sectionCheckbox : nodeCheckbox;
    const cols = (tp.rows && tp.rows[0]) ? tp.rows[0].length : 0;
    const rowCount = (tp.rows || []).length;
    return [
      groupHeader(isSection ? "Tabela de Layout" : "Tabela aninhada"),
      '<div class="rpt-prop-row"><label>Colunas</label>' + counterButtons(id, "col", cols) + "</div>",
      '<div class="rpt-prop-row"><label>Linhas</label>' + counterButtons(id, "row", rowCount) + "</div>",
      chk(id, "Mostrar bordas", "border", tp.border),
      inp(id, "Cor da borda", "borderColor", tp.borderColor || "#333333", "color"),
      inp(id, "Espacamento interno (pt)", "cellPadding", tp.cellPadding || "4", "number"),
      sel(id, "Largura", "width", tp.width || "full", [["full", "Total (100%)"], ["auto", "Automatica"]]),
      groupEnd(),
      isSection ? appearanceGroup(id, tp.style) : ""
    ].join("");
  }

  // Propriedades de uma celula: alinhamento, fundo e lista de blocos.
  function renderCellProps(cell) {
    const id = cell.id;
    const blocks = cell.blocks || [];
    let blockList;
    if (blocks.length) {
      blockList = '<div class="rpt-repeater">';
      blocks.forEach(function (blk, idx) {
        blockList += '<div class="rpt-block-row' + (state.selectedId === blk.id ? " selected" : "") +
          '" data-prop-action="select-block" data-prop-block="' + escapeAttr(blk.id) + '">' +
          "<span>" + escapeHtml(BLOCK_LABELS[blk.type] || blk.type) + "</span>" +
          '<span class="rpt-block-row-actions">' +
          (idx > 0 ? '<button type="button" data-prop-action="move-block-up" data-prop-block="' + escapeAttr(blk.id) + '" title="Subir">↑</button>' : "") +
          (idx < blocks.length - 1 ? '<button type="button" data-prop-action="move-block-down" data-prop-block="' + escapeAttr(blk.id) + '" title="Descer">↓</button>' : "") +
          '<button type="button" data-prop-action="remove-block" data-prop-block="' + escapeAttr(blk.id) + '" title="Remover">×</button>' +
          "</span></div>";
      });
      blockList += "</div>";
    } else {
      blockList = '<p class="properties-note" style="font-size:11px;color:#888;padding:0 0 6px">Celula vazia. Adicione um bloco abaixo.</p>';
    }

    const addButtons = ["text", "image", "link", "qrcode", "barcode", "table"].map(function (t) {
      return '<button type="button" class="rpt-add-btn rpt-add-block" data-prop-action="add-block" data-prop-cell="' + escapeAttr(id) +
        '" data-prop-block-type="' + t + '">+ ' + escapeHtml(BLOCK_LABELS[t]) + "</button>";
    }).join("");

    return [
      groupHeader("Celula"),
      nodeSelect(id, "Alinhamento", "align", cell.align || "left", ALIGN_OPTS),
      nodeSelect(id, "Alinhamento vertical", "valign", cell.valign || "top", VALIGN_OPTS),
      cellBgRow(id, cell.bg),
      groupEnd(),
      groupHeader("Conteudo da celula"),
      blockList,
      '<div class="rpt-add-grid">' + addButtons + "</div>",
      groupEnd()
    ].join("");
  }

  function cellBgRow(id, bg) {
    const val = bg || "#ffffff";
    return '<div class="rpt-prop-row"><label>Cor de fundo' + (bg ? "" : ' <span style="color:#aaa">(nenhuma)</span>') + "</label>" +
      '<div style="display:flex;gap:6px;align-items:center">' +
      '<input type="color" value="' + escapeAttr(val) + '" data-prop-target="node" data-prop-node="' + escapeAttr(id) + '" data-prop-key="bg" style="flex:1">' +
      (bg ? '<button type="button" class="rpt-add-btn" style="width:auto;padding:4px 10px" data-prop-action="clear-node-key" data-prop-node="' + escapeAttr(id) + '" data-prop-key="bg">limpar</button>' : "") +
      "</div></div>";
  }

  // Propriedades de um bloco de celula (despacha por tipo).
  function renderBlockProps(block) {
    const id = block.id;
    const p = block.props || {};
    switch (block.type) {
      case "text":
        return [
          groupHeader("Texto"),
          '<div class="rpt-prop-row"><label>Conteudo (aceita placeholder &lt;!-- X --&gt;)</label>' +
          '<textarea data-prop-target="node" data-prop-node="' + escapeAttr(id) + '" data-prop-key="content">' + escapeHtml(p.content || "") + "</textarea></div>",
          nodeSelect(id, "Alinhamento", "align", p.align || "left", ALIGN_OPTS),
          nodeCheckbox(id, "Negrito", "bold", p.bold),
          nodeInput(id, "Tamanho (pt, opcional)", "size", p.size || "", "number"),
          groupEnd()
        ].join("");
      case "image":
        return [
          groupHeader("Imagem"),
          nodeInput(id, "Token/URL do src", "srcToken", p.srcToken || "IMG_SRC", "text"),
          nodeInput(id, "Largura (mm, opcional)", "width", p.width || "", "number"),
          nodeInput(id, "Altura (mm, opcional)", "height", p.height || "", "number"),
          nodeInput(id, "Texto alternativo", "alt", p.alt || "", "text"),
          nodeSelect(id, "Alinhamento", "align", p.align || "left", ALIGN_OPTS),
          groupEnd()
        ].join("");
      case "link":
        return [
          groupHeader("Link"),
          nodeInput(id, "Texto", "text", p.text || "Link", "text"),
          nodeInput(id, "Href", "href", p.href || "#", "text"),
          nodeSelect(id, "Alinhamento", "align", p.align || "left", ALIGN_OPTS),
          groupEnd()
        ].join("");
      case "qrcode":
        return [
          groupHeader("QR Code"),
          nodeInput(id, "Token do src", "srcToken", p.srcToken || "QRCODE_SRC", "text"),
          nodeInput(id, "Tamanho (mm)", "size", p.size || "20", "number"),
          nodeSelect(id, "Alinhamento", "align", p.align || "center", ALIGN_OPTS),
          nodeInput(id, "Legenda", "caption", p.caption || "", "text"),
          groupEnd()
        ].join("");
      case "barcode":
        return [
          groupHeader("Codigo de Barras"),
          nodeInput(id, "Token do src", "srcToken", p.srcToken || "BARCODE_SRC", "text"),
          nodeSelect(id, "Simbologia", "symbology", p.symbology || "CODE128", SYMBOLOGY_OPTS),
          nodeSelect(id, "Largura", "widthMode", p.widthMode || "full", [["full", "Total"], ["fixed", "Fixa (mm)"]]),
          nodeInput(id, "Largura fixa (mm)", "width", p.width || "40", "number"),
          nodeInput(id, "Altura (mm)", "height", p.height || "12", "number"),
          nodeSelect(id, "Alinhamento", "align", p.align || "center", ALIGN_OPTS),
          nodeCheckbox(id, "Mostrar legenda", "showCaption", p.showCaption),
          nodeInput(id, "Legenda", "caption", p.caption || "", "text"),
          groupEnd()
        ].join("");
      case "table":
        return renderGridTableProps(id, p, false);
      default:
        return "<p>Bloco desconhecido.</p>";
    }
  }

  function renderQrCodeProps(id, p) {
    return [
      groupHeader("QR Code"),
      sectionInput(id, "Token do src (substituir no servidor)", "srcToken", p.srcToken || "QRCODE_SRC", "text"),
      sectionInput(id, "Tamanho (mm)", "size", p.size || "30", "number"),
      sectionSelect(id, "Alinhamento", "align", p.align || "center", ALIGN_OPTS),
      sectionInput(id, "Legenda (opcional)", "caption", p.caption || "", "text"),
      '<p class="properties-note" style="font-size:10px;color:#888;padding:0 0 4px">A imagem do QR e gerada no Laravel (ex: simplesoftwareio/simple-qrcode) e embutida como data URI base64 no lugar do token. O HTML exportado traz um exemplo de codigo pronto nos comentarios.</p>',
      groupEnd()
    ].join("");
  }

  function renderBarcodeProps(id, p) {
    return [
      groupHeader("Codigo de Barras"),
      sectionInput(id, "Token do src (substituir no servidor)", "srcToken", p.srcToken || "BARCODE_SRC", "text"),
      sectionSelect(id, "Simbologia (informativo)", "symbology", p.symbology || "CODE128",
        [["CODE128", "Code 128"], ["EAN13", "EAN-13"], ["EAN8", "EAN-8"], ["CODE39", "Code 39"], ["UPCA", "UPC-A"], ["ITF", "ITF / Intercalado 2 de 5"]]),
      sectionSelect(id, "Largura", "widthMode", p.widthMode || "full", [["full", "Largura total"], ["fixed", "Largura fixa (mm)"]]),
      sectionInput(id, "Largura fixa (mm) — usada quando largura = fixa", "width", p.width || "60", "number"),
      sectionInput(id, "Altura (mm)", "height", p.height || "15", "number"),
      sectionSelect(id, "Alinhamento", "align", p.align || "center", ALIGN_OPTS),
      sectionCheckbox(id, "Mostrar legenda (numero)", "showCaption", p.showCaption),
      sectionInput(id, "Legenda", "caption", p.caption || "", "text"),
      '<p class="properties-note" style="font-size:10px;color:#888;padding:0 0 4px">A imagem do codigo e gerada no Laravel (ex: picqer/php-barcode-generator) e embutida como data URI base64 no lugar do token. O HTML exportado traz um exemplo de codigo pronto nos comentarios.</p>',
      groupEnd()
    ].join("");
  }

  function renderInfoProps(id, p) {
    const rows = Array.isArray(p.rows) ? p.rows : [];
    let repeater = '<div class="rpt-repeater">';
    rows.forEach(function (row, idx) {
      repeater += '<div class="rpt-repeater-item">' +
        '<div class="rpt-repeater-item-header"><span class="rpt-repeater-item-title">Linha ' + (idx + 1) + '</span>' +
        '<button type="button" class="rpt-repeater-item-remove" data-prop-action="remove-row" data-prop-section="' + escapeAttr(id) + '" data-prop-row="' + idx + '" data-prop-rows-key="rows">×</button></div>' +
        '<div class="rpt-repeater-grid rpt-repeater-grid-2">' +
        '<div><span class="rpt-repeater-label">Label</span><input class="rpt-repeater-input" value="' + escapeAttr(row.label || "") + '"' +
        ' data-prop-target="section" data-prop-section="' + escapeAttr(id) + '" data-prop-row="' + idx + '" data-prop-rows-key="rows" data-prop-key="label"></div>' +
        '<div><span class="rpt-repeater-label">Placeholder</span><input class="rpt-repeater-input" value="' + escapeAttr(row.placeholder || "") + '"' +
        ' data-prop-target="section" data-prop-section="' + escapeAttr(id) + '" data-prop-row="' + idx + '" data-prop-rows-key="rows" data-prop-key="placeholder"></div>' +
        "</div></div>";
    });
    repeater += '</div><button type="button" class="rpt-add-btn" data-prop-action="add-row" data-prop-section="' + escapeAttr(id) + '" data-prop-rows-key="rows">+ Adicionar linha</button>';

    return [
      groupHeader("Informacoes do Relatorio"),
      inputRow("Titulo da secao", "title", p.title, "section", "text").replace(propTarget("section"), propTarget("section") + propSection(id)),
      checkboxRow("Exibir titulo", "showTitle", p.showTitle, "section").replace(propTarget("section"), propTarget("section") + propSection(id)),
      groupEnd(),
      groupHeader("Linhas de Informacao"),
      repeater,
      groupEnd(),
      appearanceGroup(id, p.style)
    ].join("");
  }

  function renderDataTableProps(id, p) {
    const cols = Array.isArray(p.columns) ? p.columns : [];
    const footerRows = Array.isArray(p.footerRows) ? p.footerRows : [];

    let colRepeater = '<div class="rpt-repeater">';
    cols.forEach(function (col, idx) {
      const alignOpts = [["left","Esq"],["center","Centro"],["right","Dir"]].map(function (o) {
        return '<option value="' + o[0] + '"' + (col.align === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("");
      colRepeater += '<div class="rpt-repeater-item">' +
        '<div class="rpt-repeater-item-header"><span class="rpt-repeater-item-title">Col ' + (idx + 1) + '</span>' +
        '<button type="button" class="rpt-repeater-item-remove" data-prop-action="remove-col" data-prop-section="' + escapeAttr(id) + '" data-prop-col="' + idx + '" data-prop-rows-key="columns">×</button></div>' +
        '<div class="rpt-repeater-grid rpt-repeater-grid-2" style="margin-bottom:4px">' +
        '<div><span class="rpt-repeater-label">Cabecalho</span><input class="rpt-repeater-input" value="' + escapeAttr(col.label || "") + '"' +
        ' data-prop-target="section" data-prop-section="' + escapeAttr(id) + '" data-prop-col="' + idx + '" data-prop-row="null" data-prop-rows-key="columns" data-prop-key="label"></div>' +
        '<div><span class="rpt-repeater-label">Placeholder</span><input class="rpt-repeater-input" value="' + escapeAttr(col.placeholder || "") + '"' +
        ' data-prop-target="section" data-prop-section="' + escapeAttr(id) + '" data-prop-col="' + idx + '" data-prop-row="null" data-prop-rows-key="columns" data-prop-key="placeholder"></div>' +
        '<div><span class="rpt-repeater-label">Largura (px)</span><input class="rpt-repeater-input" type="number" value="' + escapeAttr(col.width || "") + '"' +
        ' data-prop-target="section" data-prop-section="' + escapeAttr(id) + '" data-prop-col="' + idx + '" data-prop-row="null" data-prop-rows-key="columns" data-prop-key="width"></div>' +
        '<div><span class="rpt-repeater-label">Alinhamento</span><select class="rpt-repeater-input"' +
        ' data-prop-target="section" data-prop-section="' + escapeAttr(id) + '" data-prop-col="' + idx + '" data-prop-row="null" data-prop-rows-key="columns" data-prop-key="align">' + alignOpts + "</select></div>" +
        "</div></div>";
    });
    colRepeater += '</div><button type="button" class="rpt-add-btn" data-prop-action="add-row" data-prop-section="' + escapeAttr(id) + '" data-prop-rows-key="columns">+ Adicionar coluna</button>';

    let footerRepeater = '<div class="rpt-repeater">';
    footerRows.forEach(function (row, idx) {
      footerRepeater += '<div class="rpt-repeater-item">' +
        '<div class="rpt-repeater-item-header"><span class="rpt-repeater-item-title">Total ' + (idx + 1) + '</span>' +
        '<button type="button" class="rpt-repeater-item-remove" data-prop-action="remove-row" data-prop-section="' + escapeAttr(id) + '" data-prop-row="' + idx + '" data-prop-rows-key="footerRows">×</button></div>' +
        '<div class="rpt-repeater-grid rpt-repeater-grid-2">' +
        '<div><span class="rpt-repeater-label">Label</span><input class="rpt-repeater-input" value="' + escapeAttr(row.label || "") + '"' +
        ' data-prop-target="section" data-prop-section="' + escapeAttr(id) + '" data-prop-row="' + idx + '" data-prop-rows-key="footerRows" data-prop-key="label"></div>' +
        '<div><span class="rpt-repeater-label">Placeholder</span><input class="rpt-repeater-input" value="' + escapeAttr(row.placeholder || "") + '"' +
        ' data-prop-target="section" data-prop-section="' + escapeAttr(id) + '" data-prop-row="' + idx + '" data-prop-rows-key="footerRows" data-prop-key="placeholder"></div>' +
        "</div></div>";
    });
    footerRepeater += '</div><button type="button" class="rpt-add-btn" data-prop-action="add-row" data-prop-section="' + escapeAttr(id) + '" data-prop-rows-key="footerRows">+ Adicionar linha de total</button>';

    const titleInput = inputRow("Titulo da secao", "title", p.title, "section", "text").replace(propTarget("section"), propTarget("section") + propSection(id));
    const showTitleChk = checkboxRow("Exibir titulo", "showTitle", p.showTitle, "section").replace(propTarget("section"), propTarget("section") + propSection(id));
    const showFooterChk = checkboxRow("Exibir rodape da tabela (totais)", "showFooter", p.showFooter, "section").replace(propTarget("section"), propTarget("section") + propSection(id));

    return [
      groupHeader("Tabela de Dados"),
      titleInput,
      showTitleChk,
      groupEnd(),
      groupHeader("Colunas"),
      colRepeater,
      groupEnd(),
      groupHeader("Rodape da Tabela"),
      showFooterChk,
      footerRepeater,
      groupEnd(),
      appearanceGroup(id, p.style)
    ].join("");
  }

  function renderSummaryProps(id, p) {
    const rows = Array.isArray(p.rows) ? p.rows : [];
    let repeater = '<div class="rpt-repeater">';
    rows.forEach(function (row, idx) {
      const boldChk = '<label style="display:flex;align-items:center;gap:4px;font-size:10px">' +
        '<input type="checkbox"' + (row.bold ? " checked" : "") +
        ' data-prop-target="section" data-prop-section="' + escapeAttr(id) + '" data-prop-row="' + idx + '" data-prop-rows-key="rows" data-prop-key="bold"> Negrito</label>';
      repeater += '<div class="rpt-repeater-item">' +
        '<div class="rpt-repeater-item-header"><span class="rpt-repeater-item-title">Linha ' + (idx + 1) + '</span>' +
        '<button type="button" class="rpt-repeater-item-remove" data-prop-action="remove-row" data-prop-section="' + escapeAttr(id) + '" data-prop-row="' + idx + '" data-prop-rows-key="rows">×</button></div>' +
        '<div class="rpt-repeater-grid rpt-repeater-grid-2" style="margin-bottom:4px">' +
        '<div><span class="rpt-repeater-label">Label</span><input class="rpt-repeater-input" value="' + escapeAttr(row.label || "") + '"' +
        ' data-prop-target="section" data-prop-section="' + escapeAttr(id) + '" data-prop-row="' + idx + '" data-prop-rows-key="rows" data-prop-key="label"></div>' +
        '<div><span class="rpt-repeater-label">Placeholder</span><input class="rpt-repeater-input" value="' + escapeAttr(row.placeholder || "") + '"' +
        ' data-prop-target="section" data-prop-section="' + escapeAttr(id) + '" data-prop-row="' + idx + '" data-prop-rows-key="rows" data-prop-key="placeholder"></div>' +
        "</div>" + boldChk + "</div>";
    });
    repeater += '</div><button type="button" class="rpt-add-btn" data-prop-action="add-row" data-prop-section="' + escapeAttr(id) + '" data-prop-rows-key="rows">+ Adicionar linha de resumo</button>';

    return [
      groupHeader("Titulo"),
      inputRow("Titulo da secao", "title", p.title, "section", "text").replace(propTarget("section"), propTarget("section") + propSection(id)),
      checkboxRow("Exibir titulo", "showTitle", p.showTitle, "section").replace(propTarget("section"), propTarget("section") + propSection(id)),
      groupEnd(),
      groupHeader("Linhas de Resumo"),
      repeater,
      groupEnd(),
      appearanceGroup(id, p.style)
    ].join("");
  }

  function renderDividerProps(id, p) {
    const colorInput = inputRow("Cor da linha", "color", p.color || "#dddddd", "section", "color").replace(propTarget("section"), propTarget("section") + propSection(id));
    const thicknessInput = inputRow("Espessura (px)", "thickness", p.thickness || "1", "section", "number").replace(propTarget("section"), propTarget("section") + propSection(id));
    return [
      groupHeader("Divisor"),
      colorInput,
      thicknessInput,
      groupEnd()
    ].join("");
  }

  function renderCustomHtmlProps(id, p) {
    return [
      groupHeader("HTML Livre"),
      '<div class="rpt-prop-row"><label>Conteudo HTML / Texto</label>' +
      '<textarea data-prop-target="section" data-prop-section="' + escapeAttr(id) + '" data-prop-key="content">' +
      escapeHtml(p.content || "") + "</textarea></div>",
      groupEnd()
    ].join("");
  }

  // =====================================================
  // EXPORT HTML
  // =====================================================
  function exportHtml() {
    const ps = state.report.pageSettings;
    const h  = state.report.pageHeader;
    const f  = state.report.pageFooter;

    const sizeDef = getPageSizeDef();
    const pageSizeCss = sizeDef.thermal
      ? (sizeDef.w + "mm " + (escapeAttr(ps.thermalHeight || "297")) + "mm")
      : (sizeDef.css + " " + (ps.orientation === "landscape" ? "landscape" : "portrait"));
    const mt    = escapeAttr(ps.marginTop    || "15");
    const mr    = escapeAttr(ps.marginRight  || "10");
    const mb    = escapeAttr(ps.marginBottom || "20");
    const ml    = escapeAttr(ps.marginLeft   || "10");
    const font  = escapeAttr(ps.fontFamily   || "Arial, sans-serif");
    const fsize = escapeAttr(ps.fontSize     || "10");
    const pc    = escapeAttr(ps.primaryColor || "#206bc4");
    const htc   = escapeAttr(ps.tableHeaderTextColor || "#ffffff");
    const lc    = escapeAttr(ps.lineColor    || "#dddddd");
    const striped = ps.stripedRows !== false;

    const lines = [];
    lines.push("<!DOCTYPE html>");
    lines.push('<html lang="pt-BR">');
    lines.push("<head>");
    lines.push('<meta charset="utf-8">');
    lines.push("<title>" + escapeHtml(state.report.name || "Relatorio") + "</title>");
    lines.push("<style>");
    lines.push("  @page {");
    lines.push("    size: " + pageSizeCss + ";");
    lines.push("    margin: " + mt + "mm " + mr + "mm " + mb + "mm " + ml + "mm;");
    lines.push("  }");
    lines.push("  body {");
    lines.push("    font-family: " + font + ";");
    lines.push("    font-size: " + fsize + "pt;");
    lines.push("    color: #333333;");
    lines.push("    margin: 0; padding: 0;");
    lines.push("  }");
    lines.push("  /* Cabecalho e rodape fixos — repetidos em todas as paginas pelo DOMPDF */");
    lines.push("  .rpt-page-header {");
    lines.push("    position: fixed;");
    lines.push("    top: -" + mt + "mm;");
    lines.push("    left: -" + ml + "mm;");
    lines.push("    right: -" + mr + "mm;");
    lines.push("    padding: 4mm " + ml + "mm 3mm;");
    lines.push("    background: #ffffff;");
    lines.push("  }");
    lines.push("  .rpt-page-footer {");
    lines.push("    position: fixed;");
    lines.push("    bottom: -" + mb + "mm;");
    lines.push("    left: -" + ml + "mm;");
    lines.push("    right: -" + mr + "mm;");
    lines.push("    padding: 2mm " + ml + "mm 3mm;");
    lines.push("    background: #ffffff;");
    lines.push("  }");
    lines.push("  .rpt-body { margin-top: " + (parseInt(mt, 10) + 5) + "mm; }");
    lines.push("  /* Tabela de dados */");
    lines.push("  .rpt-data-table { width: 100%; border-collapse: collapse; margin-bottom: 6pt; }");
    lines.push("  .rpt-data-table thead tr { background: " + pc + "; color: " + htc + "; }");
    lines.push("  .rpt-data-table th { padding: 4pt 6pt; text-align: left; font-size: 9pt; font-weight: bold; }");
    lines.push("  .rpt-data-table td { padding: 3pt 6pt; border-bottom: 1pt solid " + lc + "; font-size: 9pt; }");
    if (striped) {
      lines.push("  .rpt-data-table tbody tr:nth-child(even) td { background: #f8f9fb; }");
    }
    lines.push("  .rpt-data-table tfoot td { background: #f4f6fa; border-top: 2pt solid " + lc + "; font-weight: bold; font-size: 9pt; }");
    lines.push("  /* Tabela de informacoes */");
    lines.push("  .rpt-info-table { font-size: 9pt; border-collapse: collapse; margin-bottom: 6pt; }");
    lines.push("  .rpt-info-table td { padding: 2pt 4pt; }");
    lines.push("  .rpt-info-label { font-weight: bold; width: 120pt; }");
    lines.push("  /* Resumo */");
    lines.push("  .rpt-summary-table { width: 100%; border-collapse: collapse; border-top: 2pt solid " + lc + "; margin-bottom: 6pt; }");
    lines.push("  .rpt-summary-table td { padding: 3pt 6pt; font-size: 9pt; }");
    lines.push("  .rpt-section-title { font-weight: bold; font-size: 10pt; margin-bottom: 4pt; margin-top: 2pt; }");
    lines.push("  /* Numeracao de paginas (DOMPDF) */");
    lines.push('  .pagenum:before { content: counter(page); }');
    lines.push('  .pagecount:before { content: counter(pages); }');
    lines.push("</style>");
    lines.push("</head>");
    lines.push("<body>");
    lines.push("");

    // Page Header
    lines.push("<!-- CABECALHO DA PAGINA: repete em todas as paginas (DOMPDF position:fixed) -->");
    lines.push('<div class="rpt-page-header">');
    lines.push('  <table style="width:100%; border-collapse:collapse">');
    lines.push("    <tr>");
    if (h.showLogo && h.logoUrl) {
      lines.push('      <td style="width:' + escapeAttr(h.logoHeight || "40") + 'px; vertical-align:middle">');
      lines.push('        <img src="' + escapeAttr(h.logoUrl) + '" height="' + escapeAttr(h.logoHeight || "40") + '">');
      lines.push("      </td>");
    } else if (h.showLogo) {
      lines.push('      <td style="width:60px; vertical-align:middle">');
      lines.push("        <img src=\"<!-- URL_LOGO -->\" height=\"" + escapeAttr(h.logoHeight || "40") + "\">");
      lines.push("      </td>");
    }
    lines.push('      <td style="vertical-align:middle">');
    if (h.companyName) lines.push("        <strong>" + escapeHtml(h.companyName) + "</strong><br>");
    if (h.reportTitle) lines.push("        " + escapeHtml(h.reportTitle));
    if (h.reportSubtitle) lines.push("<br>        <small>" + escapeHtml(h.reportSubtitle) + "</small>");
    lines.push("      </td>");
    if (h.showDate) {
      lines.push('      <td style="text-align:right; vertical-align:top; font-size:8pt; color:#666">');
      lines.push("        Gerado em: <!-- DATA_GERACAO -->");
      lines.push("      </td>");
    }
    lines.push("    </tr>");
    lines.push("  </table>");
    lines.push('  <hr style="border:none; border-top:2pt solid ' + pc + '; margin:4pt 0 0">');
    lines.push("</div>");
    lines.push("<!-- /CABECALHO -->");
    lines.push("");

    // Page Footer
    lines.push("<!-- RODAPE DA PAGINA: repete em todas as paginas (DOMPDF position:fixed) -->");
    lines.push('<div class="rpt-page-footer">');
    lines.push('  <hr style="border:none; border-top:1pt solid ' + lc + '; margin:0 0 3pt">');
    lines.push('  <table style="width:100%; font-size:8pt; color:#666; border-collapse:collapse">');
    lines.push("    <tr>");
    lines.push('      <td>' + escapeHtml(f.leftText || "") + "</td>");
    if (f.showPageNum) {
      lines.push('      <td style="text-align:center">Página <span class="pagenum"></span> de <span class="pagecount"></span></td>');
    } else {
      lines.push('      <td style="text-align:center"></td>');
    }
    lines.push('      <td style="text-align:right">' + escapeHtml(f.rightText || "") + "</td>");
    lines.push("    </tr>");
    lines.push("  </table>");
    lines.push("</div>");
    lines.push("<!-- /RODAPE -->");
    lines.push("");

    // Body wrapper
    lines.push('<div class="rpt-body">');
    lines.push("");

    // Sections
    state.report.sections.forEach(function (section) {
      lines.push(exportSection(section));
      lines.push("");
    });

    lines.push("</div><!-- /rpt-body -->");
    lines.push("");
    lines.push("</body>");
    lines.push("</html>");

    return lines.join("\n");
  }

  function exportSection(section) {
    const inner = exportSectionInner(section);
    const styleStr = buildStyleStr(section.props && section.props.style);
    if (styleStr) {
      return '<div style="' + styleStr + '">\n' + inner + "\n</div>";
    }
    return inner;
  }

  function exportSectionInner(section) {
    const p = section.props || {};
    switch (section.type) {
      case "reportInfo": return exportInfoSection(p);
      case "dataTable":  return exportDataTableSection(p);
      case "summary":    return exportSummarySection(p);
      case "divider":    return exportDividerSection(p);
      case "customHtml": return exportCustomHtmlSection(p);
      case "qrCode":     return exportQrCodeSection(p);
      case "barcode":    return exportBarcodeSection(p);
      case "gridTable":  return exportGridTable(p, "");
      default: return "";
    }
  }

  function indentBlock(str, ind) {
    if (!ind) return str;
    return str.split("\n").map(function (l) { return ind + l; }).join("\n");
  }

  // Miolo compartilhado (usado por secao QR e por bloco-celula QR).
  function qrImgHtml(p) {
    const token = p.srcToken || "QRCODE_SRC";
    const size = escapeAttr(p.size || "30");
    const align = escapeAttr(p.align || "center");
    let h = '<div style="text-align:' + align + '; margin:4pt 0">\n';
    h += '  <img src="' + escapeAttr(token) + '" alt="QR Code" style="width:' + size + 'mm; height:' + size + 'mm">';
    if (p.caption) h += '\n  <div style="font-size:8pt; margin-top:2pt">' + escapeHtml(p.caption) + "</div>";
    h += "\n</div>";
    return h;
  }

  function barcodeImgHtml(p) {
    const token = p.srcToken || "BARCODE_SRC";
    const align = escapeAttr(p.align || "center");
    const height = escapeAttr(p.height || "15");
    const widthStyle = p.widthMode === "fixed" ? "width:" + escapeAttr(p.width || "60") + "mm" : "width:100%";
    let h = '<div style="text-align:' + align + '; margin:4pt 0">\n';
    h += '  <img src="' + escapeAttr(token) + '" alt="Codigo de barras" style="' + widthStyle + "; height:" + height + 'mm">';
    if (p.showCaption && p.caption) h += '\n  <div style="font-family:monospace; font-size:8pt; letter-spacing:2px; margin-top:1pt">' + escapeHtml(p.caption) + "</div>";
    h += "\n</div>";
    return h;
  }

  function exportQrCodeSection(p) {
    const token = p.srcToken || "QRCODE_SRC";
    const lines = [];
    lines.push("<!-- ============================================================");
    lines.push("     QR CODE  (NFC-e: QR Code de consulta)");
    lines.push("     Gere a imagem no Laravel e substitua o token \"" + token + "\"");
    lines.push("     por um data URI base64. Ex.: simplesoftwareio/simple-qrcode");
    lines.push("");
    lines.push("       composer require simplesoftwareio/simple-qrcode");
    lines.push("");
    lines.push("       // Controller:");
    lines.push("       $png = base64_encode(QrCode::format('png')->size(300)->margin(0)->generate($chaveAcesso));");
    lines.push("       $qrcode = 'data:image/png;base64,' . $png;");
    lines.push("");
    lines.push("       // Na view Blade, use a variavel $qrcode no src (no lugar de " + token + ")");
    lines.push("     ============================================================ -->");
    return lines.join("\n") + "\n" + qrImgHtml(p) + "\n<!-- /QR Code -->";
  }

  function exportBarcodeSection(p) {
    const token = p.srcToken || "BARCODE_SRC";
    const sym = p.symbology || "CODE128";
    const picqerConst = {
      CODE128: "TYPE_CODE_128", EAN13: "TYPE_EAN_13", EAN8: "TYPE_EAN_8",
      CODE39: "TYPE_CODE_39", UPCA: "TYPE_UPC_A", ITF: "TYPE_INTERLEAVED_2_5"
    }[sym] || "TYPE_CODE_128";
    const lines = [];
    lines.push("<!-- ============================================================");
    lines.push("     CODIGO DE BARRAS  (" + sym + ")");
    lines.push("     Gere a imagem no Laravel e substitua o token \"" + token + "\"");
    lines.push("     por um data URI base64. Ex.: picqer/php-barcode-generator");
    lines.push("");
    lines.push("       composer require picqer/php-barcode-generator");
    lines.push("");
    lines.push("       // Controller:");
    lines.push("       $gen = new Picqer\\Barcode\\BarcodeGeneratorPNG();");
    lines.push("       $png = base64_encode($gen->getBarcode($valor, $gen::" + picqerConst + "));");
    lines.push("       $barcode = 'data:image/png;base64,' . $png;");
    lines.push("");
    lines.push("       // Na view Blade, use a variavel $barcode no src (no lugar de " + token + ")");
    lines.push("     ============================================================ -->");
    return lines.join("\n") + "\n" + barcodeImgHtml(p) + "\n<!-- /Codigo de Barras -->";
  }

  // Export recursivo da Tabela de Layout (grid).
  function exportGridTable(tp, ind) {
    ind = ind || "";
    const border = tp.border !== false;
    const bc = escapeAttr(tp.borderColor || "#333333");
    const pad = escapeAttr(tp.cellPadding || "4");
    const widthCss = tp.width === "auto" ? "" : "width:100%;";
    const lines = [];
    lines.push(ind + '<table style="' + widthCss + 'border-collapse:collapse">');
    (tp.rows || []).forEach(function (row) {
      lines.push(ind + "  <tr>");
      row.forEach(function (cell) {
        const tdStyle = [];
        if (border) tdStyle.push("border:1px solid " + bc);
        tdStyle.push("padding:" + pad + "pt");
        tdStyle.push("text-align:" + (cell.align || "left"));
        tdStyle.push("vertical-align:" + (cell.valign || "top"));
        if (cell.bg) tdStyle.push("background-color:" + escapeAttr(cell.bg));
        const blocks = cell.blocks || [];
        const inner = blocks.map(function (b) { return exportBlock(b, ind + "      "); }).filter(Boolean).join("\n");
        if (inner) {
          lines.push(ind + '    <td style="' + tdStyle.join(";") + '">');
          lines.push(inner);
          lines.push(ind + "    </td>");
        } else {
          lines.push(ind + '    <td style="' + tdStyle.join(";") + '">&nbsp;</td>');
        }
      });
      lines.push(ind + "  </tr>");
    });
    lines.push(ind + "</table>");
    return lines.join("\n");
  }

  function exportBlock(block, ind) {
    ind = ind || "";
    const p = block.props || {};
    switch (block.type) {
      case "text": {
        const st = [];
        if (p.align && p.align !== "left") st.push("text-align:" + p.align);
        if (p.bold) st.push("font-weight:bold");
        if (p.size) st.push("font-size:" + escapeAttr(p.size) + "pt");
        const styleAttr = st.length ? ' style="' + st.join(";") + '"' : "";
        return ind + "<div" + styleAttr + ">" + escapeHtml(p.content || "") + "</div>";
      }
      case "image": {
        const token = p.srcToken || "IMG_SRC";
        const st = [];
        if (p.width) st.push("width:" + escapeAttr(p.width) + "mm");
        if (p.height) st.push("height:" + escapeAttr(p.height) + "mm");
        const styleAttr = st.length ? ' style="' + st.join(";") + '"' : "";
        const wrap = p.align && p.align !== "left" ? ' style="text-align:' + p.align + '"' : "";
        return ind + "<div" + wrap + '><img src="' + escapeAttr(token) + '" alt="' + escapeAttr(p.alt || "") + '"' + styleAttr + "></div>";
      }
      case "link":
        return ind + '<div style="text-align:' + (p.align || "left") + '"><a href="' + escapeAttr(p.href || "#") + '">' + escapeHtml(p.text || "Link") + "</a></div>";
      case "qrcode":
        return ind + "<!-- QR: substitua " + (p.srcToken || "QRCODE_SRC") + " pela imagem (data URI base64) -->\n" + indentBlock(qrImgHtml(p), ind);
      case "barcode":
        return ind + "<!-- Barras: substitua " + (p.srcToken || "BARCODE_SRC") + " pela imagem (data URI base64) -->\n" + indentBlock(barcodeImgHtml(p), ind);
      case "table":
        return exportGridTable(p, ind);
      default:
        return "";
    }
  }

  function exportInfoSection(p) {
    const rows = Array.isArray(p.rows) ? p.rows : [];
    const lines = [];
    lines.push("<!-- SECAO: Informacoes do relatorio -->");
    if (p.showTitle && p.title) {
      lines.push('<p class="rpt-section-title">' + escapeHtml(p.title) + "</p>");
    }
    lines.push('<table class="rpt-info-table">');
    rows.forEach(function (row) {
      lines.push("  <tr>");
      lines.push('    <td class="rpt-info-label">' + escapeHtml(row.label || "") + ":</td>");
      lines.push("    <td><!-- " + (row.placeholder || "VALOR") + " --></td>");
      lines.push("  </tr>");
    });
    lines.push("</table>");
    lines.push("<!-- /Informacoes -->");
    return lines.join("\n");
  }

  function exportDataTableSection(p) {
    const cols = Array.isArray(p.columns) ? p.columns : [];
    const footerRows = Array.isArray(p.footerRows) ? p.footerRows : [];
    const lines = [];
    lines.push("<!-- SECAO: Tabela de dados -->");
    if (p.showTitle && p.title) {
      lines.push('<p class="rpt-section-title">' + escapeHtml(p.title) + "</p>");
    }
    lines.push('<table class="rpt-data-table">');
    lines.push("  <thead>");
    lines.push("    <tr>");
    cols.forEach(function (col) {
      const w = col.width ? ' style="width:' + escapeAttr(col.width) + 'px; text-align:' + escapeAttr(col.align || "left") + '"' : ' style="text-align:' + escapeAttr(col.align || "left") + '"';
      lines.push("      <th" + w + ">" + escapeHtml(col.label || "") + "</th>");
    });
    lines.push("    </tr>");
    lines.push("  </thead>");
    lines.push("  <tbody>");
    lines.push("    <!-- LINHA DE DADOS: substituir pelo @foreach do Laravel -->");
    lines.push("    <tr>");
    cols.forEach(function (col) {
      const align = col.align ? ' style="text-align:' + escapeAttr(col.align) + '"' : "";
      lines.push("      <td" + align + "><!-- " + (col.placeholder || "col") + " --></td>");
    });
    lines.push("    </tr>");
    lines.push("    <!-- /LINHA DE DADOS -->");
    lines.push("  </tbody>");
    if (p.showFooter && footerRows.length) {
      lines.push("  <tfoot>");
      footerRows.forEach(function (row) {
        const colspan = Math.max(1, cols.length - 1);
        const align = row.align || "right";
        lines.push("    <tr>");
        lines.push('      <td colspan="' + colspan + '" style="text-align:right">' + escapeHtml(row.label || "") + "</td>");
        lines.push('      <td style="text-align:' + escapeAttr(align) + '"><!-- ' + (row.placeholder || "TOTAL") + " --></td>");
        lines.push("    </tr>");
      });
      lines.push("  </tfoot>");
    }
    lines.push("</table>");
    lines.push("<!-- /Tabela de dados -->");
    return lines.join("\n");
  }

  function exportSummarySection(p) {
    const rows = Array.isArray(p.rows) ? p.rows : [];
    const lines = [];
    lines.push("<!-- SECAO: Resumo / Totais -->");
    if (p.showTitle && p.title) {
      lines.push('<p class="rpt-section-title">' + escapeHtml(p.title) + "</p>");
    }
    lines.push('<table class="rpt-summary-table">');
    rows.forEach(function (row) {
      const bold = row.bold ? " font-weight:bold;" : "";
      lines.push("  <tr>");
      lines.push('    <td class="rpt-sum-label" style="' + bold + '">' + escapeHtml(row.label || "") + "</td>");
      lines.push('    <td style="text-align:right;' + bold + '"><!-- ' + (row.placeholder || "VALOR") + " --></td>");
      lines.push("  </tr>");
    });
    lines.push("</table>");
    lines.push("<!-- /Resumo -->");
    return lines.join("\n");
  }

  function exportDividerSection(p) {
    const color = escapeAttr(p.color || "#dddddd");
    const thickness = escapeAttr(p.thickness || "1");
    return "<!-- Divisor -->\n" +
           '<hr style="border:none; border-top:' + thickness + 'pt solid ' + color + '; margin:6pt 0">\n' +
           "<!-- /Divisor -->";
  }

  function exportCustomHtmlSection(p) {
    return "<!-- SECAO: HTML personalizado -->\n" +
           (p.content || "") + "\n" +
           "<!-- /HTML personalizado -->";
  }

  // =====================================================
  // TOAST
  // =====================================================
  function showToast(msg) {
    let toast = document.getElementById("rpt-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "rpt-toast";
      toast.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1d273b;color:#fff;padding:8px 18px;border-radius:6px;font-size:13px;z-index:9999;pointer-events:none;transition:opacity .3s";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = "1";
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { toast.style.opacity = "0"; }, 1800);
  }

  // =====================================================
  // BOOT
  // =====================================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
