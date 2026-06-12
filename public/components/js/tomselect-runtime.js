// Runtime do componente TomSelect na pagina exportada.
// Varre o DOM por [data-tomselect] e inicializa cada select lendo a config dos data-*
//   (data-ajax-url, data-json-path, data-value-field, data-tomselect-create, etc.).
// Quando ha data-ajax-url, dois modos:
// - Padrao: UMA busca completa no carregamento; clique/digitacao filtram localmente.
// - Busca remota (data-remote-search="true"): usa o load do TomSelect — cada pausa
//   na digitacao (debounce data-load-throttle, ms) consulta a URL com o termo no
//   parametro data-search-param (ex: ?q=maria); o servidor devolve so o que casa.
//   data-preload="true" dispara uma consulta vazia ao abrir o select.
// Equivale ao antigo renderTomSelectInitializer de export-html.js.
(function () {
  var runtimeName = "TemplateBuilderTomSelectRuntime";

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

    // Seletor qualificado com a tag (mesma protecao do fullcalendar-runtime: nao casar
    // com elementos que alguma lib injete carregando o mesmo atributo marcador).
    scope.querySelectorAll("select[data-tomselect]").forEach(function (select) {
      setup(select);
    });
  }

  function setup(select) {
    if (!select || select.tomselect) {
      return;
    }

    if (!window.TomSelect) {
      return;
    }

    var ajaxUrl = select.dataset.ajaxUrl || "";
    var jsonPath = select.dataset.jsonPath || "";
    var remoteSearch = select.dataset.remoteSearch === "true" && Boolean(ajaxUrl);
    var searchParam = select.dataset.searchParam || "q";
    var loadThrottle = parseInt(select.dataset.loadThrottle, 10);
    if (isNaN(loadThrottle) || loadThrottle < 0) loadThrottle = 300;
    var preload = select.dataset.preload === "true";
    var valueField = select.dataset.valueField || "id";
    var labelField = select.dataset.labelField || "text";
    var searchFields = (select.dataset.searchField || labelField).split(",").map(function (f) {
      return f.trim();
    }).filter(Boolean);
    var allowEmptyOption = select.dataset.allowEmptyOption !== "false";
    var sortField = (select.dataset.sortField || "text").trim();
    var sortDirection = (select.dataset.sortDirection || "asc").trim();
    var maxOptions = parseInt(select.dataset.maxOptions, 10) || 100;
    var plugins;
    if (select.multiple) {
      plugins = ["remove_button", "clear_button"];
    } else {
      plugins = ["clear_button"];
    }

    var settings = {
      plugins: plugins,
      copyClassesToDropdown: false,
      dropdownParent: "body",
      valueField: valueField,
      labelField: labelField,
      searchField: searchFields,
      create: resolveCreate(select),
      placeholder: select.dataset.placeholder || "",
      allowEmptyOption: allowEmptyOption,
      sortField: [{ field: sortField, direction: sortDirection }],
      maxOptions: maxOptions,
      render: {
        no_results: function () {
          return '<div class="no-results px-2 py-2 text-secondary">Nenhum resultado encontrado</div>';
        }
      }
    };

    if (remoteSearch) {
      // Busca remota: o servidor filtra; o debounce evita uma requisicao por tecla.
      settings.loadThrottle = loadThrottle;
      if (preload) {
        settings.preload = "focus"; // consulta vazia ao abrir (primeiros resultados)
      }
      settings.load = function (query, callback) {
        fetch(buildSearchUrl(ajaxUrl, searchParam, query)).then(function (r) {
          if (r.ok) {
            return r.json();
          } else {
            return null;
          }
        }).then(function (response) {
          if (!response) {
            callback();
            return;
          }
          var items;
          if (jsonPath) {
            items = readJsonPath(response, jsonPath);
          } else {
            items = response;
          }
          if (!Array.isArray(items)) {
            items = [];
          }
          callback(items);
        }).catch(function () {
          callback();
        });
      };
    }

    var ts = new window.TomSelect(select, settings);

    if (ajaxUrl && !remoteSearch) {
      // Modo padrao: busca completa uma unica vez; o resto e filtro local.
      fetch(ajaxUrl).then(function (r) {
        if (r.ok) {
          return r.json();
        } else {
          return null;
        }
      }).then(function (response) {
        if (!response) {
          return;
        }
        var items;
        if (jsonPath) {
          items = readJsonPath(response, jsonPath);
        } else {
          items = response;
        }
        if (!Array.isArray(items) || !items.length) {
          return;
        }
        ts.addOptions(items);
        ts.refreshOptions(false);
      }).catch(function () {});
    }
  }

  // Monta a URL da busca remota preservando query string existente.
  function buildSearchUrl(baseUrl, param, query) {
    var separator;
    if (baseUrl.indexOf("?") >= 0) {
      separator = "&";
    } else {
      separator = "?";
    }
    return baseUrl + separator + encodeURIComponent(param) + "=" + encodeURIComponent(query || "");
  }

  // Botao "criar": com URL abre uma nova aba (e nao cria local); sem URL usa o create
  // padrao do TomSelect (true) quando habilitado; desabilitado retorna false.
  function resolveCreate(select) {
    var createEnabled = select.dataset.tomselectCreate === "true";
    var createUrl = select.dataset.createUrl || "";

    if (createEnabled && createUrl) {
      return function () {
        window.open(createUrl, "_blank");
        return false;
      };
    }

    return createEnabled;
  }

  function readJsonPath(response, jsonPath) {
    return jsonPath.split(".").reduce(function (value, key) {
      return value && value[key];
    }, response);
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
