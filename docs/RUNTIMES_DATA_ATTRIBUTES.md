# Referência dos `data-*` dos runtimes (página exportada)

Guia para quem **edita o HTML exportado**: cada componente "vivo" é controlado por um runtime
de `public/components/js/` que varre o DOM por um seletor-gatilho e lê a configuração nos
atributos `data-*` do elemento. Esta página lista o gatilho e os atributos de cada um.

> **Importante (desde jul/2026):** os componentes de biblioteca — **DataTable, TomSelect,
> ApexCharts, Litepicker, FullCalendar, HugeRTE, Dropzone e Signature** — normalmente saem
> com **init inline** no bloco "Scripts da página" (código direto na lib, valores resolvidos).
> Nesses casos, **edite o script**, não os `data-*` (que ficam no HTML apenas para o canvas
> do builder). Eles só voltam a usar o runtime/data-* nos casos especiais: DataTable com
> seleção de linhas, TomSelect com criar-via-modal ou página com FieldList.

Atributos marcados como *(interno)* são flags de controle do runtime — não configure à mão.

---

## Formulário e campos

### mask-runtime.js — máscaras (IMask)
- **Gatilho:** qualquer campo com `data-mask`
- `data-mask` — padrão da máscara (ex.: `000.000.000-00`)
- `data-mask-visible` — `true` exibe a máscara como placeholder

### password-toggle-runtime.js — mostrar/ocultar senha
- **Gatilho:** `[data-password-toggle]` (botão do input-group)
- *(interno)* `data-password-toggle-ready`

### quantity-stepper-runtime.js — botões +/− de quantidade
- **Gatilho:** `[data-qty-action]` (`minus`/`plus`); respeita `min`/`max`/`step` do input
- *(interno)* `data-qty-runtime-ready`

### otp-runtime.js — código 2FA/OTP
- **Gatilho:** `[data-otp]` (container)
- `data-otp-box` — cada dígito · `data-otp-value` — input oculto com o código
- `data-otp-numeric` — só números · `data-otp-autosubmit` — submete ao completar

### signature-runtime.js — assinatura (SignaturePad)
- **Gatilho:** `canvas[data-signature]`
- `data-signature-bg` — cor de fundo · `data-signature-pen` — cor do traço (vazio = cor do tema)
- **Convenção de ids:** botão limpar = `<id>-clear`; input oculto = `<id>-value`

### fieldlist-runtime.js — listas dinâmicas (clonar/remover/mover linha)
- **Gatilho:** `[data-fieldlist]` (container)
- `data-fieldlist-body` — tbody das linhas · `data-fieldlist-template` — linha-modelo
- `data-fieldlist-add` — botão adicionar · `data-fieldlist-action` — `clone`/`remove`/`move-up`/`move-down`
- `data-fieldlist-name-template` / `-id-template` / `-for-template` — padrões com `{{index}}`
- `data-fieldlist-index-start` — índice inicial · `data-index` — índice da linha
- Dispara o evento `fieldlist:row-added` (tomselect/otp/pwa/unsaved-guard escutam)
- *(interno)* `data-fieldlist-runtime-ready`

### unsaved-guard-runtime.js — aviso de alterações não salvas
- **Gatilho:** form com `data-unsaved-guard`
- `data-unsaved-message` — texto do aviso · `data-unsaved-beforeunload` — avisa ao fechar aba
- `data-unsaved-confirm` / `data-unsaved-modal` — modo de confirmação ao navegar
- `data-unsaved-ignore` — links/botões que não disparam o aviso · `data-unsaved-exit` — botão "sair mesmo assim"

### ajax-fill-runtime.js — preencher campos via AJAX (ex.: CEP)
- **Gatilho:** botão com `data-ajax-fill` dentro de `[data-ajax-input-group]`
- `data-ajax-url-template` — URL com `{{value}}` · `data-ajax-method` — GET/POST
- `data-ajax-mappings` — JSON `caminho do JSON -> name do campo destino` (suporta `a.b.c`)
- `data-ajax-source` — campo de origem do valor · `data-geo-fill`/`data-geo-lat`/`data-geo-lng` — geolocalização

## Mídia e documentos

### pdf-runtime.js — visualizador de PDF (PDF.js)
- **Gatilho:** `[data-pdf-viewer]`
- `data-pdf-url` — URL do PDF · `data-pdf-max-width` — largura máx (px)
- `data-pdf-gap` — espaço entre páginas · `data-pdf-max-pages` — `1` = só a primeira

### barcode-scanner-runtime.js — leitor de código de barras/QR
- **Gatilho:** `[data-barcode-scanner]`
- `data-bs-mode` — `single`/`continuous` · `data-bs-camera` — `environment`/`user`
- `data-bs-formats` — formatos aceitos · `data-bs-fps` / `data-bs-qrbox` — desempenho/área
- `data-bs-show-result` — exibe o alerta com o código lido
- Partes internas: `data-barcode-btn-start/-stop`, `data-barcode-reader-wrap`, `data-barcode-result-*`

### audio-recorder-runtime.js — gravador de áudio
- **Gatilho:** `[data-audio-recorder]`
- `data-ar-max-seconds` — limite · `data-ar-show-preview` — player de revisão
- Partes internas: `data-ar-btn-record/-stop/-clear`, `data-ar-playback`, `data-ar-status`, `data-ar-result-input`

### speech-reader-runtime.js — leitura de texto (TTS)
- **Gatilho:** `[data-speech-reader]`
- `data-sr-target` — seletor do texto · `data-sr-lang` / `data-sr-voice` — idioma/voz
- `data-sr-rate` / `data-sr-pitch` / `data-sr-volume` — velocidade/tom/volume
- Partes internas: `data-sr-play/-pause/-stop`, `data-sr-status`

### gantt-runtime.js — gantt/timeline de reservas
- **Gatilho:** `[data-gantt]`
- `data-gantt-url` — JSON das tarefas · `data-gantt-view` — `timeline`/`agenda`
- `data-gantt-gran` — granularidade · `data-gantt-options` — JSON extra
- `data-gantt-auth-type/-token/-header` — autenticação do fetch
- Partes internas: `data-gantt-today`, `data-gantt-sheet-close`, `data-task-id`

## Utilidades e menu

### clipboard-runtime.js — copiar para a área de transferência
- **Gatilho:** `[data-copy-btn]` (copia o valor do input do mesmo input-group)

### fab-runtime.js — botão flutuante (speed-dial)
- **Gatilho:** `[data-fab]` (container) + `[data-fab-toggle]` (botão)
- `data-icon` — ícone fechado · `data-icon-open` — ícone aberto (X)

### theme-toggle-runtime.js — alternar tema claro/escuro
- **Gatilho:** `[data-theme-toggle]`
- `data-icon-light` / `data-icon-dark` — ícones por tema
- Grava em `localStorage["tabler-theme"]`; o `tabler-theme.js` aplica `data-bs-theme` no `<html>`

### fullscreen-runtime.js — botão tela cheia
- **Gatilho:** `[data-fullscreen-toggle]`
- `data-icon-enter` / `data-icon-exit` · `data-title-enter` / `data-title-exit`

### pwa-runtime.js — app instalável
- **Gatilho:** `[data-pwa]`
- `data-sw-url` / `data-sw-scope` — service worker · `data-pwa-install` — botão instalar
- `data-pwa-notify` + `data-notify-title/-body/-icon` — notificação de teste

### Layouts de menu (pill-layout.js, sidebar-collapse-runtime.js, menu-submenu-runtime.js)
Runtimes **de layout**, incluídos conforme o `menuLayout` da página — não têm config por
`data-*` do dev (usam atributos internos `data-dsb-*`, `data-sub`, `data-leaf`,
`data-sidebar-collapse-toggle` e os `data-bs-*` do Bootstrap).

## Componentes com init inline (config no script, não em data-*)

`datatable-runtime.js` (`data-dt-*`) e `tomselect-runtime.js` (`data-*` do select) continuam
existindo e documentados nos próprios arquivos — são usados **apenas** nos casos especiais
citados no topo. Para o restante (apexchart, litepicker, fullcalendar, hugerte, dropzone,
signature), a página exportada traz o init inline legível; os runtimes servem ao canvas do
builder.

---

Ver também: [Guia do Desenvolvedor](GUIA_DESENVOLVEDOR.md) ·
[Mapa do builder.js](MAPA_BUILDER_JS.md) · [Análise de manutenção](ANALISE_MANUTENCAO.md)
