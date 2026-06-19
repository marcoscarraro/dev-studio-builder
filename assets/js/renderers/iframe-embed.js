(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    iframeEmbed: renderIframeEmbedComponent
  });

  function renderIframeEmbedComponent(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var url = (props.url || "").trim();
    var useRatio = props.ratio !== "none";
    var ratio = (props.ratio || "16x9").replace(/[^0-9x]/g, "") || "16x9";
    var height = String(parseInt(props.height, 10) || 400);
    var title = context.escapeAttr(props.title || "Conteudo incorporado");
    var scrolling = (props.scrolling !== false && props.scrolling !== "false") ? "yes" : "no";
    var allowFullscreen = (props.allowFullscreen !== false && props.allowFullscreen !== "false");

    if (!url) {
      return [
        "<div" + cssClassAttr + ">",
        "  <div style=\"background:#f0f4f8;border:2px dashed #c8cfd8;display:flex;align-items:center;justify-content:center;height:200px;color:#8a99af;font-size:13px\">",
        "    Cole a URL nas propriedades",
        "  </div>",
        "</div>"
      ].join("\n");
    }

    var iframeAttrs = " src=\"" + context.escapeAttr(url) + "\"" +
      " title=\"" + title + "\"" +
      " frameborder=\"0\"" +
      " scrolling=\"" + scrolling + "\"" +
      (allowFullscreen ? " allowfullscreen" : "");

    if (useRatio) {
      return [
        "<div" + cssClassAttr + ">",
        "  <div class=\"ratio ratio-" + ratio + "\">",
        "    <iframe" + iframeAttrs + "></iframe>",
        "  </div>",
        "</div>"
      ].join("\n");
    }

    return [
      "<div" + cssClassAttr + ">",
      "  <iframe" + iframeAttrs + " style=\"width:100%;height:" + height + "px\"></iframe>",
      "</div>"
    ].join("\n");
  }
}());
