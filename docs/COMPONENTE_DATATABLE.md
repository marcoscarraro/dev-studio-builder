# Componente DataTable — Guia de Configuracao

Guia completo do componente DataTable do builder: modos de dados (estatico, AJAX
client-side e **server-side**), formato esperado das respostas, autenticacao,
selecao de linhas por checkbox e o contrato que o backend precisa cumprir.

Arquivos envolvidos:

| Arquivo | Papel |
|---|---|
| `assets/data/components.json` (bloco `datatable`) | Propriedades do painel e defaults |
| `assets/js/renderers/table.js` | Gera o HTML da tabela + atributos `data-dt-*` |
| `public/components/js/datatable-runtime.js` | Le os `data-dt-*` e inicializa a lib na pagina exportada |
| `mock/datatable.json` | Dados de teste client-side (carrega tudo de uma vez) |
| `mock/datatable-server-side.php` | Endpoint de teste server-side (80 mil registros) |
| `docs/CHECKLIST_TESTES.md` secao 11c | Roteiro de testes |

> O canvas do builder mostra um preview; o comportamento real (AJAX, server-side,
> selecao) acontece na **pagina exportada**, que carrega o runtime.

---

## 1. Os tres modos de dados

### A) Linhas estaticas (sem URL)

Deixe "URL dos dados JSON" vazio e preencha as linhas no painel. A lib pagina,
busca e ordena localmente. Bom para listas pequenas e fixas.

### B) AJAX client-side (padrao)

Informe a "URL dos dados JSON" e deixe "Processamento server-side" DESMARCADO.
A pagina faz **uma** requisicao, recebe todos os registros e a lib pagina/busca/
ordena no navegador. Bom ate alguns milhares de registros.

Resposta esperada (com "JSON path dos registros" = `data`, o default):

```json
{ "data": [ ["Maria", "maria@email.com", "Ativo"], ... ] }
```

### C) Server-side (recomendado para muitos registros)

Marque "Processamento server-side". A cada acao do usuario (trocar pagina,
buscar, ordenar, mudar a quantidade) a lib faz UMA requisicao pedindo so a
pagina necessaria. O backend e quem filtra, ordena e pagina.

---

## 2. Propriedades do painel

### Grupo Dados

| Propriedade | O que faz | Observacao |
|---|---|---|
| URL dos dados JSON | Endpoint dos dados | Vazio = linhas estaticas |
| Processamento server-side | Liga o protocolo server-side | Exige backend no formato da secao 4 |
| Metodo AJAX | GET ou POST | GET: parametros na query string (`$_GET`); POST: no corpo |
| Formato do corpo POST | Form URL-encoded ou JSON | So vale para POST. Form = `$_POST`; JSON = ler `php://input` |
| JSON path dos registros | Onde estao as linhas na resposta | Default `data`. Aceita caminho com ponto (`resultado.itens`) e `.` para a raiz |

### Grupo Headers (autenticacao)

| Propriedade | O que faz |
|---|---|
| Autenticacao | Nenhuma / Bearer token (`Authorization: Bearer <token>`) / Chave em header |
| Token / chave | O valor enviado |
| Nome do header da chave | Default `X-API-Key` (so no modo "Chave em header") |
| Headers extras | Pares chave/valor enviados em toda requisicao |

> **Atencao**: o token fica VISIVEL no HTML exportado (atributo `data-dt-ajax-headers`).
> Use apenas chaves de baixo privilegio/somente leitura, ou troque por sessao/cookie
> no app final (no Laravel, a rota autenticada dispensa token no HTML).

### Colunas (repeater)

| Campo | O que faz |
|---|---|
| Titulo | Texto do `<th>` |
| **Campo data** | Nome do campo nos dados (`nome`, `email`...) quando a resposta traz OBJETOS; vazio quando traz ARRAYS |
| Classe CSS TH / TD, Largura | Estilo |

**Regra de ouro do "Campo data": preencha TODAS as colunas ou NENHUMA.**

- TODAS vazias → a resposta deve trazer **arrays**: cada linha e um array com os
  valores NA ORDEM das colunas (`["Maria", "maria@email.com", "Ativo"]`).
- TODAS preenchidas → a resposta deve trazer **objetos**: cada linha e um objeto
  com os campos (`{"nome": "Maria", "email": "...", "situacao": "..."}`).
  Campos extras no objeto sao ignorados na exibicao (mas continuam acessiveis —
  e assim que o ID da selecao funciona sem coluna visivel).
- Misturar quebra o mapeamento da lib ("Requested unknown parameter").

**Com server-side prefira objetos** (Campo data preenchido): a ordenacao chega ao
backend com o NOME do campo (`order` aponta para `columns[i][data] = "nome"`), e o
ID da selecao pode existir so nos dados, sem aparecer na tabela.

### Grupo Selecao

| Propriedade | O que faz | Default |
|---|---|---|
| Selecao de linhas (checkbox) | Liga a coluna de checkbox + "selecionar todos" | desligado |
| Campo do ID nos dados | Campo do identificador (objetos) ou indice (arrays/linhas estaticas) | `id` |
| Name dos inputs ocultos | Base do `name` dos campos enviados no submit | `selecionados` |

Comportamento completo na secao 5.

### Demais propriedades

Registros por pagina, Responsiva, Reordenar colunas (ColReorder), Botao de
colunas (mostrar/ocultar colunas), Busca, Seletor de quantidade, Texto vazio.

---

## 3. O que a lib ENVIA em server-side

A cada acao, a requisicao leva (query string no GET; corpo no POST):

| Parametro | Significado |
|---|---|
| `draw` | Contador da requisicao. **Devolver o mesmo valor (como inteiro)** — e o que casa pergunta/resposta e evita resposta fora de ordem |
| `start` | Indice do primeiro registro da pagina (0, 10, 20...) |
| `length` | Quantos registros devolver (o "registros por pagina") |
| `search[value]` | Texto da busca global |
| `order[0][column]` | Indice da coluna ordenada |
| `order[0][dir]` | `asc` ou `desc` |
| `columns[i][data]` | O "Campo data" de cada coluna (nome do campo, indice numerico, ou vazio na coluna do checkbox) |

Para descobrir o CAMPO de ordenacao: pegue `order[0][column]`, leia
`columns[<esse indice>][data]`. Com a selecao ligada, a coluna 0 e o checkbox
(`data` vazio e nao-ordenavel) — usando `columns[i][data]` o codigo funciona com
e sem selecao, sem ajuste de indice.

## 4. O que o backend deve RESPONDER

```json
{
  "draw": 3,
  "recordsTotal": 80000,
  "recordsFiltered": 8000,
  "data": [
    { "id": 51, "nome": "Maria Souza", "email": "maria.souza51@email.com", "situacao": "Ativo" }
  ]
}
```

| Campo | Significado |
|---|---|
| `draw` | Eco do `draw` recebido, **convertido para inteiro** (nunca devolver a string crua — protecao XSS) |
| `recordsTotal` | Total de registros SEM filtro |
| `recordsFiltered` | Total COM o filtro de busca aplicado (antes de paginar) — e o numero que aparece em "Mostrando X ate Y de Z" e no aviso "Selecionar todos os N" |
| `data` | So os registros da pagina (`start`/`length`), no formato combinado (objetos ou arrays) |

Referencia funcional completa: `mock/datatable-server-side.php` (aceita GET,
POST form e POST JSON; busca global; ordenacao com whitelist de campos).

### Snippets no painel de propriedades

O painel exibe um grupo **"Laravel"** com o controller sugerido, ja adaptado ao
modo ativo:

- **`_laravelSimpleRef`** (`showWhen serverSide = false`): retorno simples com
  `response()->json(['data' => ...])`. O placeholder `{{ajaxDataSrc}}` usa o
  JSON path configurado.
- **`_laravelServerRef`** (`showWhen serverSide = true`): controller completo com
  busca global, ordenacao com whitelist e paginacao.

Ambos atualizam em tempo real conforme `ajaxUrl` e `ajaxDataSrc` mudam. Use
o botao "Copiar" e cole direto no controller.

### Esqueleto Laravel (Eloquent) — carga simples

```php
// Route: GET /api/usuarios
public function index()
{
    return response()->json([
        'data' => Usuario::select('id', 'nome', 'email')
            ->orderBy('nome')
            ->get(),
    ]);
}
```

### Esqueleto Laravel (Eloquent) — server-side

```php
// Route: GET /api/usuarios  (ou POST, configuravel em "Metodo AJAX")
public function index(Request $request)
{
    $columns = ['id', 'nome', 'email', 'situacao'];
    $query   = Usuario::query();

    if ($busca = $request->input('search.value')) {
        $query->where(fn($q) =>
            $q->where('nome', 'like', '%' . $busca . '%')
              ->orWhere('email', 'like', '%' . $busca . '%')
              ->orWhere('situacao', 'like', '%' . $busca . '%'));
    }

    // Ordenacao com whitelist — nunca confiar no indice da coluna direto
    $total  = $query->count();
    $idx    = (int) $request->input('order.0.column', 0);
    $col    = $columns[$idx] ?? 'id';
    $dir    = $request->input('order.0.dir', 'asc') === 'desc' ? 'desc' : 'asc';

    $data = $query->orderBy($col, $dir)
        ->skip((int) $request->input('start', 0))
        ->take(min(500, max(1, (int) $request->input('length', 10))))
        ->get(['id', 'nome', 'email', 'situacao']);

    return response()->json([
        'draw'            => (int) $request->input('draw', 0),
        'recordsTotal'    => Usuario::count(),
        'recordsFiltered' => $total,
        'data'            => $data,
    ]);
}
```

Regras de seguranca que o exemplo ja aplica: `draw` como `(int)`, whitelist no
campo de ordenacao, `length` limitado, busca via binding parametrizado.

---

## 5. Selecao de linhas por checkbox

### Comportamento (padrao Gmail)

1. O checkbox do **cabecalho** marca/desmarca a **pagina visivel**. Ex.: filtrou
   "Maria" com 100 por pagina e vieram 98 — um clique marca os 98.
2. A selecao **sobrevive** a trocar de pagina, buscar e ordenar (os checkboxes
   sao re-marcados a cada redesenho).
3. Com a pagina inteira marcada e MAIS registros no filtro, um aviso azul
   oferece: *"Selecionar todos os N registros"*.
   - **Server-side**: entra no modo **"todos"** — uma flag + lista de excecoes
     (linhas desmarcadas depois). Nao trafega lista de IDs: pode ser 10 ou
     9.891.819 registros. **Mudar a BUSCA desfaz o modo "todos"** (o filtro faz
     parte do significado da selecao); trocar pagina/ordenar preserva.
   - **Client-side**: os dados estao no navegador, entao os IDs sao enumerados
     de verdade (continua modo "ids").
4. "Limpar selecao" no aviso desfaz tudo; desmarcar o cabecalho no modo "todos"
   tambem.

### De onde vem o ID

Propriedade "Campo do ID nos dados":

- Dados em **objetos** (Campo data preenchido): nome do campo, ex. `id` — nao
  precisa de coluna visivel, basta o campo existir em cada objeto da resposta.
- Dados em **arrays**: indice da posicao, ex. `0` — a posicao precisa existir no
  array (e com selecao ligada as posicoes exibidas sao mapeadas na ordem dos
  titulos; prefira objetos para nao ter o ID ocupando coluna visivel).
- Linhas estaticas: indice da celula (fallback: numero da linha).

### O que chega no submit (inputs ocultos)

Container `<div data-dt-selection-store hidden>` ao lado da tabela — dentro do
`<form>` que envolver o card, os campos vao juntos no submit (tradicional ou
Envio AJAX com FormData). Base = "Name dos inputs ocultos" (ex.: `selecionados`):

| Campo | Quando | Conteudo |
|---|---|---|
| `selecionados_modo` | sempre | `ids` ou `todos` |
| `selecionados[]` | modo `ids` | um input por ID marcado |
| `selecionados_excluidos[]` | modo `todos` | IDs desmarcados apos o "selecionar todos" |
| `selecionados_busca` | modo `todos` | texto da busca ativo quando o usuario selecionou tudo |
| `selecionados_total` | modo `todos` | total filtrado naquele momento (informativo — pode ter mudado ate o submit) |

### Como o backend processa cada modo

```php
if ($request->input('selecionados_modo') === 'todos') {
    // Refaz a MESMA consulta filtrada usada na listagem e exclui as excecoes.
    $query = Usuario::query();
    $busca = $request->input('selecionados_busca', '');
    if ($busca !== '') {
        $query->where(fn ($q) => $q->where('nome', 'like', "%{$busca}%")
            ->orWhere('email', 'like', "%{$busca}%")
            ->orWhere('situacao', 'like', "%{$busca}%"));
    }
    $query->whereNotIn('id', $request->input('selecionados_excluidos', []));
    $query->chunkById(1000, fn ($usuarios) => /* acao em lote */ null);
} else {
    $ids = $request->input('selecionados', []); // selecionados[]
    // acao sobre a lista de IDs
}
```

**Importante**: no modo "todos", a busca que o backend aplica precisa ter o
MESMO significado da busca da listagem (mesmas colunas no LIKE). Se a listagem e
a acao em lote usarem filtros diferentes, o usuario seleciona um conjunto e a
acao atinge outro.

### API JS (sem form)

```js
TemplateBuilderDataTableSelection.get('id-da-tabela');
// modo ids:   { mode: "ids", ids: ["51", "52"] }
// modo todos: { mode: "todos", except: ["60"], search: "maria", total: 8000 }
TemplateBuilderDataTableSelection.clear('id-da-tabela');
```

---

## 6. Armadilhas conhecidas

- **Campo data misturado** (umas colunas com nome, outras vazias): quebra o
  mapeamento. Tudo ou nada.
- **Cache do navegador**: depois de alterar `table.js`/`components.json`, suba o
  `?v=` no index.html e Ctrl+F5; a pagina exportada referencia o runtime SEM
  `?v=` — Ctrl+F5 nela tambem. (Ja causou "export sem os atributos novos".)
- **`recordsFiltered` errado** no backend: o paginador e o aviso "Selecionar
  todos os N" mostram numeros errados.
- **`draw` devolvido como string ou fixo**: respostas fora de ordem podem pintar
  a pagina errada; sempre ecoar como inteiro.
- **Ordenacao por indice fixo** no backend: use `columns[i][data]` (secao 3) —
  indices mudam quando a selecao por checkbox esta ligada.
- **Modo "todos" + filtro divergente** no backend: ver aviso da secao 5.
- **Token no HTML**: headers de autenticacao ficam visiveis no export (secao 2).
- **`length` sem limite** no backend: o usuario pode pedir paginas enormes;
  limite no servidor (o mock usa max 500).
