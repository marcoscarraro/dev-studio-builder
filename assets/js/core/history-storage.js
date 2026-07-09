// HISTORICO DE UNDO/REDO + PERSISTENCIA (localStorage) do builder de paginas.
// create(context) devolve as funcoes ja ligadas ao state do builder:
//   commitHistory  - salva snapshot JSON de state.page (limite context.historyLimit)
//   debounceHistory- idem, com delay de 300ms (nao cria snapshot a cada tecla)
//   undo / redo    - restaura estado anterior/futuro e re-renderiza
//   saveToStorage  - grava state.page no localStorage (chave context.storageKey)
//   loadStoredPage - le e normaliza a pagina salva (null se invalida)
// context: { state, storageKey, historyLimit, normalizePage(page), render() }
(function () {
  "use strict";

  function create(context) {
    const state = context.state;
    const storageKey = context.storageKey;
    const historyLimit = context.historyLimit || 60;
    let historyTimer = null;

    function debounceHistory() {
      window.clearTimeout(historyTimer);
      historyTimer = window.setTimeout(commitHistory, 300);
    }

    function commitHistory() {
      window.clearTimeout(historyTimer);
      const snapshot = JSON.stringify(state.page);
      if (state.history[state.history.length - 1] === snapshot) {
        return;
      }
      state.history.push(snapshot);
      if (state.history.length > historyLimit) {
        state.history.shift();
      }
      state.future = [];
      saveToStorage();
    }

    function undo() {
      if (state.history.length <= 1) {
        return;
      }
      const current = state.history.pop();
      state.future.push(current);
      state.page = context.normalizePage(JSON.parse(state.history[state.history.length - 1]));
      state.selectedId = null;
      state.selectedSection = null;
      saveToStorage();
      context.render();
    }

    function redo() {
      if (!state.future.length) {
        return;
      }
      const next = state.future.pop();
      state.history.push(next);
      state.page = context.normalizePage(JSON.parse(next));
      state.selectedId = null;
      state.selectedSection = null;
      saveToStorage();
      context.render();
    }

    // Persiste o estado atual no navegador. Chamado automaticamente a cada
    // alteracao confirmada (commitHistory) e nos undo/redo, para que o trabalho
    // sobreviva a um refresh.
    function saveToStorage() {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state.page));
      } catch (error) {
        // localStorage cheio/indisponivel (ex.: navegacao privada) — ignora.
      }
    }

    // Le e normaliza a pagina salva; retorna null se nao houver ou for invalida.
    function loadStoredPage() {
      const saved = localStorage.getItem(storageKey);
      if (!saved) {
        return null;
      }
      try {
        return context.normalizePage(JSON.parse(saved));
      } catch (error) {
        return null;
      }
    }

    return { debounceHistory, commitHistory, undo, redo, saveToStorage, loadStoredPage };
  }

  window.TemplateBuilderHistory = { create };
}());
