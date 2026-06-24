# Template Builder MVP 6 - Guia do Desenvolvedor

Este projeto e um builder visual de paginas HTML e formularios baseado no Tabler. A ideia principal e permitir que o usuario monte paginas arrastando componentes, configurando propriedades e exportando o HTML final.

Este guia explica a arquitetura atual para manutencao sem depender de IA.

## Documentos Desta Etapa

- [Como criar componente](docs/COMO_CRIAR_COMPONENTE.md)
- [Exemplos de componentes](docs/EXEMPLOS_COMPONENTES.md)
- [Contrato do components.json](docs/CONTRATO_COMPONENTS_JSON.md)
- [Checklist de testes](docs/CHECKLIST_TESTES.md)
- [Mapa do builder.js](docs/MAPA_BUILDER_JS.md)
- [Como criar uma feature](docs/COMO_CRIAR_FEATURE.md)
- [Componente DataTable (server-side e selecao)](docs/COMPONENTE_DATATABLE.md)
- [Componentes TomSelect e Tags (busca remota)](docs/COMPONENTE_TOMSELECT.md)
- [TomSelect: criar com botao (modal/iframe) — integracao Laravel](docs/COMPONENTE_TOMSELECT_CREATE_LARAVEL.md)
- [Integracao com Laravel 13 (todos os componentes)](docs/INTEGRACAO_LARAVEL.md)

## Visao Geral

O editor e JavaScript puro (DOM API: `querySelector`, `addEventListener`, `classList`) —
nao usa jQuery. Ja a **pagina exportada** usa **jQuery** quando precisa (DataTable, envio
AJAX do formulario e snippets do componente Script JS); o jQuery e incluido
automaticamente no export e deduplicado. Nao ha Alpine.js no projeto.

O builder e dividido nestas camadas principais:

- `assets/data/components.json`: catalogo dos componentes disponiveis.
- `assets/js/builder.js`: orquestrador principal do editor.
- `assets/js/core/`: modulos centrais do editor.
- `assets/js/renderers/`: um arquivo por componente, transforma componente em HTML.
- `public/components/js/`: runtimes usados pela pagina HTML exportada (nao pelo editor).

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
   js-snippet, dropzone, fullcalendar, barcode-scanner,
   audio-player, audio-recorder, video-player, youtube-embed, ...)

public/components/js/<um runtime por lib viva>.js
  (datatable, tomselect, litepicker, signature, hugerte, apexchart, fullcalendar,
   dropzone, mask, password-toggle, quantity-stepper, fieldlist, ajax-fill,
   barcode-scanner, audio-recorder)

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

Gera o HTML final exportado. Tambem coleta assets CSS/JS vindos de `components.json` e inclui runtimes quando necessario.

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
- `datatable-runtime.js`, `tomselect-runtime.js`, `apexchart-runtime.js`, `dropzone-runtime.js`, ...: inicializam a lib de cada componente vivo.

## Componentes com Inicializacao JS no Canvas e no Export

Alguns componentes usam bibliotecas externas que precisam ser inicializadas tanto no canvas do editor quanto no HTML exportado.

O padrao e:

1. Declarar `assets.init` no bloco do componente em `components.json`:

```json
"assets": {
  "init": "apexchart",
  "scripts": ["tabler/libs/apexcharts/dist/apexcharts.min.js"]
}
```

2. Em `builder.js`, a funcao `initializePreviewComponents` ja carrega os scripts dinamicamente para os valores de `init` conhecidos (`litepicker`, `apexchart`, `dropzone`, `fullcalendar`) e chama a funcao de inicializacao correspondente no canvas. **Excecao:** `barcodeScanner` nao e inicializado no canvas (acesso a camera e intrusivo no editor) — o canvas exibe apenas o HTML estatico do renderer; o runtime so roda na pagina exportada.

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
| `audioPlayer` | `<audio>` nativo | — (sem runtime) |
| `videoPlayer` | `<video>` nativo | — (sem runtime) |
| `youtubeEmbed` | `<iframe>` YouTube | — (sem runtime) |
| `passwordToggle` | toggle de senha | `password-toggle-runtime.js` |
| `mask` | IMask | `mask-runtime.js` |

Alem dos `init`, dois runtimes sao incluidos por **deteccao de props** (nao por `init`):
`fieldlist-runtime.js` (componente FieldList) e `ajax-fill-runtime.js` (botoes com
`ajaxEnabled`). Excecao do "zero JS inline": o **envio AJAX do formulario** (form com
"Enviar via AJAX") e o componente **Script JS** geram codigo aberto/editavel num bloco
`<script>` unico no fim do body, depois das libs (o export inclui o jQuery junto) — e
codigo autoral da pagina, que o dev pode personalizar direto no HTML exportado.

Para adicionar suporte a uma nova biblioteca: implemente a inicializacao no canvas em `builder.js` (funcao `initializePreviewXxx`); crie o runtime `public/components/js/xxx-runtime.js` (auto-discovery, le `data-*`); registre o caminho em `assets.runtimes` e adicione a linha `if (componentAssets.init === "xxx") { neededRuntimes.add("xxx"); }` em `collectExportAssets`; e garanta que o renderer emite os `data-*`.

## Conceitos Importantes

### `id`

Identificador do componente no catalogo. Exemplo: `input`, `hidden-input`, `button-dropdown`.

### `kind`

Tipo logico usado pelo engine e pelo renderer. Varios componentes podem compartilhar o mesmo `kind`. Exemplo: `input`, `number`, `email` podem usar `kind: "input"` com `inputType` diferente.

### `props`

Valores configuraveis do componente. Sao criados a partir de `defaults` e editados no painel de propriedades.

### `properties`

Campos exibidos no painel de propriedades. Cada entrada define label, prop, tipo de campo e outras configuracoes.

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
