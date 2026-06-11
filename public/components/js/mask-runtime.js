// Runtime de mascara de input (IMask) na pagina exportada.
// Varre o DOM por [data-mask] e aplica a mascara lendo data-mask (padrao) e
// data-mask-visible (mostrar a mascara enquanto digita). Depende da lib imask, que e
// carregada antes deste runtime.
// Equivale ao antigo renderMaskInitializer / buildMaskBlock de export-html.js.
(function () {
  var runtimeName = "TemplateBuilderMaskRuntime";

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

    scope.querySelectorAll("[data-mask]").forEach(function (el) {
      setup(el);
    });
  }

  function setup(el) {
    if (el._templateBuilderMask) {
      return;
    }

    if (!window.IMask) {
      return;
    }

    var mask = el.getAttribute("data-mask");
    if (!mask) {
      return;
    }

    var visible = el.getAttribute("data-mask-visible") === "true";
    el._templateBuilderMask = new window.IMask(el, { mask: mask, lazy: !visible });
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
