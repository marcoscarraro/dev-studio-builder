(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ list: renderListComponent });

  function renderListComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const tagName = context.getSafeTagName(definition.tagName || "ul");
    const itemClass = context.classAttr(definition.itemCssClass || "");
    const items = context.parseListItems(props.items).map((item) => `<li${itemClass}>${context.escapeHtml(item.text)}</li>`).join("");

    return `<${tagName}${cssClassAttr}>${items}</${tagName}>`;
  }
}());
