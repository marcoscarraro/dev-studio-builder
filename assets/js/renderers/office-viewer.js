(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    officeViewer: renderOfficeViewerComponent
  });

  // Visualizador de documentos Office (doc/docx/xls/xlsx/ppt/pptx) via iframe.
  // Provedores gratuitos: Microsoft Office Online (padrao) e Google Docs Viewer.
  // Ambos exigem uma URL PUBLICA do arquivo (a Microsoft tambem limita ~10MB).
  function renderOfficeViewerComponent(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var url = (props.url || "").trim();
    var provider = props.provider === "google" ? "google" : "office";
    var useRatio = props.ratio && props.ratio !== "none";
    var ratio = (props.ratio || "16x9").replace(/[^0-9x]/g, "") || "16x9";
    var height = String(parseInt(props.height, 10) || 700);
    var title = context.escapeAttr(props.title || "Documento");

    if (!url) {
      return [
        "<div" + cssClassAttr + ">",
        "  <div style=\"background:#f0f4f8;border:2px dashed #c8cfd8;display:flex;align-items:center;justify-content:center;height:200px;color:#8a99af;font-size:13px\">",
        "    Cole a URL do documento nas propriedades",
        "  </div>",
        "</div>"
      ].join("\n");
    }

    // Se o dev colou uma expressao Blade (contem "{{"), nao codifica em JS para nao
    // estragar a interpolacao do servidor; senao codifica a URL fixa no build.
    var encoded = url.indexOf("{{") !== -1 ? url : encodeURIComponent(url);
    var base = provider === "google"
      ? "https://docs.google.com/viewer?embedded=true&url="
      : "https://view.officeapps.live.com/op/embed.aspx?src=";
    var src = context.escapeAttr(base + encoded);

    var iframeAttrs = " src=\"" + src + "\"" +
      " title=\"" + title + "\"" +
      " frameborder=\"0\"";

    var viewer;
    if (useRatio) {
      viewer = [
        "  <div class=\"ratio ratio-" + ratio + "\">",
        "    <iframe" + iframeAttrs + "></iframe>",
        "  </div>"
      ].join("\n");
    } else {
      viewer = "  <iframe" + iframeAttrs + " style=\"width:100%;height:" + height + "px\"></iframe>";
    }

    var download = "";
    if (props.showDownload === true || props.showDownload === "true") {
      var downloadLabel = context.escapeHtml(props.downloadLabel || "Baixar documento");
      download = "  <a href=\"" + context.escapeAttr(url) + "\" target=\"_blank\" rel=\"noopener\" download class=\"d-inline-block mt-2\">" + downloadLabel + "</a>";
    }

    return [
      "<div" + cssClassAttr + ">",
      viewer,
      download,
      "</div>"
    ].filter(function (line) { return line !== ""; }).join("\n");
  }
}());
