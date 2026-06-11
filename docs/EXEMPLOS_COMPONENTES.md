# Exemplos de Componentes

Este documento mostra tres niveis de componentes:

- simples;
- medio;
- avancado.

Use os exemplos como ponto de partida.

## Exemplo Simples: Badge

Objetivo: criar um componente que exporta:

```html
<span class="badge bg-primary">Novo</span>
```

### 1. Entrada no `components.json`

Adicione em um grupo de conteudo:

```json
{
  "id": "badge",
  "label": "Badge",
  "kind": "badge",
  "icon": "block-icon label",
  "defaultCssClass": "badge bg-primary",
  "defaults": {
    "text": "Novo"
  },
  "properties": [
    { "label": "Texto", "prop": "text", "field": "text" }
  ]
}
```

### 2. Renderer

Crie:

```text
assets/js/renderers/badge.js
```

```js
(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    badge: renderBadgeComponent
  });

  function renderBadgeComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    return `<span${cssClassAttr}>${context.escapeHtml(props.text || "Badge")}</span>`;
  }
}());
```

### 3. Carregar no `index.html`

```html
<script src="assets/js/renderers/badge.js?v=1"></script>
```

## Exemplo Medio: Alert com Titulo e Texto

Objetivo: criar um alerta com titulo, texto e variante.

HTML esperado:

```html
<div class="alert alert-warning">
  <h4 class="alert-title">Atencao</h4>
  <div>Revise os dados antes de salvar.</div>
</div>
```

### 1. Entrada no `components.json`

```json
{
  "id": "alert-box",
  "label": "Alerta",
  "kind": "alertBox",
  "icon": "block-icon paragraph",
  "defaultCssClass": "alert alert-{{variant}}",
  "defaults": {
    "variant": "warning",
    "title": "Atencao",
    "text": "Revise os dados antes de salvar."
  },
  "properties": [
    {
      "label": "Variante",
      "prop": "variant",
      "field": "select",
      "options": [
        ["info", "Info"],
        ["warning", "Aviso"],
        ["success", "Sucesso"],
        ["danger", "Perigo"]
      ]
    },
    { "label": "Titulo", "prop": "title", "field": "text" },
    { "label": "Texto", "prop": "text", "field": "textarea" }
  ]
}
```

Observacao: `defaultCssClass` aceita `{{variant}}`, que sera substituido pelo valor de `props.variant`.

### 2. Renderer

```text
assets/js/renderers/alert-box.js
```

```js
(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    alertBox: renderAlertBoxComponent
  });

  function renderAlertBoxComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const title = props.title
      ? `<h4 class="alert-title">${context.escapeHtml(props.title)}</h4>`
      : "";
    const text = `<div>${context.escapeHtml(props.text || "")}</div>`;

    return [
      `<div${cssClassAttr}>`,
      context.indent(title, 2),
      context.indent(text, 2),
      "</div>"
    ].filter(Boolean).join("\n");
  }
}());
```

## Exemplo Avancado: Card Container com Duas Zonas

Objetivo: criar um componente que recebe outros componentes dentro do titulo e do corpo.

Use como referencia o conceito do `cardCustom` atual.

### 1. Entrada no `components.json`

```json
{
  "id": "painel-custom",
  "label": "Painel Custom",
  "kind": "cardCustom",
  "icon": "block-icon card",
  "defaultCssClass": "card",
  "container": {
    "enabled": true,
    "renderer": "cardCustom",
    "storage": "rows",
    "zones": [
      {
        "id": "header",
        "storage": "headerRows",
        "accepts": ["layout", "component"],
        "rejectKinds": ["formContainer"]
      },
      {
        "id": "body",
        "storage": "bodyRows",
        "accepts": ["layout", "component"],
        "rejectKinds": []
      }
    ]
  },
  "defaults": {
    "headerCssClass": "card-header",
    "bodyCssClass": "card-body"
  },
  "properties": [
    { "label": "Classe CSS do titulo", "prop": "headerCssClass", "field": "text" },
    { "label": "Classe CSS do corpo", "prop": "bodyCssClass", "field": "text" }
  ]
}
```

### 2. Precisa de Renderer?

Neste caso, nao precisa criar renderer novo se usar:

```json
"kind": "cardCustom"
```

O builder ja sabe renderizar container `cardCustom`.

### 3. Quando Precisa Criar Renderer Avancado?

Crie renderer novo quando:

- a estrutura HTML for muito diferente;
- existirem zonas diferentes das suportadas;
- o componente tiver comportamento especifico no export.

Nesse caso, voce tambem precisara ajustar o engine para reconhecer um novo `container.renderer`, pois hoje o schema aceita:

- `form`
- `cardCustom`
- `fieldList`

## Exemplo Avancado com Runtime: Botao AJAX

O componente `input-button-group` ja suporta AJAX Fill.

O botao usa propriedades como:

```json
{
  "ajaxEnabled": true,
  "ajaxUrlTemplate": "https://viacep.com.br/ws/{{value}}/json",
  "ajaxMethod": "GET",
  "ajaxMappings": [
    { "key": "logradouro", "value": "cliente_rua" },
    { "key": "bairro", "value": "cliente_bairro" }
  ]
}
```

No HTML exportado, o exportador inclui automaticamente:

```html
<script src="public/components/js/ajax-fill-runtime.js" defer></script>
```

Use esse padrao quando criar outro componente que consulta API e preenche campos.

