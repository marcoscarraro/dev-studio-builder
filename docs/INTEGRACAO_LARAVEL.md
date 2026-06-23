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
| Scanner QR / Codigo de Barras | `inputName` |
| Gravador de Audio | `inputName` |
| Player de Video | — |
| Video YouTube | — |

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

## Scanner QR / Codigo de Barras

O scanner e inteiramente client-side: a camera le o codigo e preenche um
`<input type="hidden">` com o valor lido. Nao ha requisicao AJAX — o codigo
chega ao backend apenas no submit do formulario que envolve o componente.

### Requisito: HTTPS

O acesso a camera (`getUserMedia`) so funciona em **contexto seguro** (HTTPS
ou `localhost`). Em producao Laravel, confirme que a URL da pagina e HTTPS.

### Como o valor chega ao controller

O campo hidden gerado tem `name` igual ao "Nome do campo (form)" configurado
no painel (default auto-gerado, ex.: `barcode-558fmqibcr89`). Esse valor e
enviado junto com todos os outros campos do formulario no submit:

```blade
{{-- No Blade, o HTML exportado vai dentro de um form normal --}}
<form method="POST" action="/processar">
    @csrf
    {{-- ... outros campos ... --}}
    {{-- HTML do scanner: div + input hidden gerado pelo builder --}}
    <input type="hidden" name="barcode-558fmqibcr89" data-barcode-result-input="...">

    <button type="submit">Enviar</button>
</form>
```

```php
// Route: POST /processar
public function processar(Request $request)
{
    $codigo = $request->input('barcode-558fmqibcr89');

    $produto = Produto::where('codigo_barras', $codigo)->firstOrFail();

    return redirect()->back()->with('produto', $produto);
}
```

> O snippet no grupo **"Laravel"** do painel ja usa `{{inputName}}` e atualiza
> o nome do campo em tempo real conforme voce altera "Nome do campo (form)".

### Modos de leitura

| Modo | Comportamento |
|---|---|
| `single` (padrao) | Camera para automaticamente apos a primeira leitura |
| `continuous` | Camera permanece ativa; cada leitura sobrescreve o campo hidden |

### Formatos suportados

| Opcao | Formatos ativos |
|---|---|
| Todos (padrao) | QR Code, EAN-13, EAN-8, UPC-A, UPC-E, Code-128, Code-39, Code-93, ITF, Codabar, DataMatrix, Aztec, PDF-417 |
| Apenas QR Code | QR Code |
| EAN-13 | EAN-13 |
| Code 128 | Code 128 |

Restringir o formato melhora a velocidade de deteccao quando voce sabe
exatamente o tipo de codigo que sera lido.

---

## Gravador de Audio

O gravador captura audio pelo microfone do dispositivo usando as APIs nativas
`getUserMedia` + `MediaRecorder` (sem biblioteca externa). Ao parar a gravacao,
o audio e convertido para **DataURL base64** e armazenado num
`<input type="hidden">` para ser enviado junto com o formulario.

### Requisito: HTTPS

O acesso ao microfone (`getUserMedia`) exige **contexto seguro** (HTTPS ou
`localhost`) — igual ao scanner de camera.

### Como o valor chega ao controller

O campo hidden gerado tem `name` igual ao "Nome do campo (form)" configurado no
painel (auto-gerado, ex.: `audio-558fmqibcr89`). O valor e uma string DataURL:
`data:audio/webm;base64,GkXfoZ...`.

```php
// Route: POST /processar
public function processar(Request $request)
{
    $audioBase64 = $request->input('audio-558fmqibcr89');

    // Decodifica e salva no disco
    if ($audioBase64 && str_starts_with($audioBase64, 'data:audio/')) {
        [$header, $data] = explode(',', $audioBase64, 2);
        $extension = str_contains($header, 'webm') ? 'webm'
                   : (str_contains($header, 'ogg') ? 'ogg' : 'mp4');

        $filename = 'audio-' . uniqid() . '.' . $extension;
        Storage::disk('public')->put('audios/' . $filename, base64_decode($data));
    }

    return redirect()->back()->with('success', 'Audio salvo.');
}
```

> Para gravacoes longas prefira enviar via AJAX separado — um DataURL de
> audio de 60s ocupa ~1-3 MB de base64, o que pode exceder `post_max_size`
> ou `max_input_size` do PHP. Ajuste em `php.ini` ou use upload direto.

### Formatos gerados

O runtime detecta automaticamente o melhor formato suportado pelo navegador:
`audio/webm;codecs=opus` (Chrome), `audio/ogg;codecs=opus` (Firefox) ou
`audio/mp4` (Safari/iOS). O arquivo salvo deve usar a extensao correta
(extraida do header da DataURL, como no exemplo acima).

---

## Player de Video

O componente gera um `<video controls>` nativo do HTML5. Nao ha runtime nem
biblioteca externa — o proprio navegador cuida da reproducao.

### URL do video no Laravel

Para videos armazenados no disco, use o helper `asset()` ou `Storage::url()`:

```blade
{{-- URL gerada dinamicamente (nao use o builder para este caso) --}}
<video controls src="{{ Storage::url('videos/meu-video.mp4') }}" style="width:100%">
  Seu navegador nao suporta o player de video HTML5.
</video>
```

No builder, insira a URL absoluta ou relativa diretamente na prop "URL do video".
Em producao Laravel isso costuma ser um link publico do `public/storage/` ou de
um CDN/bucket.

### CORS para videos em outros dominios

Se o video estiver em um dominio diferente (S3, CDN), o servidor de origem deve
enviar o header `Access-Control-Allow-Origin`. Sem ele, o navegador bloqueia a
requisicao quando `crossorigin` esta definido.

### Autoplay

A maioria dos navegadores modernos bloqueia autoplay com som. Para autoplay
funcionar, ative simultaneamente **Autoplay** e **Mudo (muted)** nas propriedades
do componente — e o unico modo garantido por politica dos navegadores.

---

## Video YouTube

O componente gera um `<iframe>` apontando para `youtube.com/embed/{id}` dentro
de um container responsivo (`ratio ratio-16x9` do Bootstrap). Nao ha runtime.

O campo "URL ou ID do video" aceita qualquer formato:

| Entrada | Exemplo |
|---|---|
| URL completa | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` |
| URL curta | `https://youtu.be/dQw4w9WgXcQ` |
| URL embed | `https://www.youtube.com/embed/dQw4w9WgXcQ` |
| URL Shorts | `https://www.youtube.com/shorts/dQw4w9WgXcQ` |
| ID direto | `dQw4w9WgXcQ` |

O renderer extrai o ID automaticamente de qualquer um dos formatos acima.

### CSP (Content-Security-Policy) no Laravel

Se o projeto usa o middleware `ContentSecurityPolicy` (ex.: pacote `spatie/laravel-csp`
ou header manual), o iframe do YouTube sera bloqueado por padrao. Adicione a
diretiva `frame-src`:

```php
// Exemplo com spatie/laravel-csp — no seu Policy customizado:
public function addDirectives(Directive $policy): void
{
    $policy->add(Directive::FRAME_SRC, 'https://www.youtube.com');
    // ... outras diretivas
}
```

Ou, se o CSP e definido como header HTTP manual:

```php
// app/Http/Middleware/SetSecurityHeaders.php
$response->headers->set(
    'Content-Security-Policy',
    "frame-src 'self' https://www.youtube.com; ..."
);
```

### Autoplay

Assim como no player nativo, autoplay do YouTube no iframe requer que o video
inicie mutado (`muted=1` e adicionado automaticamente ao parametro da URL
quando "Autoplay" esta ativo) — caso contrario o navegador bloqueia.

O atributo `allow="autoplay"` ja e incluido no iframe pelo renderer.

### Videos relacionados ao final

A prop "Videos relacionados ao final" controla o parametro `rel` do YouTube:
- Desligada (padrao): `rel=0` — o YouTube exibe apenas videos do mesmo canal ao fim
- Ligada: `rel=1` — exibe qualquer video relacionado

> Desde 2018 o YouTube ignora `rel=0` para mostrar videos de outros canais;
> com `rel=0` ele ainda pode exibir videos do mesmo canal, mas reduz a
> dispersao do usuario.

---

## Aviso de alteracoes nao salvas (Form)

Ligue **"Avisar alteracoes nao salvas"** no componente **Form**. Quando o usuario
altera qualquer campo e tenta sair sem salvar, aparece um **modal de confirmacao
totalmente editavel** (titulo, mensagem, cor da barra, e os dois botoes com texto,
classe CSS e icone proprios).

### Como funciona

- **Sujo (dirty)**: qualquer `input`/`change` dentro do `<form>` marca o formulario
  como alterado.
- **Sair por link**: ao clicar num `<a href>` que troca a pagina (ou num elemento com
  `data-unsaved-exit`), o runtime intercepta e mostra o modal customizado. "Sair sem
  salvar" navega; "Continuar editando" mantem.
- **Submeter (Salvar)** **nao** limpa o estado automaticamente (mais seguro para AJAX:
  se o envio falhar, os dados continuam protegidos). Um submit **nativo** (que recarrega
  a pagina) apenas libera a propria navegacao sem disparar o aviso. Para limpar o estado,
  dispare o evento `unsaved-guard:clean` no sucesso (ver abaixo).
- **Fechar aba / atualizar / voltar**: usa o `beforeunload` **nativo** do navegador
  (dialogo generico). Por seguranca os navegadores **nao** permitem texto/botoes custom
  nesse caso — por isso o modal editavel cobre a navegacao por links (o caso comum).

### Marcadores no HTML

- `data-unsaved-ignore` num `<a>` → aquele link sai **sem** avisar (ex.: "Cancelar").
- `data-unsaved-exit` (+ `data-href="..."`) num botao que nao seja link → tambem dispara o aviso.

### Formularios AJAX (sem navegar)

Se voce salva via AJAX (a pagina nao recarrega), limpe o estado "sujo" no sucesso:

```js
document.getElementById('meu-form')
  .dispatchEvent(new Event('unsaved-guard:clean'));
```

Assim o usuario pode sair normalmente apos um salvamento bem-sucedido.

---

## Checklist de producao

- [ ] Pagina servida via **HTTPS** (obrigatorio para acesso a camera e microfone)
- [ ] CSP permite `frame-src https://www.youtube.com` (se o projeto usa CSP)
- [ ] Blade tem `<meta name="csrf-token" content="{{ csrf_token() }}">` (Dropzone)
- [ ] Rotas AJAX protegidas com middleware de autenticacao
- [ ] Token no HTML (se necessario) e de baixo privilegio — apenas leitura
- [ ] `draw` devolvido como `(int)` no DataTable server-side
- [ ] Campos de ordenacao com whitelist no DataTable server-side
- [ ] Upload com `->validate(['arquivo' => 'file|max:10240'])` antes de `->store()`
- [ ] Layout do iframe do TomSelect+Criar NAO estende o layout principal
