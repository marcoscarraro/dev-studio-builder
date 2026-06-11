// Runtime do componente Date Picker (Litepicker) na pagina exportada.
// Varre o DOM por [data-litepicker] e inicializa cada campo lendo a config dos data-*:
//   data-litepicker-inline / -range / -time / -time-step / -format / -lang.
// No modo intervalo, o campo final e o elemento de id "<id>-end" (convencao do renderer).
// Equivale ao antigo renderLitePickerInitializer de export-html.js.
(function () {
  var runtimeName = "TemplateBuilderLitepickerRuntime";

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

    scope.querySelectorAll("[data-litepicker]").forEach(function (element) {
      setup(element);
    });
  }

  function setup(element) {
    if (element._templateBuilderLitepicker) {
      return;
    }

    if (!window.Litepicker) {
      return;
    }

    var inlineMode = element.getAttribute("data-litepicker-inline") === "true";
    var isRange = element.getAttribute("data-litepicker-range") === "true";
    var hasTime = element.getAttribute("data-litepicker-time") === "true";
    var format = element.getAttribute("data-litepicker-format") || (hasTime ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD");
    var lang = element.getAttribute("data-litepicker-lang") || "pt-BR";
    var timeStep = parseInt(element.getAttribute("data-litepicker-time-step"), 10) || 5;

    var options = {
      element: element,
      inlineMode: inlineMode,
      singleMode: !isRange,
      format: format,
      lang: lang
    };

    if (hasTime) {
      options.timePicker = true;
      options.timePickerMinutes = timeStep;
    }

    if (isRange) {
      var endElement = document.getElementById(element.id + "-end");
      if (endElement) {
        options.elementEnd = endElement;
      }
    }

    element._templateBuilderLitepicker = new window.Litepicker(options);
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
