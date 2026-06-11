// Runtime do componente Grafico (ApexCharts) na pagina exportada.
// Varre o DOM por [data-apex-chart] e inicializa cada grafico lendo a config dos
// atributos data-*. As opcoes ja vem prontas em data-chart-options (JSON); quando ha
// data-chart-ajax-url, busca os dados e injeta no grafico antes de renderizar.
// Equivale ao antigo renderApexChartInitializer de export-html.js.
(function () {
  var runtimeName = "TemplateBuilderApexChartRuntime";

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

    // Seletor qualificado com a tag (mesma protecao do fullcalendar-runtime).
    scope.querySelectorAll("div[data-apex-chart]").forEach(function (el) {
      setup(el);
    });
  }

  function setup(el) {
    if (el.getAttribute("data-apex-chart-ready") === "1") {
      return;
    }

    if (!window.ApexCharts) {
      return;
    }

    el.setAttribute("data-apex-chart-ready", "1");

    var opts = parseOptions(el.getAttribute("data-chart-options"));
    var ajaxUrl = el.getAttribute("data-chart-ajax-url") || "";
    var chartType = el.getAttribute("data-chart-type") || "";
    var isPieDonut = chartType === "pie" || chartType === "donut";

    if (!ajaxUrl) {
      new window.ApexCharts(el, opts).render();
      return;
    }

    fetch(ajaxUrl).then(function (r) {
      if (r.ok) {
        return r.json();
      } else {
        return null;
      }
    }).then(function (data) {
      if (data) {
        if (isPieDonut) {
          if (Array.isArray(data.values)) { opts.series = data.values; }
          if (Array.isArray(data.labels)) { opts.labels = data.labels; }
        } else {
          if (Array.isArray(data.series)) { opts.series = data.series; }
          if (Array.isArray(data.categories)) {
            opts.xaxis = opts.xaxis || {};
            opts.xaxis.categories = data.categories;
          }
        }
      }
      new window.ApexCharts(el, opts).render();
    }).catch(function () {
      new window.ApexCharts(el, opts).render();
    });
  }

  function parseOptions(raw) {
    try {
      return JSON.parse(raw || "{}");
    } catch (error) {
      return {};
    }
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
