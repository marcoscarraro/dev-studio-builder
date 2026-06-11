// Runtime do componente Assinatura (SignaturePad) na pagina exportada.
// Varre o DOM por [data-signature] (o <canvas>) e inicializa o pad. O botao de limpar e o
// input hidden seguem a convencao de id: "<id>-clear" e "<id>-value". A cor do traco vem
// de data-signature-pen (ou da cor computada do canvas) e o fundo de data-signature-bg.
// Equivale ao antigo renderSignatureInitializer de export-html.js.
(function () {
  var runtimeName = "TemplateBuilderSignatureRuntime";

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  function init(root) {
    var scope;
    if (root && root.querySelectorAll) {
      scope = root;
    } else {
      scope = document;
    }

    // Seletor qualificado com a tag (mesma protecao do fullcalendar-runtime).
    scope.querySelectorAll("canvas[data-signature]").forEach(function (canvas) {
      setup(canvas);
    });
  }

  function setup(canvas) {
    if (canvas._templateBuilderSignaturePad) {
      return;
    }

    if (!window.SignaturePad) {
      return;
    }

    var backgroundColor = canvas.getAttribute("data-signature-bg") || "transparent";
    var penColor = canvas.getAttribute("data-signature-pen");
    if (!penColor) {
      penColor = window.getComputedStyle(canvas).color;
    }

    var signaturePad = new window.SignaturePad(canvas, {
      backgroundColor: backgroundColor,
      penColor: penColor
    });
    canvas._templateBuilderSignaturePad = signaturePad;

    var clearBtn = document.getElementById(canvas.id + "-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        signaturePad.clear();
      });
    }

    function resizeCanvas() {
      var ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d").scale(ratio, ratio);
      signaturePad.fromData(signaturePad.toData());
    }

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    var hiddenInput = document.getElementById(canvas.id + "-value");
    if (hiddenInput) {
      signaturePad.addEventListener("endStroke", function () {
        if (signaturePad.isEmpty()) {
          hiddenInput.value = "";
        } else {
          hiddenInput.value = signaturePad.toDataURL();
        }
      });
    }
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
