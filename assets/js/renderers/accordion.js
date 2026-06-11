(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    accordion: renderAccordionComponent
  });

  function renderAccordionComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const accordionId = getAccordionId(component, props, context);
    const accordionClass = getAccordionClass(component, props, context);
    const items = getAccordionItems(props);
    const itemsHtml = items.map((item, index) => {
      return renderAccordionItem(item, index, accordionId, props, context);
    }).join("\n");

    return [
      `<div${context.classAttr(accordionClass)}${context.attr("id", accordionId)}>`,
      context.indent(itemsHtml, 2),
      "</div>"
    ].filter(Boolean).join("\n");
  }

  function getAccordionId(component, props, context) {
    return context.sanitizeElementId(props.accordionId, context.sanitizeElementId(component.id, "accordion"));
  }

  function getAccordionClass(component, props, context) {
    return context.mergeClassNames(
      context.getComponentClass(component),
      getVisualClass(props.styleVariant)
    );
  }

  function getVisualClass(value) {
    const visualClasses = {
      flush: "accordion-flush",
      tabs: "accordion-tabs",
      inverted: "accordion-inverted",
      "inverted-plus": "accordion-inverted accordion-plus"
    };

    return visualClasses[value] || "";
  }

  function getAccordionItems(props) {
    if (Array.isArray(props.items) && props.items.length) {
      return props.items.filter(Boolean);
    }

    return [
      {
        title: "Accordion item",
        content: "Conteudo do item.",
        open: true,
        disabled: false,
        icon: "",
        iconColor: ""
      }
    ];
  }

  function renderAccordionItem(item, index, accordionId, props, context) {
    const itemNumber = index + 1;
    const open = context.toBooleanValue(item.open);
    const disabled = context.toBooleanValue(item.disabled);
    const headerTag = getHeaderTag(props.headingTag);
    const headerId = `${accordionId}-heading-${itemNumber}`;
    const collapseId = `${accordionId}-collapse-${itemNumber}`;
    const itemClass = props.itemCssClass || "accordion-item";
    const headerClass = props.headerCssClass || "accordion-header";
    const collapseClass = context.mergeClassNames("accordion-collapse collapse", open ? "show" : "");
    const bodyClass = props.bodyCssClass || "accordion-body";
    const parentAttribute = getParentAttribute(accordionId, props, context);

    return [
      `<div${context.classAttr(itemClass)}>`,
      context.indent(`<${headerTag}${context.classAttr(headerClass)}${context.attr("id", headerId)}>`, 2),
      context.indent(renderAccordionButton(item, itemNumber, collapseId, open, disabled, props, context), 4),
      context.indent(`</${headerTag}>`, 2),
      context.indent(`<div${context.attr("id", collapseId)}${context.classAttr(collapseClass)}${parentAttribute}${context.attr("aria-labelledby", headerId)}>`, 2),
      context.indent(`<div${context.classAttr(bodyClass)}>`, 4),
      context.indent(formatText(item.content || "", context), 6),
      context.indent("</div>", 4),
      context.indent("</div>", 2),
      "</div>"
    ].filter(Boolean).join("\n");
  }

  function getParentAttribute(accordionId, props, context) {
    if (context.toBooleanValue(props.alwaysOpen)) {
      return "";
    }

    return context.attr("data-bs-parent", `#${accordionId}`);
  }

  function renderAccordionButton(item, itemNumber, collapseId, open, disabled, props, context) {
    const buttonClass = getButtonClass(props, open, context);
    const title = item.title || `Item ${itemNumber}`;
    const itemIcon = renderItemIcon(item, context);
    const toggleIcon = renderToggleIcon(props, context);
    let disabledAttribute;
    if (disabled) {
      disabledAttribute = " disabled";
    } else {
      disabledAttribute = "";
    }

    return [
      `<button${context.classAttr(buttonClass)} type="button" data-bs-toggle="collapse" data-bs-target="#${context.escapeAttr(collapseId)}" aria-expanded="${open ? "true" : "false"}" aria-controls="${context.escapeAttr(collapseId)}"${disabledAttribute}>`,
      context.indent(itemIcon, 2),
      context.indent(`<span>${context.escapeHtml(title)}</span>`, 2),
      context.indent(toggleIcon, 2),
      "</button>"
    ].filter(Boolean).join("\n");
  }

  function getButtonClass(props, open, context) {
    const baseClass = props.buttonCssClass || "accordion-button";
    let collapsedClass;
    if (open) {
      collapsedClass = "";
    } else {
      collapsedClass = "collapsed";
    }
    return context.mergeClassNames(baseClass, collapsedClass);
  }

  function renderItemIcon(item, context) {
    const icon = context.renderTablerIcon(item.icon, item.iconColor);
    if (!icon) {
      return "";
    }

    return `<div class="accordion-button-icon">${icon}</div>`;
  }

  function renderToggleIcon(props, context) {
    const toggleClass = getToggleClass(props, context);
    const icon = getToggleIconName(props);
    const iconHtml = renderToggleIconSvg(icon, props.toggleIconColor, context) || context.renderTablerIcon(icon, props.toggleIconColor);

    if (!iconHtml) {
      return "";
    }

    return [
      `<div${context.classAttr(toggleClass)}>`,
      context.indent(iconHtml, 2),
      "</div>"
    ].join("\n");
  }

  function getToggleClass(props, context) {
    const baseClass = props.toggleCssClass || "accordion-button-toggle";
    const icon = getToggleIconName(props);
    let plusClass = "";

    if (icon === "plus" || props.styleVariant === "inverted-plus") {
      plusClass = "accordion-button-toggle-plus";
    }

    return context.mergeClassNames(baseClass, plusClass);
  }

  function getToggleIconName(props) {
    if (props.toggleIcon) {
      return String(props.toggleIcon).trim();
    }

    if (props.styleVariant === "inverted-plus") {
      return "plus";
    }

    return "chevron-down";
  }

  function renderToggleIconSvg(icon, color, context) {
    const style = getSvgStyle(color, context);

    if (icon === "plus") {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-1"${style}><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>`;
    }

    if (icon === "chevron-down") {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-1"${style}><path d="M6 9l6 6l6 -6" /></svg>`;
    }

    return "";
  }

  function getSvgStyle(color, context) {
    const safeColor = getSafeHexColor(color);
    if (!safeColor) {
      return "";
    }

    return context.attr("style", `color:${safeColor}`);
  }

  function getSafeHexColor(value) {
    const color = String(value || "").trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return color;
    } else {
      return "";
    }
  }

  function getHeaderTag(value) {
    const tag = String(value || "div").toLowerCase();
    if (["div", "h2", "h3", "h4"].includes(tag)) {
      return tag;
    }

    return "div";
  }

  function formatText(value, context) {
    return context.escapeHtml(value).replace(/\r?\n/g, "<br>");
  }
}());
