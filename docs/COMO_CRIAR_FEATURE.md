# Como Criar Uma Feature

Este guia cobre mudancas que vao **alem de adicionar um componente**. Se voce so
quer um componente novo (badge, input, card), use `COMO_CRIAR_COMPONENTE.md`.

Use este guia quando precisar de:

- um tipo novo de campo no painel de propriedades (ex: um seletor de cor especial);
- um container novo que aceita outros componentes dentro;
- um componente que depende de uma biblioteca JS externa (no editor e no HTML exportado);
- uma regra nova de arrastar e soltar;
- mexer no historico (desfazer/refazer).

Tudo isto vive em `assets/js/builder.js` e nos arquivos de `assets/js/core/`.
O editor e **JavaScript puro** (DOM API: `document.querySelector`, `addEventListener`,
`classList`) — nao usa jQuery. A **pagina exportada** usa jQuery quando precisa
(DataTable, envio AJAX do formulario, snippets do Script JS), incluido automaticamente
no export. Nao ha Alpine.js no projeto.

---

## Antes de Comecar

Regra de ouro do projeto:

- **comportamento do EDITOR** (montar a pagina, arrastar, painel de props) fica em `builder.js` e `core/`;
- **comportamento da PAGINA EXPORTADA** (o que roda no site final) fica em `public/components/js/` (runtimes) e nunca depende de `builder.js`.

Nunca misture os dois.

---

## Feature 1: Novo Tipo de Campo de Propriedade

Este e o caso mais comum. Os campos do painel direito sao gerados por
`renderPropertyField(field, props)` em `builder.js`, a partir do `field` declarado
em `properties` no `components.json`.

### Passo 1: Entender o despacho

`renderPropertyField` e uma cadeia de `if` sobre `field.field`:

```js
if (field.field === "keyvalue") { return fieldKeyValue(...); }
if (field.field === "repeater") { return fieldRepeater(field, value); }
if (field.field === "select")   { return fieldSelect(field.label, field.prop, value, field.options || []); }
// ... e no final, o caso padrao (text, number, etc.):
return fieldInput(field.label, field.prop, value, getSafePropertyInputType(field.field), renderPropertyInputAttributes(field));
```

Cada `fieldXxx()` devolve HTML contendo um input com **`data-prop="nomeDaProp"`**.
O painel le `data-prop` automaticamente: quando o usuario digita, o valor vai para
`component.props[nomeDaProp]`. Voce nao precisa escrever o listener de leitura.

> **Sem codigo:** dois recursos do painel ja existem e sao 100% declarativos no
> `components.json` — campo **condicional** (`"showWhen": { "prop": "x", "equals": v }`,
> some/aparece conforme outra prop; checkbox atualiza o painel na hora) e campo
> **informativo** (`"field": "info"` + `"valueTemplate": "{{prop}}"`, somente leitura).
> Exemplo real: o Dropzone alterna "URL de upload" vs "Input oculto" pelo checkbox
> "Envio automatico". Detalhes no `CONTRATO_COMPONENTS_JSON.md`.

### Passo 2a: Tipo simples (so um `<input type=...>`)

Se o seu campo e so um input HTML padrao novo (ex: `range`), basta liberar o tipo
em `getSafePropertyInputType`:

```js
function getSafePropertyInputType(value) {
  const type = String(value || "text").toLowerCase();
  return ["text", "number", "url", "email", "color", "date", "time",
          "datetime-local", "password", "range"].includes(type) ? type : "text";
  //                                              ^^^^^^^ adicionado
}
```

Pronto. No `components.json`: `{ "label": "Volume", "prop": "volume", "field": "range" }`.

### Passo 2b: Tipo customizado (HTML proprio)

1. Crie a funcao `fieldXxx()` seguindo o padrao de `fieldSelect`/`fieldCheckbox`.
   O input **precisa** ter `data-prop="${prop}"`:

```js
function fieldStars(label, prop, value) {
  // exemplo: 1 input number com aparencia de estrelas
  return `<div class="field">
    <label class="form-label" for="prop-${prop}">${label}</label>
    <input id="prop-${prop}" class="form-control" type="number" min="0" max="5"
           data-prop="${prop}" value="${escapeAttr(value == null ? "" : value)}">
  </div>`;
}
```

2. Adicione o branch em `renderPropertyField`:

```js
if (field.field === "stars") {
  return fieldStars(field.label, field.prop, value);
}
```

3. Se o campo guarda **estrutura** (lista, objeto) em vez de um valor simples, ele
   precisa de um handler de escrita proprio. Veja os pares ja existentes como modelo:
   - `fieldKeyValue` + `updateKeyValueProperty` + `applyKeyValueAction`
   - `fieldRepeater` + `updateRepeaterProperty` + `applyRepeaterAction`
   - `fieldMatrix` + `updateMatrixProperty` + `applyMatrixAction`

   Esses handlers sao chamados a partir de `getPropertiesContext()` / `bindProperties()`.
   Procure o nome do seu tipo nesses dois lugares para ligar os botoes/acoes.

### Passo 3: Testar

```powershell
node --check assets/js/builder.js
```

No navegador: arraste um componente, confira o campo novo no painel, edite, e
verifique no botao `JSON`/`HTML` que o valor foi salvo em `props`.

---

## Feature 2: Novo Container (aceita componentes dentro)

Containers sao **declarativos**: na maioria dos casos voce nao escreve logica de
arrastar/soltar, so declara `container` no `components.json`. O builder le isso em
`getRowContainerConfig(definition)`.

### Passo 1: Declarar no `components.json`

```json
{
  "id": "painel",
  "label": "Painel",
  "kind": "painel",
  "container": {
    "storage": "rows",
    "accepts": ["layout", "component"],
    "rejectKinds": ["formContainer"]
  }
}
```

Campos de `container`:

- `storage`: onde as linhas filhas ficam (`"rows"` e o padrao).
- `accepts`: o que pode entrar (`"layout"` e/ou `"component"`).
- `rejectKinds`: kinds proibidos dentro.
- `zones`: para containers com mais de uma area (ex: card tem `header` e `body`).

### Passo 2: Renderer que desenha as zonas

Crie o renderer (veja `COMO_CRIAR_COMPONENTE.md`) usando os helpers de container do
contexto: `context.getRowContainerRows(component, zoneId)` devolve as linhas de uma
zona. Use `card.js`/`fieldlist.js` como referencia de container com zonas.

### Passo 3: Deteccao especial (opcional)

Containers padrao (`form`, `cardCustom`, `fieldList`) tem funcoes proprias
`isFormContainerComponent` / `isFieldListComponent` e branches em
`getComponentHtmlRenderer`. So crie algo assim se o seu container precisar de
tratamento diferente do generico — na maioria dos casos o `container` do JSON basta.

---

## Feature 3: Componente Com Biblioteca Externa

Quando o componente precisa de uma lib JS (ApexCharts, Litepicker, Tom Select,
Dropzone, FullCalendar), ela roda em **dois lugares**: no preview do editor e no
HTML exportado.

### No editor (preview)

1. Em `components.json`, declare `assets.init` e `assets.scripts`/`styles`:

```json
"assets": { "init": "litepicker", "scripts": ["public/components/libs/litepicker/litepicker.js"] }
```

2. Em `builder.js`, `initializePreviewComponents()` so carrega scripts cujo `init`
   esta na lista branca. Adicione o seu:

```js
.filter((definition) => ["litepicker", "apexchart", "dropzone", "fullcalendar", "meulib"].includes(definition.assets.init))
```

3. Crie `initializePreviewMeulib()` e chame dentro do `Promise.all(...).then(...)`
   de `initializePreviewComponents`. Use `initializePreviewLitePickers` como modelo.

### No HTML exportado

O export **nao** gera mais JS inline: cada lib e inicializada por um runtime de
auto-discovery em `public/components/js/`. Em vez de escrever um `renderMeulibInitializer`:

1. Crie `public/components/js/meulib-runtime.js` — varre `[data-meulib]`, le a config dos
   `data-*` e inicializa a lib (com guarda de init duplo). Modelos: `apexchart-runtime.js`,
   `dropzone-runtime.js`.
2. Registre o caminho em `components.json` -> `assets.runtimes.meulib`.
3. Garanta que o **renderer emite toda a config em `data-*`** (o mesmo HTML serve canvas e export).
4. Em `export-html.js` -> `collectExportAssets`, adicione a linha
   `if (componentAssets.init === "meulib") { neededRuntimes.add("meulib"); }`.

Detalhado no passo 7b de `COMO_CRIAR_COMPONENTE.md`.

### Caminhos de runtime centralizados

Todos os runtimes do projeto tem caminho unico em `components.json` -> `assets.runtimes`
(fieldlist, ajax-fill, mask, jquery + um por componente vivo: datatable, tomselect,
litepicker, signature, hugerte, apexchart, fullcalendar, dropzone, password-toggle,
quantity-stepper). O `export-html.js` le de la, nunca hardcode. Para adicionar um runtime novo,
registre o caminho ali. (O envio AJAX do form e o Script JS nao usam runtime: geram codigo
aberto no bloco de scripts da pagina exportada.)

---

## Feature 4: Regra de Arrastar e Soltar

Vive em `assets/js/core/drag-drop.js`. O builder passa um contexto via
`getDragDropContext()` em `builder.js`. As regras de "o que pode cair onde" usam o
`container.accepts` / `rejectKinds` (Feature 2). So mexa no `drag-drop.js` para
comportamento realmente novo (ex: indicadores visuais, restricoes especiais).

Sempre rode `node --check assets/js/core/drag-drop.js` apos editar.

---

## Feature 5: Historico (Desfazer / Refazer)

Em `builder.js`:

- `commitHistory()` grava um snapshot do estado atual;
- `debounceHistory()` agrupa edicoes rapidas (ex: digitacao) num unico snapshot;
- `undo()` / `redo()` navegam.

Toda acao que muda `state.page` deve terminar chamando `commitHistory()` (ou
`debounceHistory()` para digitacao continua). Se voce criar uma acao nova que altera
a pagina e ela nao aparece no desfazer, e porque faltou essa chamada.

---

## Mapa Rapido (onde fica cada coisa)

| Quero mexer em... | Arquivo / funcao |
|---|---|
| Campo do painel de propriedades | `builder.js` -> `renderPropertyField`, `fieldXxx`, `update*Property` |
| Container (aceitar filhos) | `components.json` -> `container`; `builder.js` -> `getRowContainerConfig` |
| Preview de lib externa | `builder.js` -> `initializePreviewComponents`, `initializePreviewXxx` |
| Export de lib externa | runtime em `public/components/js/` + linha em `collectExportAssets` (`export-html.js`) |
| Arrastar e soltar | `core/drag-drop.js` |
| Desfazer/refazer | `builder.js` -> `commitHistory`, `debounceHistory` |
| Renderer de um componente | `assets/js/renderers/<nome>.js` (um por componente) |

---

## Erros Comuns

- Esquecer `data-prop` no input de um campo de propriedade novo (o valor nunca salva).
- Esquecer de adicionar o `init` na lista branca de `initializePreviewComponents`.
- Colocar comportamento da pagina exportada dentro de `builder.js`.
- Hardcodar caminho de runtime em `export-html.js` em vez de usar `assets.runtimes`.
- Acao que muda a pagina sem chamar `commitHistory()` (some do desfazer).
- Editar `components.json` e deixar JSON invalido (rode o teste de JSON do passo de testes).
