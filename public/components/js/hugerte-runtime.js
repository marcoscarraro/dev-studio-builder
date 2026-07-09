// Runtime do componente Editor WYSIWYG (hugeRTE) na pagina exportada.
// Varre o DOM por [data-hugerte] (a <textarea>) e inicializa o editor. A altura vem de
// data-hugerte-height; o restante (plugins, barra de ferramentas, estilo do conteudo) e
// constante e fica aqui. Respeita o tema escuro do Tabler via localStorage.
// Equivale ao antigo renderHugeRteInitializer de export-html.js.
(function () {
  var runtimeName = "TemplateBuilderHugeRteRuntime";

  var PLUGINS = ["advlist", "autolink", "lists", "link", "charmap", "anchor", "searchreplace", "visualblocks", "code", "fullscreen", "insertdatetime", "media", "table", "help", "wordcount"];
  var TOOLBAR = "undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat";
  var CONTENT_STYLE = 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; font-size: 14px; }';

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
    scope.querySelectorAll("textarea[data-hugerte]").forEach(function (textarea) {
      setup(textarea);
    });
  }

  function setup(textarea) {
    if (textarea.getAttribute("data-hugerte-ready") === "1") {
      return;
    }

    if (!window.hugeRTE) {
      return;
    }

    textarea.setAttribute("data-hugerte-ready", "1");

    var height = Math.max(100, parseInt(textarea.getAttribute("data-hugerte-height"), 10) || 300);
    var options = {
      selector: "#" + textarea.id,
      height: height,
      menubar: false,
      statusbar: false,
      plugins: PLUGINS,
      toolbar: TOOLBAR,
      content_style: CONTENT_STYLE
    };

    // Tema escuro: segue o data-bs-theme aplicado no <html> pelo tabler-theme.js
    // (a chave antiga "tablerTheme" no localStorage estava errada — a real e "tabler-theme",
    // e conferir o atributo cobre tambem o tema vindo de parametro de URL).
    if (document.documentElement.getAttribute("data-bs-theme") === "dark") {
      options.skin = "oxide-dark";
      options.content_css = "dark";
    }

    window.hugeRTE.init(options);
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
