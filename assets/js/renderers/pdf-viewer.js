(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    pdfViewer: renderPdfViewerComponent
  });

  // Visualizador de PDF inline via PDF.js (renderiza as paginas em <canvas>, sem iframe).
  // Funciona em Android/iOS/desktop. O markup so descreve o container + data-*; o runtime
  // (pdf-runtime.js) carrega a lib e injeta os canvases. O preview real aparece no
  // Preview/HTML exportado; no canvas do builder fica o placeholder abaixo.
  function renderPdfViewerComponent(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var url = (props.url || "").trim();
    var maxWidth = String(parseInt(props.maxWidth, 10) || 900);
    var gap = String(parseInt(props.pageGap, 10) >= 0 ? parseInt(props.pageGap, 10) : 12);
    var maxPages = (props.firstPageOnly === true || props.firstPageOnly === "true") ? "1" : "0";

    if (!url) {
      return [
        "<div" + cssClassAttr + ">",
        "  <div style=\"background:var(--tblr-secondary-bg,#f0f4f8);border:2px dashed var(--tblr-border-color,#c8cfd8);display:flex;align-items:center;justify-content:center;height:200px;color:var(--tblr-secondary-color,#8a99af);font-size:13px\">",
        "    Cole a URL do PDF nas propriedades",
        "  </div>",
        "</div>"
      ].join("\n");
    }

    // Safeguard de Blade: se o dev colou uma expressao {{ ... }}, emite cru; senao escapa.
    var safeUrl = url.indexOf("{{") !== -1 ? url : context.escapeAttr(url);

    var viewer = [
      "  <div class=\"dsb-pdf\" data-pdf-viewer" +
        " data-pdf-url=\"" + safeUrl + "\"" +
        " data-pdf-max-width=\"" + maxWidth + "\"" +
        " data-pdf-gap=\"" + gap + "\"" +
        " data-pdf-max-pages=\"" + maxPages + "\"" +
        " style=\"max-width:" + maxWidth + "px;margin:0 auto\">",
      "    <div class=\"dsb-pdf-placeholder\" style=\"background:var(--tblr-secondary-bg,#f0f4f8);border:1px solid var(--tblr-border-color,#e0e6ee);border-radius:6px;display:flex;align-items:center;justify-content:center;height:240px;color:var(--tblr-secondary-color,#8a99af);font-size:13px;text-align:center;padding:16px\">",
      "      Visualizador de PDF &mdash; as paginas sao renderizadas no Preview / HTML exportado",
      "    </div>",
      "  </div>"
    ].join("\n");

    var download = "";
    if (props.showDownload === true || props.showDownload === "true") {
      var downloadLabel = context.escapeHtml(props.downloadLabel || "Baixar PDF");
      download = "  <a href=\"" + safeUrl + "\" target=\"_blank\" rel=\"noopener\" download class=\"d-inline-block mt-2\">" + downloadLabel + "</a>";
    }

    return [
      "<div" + cssClassAttr + ">",
      viewer,
      download,
      "</div>"
    ].filter(function (line) { return line !== ""; }).join("\n");
  }
}());
