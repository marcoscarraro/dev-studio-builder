# Componente PWA — App instalavel, offline e notificacoes

O componente **PWA (App Instalavel)** transforma a pagina exportada num Progressive
Web App: instalavel na tela inicial, com funcionamento **offline** e **notificacoes**.
Funciona em **Android**, **iOS** e **Windows** (com as diferencas de cada plataforma
descritas abaixo).

Arquivos envolvidos:

| Arquivo | Papel |
|---|---|
| `assets/js/renderers/pwa.js` | UI do componente (botoes Instalar / Notificacoes) + atributos `data-*` |
| `public/components/js/pwa-runtime.js` | Registra o service worker e liga os botoes (so na pagina exportada) |
| `assets/js/core/export-html.js` | Injeta as tags de `<head>` e **gera** `manifest.webmanifest` e `sw.js` |

> O builder exporta **um HTML**. Como `manifest.webmanifest` e `sw.js` precisam ser
> **arquivos reais** no servidor, o export inclui o **conteudo** deles em blocos
> `(<script type="text/plain" data-pwa-file="...">)` no fim do HTML — para voce copiar e
> salvar. O **HTML offline** ja vem **embutido no sw.js** (nao precisa de `offline.html`).

---

## 1. O que o componente gera

Ao exportar uma pagina que contem o componente PWA:

1. **Tags no `<head>`**: `theme-color`, `<link rel="manifest">`, `apple-touch-icon`,
   `apple-mobile-web-app-capable`/`-status-bar-style`/`-title`, `application-name`,
   `msapplication-TileColor`/`-TileImage`.
2. **Botoes** (opcionais) **Instalar** e **Ativar notificacoes**, onde voce soltou o componente.
3. **Runtime** `pwa-runtime.js` (registra o SW e liga os botoes).
4. **Dois blocos copiaveis** no fim do HTML: `manifest.webmanifest` e `sw.js`.

---

## 2. Como publicar (passo a passo)

1. **Exporte o HTML** e salve a pagina (ex.: numa view Blade).
2. **Copie os dois blocos** do fim do HTML e salve como arquivos na **raiz publica**:
   - `public/manifest.webmanifest`
   - `public/sw.js`  (precisa ficar na raiz para ter escopo `/`)
3. **Gere os icones** referenciados (PNG):
   - `icon-192.png` (192x192) e `icon-512.png` (512x512) — use `purpose: any maskable`.
   - `apple-touch-icon.png` (180x180) para iOS.
4. **HTTPS obrigatorio** (exceto `http://localhost`). Sem HTTPS o service worker nao registra.

No Laravel, os arquivos em `public/` ja sao servidos na raiz. Garanta que o `sw.js`
responda com `Content-Type: application/javascript` (o padrao do Laravel/servidor web ja faz).

---

## 3. Propriedades principais

| Grupo | Props |
|---|---|
| **App** | nome, nome curto, descricao, idioma, modo de exibicao (standalone/fullscreen/minimal-ui/browser), orientacao, `start_url`, `scope` |
| **Aparencia** | cor do tema, cor de fundo (splash), cor do tile (Windows), barra de status (iOS) |
| **Icones** | URLs do icon 192, 512 e apple-touch-icon |
| **Service worker** | URL do manifest, URL e escopo do `sw.js` |
| **Offline** | nome do cache, **arquivos para cache** (1 por linha), **HTML exibido offline** |
| **Botao instalar / Notificacoes** | mostrar, texto, classe CSS, icone |

> **Arquivos para cache**: liste as URLs que devem funcionar offline (CSS, JS, imagens,
> rotas). **Atencao**: se qualquer URL retornar 404, o `cache.addAll` falha e o SW nao
> instala — liste apenas URLs que existem. A `start_url` ja entra automaticamente.

---

## 4. Funcionamento offline

O `sw.js` gerado:
- **install**: pre-cacheia a lista de arquivos + `skipWaiting`.
- **activate**: remove caches antigos + `clients.claim`.
- **fetch**:
  - **navegacao** (abrir uma pagina): tenta a rede; offline, usa o cache e, por fim, o
    **HTML offline embutido**.
  - **demais GET** (assets): **cache-first** com fallback de rede.

Para forcar atualizacao do cache apos mudar arquivos, **troque o "Nome do cache"**
(ex.: `pwa-cache-v2`).

---

## 5. Instalacao por plataforma

- **Android (Chrome/Edge)**: o evento `beforeinstallprompt` e capturado; o **botao
  Instalar** aparece quando o app e instalavel e abre o prompt nativo.
- **Windows (Edge/Chrome)**: igual ao Android (botao Instalar) + tile com `TileColor`.
- **iOS (Safari)**: **nao** existe `beforeinstallprompt` — a instalacao e **manual** via
  *Compartilhar -> Adicionar a Tela de Inicio*. As `apple-*` metas + `apple-touch-icon`
  garantem nome, icone e barra de status corretos. O botao Instalar fica oculto no iOS.

---

## 6. Notificacoes

O botao **Ativar notificacoes** pede permissao (`Notification.requestPermission()`) e,
se concedida, dispara uma **notificacao local** de exemplo (titulo/mensagem
configuraveis).

**Web Push real** (enviar do servidor, mesmo com o app fechado) exige passos de backend
nao cobertos por um export estatico:
1. Gerar chaves **VAPID**.
2. No `sw.js`, tratar o evento `push` (`self.addEventListener('push', ...)`).
3. No cliente, `registration.pushManager.subscribe({ applicationServerKey })` e enviar a
   subscription para o servidor.
4. No Laravel, usar um pacote como `laravel-notification-channels/webpush` para enviar.

Esse e o caminho recomendado quando precisar de push de verdade.

---

## 7. Checklist

- [ ] `manifest.webmanifest` e `sw.js` salvos na **raiz publica**.
- [ ] Icones 192/512/apple gerados nos caminhos configurados.
- [ ] Pagina servida via **HTTPS** (ou localhost).
- [ ] DevTools > Application: manifest valido + service worker **activated**.
- [ ] Modo offline (DevTools > Network: Offline) recarrega e mostra o HTML offline.
- [ ] (iOS) "Adicionar a Tela de Inicio" usa nome e icone corretos.
