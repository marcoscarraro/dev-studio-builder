(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    tabs: renderTabsComponent
  });

  function renderTabsComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const tabsId = getTabsId(component, props, context);
    const tabs = getTabItems(props);
    const activeIndex = getActiveTabIndex(tabs, context);
    const content = renderTabsContent(tabs, activeIndex, tabsId, props, context);

    if (context.toBooleanValue(props.stacked) && context.toBooleanValue(props.useCard) !== false) {
      return renderTabsCardStacked(component, tabs, activeIndex, tabsId, props, content, context);
    }

    const nav = renderTabsNav(tabs, activeIndex, tabsId, props, context);

    if (context.toBooleanValue(props.useCard) === false) {
      return renderTabsWithoutCard(component, nav, content, context);
    }

    return renderTabsCard(component, nav, content, props, context);
  }

  function renderTabsCardStacked(component, tabs, activeIndex, tabsId, props, content, context) {
    const cardClass = context.getComponentClass(component) || "card";
    const navColClass = props.navColCssClass || "col-12 col-md-3 border-end";
    const contentColClass = props.contentColCssClass || "col-12 col-md-9 d-flex flex-column";
    const nav = renderStackedNav(tabs, activeIndex, tabsId, props, context);

    return [
      `<div${context.classAttr(cardClass)}>`,
      context.indent(`<div class="row g-0">`, 2),
      context.indent(`<div${context.classAttr(navColClass)}>`, 4),
      context.indent(`<div class="card-body">`, 6),
      context.indent(nav, 8),
      context.indent(`</div>`, 6),
      context.indent(`</div>`, 4),
      context.indent(`<div${context.classAttr(contentColClass)}>`, 4),
      context.indent(content, 6),
      context.indent(`</div>`, 4),
      context.indent(`</div>`, 2),
      `</div>`
    ].join("\n");
  }

  function renderStackedNav(tabs, activeIndex, tabsId, props, context) {
    const navClass = props.stackedNavCssClass || "list-group list-group-transparent";
    const items = tabs.map((item, index) => {
      return renderStackedNavItem(item, index, activeIndex, tabsId, props, context);
    });

    return [
      `<div${context.classAttr(navClass)}>`,
      context.indent(items.join("\n"), 2),
      `</div>`
    ].join("\n");
  }

  function renderStackedNavItem(item, index, activeIndex, tabsId, props, context) {
    const paneId = getPaneId(item, index, tabsId, context);
    const active = index === activeIndex;
    const disabled = context.toBooleanValue(item.disabled);
    const baseClass = props.stackedNavItemCssClass || "list-group-item list-group-item-action d-flex align-items-center";
    let itemClass = context.mergeClassNames(baseClass, item.navItemCssClass || "", item.navLinkCssClass || "");
    if (active) itemClass = context.mergeClassNames(itemClass, "active");
    if (disabled) itemClass = context.mergeClassNames(itemClass, "disabled");

    const icon = renderTabIcon(item, context);
    const label = context.escapeHtml(item.label || getFallbackLabel(index));
    let dataToggle;
    if (disabled) {
      dataToggle = "";
    } else {
      dataToggle = ' data-bs-toggle="tab"';
    }
    let href;
    if (disabled) {
      href = "#";
    } else {
      href = `#${context.escapeAttr(paneId)}`;
    }
    let selected;
    if (active) {
      selected = "true";
    } else {
      selected = "false";
    }
    let tabIndex;
    if (disabled) {
      tabIndex = ' tabindex="-1"';
    } else {
      tabIndex = "";
    }
    let disabledAttr;
    if (disabled) {
      disabledAttr = ' aria-disabled="true"';
    } else {
      disabledAttr = "";
    }

    return `<a href="${href}"${context.classAttr(itemClass)}${dataToggle} role="tab" aria-controls="${context.escapeAttr(paneId)}" aria-selected="${selected}"${tabIndex}${disabledAttr}>${icon}${label}</a>`;
  }

  function renderTabsCard(component, nav, content, props, context) {
    const cardClass = context.getComponentClass(component) || "card";
    const headerClass = props.cardHeaderCssClass || "card-header";
    const bodyClass = props.cardBodyCssClass || "card-body";

    return [
      `<div${context.classAttr(cardClass)}>`,
      context.indent(`<div${context.classAttr(headerClass)}>`, 2),
      context.indent(nav, 4),
      context.indent("</div>", 2),
      context.indent(`<div${context.classAttr(bodyClass)}>`, 2),
      context.indent(content, 4),
      context.indent("</div>", 2),
      "</div>"
    ].join("\n");
  }

  function renderTabsWithoutCard(component, nav, content, context) {
    const wrapperClass = context.getComponentClass(component);

    if (!wrapperClass) {
      return [nav, content].join("\n");
    }

    return [
      `<div${context.classAttr(wrapperClass)}>`,
      context.indent(nav, 2),
      context.indent(content, 2),
      "</div>"
    ].join("\n");
  }

  function renderTabsNav(tabs, activeIndex, tabsId, props, context) {
    const navItems = tabs.map((item, index) => {
      return renderTabNavItem(item, index, activeIndex, tabsId, props, context);
    });
    const dropdown = renderDropdownItem(props, context);

    if (dropdown) {
      navItems.push(dropdown);
    }

    return [
      `<ul${context.classAttr(getNavClass(props, context))} data-bs-toggle="tabs" role="tablist">`,
      context.indent(navItems.join("\n"), 2),
      "</ul>"
    ].join("\n");
  }

  function renderTabNavItem(item, index, activeIndex, tabsId, props, context) {
    const itemClass = getNavItemClass(item, props, context);
    const link = renderTabLink(item, index, activeIndex, tabsId, props, context);

    return [
      `<li${context.classAttr(itemClass)} role="presentation">`,
      context.indent(link, 2),
      "</li>"
    ].join("\n");
  }

  function renderTabLink(item, index, activeIndex, tabsId, props, context) {
    const paneId = getPaneId(item, index, tabsId, context);
    const active = index === activeIndex;
    const disabled = context.toBooleanValue(item.disabled);
    const linkClass = getNavLinkClass(item, props, active, disabled, context);
    const icon = renderTabIcon(item, context);
    const label = renderTabLabel(item, index, icon, context);
    let dataToggle;
    if (disabled) {
      dataToggle = "";
    } else {
      dataToggle = ' data-bs-toggle="tab"';
    }
    let href;
    if (disabled) {
      href = "#";
    } else {
      href = `#${context.escapeAttr(paneId)}`;
    }
    let tabIndex;
    if (disabled) {
      tabIndex = ' tabindex="-1"';
    } else {
      tabIndex = "";
    }
    let disabledAttr;
    if (disabled) {
      disabledAttr = ' aria-disabled="true"';
    } else {
      disabledAttr = "";
    }
    let selected;
    if (active) {
      selected = "true";
    } else {
      selected = "false";
    }
    const titleAttr = context.attr("title", item.linkTitle || "");

    return [
      `<a href="${href}"${context.classAttr(linkClass)}${dataToggle}${titleAttr} role="tab" aria-controls="${context.escapeAttr(paneId)}" aria-selected="${selected}"${tabIndex}${disabledAttr}>`,
      context.indent(icon, 2),
      context.indent(label, 2),
      "</a>"
    ].filter(Boolean).join("\n");
  }

  function renderTabsContent(tabs, activeIndex, tabsId, props, context) {
    const panes = tabs.map((item, index) => {
      return renderTabPane(item, index, activeIndex, tabsId, props, context);
    }).join("\n");

    return [
      `<div${context.classAttr(props.tabContentCssClass || "tab-content")}>`,
      context.indent(panes, 2),
      "</div>"
    ].join("\n");
  }

  function renderTabPane(item, index, activeIndex, tabsId, props, context) {
    const paneId = getPaneId(item, index, tabsId, context);
    const active = index === activeIndex;
    const paneClass = getPaneClass(props, active, context);
    const title = renderPaneTitle(item, context);
    const body = renderPaneBody(item, context);

    return [
      `<div${context.classAttr(paneClass)}${context.attr("id", paneId)} role="tabpanel">`,
      context.indent(title, 2),
      context.indent(body, 2),
      "</div>"
    ].filter(Boolean).join("\n");
  }

  function renderPaneTitle(item, context) {
    if (!item.title) {
      return "";
    }

    return `<h4>${context.escapeHtml(item.title)}</h4>`;
  }

  function renderPaneBody(item, context) {
    const content = formatText(item.content || "", context);
    return `<div>${content}</div>`;
  }

  function renderDropdownItem(props, context) {
    if (!context.toBooleanValue(props.showDropdown)) {
      return "";
    }

    const actions = getDropdownActions(props);
    const items = actions.map((action) => {
      return renderDropdownAction(action, context);
    }).join("\n");

    return [
      `<li${context.classAttr(props.dropdownItemCssClass || "nav-item dropdown")}>`,
      context.indent(`<a${context.classAttr(props.dropdownLinkCssClass || "nav-link dropdown-toggle")} data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">${context.escapeHtml(props.dropdownLabel || "Dropdown")}</a>`, 2),
      context.indent(`<div${context.classAttr(props.dropdownMenuCssClass || "dropdown-menu")}>`, 2),
      context.indent(items, 4),
      context.indent("</div>", 2),
      "</li>"
    ].join("\n");
  }

  function renderDropdownAction(action, context) {
    const cssClass = action.cssClass || "dropdown-item";
    let id;
    if (action.id) {
      id = context.attr("id", context.sanitizeElementId(action.id, ""));
    } else {
      id = "";
    }
    let target;
    if (action.target) {
      target = context.attr("target", action.target);
    } else {
      target = "";
    }
    let rel;
    if (action.target === "_blank") {
      rel = ' rel="noopener noreferrer"';
    } else {
      rel = "";
    }
    const content = renderActionContent(action, context);

    return `<a href="${context.escapeAttr(action.href || "#")}"${context.classAttr(cssClass)}${id}${target}${rel}>${content}</a>`;
  }

  function renderActionContent(action, context) {
    const icon = context.renderTablerIcon(action.icon, action.iconColor);
    const text = context.escapeHtml(action.text || "Acao");

    if (action.iconPosition === "right") {
      return `${text}${icon}`;
    }

    return `${icon}${text}`;
  }

  function getTabsId(component, props, context) {
    return context.sanitizeElementId(props.tabsId, context.sanitizeElementId(component.id, "tabs"));
  }

  function getTabItems(props) {
    if (Array.isArray(props.tabs) && props.tabs.length) {
      return props.tabs.filter(Boolean);
    }

    return [
      {
        label: "Home",
        title: "Home tab",
        content: "Conteudo da aba.",
        active: true,
        disabled: false,
        icon: "",
        iconColor: "",
        paneId: "",
        navItemCssClass: "",
        navLinkCssClass: "",
        linkTitle: ""
      }
    ];
  }

  function getActiveTabIndex(tabs, context) {
    const selectedIndex = tabs.findIndex((item) => {
      return context.toBooleanValue(item.active) && !context.toBooleanValue(item.disabled);
    });

    if (selectedIndex >= 0) {
      return selectedIndex;
    }

    const firstEnabledIndex = tabs.findIndex((item) => {
      return !context.toBooleanValue(item.disabled);
    });

    if (firstEnabledIndex >= 0) {
      return firstEnabledIndex;
    }

    return 0;
  }

  function getNavClass(props, context) {
    let navClass = props.navCssClass || "nav nav-tabs card-header-tabs";

    if (context.toBooleanValue(props.navFill)) {
      navClass = context.mergeClassNames(navClass, "nav-fill");
    }

    if (context.toBooleanValue(props.reverse)) {
      navClass = context.mergeClassNames(navClass, "flex-row-reverse");
    }

    return navClass;
  }

  function getNavItemClass(item, props, context) {
    return context.mergeClassNames(
      props.navItemCssClass || "nav-item",
      item.navItemCssClass || ""
    );
  }

  function getNavLinkClass(item, props, active, disabled, context) {
    let linkClass = context.mergeClassNames(
      props.navLinkCssClass || "nav-link",
      item.navLinkCssClass || ""
    );

    if (active) {
      linkClass = context.mergeClassNames(linkClass, "active");
    }

    if (disabled) {
      linkClass = context.mergeClassNames(linkClass, "disabled");
    }

    return linkClass;
  }

  function getPaneClass(props, active, context) {
    let paneClass = props.tabPaneCssClass || "tab-pane";

    if (context.toBooleanValue(props.fade)) {
      paneClass = context.mergeClassNames(paneClass, "fade");
    }

    if (active) {
      paneClass = context.mergeClassNames(paneClass, "active show");
    }

    return paneClass;
  }

  function getPaneId(item, index, tabsId, context) {
    const fallback = `${tabsId}-${index + 1}`;
    return context.sanitizeElementId(item.paneId, fallback);
  }

  function renderTabIcon(item, context) {
    const icon = context.renderTablerIcon(item.icon, item.iconColor);
    if (!icon) {
      return "";
    }

    return icon;
  }

  function renderTabLabel(item, index, icon, context) {
    if (context.toBooleanValue(item.iconOnly) && icon) {
      return "";
    }

    return `<span>${context.escapeHtml(item.label || getFallbackLabel(index))}</span>`;
  }

  function getDropdownActions(props) {
    if (Array.isArray(props.dropdownActions) && props.dropdownActions.length) {
      return props.dropdownActions.filter(Boolean);
    }

    return [
      {
        text: "Action",
        href: "#",
        id: "",
        cssClass: "dropdown-item",
        icon: "",
        iconColor: "",
        iconPosition: "left",
        target: ""
      }
    ];
  }

  function getFallbackLabel(index) {
    return `Aba ${index + 1}`;
  }

  function formatText(value, context) {
    return context.escapeHtml(value).replace(/\r?\n/g, "<br>");
  }
}());
