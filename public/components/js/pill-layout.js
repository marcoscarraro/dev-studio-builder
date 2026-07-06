(function () {
  "use strict";

  var DROPDOWN_STYLE_PROPS = [
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "maxHeight",
    "overflowY",
    "overflowX"
  ];
  var railDropdownClosers = [];

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function captureInlineStyles(element) {
    return DROPDOWN_STYLE_PROPS.reduce(function (styles, prop) {
      styles[prop] = element.style[prop] || "";
      return styles;
    }, {});
  }

  function restoreInlineStyles(element, styles) {
    DROPDOWN_STYLE_PROPS.forEach(function (prop) {
      element.style[prop] = styles[prop] || "";
    });
  }

  function closeOtherRailDropdowns(ownCloser) {
    railDropdownClosers.forEach(function (close) {
      if (close !== ownCloser) {
        close();
      }
    });
  }

  function setupRailDropdown(dropdown) {
    if (dropdown.dataset.dsbRailDropdownReady === "1") {
      return;
    }

    var toggle = dropdown.querySelector('[data-bs-toggle="dropdown"]');
    var menu = dropdown.querySelector(".dropdown-menu");
    if (!toggle || !menu) {
      return;
    }

    dropdown.dataset.dsbRailDropdownReady = "1";

    if (typeof bootstrap !== "undefined" && bootstrap.Dropdown) {
      var existingInstance = bootstrap.Dropdown.getInstance(toggle);
      if (existingInstance) {
        existingInstance.dispose();
      }
    }

    var placeholder = document.createComment("dsb-dropdown-home");
    var themeElement = toggle.closest("[data-bs-theme]");
    var theme = themeElement ? themeElement.getAttribute("data-bs-theme") : null;
    var active = false;
    var savedStyles = null;
    var hadTheme = false;
    var savedTheme = "";

    function place() {
      var buttonRect = toggle.getBoundingClientRect();
      var padding = 8;
      var gap = 4;
      var menuWidth = menu.offsetWidth || menu.scrollWidth || 0;
      var menuHeight = menu.offsetHeight || menu.scrollHeight || 0;
      var availableBelow = Math.max(0, window.innerHeight - buttonRect.bottom - gap - padding);
      var availableAbove = Math.max(0, buttonRect.top - gap - padding);
      var openAbove = menuHeight > availableBelow && availableAbove > availableBelow;
      var maxHeight = Math.max(120, openAbove ? availableAbove : availableBelow);
      var renderedHeight = menuHeight ? Math.min(menuHeight, maxHeight) : maxHeight;

      menu.style.position = "fixed";
      menu.style.bottom = "auto";
      menu.style.top = (openAbove
        ? Math.max(padding, buttonRect.top - gap - renderedHeight)
        : Math.min(buttonRect.bottom + gap, window.innerHeight - padding)) + "px";
      menu.style.maxHeight = maxHeight + "px";
      menu.style.overflowY = "auto";
      menu.style.overflowX = "hidden";

      if (menu.classList.contains("dropdown-menu-end")) {
        menu.style.left = "auto";
        menu.style.right = Math.max(padding, window.innerWidth - buttonRect.right) + "px";
      } else {
        menu.style.right = "auto";
        menu.style.left = clamp(buttonRect.left, padding, Math.max(padding, window.innerWidth - menuWidth - padding)) + "px";
      }
    }

    function closeDropdown() {
      if (!active) {
        return;
      }

      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("click", handleDocumentClick, true);
      document.removeEventListener("keydown", handleDocumentKeydown, true);
      active = false;

      menu.classList.remove("show", "dsb-rail-dropdown");
      toggle.classList.remove("show");
      toggle.setAttribute("aria-expanded", "false");

      if (placeholder.parentNode) {
        placeholder.parentNode.insertBefore(menu, placeholder);
        placeholder.parentNode.removeChild(placeholder);
      }

      if (theme) {
        if (hadTheme) {
          menu.setAttribute("data-bs-theme", savedTheme);
        } else {
          menu.removeAttribute("data-bs-theme");
        }
      }
      restoreInlineStyles(menu, savedStyles || {});
      savedStyles = null;
    }

    function handleDocumentClick(event) {
      if (toggle.contains(event.target) || menu.contains(event.target)) {
        return;
      }
      closeDropdown();
    }

    function handleDocumentKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDropdown();
        toggle.focus();
      }
    }

    function openDropdown() {
      if (active) {
        place();
        return;
      }

      closeOtherRailDropdowns(closeDropdown);
      savedStyles = captureInlineStyles(menu);
      hadTheme = menu.hasAttribute("data-bs-theme");
      savedTheme = hadTheme ? menu.getAttribute("data-bs-theme") : "";

      if (!placeholder.parentNode && menu.parentNode) {
        menu.parentNode.insertBefore(placeholder, menu);
      }

      document.body.appendChild(menu);
      menu.classList.add("show", "dsb-rail-dropdown");
      toggle.classList.add("show");
      toggle.setAttribute("aria-expanded", "true");
      if (theme) {
        menu.setAttribute("data-bs-theme", theme);
      }

      active = true;
      place();
      window.requestAnimationFrame(place);
      window.addEventListener("scroll", place, true);
      window.addEventListener("resize", place);
      document.addEventListener("click", handleDocumentClick, true);
      document.addEventListener("keydown", handleDocumentKeydown, true);
    }

    function toggleDropdown(event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (active) {
        closeDropdown();
      } else {
        openDropdown();
      }
    }

    toggle.addEventListener("click", toggleDropdown, true);
    menu.addEventListener("click", function (event) {
      if (event.target.closest(".dropdown-item")) {
        window.setTimeout(closeDropdown, 0);
      }
    });
    railDropdownClosers.push(closeDropdown);
  }

  function initRailDropdowns() {
    document.querySelectorAll(".app-rail-navbar .dropdown").forEach(setupRailDropdown);
  }

  function initIconSidebar() {
    var sidebar = document.getElementById("appIconSidebar");
    if (!sidebar || sidebar.dataset.dsbPillSidebarReady === "1") {
      return;
    }
    sidebar.dataset.dsbPillSidebarReady = "1";

    var hasBs = typeof bootstrap !== "undefined";
    var sideTips = [];
    if (hasBs && bootstrap.Tooltip) {
      sidebar.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
        sideTips.push(new bootstrap.Tooltip(el));
      });
    }

    function setTips(enabled) {
      sideTips.forEach(function (tooltip) {
        tooltip.hide();
        if (enabled) {
          tooltip.enable();
        } else {
          tooltip.disable();
        }
      });
    }

    function collapseSidebar() {
      sidebar.classList.remove("is-expanded");
      sidebar.querySelectorAll(".side-item.open").forEach(function (item) {
        item.classList.remove("open");
      });
      setTips(true);
    }

    function expandSidebar() {
      sidebar.classList.add("is-expanded");
      setTips(false);
    }

    sidebar.querySelectorAll(".side-link[data-sub]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        var item = link.closest(".side-item");
        var willOpen = !item.classList.contains("open");
        expandSidebar();
        sidebar.querySelectorAll(".side-item.open").forEach(function (openItem) {
          // Nao fecha o proprio item nem um ancestral dele (submenu de 2o nivel aberto).
          if (openItem !== item && !openItem.contains(item)) {
            openItem.classList.remove("open");
          }
        });
        item.classList.toggle("open", willOpen);
      });
    });

    sidebar.querySelectorAll("[data-leaf]").forEach(function (link) {
      link.addEventListener("click", function () {
        sidebar.querySelectorAll(".side-item.active").forEach(function (item) {
          item.classList.remove("active");
        });
        sidebar.querySelectorAll(".side-sublink.active").forEach(function (activeLink) {
          activeLink.classList.remove("active");
        });
        if (link.classList.contains("side-sublink")) {
          link.classList.add("active");
          link.closest(".side-item").classList.add("active");
        } else {
          link.closest(".side-item").classList.add("active");
        }
        collapseSidebar();
      });
    });

    document.addEventListener("click", function (event) {
      if (!sidebar.contains(event.target)) {
        collapseSidebar();
      }
    });

    collapseSidebar();
  }

  // Mobile: fecha o offcanvas do menu ao clicar num item final (igual ao combo). Ignora gatilhos
  // de dropdown/submenu e o proprio botao de fechar. Gate pelo .show (so quando aberto = mobile).
  var offcanvasAutoCloseBound = false;
  function initOffcanvasAutoClose() {
    if (offcanvasAutoCloseBound) {
      return;
    }
    offcanvasAutoCloseBound = true;
    document.addEventListener("click", function (e) {
      var oc = e.target.closest ? e.target.closest(".app-menu-offcanvas.show") : null;
      if (!oc) {
        return;
      }
      if (e.target.closest('[data-bs-toggle="dropdown"], .dropdown-toggle, .dsb-submenu-toggle, [data-bs-dismiss="offcanvas"]')) {
        return;
      }
      if (e.target.closest(".dropdown-item, .nav-link")) {
        var dismiss = oc.querySelector('[data-bs-dismiss="offcanvas"]');
        if (dismiss) { dismiss.click(); }  // fecha via data-api do Bootstrap
      }
    });
  }

  function initPillLayout() {
    initRailDropdowns();
    initIconSidebar();
    initOffcanvasAutoClose();
  }

  window.DsbPillLayout = window.DsbPillLayout || {};
  window.DsbPillLayout.init = initPillLayout;

  onReady(initPillLayout);
}());
