// DADOS CONSTANTES DO BUILDER — templates de expressao regular e presets de AJAX.
// Arquivo so de dados (sem logica): para adicionar um template/preset novo, basta
// acrescentar um item no array correspondente. Consumido por builder.js via
// window.TemplateBuilderData.
(function () {
  "use strict";

  // Templates prontos de expressao de validacao (campo "Template de expressao"
  // no painel de propriedades dos inputs).
  const PATTERN_TEMPLATES = [
    { label: "E-mail", value: "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$" },
    { label: "CPF", value: "^\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}$" },
    { label: "CNPJ", value: "^\\d{2}\\.?\\d{3}\\.?\\d{3}\\/?\\d{4}-?\\d{2}$" },
    { label: "CPF ou CNPJ", value: "^(\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}|\\d{2}\\.?\\d{3}\\.?\\d{3}\\/?\\d{4}-?\\d{2})$" },
    { label: "Celular com DDD (BR)", value: "^\\(?[1-9]{2}\\)?\\s?9[0-9]{4}-?[0-9]{4}$" },
    { label: "Telefone fixo com DDD (BR)", value: "^\\(?[1-9]{2}\\)?\\s?[2-8][0-9]{3}-?[0-9]{4}$" },
    { label: "Telefone (celular ou fixo)", value: "^\\(?[1-9]{2}\\)?\\s?[2-9][0-9]{3,4}-?[0-9]{4}$" },
    { label: "Data DD/MM/AAAA", value: "^(0[1-9]|[12][0-9]|3[01])\\/(0[1-9]|1[012])\\/\\d{4}$" },
    { label: "Data DD/MM/AA", value: "^(0[1-9]|[12][0-9]|3[01])\\/(0[1-9]|1[012])\\/\\d{2}$" },
    { label: "IP (IPv4)", value: "^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$" },
    { label: "Somente letras (sem acento)", value: "^[A-Za-z]+$" },
    { label: "Somente letras (com acento)", value: "^[A-Za-zÀ-ɏ]+$" },
    { label: "Nome completo", value: "^[A-Za-zÀ-ɏ]{2,}(\\s[A-Za-zÀ-ɏ]+)+$" },
    { label: "Somente numeros", value: "^[0-9]+$" },
    { label: "Numero inteiro (pos/neg)", value: "^-?[0-9]+$" },
    { label: "Numero decimal (virgula)", value: "^-?[0-9]+,[0-9]+$" },
    { label: "Numero decimal (ponto)", value: "^-?[0-9]+\\.[0-9]+$" },
    { label: "Cartao de credito", value: "^[0-9]{4}[\\s\\-]?[0-9]{4}[\\s\\-]?[0-9]{4}[\\s\\-]?[0-9]{4}$" },
    { label: "CEP", value: "^\\d{5}-?\\d{3}$" },
    { label: "RG", value: "^\\d{1,2}\\.?\\d{3}\\.?\\d{3}-?[0-9Xx]$" },
    { label: "PIS / PASEP", value: "^\\d{3}\\.?\\d{5}\\.?\\d{2}-?\\d$" },
    { label: "Placa Mercosul", value: "^[A-Z]{3}[0-9][A-Z][0-9]{2}$" },
    { label: "Placa antiga (ABC-1234)", value: "^[A-Z]{3}-?[0-9]{4}$" },
    { label: "Placa (Mercosul ou antiga)", value: "^([A-Z]{3}-?[0-9]{4}|[A-Z]{3}[0-9][A-Z][0-9]{2})$" },
    { label: "URL (http/https)", value: "^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)$" },
    { label: "Senha forte (min 8, mai/min/num/especial)", value: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$" },
    { label: "Cor hexadecimal (#RRGGBB)", value: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" },
    { label: "Slug (letras, numeros e hifens)", value: "^[a-z0-9]+(-[a-z0-9]+)*$" },
    { label: "Alfanumerico sem espacos", value: "^[A-Za-z0-9]+$" },
    { label: "Alfanumerico com espacos", value: "^[A-Za-z0-9 ]+$" },
  ];

  // Templates prontos de "Buscar JSON via AJAX" (APIs publicas). Cada preset preenche
  // URL + metodo + mapeamentos (Caminho JSON -> Campo destino) de um botao.
  // readJsonPath do ajax-fill-runtime suporta caminhos aninhados (a.b.c).
  const AJAX_PRESETS = [
    {
      id: "viacep", label: "ViaCEP — busca CEP",
      url: "https://viacep.com.br/ws/{{value}}/json", method: "GET",
      mappings: [
        { key: "logradouro", value: "endereco_rua" },
        { key: "bairro", value: "endereco_bairro" },
        { key: "localidade", value: "endereco_cidade" },
        { key: "uf", value: "endereco_uf" }
      ]
    },
    {
      id: "brasilapi-cep", label: "BrasilAPI — busca CEP",
      url: "https://brasilapi.com.br/api/cep/v2/{{value}}", method: "GET",
      mappings: [
        { key: "street", value: "endereco_rua" },
        { key: "neighborhood", value: "endereco_bairro" },
        { key: "city", value: "endereco_cidade" },
        { key: "state", value: "endereco_uf" }
      ]
    },
    {
      id: "brasilapi-cnpj", label: "BrasilAPI — busca CNPJ",
      url: "https://brasilapi.com.br/api/cnpj/v1/{{value}}", method: "GET",
      mappings: [
        { key: "razao_social", value: "empresa_razao_social" },
        { key: "nome_fantasia", value: "empresa_nome_fantasia" },
        { key: "logradouro", value: "empresa_rua" },
        { key: "bairro", value: "empresa_bairro" },
        { key: "municipio", value: "empresa_cidade" },
        { key: "uf", value: "empresa_uf" },
        { key: "cep", value: "empresa_cep" }
      ]
    },
    {
      id: "brasilapi-banks", label: "BrasilAPI — banco por codigo",
      url: "https://brasilapi.com.br/api/banks/v1/{{value}}", method: "GET",
      mappings: [
        { key: "name", value: "banco_nome" },
        { key: "fullName", value: "banco_nome_completo" },
        { key: "code", value: "banco_codigo" },
        { key: "ispb", value: "banco_ispb" }
      ]
    },
    {
      id: "brasilapi-ddd", label: "BrasilAPI — estado por DDD",
      url: "https://brasilapi.com.br/api/ddd/v1/{{value}}", method: "GET",
      mappings: [
        { key: "state", value: "ddd_estado" }
      ]
    },
    {
      id: "cnpjws", label: "CNPJ.ws publica — busca CNPJ",
      url: "https://publica.cnpj.ws/cnpj/{{value}}", method: "GET",
      mappings: [
        { key: "razao_social", value: "empresa_razao_social" },
        { key: "estabelecimento.nome_fantasia", value: "empresa_nome_fantasia" },
        { key: "estabelecimento.logradouro", value: "empresa_rua" },
        { key: "estabelecimento.bairro", value: "empresa_bairro" },
        { key: "estabelecimento.cidade.nome", value: "empresa_cidade" },
        { key: "estabelecimento.estado.sigla", value: "empresa_uf" },
        { key: "estabelecimento.cep", value: "empresa_cep" }
      ]
    },
    {
      // A chave do JSON e sem hifen (ex: USD-BRL -> "USDBRL"). Para outros pares,
      // ajuste a chave do mapeamento removendo o hifen.
      id: "awesomeapi-cotacao", label: "AwesomeAPI — cotacao (ex: USD-BRL)",
      url: "https://economia.awesomeapi.com.br/last/{{value}}", method: "GET",
      mappings: [
        { key: "USDBRL.bid", value: "cotacao_valor" },
        { key: "USDBRL.name", value: "cotacao_nome" },
        { key: "USDBRL.pctChange", value: "cotacao_variacao" }
      ]
    }
  ];

  window.TemplateBuilderData = {
    PATTERN_TEMPLATES: PATTERN_TEMPLATES,
    AJAX_PRESETS: AJAX_PRESETS
  };
}());
