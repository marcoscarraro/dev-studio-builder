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

---

## Exemplo Intermediário: Classes CSS Dinâmicas

Problema: o componente precisa construir a classe CSS com base em props (ex: variante +
outline + tamanho), mas sem sobrescrever o que o usuario digitou no campo "Classe CSS".

Existem dois padroes, dependendo do caso:

### Padrao A — Override total (verificar se o usuario customizou)

Use quando a classe toda e construida a partir de props logicas:

```js
function renderButtonComponent(component, cssClassAttr, definition, context) {
  const props = component.props || {};

  let btnClassAttr;
  if (component.props && component.props.cssClass !== undefined) {
    // usuario digitou algo no campo "Classe CSS": respeita como esta
    btnClassAttr = cssClassAttr;
  } else {
    // nenhuma customizacao: monta a classe a partir das props
    const variant = props.variant || "primary";
    const outline = context.toBooleanValue(props.outline);
    const size = props.size || "";
    const variantClass = outline ? `btn-outline-${variant}` : `btn-${variant}`;
    let cls = `btn ${variantClass}`;
    if (size) cls += ` ${size}`;
    btnClassAttr = context.classAttr(cls);
  }
  // usa btnClassAttr no elemento
}
```

Quando o usuario nunca tocou em "Classe CSS", `component.props.cssClass` e `undefined`
e o bloco de construcao e executado. Quando o usuario digitou algo (mesmo que string
vazia), o campo ja existe e `cssClassAttr` e usado diretamente.

### Padrao B — Extensao progressiva (partir da classe base e adicionar)

Use quando a classe base vem do `defaultCssClass` mas precisa de modificadores extras:

```js
function renderParagraphComponent(component, cssClassAttr, definition, context) {
  const props = component.props || {};

  // parte da classe resolvida (defaultCssClass + customizacao do usuario)
  let cls = context.getComponentClass(component);

  // adiciona modificadores conforme as props
  if (props.align) cls = context.mergeClassNames(cls, props.align);
  if (context.toBooleanValue(props.muted)) cls = context.mergeClassNames(cls, "text-secondary");

  return `<p${context.classAttr(cls)}>${context.escapeHtml(props.text || "")}</p>`;
}
```

`getComponentClass` devolve o que o usuario digitou em "Classe CSS" se preenchido,
ou o `defaultCssClass` caso contrario. `mergeClassNames` concatena com espaco.

---

## Exemplo Avancado: generatedFields e code-info

Para componentes que precisam de um ID gerado automaticamente (como offcanvas, modal,
rating), use `generatedFields` no `components.json` e o field `code-info` para
mostrar ao usuario como referenciar o componente via JS/HTML.

### 1. Entrada no `components.json`

```json
{
  "id": "meu-panel",
  "label": "Painel Lateral",
  "kind": "meuPanel",
  "icon": "block-icon paragraph",
  "defaultCssClass": "",
  "controlName": "painel",
  "generatedFields": [
    { "idProp": "panelId", "base": "painel" }
  ],
  "defaults": {
    "panelId": "",
    "title": "Painel"
  },
  "properties": [
    { "label": "ID do painel", "prop": "panelId", "field": "text", "group": "Geral" },
    { "label": "Titulo", "prop": "title", "field": "text", "group": "Geral" },
    {
      "label": "Referencia de uso",
      "prop": "_panelCodeRef",
      "field": "code-info",
      "group": "Referencia",
      "rows": 4,
      "valueTemplate": "// Abrir via JS\nconst el = document.getElementById('{{panelId}}');\nconst offcanvas = new bootstrap.Offcanvas(el);\noffcanvas.show();"
    }
  ]
}
```

O `controlName` e o prefixo humano (ex: `painel`). O `generatedFields` define que
`panelId` sera preenchido automaticamente com `painel-<sufixo>` na criacao
do componente. O usuario pode alterar depois, mas normalmente nao precisa.

O field `code-info` e diferente do `info`:
- `info`: mostra um texto simples, sem borda, sem textarea.
- `code-info`: exibe um `<textarea>` de somente leitura com botao "Copiar", ideal
  para mostrar snippets de codigo com `{{prop}}` resolvidos em tempo real.

O `valueTemplate` usa `{{nomeDaProp}}` que sao substituidos pelos valores atuais
das props do componente no painel de propriedades.

### 2. Renderer

```js
(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ meuPanel: renderMeuPanelComponent });

  function renderMeuPanelComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const panelId = context.sanitizeElementId(props.panelId, context.sanitizeElementId(component.id, "painel"));
    const title = context.escapeHtml(props.title || "Painel");

    // botao trigger + elemento offcanvas
    const trigger = `<button type="button" class="btn btn-secondary" data-bs-toggle="offcanvas" data-bs-target="#${context.escapeAttr(panelId)}">Abrir</button>`;
    const panel = `<div class="offcanvas offcanvas-end" id="${context.escapeAttr(panelId)}"><div class="offcanvas-header"><h5 class="offcanvas-title">${title}</h5></div></div>`;

    return `<div>${trigger}${panel}</div>`;
  }
}());
```

---

## Referencia: Helpers Disponiveis no Context do Renderer

Todo renderer recebe `context` com os seguintes helpers:

### Escapamento e atributos

| Helper | Uso |
|---|---|
| `context.escapeHtml(str)` | Escapa `< > & " '` para exibicao em HTML |
| `context.escapeAttr(str)` | Escapa para uso dentro de atributos HTML |
| `context.attr(name, value)` | Retorna ` name="valor"` ou `""` se value e vazio |
| `context.classAttr(cls)` | Retorna ` class="cls"` ou `""` se cls e vazio |

### Classes CSS

| Helper | Uso |
|---|---|
| `context.getComponentClass(component)` | Retorna a classe CSS do componente (customizada ou defaultCssClass) |
| `context.mergeClassNames(a, b, ...)` | Concatena classes ignorando valores falsy |

### IDs e nomes

| Helper | Uso |
|---|---|
| `context.sanitizeElementId(value, fallback)` | Retorna value se valido, senao fallback |
| `context.toBooleanValue(value)` | Converte string/boolean para boolean real |

### Icones e botoes

| Helper | Uso |
|---|---|
| `context.renderTablerIcon(name, color)` | Retorna HTML do icone Tabler ou `""` se sem nome |
| `context.renderButtonContent(text, icon, iconPosition, iconColor)` | Monta o interior de um botao (texto + icone posicionado) |
| `context.getSafeButtonType(value)` | Retorna `"button"`, `"submit"` ou `"reset"` validado |
| `context.fieldListActionAttr(value)` | Retorna atributo `data-fieldlist-action` para botoes de FieldList |

### Formulario

| Helper | Uso |
|---|---|
| `context.renderFormLabel(label, required)` | Retorna HTML do `<label>` com asterisco opcional |
| `context.renderHelpText(props)` | Retorna HTML do texto de ajuda (props.help) |
| `context.renderRequiredMark(props)` | Retorna HTML do asterisco se props.required |
| `context.renderValidationFeedback(props)` | Retorna HTML das mensagens de validacao |
| `context.renderInputAttributes(options)` | Monta todos os atributos de um `<input>` |
| `context.getValidationClass(props)` | Retorna `"is-valid"`, `"is-invalid"` ou `""` |
| `context.renderCustomAttributes(attrs)` | Monta atributos customizados da lista `customAttributes` |

### Indentacao

| Helper | Uso |
|---|---|
| `context.indent(html, spaces)` | Indenta cada linha do HTML com N espacos |

