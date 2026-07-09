/**
 * Runtime do "Botao flutuante" (componente fab) com subitens (speed-dial).
 * Alterna a classe .dsb-fab-open no container [data-fab] ao clicar em [data-fab-toggle],
 * troca o icone (principal <-> aberto) e fecha ao clicar fora ou apertar Esc.
 * Quando o FAB nao tem subitens, ele e apenas um link (nenhum toggle e renderizado).
 */
(function () {
  "use strict";

  // Guarda de re-carga no padrao dos demais runtimes: se o script for injetado de
  // novo (ex.: preview do builder), re-chama init() e sai. O init e idempotente
  // (delegacao unica no document via flag "bound").
  var RUNTIME = "TemplateBuilderFabRuntime";
  if (window[RUNTIME] && window[RUNTIME].init) {
    window[RUNTIME].init();
    return;
  }

  function setIcon(btn, name) {
    var masked = btn.querySelectorAll(".button-icon");
    if (masked.length) {
      var url = 'url("public/components/icons/outline/' + name + '.svg")';
      Array.prototype.forEach.call(masked, function (el) {
        el.style.webkitMaskImage = url;
        el.style.maskImage = url;
      });
    }
    var fontIcon = btn.querySelector("i.ti");
    if (fontIcon) {
      fontIcon.className = fontIcon.className.replace(/ti-[A-Za-z0-9_-]+/, "ti-" + name);
    }
  }

  function closeFab(fab) {
    if (!fab.classList.contains("dsb-fab-open")) {
      return;
    }
    fab.classList.remove("dsb-fab-open");
    var btn = fab.querySelector("[data-fab-toggle]");
    if (btn) {
      btn.setAttribute("aria-expanded", "false");
      setIcon(btn, btn.getAttribute("data-icon") || "help");
    }
  }

  function openFab(fab) {
    fab.classList.add("dsb-fab-open");
    var btn = fab.querySelector("[data-fab-toggle]");
    if (btn) {
      btn.setAttribute("aria-expanded", "true");
      setIcon(btn, btn.getAttribute("data-icon-open") || "x");
    }
  }

  function onClick(event) {
    var target = event.target;
    var toggle = target.closest ? target.closest("[data-fab-toggle]") : null;
    if (toggle) {
      event.preventDefault();
      var fab = toggle.closest("[data-fab]");
      if (fab) {
        if (fab.classList.contains("dsb-fab-open")) { closeFab(fab); } else { openFab(fab); }
      }
      return;
    }
    // Clique fora de um FAB aberto -> fecha (clique num subitem navega normalmente).
    Array.prototype.forEach.call(document.querySelectorAll("[data-fab].dsb-fab-open"), function (fab) {
      if (!fab.contains(target)) { closeFab(fab); }
    });
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      Array.prototype.forEach.call(document.querySelectorAll("[data-fab].dsb-fab-open"), closeFab);
    }
  }

  var bound = false;
  function init() {
    if (!bound) {
      bound = true;
      document.addEventListener("click", onClick);
      document.addEventListener("keydown", onKeydown);
    }
  }

  window[RUNTIME] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
