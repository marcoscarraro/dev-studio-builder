// Runtime da "sidebar recolhivel" na pagina exportada (layout vertical/combo).
// Alterna body.sidebar-collapsed ao clicar em [data-sidebar-collapse-toggle], persiste no
// localStorage e atualiza a acessibilidade do botao. So tem efeito no desktop (>= 992px) —
// o CSS (layouts/sidebar-collapse.css) faz a sidebar virar uma faixa estreita e o conteudo
// ocupar o espaco. Port vanilla (sem jQuery) da logica do helper.js do Tabler.
(function () {
  "use strict";

  var runtimeName = "TemplateBuilderSidebarCollapseRuntime";

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  var STORAGE_KEY = "sidebar-collapsed";

  function isDesktop() {
    return window.matchMedia("(min-width: 992px)").matches;
  }

  function isCollapsed() {
    return document.body.classList.contains("sidebar-collapsed");
  }

  function updateToggle() {
    var collapsed = isCollapsed();
    var label = collapsed ? "Mostrar menu" : "Recolher menu";
    var buttons = document.querySelectorAll("[data-sidebar-collapse-toggle]");
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
      btn.setAttribute("aria-pressed", collapsed ? "true" : "false");
      btn.setAttribute("aria-expanded", (isDesktop() && collapsed) ? "false" : "true");
    });
  }

  function toggle() {
    var collapsed = document.body.classList.toggle("sidebar-collapsed");
    try { localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0"); } catch (e) {}
    updateToggle();
  }

  function debounce(fn, wait) {
    var timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, wait);
    };
  }

  var bound = false;
  function init() {
    // Estado inicial a partir do localStorage (so no desktop).
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (saved === "1" && isDesktop()) {
      document.body.classList.add("sidebar-collapsed");
    }
    updateToggle();

    if (bound) {
      return;
    }
    bound = true;

    document.addEventListener("click", function (event) {
      var btn = event.target.closest ? event.target.closest("[data-sidebar-collapse-toggle]") : null;
      if (!btn || !isDesktop()) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      toggle();
    }, true);

    window.addEventListener("resize", debounce(function () {
      if (!isDesktop()) {
        document.body.classList.remove("sidebar-collapsed");
      }
      updateToggle();
    }, 150));
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
