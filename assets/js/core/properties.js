// Gerencia os eventos do painel lateral de propriedades.
// Exportado como window.TemplateBuilderProperties.
// Recebe um objeto "context" de builder.js com acesso ao state e funcoes de mutacao.
(function () {
  "use strict";

  // === VINCULACAO DE EVENTOS ===
  // bind: escuta "input" e "click" no formulario de propriedades.
  // handleInput: roteia para a funcao correta conforme o tipo de campo
  //   (prop simples, keyvalue, repeater, matrix, span de coluna, etc.).
  // handleClick: processa acoes de repeater, matrix, keyvalue e os botoes
  //   Duplicar/Remover no rodape do painel.
  function bind(context) {
    context.els.propertiesForm.addEventListener("input", (event) => {
      handleInput(context, event);
    });

    context.els.propertiesForm.addEventListener("click", (event) => {
      handleClick(context, event);
    });
  }

  function handleInput(context, event) {
    const field = event.target.closest("[data-prop]");
    const repeaterKeyValueField = event.target.closest("[data-repeater-keyvalue-prop]");
    const keyValueField = event.target.closest("[data-keyvalue-prop]");
    const subRepeaterField = event.target.closest("[data-subrepeater-field]");
    const repeaterField = event.target.closest("[data-repeater-prop]");
    const matrixField = event.target.closest("[data-matrix-prop]");

    if ((!field && !repeaterKeyValueField && !keyValueField && !subRepeaterField && !repeaterField && !matrixField) || !context.state.selectedId) {
      return;
    }

    const node = context.findNode(context.state.selectedId);
    if (!node) {
      return;
    }

    if (subRepeaterField) {
      context.updateSubRepeaterProperty(node, subRepeaterField);
      rerenderAfterPropertyInput(context);
      return;
    }

    if (repeaterKeyValueField) {
      context.updateRepeaterKeyValueProperty(node, repeaterKeyValueField);
      rerenderAfterPropertyInput(context);
      return;
    }

    if (keyValueField) {
      // Headers extras do Envio AJAX: regenera o "Codigo JS (jQuery)" se ainda intocado.
      let previousFormAjaxCode = null;
      if (keyValueField.dataset.keyvalueProp === "ajaxHeaders" && context.hasOwn(node.props, "ajaxCode")) {
        previousFormAjaxCode = context.generateFormAjaxCode(node);
      }
      context.updateKeyValueProperty(node, keyValueField);
      if (previousFormAjaxCode !== null) {
        syncFormAjaxCode(context, node, previousFormAjaxCode);
      }
      rerenderAfterPropertyInput(context);
      return;
    }

    if (repeaterField) {
      context.updateRepeaterProperty(node, repeaterField);
      rerenderAfterPropertyInput(context);
      return;
    }

    if (matrixField) {
      context.updateMatrixProperty(node, matrixField);
      rerenderAfterPropertyInput(context);
      return;
    }

    if (field.dataset.rowColumns) {
      updateRowColumnCount(context, field);
      return;
    }

    if (field.dataset.columnSpan) {
      updateColumnSpan(context, field);
      return;
    }

    if (field.dataset.columnClass) {
      updateColumnClass(context, field);
      return;
    }

    updateComponentProperty(context, node, field);
  }

  function handleClick(context, event) {
    const subRepeaterAction = event.target.closest("[data-subrepeater-action]");
    if (subRepeaterAction && context.state.selectedId) {
      const node = context.findNode(context.state.selectedId);
      if (node) {
        context.applySubRepeaterAction(node, subRepeaterAction);
        context.render();
        context.commitHistory();
      }
      return;
    }

    const repeaterKeyValueAction = event.target.closest("[data-repeater-keyvalue-action]");
    if (repeaterKeyValueAction && context.state.selectedId) {
      const node = context.findNode(context.state.selectedId);
      if (node) {
        context.applyRepeaterKeyValueAction(node, repeaterKeyValueAction);
        context.render();
        context.commitHistory();
      }
      return;
    }

    const repeaterAction = event.target.closest("[data-repeater-action]");
    if (repeaterAction && context.state.selectedId) {
      const node = context.findNode(context.state.selectedId);
      if (node) {
        context.applyRepeaterAction(node, repeaterAction);
        context.render();
        context.commitHistory();
      }
      return;
    }

    const matrixAction = event.target.closest("[data-matrix-action]");
    if (matrixAction && context.state.selectedId) {
      const node = context.findNode(context.state.selectedId);
      if (node) {
        context.applyMatrixAction(node, matrixAction);
        context.render();
        context.commitHistory();
      }
      return;
    }

    const keyValueAction = event.target.closest("[data-keyvalue-action]");
    if (keyValueAction && context.state.selectedId) {
      const node = context.findNode(context.state.selectedId);
      if (node) {
        // Adicionar/remover header do Envio AJAX tambem regenera o codigo, se intocado.
        let previousFormAjaxCode = null;
        if (keyValueAction.dataset.keyvalueProp === "ajaxHeaders" && context.hasOwn(node.props, "ajaxCode")) {
          previousFormAjaxCode = context.generateFormAjaxCode(node);
        }
        context.applyKeyValueAction(node, keyValueAction);
        if (previousFormAjaxCode !== null) {
          syncFormAjaxCode(context, node, previousFormAjaxCode);
        }
        context.render();
        context.commitHistory();
      }
      return;
    }

    const button = event.target.closest("[data-property-action]");
    if (!button) {
      return;
    }

    const action = button.dataset.propertyAction;

    if (action === "copy-code-info") {
      const textarea = button.closest(".field").querySelector("textarea");
      if (textarea) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textarea.value).catch(() => {
            textarea.select();
            document.execCommand("copy");
          });
        } else {
          textarea.select();
          document.execCommand("copy");
        }
      }
      return;
    }

    if (action === "duplicate") {
      context.duplicateSelected();
    }
    if (action === "remove") {
      context.removeSelected();
    }
  }

  function updateRowColumnCount(context, field) {
    const row = context.findNode(field.dataset.rowColumns);
    if (row && row.type === "row") {
      context.setRowColumnCount(row, Number(field.value));
      context.state.selectedId = row.id;
      context.render();
      context.debounceHistory();
    }
  }

  function updateColumnSpan(context, field) {
    const column = context.findColumn(field.dataset.columnSpan);
    if (!column) {
      return;
    }

    column.props.span = Number(field.value);
    if (!context.hasOwn(column.props, "cssClass")) {
      const cssField = context.els.propertiesForm.querySelector(`[data-column-class="${field.dataset.columnSpan}"]`);
      if (cssField) {
        cssField.value = context.getColumnClass(column);
      }
    }
    rerenderAfterPropertyInput(context);
  }

  function updateColumnClass(context, field) {
    const column = context.findColumn(field.dataset.columnClass);
    if (!column) {
      return;
    }

    column.props.cssClass = field.value;
    rerenderAfterPropertyInput(context);
  }

  function updateComponentProperty(context, node, field) {
    let value;
    if (field.type === "checkbox") {
      value = field.checked;
    } else {
      value = field.value;
    }

    // Configuracao do Envio AJAX do form: alterar qualquer prop regenera o
    // "Codigo JS (jQuery)" — somente enquanto o codigo nao foi editado manualmente.
    if (FORM_AJAX_CONFIG_PROPS.includes(field.dataset.prop) && context.hasOwn(node.props, "ajaxCode")) {
      const previousFormAjaxCode = context.generateFormAjaxCode(node);
      node.props[field.dataset.prop] = value;
      syncFormAjaxCode(context, node, previousFormAjaxCode);
      rerenderAfterPropertyInput(context);
      return;
    }

    // Componente Script JS: trocar o "Template" preenche o campo de codigo com o
    // snippet correspondente (pede confirmacao se o codigo atual foi editado).
    if (field.dataset.prop === "template" && context.hasOwn(node.props, "code")) {
      const templates = window.TemplateBuilderJsSnippets || {};
      if (templates[value]) {
        node.props.template = value;
        applySnippetTemplate(node, templates, value);
        // Re-render completo (inclui o painel) para o textarea mostrar o codigo novo.
        context.render();
        context.commitHistory();
        return;
      }
    }

    node.props[field.dataset.prop] = value;

    // Sincroniza page-name com o titulo da pagina (rerenderAfterPropertyInput chama syncPageName)
    if (node.type === "page" && field.dataset.prop === "title") {
      node.name = value;
    }

    // Checkbox pode controlar a visibilidade de outros campos (showWhen no
    // components.json): re-renderiza o painel inteiro para mostrar/esconder na hora.
    // (Seguro para checkbox: nao ha digitacao em andamento para perder o foco.)
    if (field.type === "checkbox") {
      context.render();
      context.debounceHistory();
      return;
    }

    // Select que controla a visibilidade de outros campos (showWhen): re-renderiza o
    // painel para esconder/mostrar na hora. Selects sao discretos — sem perda de foco.
    if (field.tagName === "SELECT" && context.propControlsVisibility(node, field.dataset.prop)) {
      context.render();
      context.debounceHistory();
      return;
    }

    if (!context.hasOwn(node.props, "cssClass")) {
      const cssField = context.els.propertiesForm.querySelector('[data-prop="cssClass"]');
      if (cssField) {
        cssField.value = context.getComponentClass(node);
      }
    }

    rerenderAfterPropertyInput(context);
  }

  // Props de configuracao do Envio AJAX do formulario. Alterar qualquer uma delas
  // regenera o "Codigo JS (jQuery)" via syncFormAjaxCode.
  const FORM_AJAX_CONFIG_PROPS = [
    "ajaxEnabled",
    "ajaxUrl",
    "ajaxMethod",
    "ajaxFormat",
    "ajaxAuthType",
    "ajaxAuthToken",
    "ajaxAuthHeader",
    "ajaxSuccessMessage",
    "ajaxErrorMessage",
    "ajaxRedirectUrl"
  ];

  // syncFormAjaxCode: regenera o codigo do Envio AJAX quando ele ainda esta "intocado"
  // (vazio ou identico ao gerado pela configuracao anterior). Codigo editado manualmente
  // NUNCA e sobrescrito — para regerar do zero, limpe o campo "Codigo JS (jQuery)".
  function syncFormAjaxCode(context, node, previousCode) {
    const currentCode = String(node.props.ajaxCode || "");
    const isPristine = currentCode.trim() === "" || currentCode === previousCode;

    if (!isPristine) {
      return;
    }

    node.props.ajaxCode = context.generateFormAjaxCode(node);

    // Atualiza so o textarea no painel (sem re-renderizar o painel inteiro,
    // para nao perder o foco do campo que o usuario esta digitando).
    const codeField = context.els.propertiesForm.querySelector('textarea[data-prop="ajaxCode"]');
    if (codeField) {
      codeField.value = node.props.ajaxCode;
    }
  }

  // applySnippetTemplate: aplica o codigo do template no props.code do Script JS.
  // Se o codigo atual ja foi editado (diferente de qualquer template padrao e nao vazio),
  // pergunta antes de sobrescrever. Cancelar mantem o codigo (so o select de template muda).
  function applySnippetTemplate(node, templates, templateKey) {
    const currentCode = String(node.props.code || "");
    let isPristine = currentCode.trim() === "";

    Object.keys(templates).forEach((key) => {
      if (currentCode === templates[key].code) {
        isPristine = true;
      }
    });

    if (!isPristine && !window.confirm("Substituir o codigo atual pelo template selecionado?")) {
      return;
    }

    node.props.code = templates[templateKey].code;
  }

  // rerenderAfterPropertyInput: re-renderiza apenas o canvas (sem re-renderizar o painel
  //   de propriedades) para nao perder o foco enquanto o usuario digita.
  // debounceHistory garante que um snapshot so e criado 300ms apos a ultima tecla.
  function rerenderAfterPropertyInput(context) {
    context.renderPageNavbar();
    context.renderPageSidebar();
    context.renderPageHeader();
    context.renderCanvas();
    context.renderPageFooter();
    context.renderSummary();
    context.initializePreviewComponents();
    context.debounceHistory();
  }

  window.TemplateBuilderProperties = {
    bind: bind
  };
}());
