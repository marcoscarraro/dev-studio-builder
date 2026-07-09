# Database Builder (Database Designer)

Editor visual de banco de dados: tabelas, colunas, índices, chaves estrangeiras, views e
triggers — com exportação de `.sql` para **6 bancos** (MySQL/MariaDB, PostgreSQL, SQLite,
SQL Server, Firebird, Oracle) e persistência automática no navegador.

- **Página:** `database_builder.html` (abre pelo botão "Banco de Dados" na topbar do builder)
- **JS:** `assets/js/database-builder.js` (~1.900 linhas, arquivo único, IIFE)
- **CSS:** `assets/css/database-builder.css` (overrides sobre o `builder.css` compartilhado)
- É um app **independente** do page builder (não usa `components.json` nem renderers), mas com
  o mesmo shell visual: topbar, workspace de 3 colunas (Objetos | Diagrama | Propriedades) e
  edição **ao vivo** no painel de propriedades — sem modais.

---

## 1. Como usar

1. **Nova Tabela / Nova View / Nova Trigger** — botões da topbar criam o objeto e o selecionam.
2. Clique num card do diagrama (ou item da sidebar) para selecioná-lo — o **painel de
   propriedades** à direita mostra os grupos de campos; tudo que você digita aplica **na hora**
   (modelo + diagrama + localStorage).
3. Arraste os cards pelo diagrama para organizar o layout (posição também é salva).
4. **Exportar SQL** — gera o `.sql` do banco selecionado num `<dialog>` (Copiar / Baixar).
5. **Importar** — cola um `CREATE TABLE` (dialeto MySQL) e recria as tabelas no diagrama.
6. **Desfazer/Refazer** — Ctrl+Z / Ctrl+Y (histórico próprio, snapshots do modelo inteiro).
7. **Limpar** — zera o diagrama (com confirmação).

O seletor de banco (topbar) troca o dialeto: os tipos disponíveis nos selects de coluna e o
SQL gerado mudam conforme o banco.

---

## 2. Arquitetura do arquivo (para quem vai dar manutenção)

Tudo vive em `assets/js/database-builder.js`, numa IIFE. Blocos principais (busque pelo nome):

| Bloco | O que faz |
|---|---|
| `STORAGE_KEY` | Chave única do localStorage (`"database_designer"`) |
| `dbConfig` | Um objeto por dialeto: `quotes`, `autoIncrement`, `engine`, `supportsFK`, `indexTypes`, `joinTypes` |
| `typeMappings` | Tipos de coluna disponíveis por dialeto (preenchem o select do painel) |
| `class View` | Modelo da view + `toSQL()` (gera o CREATE VIEW) + `render()` (card do diagrama) |
| `class Column` | Modelo da coluna + `toSQL()` (tipo/default/auto-increment) |
| `class Table` | Modelo da tabela + `toSQL()` (PK, índices, unique, FK, ENGINE) + `render()` |
| `triggerToSQL()` | Gera o CREATE TRIGGER (com `DELIMITER $$` no MySQL) |
| `exportSQL()` | Monta o arquivo final (cabeçalho, `SET FOREIGN_KEY_CHECKS` no MySQL) |
| `splitColumnsDef()` / `importSQL()` | Parser de importação (ciente de parênteses: `DECIMAL(10,2)`, `ENUM('a','b')`) |
| `renderTableProps()` etc. | Monta os campos do painel de propriedades por tipo de objeto |
| `handlePanelInput()` / `handlePanelClick()` | Delegação: cada campo tem `data-bind`; a cadeia de `if (bind === ...)` aplica no modelo |
| `buildStateSnapshot` / `commitDbHistory` / `undoDb` / `redoDb` | Undo/redo por snapshot |
| `saveToLocalStorage` / `loadFromLocalStorage` | Persistência (automática via `afterModelChange`) |

> **Aviso de design (intencional):** as classes misturam modelo + SQL + DOM (`toSQL()` e
> `render()` lado a lado) e o comportamento por dialeto usa `if (currentDatabase === ...)`
> espalhado — **sem abstração**. É a filosofia do projeto: código direto, banco por banco.

## 3. Guia dos dialetos (ajustar/adicionar um banco)

No topo do arquivo, junto de `dbConfig`, há o **GUIA DOS DIALETOS** com os **6 pontos** que
conhecem o dialeto. Para ajustar o SQL de um banco (ou adicionar um novo), percorra:

1. `dbConfig` — flags do banco (quotes, auto-increment, engine/charset, FK, tipos de índice)
2. `typeMappings` — tipos de coluna do select
3. `Column.toSQL()` — tipo/default/auto-increment por coluna
4. `Table.toSQL()` — PK, índices, unique, FKs, sufixo ENGINE/CHARSET
5. `View.toSQL()` — LIMIT/COMMENT conforme o banco
6. `triggerToSQL()` + `exportSQL()` — delimitadores de trigger e cabeçalho do arquivo

Adicionar um banco novo = criar a entrada em `dbConfig` + `typeMappings` e revisar os pontos
3-6 com `if (currentDatabase === "meubanco")` onde o SQL divergir.

## 4. Importação de SQL — limites conhecidos

- Entende apenas `CREATE TABLE` no **dialeto MySQL** (regex; backticks opcionais).
- Reconhece: nome/tipo/tamanho de coluna, `NOT NULL`, `AUTO_INCREMENT`, `PRIMARY KEY`,
  `ENGINE`, `CHARSET`, `COMMENT` da tabela. Tipos com vírgula (`DECIMAL(10,2)`,
  `ENUM('a','b')`) são suportados (split ciente de parênteses).
- **Não** importa: FKs, índices secundários, views, triggers, `ALTER TABLE`. Tabela sem PK
  ganha um `id INT` PK automático.

## 5. Persistência e histórico

- Salvamento **automático** a cada alteração (`afterModelChange` → `saveToLocalStorage`),
  na chave `localStorage["database_designer"]` (constante `STORAGE_KEY`).
- O snapshot inclui: tabelas/colunas (com posição x/y), views, FKs, índices, triggers,
  contadores de id e o banco selecionado.
- Undo/redo: snapshots completos do modelo (Ctrl+Z / Ctrl+Y), histórico próprio.

## 6. Checklist de teste manual

Ver seção "Database Designer" em [CHECKLIST_TESTES.md](CHECKLIST_TESTES.md). Cobertura mínima
após mexer em SQL: criar tabela com PK + coluna `DECIMAL(10,2)` + FK + índice, trocar entre os
6 bancos e conferir o `.sql` gerado de cada um; importar o próprio SQL exportado (MySQL) e
conferir que as colunas voltam corretas.
