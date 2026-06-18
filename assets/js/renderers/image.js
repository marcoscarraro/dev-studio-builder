(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ image: renderImageComponent });

  function renderImageComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const shape = props.shape || "";
    const loading = props.loading || "lazy";
    const link = props.link || "";

    if (!props.src) {
      const cssClass = context.mergeClassNames("image-placeholder-preview", context.getComponentClass(component));
      return `<div class="${context.escapeAttr(cssClass)}">Imagem</div>`;
    }

    let cls = context.getComponentClass(component);
    if (shape) cls = context.mergeClassNames(cls, shape);

    const img = `<img${context.classAttr(cls)} src="${context.escapeAttr(props.src)}" alt="${context.escapeAttr(props.alt || "")}" style="width:${context.escapeAttr(props.width || "100%")}" loading="${context.escapeAttr(loading)}">`;

    if (link) {
      return `<a href="${context.escapeAttr(link)}">${img}</a>`;
    }

    return img;
  }
}());
