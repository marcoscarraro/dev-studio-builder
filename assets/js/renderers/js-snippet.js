// Renderer do componente Script JS (kind: "jsSnippet").
// O componente carrega um snippet jQuery editavel (props.code) escolhido por template.
// - No canvas: aparece como um badge (nunca executa o codigo no editor).
// - No export: o codigo NAO sai na posicao do componente; export-html.js coleta o
//   props.code de todos os Script JS e emite um <script> unico no fim do body,
//   DEPOIS das libs (garante que o jQuery ja carregou quando o snippet roda).
// Os templates ficam em window.TemplateBuilderJsSnippets — fonte unica usada por:
//   builder.js (preencher code na criacao) e properties.js (trocar template no painel).
(function () {
  "use strict";

  var TEMPLATES = {
    calc: {
      label: "Calculo entre campos",
      code: [
        "// Calculo entre campos: total = quantidade * preco",
        "// Ajuste os names dos campos e a formula conforme a sua pagina.",
        "$(function () {",
        "  // Converte o valor de um campo para numero (aceita virgula como decimal).",
        "  function num(valor) {",
        "    return parseFloat(String(valor || \"0\").replace(\",\", \".\")) || 0;",
        "  }",
        "",
        "  function recalcular() {",
        "    var total = num($(\"[name='quantidade']\").val()) * num($(\"[name='preco']\").val());",
        "    $(\"[name='total']\").val(total.toFixed(2)).trigger(\"change\");",
        "  }",
        "",
        "  // Recalcula sempre que qualquer campo da pagina mudar.",
        "  $(document).on(\"input change\", \"input, select\", recalcular);",
        "  recalcular();",
        "});"
      ].join("\n")
    },
    visibility: {
      label: "Mostrar/esconder campo por condicao",
      code: [
        "// Mostrar/esconder um campo conforme o valor de outro.",
        "// Exemplo: mostrar 'inscricao_estadual' apenas quando 'uf' for SP.",
        "// O .closest('.export-component') esconde o label junto com o campo.",
        "$(function () {",
        "  function aplicar() {",
        "    var valor = $(\"[name='uf']\").val();",
        "    var alvo = $(\"[name='inscricao_estadual']\").closest(\".export-component\");",
        "",
        "    if (valor === \"SP\") {",
        "      alvo.show();",
        "    } else {",
        "      alvo.hide();",
        "    }",
        "  }",
        "",
        "  $(document).on(\"input change\", \"[name='uf']\", aplicar);",
        "  aplicar();",
        "});"
      ].join("\n")
    },
    toggleState: {
      label: "Habilitar/desabilitar campo",
      code: [
        "// Habilitar/desabilitar um campo conforme o valor de outro.",
        "// Exemplo: liberar 'valor_desconto' apenas quando 'tem_desconto' estiver marcado.",
        "$(function () {",
        "  function aplicar() {",
        "    var marcado = $(\"[name='tem_desconto']\").is(\":checked\");",
        "",
        "    $(\"[name='valor_desconto']\").prop(\"disabled\", !marcado);",
        "  }",
        "",
        "  $(document).on(\"input change\", \"[name='tem_desconto']\", aplicar);",
        "  aplicar();",
        "});"
      ].join("\n")
    },
    blank: {
      label: "Em branco",
      code: [
        "// Script da pagina (jQuery disponivel).",
        "$(function () {",
        "  // Seu codigo aqui.",
        "});"
      ].join("\n")
    }
  };

  window.TemplateBuilderJsSnippets = TEMPLATES;

  window.TemplateBuilderRenderers.register({
    jsSnippet: renderJsSnippetHtml
  });

  window.TemplateBuilderRenderers.registerPreviews({
    jsSnippet: renderJsSnippetPreview
  });

  // O HTML "na posicao" do componente e vazio de proposito: o codigo e emitido pelo
  // export-html.js no bloco unico de scripts da pagina (fim do body).
  function renderJsSnippetHtml() {
    return "";
  }

  function renderJsSnippetPreview(component, context) {
    const props = component.props || {};
    const template = TEMPLATES[props.template];
    let label;
    if (props.description) {
      label = props.description;
    } else if (template) {
      label = template.label;
    } else {
      label = "Script da pagina";
    }
    const lineCount = String(props.code || "").split("\n").length;

    return `<div class="hidden-input-preview"><strong>JS</strong><span>${context.escapeHtml(label)}</span><code>${lineCount} linhas</code></div>`;
  }
}());
