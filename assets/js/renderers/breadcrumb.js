(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ breadcrumb: renderBreadcrumbComponent });

  function renderBreadcrumbComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const items = context.parseBreadcrumbItems(props.items).map((item) => {
      const itemClass = context.classAttr(context.mergeClassNames(item.cssClass || "breadcrumb-item", item.active ? "active" : ""));
      let current;
      if (item.active) {
        current = ' aria-current="page"';
      } else {
        current = "";
      }
      return `<li${itemClass}${current}><a href="${context.escapeAttr(item.href || "#")}">${context.escapeHtml(item.text || "Item")}</a></li>`;
    }).join("");
    return `<ol${cssClassAttr}${context.attr("aria-label", props.ariaLabel || "breadcrumbs")}>${items}</ol>`;
  }
}());
