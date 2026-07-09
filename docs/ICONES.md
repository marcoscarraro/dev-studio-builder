# Ícones: Tabler, Lineicons e Font Awesome

Todo campo de ícone do painel (botão, KPI, menu, FAB, accordion, timeline, etc. — qualquer
`"field": "icon"` no `components.json`) permite escolher, **por campo**, qual biblioteca de
ícone usar. Não é uma escolha única para a página inteira: cada ícone pode vir de uma
biblioteca diferente, o que dá liberdade para, por exemplo, usar um ícone de marca (GitHub) do
Font Awesome ao lado de ícones do dia a dia do Tabler.

## Bibliotecas disponíveis

| Biblioteca | Origem | Quantidade |
|---|---|---|
| **Tabler** (padrão) | `public/components/icons/outline/*.svg` | ~5.076 |
| **Lineicons — Regular** | `public/components/libs/lineicons-5.1-free/free-regular-font/` | 855 |
| **Lineicons — Solid** | `public/components/libs/lineicons-5.1-free/free-solid-fonts/` | 357 |
| **Font Awesome — Solid** | `public/components/libs/fontawesome-free-7.3.0-web/` | 1.422 |
| **Font Awesome — Regular** | idem | 169 |
| **Font Awesome — Brands** | idem | 566 |

Tabler é renderizado como máscara CSS sobre um SVG (`<span class="button-icon" style="mask-image:...">`,
colorido via `--button-icon-color`). As demais são **ícones de fonte** — o glifo é texto
(`<i class="lni lni-home">`, `<i class="fa-solid fa-house">`), colorido via `color` normal do CSS.

## Como escolher, no painel

Cada campo de ícone mostra **dois controles**:
1. Um select compacto de **biblioteca** (as 6 opções acima).
2. O campo de **busca do nome** (com prévia visual), que passa a pesquisar dentro da
   biblioteca escolhida.

Trocar a biblioteca **reseta o nome** do ícone (o nome antigo quase certamente não existe na
biblioteca nova) — basta buscar de novo dentro da lista que aparece.

## Onde consultar os nomes disponíveis

- **Tabler**: já é o padrão do projeto (busca com prévia direto no painel).
- **Lineicons**: cada família traz um cheatsheet HTML dentro da própria pasta —
  `public/components/libs/lineicons-5.1-free/free-regular-font/lineicons-free.html` e
  `.../free-solid-fonts/lineicons-free-solid.html`. Abra no navegador para ver todos os ícones.
- **Font Awesome**: sem cheatsheet embutido no pacote — consulte
  [fontawesome.com/search](https://fontawesome.com/search?ic=free) filtrando por "Free" e pelo
  estilo (Solid/Regular/Brands). O nome do ícone no site (ex. "house") é o mesmo nome buscado
  no painel.

## Formato salvo (para quem edita o JSON da página na mão)

O valor de qualquer prop de ícone é sempre uma **string**: `"<biblioteca>:<nome>"`, ex.
`"fa-solid:house"`, `"lineicons-regular:home"`. **Sem prefixo reconhecido = Tabler** — projetos
salvos antes desta funcionalidade existir (`icon: "home"`) continuam funcionando idênticos, sem
qualquer migração.

Chaves de biblioteca: `tabler`, `lineicons-regular`, `lineicons-solid`, `fa-solid`, `fa-regular`,
`fa-brands`.

## Limitação conhecida: Lineicons Regular × Solid

**Não use Lineicons Regular e Lineicons Solid na mesma página exportada.** As duas famílias
definem a mesma regra CSS (`.lni:before { font-family: ... }`); quando as duas são carregadas
juntas, o CSS que carrega por último "vence" para **todos** os ícones `.lni` da página —
inclusive os da outra família, que ficam com o glifo errado ou em branco. Isso é uma
característica da biblioteca (as duas famílias competem pela mesma classe base), não um bug do
builder. Escolha **uma** das duas por página. Font Awesome não tem esse problema: os estilos
Solid/Regular/Brands convivem sem conflito no mesmo `all.min.css`.

## Notas para quem mexe no código (renderers/export)

- A renderização central fica em `renderTablerIcon(value, color)` (`assets/js/builder.js`),
  chamada por todos os renderers via `context.renderTablerIcon(props.icon, props.iconColor)` —
  a assinatura não mudou, então nenhum renderer precisou ser alterado para ganhar suporte às
  novas bibliotecas.
- O parse/build do valor prefixado vive em `assets/js/core/parsers.js`
  (`parseIconValue`/`buildIconValue`/`ICON_LIBRARIES`).
- O export só inclui o CSS das bibliotecas realmente usadas na página (ver
  `collectIconLibraryStyles` em `assets/js/core/export-html.js`); o canvas do builder faz o
  mesmo sob demanda (`core/preview-libs.js`).
- `menu-fullscreen` e `menu-theme-toggle` trocam o ícone dinamicamente (entrar/sair de tela
  cheia; claro/escuro) via runtime (`fullscreen-runtime.js`/`theme-toggle-runtime.js`), que
  também entende o valor prefixado e troca classes (fonte) ou `mask-image` (Tabler) conforme a
  biblioteca de cada estado.
