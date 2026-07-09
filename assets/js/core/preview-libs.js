// PREVIEW "VIVO" DAS LIBS NO CANVAS DO EDITOR — inicializa TomSelect, ApexCharts,
// Litepicker, Dropzone, FullCalendar, Gantt, toggle de senha e quantity stepper
// nos componentes renderizados no canvas (.component-preview), carregando os
// scripts/estilos das libs sob demanda (loadPreviewAsset, com cache de Promise).
// Uso (builder.js): TemplateBuilderPreviewLibs.create({ collectExportComponents,
// getComponentDefinition, state }) => { initializePreviewComponents, initializePreviewPasswordToggles }.
(function () {
  "use strict";

  const previewAssetPromises = new Map();
  let ctx = null; // { collectExportComponents, getComponentDefinition, state } vindos do builder

  function create(context) {
    ctx = context;
    return {
      initializePreviewComponents,
      initializePreviewPasswordToggles
    };
  }

  // Detecta quais bibliotecas de icone de fonte (Lineicons/Font Awesome) a pagina usa
  // e devolve os CSS necessarios — mesma logica de collectIconLibraryStyles em
  // export-html.js (duplicado de proposito: modulo separado, funcao pequena, e o
  // canvas precisa do resultado ANTES de exportar, entao nao da pra so reusar
  // collectExportAssets aqui).
  function getIconLibraryStyleHrefs() {
    const pageJson = JSON.stringify(ctx.state.page);
    const hrefs = [];
    if (pageJson.indexOf('"lineicons-regular:') !== -1) {
      hrefs.push("public/components/libs/lineicons-5.1-free/free-regular-font/lineicons-free.css");
    }
    if (pageJson.indexOf('"lineicons-solid:') !== -1) {
      hrefs.push("public/components/libs/lineicons-5.1-free/free-solid-fonts/lineicons-free-solid.css");
    }
    if (pageJson.indexOf('"fa-solid:') !== -1 || pageJson.indexOf('"fa-regular:') !== -1 || pageJson.indexOf('"fa-brands:') !== -1) {
      hrefs.push("public/components/libs/fontawesome-free-7.3.0-web/css/all.min.css");
    }
    return hrefs;
  }

  function initializePreviewComponents() {
    const definitions = ctx.collectExportComponents().map((component) => ctx.getComponentDefinition(component.type));
    const definitionsWithAssets = definitions.filter((definition) => definition.assets);

    const iconStylePromises = getIconLibraryStyleHrefs().map((href) => loadPreviewAsset(href, "style"));

    if (!definitionsWithAssets.length) {
      Promise.all(iconStylePromises).catch(() => {});
      return;
    }

    const stylePromises = definitionsWithAssets.flatMap((definition) => {
      return (definition.assets.styles || []).map((asset) => loadPreviewAsset(asset, "style"));
    });
    const scriptPromises = definitionsWithAssets
      .filter((definition) => ["litepicker", "apexchart", "dropzone", "fullcalendar"].includes(definition.assets.init))
      .flatMap((definition) => (definition.assets.scripts || []).map((asset) => loadPreviewAsset(asset, "script")));
    initializePreviewQuantitySteppers();
    Promise.all([...stylePromises, ...scriptPromises, ...iconStylePromises]).then(() => {
      initializePreviewLitePickers();
      initializePreviewTomSelects();
      initializePreviewApexCharts();
      initializePreviewDropzones();
      initializePreviewFullCalendars();
      initializePreviewGantts();
    }).catch(() => {});
  }

  // Gantt: o runtime e vanilla (sem lib) e fica carregado no builder (index.html).
  // Apos cada render do canvas, re-escaneia os [data-gantt] (o guard _ganttReady evita
  // dupla inicializacao). O runtime busca a URL de dados (default mock/gantt.json).
  function initializePreviewGantts() {
    if (window.TemplateBuilderGanttRuntime && window.TemplateBuilderGanttRuntime.init) {
      window.TemplateBuilderGanttRuntime.init();
    }
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
      const tsPlugins = select.multiple ? ["remove_button", "clear_button"] : ["clear_button"];
      if (select.dataset.checkboxOptions === "true") {
        tsPlugins.push("checkbox_options");
      }
      const settings = {
        plugins: tsPlugins,
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


  window.TemplateBuilderPreviewLibs = { create };
}());
