(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ list: renderListComponent });

  function renderListComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const ordered = context.toBooleanValue(props.ordered);
    const listStyle = props.style !== undefined ? props.style : "";
    const flush = context.toBooleanValue(props.flush);

    const tagName = ordered ? "ol" : context.getSafeTagName(definition.tagName || "ul");

    let listClassAttr = cssClassAttr;
    let itemClass = definition.itemCssClass || "";

    if (listStyle === "list-unstyled") {
      listClassAttr = context.classAttr("list-unstyled");
      itemClass = "";
    } else if (listStyle === "list-group") {
      let cls = "list-group";
      if (flush) cls = context.mergeClassNames(cls, "list-group-flush");
      listClassAttr = context.classAttr(cls);
      itemClass = "list-group-item";
    } else if (flush) {
      listClassAttr = context.classAttr(context.mergeClassNames(context.getComponentClass(component), "list-group-flush"));
    }

    const items = context.parseListItems(props.items).map((item) =>
      `<li${context.classAttr(itemClass)}>${context.escapeHtml(item.text)}</li>`
    ).join("");

    return `<${tagName}${listClassAttr}>${items}</${tagName}>`;
  }
}());
