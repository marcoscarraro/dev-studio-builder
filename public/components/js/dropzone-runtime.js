// Runtime do componente Dropzone na pagina exportada.
// Varre o DOM por div[data-dropzone] (e form[data-dropzone], em paginas exportadas
// antigas) e inicializa cada uploader. Limites vem de data-dropzone-max-files /
// -max-filesize / -accepted-files.
// ENVIO DOS ARQUIVOS: o Dropzone NAO envia nada sozinho (autoProcessQueue: false).
// Os arquivos aceitos sao copiados para o input file oculto "<id>-store" (gerado pelo
// renderer) via DataTransfer — assim eles vao JUNTO no submit do formulario:
// no envio AJAX via FormData(form), ou no POST tradicional com enctype multipart/form-data.
(function () {
  var runtimeName = "TemplateBuilderDropzoneRuntime";

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  function init(root) {
    if (!window.Dropzone) {
      return;
    }

    var scope;
    if (root && root.querySelectorAll) {
      scope = root;
    } else {
      scope = document;
    }

    // Seletor qualificado com a tag (mesma protecao do fullcalendar-runtime).
    // div = exports atuais; form = exports antigos (antes da correcao de form aninhado).
    scope.querySelectorAll("div[data-dropzone], form[data-dropzone]").forEach(function (form) {
      setup(form);
    });
  }

  function setup(form) {
    if (!window.Dropzone || form._dropzone) {
      return;
    }

    // Dois modos (data-dropzone-auto, definido pela prop "Envio automatico" no builder):
    // - "true": o Dropzone envia cada arquivo sozinho para a URL (autoProcessQueue classico).
    // - "false"/ausente: nada e enviado pelo Dropzone; os arquivos sao copiados para o
    //   input oculto "<id>-store" e vao junto no submit do formulario.
    var autoProcess = form.getAttribute("data-dropzone-auto") === "true";

    var csrfMeta = document.querySelector('meta[name="csrf-token"]');
    var options = {
      autoProcessQueue: autoProcess,
      url: form.getAttribute("data-dropzone-url") || form.getAttribute("action") || "#",
      maxFiles: parseInt(form.getAttribute("data-dropzone-max-files"), 10) || 10,
      maxFilesize: parseInt(form.getAttribute("data-dropzone-max-filesize"), 10) || 10,
      addRemoveLinks: true
    };

    if (csrfMeta && csrfMeta.content) {
      options.headers = { "X-CSRF-TOKEN": csrfMeta.content };
    }

    var acceptedFiles = form.getAttribute("data-dropzone-accepted-files") || "";
    if (acceptedFiles) {
      options.acceptedFiles = acceptedFiles;
    }

    form._dropzone = new window.Dropzone(form, options);

    // Sincroniza o input oculto SOMENTE no modo "junto com o form" — no modo automatico
    // o Dropzone ja enviou os arquivos, e sincronizar causaria envio duplicado no submit.
    if (!autoProcess) {
      setupStoreSync(form, form._dropzone);
    }
  }

  // Copia os arquivos aceitos da fila do Dropzone para o input file oculto que vai no
  // submit do form. O id do input vem de data-dropzone-store-id (convencao
  // "dropzone-store-<sufixo>"); o fallback "<id>-store" cobre paginas exportadas antigas.
  function setupStoreSync(el, dz) {
    var store = document.getElementById(el.getAttribute("data-dropzone-store-id") || "")
      || document.getElementById(el.id + "-store");
    if (!store || !window.DataTransfer) {
      return;
    }

    function sync() {
      var dt = new DataTransfer();
      dz.getAcceptedFiles().forEach(function (file) {
        dt.items.add(file);
      });
      store.files = dt.files;
    }

    // "addedfile" dispara antes da validacao de aceite (tamanho/tipo/limite) terminar;
    // o setTimeout(0) garante que getAcceptedFiles() ja reflita o arquivo novo.
    dz.on("addedfile", function () { setTimeout(sync, 0); });
    dz.on("removedfile", sync);
    dz.on("error", function () { setTimeout(sync, 0); });
  }

  window[runtimeName] = { init: init };

  // Desliga o auto-discover do Dropzone assim que o runtime carrega (a lib ja foi carregada
  // antes deste script), antes do DOMContentLoaded dele — assim os forms .dropzone nao sao
  // inicializados duas vezes (a inicializacao e feita por este runtime).
  if (window.Dropzone) {
    window.Dropzone.autoDiscover = false;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
