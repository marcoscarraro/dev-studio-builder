# Checklist de Testes

Use este checklist sempre que criar ou alterar componente, renderer, runtime ou `components.json`.

## 1. Validacao de Arquivos

Rode no PowerShell:

```powershell
node -e "JSON.parse(require('fs').readFileSync('assets/data/components.json','utf8')); console.log('components json ok')"
node -e "JSON.parse(require('fs').readFileSync('assets/data/components.schema.json','utf8')); console.log('schema json ok')"
```

Se alterou JS:

```powershell
node --check assets/js/builder.js
node --check assets/js/core/helpers.js
node --check assets/js/core/drag-drop.js
node --check assets/js/core/properties.js
node --check assets/js/core/export-html.js
```

E rode tambem no arquivo alterado:

```powershell
node --check assets/js/renderers/meu-renderer.js
```

## 2. Carregamento no Navegador

Abra:

```text
http://localhost/template_builder/index.html
```

Verifique:

- pagina carregou sem tela em branco;
- console do navegador nao mostra erro JS;
- lista de componentes aparece;
- painel de propriedades aparece;
- area da pagina aparece.

## 3. Teste da Paleta

Para componente novo:

- o componente aparece no grupo correto;
- o texto do componente esta correto;
- o icone/classe visual nao quebrou;
- busca da paleta encontra o componente.

## 4. Teste de Arrastar e Soltar

Teste:

- arrastar para a pagina;
- arrastar para uma coluna;
- mover o componente para outra coluna;
- duplicar;
- remover;
- desfazer/refazer, se a alteracao impactar historico.

Para containers:

- arrastar componente para dentro;
- arrastar linha para dentro;
- mover item para fora, quando permitido;
- verificar regras de rejeicao (`rejectKinds`).

## 5. Teste do Painel de Propriedades

Selecione o componente e teste todos os campos:

- texto;
- numero;
- checkbox;
- select;
- icon;
- attributes;
- keyvalue;
- repeater;
- matrix.

Confirme:

- alteracao aparece no preview;
- alteracao aparece no HTML exportado;
- nenhuma propriedade some depois de selecionar outro componente;
- campos de CSS funcionam.

## 6. Teste de HTML Exportado

Clique em `HTML`.

Verifique:

- HTML do componente esta correto;
- classes CSS estao corretas;
- IDs e names estao corretos;
- atributos customizados aparecem;
- componentes hidden nao recebem wrapper indevido;
- containers exportam filhos;
- scripts e CSS necessarios foram incluidos.

## 7. Teste de Runtime

Se o componente usa JS no HTML exportado:

- o script foi incluido no export;
- o script nao depende de `builder.js`;
- funciona ao abrir o HTML exportado;
- nao registra evento duplicado ao inicializar mais de uma vez;
- lida com elementos adicionados dinamicamente, se necessario.

Exemplos:

- FieldList: adicionar, clonar, remover, reindexar.
- AJAX Fill: buscar API, preencher campos, lidar com erro.

## 8. Teste de FieldList

Quando alterar `fieldlist`, `input`, `button`, `tomselect`, `datepicker` ou runtime:

- adicionar nova linha;
- clonar linha;
- remover linha;
- conferir `name` com indice;
- conferir `id` com indice;
- conferir `for` com indice;
- testar botao unitario;
- testar botao dentro de dropdown;
- testar input dentro da coluna.

## 9. Teste de Formulario

Quando alterar campos de formulario:

- `id`;
- `name`;
- `required`;
- `disabled`;
- `readonly`;
- `pattern`;
- `customAttributes`;
- `invalidFeedback`;
- `validFeedback`;
- `autocomplete`;
- submit button.

## 10. Teste Responsivo

Use os modos do editor:

- Desktop;
- Tablet;
- Mobile.

Verifique:

- bordas aparecem corretamente;
- texto nao sobrepoe;
- botoes cabem;
- tabelas possuem scroll quando necessario;
- propriedades continuam acessiveis.

## 11. Teste de Regressao Rapido

Depois de qualquer alteracao estrutural, teste estes componentes:

- Input;
- Hidden Input;
- Button;
- Input + Botoes;
- Card;
- Card Personalizado;
- Form;
- Table;
- FieldList;
- Datatable;
- TomSelect;
- Datepicker;
- Grafico (qualquer tipo do grupo Graficos).

## 11b. Teste de Graficos (ApexCharts)

Quando alterar `chart.js`, `export-html.js`, `builder.js` ou `components.json` (grupo Graficos):

- arrastar um grafico para o canvas;
- verificar que o grafico renderiza no preview (nao apenas o placeholder vazio);
- editar serie, categorias, altura e titulo no painel de propriedades;
- confirmar que o preview atualiza apos cada mudanca;
- testar pie e donut (usam opcoes diferentes dos outros tipos);
- exportar o HTML e abrir no navegador;
- verificar que o grafico inicializa corretamente no HTML exportado;
- verificar que o script `apexcharts.min.js` foi incluido no HTML exportado;
- testar com mais de um grafico na mesma pagina (IDs nao podem colidir).

## 12. Envio AJAX do Formulario

- habilitar "Enviar via AJAX" no form (URL `mock/form-post.php`, formato JSON, Bearer token de teste);
- o textarea "Codigo JS (jQuery)" preenche sozinho e atualiza ao vivo conforme as configs mudam;
- editar o codigo manualmente: mudancas de config NAO sobrescrevem mais; limpar o campo regenera;
- salvar a pagina (JSON) e recarregar: o codigo editado volta como estava;
- exportar e abrir: o HTML deve incluir jQuery e o script de envio do form no bloco "Scripts da pagina" (fim do body), com o codigo do textarea;
- submeter com campo required vazio: balao de validacao aparece e nada e enviado;
- submeter preenchido: DevTools Network mostra o POST com header `Authorization` e corpo JSON;
- alert verde com a mensagem de sucesso aparece no topo do form;
- trocar a URL por uma invalida: alert vermelho com a mensagem de erro;
- formato FormData: corpo vira multipart (testar com campo de arquivo);
- Dropzone dentro do form: adicionar arquivos e submeter via AJAX (formato FormData) — os arquivos aparecem no payload (Network) sob o "Nome do campo" do Dropzone; remover um arquivo no Dropzone e submeter de novo — ele sai do payload;
- Dropzone: ID, "Nome do campo" e o campo informativo "Input oculto" vem auto-preenchidos no padrao `dropzone-<sufixo>` / `dropzone-store-<sufixo>`;
- Dropzone: marcar "Envio automatico (autoProcessQueue)" mostra o campo "URL de upload" (e o arquivo POSTa sozinho ao ser solto); desmarcar mostra o id do input oculto (arquivos vao no submit);
- Dropzone: desmarcar "Mostrar preview dos arquivos" esconde os itens visuais, mas os arquivos continuam indo no submit;
- redirect configurado: navega apos o sucesso;
- form SEM AJAX habilitado: submit normal continua intacto.

## 13. Componente Script JS

- arrastar "Script JS" da paleta (grupo Componentes JS): badge "JS" aparece no canvas;
- o textarea de codigo vem preenchido com o template "Calculo entre campos";
- trocar o Template no select: confirmacao aparece se o codigo foi editado; textarea atualiza;
- exportar: o codigo sai num `<script>` unico no FIM do body (depois das libs), nada na posicao do componente;
- jQuery incluido uma unica vez (mesmo com DataTable na pagina);
- na pagina exportada: digitar nos campos `quantidade`/`preco` recalcula `total` (template calc);
- template mostrar/esconder: alterar o campo observado mostra/esconde o alvo com o label junto.

## 14. Database Designer (database_builder.html)

- abrir pelo botao "Banco de Dados" na topbar do builder (nova aba): mesmo shell visual; alternar o dark mode e conferir;
- Nova Tabela: aparece no diagrama ja selecionada; renomear no painel reflete ao vivo no card e na sidebar;
- Colunas: adicionar/expandir/editar (tipo, tamanho, PK/NOT NULL/AI, valor padrao) e remover; AI duplicado e bloqueado;
- Indices: adicionar, marcar colunas (checkboxes), tipo INDEX/UNIQUE; aparece no SQL exportado;
- FK: criar com 2 tabelas (coluna origem -> tabela/coluna destino PK), ON DELETE/UPDATE; badge FK aparece na coluna do card;
- Triggers: na tabela e avulsa (com select de tabela); templates rapidos preenchem o codigo; editor com highlight SQL; pre-visualizar abre o dialogo;
- View: modo construtor (tabelas origem, colunas com alias, WHERE/ORDER/LIMIT) e modo SQL (editor com highlight); pre-visualizar;
- trocar o tipo de banco: campos engine/charset somem/aparecem, tipos de coluna mudam;
- Exportar SQL: dialogo padrao do builder; Copiar (em HTTP usa fallback) e Baixar funcionam; Importar SQL (prompt) cria tabelas;
- arrastar cards pelo diagrama; clique no fundo limpa a selecao; recarregar a pagina restaura tudo (localStorage proprio, formato antigo carrega);
- builder (index.html) segue intacto.

## 15. Checklist Antes de Finalizar

- JSON valido.
- JS valido.
- Componente aparece na paleta.
- Preview funciona.
- Propriedades funcionam.
- Export HTML funciona.
- Runtime funciona, se existir.
- Console sem erro.
- Arquivo novo carregado no `index.html`, se necessario.
- Cache `?v=` atualizado quando precisar forcar navegador a recarregar.
- Botao "Copiar" no dialogo de saida funciona (testar em HTTP e HTTPS).

> **Nota sobre Clipboard API**: `navigator.clipboard` so funciona em HTTPS ou localhost com flag de contexto seguro. Em HTTP puro (ex: Laragon sem SSL), o `copyOutput` usa automaticamente o fallback `document.execCommand("copy")`. Se o botao copiar nao funcionar, verifique se o navegador tem permissao de clipboard ou sirva o app via HTTPS.

