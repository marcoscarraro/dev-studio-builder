# Componente "PDF" (PDF.js inline)

Exibe PDFs **renderizando as páginas em `<canvas>` com PDF.js** — sem `<iframe>`. Funciona
de forma consistente em **Android, iOS e desktop** (o embed nativo de PDF é não confiável no
mobile: o Android costuma baixar o arquivo e o iOS mostra só a 1ª página).

As páginas são desenhadas em modo **contínuo** (empilhadas). O componente **cresce até a
altura total do documento**, então quem rola é a **página** — não há scroll interno de iframe.

## Propriedades

- **URL do PDF** — URL do arquivo. Precisa ser acessível por `fetch` (**mesma origem** ou
  **CORS** habilitado), pois o PDF.js baixa o arquivo no navegador. Pode ser fixa ou uma
  expressão Blade colada diretamente (ver abaixo).
- **Largura máxima (px)** — largura máxima do documento (centralizado). Responsivo: abaixo
  disso, acompanha a largura do container.
- **Espaço entre páginas (px)** — margem entre as páginas.
- **Mostrar só a 1ª página** — renderiza apenas a primeira página (ex.: prévia/thumbnail).
- **Mostrar link de download** + **Texto do link** — link de fallback para baixar o arquivo.

## Como funciona

1. O componente exporta um `<div data-pdf-viewer data-pdf-url="..." ...>`.
2. Na página exportada são incluídos automaticamente:
   - a lib `public/components/libs/pdfjs/pdf.min.js` (PDF.js v3, UMD);
   - o runtime `public/components/js/pdf-runtime.js`.
3. O runtime busca o PDF, renderiza cada página num `<canvas>` (usando `devicePixelRatio`
   para nitidez) e re-renderiza ao redimensionar a janela.

> **No builder (canvas):** mostra-se um *placeholder*. O render real do PDF aparece no
> **Preview** e no **HTML exportado** (onde a lib e o runtime são incluídos).

## Deploy (Laravel)

**Copie a pasta `public/components/libs/pdfjs/`** (com `pdf.min.js` e `pdf.worker.min.js`)
para o `public/` do seu projeto Laravel — mesma exigência das outras libs (Tabler, TomSelect…).

O **web worker** do PDF.js (`pdf.worker.min.js`) **não** é carregado por `<script src>` —
o `pdf.min.js` o instancia internamente via `new Worker(...)`. O runtime descobre o caminho
**automaticamente**, derivando do próprio `<script src=".../pdfjs/pdf.min.js">` (a lib é
incluída pelo padrão do projeto): o worker é buscado ao lado da lib. Basta manter os dois
arquivos na mesma pasta. Se precisar apontar para outro lugar, defina antes do runtime:
`pdfjsLib.GlobalWorkerOptions.workerSrc = '<caminho>/pdf.worker.min.js'`.

## URL dinâmica

Monte a URL no servidor e passe para a view (o arquivo precisa ser **público / mesma origem**):

```php
// Controller / Model
$url = route('arquivos.pdf', $arquivo->id); // ou Storage::url(...) / asset(...)
```

Cole `$url` no campo **URL** do componente, ou, no HTML exportado, troque o
`data-pdf-url` do `<div data-pdf-viewer>` por `$url`. Em Blade dinâmico:

```blade
<div class="dsb-pdf" data-pdf-viewer
     data-pdf-url="{{ $url }}"
     data-pdf-max-width="900" data-pdf-gap="12" data-pdf-max-pages="0"></div>
```

> Se você colar uma expressão `{{ ... }}` direto no campo **URL**, o componente **não**
> escapa o valor (para não quebrar o Blade) e emite o `data-pdf-url` como está.

## Observações

- **CORS:** se o PDF estiver em outro domínio, o servidor dele precisa enviar
  `Access-Control-Allow-Origin`. Para arquivos do próprio projeto (mesma origem), nada a fazer.
- **Versão:** PDF.js v3 (UMD regular, expõe `window.pdfjsLib`). Compatível com Android/iOS
  atuais sem a build *legacy* (ES5).
