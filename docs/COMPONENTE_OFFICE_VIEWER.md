# Componente "Documento Office" (visualizar Word/Excel/PPT)

Exibe arquivos do pacote Office (**doc, docx, xls, xlsx, ppt, pptx**) embutindo um
visualizador gratuito num `<iframe>`. Dois provedores:

| Provedor | URL base | Observacoes |
|---|---|---|
| **Microsoft Office Online** (padrao) | `https://view.officeapps.live.com/op/embed.aspx?src=` | Arquivo **publico** e **< ~10MB**. Melhor fidelidade. |
| **Google Docs Viewer** | `https://docs.google.com/viewer?embedded=true&url=` | Arquivo **publico**. Aceita tambem PDF. |

> **Importante:** os dois visualizadores sao apps web remotos — o servidor da Microsoft/Google
> baixa a URL informada. Por isso a URL precisa ser **publica** (sem autenticacao). Arquivos
> protegidos nao abrem nesse modo.

## Propriedades

- **Provedor** — Microsoft (padrao) ou Google.
- **URL publica do arquivo** — a URL do documento. Fixa (codificada no build) ou uma
  expressao Blade colada diretamente (ver abaixo).
- **Proporcao** — `Altura fixa` (usa a altura em px) ou responsiva (16:9, 4:3, quadrado).
- **Altura (px)** — usada quando a proporcao e "Altura fixa".
- **Titulo (acessibilidade)** — `title` do iframe.
- **Mostrar link de download** + **Texto do link** — link de fallback para baixar o arquivo
  (util caso o viewer falhe ou o arquivo seja privado).

## Integracao com Laravel (URL dinamica)

O componente codifica a URL **fixa** no momento da exportacao (`encodeURIComponent`). Para uma
URL **dinamica** (por registro), monte a URL no servidor — mesmo padrao usado em producao:

```php
// Controller / Model — arquivo publico, < 10MB.
$src = 'https://view.officeapps.live.com/op/embed.aspx?src=' . urlencode($linkParaDownload);
```

Na view, imprima `$src` no `src` do iframe exportado. Em Blade dinamico prefira
`rawurlencode()` no servidor:

```blade
<iframe src="https://view.officeapps.live.com/op/embed.aspx?src={{ rawurlencode($arquivo->url) }}"
        title="Documento" frameborder="0" style="width:100%;height:700px"></iframe>
```

> Se voce colar uma expressao `{{ ... }}` direto no campo **URL**, o componente **nao**
> codifica em JS (para nao quebrar o Blade) e emite o `src` como esta. Nesse caso, faca o
> `rawurlencode()` dentro do `{{ }}`.

## Exibir sem iframe? (alternativa offline)

Os visualizadores da Microsoft/Google **so funcionam via iframe** — nao ha como usa-los sem.
A unica forma de renderizar **sem iframe e offline** (sem servico de terceiros) e por
bibliotecas JS **especificas por formato**, renderizando num `<div>`:

- **Word (.docx):** [`docx-preview`](https://github.com/VolodymyrBaydalka/docxjs) ou
  [`mammoth.js`](https://github.com/mwilliamson/mammoth.js) (docx -> HTML).
- **Excel (.xlsx/.csv):** [`SheetJS`](https://sheetjs.com/) (planilha -> tabela HTML).
- **PowerPoint (.pptx):** `pptxjs` (fidelidade menor).

Tradeoffs: bundle maior, fidelidade imperfeita, uma lib por formato, e o arquivo precisa ser
buscado como `ArrayBuffer` (mesma origem / CORS). Por isso o componente usa o iframe online
por padrao; o modo offline pode ser adicionado depois se necessario.
