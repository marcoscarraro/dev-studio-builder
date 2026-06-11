(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ image: renderImageComponent });

  function renderImageComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};

    if (!props.src) {
      const cssClass = context.mergeClassNames("image-placeholder-preview", context.getComponentClass(component));
      return `<div class="${context.escapeAttr(cssClass)}">Imagem</div>`;
    }

    return `<img${cssClassAttr} src="${context.escapeAttr(props.src)}" alt="${context.escapeAttr(props.alt || "")}" style="width:${context.escapeAttr(props.width || "100%")}">`;
  }
}());
