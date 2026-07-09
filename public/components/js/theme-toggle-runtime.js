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

  // Icone salvo em data-icon-light/-dark e sempre uma string "<biblioteca>:<nome>"
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

  // Icone que reflete o tema ATUAL: claro -> data-icon-light (padrao "sun");
  // escuro -> data-icon-dark (padrao "moon").
  function iconAttr(toggle, theme) {
    return theme === "dark"
      ? parseIconAttr(toggle.getAttribute("data-icon-dark"), "moon")
      : parseIconAttr(toggle.getAttribute("data-icon-light"), "sun");
  }

  // Suporta os dois formatos de icone da exportacao:
  //   - mascara SVG (Tabler): <span class="button-icon" style="mask-image:url(...)">
  //   - fonte (Lineicons/Font Awesome): <i class="lni lni-...">, <i class="fa-solid fa-...">
  function updateToggle(toggle, theme) {
    var parsed = iconAttr(toggle, theme);
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
