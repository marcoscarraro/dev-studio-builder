# Guia do Desenvolvedor

O **Dev Studio Builder** e um builder visual de paginas HTML e formularios baseado no Tabler.
A ideia principal e permitir que o usuario monte paginas arrastando componentes, configurando
propriedades e exportando o HTML final.

Este guia explica a arquitetura atual para manutencao sem depender de IA.

## Documentos Relacionados

- [Como criar componente](COMO_CRIAR_COMPONENTE.md)
- [Exemplos de componentes](EXEMPLOS_COMPONENTES.md)
- [Contrato do components.json](CONTRATO_COMPONENTS_JSON.md)
- [Checklist de testes](CHECKLIST_TESTES.md)
- [Mapa do builder.js](MAPA_BUILDER_JS.md)
- [Como criar uma feature](COMO_CRIAR_FEATURE.md)
- [Componente DataTable (server-side e selecao)](COMPONENTE_DATATABLE.md)
- [Componentes TomSelect e Tags (busca remota)](COMPONENTE_TOMSELECT.md)
- [TomSelect: criar com botao (modal/iframe) — integracao Laravel](COMPONENTE_TOMSELECT_CREATE_LARAVEL.md)
- [Integracao com Laravel (todos os componentes)](INTEGRACAO_LARAVEL.md)
- [Report Builder (templates para DOMPDF)](REPORT_BUILDER.md)
- [PWA (app instalavel)](PWA.md)
- [Documento Office (Word/Excel/PPT)](COMPONENTE_OFFICE_VIEWER.md)
- [PDF (PDF.js)](COMPONENTE_PDF.md)

## Visao Geral

O editor e JavaScript puro (DOM API: `querySelector`, `addEventListener`, `classList`) —
nao usa jQuery. Ja a **pagina exportada** usa **jQuery** quando precisa (DataTable, envio
AJAX do formulario e snippets do componente Script JS); o jQuery e incluido
automaticamente no export e deduplicado. Nao ha Alpine.js no projeto.

As bibliotecas de terceiros, os CSS proprios e os icones ficam centralizados em
`public/components/` (libs, css, icons, js) — no deploy Laravel, `public/` e a raiz web.

O builder e dividido nestas camadas principais:

- `assets/data/components.json`: catalogo dos componentes disponiveis.
- `assets/js/builder.js`: orquestrador principal do editor.
- `assets/js/core/`: modulos centrais do editor.
- `assets/js/renderers/`: um arquivo por componente, transforma componente em HTML.
- `public/components/js/`: runtimes usados pela pagina HTML exportada (nao pelo editor).
- `public/components/css/`: CSS proprio (base, tema, layouts de menu e CSS por componente).
- `public/components/libs/`: bibliotecas de terceiros (movidas de `tabler/libs`).
- `public/components/icons/`: icones em **SVG** (`outline/` e `filled/`), desacoplados da
  webfont do Tabler.

O fluxo normal e:

1. O editor carrega `components.json`.
2. O usuario arrasta um componente para a pagina.
3. O builder cria um objeto de componente com `type`, `id`, `props` e, quando necessario, `rows`.
4. O painel de propriedades edita `props`.
5. Um renderer gera o preview e o HTML exportado.
6. Se o componente precisa de comportamento no HTML exportado, o exportador inclui runtimes de `public/components/js/`.

## Estrutura de Arquivos

```text
assets/js/builder.js
assets/js/core/helpers.js
assets/js/core/drag-drop.js
assets/js/core/properties.js
assets/js/core/export-html.js

assets/js/renderers/registry.js
assets/js/renderers/<um arquivo por componente>.js
  (heading, paragraph, input, select, choice, card, fieldlist, chart, date-picker,
   js-snippet, dropzone, fullcalendar, barcode-scanner, gantt, pdf-viewer,
   office-viewer, otp, pwa, ...)

public/components/js/<um runtime por lib/comportamento vivo>.js
  (datatable, tomselect, litepicker, signature, hugerte, apexchart, fullcalendar,
   dropzone, mask, password-toggle, quantity-stepper, fieldlist, ajax-fill,
   barcode-scanner, audio-recorder, clipboard, unsaved-guard, gantt, pdf,
   office (sem runtime), otp, pwa, fullscreen, pill-layout, sidebar-collapse)

public/components/css/
  base.css                <- estilos base/utilitarios proprios
  theme.css               <- variaveis e tema (claro/escuro via [data-bs-theme])
  components/<componente>.css   <- CSS por componente (incluido no export so quando usado)
  layouts/                <- CSS dos layouts de menu (pill-layout, module-rail, sidebar-collapse)

public/components/libs/   <- bibliotecas de terceiros (jquery, imask, apexcharts, dropzone,
                             tom-select, litepicker, fullcalendar, signature_pad, hugerte,
                             pdfjs, inter, ...)

public/components/icons/  <- icones SVG (outline/ e filled/)

mock/*.json            <- dados de exemplo (GET)
mock/form-post.php     <- endpoint de teste do Envio AJAX (POST; ecoa o que recebeu)

database_builder.html              <- Database Designer (pagina irma, ver abaixo)
assets/js/database-builder.js
assets/css/database-builder.css
```

### Database Designer (pagina irma)

`database_builder.html` e um editor visual de banco de dados (tabelas, colunas, indices,
FKs, views e triggers) que exporta `.SQL` multi-banco (MySQL, PostgreSQL, SQLite,
SQL Server, Firebird, Oracle). Abre pelo botao "Banco de Dados" na topbar do builder
(nova aba). E um app **independente** (JS proprio em `assets/js/database-builder.js`,
persistencia propria em `localStorage["database_designer"]`), mas com o **mesmo shell
visual** do builder: topbar, workspace de 3 colunas (Objetos | Diagrama | Propriedades)
e edicao **ao vivo no painel de propriedades** — sem modais. O SQL gerado sai num
`<dialog>` identico ao dialogo de saida do builder.

## Responsabilidade de Cada Arquivo

`assets/js/builder.js`

Orquestra o editor. Ele guarda o estado (`state`), carrega o registry, renderiza a tela, normaliza dados e conecta os modulos. Evite colocar HTML grande ou regra isolada de componente aqui. Quando possivel, crie ou edite um arquivo em `renderers/`, `core/` ou `runtime/`.

`assets/js/core/helpers.js`

Helpers globais de HTML, atributo, classe CSS, boolean, strings JS e IDs seguros. Use estes helpers nos renderers pelo `context`.

`assets/js/core/drag-drop.js`

Eventos e regras de arrastar/soltar. Aqui ficam regras como:

- onde pode soltar componente;
- evitar `<form>` dentro de `<form>`;
- mover linhas e componentes;
- aceitar ou rejeitar componentes dentro de containers.

`assets/js/core/properties.js`

Eventos do painel de propriedades. Ele atualiza `props`, linhas, colunas, repeaters, key/value, matrix e re-renderiza o editor.

`assets/js/core/export-html.js`

Gera o HTML final exportado. Tambem coleta assets CSS/JS vindos de `components.json` e inclui runtimes quando necessario. Tambem monta o menu (navbar/sidebar) conforme o `menuLayout` (ver "Layouts de Menu").

`assets/js/renderers/registry.js`

Registro dos renderers. Um renderer externo chama:

```js
window.TemplateBuilderRenderers.register({
  input: renderInputComponent
});
```

Para preview especial, use:

```js
window.TemplateBuilderRenderers.registerPreviews({
  hiddenInput: renderHiddenInputPreview
});
```

`assets/js/renderers/*.js`

Cada arquivo gera o HTML de um ou mais `kind` de componente. O ideal e que cada renderer seja simples, legivel e focado no HTML daquele componente.

Renderers que expoe helpers globais podem usar o padrao:

```js
window.MinhaFerramenta = { minhaFuncao: minhaFuncao };
```

Isso permite que o renderer e o canvas reutilizem a mesma logica sem duplicar codigo. Exemplo atual: `chart.js` expoe `window.TemplateBuilderChartHelpers.buildApexOptions`, usado pelo proprio renderer para preencher o atributo `data-chart-options`; na pagina exportada, o `apexchart-runtime.js` apenas le esse atributo.

`public/components/js/*.js`

Scripts (runtimes) usados pela pagina exportada, nao pelo editor. Esta em `public/`
porque, no deploy Laravel, `public/` e a raiz web. Cada lib "viva" tem o seu runtime de
auto-discovery (varre `[data-x]`, le `data-*` e inicializa). Exemplos:

- `fieldlist-runtime.js`: adicionar, clonar, remover e reindexar linhas do FieldList no HTML exportado.
- `ajax-fill-runtime.js`: preencher campos a partir de uma chamada AJAX.
- `datatable-runtime.js`, `tomselect-runtime.js`, `apexchart-runtime.js`, `gantt-runtime.js`, `pdf-runtime.js`, ...: inicializam a lib de cada componente vivo.
- `pill-layout.js`: runtime dos layouts de menu `combo-pill` e `module-rail` (rail de icones, tooltips e dropdowns flutuantes da barra superior).

## Organizacao do CSS

O CSS proprio do projeto vive em `public/components/css/`:

- `base.css` — estilos base e utilitarios proprios (ex.: `.button-icon` com mascara de SVG).
- `theme.css` — variaveis e tema; o modo escuro usa `[data-bs-theme=dark]` (mesma convencao do Tabler, com `--tblr-*`).
- `components/<componente>.css` — um arquivo por componente que precisa de CSS proprio
  (ex.: `gantt.css`, `tom-select.css`). E incluido no export **somente quando o componente
  e usado**, via `assets.styles` no bloco do componente em `components.json`.
- `layouts/` — CSS dos layouts de menu (`pill-layout.css`, `module-rail.css`,
  `sidebar-collapse.css`), incluidos conforme o `menuLayout` escolhido.
  - `sidebar-collapse.css` + `sidebar-collapse-runtime.js` so sao incluidos nos layouts
    `vertical`/`combo` **e** quando a propriedade da pagina `menuCollapsible` esta ativa
    (padrao). Ao recolher, a sidebar vira uma faixa somente-icones (esconde `.nav-link-title`).
    Se `menuCollapsible` for `false`, o botao de recolher, o CSS e o runtime nao sao emitidos.

Sempre que possivel, prefira variaveis do Tabler que respeitam o tema (`--tblr-bg-surface`,
`--tblr-body-color`, `--tblr-border-color`, `--tblr-secondary`, `--tblr-primary`,
`--tblr-tertiary-bg`) em vez de cores fixas, para o componente seguir claro/escuro.

## Componentes com Inicializacao JS no Canvas e no Export

Alguns componentes usam bibliotecas externas que precisam ser inicializadas tanto no canvas do editor quanto no HTML exportado.

O padrao e:

1. Declarar `assets.init` no bloco do componente em `components.json`:

```json
"assets": {
  "init": "apexchart",
  "scripts": ["public/components/libs/apexcharts/dist/apexcharts.min.js"]
}
```

2. Em `builder.js`, a funcao `initializePreviewComponents` carrega os scripts dinamicamente para os valores de `init` conhecidos (`litepicker`, `apexchart`, `dropzone`, `fullcalendar`, `gantt`, ...) e chama a funcao de inicializacao correspondente no canvas. **Excecao:** `barcodeScanner` nao e inicializado no canvas (acesso a camera e intrusivo no editor) — o canvas exibe apenas o HTML estatico do renderer; o runtime so roda na pagina exportada.

3. Em `export-html.js`, a funcao `collectExportAssets` verifica o valor de `init` e inclui o **runtime** correspondente de `public/components/js/` (a pagina exportada **nao tem mais JS inline**). O runtime varre o DOM por `[data-xxx]` e inicializa lendo os `data-*` emitidos pelo renderer.

Valores de `init` reconhecidos atualmente:

| Valor | Biblioteca | Runtime |
|---|---|---|
| `datatable` | DataTables | `datatable-runtime.js` |
| `tomselect` | Tom Select | `tomselect-runtime.js` |
| `litepicker` | Litepicker | `litepicker-runtime.js` |
| `signature` | SignaturePad | `signature-runtime.js` |
| `hugerte` | hugeRTE | `hugerte-runtime.js` |
| `apexchart` | ApexCharts | `apexchart-runtime.js` |
| `fullcalendar` | FullCalendar | `fullcalendar-runtime.js` |
| `dropzone` | Dropzone | `dropzone-runtime.js` |
| `barcodeScanner` | html5-qrcode | `barcode-scanner-runtime.js` |
| `audioRecorder` | MediaRecorder (nativo) | `audio-recorder-runtime.js` |
| `passwordToggle` | toggle de senha | `password-toggle-runtime.js` |
| `mask` | IMask | `mask-runtime.js` |
| `gantt` | Gantt (proprio) | `gantt-runtime.js` |
| `pdfViewer` | PDF.js | `pdf-runtime.js` |

Alem dos `init`, alguns runtimes sao incluidos por **deteccao do componente/uso** (nao por
`init`): `fieldlist-runtime.js` (FieldList), `ajax-fill-runtime.js` (botoes com `ajaxEnabled`),
`clipboard-runtime.js`, `quantity-stepper-runtime.js`, `unsaved-guard-runtime.js`,
`pwa-runtime.js`, `otp-runtime.js` e `fullscreen-runtime.js`. Os runtimes de layout
(`pill-layout.js`, `sidebar-collapse-runtime.js`) sao incluidos conforme o `menuLayout`.

Excecao do "zero JS inline": o **envio AJAX do formulario** (form com "Enviar via AJAX") e o
componente **Script JS** geram codigo aberto/editavel num bloco `<script>` unico no fim do
body, depois das libs (o export inclui o jQuery junto) — e codigo autoral da pagina, que o
dev pode personalizar direto no HTML exportado.

Para adicionar suporte a uma nova biblioteca: implemente a inicializacao no canvas em `builder.js` (funcao `initializePreviewXxx`); crie o runtime `public/components/js/xxx-runtime.js` (auto-discovery, le `data-*`); registre o caminho em `assets.runtimes` e adicione a linha `if (componentAssets.init === "xxx") { neededRuntimes.add("xxx"); }` em `collectExportAssets`; e garanta que o renderer emite os `data-*`.

## Layouts de Menu

O menu de navegacao e montado visualmente (componentes **Navbar** e **Sidebar**) e exportado
conforme o layout escolhido em `state.page.props.menuLayout`:

| `menuLayout` | Descricao |
|---|---|
| `none` | sem menu |
| `horizontal` | navbar superior |
| `vertical` | sidebar lateral (posicao configuravel) |
| `combo` | sidebar + navbar |
| `combo-pill` | rail de icones (expande no hover) + navbar "pill" |
| `module-rail` | rail full-height de modulos + barra superior embutida no conteudo (estilo Metronic) |

- **Dados:** `state.page.navbar` (itens do topo) e `state.page.sidebar` (itens laterais).
- **Export (`export-html.js`):** `exportNavbar` / `exportSidebar` / `exportPillNavbar` /
  `exportModuleRailNavbar` / `exportIconSidebar`. As colunas do menu sao respeitadas por
  `exportMenuNavSections` (1 coluna => um `<ul>`; varias => varios `<ul>` com
  `me-auto`/`mx-auto` para espalhar esquerda/centro/direita).
- **CSS:** `public/components/css/layouts/`. **Runtime:** `pill-layout.js` (combo-pill e
  module-rail). Todos os layouts respeitam tema claro/escuro (`menuTheme`) e posicao do
  sidebar (`menuPosition`).

## Conceitos Importantes

### `id`

Identificador do componente no catalogo. Exemplo: `input`, `hidden-input`, `button-dropdown`.
**Nunca** altere o `id` de um componente existente — projetos salvos em JSON dependem dele.

### `kind`

Tipo logico usado pelo engine e pelo renderer. Varios componentes podem compartilhar o mesmo `kind`. Exemplo: `input`, `number`, `email` podem usar `kind: "input"` com `inputType` diferente. Assim como o `id`, o `kind` **nunca** deve ser alterado (compatibilidade de projetos salvos).

### `props`

Valores configuraveis do componente. Sao criados a partir de `defaults` e editados no painel de propriedades.

### `properties`

Campos exibidos no painel de propriedades. Cada entrada define label, prop, tipo de campo e outras configuracoes. A visibilidade condicional usa `showWhen` (aceita uma condicao ou um array de condicoes em modo "E").

### `propertySets`

Conjuntos reaproveitaveis de propriedades. Exemplo: `fieldBase`, `fieldState`, `validationState`.

### `container`

Define componentes que podem receber outros componentes dentro deles. Exemplos: `form`, `cardCustom`, `fieldList`.

## Ordem de Carregamento no `index.html`

A ordem importa:

1. `helpers.js`
2. `export-html.js`
3. `drag-drop.js`
4. `properties.js`
5. `renderers/registry.js`
6. renderers especificos
7. `builder.js`

O `builder.js` precisa ser carregado depois dos modulos que ele usa.

## Regras de Manutencao

- Para novo componente simples, edite primeiro `components.json` e crie/ajuste um renderer.
- Para componente com comportamento no HTML exportado, crie tambem um runtime.
- Para CSS proprio do componente, crie `public/components/css/components/<componente>.css` e
  referencie em `assets.styles` (so e exportado quando o componente e usado).
- Prefira variaveis do Tabler (`--tblr-*`) a cores fixas, para respeitar o tema claro/escuro.
- Nao coloque HTML grande dentro de `builder.js`.
- Nao misture comportamento do editor com comportamento da pagina exportada.
- Antes de testar no navegador, rode `node --check` nos arquivos JS alterados.
- Sempre valide `components.json` depois de edita-lo.

## Comandos Uteis

```powershell
node --check assets/js/builder.js
node --check assets/js/renderers/input.js
node -e "JSON.parse(require('fs').readFileSync('assets/data/components.json','utf8')); console.log('json ok')"
```

## Quando Criar Um Novo Arquivo

Crie um novo renderer quando:

- o HTML do componente for especifico;
- o componente tiver muitas propriedades;
- copiar e adaptar um renderer existente deixar o codigo mais claro.

Crie um novo runtime quando:

- o HTML exportado precisar executar JS proprio;
- o comportamento precisa funcionar fora do editor;
- o script nao depende de `builder.js`.

## Limites Atuais

Os renderers de componentes ja foram extraidos para `assets/js/renderers/` (um arquivo por componente). O `builder.js` ainda concentra estado, normalizacao, selecao, historico e o painel de propriedades — essa e a proxima fronteira de extracao, se necessario.
