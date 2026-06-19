# TomSelect + Criar — Integracao com Laravel

Guia completo para usar o componente **TomSelect + Criar** em projetos Laravel.
O componente exibe um select com um botao "+" que abre um modal com um formulario
em iframe. Ao salvar, o novo registro e automaticamente selecionado no campo.

---

## Como funciona

```
Usuario clica no botao "+"
  └─ Modal abre com iframe apontando para a URL configurada
       └─ Formulario e exibido (sem menus, so o form)
            └─ Usuario preenche e salva
                 └─ Laravel redireciona para pagina de sucesso
                      └─ postMessage dispara para o pai
                           └─ Modal fecha + item selecionado no TomSelect
```

O runtime usa `window.postMessage` para comunicacao entre o iframe e a pagina pai.
O formulario no iframe **nao precisa saber nada** sobre o componente — so precisa
chamar o `postMessage` com o ID e texto do registro criado.

---

## Configuracao no Builder

| Propriedade | Valor de exemplo |
|---|---|
| URL AJAX | `/api/categorias` |
| URL do formulario (iframe) | `/categorias/modal` |
| Titulo do modal | `Nova Categoria` |
| Campo ID na resposta | `id` |
| Campo texto na resposta | `nome` |

O campo **"Snippet para o iframe"** no painel de propriedades mostra o codigo exato
que o formulario precisa chamar apos salvar, ja com os nomes dos campos configurados.

---

## Estrutura Laravel

### Arquivos a criar

```
resources/views/
  layouts/
    iframe.blade.php          <- layout minimo para iframes
    iframe-success.blade.php  <- pagina de sucesso (dispara postMessage)
  categorias/
    create-modal.blade.php    <- formulario da categoria
app/Http/Controllers/
  CategoriaController.php
routes/web.php
```

---

## 1. Layout para iframe

`resources/views/layouts/iframe.blade.php`

```blade
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  @vite(['resources/css/app.css'])
  <style>
    body { background: var(--bs-body-bg, #fff); }
  </style>
</head>
<body class="p-4">
  @yield('content')
  @stack('scripts')
</body>
</html>
```

> **Importante:** este layout nao estende o layout principal da aplicacao.
> Nao tem navbar, sidebar nem footer — so o conteudo do formulario.

---

## 2. Layout de sucesso

`resources/views/layouts/iframe-success.blade.php`

```blade
<!doctype html>
<html><head><meta charset="utf-8"></head>
<body>
<script>
  window.parent.postMessage({
    dsb_action : 'select_created',
    id         : '{{ $recordId }}',
    text       : '{{ addslashes($recordText) }}'
  }, '*');
</script>
</body>
</html>
```

Este arquivo e minimo por intencao: sua unica funcao e fechar o modal e
selecionar o item. O runtime destroi o iframe logo apos receber a mensagem.

---

## 3. Formulario da categoria

`resources/views/categorias/create-modal.blade.php`

```blade
@extends('layouts.iframe')

@section('content')

  <h3 class="mb-4">Nova Categoria</h3>

  <form method="POST" action="{{ route('categorias.store-modal') }}">
    @csrf

    <div class="mb-3">
      <label for="nome" class="form-label">Nome <span class="text-danger">*</span></label>
      <input
        id="nome"
        name="nome"
        type="text"
        class="form-control @error('nome') is-invalid @enderror"
        value="{{ old('nome') }}"
        autofocus
      >
      @error('nome')
        <div class="invalid-feedback">{{ $message }}</div>
      @enderror
    </div>

    <div class="mb-3">
      <label for="descricao" class="form-label">Descricao</label>
      <textarea id="descricao" name="descricao" class="form-control" rows="3">{{ old('descricao') }}</textarea>
    </div>

    <div class="d-flex gap-2 justify-content-end border-top pt-3 mt-4">
      <button
        type="button"
        class="btn btn-secondary"
        onclick="window.parent.postMessage({ dsb_action: 'modal_cancel' }, '*')"
      >
        Cancelar
      </button>
      <button type="submit" class="btn btn-primary">Salvar</button>
    </div>

  </form>

@endsection
```

> Se houver erros de validacao, o Laravel redireciona de volta para o proprio
> formulario dentro do iframe — o usuario corrige sem sair do modal.

---

## 4. Controller

`app/Http/Controllers/CategoriaController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use Illuminate\Http\Request;

class CategoriaController extends Controller
{
    /**
     * Exibe o formulario de criacao dentro do modal (sem layout principal).
     */
    public function createModal()
    {
        return view('categorias.create-modal');
    }

    /**
     * Salva e redireciona para a pagina de sucesso que dispara o postMessage.
     */
    public function storeModal(Request $request)
    {
        $validated = $request->validate([
            'nome'      => 'required|string|max:255',
            'descricao' => 'nullable|string|max:1000',
        ]);

        $categoria = Categoria::create($validated);

        return redirect()->route('categorias.modal-success', [
            'id'   => $categoria->id,
            'text' => $categoria->nome,
        ]);
    }

    /**
     * Pagina minima que dispara o postMessage e e destruida pelo runtime.
     */
    public function modalSuccess(Request $request)
    {
        return view('layouts.iframe-success', [
            'recordId'   => $request->integer('id'),
            'recordText' => $request->string('text'),
        ]);
    }

    /**
     * Endpoint JSON para popular o TomSelect (carga completa ou busca remota).
     */
    public function index(Request $request)
    {
        $query = Categoria::orderBy('nome');

        // Busca remota (quando "Busca remota" esta ativa no builder)
        if ($request->filled('q')) {
            $query->where('nome', 'like', '%' . $request->q . '%');
        }

        return response()->json(
            $query->select('id', 'nome as text')->get()
        );
    }
}
```

---

## 5. Rotas

`routes/web.php`

```php
// Formulario no modal
Route::get( '/categorias/modal',         [CategoriaController::class, 'createModal'])
     ->name('categorias.create-modal');

Route::post('/categorias/modal',         [CategoriaController::class, 'storeModal'])
     ->name('categorias.store-modal');

Route::get( '/categorias/modal-success', [CategoriaController::class, 'modalSuccess'])
     ->name('categorias.modal-success');

// Endpoint JSON para o TomSelect
Route::get('/api/categorias', [CategoriaController::class, 'index']);
```

> **Dica de seguranca:** proteja as rotas de modal com o mesmo middleware das
> outras rotas autenticadas da aplicacao (`auth`, `auth:sanctum`, etc.).
>
> ```php
> Route::middleware('auth')->group(function () {
>     Route::get( '/categorias/modal', ...);
>     Route::post('/categorias/modal', ...);
> });
> ```

---

## Variacao: formulario com AJAX (sem redirect)

Se preferir enviar o formulario via `fetch` em vez de submit tradicional,
chame o `postMessage` diretamente no callback de sucesso:

```blade
@extends('layouts.iframe')

@section('content')
  <form id="form-create">
    @csrf
    <div class="mb-3">
      <label class="form-label">Nome</label>
      <input name="nome" type="text" class="form-control" autofocus>
      <div class="invalid-feedback"></div>
    </div>
    <div class="d-flex gap-2 justify-content-end mt-3">
      <button type="submit" class="btn btn-primary">Salvar</button>
    </div>
  </form>
@endsection

@push('scripts')
<script>
document.getElementById('form-create').addEventListener('submit', async function (e) {
  e.preventDefault();
  const res = await fetch('/categorias/modal', {
    method : 'POST',
    headers: { 'X-CSRF-TOKEN': document.querySelector('[name=_token]').value },
    body   : new FormData(this),
  });
  const json = await res.json();
  if (!res.ok) {
    // Exibe erros de validacao
    Object.entries(json.errors || {}).forEach(([field, msgs]) => {
      const input = document.querySelector(`[name="${field}"]`);
      if (input) {
        input.classList.add('is-invalid');
        input.nextElementSibling.textContent = msgs[0];
      }
    });
    return;
  }
  // Sucesso: dispara postMessage diretamente
  window.parent.postMessage({
    dsb_action : 'select_created',
    id         : String(json.id),
    text       : json.nome,
  }, '*');
});
</script>
@endpush
```

Controller retorna JSON:

```php
public function storeModal(Request $request)
{
    $validated = $request->validate([
        'nome' => 'required|string|max:255',
    ]);

    $categoria = Categoria::create($validated);

    return response()->json($categoria, 201);
}
```

---

## Variacao: Livewire

Use um componente Livewire com o layout iframe. O `postMessage` e disparado
com `$dispatch` apos o save:

```php
// app/Livewire/CategoriaCreateModal.php
class CategoriaCreateModal extends Component
{
    public string $nome = '';

    public function save()
    {
        $this->validate(['nome' => 'required|string|max:255']);
        $categoria = Categoria::create(['nome' => $this->nome]);

        $this->dispatch('categoria-criada',
            id  : $categoria->id,
            text: $categoria->nome,
        );
    }

    public function render()
    {
        return view('livewire.categoria-create-modal')
            ->layout('layouts.iframe');
    }
}
```

```blade
{{-- resources/views/livewire/categoria-create-modal.blade.php --}}
<div>
  <div class="mb-3">
    <label class="form-label">Nome</label>
    <input type="text" wire:model="nome" class="form-control">
    @error('nome') <div class="text-danger small">{{ $message }}</div> @enderror
  </div>
  <button wire:click="save" class="btn btn-primary">Salvar</button>
</div>

@script
<script>
  $wire.on('categoria-criada', ({ id, text }) => {
    window.parent.postMessage({
      dsb_action: 'select_created',
      id  : String(id),
      text: text,
    }, '*');
  });
</script>
@endscript
```

---

## Contrato postMessage (referencia rapida)

O iframe **deve** enviar esta mensagem apos salvar com sucesso:

```js
window.parent.postMessage({
  dsb_action: 'select_created',   // obrigatorio — identifica a acao
  id        : '123',              // valor que sera gravado no campo (campo ID na resposta)
  text      : 'Nome do item',     // texto exibido no select (campo texto na resposta)
}, '*');
```

Os nomes das chaves (`id` e `text`) seguem o que foi configurado nas
propriedades **"Campo ID na resposta"** e **"Campo texto na resposta"** do
componente no builder. Se voce configurou `responseValueField: "codigo"`,
a mensagem deve usar `codigo` como chave.

O builder exibe o snippet exato no painel de propriedades — grupo **"Criar novo"**,
campo **"Snippet para o iframe"** — com os nomes dos campos ja preenchidos.

---

## Resumo do fluxo de dados

```
Builder (propriedades)
  ├─ URL AJAX          → endpoint JSON que lista os registros existentes
  ├─ URL do formulario → rota GET que retorna o form (layout iframe)
  ├─ responseValueField → chave do ID no postMessage  (default: "id")
  └─ responseLabelField → chave do texto no postMessage (default: "text")

Runtime (pagina exportada)
  ├─ Inicializa TomSelect e carrega opcoes via URL AJAX
  ├─ Exibe botao "+" que abre o modal com o iframe
  ├─ Escuta postMessage com dsb_action === 'select_created'
  └─ Adiciona o novo item ao select e o seleciona automaticamente
```
