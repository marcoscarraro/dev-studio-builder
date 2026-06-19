# Integracao com Laravel 13

Guia de referencia para conectar paginas exportadas pelo **DEV STUDIO BUILDER**
a um projeto Laravel 13.

O builder gera HTML estatico com atributos `data-*`. Em projetos Laravel o
desenvolvedor coloca esse HTML dentro de Blade views (ou usa as views como
ponto de partida) e conecta os componentes dinamicos a rotas e controllers.

---

## Snippets no painel de propriedades

Cada componente que consome dados via AJAX exibe um grupo **"Laravel"** no painel
de propriedades com um textarea copiavel contendo o controller sugerido — ja com
os nomes de prop, URL e campos que voce configurou.

Alterar "URL AJAX", "Campo valor" etc. atualiza o snippet em tempo real.

| Componente | Props dinamicas no snippet |
|---|---|
| TomSelect / Tags | `ajaxUrl`, `valueField`, `labelField`, `searchParam`, `maxOptions` |
| TomSelect+Criar | idem + `responseValueField`, `responseLabelField` |
| DataTable (simples) | `ajaxUrl`, `ajaxDataSrc` |
| DataTable (server-side) | `ajaxUrl` |
| FullCalendar | `ajaxUrl` |
| Graficos (XY / Pizza) | `ajaxUrl` |
| Dropzone | `action`, `name` |
| Input Button Group | — (exemplo generico) |

---

## TomSelect e Tags Input

### Carga completa (Busca remota DESLIGADA)

O runtime faz **uma** requisicao GET ao carregar a pagina. O backend retorna
todas as opcoes.

```php
// Route: GET /api/categorias
public function index()
{
    return response()->json(
        Categoria::select('id', 'nome as text')
            ->orderBy('nome')
            ->get()
    );
}
```

Resposta esperada (array de objetos com `valueField` e `labelField`):

```json
[{ "id": 1, "text": "Eletronicos" }, { "id": 2, "text": "Roupas" }]
```

Quando o "JSON path" esta preenchido (ex.: `categorias`), envolva em objeto:

```json
{ "categorias": [{ "id": 1, "text": "Eletronicos" }] }
```

### Busca remota (Busca remota LIGADA)

O runtime consulta o endpoint a cada pausa na digitacao, passando o termo no
parametro configurado (default `q`).

```php
// Route: GET /api/categorias?q=termo
public function index(Request $request)
{
    $query = Categoria::select('id', 'nome as text');

    if ($request->filled('q')) {
        $query->where('nome', 'like',
            '%' . $request->input('q') . '%');
    }

    return response()->json($query->limit(50)->get());
}
```

> Com MySQL e collation `utf8mb4_0900_ai_ci`, o `like` ja ignora acentos e
> caixa — devo `sao` acha "Sao Paulo"/"Sao Paulo".

---

## TomSelect + Criar Novo

Mesmo contrato do TomSelect normal para o endpoint de listagem, mais as rotas
do formulario no iframe. Guia completo: `docs/COMPONENTE_TOMSELECT_CREATE_LARAVEL.md`.

Resumo das rotas:

```php
Route::get( '/categorias/modal',         [CategoriaController::class, 'createModal']);
Route::post('/categorias/modal',         [CategoriaController::class, 'storeModal']);
Route::get( '/categorias/modal-success', [CategoriaController::class, 'modalSuccess']);
Route::get( '/api/categorias',           [CategoriaController::class, 'index']);
```

O layout do iframe NAO estende o layout principal (sem navbar/sidebar):

```blade
{{-- resources/views/layouts/iframe.blade.php --}}
<!doctype html><html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  @vite(['resources/css/app.css'])
</head>
<body class="p-4">
  @yield('content')
  @stack('scripts')
</body>
</html>
```

---

## DataTable

### Carga simples (server-side DESLIGADO)

Uma requisicao GET, todos os registros de uma vez.

```php
// Route: GET /api/usuarios
// O DataTable espera o JSON path "data" (configuravel em "JSON path dos registros")
public function index()
{
    return response()->json([
        'data' => Usuario::select('id', 'nome', 'email')
            ->orderBy('nome')
            ->get(),
    ]);
}
```

Se preferir a raiz como array (JSON path = `.`):

```php
return response()->json(
    Usuario::select('id', 'nome', 'email')->orderBy('nome')->get()
);
```

### Server-side (server-side LIGADO)

A cada acao do usuario (paginar, buscar, ordenar) o DataTable faz uma requisicao
enviando `draw`, `start`, `length`, `search[value]`, `order[0][column]`,
`order[0][dir]` e `columns[i][data]`.

```php
// Route: GET /api/usuarios  (ou POST, configuravel)
public function index(Request $request)
{
    $columns = ['id', 'nome', 'email'];
    $query   = Usuario::query();

    if ($search = $request->input('search.value')) {
        $query->where(fn($q) =>
            $q->where('nome', 'like', '%' . $search . '%')
              ->orWhere('email', 'like', '%' . $search . '%'));
    }

    $total = $query->count();
    $col   = $columns[$request->input('order.0.column', 0)] ?? 'id';
    $dir   = $request->input('order.0.dir', 'asc') === 'desc' ? 'desc' : 'asc';

    $data = $query->orderBy($col, $dir)
        ->skip((int) $request->input('start', 0))
        ->take((int) $request->input('length', 10))
        ->get();

    return response()->json([
        'draw'            => (int) $request->input('draw'),
        'recordsTotal'    => $total,
        'recordsFiltered' => $total,
        'data'            => $data,
    ]);
}
```

Boas praticas:
- `draw` sempre como `(int)` — protecao XSS.
- `$col` com whitelist (`$columns[]`) — nunca confiar na coluna direto da request.
- `recordsFiltered` deve refletir a busca ativa (neste exemplo simplificado e igual ao total).

Referencia completa com busca real filtrada: `docs/COMPONENTE_DATATABLE.md` secao 4.

---

## FullCalendar

### Formato da resposta

O FullCalendar v6 espera um array de objetos de evento:

```php
// Route: GET /api/eventos
public function index()
{
    return response()->json(
        Evento::all()->map(fn($e) => [
            'id'              => $e->id,
            'title'           => $e->titulo,
            'start'           => $e->inicio->toIso8601String(),
            'end'             => $e->fim?->toIso8601String(),
            'allDay'          => $e->dia_inteiro,
            'backgroundColor' => $e->cor ?? '#206bc4',
            'url'             => route('eventos.show', $e->id),
        ])
    );
}
```

Campos obrigatorios: `title` e `start`. Os demais sao opcionais.

### Autenticacao (Bearer token / Chave em header)

Configure as props "Autenticacao", "Token / chave" e "Nome do header da chave"
no painel. O runtime usa `fetch()` com o header montado:

```text
Authorization: Bearer <token>     (modo Bearer)
X-API-Key: <chave>                (modo Chave em header)
```

> O token fica visivel no HTML exportado (atributo `data-fc-auth-*`). Em apps
> Laravel com autenticacao por sessao/cookie, deixe "Autenticacao = Nenhuma" e
> proteja a rota com middleware (`auth`, `auth:sanctum`, etc.) — o cookie e
> enviado automaticamente.

---

## Graficos ApexCharts

### Graficos de linha / area / colunas / distribuido

```php
// Route: GET /api/grafico
public function index()
{
    return response()->json([
        'series'     => [
            ['name' => 'Vendas', 'data' => [10, 20, 30, 40]],
        ],
        'categories' => ['Jan', 'Fev', 'Mar', 'Abr'],
    ]);
}
```

Multiplas series:

```php
'series' => [
    ['name' => 'Receita', 'data' => Venda::pluck('receita')->toArray()],
    ['name' => 'Custo',   'data' => Venda::pluck('custo')->toArray()],
],
'categories' => Venda::pluck('mes')->toArray(),
```

### Graficos de pizza / rosca

```php
// Route: GET /api/grafico
public function index()
{
    return response()->json([
        'values' => [30, 45, 25],
        'labels' => ['Categoria A', 'Categoria B', 'Categoria C'],
    ]);
}
```

Ou com Eloquent:

```php
return response()->json([
    'values' => Categoria::pluck('total')->toArray(),
    'labels' => Categoria::pluck('nome')->toArray(),
]);
```

### Autenticacao

Mesma configuracao do FullCalendar. O runtime usa `fetch()` com os headers
montados dos atributos `data-chart-auth-*` gerados pelo renderer.

---

## Dropzone

### CSRF automatico

O runtime le `<meta name="csrf-token">` e injeta o header `X-CSRF-TOKEN`
automaticamente em uploads diretos (`Envio automatico` ligado). A Blade deve
ter o meta tag:

```blade
{{-- No <head> do layout --}}
<meta name="csrf-token" content="{{ csrf_token() }}">
```

Em submits de formulario tradicionais (Dropzone acumulando arquivos num input
oculto), o `@csrf` directive do Blade resolve o token no campo `_token` — sem
mudanca necessaria.

### Controller de upload

```php
// Route: POST /upload
public function store(Request $request)
{
    $request->validate([
        'arquivo' => 'required|file|max:10240', // 10 MB em KB
    ]);

    $path = $request->file('arquivo')
        ->store('uploads', 'public');

    return response()->json(['path' => $path], 201);
}
```

O nome do campo (`'arquivo'`) deve ser o mesmo configurado em "Nome do campo"
nas propriedades do componente. O runtime usa `autoProcessQueue: true` neste
modo; em modo de formulario, os arquivos vao junto no submit via input oculto.

---

## Input Button Group (AJAX Fill)

O botao faz GET para a "URL AJAX" com `{{value}}` substituido pelo valor do
campo de texto. O backend retorna um objeto JSON; as chaves dos "Mapeamentos JSON"
preenchem os campos de destino.

```php
// URL template: /api/enderecos/{{value}}
// Route: GET /api/enderecos/{cep}
public function show(string $cep)
{
    $endereco = Http::get("https://viacep.com.br/ws/{$cep}/json")->json();

    return response()->json([
        // Retorne os mesmos campos dos "Mapeamentos JSON":
        'logradouro' => $endereco['logradouro'] ?? '',
        'bairro'     => $endereco['bairro'] ?? '',
        'localidade' => $endereco['localidade'] ?? '',
        'uf'         => $endereco['uf'] ?? '',
    ]);
}
```

---

## Autenticacao por sessao (recomendado em apps Laravel)

Para APIs internas, **nao use token no HTML** — use autenticacao por sessao.
O cookie de sessao e enviado automaticamente pelo navegador em todas as
requisicoes `fetch()` para o mesmo dominio.

1. Proteja a rota com middleware:

```php
Route::middleware('auth')->get('/api/eventos', [EventoController::class, 'index']);
```

2. No painel, deixe "Autenticacao = Nenhuma" (nenhum token sera emitido no HTML).

3. O usuario precisa estar autenticado para a pagina funcionar (o browser envia
   o cookie automaticamente).

Esta abordagem e mais segura porque o token nao fica exposto no HTML exportado.

---

## CORS em APIs proprias

Requisicoes `fetch()` para o mesmo dominio nao precisam de CORS. Se a API esta
em outro dominio (ex.: `api.empresa.com` vs `app.empresa.com`), configure o
CORS no Laravel:

```php
// config/cors.php
'allowed_origins' => ['https://app.empresa.com'],
'allowed_methods' => ['GET', 'POST'],
'allowed_headers' => ['Content-Type', 'X-CSRF-TOKEN', 'Authorization', 'X-API-Key'],
```

---

## Checklist de producao

- [ ] Blade tem `<meta name="csrf-token" content="{{ csrf_token() }}">` (Dropzone)
- [ ] Rotas AJAX protegidas com middleware de autenticacao
- [ ] Token no HTML (se necessario) e de baixo privilegio — apenas leitura
- [ ] `draw` devolvido como `(int)` no DataTable server-side
- [ ] Campos de ordenacao com whitelist no DataTable server-side
- [ ] Upload com `->validate(['arquivo' => 'file|max:10240'])` antes de `->store()`
- [ ] Layout do iframe do TomSelect+Criar NAO estende o layout principal
