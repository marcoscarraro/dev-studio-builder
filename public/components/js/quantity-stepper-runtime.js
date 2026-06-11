// Runtime do componente Quantity Stepper (botoes - / +) na pagina exportada.
// Instala UM listener global de clique (delegacao) em [data-qty-action]: ao clicar,
// incrementa/decrementa o input[type=number] do mesmo .input-group, respeitando
// step/min/max. Funciona tambem para linhas adicionadas dinamicamente (delegacao).
// Equivale ao antigo renderQuantityStepperInitializer de export-html.js.
(function () {
  var runtimeName = "TemplateBuilderQuantityStepperRuntime";

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  function init() {
    if (document.documentElement.getAttribute("data-qty-runtime-ready") === "1") {
      return;
    }

    document.documentElement.setAttribute("data-qty-runtime-ready", "1");
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-qty-action]");
      if (!btn) {
        return;
      }
      var group = btn.closest(".input-group");
      if (!group) {
        return;
      }
      var input = group.querySelector("input[type='number']");
      if (!input) {
        return;
      }
      var step = parseFloat(input.step) || 1;
      var min;
      if (input.min !== "") {
        min = parseFloat(input.min);
      } else {
        min = -Infinity;
      }
      var max;
      if (input.max !== "") {
        max = parseFloat(input.max);
      } else {
        max = Infinity;
      }
      var value = parseFloat(input.value) || 0;
      if (btn.dataset.qtyAction === "minus") {
        value = Math.max(min, value - step);
      } else {
        value = Math.min(max, value + step);
      }
      input.value = parseFloat(value.toFixed(10));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
