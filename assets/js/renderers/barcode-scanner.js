(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    barcodeScanner: renderBarcodeScannerComponent
  });

  function renderBarcodeScannerComponent(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var scannerId = context.sanitizeElementId(props.scannerId, component.id, "barcode-scanner");
    var readerId = scannerId + "-reader";
    var resultId = scannerId + "-result";

    var inputName = (props.inputName || "barcode").trim();
    var btnStartLabel = context.escapeHtml(props.btnStartLabel || "Iniciar Camera");
    var btnStopLabel = context.escapeHtml(props.btnStopLabel || "Parar");
    var facingMode = context.escapeAttr(props.facingMode || "environment");
    var formats = context.escapeAttr(props.formats || "all");
    var mode = context.escapeAttr(props.mode || "single");
    var fps = parseInt(props.fps, 10) || 10;
    var qrboxSize = parseInt(props.qrboxSize, 10) || 250;
    var showResult = (props.showResult !== false && props.showResult !== "false") ? "true" : "false";

    return [
      "<div" + cssClassAttr + " id=\"" + context.escapeAttr(scannerId) + "\"" +
        " data-barcode-scanner" +
        " data-bs-mode=\"" + mode + "\"" +
        " data-bs-camera=\"" + facingMode + "\"" +
        " data-bs-formats=\"" + formats + "\"" +
        " data-bs-fps=\"" + fps + "\"" +
        " data-bs-qrbox=\"" + qrboxSize + "\"" +
        " data-bs-show-result=\"" + showResult + "\">",
      "  <div data-barcode-placeholder class=\"text-center py-4 border rounded bg-light\">",
      "    <span class=\"button-icon\" style=\"width:3rem;height:3rem;background-color:#adb5bd;display:block;margin:0 auto .75rem;-webkit-mask-image:url('public/components/icons/outline/qrcode.svg');mask-image:url('public/components/icons/outline/qrcode.svg')\"></span>",
      "    <button type=\"button\" class=\"btn btn-primary\" data-barcode-btn-start>" + btnStartLabel + "</button>",
      "  </div>",
      "  <div data-barcode-reader-wrap style=\"display:none\">",
      "    <div id=\"" + context.escapeAttr(readerId) + "\"></div>",
      "    <div class=\"mt-2\">",
      "      <button type=\"button\" class=\"btn btn-sm btn-secondary\" data-barcode-btn-stop>" + btnStopLabel + "</button>",
      "    </div>",
      "  </div>",
      "  <div data-barcode-result-display class=\"alert alert-success mt-2\" style=\"display:none\">",
      "    <strong>Código lido:</strong> <span data-barcode-result-text></span>",
      "  </div>",
      "</div>",
      "<input type=\"hidden\" id=\"" + context.escapeAttr(resultId) + "\" name=\"" + context.escapeAttr(inputName) + "\" data-barcode-result-input=\"" + context.escapeAttr(scannerId) + "\">"
    ].join("\n");
  }
}());
