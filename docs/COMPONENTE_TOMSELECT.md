# Componentes TomSelect e Tags Input — Guia de Configuracao

Guia dos componentes **TomSelect** e **Tags input** do builder: os dois modos de
carga de dados (carga completa e **busca remota server-side**), o contrato que o
backend precisa cumprir, debounce, preload e limite de opcoes.

**Tags input e TomSelect compartilham tudo**: mesmo `kind` (`tomSelect`), mesmo
renderer e mesmo runtime. O que muda sao os defaults (Tags vem com multiplo +
"Permitir criar" ligados). Tudo neste guia vale para os dois.

Arquivos envolvidos:

| Arquivo | Papel |
|---|---|
| `assets/data/components.json` (blocos `tom-select` e `tags-input`) | Propriedades do painel e defaults |
| `assets/js/renderers/tom-select.js` | Gera o `<select>` + atributos `data-*` |
| `public/components/js/tomselect-runtime.js` | Le os `data-*` e inicializa a lib na pagina exportada |
| `assets/js/builder.js` (`initializePreviewTomSelects`) | Mesmo comportamento no preview do canvas |
| `mock/tom-select.json` / `mock/tags-input.json` | Dados de teste da carga completa |
| `mock/tom-select-search.php` / `mock/tags-search.php` | Endpoints de teste da busca remota |
| `docs/CHECKLIST_TESTES.md` secao 11d | Roteiro de testes |

---

## 1. Os dois modos de carga

### A) Carga completa (padrao — "Busca remota" DESLIGADA)

No carregamento da pagina o runtime faz **UMA** requisicao para a "URL AJAX",
recebe todas as opcoes e injeta na lib. Abrir o select e digitar **nao geram
novas requisicoes** — o filtro e local, em memoria.

Bom para listas pequenas/medias (categorias, status, UFs). O custo e fixo:
tudo trafega no load, mesmo que o usuario nunca abra o select.

### B) Busca remota server-side ("Busca remota" LIGADA)

Nada e carregado no load. Quando o usuario digita, o runtime espera a pausa na
digitacao (**debounce**) e consulta a URL com o termo:

```text
GET mock/tom-select-search.php?q=maria
```

O servidor devolve **so o que casa** com o termo (e limita a quantidade). Com
**preload** ligado, abrir o select dispara uma consulta com termo vazio
(`?q=`) para mostrar os primeiros resultados.

Bom para bases grandes (clientes, produtos, cidades do pais inteiro) — e o
mesmo principio do server-side do DataTable: trafega so o necessario.

---

## 2. Propriedades do painel

### Grupo Dados remotos

| Propriedade | O que faz | Observacao |
|---|---|---|
| URL AJAX / URL dos dados JSON | Endpoint das opcoes | Vazio = so opcoes fixas do componente |
| JSON path | Onde esta a lista na resposta | `categorias` (TomSelect) / `tags` (Tags); aceita caminho com ponto |
| **Busca remota (server-side)** | Liga o modo B | Default desligado |
| **Parametro da busca (query string)** | Nome do parametro do termo | Default `q`; preserva query string ja existente na URL (usa `&`) |
| **Debounce da digitacao (ms)** | Espera apos a ultima tecla antes de consultar | Default `300`. Uma requisicao por PAUSA de digitacao, nao por tecla |
| **Carregar ao abrir (preload)** | Consulta com termo vazio ao abrir o select | Default ligado. O backend deve tratar `q=` vazio devolvendo os primeiros N |
| Campo valor / Campo texto / Campo busca | Mapeiam `id`/`text` dos itens | Iguais nos dois modos |

> Os campos de parametro/debounce/preload so aparecem com "Busca remota" marcada
> (`showWhen`).

### Grupo Comportamento (parcial)

| Propriedade | O que faz |
|---|---|
| **Max opcoes** | Quantos itens o dropdown EXIBE por vez (default 100). NAO limita o que vem do servidor — na busca remota quem limita o trafego e o backend |
| Permitir criar | Usuario pode criar item novo digitando (padrao do Tags). Convive com a busca remota: o servidor responde o que existe; se nada servir, o usuario cria local |
| URL do formulario de criacao | Se preenchida, "criar" abre essa URL em nova aba em vez de criar local |

---

## 3. Snippets Laravel no painel

O painel exibe um grupo **"Laravel"** com o controller sugerido ja adaptado ao
modo ativo:

- **Carga completa** (`showWhen remoteSearch = false`): snippet `_laravelRef` —
  `response()->json(Item::select(...)->get())`.
- **Busca remota** (`showWhen remoteSearch = true`): snippet `_laravelRemoteRef` —
  inclui `$request->filled('q')` e `->limit(maxOptions)`.

Os placeholders `{{ajaxUrl}}`, `{{valueField}}`, `{{labelField}}`, `{{searchParam}}`
e `{{maxOptions}}` sao resolvidos em tempo real conforme as props mudam. Use o botao
"Copiar" e cole direto no controller.

O modo **"Botao criar ao lado (modal)"** tem o mesmo guia de iframe em
`docs/COMPONENTE_TOMSELECT_CREATE_LARAVEL.md`.

---

## 4. O contrato do backend (busca remota)

A requisicao e um GET simples com um unico parametro:

| Parametro | Significado |
|---|---|
| `q` (ou o nome configurado) | Termo digitado; **vazio no preload** (abrir o select) |

A resposta usa o **mesmo formato da carga completa** — uma lista de objetos com
os campos mapeados em "Campo valor"/"Campo texto", dentro do "JSON path":

```json
{ "categorias": [ { "id": "12", "text": "Eletronicos - Sao Paulo" } ] }
```

Regras que evitam dor de cabeca:

1. **Limite a quantidade no servidor** (os mocks usam 20). Sem limite, um termo
   curto pode devolver a base inteira — e ai o modo remoto perde o sentido.
2. **Trate `q` vazio** (preload): devolva os primeiros N registros, nao erro.
3. **Normalize acentos e caixa dos DOIS lados** (termo e dados): digitar `sao`
   deve achar "Sao Paulo"/"São Paulo". Os mocks fazem `iconv ASCII//TRANSLIT`
   + `strtolower` nos dois lados — no Laravel, use colunas com collation
   `*_ai_ci` (accent/case-insensitive) ou normalize na query.
4. **Devolva itens completos** (valor + texto), nunca so o texto — o valor e o
   que vai no submit do form.

### Esqueleto Laravel

```php
public function buscar(Request $request)
{
    $q = trim((string) $request->query('q', ''));

    $itens = Categoria::query()
        ->when($q !== '', fn ($query) => $query->where('nome', 'like', "%{$q}%"))
        ->orderBy('nome')
        ->limit(20)
        ->get()
        ->map(fn ($c) => ['id' => (string) $c->id, 'text' => $c->nome]);

    return response()->json(['categorias' => $itens]);
}
```

(Com MySQL e collation `utf8mb4_0900_ai_ci`, o `like` ja ignora acento e caixa.)

---

## 5. Armadilhas conhecidas

- **"Max opcoes" nao e limite de servidor**: ele so corta a EXIBICAO do
  dropdown. O limite de trafego e responsabilidade do backend (regra 1 acima).
- **Debounce muito baixo** (< 150ms) gera uma requisicao quase por tecla;
  muito alto (> 700ms) parece travado. 300ms e um bom padrao.
- **Resposta em formato diferente entre os modos**: o runtime le o mesmo
  "JSON path" e os mesmos campos nos dois modos — mantenha o shape identico
  (os mocks `*-search.php` espelham os `.json` de proposito).
- **Filtro local sobre o resultado remoto**: a lib ainda aplica o "Campo busca"
  localmente sobre o que chegou. Se o backend busca por um campo que nao esta
  no "Campo busca" (ex.: backend busca por email, mas o campo busca e so
  `text`), itens retornados podem ser escondidos. Alinhe os dois.
- **Itens ja selecionados permanecem** mesmo quando a busca atual nao os
  retorna — a lib guarda as opcoes escolhidas; e o comportamento esperado.
- **Cache do navegador**: alterou renderer/builder? Suba o `?v=` no index.html
  e Ctrl+F5 (a pagina exportada referencia o runtime sem `?v=` — Ctrl+F5 nela
  tambem).

---

## 6. Teste rapido

Roteiro completo: `docs/CHECKLIST_TESTES.md` secao 11d. Resumo:

1. TomSelect: ligar "Busca remota", URL `mock/tom-select-search.php` (JSON path
   `categorias` ja e default). Abrir o select (Network: `?q=` vazio), digitar
   "ele" (requisicao so apos a pausa), digitar "sao" (acha "Sao Paulo").
2. Tags input: URL `mock/tags-search.php` (JSON path `tags`). Digitar "script"
   (JavaScript/TypeScript), criar uma tag nova junto.
3. Desligar a busca remota: volta ao comportamento antigo (1 fetch no load).

---

## 7. Options em HTML (option rico)

Por padrao cada opcao mostra o **texto escapado** do "Campo texto" (`labelField`).
Para exibir uma opcao **rica** — ex.: nome do cliente + CPF + limite de credito —
marque **"Dados vem em HTML"** no grupo **HTML** das propriedades. Ao marcar, aparecem
dois campos **ja preenchidos com os nomes fixos** que o backend deve devolver:

- **`html_option`** — HTML mostrado em cada **opcao do dropdown**.
- **`html_selected`** — HTML do **item selecionado (chip)**.

### Propriedades (grupo "HTML")

| Propriedade | Efeito |
|---|---|
| **Dados vem em HTML (option rico)** | Liga o modo HTML e revela os 2 campos abaixo. Desligado = comportamento padrao (texto) |
| Campo HTML do option (`html_option`) | Nome do campo com o HTML do **dropdown**. Default fixo `html_option` |
| Campo HTML do item selecionado (`html_selected`) | Nome do campo com o HTML do **chip**. Default fixo `html_selected` |

> Os nomes ja vem preenchidos com `html_option` / `html_selected` — basta o backend
> devolver esses campos. (Voce pode trocar os nomes, mas o padrao e usa-los fixos.)

### Contrato da resposta

Cada item traz os campos planos (para valor, item e **busca**) **e** os campos HTML
(so para exibicao):

```json
[
  {
    "id": 12,
    "text": "Maria Silva",
    "cpf": "123.456.789-00",
    "html_option": "<div><strong>Maria Silva</strong><div class=\"text-secondary small\">CPF 123.456.789-00 · Limite R$ 5.000,00</div></div>",
    "html_selected": "<strong>Maria Silva</strong> <span class=\"text-secondary small\">(123.456.789-00)</span>"
  }
]
```

Configuracao no builder: **Dados vem em HTML** marcado e **Campo busca** = `text,cpf`
(o "Campo busca" aceita varios campos separados por virgula). Ha um mock pronto em
`mock/tom-select-html.json` (JSON path `clientes`).

### Controller Laravel

```php
public function index()
{
    return response()->json(
        Cliente::query()->limit(50)->get()->map(fn ($c) => [
            'id'            => $c->id,
            'text'          => $c->nome,   // item/chip (fallback) + busca
            'cpf'           => $c->cpf,    // opcional, para busca
            'html_option'   => view('partials.cliente_option', ['c' => $c])->render(),
            'html_selected' => '<strong>'.e($c->nome).'</strong>',
        ])
    );
}
```

`resources/views/partials/cliente_option.blade.php`:

```blade
<div>
  <strong>{{ $c->nome }}</strong>
  <div class="text-secondary small">
    CPF {{ $c->cpf }} · Limite {{ 'R$ '.number_format($c->limite, 2, ',', '.') }}
  </div>
</div>
```

### Particularidades

- **A busca usa os campos planos** (`text,cpf`), **nunca** o HTML — voce nao quer
  casar com nomes de tags. Liste no "Campo busca" todos os campos pesquisaveis.
- **Item selecionado (chip)**: com "Dados vem em HTML" marcado, o chip usa o campo
  `html_selected`. Devolva nele um HTML **compacto** (so o nome, por ex.); o `html_option`
  costuma ser grande demais para a chip. Se o backend nao mandar `html_selected`, a chip
  cai no "Campo texto" (fallback).
- **Seguranca**: o HTML e inserido **sem escapar** (e o objetivo). Como vem do seu
  backend, e confiavel; mas **escape no servidor** qualquer dado de usuario embutido
  (use `{{ }}` do Blade nas partials, como no exemplo) para evitar XSS.
- **Fallback**: opcoes sem o campo HTML (ex.: criadas pelo "Permitir criar") caem no
  texto escapado automaticamente — nao quebram.
- Vale para **TomSelect** e **Tags input**, inclusive com o modo **"Botao criar ao
  lado (modal)"** ligado (a sentinela "Criar novo" continua intacta).
