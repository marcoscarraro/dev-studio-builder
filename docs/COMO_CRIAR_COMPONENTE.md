# Como Criar Um Componente

Este passo a passo mostra como criar um componente novo sem depender de IA.

## Antes de Comecar

Decida que tipo de componente voce esta criando:

- componente simples: gera apenas HTML, como badge, alerta, titulo, botao;
- componente de formulario: input, select, textarea, checkbox;
- componente com filhos: form, card personalizado, fieldlist;
- componente com JS no HTML exportado: datatable, ajax fill, fieldlist runtime.

Comece sempre pelo caso mais simples possivel.

## Passo 1: Criar a Entrada no `components.json`

Abra:

```text
assets/data/components.json
```

Escolha um grupo em `groups`. Exemplo:

```json
{
  "id": "content",
  "label": "Conteudo",
  "blocks": []
}
```

Adicione um bloco dentro de `blocks`.

Exemplo de componente simples:

```json
{
  "id": "alert-info",
  "label": "Alerta Info",
  "kind": "alert",
  "icon": "block-icon paragraph",
  "defaultCssClass": "alert alert-info",
  "defaults": {
    "text": "Mensagem informativa"
  },
  "properties": [
    { "label": "Texto", "prop": "text", "field": "textarea" }
  ]
}
```

Campos minimos:

- `id`: unico no arquivo.
- `label`: texto exibido na lista de componentes.
- `kind`: tipo logico usado pelo renderer.
- `defaultCssClass`: classe CSS padrao.
- `defaults`: valores iniciais de `props`.
- `properties`: campos editaveis no painel lateral.

## Passo 2: Criar ou Reaproveitar Um Renderer

Se o `kind` ja existe, talvez voce nao precise criar renderer.

Exemplo: um novo campo numerico pode usar `kind: "input"` e `inputType: "number"`, aproveitando `assets/js/renderers/input.js`.

Se o `kind` for novo, crie um arquivo:

```text
assets/js/renderers/alert.js
```

Conteudo base:

```js
(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    alert: renderAlertComponent
  });

  function renderAlertComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    return `<div${cssClassAttr}>${context.escapeHtml(props.text || "")}</div>`;
  }
}());
```

O renderer recebe:

- `component`: objeto com `type`, `id`, `props`.
- `cssClassAttr`: atributo `class="..."` ja pronto.
- `definition`: definicao do componente vinda do `components.json`.
- `context`: helpers e funcoes fornecidos pelo builder.

## Passo 3: Carregar o Renderer no `index.html`

Abra:

```text
index.html
```

Adicione o script depois de `registry.js` e antes de `builder.js`:

```html
<script src="assets/js/renderers/alert.js?v=1"></script>
```

Depois atualize o cache do builder, se voce alterou `builder.js`:

```html
<script src="assets/js/builder.js?v=24"></script>
```

Se voce apenas adicionou um renderer e o `components.json`, nao precisa mudar a versao do builder, mas pode subir o `v` do novo arquivo se estiver testando cache no navegador.

## Passo 4: Definir Propriedades

Tipos suportados em `properties`:

- `text`
- `number`
- `url`
- `email`
- `color`
- `date`
- `time`
- `datetime-local`
- `password`
- `textarea`
- `checkbox`
- `select`
- `icon`
- `keyvalue`
- `attributes`
- `repeater`
- `matrix`
- `code-info`

Exemplo com select:

```json
{
  "label": "Cor",
  "prop": "variant",
  "field": "select",
  "options": [
    ["primary", "Primaria"],
    ["success", "Sucesso"],
    ["danger", "Perigo"]
  ]
}
```

Exemplo com repeater:

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

## Passo 5: Usar Helpers do Contexto

Use sempre helpers para evitar HTML quebrado:

```js
context.escapeHtml(props.text)
context.escapeAttr(props.id)
context.attr("name", props.name)
context.classAttr(props.cssClass)
context.mergeClassNames("btn", props.cssClass)
```

Evite concatenar atributos manualmente quando houver helper.

## Passo 6: Testar

Rode:

```powershell
node --check assets/js/renderers/alert.js
node --check assets/js/builder.js
node -e "JSON.parse(require('fs').readFileSync('assets/data/components.json','utf8')); console.log('json ok')"
```

Depois teste no navegador:

1. Recarregue `index.html`.
2. Procure o componente na lista.
3. Arraste para a pagina.
4. Edite cada propriedade.
5. Clique em `HTML`.
6. Confira o HTML exportado.

## Passo 7: Quando Criar Runtime

Crie runtime quando o componente precisa funcionar na pagina exportada.

Exemplo:

```text
public/components/js/meu-componente-runtime.js
```

Depois inclua esse asset no componente:

```json
"assets": {
  "scripts": [
    { "src": "public/components/js/meu-componente-runtime.js", "defer": true }
  ]
}
```

O runtime nao deve depender de `builder.js`.

## Passo 7b: Quando Usar `assets.init` com Biblioteca Externa

Use `assets.init` quando o componente depende de uma biblioteca JS externa que precisa ser inicializada (ex: ApexCharts, DataTables, Tom Select, Litepicker).

O fluxo e:

1. Declare `assets.init` no componente em `components.json`:

```json
"assets": {
  "init": "apexchart",
  "scripts": ["public/components/libs/apexcharts/dist/apexcharts.min.js"]
}
```

2. No renderer, armazene as opcoes de inicializacao em um atributo `data-*` no elemento:

```js
var optionsAttr = context.escapeAttr(JSON.stringify(options));
return '<div id="' + id + '" data-apex-chart data-chart-options="' + optionsAttr + '"></div>';
```

3. Em `builder.js`, adicione a funcao de inicializacao do canvas (`initializePreviewXxx`) e registre o valor de `init` no filtro dentro de `initializePreviewComponents`.

4. Crie o runtime de auto-discovery `public/components/js/xxx-runtime.js`: ele varre o DOM
   por `[data-xxx]`, le a config dos `data-*` que o renderer emitiu e inicializa a lib (com
   guarda de init duplo). Registre o caminho em `assets.runtimes.xxx` no `components.json` e
   adicione a linha `if (componentAssets.init === "xxx") { neededRuntimes.add("xxx"); }` em
   `collectExportAssets` (`export-html.js`). **O export nao gera mais JS inline** — todo o
   comportamento da pagina exportada vive no runtime.

Como o mesmo HTML (com os `data-*`) serve o canvas e o export, o renderer e a unica fonte da
config. Se o calculo de opcoes for complexo, exponha-o como helper global no renderer (ex.:
`window.TemplateBuilderChartHelpers.buildApexOptions`) e use-o no proprio renderer para
preencher o `data-*`; o runtime so faz `JSON.parse` desse atributo.

Consulte `assets/js/renderers/chart.js` (emite `data-chart-options`/`-type`/`-ajax-url`) e
`public/components/js/apexchart-runtime.js` como exemplo completo deste padrao.

**Pegadinha (qualifique o seletor do runtime com a tag):** no runtime, use sempre o seletor
com a tag que o renderer emite (`div[data-fullcalendar]`, `select[data-tomselect]`,
`table[data-datatable]`...) em vez de so `[data-xxx]`. Caso real: o FullCalendar v6 injeta uma
tag `<style data-fullcalendar>` no `<head>` quando carrega. Com o seletor generico, o runtime
achava DOIS elementos e inicializava um calendario **dentro do `<style>`** — isso corrompia o
CSS que a propria lib injeta, e o calendario visivel renderizava sem grade/estilo, **sem nenhum
erro no console**. O canvas do editor nao sofre disso porque o seletor dele e escopado
(`.component-preview [data-fullcalendar]`) e nunca alcanca o `<head>`. Dica de diagnostico:
`document.querySelectorAll("[data-xxx]").length` no console da pagina exportada — se vier mais
que o numero de componentes, tem elemento de lib carregando o seu marcador.
Alem disso: inicialize a lib EXATAMENTE como a documentacao oficial manda (DOMContentLoaded +
`new Lib(el, options)` + `render()`), sem chamadas extras; e declarar a lib com
`{ "src": "...", "defer": true }` em `assets.scripts` segue as paginas canonicas do Tabler.

**Pegadinha (nunca renderize `<form>` num componente):** HTML nao permite `<form>` dentro de
`<form>`. Se um componente emite `<form>` e o usuario o arrasta para dentro do Form container,
o navegador ignora a tag interna e o `</form>` dela **fecha o form externo no meio da pagina**
— os campos seguintes e o botao submit ficam fora do form e o envio para de funcionar, sem
nenhum erro no console. Caso real: o Dropzone renderizava `<form class="dropzone">`; foi
trocado por `<div class="dropzone">` (a lib aceita qualquer elemento) com a URL em
`data-dropzone-url`.

## Regras Criticas

### Nunca altere `id` ou `kind` em componentes existentes

O `id` e o `kind` de um componente sao salvos no JSON de cada projeto do usuario.
Alterar qualquer um deles depois que projetos foram salvos faz o builder nao reconhecer
mais o componente — ele some da pagina ao carregar.

- `id`: mude so o `label` se quiser renomear o que aparece na paleta.
- `kind`: define qual renderer e usado; se o kind mudar, o componente quebra em
  projetos existentes.

### Classes CSS dinamicas — quando usar qual padrao

**Padrao simples (maioria dos componentes):** use `cssClassAttr` diretamente no
elemento raiz. O valor ja vem processado (defaultCssClass ou o que o usuario digitou).

```js
return `<div${cssClassAttr}>...</div>`;
```

**Padrao de override** (quando a classe e montada a partir de props logicas como
variante, tamanho, outline): verifique se o usuario ja customizou antes de sobrescrever.

```js
let cls;
if (component.props && component.props.cssClass !== undefined) {
  return `<button${cssClassAttr}>...</button>`;  // respeita o usuario
}
const variant = props.variant || "primary";
cls = `btn btn-${variant}`;
return `<button${context.classAttr(cls)}>...</button>`;
```

**Padrao de extensao** (quando a classe base existe mas precisa de modificadores
opcionais como alinhamento ou estado): parta de `getComponentClass` e adicione com
`mergeClassNames`.

```js
let cls = context.getComponentClass(component);         // base
if (props.align) cls = context.mergeClassNames(cls, props.align);
return `<p${context.classAttr(cls)}>...</p>`;
```

### `showWhen` so suporta `equals` (sem "not equals")

O campo condicional `showWhen: { prop: "x", equals: v }` faz um campo aparecer
QUANDO outra prop TEM o valor especificado. Nao ha suporte a "diferente de" ou
comparacoes de range. Se precisar mostrar um campo quando outra prop NENHUM VALOR,
a alternativa e sempre exibir o campo (sem `showWhen`).

## Erros Comuns

- Esquecer de carregar o renderer no `index.html`.
- Usar `kind` novo sem renderer.
- Usar `prop` em `properties` que nao existe em `defaults`.
- Editar `components.json` e deixar JSON invalido.
- Colocar JS de runtime dentro do renderer.
- Colocar comportamento da pagina exportada dentro de `builder.js`.
- Alterar `id` ou `kind` de um componente existente (quebra projetos salvos).
- Usar `showWhen` tentando negar uma condicao — o sistema so suporta igualdade.

