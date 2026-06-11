# Contrato do `components.json`

Este documento explica os campos mais importantes de:

```text
assets/data/components.json
```

O arquivo possui schema em:

```text
assets/data/components.schema.json
```

## Estrutura Principal

```json
{
  "$schema": "./components.schema.json",
  "version": 14,
  "schemaVersion": 5,
  "framework": "tabler",
  "assets": {},
  "layoutDefaults": {},
  "propertySets": {},
  "groups": []
}
```

## `version`

Versao do catalogo de componentes.

Use quando houver mudanca relevante no catalogo.

## `schemaVersion`

Versao do formato interno do JSON.

Altere apenas quando mudar a estrutura esperada pelo engine.

## `framework`

Nome do framework visual usado.

Hoje:

```json
"framework": "tabler"
```

Se um dia mudar para Bootstrap, esse campo pode virar:

```json
"framework": "bootstrap"
```

Mas a troca real tambem exige atualizar classes CSS, assets e possivelmente renderers.

## `assets`

Define CSS e JS globais usados pelo HTML exportado.

Exemplo atual:

```json
"assets": {
  "favicon": { "href": "tabler/icons/outline/favicon.svg", "type": "image/svg+xml" },
  "styles": [
    "tabler/libs/inter/inter.css",
    "tabler/css/tabler.css"
  ],
  "headScripts": [
    "tabler/js/tabler-theme.js"
  ],
  "scripts": [
    { "src": "tabler/js/tabler.js", "defer": true }
  ]
}
```

Campos suportados:

- `favicon`
- `styles`
- `headScripts`
- `scripts`
- `init`

Um asset pode ser string:

```json
"tabler/css/tabler.css"
```

Ou objeto:

```json
{ "src": "tabler/js/tabler.js", "defer": true }
```

## `layoutDefaults`

Classes CSS padrao de linha e coluna.

```json
"layoutDefaults": {
  "rowCssClass": "row g-3 mb-3",
  "columnCssClass": "col-12 col-md-{{span}}"
}
```

`{{span}}` e substituido pelo tamanho da coluna.

## `propertySets`

Conjuntos reutilizaveis de propriedades.

Exemplo:

```json
"fieldBase": {
  "group": "Geral",
  "properties": [
    { "label": "Label", "prop": "label", "field": "text" },
    { "label": "Nome", "prop": "name", "field": "text" },
    { "label": "Ajuda", "prop": "help", "field": "text" }
  ]
}
```

Uso no componente:

```json
"propertySets": ["fieldBase", "fieldState"]
```

Quando usar:

- campos repetidos em muitos componentes;
- validacao;
- estado visual;
- configuracao de icone.

## `groups`

Lista de grupos exibidos no painel de componentes.

```json
{
  "id": "form",
  "label": "Formulario",
  "blocks": []
}
```

Cada grupo tem:

- `id`
- `label`
- `blocks`

## `blocks`

Cada item em `blocks` representa um componente ou layout arrastavel.

Exemplo:

```json
{
  "id": "input",
  "label": "Campo texto",
  "kind": "input",
  "inputType": "text",
  "icon": "block-icon text-line",
  "defaultCssClass": "form-control",
  "propertySets": ["fieldBase"],
  "controlName": "campo_texto",
  "defaults": {},
  "properties": []
}
```

## `id`

Identificador unico do componente no catalogo.

Regras:

- nao repetir;
- usar kebab-case quando possivel;
- nao mudar depois que projetos ja foram salvos, salvo com migracao.

Exemplos:

- `input`
- `hidden-input`
- `button-dropdown`
- `input-button-group`

## `label`

Nome exibido para o usuario na lista de componentes.

## `kind`

Tipo logico do componente.

O `kind` define qual renderer sera usado.

Exemplos:

- `input`
- `hiddenInput`
- `button`
- `buttonDropdown`
- `fieldList`
- `table`
- `datatable`
- `tomSelect`

Varios componentes podem usar o mesmo `kind`.

Exemplo:

```json
{
  "id": "number",
  "kind": "input",
  "inputType": "number"
}
```

## `icon`

Classe usada no item da paleta de componentes.

Exemplo:

```json
"icon": "block-icon text-line"
```

## `defaultCssClass`

Classe CSS padrao do componente.

Pode usar placeholders:

```json
"defaultCssClass": "btn btn-{{variant}}"
```

O valor vem de `props.variant`.

## `defaults`

Valores iniciais de `props`.

Exemplo:

```json
"defaults": {
  "label": "Campo texto",
  "inputId": "",
  "name": "",
  "placeholder": "",
  "required": false
}
```

Boa pratica:

- todo `prop` editavel deve ter um valor em `defaults`;
- use string vazia para texto opcional;
- use `false` para checkbox;
- use arrays para `repeater`;
- use objetos/arrays apenas quando o renderer souber ler.

## `properties`

Campos exibidos no painel de propriedades.

Exemplo:

```json
{
  "label": "Placeholder",
  "prop": "placeholder",
  "field": "text",
  "group": "Campo"
}
```

Campos principais:

- `label`: texto exibido.
- `prop`: chave dentro de `props`.
- `field`: tipo de controle.
- `group`: grupo visual no painel.
- `options`: opcoes de select.
- `default`: valor usado em repeater.
- `itemFields`: campos de um item de repeater.
- `addLabel`: texto do botao adicionar.
- `pattern`, `placeholder`, `min`, `max`, `step`: atributos do input de propriedades.
- `showWhen`: campo condicional — `{ "prop": "outraProp", "equals": valor }` faz o campo
  aparecer so quando a prop indicada tem o valor esperado. Quando a prop controladora e um
  checkbox, o painel se atualiza na hora ao marcar/desmarcar. Exemplo: no Dropzone, a
  "URL de upload" so aparece com "Envio automatico" ligado.
- `valueTemplate`: usado pelo field `info` — texto com placeholders `{{prop}}` resolvidos
  com os valores atuais (ex.: `"{{storeId}}"` no Dropzone).

## Tipos de `field`

Tipos aceitos:

```text
text
number
url
email
color
date
time
datetime-local
password
textarea
checkbox
select
icon
keyvalue
attributes
repeater
matrix
info
```

`info`: campo somente leitura, sem gravacao (nao emite `data-prop`). Mostra um valor
derivado via `valueTemplate` — util para exibir convencoes como o id do input oculto
do Dropzone (`{{storeId}}`, no formato `dropzone-store-<sufixo>`).

## `keyvalue`

Edita uma lista de pares chave/valor.

Uso comum:

- opcoes simples;
- mapeamentos JSON;
- atributos customizados.

Exemplo:

```json
{
  "label": "Mapeamentos JSON",
  "prop": "ajaxMappings",
  "field": "keyvalue"
}
```

## `attributes`

Parecido com `keyvalue`, mas usado para atributos HTML personalizados.

Exemplo:

```json
{
  "label": "Atributos personalizados",
  "prop": "customAttributes",
  "field": "attributes"
}
```

O renderer deve chamar `renderCustomAttributes`.

## `repeater`

Edita uma lista de objetos.

Exemplo:

```json
{
  "label": "Itens",
  "prop": "items",
  "field": "repeater",
  "addLabel": "Adicionar item",
  "itemFields": [
    { "label": "Texto", "prop": "text", "field": "text", "default": "Novo item" },
    { "label": "Href", "prop": "href", "field": "text", "default": "#" }
  ]
}
```

## `matrix`

Edita linhas e colunas de tabela.

Uso comum:

```json
{
  "label": "Linhas",
  "prop": "rows",
  "field": "matrix",
  "columnsProp": "columns",
  "addLabel": "Adicionar linha"
}
```

## `assets` no Componente

Um componente pode declarar CSS/JS especifico.

Exemplo datatable:

```json
"assets": {
  "styles": [],
  "scripts": [],
  "init": "datatable"
}
```

`init` reconhecido atualmente pelo exportador:

- `datatable`
- `tomselect`
- `litepicker`
- `signature`
- `hugerte`
- `apexchart`
- `fullcalendar`
- `dropzone`
- `passwordToggle`
- `mask`

Ao declarar `assets.init: "apexchart"`, o exportador **nao** gera codigo JS inline na pagina
exportada: ele apenas inclui o runtime correspondente (`public/components/js/apexchart-runtime.js`).
O runtime varre o DOM por `[data-apex-chart]` e inicializa cada grafico lendo a config dos
atributos `data-*` (auto-discovery — o mesmo padrao de `fieldlist-runtime.js`/`ajax-fill-runtime.js`).
Por isso o **renderer do componente precisa emitir toda a config em `data-*`** (ex.: `chart.js`
ja escreve `data-chart-options`, `data-chart-type`, `data-chart-ajax-url`). O canvas do editor
carrega a biblioteca dinamicamente na primeira vez que o componente e arrastado — caminho de
inicializacao **separado**, dentro de `builder.js`, que nao usa estes runtimes.

Para scripts proprios, use:

```json
"assets": {
  "scripts": [
    { "src": "public/components/js/meu-runtime.js", "defer": true }
  ]
}
```

### `assets.runtimes` (raiz)

No objeto `assets` da **raiz** do `components.json` (nao no de um componente) existe
`runtimes`, que centraliza os caminhos dos runtimes do projeto usados no HTML exportado:

```json
"assets": {
  "runtimes": {
    "ajaxFill": "public/components/js/ajax-fill-runtime.js",
    "fieldList": "public/components/js/fieldlist-runtime.js",
    "jquery": "public/tabler/libs/jquery/jquery-4.0.0.min.js",
    "mask": "public/tabler/libs/imask/dist/imask.min.js",
    "maskInit": "public/components/js/mask-runtime.js",
    "datatable": "public/components/js/datatable-runtime.js",
    "tomselect": "public/components/js/tomselect-runtime.js",
    "litepicker": "public/components/js/litepicker-runtime.js",
    "signature": "public/components/js/signature-runtime.js",
    "hugerte": "public/components/js/hugerte-runtime.js",
    "apexchart": "public/components/js/apexchart-runtime.js",
    "fullcalendar": "public/components/js/fullcalendar-runtime.js",
    "dropzone": "public/components/js/dropzone-runtime.js",
    "passwordToggle": "public/components/js/password-toggle-runtime.js",
    "quantityStepper": "public/components/js/quantity-stepper-runtime.js"
  }
}
```

O `export-html.js` le esses caminhos daqui — nunca os escreve hardcoded. As chaves casam 1:1
com os valores de `assets.init` (mais `quantityStepper`, incluido quando ha esse componente, e
`ajaxFill`/`fieldList`, detectados pelas props). A chave `mask` aponta para a lib imask
(terceiros) e `maskInit` para o nosso runtime de mascara — ambos sao incluidos quando algum input
tem `data-mask`. `jquery` e a lib usada pelo script de envio AJAX do formulario e pelo componente
Script JS (incluida automaticamente e deduplicada com a do DataTable). Para trocar o caminho de
um runtime, edite somente este lugar.

### Bloco de scripts da pagina — excecao do "zero JS inline"

Dois recursos geram **codigo aberto e editavel** num `<script>` unico no **fim do body,
depois das libs** (jQuery ja carregado). E codigo autoral da pagina (nao boilerplate), entao
NAO vira runtime — o dev pode personalizar direto no HTML exportado:

1. **Envio AJAX do formulario (bloco `form`)** — grupo de props "Envio AJAX" (`ajaxEnabled`,
   `ajaxUrl`, `ajaxMethod`, `ajaxFormat`, `ajaxAuthType`/`ajaxAuthToken`/`ajaxAuthHeader`,
   `ajaxHeaders`, `ajaxSuccessMessage`/`ajaxErrorMessage`, `ajaxRedirectUrl`, `ajaxCode`).
   O script `$("#formId").on("submit", ...)` + `$.ajax` (estilo da documentacao do Laravel,
   com o hint do CSRF comentado) aparece no textarea **"Codigo JS (jQuery)"** (`ajaxCode`):
   ele regenera ao vivo conforme as configs mudam **enquanto nao for editado manualmente**;
   depois de editado, as configs nao sobrescrevem mais (para regerar do zero, limpe o campo).
   O codigo do textarea e **salvo no JSON da pagina** e e o que sai no export — entao
   personalizacoes (SweetAlert, envio silencioso, exibir num elemento...) sobrevivem a
   futuras edicoes da pagina.
   **Arquivos (Dropzone / campo de arquivo):** use **Formato = FormData** (JSON nao
   transporta arquivo). Os arquivos do Dropzone sao sincronizados para um input file
   oculto (id `dropzone-store-<sufixo>`, prop auto-gerada `storeId`, visivel no painel)
   e vao junto no submit. Em submit tradicional (sem AJAX), o form precisa de
   `enctype="multipart/form-data"`.
   **Atencao:** o token/chave configurado fica **visivel no HTML exportado** (qualquer
   autenticacao client-side e visivel) — use chaves de baixo privilegio ou troque por
   sessao/cookie no backend.

2. **Componente Script JS (`jsSnippet`)** — guarda codigo jQuery em `props.code`, preenchido
   por templates e editado no painel.

## `container`

Define que o componente aceita filhos arrastaveis.

Exemplo `form`:

```json
"container": {
  "enabled": true,
  "storage": "rows",
  "renderer": "form",
  "accepts": ["layout", "component"],
  "rejectKinds": ["formContainer"]
}
```

Campos:

- `enabled`: ativa container.
- `storage`: propriedade onde as linhas serao salvas.
- `renderer`: tipo de container.
- `accepts`: aceita `layout`, `component` ou ambos.
- `rejectKinds`: lista de `kind` proibidos.
- `zones`: zonas internas, como `header` e `body`.

Renderers de container aceitos hoje:

- `form`
- `cardCustom`
- `fieldList`

## `zones`

Use quando o container tem mais de uma area arrastavel.

Exemplo:

```json
"zones": [
  { "id": "header", "storage": "headerRows" },
  { "id": "body", "storage": "bodyRows" }
]
```

## `controlName` e `generatedFields`

Usado para gerar automaticamente `id` e `name` padronizados.

Exemplo:

```json
"controlName": "campo_texto",
"generatedFields": [
  { "idProp": "inputId", "nameProp": "name", "base": "campo_texto" }
]
```

O builder cria valores como:

```text
campo_texto-a1b2c3
```

## Regras de Ouro

- `id` e `kind` nao sao a mesma coisa.
- `id` identifica o componente no catalogo.
- `kind` escolhe o renderer.
- `defaults` cria os valores iniciais.
- `properties` edita os valores.
- Renderer le os valores em `component.props`.
- Runtime so roda no HTML exportado.

