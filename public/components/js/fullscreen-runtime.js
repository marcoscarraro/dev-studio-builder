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

  // Icone salvo em data-icon-enter/-exit e sempre uma string "<biblioteca>:<nome>"
  // (ver core/parsers.js parseIconValue); sem prefixo reconhecido = Tabler.
  var ICON_LIBRARIES = ["lineicons-regular", "lineicons-solid", "fa-solid", "fa-regular", "fa-brands"];
  function parseIconAttr(raw, fallback) {
    var str = (raw || fallback || "").trim();
    var sep = str.indexOf(":");
    if (sep > 0 && ICON_LIBRARIES.indexOf(str.slice(0, sep)) !== -1) {
      return { lib: str.slice(0, sep), name: str.slice(sep + 1) };
    }
    return { lib: "tabler", name: str };
  }
  function fontIconClass(lib, name) {
    if (lib === "lineicons-regular") return "lni lni-" + name;
    if (lib === "lineicons-solid") return "lni lnis-" + name;
    if (lib === "fa-solid") return "fa-solid fa-" + name;
    if (lib === "fa-regular") return "fa-regular fa-" + name;
    if (lib === "fa-brands") return "fa-brands fa-" + name;
    return "";
  }

  // Atualiza o icone (e o tooltip) de um toggle de acordo com o estado fullscreen.
  // Suporta os dois formatos de icone usados na exportacao:
  //   - mascara SVG (Tabler): <span class="button-icon" style="mask-image:url(...)">
  //   - fonte (Lineicons/Font Awesome): <i class="lni lni-...">, <i class="fa-solid fa-...">
  function updateToggle(toggle, fs) {
    var parsed = parseIconAttr(toggle.getAttribute(fs ? "data-icon-exit" : "data-icon-enter"), fs ? "minimize" : "maximize");
    var name = parsed.name;

    if (parsed.lib === "tabler") {
      var masked = toggle.querySelectorAll(".button-icon");
      if (masked.length) {
        var url = 'url("public/components/icons/outline/' + name + '.svg")';
        Array.prototype.forEach.call(masked, function (el) {
          el.style.webkitMaskImage = url;
          el.style.maskImage = url;
        });
      }
    } else {
      var fontIcon = toggle.querySelector(".lni, [class*='fa-']");
      var cls = fontIconClass(parsed.lib, name);
      if (fontIcon && cls) {
        fontIcon.className = cls;
      }
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
