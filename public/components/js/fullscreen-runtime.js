/**
 * Runtime do botao "Tela cheia" (componente de menu menu-fullscreen).
 * Alterna o modo fullscreen do documento (Fullscreen API, com prefixos webkit/ms)
 * ao clicar em qualquer elemento [data-fullscreen-toggle] e troca o icone
 * (entrar -> sair) conforme o estado atual.
 */
(function () {
  "use strict";

  var RUNTIME = "TemplateBuilderFullscreenRuntime";
  if (window[RUNTIME] && window[RUNTIME].init) {
    return;
  }

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
  }

  function enterFullscreen() {
    var el = document.documentElement;
    if (el.requestFullscreen) {
      var p = el.requestFullscreen();
      if (p && typeof p.catch === "function") { p.catch(function () {}); }
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
    }
  }

  function exitFullscreen() {
    if (document.exitFullscreen) {
      var p = document.exitFullscreen();
      if (p && typeof p.catch === "function") { p.catch(function () {}); }
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  // Atualiza o icone (e o tooltip) de um toggle de acordo com o estado fullscreen.
  // Suporta os dois formatos de icone usados na exportacao:
  //   - fonte Tabler: <i class="ti ti-maximize">  (navbar / sidebar vertical)
  //   - mascara SVG:  <span class="button-icon" style="mask-image:url(...)">  (sidebar de icones / mobile)
  function updateToggle(toggle, fs) {
    var enter = toggle.getAttribute("data-icon-enter") || "maximize";
    var exit = toggle.getAttribute("data-icon-exit") || "minimize";
    var name = fs ? exit : enter;

    var fontIcon = toggle.querySelector("i.ti");
    if (fontIcon) {
      fontIcon.className = fontIcon.className.replace(/ti-[A-Za-z0-9_-]+/, "ti-" + name);
    }

    var masked = toggle.querySelectorAll(".button-icon");
    if (masked.length) {
      var url = 'url("public/components/icons/outline/' + name + '.svg")';
      Array.prototype.forEach.call(masked, function (el) {
        el.style.webkitMaskImage = url;
        el.style.maskImage = url;
      });
    }

    var titleEnter = toggle.getAttribute("data-title-enter");
    var titleExit = toggle.getAttribute("data-title-exit");
    if ((titleEnter || titleExit) && toggle.hasAttribute("title")) {
      toggle.setAttribute("title", fs ? (titleExit || titleEnter) : (titleEnter || titleExit));
    }
  }

  function refreshAll() {
    var fs = isFullscreen();
    var toggles = document.querySelectorAll("[data-fullscreen-toggle]");
    Array.prototype.forEach.call(toggles, function (toggle) {
      updateToggle(toggle, fs);
    });
  }

  function onClick(event) {
    var toggle = event.target.closest ? event.target.closest("[data-fullscreen-toggle]") : null;
    if (!toggle) {
      return;
    }
    event.preventDefault();
    if (isFullscreen()) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }

  var bound = false;
  function init() {
    if (!bound) {
      bound = true;
      document.addEventListener("click", onClick);
      document.addEventListener("fullscreenchange", refreshAll);
      document.addEventListener("webkitfullscreenchange", refreshAll);
      document.addEventListener("MSFullscreenChange", refreshAll);
    }
    refreshAll();
  }

  window[RUNTIME] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
