// Runtime do "Aviso de alteracoes nao salvas" do formulario.
// Para cada form[data-unsaved-guard]:
//   - Marca o form como "sujo" (dirty) em qualquer input/change.
//   - Limpa o "sujo" SOMENTE ao receber o evento custom "unsaved-guard:clean" (seguro
//     p/ AJAX: limpe apenas no sucesso). Um submit nativo so libera a navegacao da
//     propria submissao, sem limpar o estado.
// Intercepta cliques em links/elementos que sairiam da pagina enquanto ha um form
// sujo e mostra um modal Bootstrap totalmente customizavel (texto/cores/icones vem do
// HTML gerado). "Confirmar sair" navega; "Cancelar" mantem.
// O beforeunload (fechar aba/atualizar) usa o dialogo NATIVO do navegador — texto
// custom nao e permitido pelos navegadores.
(function () {
  var runtimeName = "TemplateBuilderUnsavedGuardRuntime";

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  var forms = [];          // forms guardados (com data-unsaved-guard)
  var bypass = false;      // true quando o usuario confirmou sair (ou submeteu)
  var globalBound = false; // garante um unico listener no document/window

  function init(root) {
    var scope = (root && root.querySelectorAll) ? root : document;

    scope.querySelectorAll("form[data-unsaved-guard]").forEach(function (form) {
      setupForm(form);
    });

    bindGlobal();
  }

  function setupForm(form) {
    if (form._unsavedGuardReady) {
      return;
    }
    form._unsavedGuardReady = true;
    form._unsavedDirty = false;

    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);

    // Submeter NAO limpa o "sujo" (mais seguro p/ AJAX: so limpamos no sucesso).
    // Apenas liberamos a navegacao de um submit NATIVO (que recarrega a pagina) para
    // nao disparar o guard/beforeunload. Se for AJAX (preventDefault, sem navegar),
    // restauramos o guard no proximo tick.
    form.addEventListener("submit", function (event) {
      bypass = true;
      setTimeout(function () {
        if (event.defaultPrevented) {
          bypass = false;
        }
      }, 0);
    });

    // Unica forma de limpar o estado "sujo": o desenvolvedor dispara este evento no
    // sucesso do salvamento (ex.: apos a resposta OK do AJAX).
    form.addEventListener("unsaved-guard:clean", function () {
      form._unsavedDirty = false;
    });

    if (forms.indexOf(form) === -1) {
      forms.push(form);
    }

    function markDirty() {
      form._unsavedDirty = true;
    }
  }

  function firstDirtyForm() {
    for (var i = 0; i < forms.length; i++) {
      if (forms[i].isConnected !== false && forms[i]._unsavedDirty) {
        return forms[i];
      }
    }
    return null;
  }

  function bindGlobal() {
    if (globalBound) {
      return;
    }
    globalBound = true;

    // Intercepta cliques que sairiam da pagina.
    document.addEventListener("click", function (event) {
      if (bypass || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      var exit = event.target.closest ? event.target.closest("[data-unsaved-exit]") : null;
      var link = event.target.closest ? event.target.closest("a[href]") : null;
      var destination = "";

      if (exit) {
        destination = exit.getAttribute("data-href") || (link ? link.getAttribute("href") : "");
      } else if (link && isNavigatingLink(link)) {
        destination = link.getAttribute("href");
      } else {
        return;
      }

      var form = firstDirtyForm();
      if (!form) {
        return;
      }

      event.preventDefault();
      showGuard(form, destination);
    }, true);

    // Fechar aba / atualizar / voltar: dialogo nativo (generico).
    window.addEventListener("beforeunload", function (event) {
      if (bypass) {
        return;
      }
      var form = firstDirtyForm();
      if (form && form.getAttribute("data-unsaved-beforeunload") === "true") {
        event.preventDefault();
        event.returnValue = "";
        return "";
      }
    });
  }

  // Link que de fato troca a pagina (ignora ancoras, esquemas especiais, nova aba, download).
  function isNavigatingLink(link) {
    if (link.hasAttribute("data-unsaved-ignore")) return false;
    if (link.hasAttribute("download")) return false;
    if (link.target && link.target !== "" && link.target !== "_self") return false;
    var href = link.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#") return false;
    if (/^(javascript|mailto|tel|sms):/i.test(href)) return false;
    return true;
  }

  function showGuard(form, destination) {
    var modalId = form.getAttribute("data-unsaved-modal") || "";
    var modal = modalId ? document.getElementById(modalId) : null;

    if (!modal || !(window.bootstrap && window.bootstrap.Modal)) {
      // Fallback sem Bootstrap: usa o confirm nativo com a mensagem configurada.
      var msg = modal ? (modal.getAttribute("data-unsaved-message") || "") : "";
      if (window.confirm(msg || "Ha alteracoes nao salvas. Deseja realmente sair?")) {
        navigate(destination);
      }
      return;
    }

    var confirmBtn = modal.querySelector("[data-unsaved-confirm]");
    if (confirmBtn && !confirmBtn._unsavedBound) {
      confirmBtn._unsavedBound = true;
      confirmBtn.addEventListener("click", function () {
        var dest = modal._unsavedDestination || "";
        window.bootstrap.Modal.getOrCreateInstance(modal).hide();
        navigate(dest);
      });
    }

    modal._unsavedDestination = destination;
    window.bootstrap.Modal.getOrCreateInstance(modal).show();
  }

  function navigate(destination) {
    bypass = true;
    if (destination) {
      window.location.href = destination;
    }
  }

  window[runtimeName] = { init: init };

  document.addEventListener("fieldlist:row-added", function (e) {
    if (e.detail && e.detail.row) {
      init(e.detail.row);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
