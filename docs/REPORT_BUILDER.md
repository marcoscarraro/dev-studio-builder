# Report Builder — Gerador de Templates de Relatorio (DOMPDF)

Ferramenta visual para montar **templates HTML de relatorios** prontos para serem
processados pelo **DOMPDF** no Laravel. O Report Builder gera o *layout* (cabecalho,
rodape, secoes, tabelas, QR Code, codigo de barras); toda a carga de dados, calculos
e geracao do PDF ficam a cargo do backend.

A pagina exporta **HTML puro com placeholders** (comentarios `<!-- TOKEN -->` e tokens
substituiveis). O desenvolvedor cola esse HTML numa Blade view e troca os placeholders
pelas variaveis do controller.

Arquivos envolvidos:

| Arquivo | Papel |
|---|---|
| `report_builder.html` | Pagina standalone (shell de 3 paineis) |
| `assets/js/report-builder.js` | Toda a logica: estado, render do canvas, propriedades, export |
| `assets/css/report-builder.css` | Estilos do canvas (papel, secoes, grade, propriedades) |

> Acesse pela topbar do Page Builder (`index.html`) no botao **Relatorios**, ou abra
> `report_builder.html` diretamente.

---

## Sumario

1. [Interface](#1-interface)
2. [Barra de ferramentas e persistencia](#2-barra-de-ferramentas-e-persistencia)
3. [Estrutura da pagina](#3-estrutura-da-pagina)
4. [Configuracoes da pagina](#4-configuracoes-da-pagina)
5. [Cabecalho e rodape (repetidos)](#5-cabecalho-e-rodape-repetidos)
6. [Secoes do corpo](#6-secoes-do-corpo)
7. [Tabela de Layout (grade com celulas e blocos)](#7-tabela-de-layout-grade-com-celulas-e-blocos)
8. [Aparencia das secoes](#8-aparencia-das-secoes)
9. [Placeholders e a filosofia de tokens](#9-placeholders-e-a-filosofia-de-tokens)
10. [Estrutura do HTML exportado](#10-estrutura-do-html-exportado)
11. [Integracao com Laravel + DOMPDF](#11-integracao-com-laravel--dompdf)
12. [Particularidades e limitacoes](#12-particularidades-e-limitacoes)
13. [Exemplo completo: cupom NFC-e](#13-exemplo-completo-cupom-nfc-e)

---

## 1. Interface

Layout de 3 paineis, igual ao Page Builder e ao Database Designer:

| Painel | Conteudo |
|---|---|
| **Esquerda (Secoes)** | Paleta. Clique para adicionar uma secao ao corpo; ou selecione as zonas fixas (Cabecalho, Rodape, Configuracoes da pagina) |
| **Centro (Canvas)** | Simulacao do papel A4 (794px). Mostra cabecalho, corpo e rodape. Clique em qualquer elemento para selecionar |
| **Direita (Propriedades)** | Formulario de propriedades do elemento selecionado, em tempo real |

A interacao e **clique-para-adicionar** (nao ha arrastar). Clicar num elemento o
seleciona e abre suas propriedades; digitar reflete no canvas ao vivo.

---

## 2. Barra de ferramentas e persistencia

| Botao | Acao |
|---|---|
| **↶ / ↷** | Desfazer / Refazer (historico com debounce na digitacao; botoes desabilitam quando nao ha o que fazer) |
| **Novo** | Recria o relatorio do zero e zera o historico (pede confirmacao) |
| **Salvar** | Persiste no navegador (`localStorage`, chave `report_builder_v1`) |
| **Carregar** | Recarrega do `localStorage` |
| **Importar** | Le um arquivo `.json` exportado e reconstroi o relatorio (para editar depois) |
| **Limpar** | Remove as secoes do corpo (mantem cabecalho, rodape e configuracoes); e desfazivel |
| **Exportar HTML** | Abre um dialog com o HTML final; botoes **Copiar** e **Baixar .html** |
| **Exportar JSON** | Abre o mesmo dialog com o JSON do relatorio; **Copiar** e **Baixar .json** |

O relatorio inteiro e um objeto JSON em memoria. **Exportar JSON** salva esse objeto
num arquivo portavel; **Importar** o reconstroi depois — ideal para versionar ou
continuar a edicao em outra maquina. Ao carregar/importar, `normalizeReport()` preenche
defaults ausentes e faz *backfill* de ids (compatibilidade com versoes anteriores).

---

## 3. Estrutura da pagina

Um relatorio tem quatro areas:

```
+--------------------------------------------------+
|  CABECALHO DA PAGINA  (repete em todas as paginas) |
+--------------------------------------------------+
|                                                  |
|  CORPO  (fluxo de secoes empilhadas)             |
|    - Informacoes                                 |
|    - Tabela de Dados                             |
|    - Tabela de Layout                            |
|    - Resumo / Totais ...                         |
|                                                  |
+--------------------------------------------------+
|  RODAPE DA PAGINA  (repete em todas as paginas)   |
+--------------------------------------------------+
```

- **Cabecalho** e **Rodape** sao zonas fixas (sempre existem) e se **repetem em todas
  as paginas** do PDF.
- O **Corpo** e uma lista ordenada de **secoes** que voce adiciona, reordena (setas
  ↑ ↓) e remove (×).

---

## 4. Configuracoes da pagina

Selecione **Configuracoes da Pagina** na paleta (ou desmarque qualquer selecao).

| Propriedade | Opcoes / Default |
|---|---|
| Tamanho | A4 (default), Carta/Letter, Oficio/Legal, A3, A5, **Cupom 80 mm**, **Cupom 58 mm**, **Cupom 50 mm** (termicos) |
| Orientacao | Retrato (default) / Paisagem — *nao se aplica aos cupons* |
| Altura do papel (mm) | So nos tamanhos termicos (cupom); default 297. Define o comprimento da tira |
| Margens (mm) | Superior 15, Inferior 20, Esquerda 10, Direita 10 |
| Fonte (CSS) | `Arial, sans-serif` |
| Tamanho da fonte (pt) | 10 |
| Cor primaria | `#206bc4` (cabecalho de tabelas, linha do cabecalho) |
| Cor do texto do cabecalho da tabela | `#ffffff` |
| Cor das linhas | `#dddddd` |
| Linhas zebradas | Ligado |

Essas escolhas alimentam o bloco `@page` e o `<style>` do HTML exportado. O **canvas
reflete o tamanho real** (os cupons aparecem como tiras estreitas de 80/58/50 mm).

**Tamanhos nomeados** (A4, Letter, Legal, A3, A5) viram `@page { size: A4 portrait }`.
**Cupons termicos** viram `@page { size: 80mm 297mm }` (largura fixa + altura do campo
"Altura do papel"). Para cupom, ajuste a altura ao tamanho do conteudo, ou defina o papel
no servidor (ver secao 11.5). Margens menores costumam ser melhores em 50/58 mm.

---

## 5. Cabecalho e rodape (repetidos)

### Cabecalho da Pagina

| Propriedade | Descricao |
|---|---|
| Exibir logotipo | Liga a imagem do logo |
| URL do logotipo | Caminho/URL ou token a substituir |
| Altura do logo (px) | Default 40 |
| Nome da empresa | Texto |
| Titulo do relatorio | Texto |
| Subtitulo | Texto |
| Exibir data de geracao | Insere o placeholder `<!-- DATA_GERACAO -->` |

### Rodape da Pagina

| Propriedade | Descricao |
|---|---|
| Texto da esquerda | Texto livre |
| Exibir numero de pagina | Centro: `Pagina X de Y` (numeracao automatica do DOMPDF) |
| Texto da direita | Texto livre |

> **Como repete em todas as paginas:** no HTML exportado, cabecalho e rodape usam
> `position: fixed`, que o DOMPDF interpreta como "repetir em cada pagina". A
> numeracao usa `counter(page)` / `counter(pages)` via CSS.

---

## 6. Secoes do corpo

Clique num item da paleta para adicionar ao corpo. Tipos disponiveis:

### Informacoes (`reportInfo`)
Tabela de pares **rotulo + placeholder** (ex.: `Periodo: <!-- PERIODO -->`). Bom para
filtros e parametros do relatorio. Propriedades: titulo, exibir titulo, linhas (rotulo
+ placeholder).

### Tabela de Dados (`dataTable`)
Listagem com **colunas configuraveis**. Cada coluna tem: cabecalho, placeholder,
largura (px) e alinhamento. Exporta `<thead>` + **uma linha modelo** dentro de
`<tbody>` marcada com comentario para virar o `@foreach` do Laravel. Suporta rodape
de totais (`<tfoot>`).

```html
<tbody>
  <!-- LINHA DE DADOS: substituir pelo @foreach do Laravel -->
  <tr>
    <td><!-- col_nome --></td>
    <td style="text-align:right"><!-- col_valor --></td>
  </tr>
  <!-- /LINHA DE DADOS -->
</tbody>
```

### Resumo / Totais (`summary`)
Linhas de subtotais/totais (rotulo + placeholder + negrito). Titulo opcional.

### Divisor (`divider`)
Linha horizontal (cor + espessura).

### HTML Livre (`customHtml`)
Bloco de texto/HTML personalizado, copiado **literalmente** para o export. Use para
markup que o builder nao cobre.

### QR Code (`qrCode`)
Imagem de QR gerada no servidor. Propriedades: token do `src`, tamanho (mm),
alinhamento, legenda. **Obrigatorio no NFC-e.** O export inclui um comentario com
exemplo de codigo Laravel pronto (ver secao 11).

### Codigo de Barras (`barcode`)
Imagem de codigo de barras gerada no servidor. Propriedades: token do `src`,
simbologia (Code 128, EAN-13, EAN-8, Code 39, UPC-A, ITF — informativa), largura
(total/fixa mm), altura (mm), alinhamento, legenda. O export traz a constante correta
da lib `picqer` conforme a simbologia escolhida.

### Tabela de Layout (`gridTable`)
Grade com celulas e blocos aninhados — ver a proxima secao.

---

## 7. Tabela de Layout (grade com celulas e blocos)

Secao mais poderosa: uma **grade NxM** onde cada celula recebe **blocos** de conteudo.
E a base para montar layouts em caixas (estilo **DANFE de NF-e**), pois tabelas sao o
primitivo de layout mais confiavel no DOMPDF.

### Fluxo de uso

1. Adicione **Tabela de Layout** → nasce uma grade **2x2**.
2. Selecione a tabela (clique no badge **GRADE**) → ajuste **colunas** e **linhas**
   pelos contadores **+/−**, bordas, cor da borda, espacamento, largura.
3. Clique numa **celula** → defina alinhamento horizontal/vertical e cor de fundo, e
   use **"Adicionar conteudo"** para inserir blocos.
4. Clique num **bloco** → edite suas propriedades; na lista da celula da para
   **reordenar (↑ ↓)** e **remover (×)**.

### Blocos disponiveis na celula

| Bloco | Propriedades |
|---|---|
| **Texto** | Conteudo (aceita `<!-- PLACEHOLDER -->`), alinhamento, negrito, tamanho (pt) |
| **Imagem** | Token/URL do `src`, largura/altura (mm), alt, alinhamento |
| **Link** | Texto, href, alinhamento |
| **QR Code** | Token do `src`, tamanho (mm), alinhamento, legenda |
| **Codigo de Barras** | Token, simbologia, largura, altura, alinhamento, legenda |
| **Tabela aninhada** | Outra Tabela de Layout **dentro da celula** (recursivo, sem limite de profundidade) |

### Recursao

Um bloco **Tabela aninhada** contem outra grade completa, configuravel igual a de cima.
Isso permite layouts complexos (uma celula que internamente se divide em varias linhas
e colunas), cobrindo a maioria dos casos sem precisar mesclar celulas.

O export e recursivo: cada grade vira um `<table>` com `<tr>/<td>`, e tabelas aninhadas
viram `<table>` dentro do `<td>`.

```html
<table style="width:100%;border-collapse:collapse">
  <tr>
    <td style="border:1px solid #333;padding:4pt;text-align:left;vertical-align:top">
      <div>EMITENTE</div>
    </td>
    <td style="border:1px solid #333;padding:4pt;text-align:right;vertical-align:top">
      <!-- QR: substitua QRCODE_SRC pela imagem (data URI base64) -->
      <div style="text-align:center; margin:4pt 0">
        <img src="QRCODE_SRC" alt="QR Code" style="width:20mm; height:20mm">
      </div>
    </td>
  </tr>
</table>
```

---

## 8. Aparencia das secoes

As secoes **Informacoes**, **Tabela de Dados**, **Resumo** e **Tabela de Layout** tem
um grupo **Aparencia**:

- **Cor do texto** (liga/desliga + seletor — desligado = herda)
- **Cor de fundo** (liga/desliga + seletor)
- **Tamanho da fonte** (pt)
- **Alinhamento do texto**

No export, a secao e envolvida num `<div style="...">` com esses estilos.

> **Edicao sem perder o foco:** ao digitar num campo de texto, apenas o canvas e
> re-renderizado — o formulario de propriedades **nao** e reconstruido, entao o cursor
> permanece no campo. Apenas os botoes de liga/desliga de cor reconstroem o painel.

---

## 9. Placeholders e a filosofia de tokens

O builder gera o **layout**, nao os dados. Os pontos onde entram dados aparecem de
duas formas:

1. **Comentarios** `<!-- NOME -->` para conteudo entre tags (ex.: celulas da Tabela de
   Dados, linhas de Informacoes, data de geracao).
2. **Tokens** no atributo `src` de imagens (QR, barras, logo) — ex.: `QRCODE_SRC` — que
   o desenvolvedor substitui pela imagem real (data URI) no servidor. O token e
   **editavel**: voce pode trocar por uma expressao Blade, como `{{ $qrcode }}`.

> Os blocos de QR e Codigo de Barras emitem, no HTML exportado, um **comentario-guia**
> com exemplo de codigo Laravel pronto (composer, controller e uso na view). Assim o
> dev "sempre lembra" como preencher. Esses comentarios evitam `{{ }}` Blade ativo e
> sequencias `--` para nao quebrar nem o comentario nem o Blade.

---

## 10. Estrutura do HTML exportado

O export monta um documento completo com `<style>` embutido:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4 portrait; margin: 15mm 10mm 20mm 10mm; }
    body  { font-family: Arial, sans-serif; font-size: 10pt; color: #333; margin:0; }

    /* Repetem em todas as paginas (DOMPDF) */
    .rpt-page-header { position: fixed; top: -15mm; left:-10mm; right:-10mm; ... }
    .rpt-page-footer { position: fixed; bottom: -20mm; left:-10mm; right:-10mm; ... }

    .rpt-data-table { width:100%; border-collapse:collapse; }
    .rpt-data-table thead tr { background:#206bc4; color:#fff; }
    .rpt-data-table tbody tr:nth-child(even) td { background:#f8f9fb; }

    .pagenum:before   { content: counter(page); }
    .pagecount:before { content: counter(pages); }
  </style>
</head>
<body>
  <div class="rpt-page-header"> ...logo, empresa, titulo, data... </div>
  <div class="rpt-page-footer"> ...esquerda | Pagina X de Y | direita... </div>

  <div class="rpt-body">
    <!-- secoes exportadas em ordem -->
  </div>
</body>
</html>
```

Pontos-chave:

- **`@page`** define tamanho, orientacao e margens.
- **`.rpt-page-header` / `.rpt-page-footer`** usam `position: fixed` com deslocamentos
  negativos para ocupar a area de margem e se repetir em cada pagina.
- **`.rpt-body`** recebe um `margin-top` para nao ficar sob o cabecalho fixo.
- Numeracao de paginas via `counter(page)` / `counter(pages)`.

---

## 11. Integracao com Laravel + DOMPDF

### 11.1 Colocar o HTML numa Blade view

Cole o HTML exportado em `resources/views/relatorios/exemplo.blade.php` e troque os
placeholders:

```blade
{{-- Data de geracao --}}
Gerado em: {{ now()->format('d/m/Y H:i') }}

{{-- Tabela de Dados: troque a linha modelo pelo loop --}}
<tbody>
  @foreach ($itens as $item)
  <tr>
    <td>{{ $item->nome }}</td>
    <td style="text-align:right">{{ number_format($item->valor, 2, ',', '.') }}</td>
  </tr>
  @endforeach
</tbody>

{{-- Resumo --}}
<td style="text-align:right">{{ number_format($total, 2, ',', '.') }}</td>
```

### 11.2 Gerar o PDF (barryvdh/laravel-dompdf)

```bash
composer require barryvdh/laravel-dompdf
```

```php
use Barryvdh\DomPDF\Facade\Pdf;

public function relatorio()
{
    $itens = Pedido::with('itens')->get();
    $pdf = Pdf::loadView('relatorios.exemplo', [
        'itens' => $itens,
        'total' => $itens->sum('valor'),
    ])->setPaper('a4'); // ou 'a4', 'landscape'

    return $pdf->stream('relatorio.pdf'); // ou ->download('...')
}
```

### 11.3 QR Code

```bash
composer require simplesoftwareio/simple-qrcode
```

```php
use SimpleSoftwareIO\QrCode\Facades\QrCode;

$png = base64_encode(QrCode::format('png')->size(300)->margin(0)->generate($chaveAcesso));
$qrcode = 'data:image/png;base64,' . $png;
// Na view, troque o token QRCODE_SRC por {{ $qrcode }}
```

> `format('png')` exige a extensao **imagick**. Sem ela, use `format('svg')` e embuta
> o SVG, ou troque por `endroid/qr-code`.

### 11.4 Codigo de Barras

```bash
composer require picqer/php-barcode-generator
```

```php
$gen = new Picqer\Barcode\BarcodeGeneratorPNG();
$png = base64_encode($gen->getBarcode($valor, $gen::TYPE_CODE_128));
$barcode = 'data:image/png;base64,' . $png;
// Na view, troque o token BARCODE_SRC por {{ $barcode }}
```

A constante (`TYPE_CODE_128`, `TYPE_EAN_13`, ...) ja vem sugerida no comentario do HTML
exportado conforme a simbologia escolhida no builder.

### 11.5 Papel termico (NFC-e)

Selecione **Cupom 80/58/50 mm** no Tamanho da pagina — o builder ja emite
`@page { size: 80mm <altura>mm }`, entao o DOMPDF respeita a largura termica direto do HTML.

Se quiser controlar a altura pelo servidor (ex.: cupom continuo ajustado ao conteudo),
sobrescreva o papel ao gerar o PDF:

```php
// 80mm de largura, altura generosa (pt): 80mm ~= 226.77pt
$pdf->setPaper([0, 0, 226.77, 1200]);
```

> Em cupons, prefira margens pequenas e considere desativar o cabecalho/rodape repetidos
> (use uma Tabela de Layout no corpo) se nao quiser repeticao por pagina.

---

## 12. Particularidades e limitacoes

- **Cabecalho/rodape repetidos** dependem de `position: fixed` — comportamento padrao
  do DOMPDF; em outros motores (wkhtmltopdf, navegador) o resultado pode diferir.
- **Tabela de Layout v1:** grade **uniforme** (cada linha tem o mesmo numero de
  celulas). **Nao** ha mesclagem `colspan`/`rowspan` ainda — para layouts complexos use
  **tabelas aninhadas** dentro das celulas.
- **Interacao por clique** (sem arrastar) — escolhido por robustez com aninhamento.
- **Imagens** (logo/QR/barras) sao **tokens**: o builder nao gera as imagens; o
  servidor gera e injeta o data URI.
- O **preview do canvas** e uma aproximacao (fontes em px, QR/barras falsos). O que vale
  e o **HTML exportado**, validado no DOMPDF.
- Tamanho do papel no canvas e fixo em A4 (794px) para visualizacao; o tamanho real do
  PDF vem do `@page` / `setPaper`.

---

## 13. Exemplo completo: cupom NFC-e

Montagem tipica de um cupom fiscal:

1. **Configuracoes da pagina:** fonte menor (ex.: 8pt), margens pequenas.
2. **Cabecalho:** nome da empresa + titulo "DANFE NFC-e" (ou use uma Tabela de Layout
   no corpo, ja que cupom nao costuma repetir cabecalho).
3. **Corpo:**
   - **Informacoes** — CNPJ, endereco (placeholders).
   - **Tabela de Dados** — colunas: Item, Descricao, Qtd, Vl Unit, Total.
   - **Resumo** — Total de itens, Valor total, Forma de pagamento.
   - **QR Code** — centralizado, ~25mm, com legenda "Consulte pela chave de acesso".
   - **HTML Livre** — mensagem fiscal / protocolo de autorizacao.
4. **Exportar HTML**, colar na Blade, ligar `@foreach` dos itens e o `$qrcode`.
5. Gerar com `setPaper([0,0,226.77,1200])` para 80mm.

Como o NFC-e e essencialmente **linear**, as secoes empilhadas + alinhamento ja cobrem
o layout; a **Tabela de Layout** entra quando voce precisa de blocos lado a lado
(ex.: dados do emitente a esquerda e QR a direita).

---

## Verificacao rapida

1. Abrir `report_builder.html` → 3 paineis carregam sem erro no console.
2. Adicionar cada tipo de secao → aparece no papel e tem propriedades.
3. Tabela de Layout: aumentar colunas/linhas, adicionar blocos, aninhar tabela.
4. **Exportar HTML** → documento valido com `@page`, header/footer `fixed`, tabelas.
5. Colar numa Blade, ligar `@foreach`/`$qrcode`/`$barcode`, gerar via DOMPDF.
6. **Salvar** → recarregar a pagina → estado restaurado do `localStorage`.
