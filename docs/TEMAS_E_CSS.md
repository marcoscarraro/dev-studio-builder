# Temas & Funcionamento do CSS

Como o Dev Studio Builder organiza o CSS e o sistema de temas (claro/escuro, tema base,
cor primária, superfícies). Vale tanto para o **editor** quanto para a **página exportada** —
os dois carregam os mesmos arquivos de `public/components/css/`.

> Base: [Tabler](https://tabler.io) + Bootstrap 5. As cores são **variáveis CSS** `--tblr-*`.
> Preferimos variáveis a cores fixas para tudo seguir claro/escuro automaticamente.

---

## 1. Camadas de CSS e ordem de carga

Do mais genérico para o mais específico (o que vem depois vence em caso de empate):

```
public/tabler/css/tabler.css        ← framework (variáveis e componentes padrão)
public/components/css/base.css       ← utilitários próprios (ex.: .button-icon)
public/components/css/theme.css      ← tema do projeto  (o coração do sistema)
        ├── @import theme-<nome>.css ← rampa de cinza do tema base (escolha UM)
        └── @import theme-config.css ← cor primária, radius e fonte
public/components/css/components/*.css ← CSS por componente (incluído só quando usado)
public/components/css/layouts/*.css    ← CSS dos layouts de menu (pill, module-rail…)
```

O `theme.css` é onde tudo se conecta: ele importa o **tema base** e a **config** no topo e
define os blocos de variáveis para o modo claro (`:root, [data-bs-theme=light]`) e escuro
(`[data-bs-theme=dark]`).

---

## 2. Escolher o tema base

No **topo do `theme.css`**, descomente **apenas um** `@import`:

```css
/* --- Temas neutros --- */
/*@import "theme-gray.css";*/
/* @import "theme-slate.css"; */
/* @import "theme-zinc.css"; */
@import "theme-neutral.css";      /* ← ativo */
/* @import "theme-stone.css"; */
/* @import "theme-pink.css";*/

/* --- Temas de conforto visual (menos fadiga ocular) --- */
/* @import "theme-sepia.css"; */
/* @import "theme-sage.css"; */
/* @import "theme-solarized.css"; */

@import "theme-config.css";
```

| Tema | Arquivo | Característica |
|---|---|---|
| Gray | `theme-gray.css` | Cinza neutro padrão. |
| Slate | `theme-slate.css` | Cinza levemente **azulado**. |
| Zinc | `theme-zinc.css` | Cinza neutro (frio). |
| Neutral | `theme-neutral.css` | Cinza puro. |
| Stone | `theme-stone.css` | Cinza levemente **quente**. |
| Pink | `theme-pink.css` | Rampa **rosa** (tinge tudo). |
| **Sepia** | `theme-sepia.css` | **Conforto visual:** papel/creme quente, baixa luz azul. Foco em descanso. |
| **Sage** | `theme-sage.css` | **Conforto visual:** verde suave e natural. |
| **Solarized** | `theme-solarized.css` | **Conforto visual:** versão suavizada da paleta Solarized. |

Os três últimos são "temas de conforto" e, além da rampa, tingem as **superfícies**
(cards/sidebars) — veja a seção 4.

---

## 3. Como um tema base funciona

Cada `theme-<nome>.css` define **apenas a rampa de cinza** (`!important`), nada mais:

```css
:root {
  --tblr-gray-50:  #f5efe1 !important;  /* mais claro  → fundo da página */
  --tblr-gray-100: #ebe1cc !important;
  /* ... */
  --tblr-gray-700: #664f36 !important;  /* cor do texto */
  /* ... */
  --tblr-gray-950: #1a140d !important;  /* mais escuro */
  --tblr-gray:      var(--tblr-gray-600) !important;
  --tblr-gray-dark: var(--tblr-gray-800) !important;
}
```

A partir dessa rampa, o `theme.css` **deriva** as variáveis semânticas usadas pela UI:

| Papel | Variável | Vem de |
|---|---|---|
| Fundo da página | `--tblr-body-bg` | `--tblr-bg-surface-secondary` → `--tblr-gray-50` |
| Cor do texto | `--tblr-body-color` | `--tblr-gray-700` |
| Superfícies secundárias | `--tblr-bg-surface-secondary/-tertiary` | `--tblr-gray-50` |

> **Importante:** a rampa **só** deve existir nos arquivos `theme-<nome>.css`. Não redeclare
> `--tblr-gray-*` dentro do `theme.css` — se fizer, sobrescreve o tema importado (foi um bug real:
> um `--tblr-gray-50: #f9fafb` esquecido deixava o fundo cinza mesmo com o sepia ativo).

---

## 4. Superfícies: `--tblr-surface-base`

Por padrão, **cards, sidebars, dropdowns e inputs** são **brancos** no modo claro,
independente do tema. Quem controla isso é:

```css
/* em theme.css (bloco light) */
--tblr-bg-surface-primary: var(--tblr-surface-base, var(--tblr-white)) !important;
```

- Se o tema **não** define `--tblr-surface-base` → cai no fallback `--tblr-white` = cards brancos
  (comportamento dos temas neutros: gray, slate, neutral…).
- Se o tema **define** `--tblr-surface-base` → cards/sidebars/dropdowns/inputs ficam **tingidos**
  (é o que os temas de conforto fazem para não estourar branco).

Padrão recomendado (superfície um pouco **mais clara** que o fundo, para os cards "saltarem"):

```css
/* theme-solarized.css */
--tblr-gray-50:      #f8f4eb !important;  /* fundo da página */
--tblr-surface-base: #fbf9f5 !important;  /* cards — mais claros que o fundo */
```

Cadeia de resolução: `--tblr-surface-base` → `--tblr-bg-surface-primary` → `--tblr-bg-surface`
(cards/sidebars/dropdowns) e `--tblr-bg-forms` (inputs).

---

## 5. Cor primária, radius e fonte: `theme-config.css`

Ajustes rápidos de identidade visual, sem depender dos atributos `[data-bs-theme-*]` do Tabler:

```css
:root {
  --tblr-primary: #066fd1 !important;          /* + --tblr-primary-rgb: 6, 111, 209 */
  --tblr-primary-rgb: 6, 111, 209 !important;
  --tblr-border-radius-scale: 1 !important;    /* 0 reto … 2 bem arredondado */
  --tblr-body-font-family: var(--tblr-font-sans-serif) !important; /* serif | monospace | comic */
}
```

Presets de cor e fonte estão comentados dentro do próprio arquivo.

---

## 6. Modo escuro (claro/escuro)

- O `theme.css` tem um bloco `[data-bs-theme=dark]` que redefine as variáveis para o escuro.
- O atributo fica no `<html>` (`data-bs-theme="dark"`). O componente de menu
  **"Alternar tema (claro/escuro)"** grava a escolha em `localStorage['tabler-theme']`, e o
  `tabler-theme.js` (incluído em todo export) aplica no carregamento.

### Regra do `!important` (importante ao editar o dark)

O bloco **claro** define muitas variáveis com `!important`. Isso **suprime** o override nativo do
Tabler para o escuro. Consequência prática:

> Toda variável de UI que o bloco **light** define com `!important` **precisa ser redeclarada**,
> também com `!important`, no bloco **dark**. Senão o valor claro "vaza" para o escuro.

Foi exatamente a causa dos **cards brancos no dark**: a família `--tblr-bg-surface*` não estava
redeclarada no bloco escuro. A correção redeclarou surfaces, `--tblr-bg-forms`, inverted etc. no
`[data-bs-theme=dark]`. As superfícies escuras usam um **slate neutro fixo** (não seguem o tema base),
para não ficarem saturadas — a marca aparece via `--tblr-primary`.

---

## 7. Criar um tema novo

1. Copie um `theme-<nome>.css` existente (ex.: `theme-stone.css`) para
   `public/components/css/theme-<meu-tema>.css`.
2. Ajuste a rampa `--tblr-gray-50..950` (mais claro → mais escuro). Garanta contraste do texto
   (`gray-700`) sobre o fundo (`gray-50`) — mínimo AA (~4.5:1).
3. (Opcional) Defina `--tblr-surface-base` para tingir as superfícies.
4. Adicione um `@import "theme-<meu-tema>.css";` (comentado) no topo do `theme.css`.

---

## 8. Boa prática para componentes

Ao criar/estilizar componentes, **use variáveis do Tabler** em vez de cores fixas, para o
componente seguir claro/escuro sozinho:

```
--tblr-bg-surface        fundo de card/superfície
--tblr-bg-surface-secondary  fundo secundário / da página
--tblr-body-color        texto
--tblr-secondary-color   texto secundário
--tblr-border-color      bordas
--tblr-primary           cor de destaque
--tblr-tertiary-bg       hover/realce sutil
```

Se precisar de um hex como segurança, use-o **como fallback**: `var(--tblr-bg-surface, #fff)` —
a variável vence e adapta ao tema; o hex só entra se a variável não existir.

---

Veja também: [Guia do Desenvolvedor](GUIA_DESENVOLVEDOR.md) ·
[Como Criar Componente](COMO_CRIAR_COMPONENTE.md) ·
[Contrato do components.json](CONTRATO_COMPONENTS_JSON.md).
