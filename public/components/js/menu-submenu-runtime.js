// Runtime do submenu de 2o nivel (menu-dropdown) nos dropdowns Bootstrap.
// Alterna a classe .open no .dsb-submenu ao clicar/Enter no .dsb-submenu-toggle e
// atualiza aria-expanded. So atua nos dropdowns (navbar/sidebar/mobile); o rail de
// icones (pill/module-rail) tem seu proprio runtime (pill-layout.js).
(function () {
  "use strict";

  var runtimeName = "TemplateBuilderMenuSubmenuRuntime";
  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  function toggle(button) {
    var wrap = button.nextElementSibling;
    if (!wrap || !wrap.classList.contains("dsb-submenu")) {
      return;
    }
    var open = wrap.classList.toggle("open");
    button.setAttribute("aria-expanded", open ? "true" : "false");
  }

  var bound = false;
  function init() {
    if (bound) {
      return;
    }
    bound = true;

    document.addEventListener("click", function (event) {
      var button = event.target.closest ? event.target.closest(".dsb-submenu-toggle") : null;
      if (!button) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      toggle(button);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") {
        return;
      }
      var button = event.target.closest ? event.target.closest(".dsb-submenu-toggle") : null;
      if (!button) {
        return;
      }
      event.preventDefault();
      toggle(button);
    });
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
