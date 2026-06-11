(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ buttonDropdown: renderButtonDropdownComponent });

  function renderButtonDropdownComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const buttonClass = context.mergeClassNames(props.buttonCssClass || "btn btn-outline-secondary", "dropdown-toggle");
    const menuClass = props.menuCssClass || "dropdown-menu dropdown-menu-end";
    const items = context.parseDropdownItems(props.items).map(context.renderDropdownItem).join("\n");
    const extraActions = context.parseDropdownActions(props.extraActions).map(context.renderDropdownAction).join("\n");

    return [
      `<div${cssClassAttr}>`,
      '  <div class="dropdown">',
      `    <button type="button"${context.classAttr(buttonClass)} data-bs-toggle="dropdown" aria-expanded="false">${context.renderButtonContent(props.buttonText || "Acoes", props.buttonIcon, props.buttonIconPosition, props.buttonIconColor)}</button>`,
      `    <div${context.classAttr(menuClass)}>`,
      context.indent(items, 6),
      "    </div>",
      "  </div>",
      context.indent(extraActions, 2),
      "</div>"
    ].filter((line) => line !== "").join("\n");
  }
}());
