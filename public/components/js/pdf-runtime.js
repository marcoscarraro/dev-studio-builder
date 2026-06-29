// Runtime do componente PDF (PDF.js) na pagina exportada.
// Varre o DOM por [data-pdf-viewer] e renderiza cada pagina do PDF em um <canvas>,
// empilhadas (modo continuo). O container cresce ate a altura total do documento -> quem
// rola e a pagina, nao um iframe. Funciona em Android/iOS/desktop.
// data-pdf-url: URL do PDF (mesma origem ou CORS). data-pdf-max-width: largura maxima (px).
// data-pdf-gap: espaco entre paginas (px). data-pdf-max-pages: 0 = todas, N = limite.
// O worker (pdf.worker.min.js) e descoberto via resolveWorkerSrc() a partir do <script> da lib.
(function () {
  "use strict";

  var runtimeName = "TemplateBuilderPdfRuntime";

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  function debounce(fn, wait) {
    var timer;
    return function () {
      var ctx = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  // O web worker do PDF.js NAO e um <script src> da pagina: o pdf.min.js o instancia via
  // new Worker(url). Derivamos o caminho do proprio <script src=".../pdf.min.js"> (carregado
  // pelo padrao do projeto, assets.scripts) -> o worker fica ao lado da lib. Usa a URL ja
  // resolvida (absoluta), entao funciona independe da profundidade da pagina.
  function resolveWorkerSrc() {
    var script = document.querySelector('script[src*="pdfjs/pdf.min.js"]');
    if (script && script.src) {
      return script.src.replace(/pdf\.min\.js(\?.*)?$/, "pdf.worker.min.js");
    }
    return "public/components/libs/pdfjs/pdf.worker.min.js";
  }

  function status(el, message, isError) {
    el.innerHTML = "";
    var box = document.createElement("div");
    box.className = "dsb-pdf-status";
    box.style.cssText = "padding:24px;text-align:center;font-size:13px;color:" + (isError ? "#d63939" : "#8a99af");
    box.textContent = message;
    el.appendChild(box);
  }

  // Desenha todas as paginas (ate maxPages) do documento ja carregado dentro de `el`.
  function layoutPages(el, pdf) {
    var maxWidth = parseInt(el.getAttribute("data-pdf-max-width"), 10) || 900;
    var gap = parseInt(el.getAttribute("data-pdf-gap"), 10);
    if (isNaN(gap)) { gap = 12; }
    var maxPages = parseInt(el.getAttribute("data-pdf-max-pages"), 10) || 0;

    var total = pdf.numPages;
    if (maxPages > 0 && maxPages < total) {
      total = maxPages;
    }

    var outputScale = window.devicePixelRatio || 1;
    var containerWidth = Math.min(el.clientWidth || maxWidth, maxWidth) || maxWidth;

    var token = (el._pdfToken = (el._pdfToken || 0) + 1);
    el.innerHTML = "";

    var chain = Promise.resolve();
    for (var n = 1; n <= total; n++) {
      chain = chain.then(renderPage(el, pdf, n, total, containerWidth, outputScale, gap, token));
    }
    return chain;
  }

  function renderPage(el, pdf, pageNum, total, containerWidth, outputScale, gap, token) {
    return function () {
      // Aborta se um novo layout (resize) comecou no meio do anterior.
      if (el._pdfToken !== token) {
        return null;
      }
      return pdf.getPage(pageNum).then(function (page) {
        if (el._pdfToken !== token) {
          return null;
        }
        var scale = containerWidth / page.getViewport({ scale: 1 }).width;
        var viewport = page.getViewport({ scale: scale });

        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.display = "block";
        canvas.style.boxShadow = "0 1px 4px rgba(0,0,0,.15)";
        if (pageNum < total) {
          canvas.style.marginBottom = gap + "px";
        }
        el.appendChild(canvas);

        return page.render({
          canvasContext: ctx,
          viewport: viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
        }).promise;
      });
    };
  }

  function renderViewer(el) {
    var pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) {
      return;
    }
    var url = el.getAttribute("data-pdf-url");
    if (!url) {
      return;
    }

    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = resolveWorkerSrc();
    }

    // Documento ja carregado (ex.: re-layout no resize): apenas redesenha.
    if (el._pdfDoc) {
      layoutPages(el, el._pdfDoc);
      return;
    }

    status(el, "Carregando PDF…", false);
    pdfjsLib.getDocument(url).promise.then(function (pdf) {
      el._pdfDoc = pdf;
      return layoutPages(el, pdf);
    }).catch(function () {
      status(el, "Não foi possível carregar o PDF.", true);
    });
  }

  function setup(el) {
    if (el._pdfReady) {
      return;
    }
    el._pdfReady = true;

    renderViewer(el);

    var rerender = debounce(function () {
      if (el._pdfDoc) {
        layoutPages(el, el._pdfDoc);
      }
    }, 250);
    window.addEventListener("resize", rerender);
  }

  function init(root) {
    var scope = (root && root.querySelectorAll) ? root : document;
    scope.querySelectorAll("[data-pdf-viewer]").forEach(function (el) {
      setup(el);
    });
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
