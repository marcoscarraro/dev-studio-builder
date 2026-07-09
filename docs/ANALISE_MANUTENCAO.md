# Análise de Manutenção & Evolução — Dev Studio Builder

> Análise completa dos 3 módulos (Page Builder, Report Builder, Database Builder) com foco em
> facilitar a manutenção e a evolução por **desenvolvedores júnior**, com pouco JS avançado.
>
> **Filosofia adotada (decisão do projeto):** simplicidade > DRY. Não é clean code/SOLID/clean
> architecture. Repetir código é aceitável **se** tornar mais fácil entender e corrigir. Zero build
> step — tudo continua JS puro com IIFEs, `window.X` e `<script>` tags.

Data da análise: julho/2026.

---

## 1. Sumário executivo

| Módulo | Entrada | JS | Linhas | Estado |
|---|---|---|---|---|
| Page Builder | `index.html` | `builder.js` + `core/` (4) + `renderers/` (88) | 5.805 + 2.251 + 4.723 | Funcional, god-file no centro |
| Export | (parte do page builder) | `core/export-html.js` | 1.362 | Funcional, if-chains e menus duplicados |
| Runtimes | páginas exportadas | `public/components/js/` (28) | 4.705 | ~80% seguem o mesmo molde |
| Report Builder | `report_builder.html` | `report-builder.js` | 2.099 | App independente, monolítico |
| Database Builder | `database_builder.html` | `database-builder.js` | 1.900 | App independente, monolítico |
| Catálogo | — | `components.json` | 3.352 (~99 componentes) | Boa estrutura, 2ª fonte de props no JS |

**Maiores riscos para um dev júnior (em ordem):**
1. `builder.js` com 5.805 linhas e 255 funções num único closure — difícil achar "onde mexo".
2. **Duas fontes de verdade** para propriedades de componente: `components.json` **e**
   `getFallbackPropertySchema` (builder.js:3510-3863, ~353 linhas de `if (kind === ...)`).
3. Lógica de um componente **partida em até 4 lugares** (renderer + builder.js preview + runtime +
   export if-chain) — checklist real de 6-7 arquivos para criar componente com JS.
4. Comportamento das páginas exportadas "escondido" nos runtimes genéricos (auto-discovery via
   `data-*`) — o dev da página não vê onde a config vira comportamento.
5. Report/Database builders duplicam helpers **com divergências** (bugs reais, ver §6).

---

## 2. Page Builder — núcleo (`assets/js/`)

### O que está bom (manter)
- **Padrão IIFE + `context`**: `core/drag-drop.js` (407 l.) e `core/properties.js` (366 l.) mostram o
  molde certo — arquivo pequeno, um assunto, recebe `context`, expõe `window.TemplateBuilderXxx`.
- **`components.json` com `propertySets`**: 18 conjuntos reutilizáveis bem usados (~15 componentes de
  formulário compartilham `fieldBase`/`fieldState`/etc.).
- **Renderers consistentes**: 88 arquivos, contrato único `render(component, cssClassAttr, definition,
  context)`; mediana ~40 linhas.
- **Seções demarcadas** no builder.js (28 réguas `// === NOME ===`) e `docs/MAPA_BUILDER_JS.md`.

### Problemas
| # | Problema | Onde | Impacto júnior |
|---|---|---|---|
| P1 | God-file: 255 funções, 1 closure | `builder.js` | Alto — sem fronteiras, tudo enxerga tudo |
| P2 | 2ª fonte de props em JS (`getFallbackPropertySchema`, ~353 l.) | builder.js:3510-3863 | Alto — edita o JSON e "não funciona" |
| P3 | Init de libs do preview longe do renderer (`initializePreviewTomSelects` etc.) | builder.js:1299-1648 | Médio — lógica do componente em 2 arquivos |
| P4 | Arrays quase idênticos copiados (`actionItemFields`/`dropdownItemFields`) | builder.js:3519-3547 | Baixo |
| P5 | 4 renderers com "preview" de assinatura diferente (2 args) sem doc | hidden-input, js-snippet, wysiwyg, signature | Baixo — pegadinha |
| P6 | Regra "não mutar state de fora" violada pelo próprio design (`context.state.x =`) | drag-drop.js:44,138 | Baixo — mas confunde a doc |

---

## 3. Export & Runtimes

### O que está bom
- Runtimes com molde canônico (referência: `mask-runtime.js`, 52 l.): IIFE → `init(root)` →
  `querySelectorAll("[data-xxx]")` → guarda de idempotência → boot DOMContentLoaded → guarda de
  re-carga. **Novos runtimes devem copiar esse molde.**
- Config viaja em `data-*` visíveis no HTML exportado (editáveis sem tocar JS).
- Form AJAX já sai como **código aberto e legível** (`renderFormAjaxScript`) — é o modelo do que o
  usuário quer para o restante.

### Problemas
| # | Problema | Onde | Impacto |
|---|---|---|---|
| E1 | If-chain redundante de runtimes (14 linhas idênticas) | export-html.js:671-684 | Todo componente novo exige editar o export **(corrigido na Fase 1)** |
| E2 | Render de item de menu duplicado em 2 versões (padrão × rail) com **assimetria de features** (rail não tem menu-user/search/badge/brand/spacer/switcher) | exportMenuComponent × exportIconSidebarItems | Duplicação **aceitável** pela filosofia; a assimetria é o problema real |
| E3 | Comportamento invisível na página exportada (auto-discovery mágico) | todos os runtimes | Dev da página não sabe onde começa o JS **(Fase 2)** |
| E4 | Desvios do molde de runtime: `fab-runtime` (guarda não re-inicializa), `pill-layout` (nome/boot próprios) | public/components/js | Pegadinhas ao copiar exemplo errado |
| E5 | ~15 ramos ad-hoc além do `init` (kind/props especiais) | export-html.js:685-754 | Aceitável — mas documentar |

### Checklist real hoje para componente novo com JS (7 lugares)
1. `components.json` → bloco do componente com `assets.init`
2. `components.json` → mapa `assets.runtimes`
3. ~~`export-html.js` → linha na if-chain~~ **(eliminado na Fase 1)**
4. `public/components/js/xxx-runtime.js` (copiar molde do mask-runtime.js)
5. `assets/js/renderers/xxx.js`
6. `index.html` → `<script>` do renderer
7. `builder.js` → `initializePreviewXxx` (se precisa ficar vivo no canvas)

---

## 4. Report Builder (`report-builder.js`, 2.099 l.)

- **App 100% independente** (não carrega core/renderers do page builder) — ok pela filosofia, mas os
  helpers copiados **divergiram** (bug B1 abaixo).
- Componentes hardcoded em `SECTION_TYPES` (92-202) — simples e claro, manter.
- Gerador DOMPDF próprio (`exportHtml` 1664-1811, ~148 l.) por `lines.push` — funciona; o problema é
  o tamanho da função (CSS + estrutura + seções no mesmo lugar).
- Undo/redo, persistência (`report_builder_v1`) e painel próprios — duplicação aceitável.
- `docs/REPORT_BUILDER.md` está atualizada. ✓

## 5. Database Builder (`database-builder.js`, 1.900 l.)

- Classes `Table`/`Column`/`View` com `toSQL()` **e** `render()` juntos — modelo + SQL + DOM na mesma
  classe. Aceitável no tamanho atual; documentar.
- **Dialetos espalhados**: `if (currentDatabase === "mysql")` em 5 lugares (Column.toSQL 273,
  Table.toSQL 346, View.toSQL 166, triggerToSQL 1565, exportSQL 1608). Adicionar um banco = caçar 5
  pontos. Para júnior, um **comentário-guia** listando os 5 pontos é mais barato que abstrair.
- `importSQL` (1626-1687): parser regex MySQL-only e **quebrava `DECIMAL(10,2)`/`ENUM(...)`**
  (bug B2, corrigido na Fase 1).
- **Não existe `docs/DATABASE_BUILDER.md`** — módulo de 1.900 linhas subdocumentado (Fase 4).

## 6. Bugs encontrados (corrigidos na Fase 1)

| # | Bug | Arquivo | Correção |
|---|---|---|---|
| B1 | `escapeHtml` não escapa `'` (aspa simples) — diverge das outras 2 cópias; atributo com aspas simples pode quebrar | report-builder.js:293 | Adicionar `.replace(/'/g, "&#39;")` |
| B2 | `importSQL` divide colunas com `split(",")` — quebra `DECIMAL(10,2)`, `ENUM('a','b')` | database-builder.js:1657 | Split ciente de parênteses |
| B3 | Chave localStorage `"database_designer"` como string repetida | database-builder.js:1735,1739 | Constante `STORAGE_KEY` (como o report já faz) |
| B4 | If-chain de 14 linhas idênticas p/ runtimes | export-html.js:671-684 | 1 linha genérica (exceções: `mask`, `passwordToggle`) |

---

## 7. Roadmap em fases (decisões já tomadas)

### ✅ Fase 1 — Correções + base (esta fase)
1. Bugs B1-B4 (tabela acima).
2. Atualizar `docs/GUIA_DESENVOLVEDOR.md` (o passo "adicione a linha na if-chain" deixa de existir).

### ✅ Fase 1-b — Fonte única de propriedades (concluída)
**Achado da auditoria:** nenhuma migração foi necessária — TODOS os blocos do `components.json` já
declaravam `properties`/`propertySets` (auditoria automática: 0 blocos caíam no fallback; os 9 sem
props são rows de layout e menu-divider/spacer, que não têm propriedades mesmo). O
`getFallbackPropertySchema` era **código morto** cujo único efeito real era mascarar edições no JSON
(o problema P2). Ação: função deletada (-345 linhas), `getComponentPropertySchema` agora retorna
`[]` quando o bloco não define nada (comportamento honesto), docs atualizadas
(`MAPA_BUILDER_JS.md`). `components.json` é a fonte única de propriedades.

### Fase 2 — JS legível na página exportada (decisão FINAL: **init direto na lib, inline, sem mágica**)
Decisão do dono (revisão jul/2026): **nada de PageConfig, merge ou framework próprio**. O export gera
código **plano e direto na biblioteca**, como um dev escreveria à mão:

```js
$(function () {
  if ($("#cliente").length) {
    new TomSelect("#cliente", {
      valueField: "id",
      labelField: "nome",
      searchField: "nome"
    });
  }
  if ($("#produtos").length) {
    $("#produtos").DataTable();
  }
});
```

- Os valores da config saem **resolvidos** no código (baked in), com um comentário por componente.
- **Sem retrocompatibilidade**: as páginas antigas serão recriadas (decisão do dono) — os runtimes de
  auto-discovery deixam de ser referenciados no export para os componentes migrados.
- Escopo da geração inline (componentes "de biblioteca", onde o dev customiza): DataTable, TomSelect,
  ApexCharts, Litepicker, FullCalendar, Dropzone, HugeRTE, Signature, IMask.

**Status (jul/2026): implementada ✅** — mecanismo + 8 geradores:
- Mecanismo: `registerInlineInits({ chaveInit: fn })` no `registry.js`; o gerador vive **no arquivo
  do renderer** (lógica do componente num lugar só); `collectExportAssets` prefere o inline e cai no
  runtime quando o gerador devolve `null`.
- Geradores: `tomselect` (null p/ criar-via-modal e página com FieldList), `datatable` (null p/
  seleção de linhas), `apexchart` (reusa `buildApexOptions`), `litepicker`, `fullcalendar` (eventos
  ajax±auth, dateClick/eventClick com {{date}}/{{id}}), `hugerte` (plugins/toolbar abertos p/ o dev
  enxugar), `dropzone` (autoDiscover off + store-sync no modo form), `signature` (limpar, retina,
  input oculto).
- Verificação: 18 casos de props gerados e validados com `node --check` (remote search, server-side
  POST+json+auth, donut+ajax, range+hora, calendário com cliques, dropzone nos 2 modos, etc.).
- Bônus: corrigido bug do `hugerte-runtime.js` que lia `localStorage["tablerTheme"]` (chave certa é
  `tabler-theme`) — agora runtime e gerador conferem o `data-bs-theme` do `<html>`.
- **Fica como está (runtime, por decisão de escopo):** mask/IMask (par lib+runtime por página,
  qualquer campo com `data-mask`), gantt, pdf, barcode/audio/speech e os utilitários
  (fieldlist, otp, clipboard, password-toggle, quantity-stepper, unsaved-guard, fullscreen,
  theme-toggle, ajax-fill, pwa, fab) + layouts.
- **Continuam como runtimes** (utilidades genéricas que não faz sentido gerar por página): fieldlist,
  otp, clipboard, password-toggle, quantity-stepper, unsaved-guard, fullscreen, theme-toggle,
  ajax-fill, pwa, fab, gantt, pdf, barcode-scanner, audio-recorder, speech-reader e os de layout
  (pill-layout, sidebar-collapse, menu-submenu).
- O canvas do builder não muda (continua com `initializePreviewXxx` / runtimes no preview).
- Modelo a seguir: `renderFormAjaxScript` (export-html.js), que já gera jQuery legível por página.

### ✅ Fase 3 — Dividir o builder.js (concluída jul/2026)
**Resultado: builder.js foi de 5.805 → ~3.400 linhas (-41%)**, com 5 módulos novos no molde de
`core/drag-drop.js` (IIFE + `window.TemplateBuilderXxx`; os com estado usam `create(context)`):

| Novo arquivo | Conteúdo | Linhas | Verificação |
|---|---|---|---|
| `data/pattern-templates.js` | PATTERN_TEMPLATES + AJAX_PRESETS (só dados) | ~135 | syntax + smoke |
| `core/parsers.js` | 14 parsers + normalizeKeyValueEntries + getSafe* (puros) | ~490 | **17 testes funcionais** |
| `core/history-storage.js` | commitHistory/undo/redo/saveToStorage/loadStoredPage | ~105 | **teste funcional** (commit/undo/redo/limite) |
| `core/preview-libs.js` | initializePreviewXxx + loadPreviewAsset (2 deps via ctx) | ~370 | syntax + smoke |
| `core/properties-panel.js` | renderProperties/renderPropertyField/field*/update*/apply* (17 deps via ctx, API de 14 fns) | ~1.185 | syntax + smoke + sem refs soltas |
| *(mantido no builder — decisão)* | **Normalização/migração**: 11 deps profundas na árvore; extrair = indireção sem ganho | — | — |

- builder.js **destrutura** os módulos no topo (call sites internos não mudaram) — padrão já usado
  com helpers.js.
- Ordem real no index.html: helpers → data/pattern-templates → parsers → history-storage →
  preview-libs → properties-panel → export-html → drag-drop → properties → registry → renderers →
  **builder.js por último**.
- Smoke test: os 6 módulos + builder.js carregam juntos num sandbox (vm) sem ReferenceError.
- Pendente (validação manual): abrir o builder no navegador, criar página com 5-6 componentes,
  editar propriedades (repeater/matrix/keyvalue), desfazer/refazer, salvar/recarregar, exportar.

### ✅ Fase 4 — Report/Database builders + documentação (concluída jul/2026)
- Comentário-guia **"GUIA DOS DIALETOS"** no topo do database-builder.js — os 6 pontos do
  arquivo que conhecem o dialeto (dbConfig, typeMappings, Column/Table/View.toSQL,
  triggerToSQL+exportSQL). `importSQL` já endurecido na Fase 1 (splitColumnsDef).
- `docs/DATABASE_BUILDER.md` criado (uso, arquitetura do arquivo, guia de dialetos, limites
  do import, persistência, checklist de teste).
- `fab-runtime.js` normalizado: a guarda de re-carga agora re-chama `init()` como o molde
  (`mask-runtime.js`). `pill-layout.js` mantido como está (runtime de layout, desvio
  documentado no RUNTIMES_DATA_ATTRIBUTES.md).
- `docs/RUNTIMES_DATA_ATTRIBUTES.md` criado — referência completa dos `data-*` de todos os
  runtimes (gatilho + atributos + convenções de id), com o aviso de que os 8 componentes de
  biblioteca usam init inline (config no script).

---

## 8. Verificação (por fase)

- **Fase 1:** `node --check` nos 3 JS editados; abrir builder → arrastar DataTable/TomSelect/Chart →
  exportar HTML → conferir que os mesmos `<script src>` de runtime saem como antes; no database
  builder, importar SQL com `DECIMAL(10,2)` e `ENUM('a','b')` e conferir colunas corretas.
- **Fase 1-b:** para cada componente migrado, abrir o painel de propriedades antes/depois e comparar
  campos (mesmos grupos, mesmos defaults).
- **Fase 2:** exportar página com DataTable + form AJAX; conferir bloco PageConfig comentado; alterar
  uma coluna no PageConfig e ver o efeito; abrir página exportada **antiga** e conferir que continua
  funcionando (sem PageConfig).
- **Fase 3:** após cada extração, abrir o builder, criar página com 5-6 componentes variados,
  editar propriedades, desfazer/refazer, salvar/recarregar, exportar HTML e comparar com export
  gerado antes da extração (diff textual deve ser vazio).
