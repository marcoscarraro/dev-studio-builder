// Runtime do componente Scanner QR / Codigo de Barras na pagina exportada.
// Usa a biblioteca html5-qrcode (Apache 2.0) para acesso a camera via getUserMedia.
// Varre o DOM por [data-barcode-scanner], le os data-bs-* e inicializa cada scanner.
// A camera nao e inicializada no canvas do editor — somente na pagina exportada.
(function () {
  "use strict";

  var runtimeName = "TemplateBuilderBarcodeScannerRuntime";

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  // Mapa de nomes legíveis para os valores do enum Html5QrcodeSupportedFormats.
  // Os valores sao consultados da lib em tempo de execucao para robustez entre versoes.
  function buildFormatsToSupport(formatsStr) {
    if (!formatsStr || formatsStr === "all") {
      return null;
    }
    var F = window.Html5QrcodeSupportedFormats || {};
    var map = {
      "qr_code":  F.QR_CODE   !== undefined ? F.QR_CODE   : 0,
      "ean_13":   F.EAN_13    !== undefined ? F.EAN_13    : 9,
      "code_128": F.CODE_128  !== undefined ? F.CODE_128  : 5
    };
    return map[formatsStr] !== undefined ? [map[formatsStr]] : null;
  }

  function init(root) {
    if (!window.Html5Qrcode) {
      return;
    }
    var scope = (root && root.querySelectorAll) ? root : document;
    scope.querySelectorAll("div[data-barcode-scanner]").forEach(function (el) {
      setup(el);
    });
  }

  function setup(el) {
    if (el._barcodeScanner) {
      return;
    }
    el._barcodeScanner = true;

    var scannerId = el.id;
    var readerId = scannerId + "-reader";
    var mode = (el.getAttribute("data-bs-mode") || "single").trim();
    var facingMode = (el.getAttribute("data-bs-camera") || "environment").trim();
    var formatsStr = (el.getAttribute("data-bs-formats") || "all").trim();
    var fps = parseInt(el.getAttribute("data-bs-fps"), 10) || 10;
    var qrboxSize = parseInt(el.getAttribute("data-bs-qrbox"), 10) || 250;
    var showResult = el.getAttribute("data-bs-show-result") !== "false";

    var placeholder = el.querySelector("[data-barcode-placeholder]");
    var readerWrap = el.querySelector("[data-barcode-reader-wrap]");
    var resultDisplay = el.querySelector("[data-barcode-result-display]");
    var resultText = el.querySelector("[data-barcode-result-text]");
    var resultInput = document.querySelector("[data-barcode-result-input=\"" + scannerId + "\"]");
    var startBtn = el.querySelector("[data-barcode-btn-start]");
    var stopBtn = el.querySelector("[data-barcode-btn-stop]");

    var scannerConfig = { fps: fps, qrbox: { width: qrboxSize, height: qrboxSize } };
    var formatsToSupport = buildFormatsToSupport(formatsStr);
    if (formatsToSupport) {
      scannerConfig.formatsToSupport = formatsToSupport;
    }

    var html5QrCode = new window.Html5Qrcode(readerId);
    var scanning = false;

    function onSuccess(decodedText) {
      if (resultInput) {
        resultInput.value = decodedText;
      }
      if (showResult) {
        if (resultText) { resultText.textContent = decodedText; }
        if (resultDisplay) { resultDisplay.style.display = ""; }
      }
      if (mode === "single") {
        stopScanning();
      }
    }

    function startScanning() {
      if (scanning) { return; }
      if (placeholder) { placeholder.style.display = "none"; }
      if (readerWrap) { readerWrap.style.display = ""; }
      if (startBtn) { startBtn.disabled = true; }

      html5QrCode.start(
        { facingMode: facingMode },
        scannerConfig,
        onSuccess,
        null
      ).then(function () {
        scanning = true;
        if (stopBtn) { stopBtn.style.display = ""; }
        if (startBtn) { startBtn.style.display = "none"; startBtn.disabled = false; }
      }).catch(function (err) {
        console.error("[barcode-scanner] start failed:", err);
        if (placeholder) { placeholder.style.display = ""; }
        if (readerWrap) { readerWrap.style.display = "none"; }
        if (startBtn) { startBtn.disabled = false; }
      });
    }

    function stopScanning() {
      if (!scanning) { return; }
      html5QrCode.stop().then(function () {
        scanning = false;
        if (placeholder) { placeholder.style.display = ""; }
        if (readerWrap) { readerWrap.style.display = "none"; }
        if (stopBtn) { stopBtn.style.display = "none"; }
        if (startBtn) { startBtn.style.display = ""; }
      }).catch(function (err) {
        console.error("[barcode-scanner] stop failed:", err);
      });
    }

    if (startBtn) { startBtn.addEventListener("click", startScanning); }
    if (stopBtn) { stopBtn.addEventListener("click", stopScanning); }
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
