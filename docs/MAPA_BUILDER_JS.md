# Mapa do `builder.js` (e dos modulos extraidos)

`assets/js/builder.js` e o orquestrador principal do editor (~3.400 linhas). Em jul/2026
ele foi **dividido por assunto**: os blocos tematicos viraram arquivos proprios em
`assets/js/core/` e `assets/js/data/`, no mesmo padrao IIFE + `window.X` + `create(context)`
(sem build step). Este documento mostra **em qual arquivo e funcao** cada coisa esta.

Dica: no editor, use "Ir para simbolo" / busca por nome de funcao (`Ctrl+F`) com os
nomes abaixo.

---

## Onde esta cada assunto (arquivo primeiro!)

| Assunto | Arquivo | Funcoes-chave |
|---|---|---|
| Helpers de HTML/string | `core/helpers.js` | `escapeHtml`, `attr`, `classAttr`, `sanitizeElementId` |
| Dados constantes | `data/pattern-templates.js` | `PATTERN_TEMPLATES`, `AJAX_PRESETS` |
| Parsers de dados | `core/parsers.js` | `parseOptions`, `parseChoiceItems`, `parseTableColumns`, `parseDropdownItems`, `normalizeKeyValueEntries` |
| Historico + localStorage | `core/history-storage.js` | `commitHistory`, `debounceHistory`, `undo`, `redo`, `saveToStorage`, `loadStoredPage` |
| Preview "vivo" das libs no canvas | `core/preview-libs.js` | `initializePreviewComponents`, `initializePreviewTomSelects`, `loadPreviewAsset` |
| Painel de propriedades (render + controles) | `core/properties-panel.js` | `renderProperties`, `renderPropertyField`, `fieldRepeater`, `fieldMatrix`, `matchesShowWhen`, `updateRepeaterProperty` |
| Eventos do painel | `core/properties.js` | `bind` (roteia input/click por `data-*`) |
| Drag-drop do canvas | `core/drag-drop.js` | `bindCanvas`, `dropOnColumn`, `canDrop` |
| Export da pagina | `core/export-html.js` | `exportDocument`, `collectExportAssets`, `renderFormAjaxScript` |
| **Todo o resto** | `builder.js` | ver tabela abaixo |

Os modulos com estado recebem um `context` do builder via `create(context)`
(`history-storage`, `preview-libs`, `properties-panel`) — o proprio builder mostra
exatamente o que cada um enxerga, na secao de imports do topo do arquivo.

## Estrutura em Secoes do `builder.js` (por nome)

| Secao | Funcoes-chave |
|---|---|
| Constantes e estado | `STORAGE_KEY`, `HISTORY_LIMIT`, objeto `state`, imports dos modulos |
| Inicializacao | `init` — ponto de entrada ao carregar a pagina |
| Criacao de pagina | `createEmptyPage`, `createStarterPage` |
| Catalogo de componentes | `loadComponentRegistry`, `loadTablerIcons`, `setComponentRegistry` |
| Criacao de nos | `createRow`, `createComponent`, `createBlock`, `syncFieldListRows` |
| Paleta | `renderPalette`, `bindPalette` |
| Eventos de interface | `bindToolbar`, `bindProperties`, `bindSearch`, `bindDevices` |
| Navegacao no estado | `getSectionRows`, `getContainerRows`, indices de drop |
| Selecao / duplicar / remover | `selectNode`, `duplicateSelected`, `removeRow`, `removeComponent` |
| Busca de nos | `findNode`, `findColumn`, `findComponentLocation`, `findRowLocation`, `getAllRows` |
| Renderizacao do canvas | `render` (chama `initializePreviewComponents` do preview-libs) |
| Renderizacao das secoes | `renderPageHeader`, `renderPageFooter`, `renderCanvas`, `renderRow` |
| Renderizacao de componentes | `renderComponent`, containers (`renderFormContainer*`, `renderCustomCard*`, `renderFieldList*`) |
| Despacho de renderers | `componentHtmlRenderers`, `getComponentHtmlRenderer`, `getRendererContext` |
| FieldList: templates de index | `applyFieldListIndexTemplates`, `createFieldListNameTemplate` |
| Helpers de CSS e definicao | `getComponentClass`, `isFieldListComponent`, `getRowContainerConfig` |
| Helpers de renderizacao | `renderCustomAttributes`, `renderButtonContent`, `renderTablerIcon`, `renderSelectOption` |
| Envio AJAX do formulario | `renderFormContainerAttributes` (suprime action/method no modo AJAX), `generateFormAjaxCode` (preenche o textarea "Codigo JS") |
| Normalizacao e migracao | `normalizePage`, `normalizeComponent`, `migrateLegacyExampleProps` |
| Geracao automatica de IDs | `applyGeneratedComponentProps`, `getGeneratedControlFields` |
| Saida: export HTML / JSON | `exportHtmlDocument`, `copyOutput`, `downloadOutput`, `getExportHtmlContext` |
| Utilidades | `uid`, `toast`, `sanitizeEditorHtml` |

---

## Objetos Globais Consumidos por `builder.js`

`builder.js` nao exporta um objeto global proprio — ele e o consumidor dos modulos:

- `window.TemplateBuilderHelpers` — helpers de HTML (de `core/helpers.js`)
- `window.TemplateBuilderData` — dados constantes (de `data/pattern-templates.js`)
- `window.TemplateBuilderParsers` — parsers de dados (de `core/parsers.js`)
- `window.TemplateBuilderHistory` — historico/persistencia (de `core/history-storage.js`)
- `window.TemplateBuilderPreviewLibs` — preview das libs no canvas (de `core/preview-libs.js`)
- `window.TemplateBuilderPropertiesPanel` — painel de propriedades (de `core/properties-panel.js`)
- `window.TemplateBuilderDragDrop` — drag-drop (de `core/drag-drop.js`)
- `window.TemplateBuilderProperties` — eventos do painel (de `core/properties.js`)
- `window.TemplateBuilderExportHtml` — exportacao HTML (de `core/export-html.js`)
- `window.TemplateBuilderRenderers` — registro de renderers + geradores de init inline (de `renderers/registry.js`)
- `window.TemplateBuilderChartHelpers` — opcoes de grafico (de `renderers/chart.js`)

---

## O Objeto `state`

```js
state = {
  page,            // arvore da pagina: { header[], children[], footer[] }
  selectedId,      // id do no selecionado (linha, coluna ou componente)
  selectedSection, // "header" | "footer" | null
  drag,            // estado do arraste atual, null fora
  outputKind,      // "html" | "json" — tipo do dialogo de saida
  componentRegistry,  // catalogo carregado de components.json
  componentsById,     // mapa { id: definicao } para componentes
  layoutBlocksById,   // mapa { id: definicao } para layouts
  tablerIcons,        // lista de nomes de icones
  tablerIconOptions,  // lista { value, text } para TomSelect
  history,         // array de snapshots JSON (undo stack)
  future,          // array de snapshots JSON (redo stack)
  preview          // true quando esta no modo preview
}
```

---

## Arvore de `state.page`

```
page
  id, type: "page", props: { title }, name
  header[]        <- linhas do cabecalho
  footer[]        <- linhas do rodape
  children[]      <- linhas do corpo principal

  row
    id, type: "row", props: { label, cssClass }
    columns[]
      id, type: "column", props: { span, cssClass }
      children[]
        component
          id, type: "input"|"button"|"chart"|..., props: {...}
          rows[]          <- FieldList e outros containers
          headerRows[]    <- CardCustom (zona header)
          bodyRows[]      <- CardCustom (zona body)
```

---

## Como Encontrar Coisas no Builder

### "Quero modificar como um componente e renderizado"

O HTML de cada componente vive em **`assets/js/renderers/<nome>.js`** (um arquivo por
componente). Procure o arquivo com o nome do componente (ex: `select.js`, `date-picker.js`).
O canvas e o export usam o **mesmo** renderer, via `renderComponentHtml` ->
`getComponentHtmlRenderer` -> registro de `registry.js`.

Containers especiais (`form`, `cardCustom`, `fieldList`) tem branches proprios em
`getComponentHtmlRenderer` e funcoes `renderFormContainerHtml` / `renderCustomCardHtml`
no `builder.js`.

### "Quero modificar como um componente e exportado para HTML"

- A estrutura geral do documento exportado esta em `core/export-html.js`.
- O HTML de cada componente vem do mesmo renderer do canvas (`renderComponentHtml`).
- A inicializacao JS de libs na pagina exportada (Dropzone, TomSelect, charts, etc.) NAO
  fica mais em `export-html.js`: vive nos runtimes de auto-discovery em
  `public/components/js/`. O export so inclui o `<script src>` do runtime.
- Unica excecao de JS inline: o **bloco "Scripts da pagina"** no fim do body — codigo
  autoral do usuario (componente Script JS e o script de Envio AJAX do formulario,
  ambos editaveis e salvos no JSON da pagina). Montado em `collectExportAssets` /
  `exportDocument` (`assets.pageScripts`).

### "Quero modificar o painel de propriedades de um componente"

1. O painel vem SEMPRE de `components.json` (`properties` + `propertySets` do bloco),
   resolvido por `getComponentPropertySchema`. Bloco sem `properties`/`propertySets` =
   painel vazio (nao existe mais fallback em JS — fonte unica).
2. Para adicionar um **tipo de campo novo**, veja `COMO_CRIAR_FEATURE.md`
   (`renderPropertyField` + `fieldXxx`).
3. **Campo condicional**: `"showWhen": { "prop": "x", "equals": v }` no components.json
   (filtrado por `matchesShowWhen`; checkbox re-renderiza o painel na hora). **Campo
   informativo**: `"field": "info"` + `valueTemplate` com `{{prop}}` (somente leitura).
   Exemplo real: Dropzone (URL de upload vs id do input oculto).
4. **Ganchos especiais** em `core/properties.js`: `syncFormAjaxCode` (regenera o codigo
   do Envio AJAX enquanto nao editado) e `applySnippetTemplate` (template do Script JS).

### "Quero modificar as regras de drag-drop"

- Va para `core/drag-drop.js`.
- Regras de rejeicao por `kind` ficam no `components.json` (campo `rejectKinds`).

### "Quero entender o historico de undo/redo"

- `commitHistory`: salva snapshot JSON do estado.
- `debounceHistory`: agrupa edicoes rapidas (digitacao).
- `undo` / `redo`: navegam. Limite: constante `HISTORY_LIMIT`.

### "Quero adicionar suporte a uma nova biblioteca JS"

Ver `COMO_CRIAR_FEATURE.md`, secao "Componente Com Biblioteca Externa".

---

## Renderers de Componentes (todos externos)

Desde a modularizacao, **todos os renderers de componentes foram extraidos** para
`assets/js/renderers/` — um arquivo por componente. `builder.js` nao contem mais
funcoes `renderXxxComponent` inline; ele apenas carrega o registro via
`getRegisteredComponentHtmlRenderers()`.

Para adicionar um renderer: criar `assets/js/renderers/<nome>.js` chamando
`window.TemplateBuilderRenderers.register({ meuKind: minhaFuncao })` e incluir o
`<script>` no `index.html` (depois de `registry.js`, antes de `builder.js`).
Ver `COMO_CRIAR_COMPONENTE.md`.

Sub-helpers compartilhados que **permanecem** em `builder.js` e sao expostos aos
renderers via `getRendererContext()`: `renderSelectOption`, `renderDropdownItem`,
`renderDropdownAction`, `parseOptions`, `parseChoiceItems`, e os demais `parse*`.

---

## Context do Renderer (`getRendererContext()`)

Cada renderer recebe um objeto `context` montado por `getRendererContext()` em `builder.js`.
Todos os helpers abaixo estao disponíveis dentro de qualquer arquivo em `assets/js/renderers/`.

### Escapamento e atributos

| Helper | Assinatura resumida | O que faz |
|---|---|---|
| `escapeHtml` | `(str)` | Escapa `< > & " '` para HTML |
| `escapeAttr` | `(str)` | Escapa para uso dentro de atributos |
| `attr` | `(name, value)` | Retorna ` name="valor"` ou `""` se vazio |
| `classAttr` | `(cls)` | Retorna ` class="cls"` ou `""` se vazio |

### Classes CSS

| Helper | O que faz |
|---|---|
| `getComponentClass(component)` | Classe CSS do componente: o que o usuario digitou ou o `defaultCssClass` |
| `mergeClassNames(a, b, ...)` | Junta classes com espaco, ignorando valores falsy |

### IDs e conversoes

| Helper | O que faz |
|---|---|
| `sanitizeElementId(value, fallback)` | Retorna `value` se valido; senao `fallback` |
| `toBooleanValue(value)` | Converte `"true"/"false"/true/false/1/0` para boolean |

### Icones e botoes

| Helper | O que faz |
|---|---|
| `renderTablerIcon(name, color)` | HTML do icone Tabler ou `""` |
| `renderButtonContent(text, icon, pos, color)` | Interior de botao (texto + icone posicionado) |
| `getSafeButtonType(value)` | Valida e retorna `"button"`, `"submit"` ou `"reset"` |
| `fieldListActionAttr(value)` | Atributo `data-fieldlist-action` para botoes de FieldList |

### Formulario

| Helper | O que faz |
|---|---|
| `renderFormLabel(label, required)` | HTML do `<label>` (com asterisco se required) |
| `renderHelpText(props)` | HTML do texto de ajuda (`props.help`) |
| `renderRequiredMark(props)` | Asterisco `<span class="text-danger">` se `props.required` |
| `renderValidationFeedback(props)` | HTML dos feedbacks `is-valid`/`is-invalid` |
| `renderInputAttributes(options)` | Todos os atributos HTML de um `<input>` (id, name, type, ...) |
| `getValidationClass(props)` | Retorna `"is-valid"`, `"is-invalid"` ou `""` |
| `renderCustomAttributes(attrs)` | Monta atributos da lista `customAttributes` |

### Indentacao

| Helper | O que faz |
|---|---|
| `indent(html, spaces)` | Indenta cada linha com N espacos (para HTML exportado legivel) |

### Selects e listas

| Helper | O que faz |
|---|---|
| `renderSelectOption(value, text, selected)` | `<option>` com `selected` se necessario |
| `parseOptions(value)` | Converte string ou objeto em array de `[value, text]` |
| `parseChoiceItems(value)` | Normaliza lista de itens de checkbox/radio |

---

## Regras de Ouro para Nao Quebrar o Builder

1. **Nao altere `state` diretamente fora de `builder.js`** — use o contexto
   (`getDragDropContext`, `getPropertiesContext`) passado aos modulos.
2. **Sempre chame `commitHistory()` apos mutacoes** que o usuario deve poder desfazer.
3. **Sempre chame `render()` apos mutacoes** para sincronizar o canvas.
4. **Nao substitua `innerHTML` do canvas diretamente** — use `renderCanvas()`.
5. **Renderers usam helpers via `context.`** — nunca chame um helper "pelado" dentro
   de um arquivo de `renderers/` (seria `ReferenceError`). Se faltar um helper no
   contexto, adicione-o em `getRendererContext()`.
6. **Nao inicialize bibliotecas externas mais de uma vez** — ha guards por elemento.
7. **Parsers de dados sao tolerantes a falha** — sempre retornam array vazio.
