/**
 * Runtime do botao "Alternar tema" (componente de menu menu-theme-toggle).
 * Alterna data-bs-theme entre "light" e "dark" no <html> e persiste a escolha em
 * localStorage["tabler-theme"] — a MESMA chave lida pelo tabler-theme.js, que aplica
 * o tema salvo assim que a pagina carrega (sem flash). Troca o icone conforme o tema.
 */
(function () {
  "use strict";

  var RUNTIME = "TemplateBuilderThemeToggleRuntime";
  if (window[RUNTIME] && window[RUNTIME].init) {
    return;
  }

  var STORAGE_KEY = "tabler-theme";

  function currentTheme() {
    return document.documentElement.getAttribute("data-bs-theme") === "dark" ? "dark" : "light";
  }

  function applyTheme(value) {
    if (value === "dark") {
      document.documentElement.setAttribute("data-bs-theme", "dark");
    } else {
      // "light" e o padrao do Tabler: remove o atributo (mesma convencao do tabler-theme.js).
      document.documentElement.removeAttribute("data-bs-theme");
    }
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
  }

  // Icone que reflete o tema ATUAL: claro -> data-icon-light (padrao "sun");
  // escuro -> data-icon-dark (padrao "moon").
  function iconName(toggle, theme) {
    return theme === "dark"
      ? (toggle.getAttribute("data-icon-dark") || "moon")
      : (toggle.getAttribute("data-icon-light") || "sun");
  }

  // Suporta os dois formatos de icone da exportacao: fonte Tabler (<i class="ti ti-...">)
  // e mascara SVG (<span class="button-icon" style="mask-image:url(...)">).
  function updateToggle(toggle, theme) {
    var name = iconName(toggle, theme);

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
  }

  function refreshAll() {
    var theme = currentTheme();
    var toggles = document.querySelectorAll("[data-theme-toggle]");
    Array.prototype.forEach.call(toggles, function (toggle) {
      updateToggle(toggle, theme);
    });
  }

  function onClick(event) {
    var toggle = event.target.closest ? event.target.closest("[data-theme-toggle]") : null;
    if (!toggle) {
      return;
    }
    event.preventDefault();
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
    refreshAll();
  }

  var bound = false;
  function init() {
    if (!bound) {
      bound = true;
      document.addEventListener("click", onClick);
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
