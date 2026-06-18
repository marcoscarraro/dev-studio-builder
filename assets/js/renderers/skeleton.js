(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ skeleton: renderSkeletonComponent });

  function renderSkeletonComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const rows = Math.min(10, Math.max(1, Number(props.rows) || 3));
    const showAvatar = context.toBooleanValue(props.showAvatar);
    const showImage = context.toBooleanValue(props.showImage);
    const animated = props.animated == null ? true : context.toBooleanValue(props.animated);

    const placeholderCls = animated ? "placeholder-glow" : "placeholder-wave";
    const parts = [];

    if (showImage) {
      parts.push(`<div class="${placeholderCls} mb-2"><span class="placeholder col-12 placeholder-lg" style="height:120px"></span></div>`);
    }

    if (showAvatar) {
      parts.push([
        `<div class="d-flex align-items-center gap-2 mb-2 ${placeholderCls}">`,
        '  <span class="placeholder avatar rounded-circle"></span>',
        "  <div class=\"flex-fill\">",
        '    <span class="placeholder col-6 d-block"></span>',
        '    <span class="placeholder col-4 d-block mt-1"></span>',
        "  </div>",
        "</div>"
      ].join("\n"));
    }

    const rowsHtml = Array.from({ length: rows }, (_, i) => {
      const width = i % 3 === 2 ? "col-8" : "col-12";
      return `<span class="placeholder ${width} d-block mt-1"></span>`;
    }).join("\n");

    parts.push(`<div class="${placeholderCls}">${rowsHtml}</div>`);

    return `<div${cssClassAttr}>${parts.join("\n")}</div>`;
  }
}());
