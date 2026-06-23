// Runtime do componente TomSelect + Criar Novo.
// Para cada select[data-tomselect][data-create-modal="true"]:
//   - Inicializa TomSelect normalmente (AJAX, busca remota, etc.)
//   - Adiciona opcao sentinela "Criar novo" sempre visivel no topo
//   - Ao selecionar a sentinela: abre modal Bootstrap com iframe (lazy load)
//   - Recebe window.postMessage do iframe apos salvar e seleciona o novo registro
//
// Contrato do iframe (formulario externo):
//   window.parent.postMessage({ dsb_action: 'select_created', id: '123', text: 'Nome' }, '*')
(function () {
  var runtimeName = "TemplateBuilderTomSelectCreateRuntime";
  var CREATE_SENTINEL = "__dsb_create_new__";
  var activeCreateContext = null;

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  function init(root) {
    var scope = (root && root.querySelectorAll) ? root : document;
    scope.querySelectorAll('select[data-tomselect][data-create-modal="true"]').forEach(function (select) {
      setup(select);
    });
  }

  function setup(select) {
    if (!select || select.tomselect) return;
    if (!window.TomSelect) return;

    var ajaxUrl          = select.dataset.ajaxUrl || "";
    var jsonPath         = select.dataset.jsonPath || "";
    var remoteSearch     = select.dataset.remoteSearch === "true" && Boolean(ajaxUrl);
    var searchParam      = select.dataset.searchParam || "q";
    var loadThrottle     = parseInt(select.dataset.loadThrottle, 10);
    if (isNaN(loadThrottle) || loadThrottle < 0) loadThrottle = 300;
    var preload          = select.dataset.preload === "true";
    var valueField       = select.dataset.valueField || "id";
    var labelField       = select.dataset.labelField || "text";
    var searchFields     = (select.dataset.searchField || labelField).split(",").map(function (f) { return f.trim(); }).filter(Boolean);
    var allowEmptyOption = select.dataset.allowEmptyOption !== "false";
    var sortField        = (select.dataset.sortField || "text").trim();
    var sortDirection    = (select.dataset.sortDirection || "asc").trim();
    var maxOptions       = parseInt(select.dataset.maxOptions, 10) || 100;
    var createLabel      = select.dataset.createLabel || "Criar novo";
    var createUrl        = select.dataset.createUrl || "";
    var modalId          = select.dataset.modalId || "";
    var responseValueField = select.dataset.responseValueField || "id";
    var responseLabelField = select.dataset.responseLabelField || "text";
    var optionHtmlField = (select.dataset.optionHtmlField || "").trim();
    var itemHtmlField = (select.dataset.itemHtmlField || "").trim();

    var modalEl  = modalId ? document.getElementById(modalId) : null;
    var iframeEl = modalEl ? modalEl.querySelector("[data-create-iframe]") : null;

    var plugins = select.multiple ? ["remove_button", "clear_button"] : ["clear_button"];

    var sentinelOption = {};
    sentinelOption[valueField] = CREATE_SENTINEL;
    sentinelOption[labelField] = createLabel;

    function addSentinel(ts) {
      if (!createUrl) return;
      ts.addOption(sentinelOption);
      ts.refreshOptions(false);
    }

    var settings = {
      plugins: plugins,
      copyClassesToDropdown: false,
      dropdownParent: "body",
      valueField: valueField,
      labelField: labelField,
      searchField: searchFields,
      create: false,
      placeholder: select.dataset.placeholder || "",
      allowEmptyOption: allowEmptyOption,
      sortField: [{ field: sortField, direction: sortDirection }],
      maxOptions: maxOptions,
      render: {
        no_results: function () {
          return '<div class="no-results px-2 py-2 text-secondary">Nenhum resultado encontrado</div>';
        },
        option: function (data, escape) {
          if (data[valueField] === CREATE_SENTINEL) {
            return '<div style="color:var(--tblr-primary,#066fd1);font-weight:500;padding:4px 0">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" ' +
              'stroke="currentColor" stroke-width="2" style="margin-right:5px;vertical-align:-2px">' +
              '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
              escape(data[labelField]) + '</div>';
          }
          if (optionHtmlField) {
            var h = data[optionHtmlField];
            return '<div class="ts-html-option">' + (h != null && h !== "" ? h : escape(data[labelField] || "")) + "</div>";
          }
          return '<div>' + escape(data[labelField]) + '</div>';
        }
      },
      onInitialize: function () {
        addSentinel(this);
      },
      onChange: function (value) {
        if (value !== CREATE_SENTINEL) return;
        var ts = this;
        ts.clear(true);
        if (!modalEl || !createUrl) return;
        if (window.bootstrap && window.bootstrap.Modal) {
          window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }
      }
    };

    if (itemHtmlField) {
      settings.render.item = function (data, escape) {
        var h = data[itemHtmlField];
        return '<div class="ts-html-item">' + (h != null && h !== "" ? h : escape(data[labelField] || "")) + "</div>";
      };
    }

    if (remoteSearch) {
      settings.loadThrottle = loadThrottle;
      if (preload) settings.preload = "focus";
      settings.load = function (query, callback) {
        fetch(buildSearchUrl(ajaxUrl, searchParam, query))
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (response) {
            if (!response) { callback(); return; }
            var items = jsonPath ? readJsonPath(response, jsonPath) : response;
            callback(Array.isArray(items) ? items : []);
          })
          .catch(function () { callback(); });
      };
    }

    var ts = new window.TomSelect(select, settings);

    if (ajaxUrl && !remoteSearch) {
      fetch(ajaxUrl)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (response) {
          if (!response) return;
          var items = jsonPath ? readJsonPath(response, jsonPath) : response;
          if (!Array.isArray(items) || !items.length) return;
          ts.addOptions(items);
          addSentinel(ts);
        })
        .catch(function () {});
    }

    if (modalEl) {
      // Seta contexto ativo ao abrir (cobre tanto o botao quanto a opcao sentinela)
      modalEl.addEventListener("show.bs.modal", function () {
        if (iframeEl && !iframeEl.src && createUrl) {
          iframeEl.src = createUrl;
        }
        activeCreateContext = {
          ts: ts,
          modalEl: modalEl,
          iframeEl: iframeEl,
          valueField: valueField,
          labelField: labelField,
          responseValueField: responseValueField,
          responseLabelField: responseLabelField
        };
      });

      // Reseta iframe e contexto ao fechar
      modalEl.addEventListener("hidden.bs.modal", function () {
        if (iframeEl) iframeEl.src = "";
        if (activeCreateContext && activeCreateContext.modalEl === modalEl) {
          activeCreateContext = null;
        }
      });
    }
  }

  // Recebe postMessage do iframe apos salvar o registro
  window.addEventListener("message", function (event) {
    if (!event.data || event.data.dsb_action !== "select_created") return;
    if (!activeCreateContext) return;

    var ctx = activeCreateContext;
    var id   = String(event.data[ctx.responseValueField] != null ? event.data[ctx.responseValueField] : (event.data.id || ""));
    var text = String(event.data[ctx.responseLabelField] != null ? event.data[ctx.responseLabelField] : (event.data.text || ""));
    if (!id) return;

    var newOption = {};
    newOption[ctx.valueField] = id;
    newOption[ctx.labelField] = text;

    ctx.ts.addOption(newOption);
    ctx.ts.setValue(id, true);
    if (ctx.modalEl && window.bootstrap && window.bootstrap.Modal) {
      var inst = window.bootstrap.Modal.getInstance(ctx.modalEl);
      if (inst) inst.hide();
    }
    // iframe e limpo pelo listener hidden.bs.modal
  });

  function buildSearchUrl(baseUrl, param, query) {
    var sep = baseUrl.indexOf("?") >= 0 ? "&" : "?";
    return baseUrl + sep + encodeURIComponent(param) + "=" + encodeURIComponent(query || "");
  }

  function readJsonPath(response, jsonPath) {
    return jsonPath.split(".").reduce(function (value, key) {
      return value && value[key];
    }, response);
  }

  window[runtimeName] = { init: init };

  document.addEventListener("fieldlist:row-added", function (e) {
    if (e.detail && e.detail.row) init(e.detail.row);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
