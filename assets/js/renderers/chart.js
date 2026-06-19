// Renderer para componentes de graficos ApexCharts (kind: "chart").
// Trata todos os tipos: line-spline, area-spline, column, distributed, pie, donut.
// Expoe window.TemplateBuilderChartHelpers.buildApexOptions para que export-html.js
// possa reutilizar a mesma logica de opcoes ao gerar o <script> do HTML exportado.
(function () {
  "use strict";

  // Paletas de cores usando CSS color-mix com variaveis do Tabler.
  // Isso garante que os graficos respeitem o tema claro/escuro automaticamente.
  var COLORS = {
    primary: ["color-mix(in srgb, transparent, var(--tblr-primary) 100%)"],
    two: [
      "color-mix(in srgb, transparent, var(--tblr-primary) 100%)",
      "color-mix(in srgb, transparent, var(--tblr-red) 100%)"
    ],
    primaryMulti: [
      "color-mix(in srgb, transparent, var(--tblr-primary) 100%)",
      "color-mix(in srgb, transparent, var(--tblr-primary) 80%)",
      "color-mix(in srgb, transparent, var(--tblr-primary) 60%)",
      "color-mix(in srgb, transparent, var(--tblr-gray-300) 100%)"
    ],
    tabler: [
      "color-mix(in srgb, transparent, var(--tblr-primary) 100%)",
      "color-mix(in srgb, transparent, var(--tblr-azure) 100%)",
      "color-mix(in srgb, transparent, var(--tblr-green) 100%)",
      "color-mix(in srgb, transparent, var(--tblr-yellow) 100%)",
      "color-mix(in srgb, transparent, var(--tblr-red) 100%)",
      "color-mix(in srgb, transparent, var(--tblr-teal) 100%)",
      "color-mix(in srgb, transparent, var(--tblr-purple) 100%)",
      "color-mix(in srgb, transparent, var(--tblr-orange) 100%)"
    ]
  };

  window.TemplateBuilderChartHelpers = { buildApexOptions: buildApexOptions };

  window.TemplateBuilderRenderers.register({ chart: renderChart });

  // renderChart: gera um card com um <div id="..." data-apex-chart data-chart-options="...">
  // As opcoes do grafico ficam em data-chart-options (JSON) para que builder.js possa
  // inicializar com ApexCharts no canvas, e export-html.js as leia para o export.
  // Quando ajaxUrl esta definido, data-chart-ajax-url e data-chart-type sao adicionados
  // para que o inicializador busque os dados e os injete no grafico.
  function renderChart(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var chartId = getChartId(props, component, context);
    var title;
    if (props.title) {
      title = "  <div class=\"card-header\"><h3 class=\"card-title\">" + context.escapeHtml(props.title) + "</h3></div>";
    } else {
      title = "";
    }
    var options = buildApexOptions(props);
    var optionsAttr = context.escapeAttr(JSON.stringify(options));
    var ajaxUrl = (props.ajaxUrl || "").trim();
    var ajaxAttr;
    if (ajaxUrl) {
      ajaxAttr = " data-chart-ajax-url=\"" + context.escapeAttr(ajaxUrl) + "\"";
      var authType = (props.ajaxAuthType || "none").trim();
      if (authType !== "none") {
        ajaxAttr += " data-chart-auth-type=\"" + context.escapeAttr(authType) + "\""
          + " data-chart-auth-token=\"" + context.escapeAttr(props.ajaxAuthToken || "") + "\"";
        if (authType === "header") {
          ajaxAttr += " data-chart-auth-header=\"" + context.escapeAttr(props.ajaxAuthHeader || "X-API-Key") + "\"";
        }
      }
    } else {
      ajaxAttr = "";
    }
    var typeAttr = " data-chart-type=\"" + context.escapeAttr(props.chartType || "") + "\"";

    return [
      "<article" + cssClassAttr + ">",
      title,
      "  <div class=\"card-body\">",
      "    <div id=\"" + context.escapeAttr(chartId) + "\" class=\"position-relative\" data-apex-chart" + ajaxAttr + typeAttr + " data-chart-options=\"" + optionsAttr + "\"></div>",
      "  </div>",
      "</article>"
    ].filter(Boolean).join("\n");
  }

  function getChartId(props, component, context) {
    var explicit;
    if (props.chartId) {
      explicit = String(props.chartId).trim();
    } else {
      explicit = "";
    }
    return explicit || context.sanitizeElementId(component.id, "chart");
  }

  function buildApexOptions(props) {
    var chartType = props.chartType || "line-spline";
    var height = Math.max(100, parseInt(props.height, 10) || 240);
    if (chartType === "pie" || chartType === "donut") {
      return buildPieDonutOptions(props, chartType, height);
    } else {
      return buildXYOptions(props, chartType, height);
    }
  }

  // buildXYOptions: opcoes para graficos de eixo X/Y (line, area, bar/column, distributed).
  // buildPieDonutOptions: opcoes para graficos circulares (pie, donut).
  function buildXYOptions(props, chartType, height) {
    var apexType;
    if (chartType === "line-spline") {
      apexType = "line";
    } else if (chartType === "area-spline") {
      apexType = "area";
    } else {
      apexType = "bar";
    }
    var series = buildSeries(props, chartType);
    var categories = parseCsv(props.categories);
    var isDistributed = chartType === "distributed";
    var distributedCount;
    if (isDistributed && series[0]) {
      distributedCount = series[0].data.length;
    } else {
      distributedCount = 0;
    }
    var colors = resolveColors(props.colors, series.length, distributedCount);

    var opts = {
      chart: {
        type: apexType,
        fontFamily: "inherit",
        height: height,
        parentHeightOffset: 0,
        toolbar: { show: false },
        animations: { enabled: false }
      },
      series: series,
      tooltip: { theme: "dark" },
      grid: {
        padding: { top: -20, right: 0, left: -4, bottom: -4 },
        strokeDashArray: 4
      },
      xaxis: {
        labels: { padding: 0 },
        tooltip: { enabled: false },
        axisBorder: { show: false }
      },
      yaxis: { labels: { padding: 4 } },
      colors: colors,
      legend: { show: toBool(props.legendShow) }
    };

    if (categories.length) {
      opts.xaxis.categories = categories;
    }

    if (chartType === "line-spline") {
      opts.stroke = { width: 2, lineCap: "round", curve: "smooth" };
    }

    if (chartType === "area-spline") {
      opts.stroke = { width: 2, lineCap: "round", curve: "smooth" };
      opts.dataLabels = { enabled: false };
      opts.fill = {
        colors: ["color-mix(in srgb, transparent, var(--tblr-primary) 16%)"],
        type: "solid"
      };
    }

    if (chartType === "column") {
      opts.plotOptions = { bar: { columnWidth: "50%" } };
      opts.dataLabels = { enabled: false };
    }

    if (isDistributed) {
      opts.plotOptions = { bar: { distributed: true, columnWidth: "50%" } };
      opts.dataLabels = { enabled: false };
      opts.legend = { show: false };
    }

    return opts;
  }

  function buildPieDonutOptions(props, chartType, height) {
    var labels = parseCsv(props.labels);
    var values = parseCsvNumbers(props.values);
    var n = Math.max(labels.length, values.length, 1);

    return {
      chart: {
        type: chartType,
        fontFamily: "inherit",
        height: height,
        sparkline: { enabled: chartType === "donut" },
        animations: { enabled: false }
      },
      series: values,
      labels: labels,
      tooltip: { theme: "dark", fillSeriesColor: false },
      grid: { strokeDashArray: 4 },
      colors: COLORS.primaryMulti.slice(0, n),
      legend: {
        show: props.legendShow !== "false" && props.legendShow !== false,
        position: "bottom",
        offsetY: 12,
        markers: { width: 10, height: 10, radius: 100 },
        itemMargin: { horizontal: 8, vertical: 8 }
      }
    };
  }

  function buildSeries(props, chartType) {
    var d1 = parseCsvNumbers(props.series1Data);
    var name1 = props.series1Name || "Serie 1";
    var series;
    if (d1.length) {
      series = [{ name: name1, data: d1 }];
    } else {
      series = [];
    }
    var d2 = parseCsvNumbers(props.series2Data);
    if (d2.length) {
      series.push({ name: props.series2Name || "Serie 2", data: d2 });
    }
    return series;
  }

  function resolveColors(scheme, seriesCount, distributedCount) {
    if (distributedCount > 0) {
      return COLORS.tabler.slice(0, Math.min(distributedCount, COLORS.tabler.length));
    }
    if (scheme === "multi") { return COLORS.tabler.slice(0, Math.max(seriesCount, 1)); }
    if (scheme === "primary-multi") { return COLORS.primaryMulti.slice(0, Math.max(seriesCount, 1)); }
    if (seriesCount >= 2) {
      return COLORS.two;
    } else {
      return COLORS.primary;
    }
  }

  function parseCsv(str) {
    if (!str) { return []; }
    return str.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function parseCsvNumbers(str) {
    return parseCsv(str).map(Number).filter(function (n) { return !isNaN(n); });
  }

  function toBool(val) {
    return val === true || val === "true" || val === 1;
  }
}());
