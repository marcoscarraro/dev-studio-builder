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

  // Expansao "automatica" (temporaria): quando a sidebar esta recolhida e o usuario clica num
  // item COM dropdown, ela expande so para navegar e recolhe de novo ao escolher uma opcao ou
  // clicar fora. Diferente da expansao manual (alca de borda), que persiste.
  var autoExpanded = false;

  function toggle() {
    // Acao manual pela alca: encerra qualquer expansao automatica em curso.
    autoExpanded = false;
    var collapsed = document.body.classList.toggle("sidebar-collapsed");
    try { localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0"); } catch (e) {}
    updateToggle();
  }

  // Fecha dropdowns/submenus abertos na sidebar antes de recolher (evita menu "solto" na faixa).
  function closeSidebarMenus() {
    var sidebar = document.querySelector(".navbar-vertical");
    if (!sidebar) { return; }
    // Se o Bootstrap global existir, fecha pela instancia (animacao/cleanup corretos).
    if (window.bootstrap && window.bootstrap.Dropdown) {
      Array.prototype.forEach.call(sidebar.querySelectorAll('[data-bs-toggle="dropdown"]'), function (t) {
        var inst = window.bootstrap.Dropdown.getInstance(t);
        if (inst) { inst.hide(); }
      });
    }
    // Fallback agnostico ao Bootstrap (o bundle do Tabler pode nao expor window.bootstrap):
    // garante que nenhum dropdown-menu fique com .show / data-bs-popper na faixa recolhida.
    Array.prototype.forEach.call(sidebar.querySelectorAll(".dropdown-menu.show"), function (menu) {
      menu.classList.remove("show");
      menu.removeAttribute("data-bs-popper");
    });
    Array.prototype.forEach.call(sidebar.querySelectorAll('[data-bs-toggle="dropdown"]'), function (t) {
      t.classList.remove("show");
      t.setAttribute("aria-expanded", "false");
    });
    // Submenus de 2o nivel abertos.
    Array.prototype.forEach.call(sidebar.querySelectorAll(".dsb-submenu.open"), function (el) {
      el.classList.remove("open");
      var btn = el.previousElementSibling;
      if (btn && btn.classList.contains("dsb-submenu-toggle")) {
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Recolhe de volta apos uma expansao automatica (sem persistir a preferencia do usuario).
  function collapseBackIfAuto() {
    if (!autoExpanded) { return; }
    closeSidebarMenus();
    document.body.classList.add("sidebar-collapsed");
    autoExpanded = false;
    updateToggle();
  }

  // Mobile: fecha o menu aberto pelo hamburguer (.combo-menu-collapse) ao escolher um item final.
  function closeMobileMenu() {
    var open = document.querySelectorAll(".combo-menu-collapse.show");
    if (!open.length) { return; }
    Array.prototype.forEach.call(open, function (c) {
      if (window.bootstrap && window.bootstrap.Collapse) {
        var inst = window.bootstrap.Collapse.getInstance(c);
        if (inst) { inst.hide(); return; }
      }
      c.classList.remove("show");
    });
    // Atualiza o(s) toggler(es) do hamburguer.
    Array.prototype.forEach.call(document.querySelectorAll('.navbar-toggler[data-bs-target=".combo-menu-collapse"]'), function (t) {
      t.classList.add("collapsed");
      t.setAttribute("aria-expanded", "false");
    });
    // Reseta dropdowns/submenus internos para nao reabrirem "abertos" na proxima vez.
    Array.prototype.forEach.call(document.querySelectorAll(".combo-menu-collapse .dropdown-menu.show"), function (m) {
      m.classList.remove("show");
      m.removeAttribute("data-bs-popper");
    });
    Array.prototype.forEach.call(document.querySelectorAll('.combo-menu-collapse [data-bs-toggle="dropdown"]'), function (t) {
      t.classList.remove("show");
      t.setAttribute("aria-expanded", "false");
    });
    Array.prototype.forEach.call(document.querySelectorAll(".combo-menu-collapse .dsb-submenu.open"), function (el) {
      el.classList.remove("open");
      var b = el.previousElementSibling;
      if (b && b.classList.contains("dsb-submenu-toggle")) { b.setAttribute("aria-expanded", "false"); }
    });
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

    // Comportamento estilo pill (so no desktop): com a sidebar recolhida, clicar num item COM
    // dropdown expande a sidebar (deixando o Bootstrap abrir o menu); clicar numa opcao final,
    // ou fora da sidebar, recolhe de novo. Capture-phase para expandir ANTES do Bootstrap medir
    // a posicao do dropdown.
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!isDesktop() || !target || !target.closest) {
        return;
      }
      // A alca de recolher e tratada no listener acima.
      if (target.closest("[data-sidebar-collapse-toggle]")) {
        return;
      }

      // 1) Item com dropdown -> expande a sidebar recolhida (temporariamente).
      if (target.closest(".navbar-vertical .nav-link.dropdown-toggle")) {
        if (isCollapsed()) {
          document.body.classList.remove("sidebar-collapsed");
          autoExpanded = true;
          updateToggle();
        }
        return;
      }

      // 2) Opcao final (link real), mas nao o toggle de submenu de 2o nivel -> recolhe de volta.
      if (target.closest(".navbar-vertical .dropdown-item, .navbar-vertical .nav-link")) {
        if (!target.closest(".dsb-submenu-toggle")) {
          collapseBackIfAuto();
        }
        return;
      }

      // 3) Clique fora da sidebar -> recolhe de volta (se a expansao foi automatica).
      if (!target.closest(".navbar-vertical")) {
        collapseBackIfAuto();
      }
    }, true);

    // Mobile: clicar num item final do menu (ou submenu) fecha o hamburguer (igual ao desktop).
    // Nao fecha ao abrir um dropdown ou um submenu de 2o nivel (esses so expandem).
    document.addEventListener("click", function (event) {
      if (isDesktop()) {
        return;
      }
      var target = event.target;
      if (!target || !target.closest || !target.closest(".combo-menu-collapse")) {
        return;
      }
      // Nao fecha ao clicar num gatilho de dropdown (inclui o menu do usuario, que e um .nav-link
      // com data-bs-toggle="dropdown" SEM a classe .dropdown-toggle) nem num toggle de submenu.
      if (target.closest('[data-bs-toggle="dropdown"], .dropdown-toggle, .dsb-submenu-toggle')) {
        return;
      }
      if (target.closest(".dropdown-item, .nav-link")) {
        closeMobileMenu();
      }
    });

    window.addEventListener("resize", debounce(function () {
      if (!isDesktop()) {
        autoExpanded = false;
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
