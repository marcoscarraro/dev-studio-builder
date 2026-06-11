// Runtime do botao "mostrar/ocultar senha" na pagina exportada.
// Varre o DOM por [data-password-toggle] (o link do olho). O input correspondente tem o
// id do toggle sem o sufixo "-toggle" (convencao do renderer de input). No clique,
// alterna o type do input entre "password" e "text".
// Equivale a parte de toggle do antigo renderPasswordToggleInitializer de export-html.js.
(function () {
  var runtimeName = "TemplateBuilderPasswordToggleRuntime";

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

    scope.querySelectorAll("[data-password-toggle]").forEach(function (toggle) {
      setup(toggle);
    });
  }

  function setup(toggle) {
    if (toggle.getAttribute("data-password-toggle-ready") === "1") {
      return;
    }

    var inputId = toggle.id.replace(/-toggle$/, "");
    var input = document.getElementById(inputId);
    if (!input) {
      return;
    }

    toggle.setAttribute("data-password-toggle-ready", "1");
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      if (input.type === "password") {
        input.type = "text";
      } else {
        input.type = "password";
      }
    });
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
