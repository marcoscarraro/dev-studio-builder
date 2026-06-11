const PEDIDO_COMPRA = window.PEDIDO_COMPRA || {};
window.PEDIDO_COMPRA = PEDIDO_COMPRA;

PEDIDO_COMPRA.masks = {};
PEDIDO_COMPRA.data = {
	fornecedores: [],
	produtos: [],
	transportadoras: [],
	condicoes: [],
	formas: [],
	contas: [],
	centros: [],
	planos: [],
	naturezas: [],
	pedidoMock: null,
	xmlImportado: null,
	fatorRow: null
};

$(document).ready(function () {
	PEDIDO_COMPRA.init();
});

PEDIDO_COMPRA.init = function () {
	PEDIDO_COMPRA.initializeComponents();
	PEDIDO_COMPRA.bindEvents();
	PEDIDO_COMPRA.loadInitialData();
};

PEDIDO_COMPRA.initializeComponents = function () {
	PEDIDO_COMPRA.initTomSelects("#formPedidoCompra");
	PEDIDO_COMPRA.initMasks();
	PEDIDO_COMPRA.setDefaultDates();
	PEDIDO_COMPRA.calcularTotais();
};

PEDIDO_COMPRA.bindEvents = function () {
	$("#formPedidoCompra").on("submit", function (event) {
		event.preventDefault();
		var submitter = event.originalEvent && event.originalEvent.submitter ? "#" + event.originalEvent.submitter.id : "#btnFooterSalvarCompra";
		PEDIDO_COMPRA.salvarFormulario(submitter);
	});

	$("#btnAdicionarProduto").on("click", PEDIDO_COMPRA.adicionarProduto);
	$("#btnImportarXml, #btnProcessarXml").on("click", PEDIDO_COMPRA.importarXml);
	$("#btnGerarParcelas").on("click", PEDIDO_COMPRA.gerarParcelas);
	$("#btnAdicionarParcela").on("click", PEDIDO_COMPRA.adicionarParcelaManual);
	$("#btnReceberMercadoria, #btnFooterReceberMercadoria").on("click", PEDIDO_COMPRA.receberMercadoria);
	$("#btnSalvarRascunho").on("click", function () { PEDIDO_COMPRA.salvarFormulario("#btnSalvarRascunho"); });
	$("#btnConfirmarImportacao").on("click", PEDIDO_COMPRA.confirmarImportacao);
	$("#btnCancelarImportacao").on("click", PEDIDO_COMPRA.cancelarImportacao);
	$("#btnSalvarNovoFator").on("click", PEDIDO_COMPRA.salvarNovoFator);
	$("#fornecedorId").on("change", PEDIDO_COMPRA.preencherFornecedorSelecionado);
	$("#situacao").on("change", PEDIDO_COMPRA.atualizarBadgeSituacao);
	$("#frete, #seguro, #despesas").on("input", PEDIDO_COMPRA.calcularTotais);
	$("#chaveAcesso").on("input blur", PEDIDO_COMPRA.validarChaveAcesso);
	$("#pedidoCompraItens").on("change", ".item-produto", PEDIDO_COMPRA.preencherProdutoSelecionado);
	$("#pedidoCompraItens").on("change", ".item-fator", PEDIDO_COMPRA.alterarFatorConversao);
	$("#pedidoCompraItens").on("input", ".item-quantidade-xml, .item-unitario", PEDIDO_COMPRA.calcularTotais);
	$("#pedidoCompraItens").on("click", ".btn-remover-produto", PEDIDO_COMPRA.removerProduto);
	$("#pedidoCompraItens").on("click", ".btn-criar-produto", PEDIDO_COMPRA.abrirCriarProduto);
	$("#pedidoCompraItens").on("click", ".btn-vincular-produto", PEDIDO_COMPRA.focarProdutoErp);
	$("#pedidoCompraParcelas").on("input change", ".parcela-valor", PEDIDO_COMPRA.validarParcelas);
	$("#pedidoCompraParcelas").on("click", ".btn-remover-parcela", PEDIDO_COMPRA.removerParcela);
};

PEDIDO_COMPRA.loadInitialData = function () {
	HELPER.ajaxGet("../mock/fornecedores.json", {
		success: function (response) {
			PEDIDO_COMPRA.data.fornecedores = PEDIDO_COMPRA.normalizeRows(response);
			PEDIDO_COMPRA.data.transportadoras = PEDIDO_COMPRA.data.fornecedores;
			PEDIDO_COMPRA.refreshSelect("#fornecedorId", PEDIDO_COMPRA.data.fornecedores);
			PEDIDO_COMPRA.refreshSelect("#transportadoraId", PEDIDO_COMPRA.data.transportadoras);
			PEDIDO_COMPRA.preencherMock(PEDIDO_COMPRA.data.pedidoMock || {});
		}
	});

	HELPER.ajaxGet("../mock/produtos.json", {
		success: function (response) {
			PEDIDO_COMPRA.data.produtos = PEDIDO_COMPRA.normalizeRows(response);
			PEDIDO_COMPRA.adicionarProduto();
		}
	});

	HELPER.ajaxGet("../mock/pedido-compra.json", {
		success: function (response) {
			var data = response.data || {};
			PEDIDO_COMPRA.data.condicoes = data.condicoes_pagamento || [];
			PEDIDO_COMPRA.data.formas = data.formas_pagamento || [];
			PEDIDO_COMPRA.data.contas = data.contas_financeiras || [];
			PEDIDO_COMPRA.data.centros = data.centros_custo || [];
			PEDIDO_COMPRA.data.planos = data.planos_contas || [];
			PEDIDO_COMPRA.data.naturezas = data.naturezas_operacao || [];

			PEDIDO_COMPRA.refreshSelect("#condicaoPagamento", PEDIDO_COMPRA.data.condicoes);
			PEDIDO_COMPRA.refreshSelect("#formaPagamento", PEDIDO_COMPRA.data.formas);
			PEDIDO_COMPRA.refreshSelect("#contaFinanceira", PEDIDO_COMPRA.data.contas);
			PEDIDO_COMPRA.refreshSelect("#centroCusto", PEDIDO_COMPRA.data.centros);
			PEDIDO_COMPRA.refreshSelect("#planoContas", PEDIDO_COMPRA.data.planos);
			PEDIDO_COMPRA.refreshSelect("#naturezaOperacao", PEDIDO_COMPRA.data.naturezas);
			PEDIDO_COMPRA.data.pedidoMock = data.pedido || {};
			PEDIDO_COMPRA.preencherMock(PEDIDO_COMPRA.data.pedidoMock);
			PEDIDO_COMPRA.gerarParcelas();
		}
	});
};

PEDIDO_COMPRA.adicionarProduto = function (produto) {
	produto = produto || {};
	var fatores = produto.fatores_conversao || [
		{ id: "sem_conversao", descricao: "Sem conversao", multiplicador: 1 }
	];
	var fatorOptions = fatores.map(function (fator, index) {
		var id = fator.id || ("fator_" + index);
		var multiplicador = fator.multiplicador || 1;
		return '<option value="' + PEDIDO_COMPRA.escapeHtml(id) + '" data-multiplicador="' + multiplicador + '">' + PEDIDO_COMPRA.escapeHtml(fator.descricao || "Sem conversao") + "</option>";
	}).join("") + '<option value="novo_fator" data-multiplicador="1">Novo fator...</option>';
	var produtoEncontrado = produto.produto_encontrado || null;
	var quantidade = produto.quantidade_xml || produto.quantidade || 1;
	var unitario = produto.valor_unitario || produto.custo || 0;
	var total = produto.valor_total || (PEDIDO_COMPRA.parseNumber(quantidade) * PEDIDO_COMPRA.parseNumber(unitario));
	var produtoBadge = produtoEncontrado ? '<span class="badge bg-success-lt mt-2">Produto vinculado</span>' : '<span class="badge bg-warning-lt mt-2">Produto nao encontrado</span>';
	var row = "" +
		"<tr>" +
			'<td data-label="Produto XML"><input type="text" class="form-control item-descricao-xml" value="' + PEDIDO_COMPRA.escapeHtml(produto.descricao_xml || produto.descricao || "") + '"><div class="text-secondary small mt-1">Historico XML preservado</div></td>' +
			'<td data-label="Codigo fornecedor"><input type="text" class="form-control item-codigo-fornecedor" value="' + PEDIDO_COMPRA.escapeHtml(produto.codigo_fornecedor || produto.codigo || "") + '"></td>' +
			'<td data-label="Produto ERP"><select class="form-select item-produto" data-placeholder="Buscar produto ERP"><option value="">Selecione...</option></select>' + produtoBadge + '<div class="btn-list mt-2"><button type="button" class="btn btn-outline-primary btn-sm btn-vincular-produto">Vincular</button><button type="button" class="btn btn-outline-secondary btn-sm btn-criar-produto">Criar</button></div></td>' +
			'<td data-label="Quantidade XML"><input type="number" class="form-control item-quantidade-xml" min="0.001" step="0.001" value="' + quantidade + '"></td>' +
			'<td data-label="Fator conversao"><select class="form-select item-fator">' + fatorOptions + '</select></td>' +
			'<td data-label="Quantidade final"><input type="text" class="form-control item-quantidade-final" value="0" readonly></td>' +
			'<td data-label="Unitario"><input type="text" class="form-control item-unitario" value="' + PEDIDO_COMPRA.formatNumber(unitario) + '"></td>' +
			'<td data-label="Total"><strong class="item-total">' + PEDIDO_COMPRA.formatCurrency(total) + '</strong></td>' +
			'<td data-label="Estoque entrada"><input type="text" class="form-control item-estoque-entrada" value="0" readonly></td>' +
			'<td data-label="Acoes" class="text-end"><button type="button" class="btn btn-icon btn-outline-danger btn-remover-produto" aria-label="Remover produto">x</button></td>' +
		"</tr>";

	$("#pedidoCompraItens").append(row);
	var $row = $("#pedidoCompraItens tr").last();
	PEDIDO_COMPRA.initProductSelect($row.find(".item-produto").get(0));
	PEDIDO_COMPRA.initMoneyInput($row.find(".item-unitario").get(0));

	if (produto.produto_id || (produtoEncontrado && produtoEncontrado.id)) {
		if (produtoEncontrado && produtoEncontrado.id) {
			PEDIDO_COMPRA.ensureRemoteOption($row.find(".item-produto").get(0), produtoEncontrado.id, produtoEncontrado.nome || produtoEncontrado.text, produto.codigo_fornecedor);
		}
		PEDIDO_COMPRA.setTomValue($row.find(".item-produto").get(0), produto.produto_id || produtoEncontrado.id);
	}

	PEDIDO_COMPRA.calcularTotais();
};

PEDIDO_COMPRA.removerProduto = function () {
	$(this).closest("tr").remove();
	PEDIDO_COMPRA.calcularTotais();
	HELPER.showToast("Produto removido.", "success");
};

PEDIDO_COMPRA.alterarFatorConversao = function () {
	var $row = $(this).closest("tr");

	if ($(this).val() === "novo_fator") {
		PEDIDO_COMPRA.data.fatorRow = $row;
		$("#novoFatorDescricao").val("");
		$("#novoFatorMultiplicador").val("1");
		window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalNovoFator")).show();
		return;
	}

	PEDIDO_COMPRA.calcularTotais();
};

PEDIDO_COMPRA.salvarNovoFator = function () {
	var form = $("#formNovoFator").get(0);
	var $row = PEDIDO_COMPRA.data.fatorRow;

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Informe os dados do fator.", "warning");
		return;
	}

	if (!$row || !$row.length) {
		return;
	}

	var descricao = $("#novoFatorDescricao").val();
	var multiplicador = PEDIDO_COMPRA.parseNumber($("#novoFatorMultiplicador").val()) || 1;
	var id = "novo_" + Date.now();
	var $select = $row.find(".item-fator");

	$select.find('option[value="novo_fator"]').before('<option value="' + id + '" data-multiplicador="' + multiplicador + '">' + PEDIDO_COMPRA.escapeHtml(descricao) + "</option>");
	$select.val(id);
	$(form).removeClass("was-validated");
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalNovoFator")).hide();
	PEDIDO_COMPRA.calcularTotais();
	HELPER.showToast("Fator aplicado ao item.", "success");
};

PEDIDO_COMPRA.abrirCriarProduto = function () {
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalCriarProdutoXml")).show();
};

PEDIDO_COMPRA.focarProdutoErp = function () {
	var select = $(this).closest("tr").find(".item-produto").get(0);

	if (select && select.tomselect) {
		select.tomselect.focus();
	}
};

PEDIDO_COMPRA.calcularTotais = function () {
	var subtotalProdutos = 0;
	var totalDesconto = 0;
	var totalIcms = 0;
	var totalIpi = 0;
	var quantidadeTotal = 0;
	var itensEstoque = 0;

	$("#pedidoCompraItens tr").each(function () {
		var $row = $(this);
		var quantidadeXml = Math.max(PEDIDO_COMPRA.parseNumber($row.find(".item-quantidade-xml").val()), 0);
		var multiplicador = PEDIDO_COMPRA.getRowMultiplicador($row);
		var quantidadeFinal = quantidadeXml * multiplicador;
		var custo = Math.max(PEDIDO_COMPRA.parseNumber($row.find(".item-unitario").val()), 0);
		var base = quantidadeXml * custo;

		$row.find(".item-quantidade-final").val(PEDIDO_COMPRA.formatPlainNumber(quantidadeFinal));
		$row.find(".item-estoque-entrada").val(PEDIDO_COMPRA.formatPlainNumber(quantidadeFinal));
		$row.find(".item-total").text(PEDIDO_COMPRA.formatCurrency(base));
		subtotalProdutos += base;
		quantidadeTotal += quantidadeFinal;
		if ($row.find(".item-produto").val() || $row.find(".item-descricao-xml").val()) {
			itensEstoque += 1;
		}
	});

	var frete = Math.max(PEDIDO_COMPRA.parseNumber($("#frete").val()), 0);
	var seguro = Math.max(PEDIDO_COMPRA.parseNumber($("#seguro").val()), 0);
	var despesas = Math.max(PEDIDO_COMPRA.parseNumber($("#despesas").val()), 0);
	var totalSt = 0;
	var totalNf = Math.max(subtotalProdutos - totalDesconto + frete + seguro + despesas + totalIpi + totalSt, 0);

	$("#totalProdutos").text(PEDIDO_COMPRA.formatCurrency(subtotalProdutos));
	$("#totalDesconto").text(PEDIDO_COMPRA.formatCurrency(totalDesconto));
	$("#totalFrete").text(PEDIDO_COMPRA.formatCurrency(frete));
	$("#totalSeguro").text(PEDIDO_COMPRA.formatCurrency(seguro));
	$("#totalDespesas").text(PEDIDO_COMPRA.formatCurrency(despesas));
	$("#totalIcms").text(PEDIDO_COMPRA.formatCurrency(totalIcms));
	$("#totalIpi").text(PEDIDO_COMPRA.formatCurrency(totalIpi));
	$("#totalSt").text(PEDIDO_COMPRA.formatCurrency(totalSt));
	$("#totalNf").text(PEDIDO_COMPRA.formatCurrency(totalNf));
	$("#totalFinal").text(PEDIDO_COMPRA.formatCurrency(totalNf)).data("value", totalNf);
	$("#estoqueItens").text(itensEstoque);
	$("#estoqueQuantidade").text(PEDIDO_COMPRA.formatPlainNumber(quantidadeTotal));
	$("#estoqueCustoMedio").text(PEDIDO_COMPRA.formatCurrency(quantidadeTotal ? totalNf / quantidadeTotal : 0));

	PEDIDO_COMPRA.validarParcelas();
};

PEDIDO_COMPRA.gerarParcelas = function () {
	var total = PEDIDO_COMPRA.getTotalFinal();
	var quantidade = Math.max(parseInt($("#numeroParcelas").val(), 10) || 1, 1);
	var hoje = PEDIDO_COMPRA.parseDate($("#dataEntrada").val()) || new Date();
	var valorBase = Math.floor((total / quantidade) * 100) / 100;
	var acumulado = 0;

	$("#pedidoCompraParcelas").empty();

	for (var i = 1; i <= quantidade; i++) {
		var valor = i === quantidade ? total - acumulado : valorBase;
		var vencimento = new Date(hoje.getFullYear(), hoje.getMonth() + i - 1, hoje.getDate());
		acumulado += valor;
		PEDIDO_COMPRA.adicionarParcela(i, vencimento, valor, "Aberto");
	}

	PEDIDO_COMPRA.validarParcelas();
};

PEDIDO_COMPRA.importarXml = function (event) {
	if (event) {
		event.preventDefault();
	}

	var button = event && event.currentTarget && event.currentTarget.id ? "#" + event.currentTarget.id : "#btnProcessarXml";
	var file = $("#xml_file").get(0) && $("#xml_file").get(0).files ? $("#xml_file").get(0).files[0] : null;
	if (!file) {
		var tabImportacao = document.querySelector('a[href="#tab-importacao"]');
		if (tabImportacao && window.bootstrap) {
			window.bootstrap.Tab.getOrCreateInstance(tabImportacao).show();
		}
		document.getElementById("cardImportacaoXml").scrollIntoView({ behavior: "smooth", block: "start" });
		$("#xml_file").trigger("focus");
		HELPER.showToast("Selecione um arquivo XML para importar.", "warning");
		return;
	}

	var formData = new FormData();
	formData.append("xml", file);
	$("#xmlImportStatus").val("Enviando XML...");

	HELPER.ajaxPost("/api/compras/importar-xml", formData, {
		button: button,
		processData: false,
		contentType: false,
		silentError: true,
		success: function (response) {
			PEDIDO_COMPRA.renderizarXml(response.data || {});
		},
		error: function () {
			PEDIDO_COMPRA.importarXmlMock();
		}
	});
};

PEDIDO_COMPRA.importarXmlMock = function () {
	HELPER.ajaxGet("../mock/importacao-xml-retorno.json", {
		success: function (response) {
			PEDIDO_COMPRA.renderizarXml(response.data || {});
			HELPER.showToast(response.message || "XML importado com dados simulados.", "success");
		},
		error: function () {
			$("#xmlImportStatus").val("Erro na importacao");
			HELPER.showToast("Nao foi possivel importar o XML.", "danger");
		}
	});
};

PEDIDO_COMPRA.renderizarXml = function (data) {
	PEDIDO_COMPRA.data.xmlImportado = data;
	var nota = data.nota || {};
	var fornecedor = data.fornecedor || {};
	var transportadora = data.transportadora || {};
	var totais = data.totais || {};

	$("#xmlImportStatus").val("XML importado para conferencia");
	$("#numeroNfe").val(nota.numero || "");
	$("#serieNfe").val(nota.serie || "");
	$("#chaveAcesso").val(nota.chave || "").trigger("blur");
	$("#dataEmissaoNfe").val(nota.data_emissao || "");
	$("#dataEmissao").val(nota.data_emissao || $("#dataEmissao").val());
	$("#dataEntrada").val(new Date().toISOString().substring(0, 10));

	PEDIDO_COMPRA.ensureRemoteOption("#fornecedorId", fornecedor.id, fornecedor.nome, fornecedor.cnpj);
	PEDIDO_COMPRA.setTomValue("#fornecedorId", fornecedor.id);
	$("#fornecedorRazao").val(fornecedor.nome || "");
	$("#fornecedorDocumento").val(fornecedor.cnpj || "");
	$("#fornecedorIe").val(fornecedor.ie || "");
	$("#fornecedorEndereco").val(fornecedor.endereco || "");
	$("#fornecedorCidade").val(fornecedor.cidade || "");
	$("#fornecedorUf").val(fornecedor.uf || "");

	PEDIDO_COMPRA.ensureRemoteOption("#transportadoraId", transportadora.id, transportadora.nome, transportadora.cnpj);
	PEDIDO_COMPRA.setTomValue("#transportadoraId", transportadora.id);

	$("#pedidoCompraItens").empty();
	(data.itens || []).forEach(PEDIDO_COMPRA.adicionarProduto);

	$("#pedidoCompraParcelas").empty();
	(data.parcelas || []).forEach(function (parcela, index) {
		PEDIDO_COMPRA.adicionarParcela(parcela.numero || (index + 1), PEDIDO_COMPRA.parseDate(parcela.vencimento) || new Date(), PEDIDO_COMPRA.parseNumber(parcela.valor), "Aberto", parcela);
	});
	$("#numeroParcelas").val((data.parcelas || []).length || 1);

	$("#frete").val(PEDIDO_COMPRA.formatNumber(totais.frete || 0));
	$("#seguro").val(PEDIDO_COMPRA.formatNumber(totais.seguro || 0));
	$("#despesas").val(PEDIDO_COMPRA.formatNumber(totais.outras_despesas || 0));

	PEDIDO_COMPRA.calcularTotais();
	PEDIDO_COMPRA.validarParcelas();
	HELPER.showToast("XML importado. Revise vinculos, fatores e parcelas antes de confirmar.", "success");
};

PEDIDO_COMPRA.confirmarImportacao = function () {
	if (!PEDIDO_COMPRA.validarItens() || !PEDIDO_COMPRA.validarParcelas()) {
		return;
	}

	HELPER.ajaxPost("/api/compras/importar-xml/confirmar", PEDIDO_COMPRA.coletarPayload(), {
		button: "#btnConfirmarImportacao",
		silentError: true,
		success: function (response) {
			var id = response && response.data && response.data.pedido_id ? response.data.pedido_id : 123;
			window.location.href = "./pedido-compra-form.html?id=" + id;
		},
		error: function () {
			HELPER.showToast("Importacao confirmada no prototipo. Pedido, estoque e financeiro seriam gerados pelo backend.", "success");
		}
	});
};

PEDIDO_COMPRA.cancelarImportacao = function () {
	$("#xml_file").val("");
	$("#xmlImportStatus").val("Aguardando XML");
	PEDIDO_COMPRA.data.xmlImportado = null;
	HELPER.showToast("Importacao cancelada.", "success");
};

PEDIDO_COMPRA.salvarFormulario = function (button) {
	var form = $("#formPedidoCompra").get(0);

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Revise os campos obrigatorios.", "warning");
		return;
	}

	if (!PEDIDO_COMPRA.validarChaveAcesso() || !PEDIDO_COMPRA.validarItens() || !PEDIDO_COMPRA.validarParcelas()) {
		return;
	}

	$(form).removeClass("was-validated");

	var id = PEDIDO_COMPRA.getUrlParam("id");
	var request = id ? HELPER.ajaxPut : HELPER.ajaxPost;
	var url = id ? "/api/compras/pedidos/" + id : "/api/compras/pedidos";

	request(url, PEDIDO_COMPRA.coletarPayload(), {
		button: button,
		form: "#formPedidoCompra",
		success: function () {
			HELPER.showToast("Pedido de compra salvo com sucesso.", "success");
		},
		error: function () {
			HELPER.showToast("Nao foi possivel salvar agora. Os dados foram mantidos na tela.", "danger");
		}
	});
};

PEDIDO_COMPRA.preencherFornecedorSelecionado = function () {
	var fornecedor = PEDIDO_COMPRA.findById(PEDIDO_COMPRA.data.fornecedores, $("#fornecedorId").val());
	var endereco = fornecedor ? fornecedor.endereco || "" : "";
	var cidadeUf = endereco.match(/,\s*([^,\/]+)\/([A-Z]{2})$/);

	$("#fornecedorRazao").val(fornecedor ? fornecedor.text : "");
	$("#fornecedorDocumento").val(fornecedor ? fornecedor.documento : "");
	$("#fornecedorIe").val(fornecedor ? fornecedor.ie || "ISENTO" : "");
	$("#fornecedorEndereco").val(endereco);
	$("#fornecedorCidade").val(cidadeUf ? cidadeUf[1] : "");
	$("#fornecedorUf").val(cidadeUf ? cidadeUf[2] : "");
	$("#fornecedorCondicao").val(fornecedor ? fornecedor.condicao_pagamento || "30/60/90 dias" : "");
};

PEDIDO_COMPRA.preencherProdutoSelecionado = function () {
	var $row = $(this).closest("tr");
	var produto = PEDIDO_COMPRA.findById(PEDIDO_COMPRA.data.produtos, $(this).val());

	if (!produto) {
		return;
	}

	$row.find(".badge").removeClass("bg-warning-lt").addClass("bg-success-lt").text("Produto vinculado");
	$row.find(".item-codigo-fornecedor").val($row.find(".item-codigo-fornecedor").val() || produto.sku || produto.ean13 || "");
	if (!PEDIDO_COMPRA.parseNumber($row.find(".item-unitario").val())) {
		$row.find(".item-unitario").val(PEDIDO_COMPRA.formatNumber(produto.preco_custo_numero || 0));
	}
	PEDIDO_COMPRA.calcularTotais();
};

PEDIDO_COMPRA.receberMercadoria = function () {
	if (!PEDIDO_COMPRA.validarItens()) {
		return;
	}

	$("#situacao").val("recebido").trigger("change");
	HELPER.showToast("Recebimento marcado. O backend processara estoque, lotes e custo medio.", "success");
};

PEDIDO_COMPRA.validarChaveAcesso = function () {
	var $input = $("#chaveAcesso");
	var digits = PEDIDO_COMPRA.onlyDigits($input.val());

	if (!digits) {
		$input.removeClass("is-invalid");
		return true;
	}

	var valid = digits.length === 44;
	$input.toggleClass("is-invalid", !valid);

	if (!valid) {
		HELPER.showToast("A chave de acesso da NF-e deve possuir 44 digitos.", "warning");
	}

	return valid;
};

PEDIDO_COMPRA.validarItens = function () {
	if (!$("#pedidoCompraItens tr").length || PEDIDO_COMPRA.getTotalFinal() <= 0) {
		HELPER.showToast("Adicione ao menos um produto com custo informado.", "warning");
		return false;
	}

	return true;
};

PEDIDO_COMPRA.validarParcelas = function () {
	var total = PEDIDO_COMPRA.getTotalFinal();
	var soma = 0;

	$("#pedidoCompraParcelas .parcela-valor").each(function () {
		soma += PEDIDO_COMPRA.parseNumber($(this).val());
	});

	var saldo = total - soma;
	var ok = Math.abs(saldo) < 0.01 || !$("#pedidoCompraParcelas tr").length;

	$("#alertParcelas").toggleClass("d-none", ok);
	$("#alertParcelasOk").toggleClass("d-none", !ok);
	$("#saldoParcelas").text(PEDIDO_COMPRA.formatCurrency(saldo));

	return ok;
};

PEDIDO_COMPRA.adicionarParcelaManual = function () {
	PEDIDO_COMPRA.adicionarParcela($("#pedidoCompraParcelas tr").length + 1, new Date(), 0, "Aberto");
	PEDIDO_COMPRA.validarParcelas();
};

PEDIDO_COMPRA.adicionarParcela = function (numero, vencimento, valor, status, parcela) {
	parcela = parcela || {};
	var row = "" +
		"<tr>" +
			'<td><span class="badge bg-blue-lt">Parcela ' + numero + "</span></td>" +
			'<td><input type="date" class="form-control parcela-vencimento" value="' + PEDIDO_COMPRA.formatDateInput(vencimento) + '"></td>' +
			'<td><input type="text" class="form-control parcela-valor" value="' + PEDIDO_COMPRA.formatNumber(valor) + '"></td>' +
			'<td><select class="form-select parcela-plano"><option>Compra de Mercadorias</option><option>Materiais de Uso e Consumo</option><option>Servicos Tomados</option></select></td>' +
			'<td><select class="form-select parcela-conta"><option>Banco Principal - Conta Movimento</option><option>Caixa Administrativo</option><option>Conta PIX Compras</option></select></td>' +
			'<td><select class="form-select parcela-status"><option>Aberto</option><option>Pago</option><option>Parcial</option><option>Vencido</option><option>Cancelado</option></select></td>' +
			'<td class="text-end"><button type="button" class="btn btn-icon btn-outline-danger btn-remover-parcela" aria-label="Remover parcela">x</button></td>' +
		"</tr>";

	$("#pedidoCompraParcelas").append(row);
	var $row = $("#pedidoCompraParcelas tr").last();
	$row.find(".parcela-status").val(status || "Aberto");
	$row.find(".parcela-plano").val(parcela.plano_contas || "Compra de Mercadorias");
	$row.find(".parcela-conta").val(parcela.conta_banco || "Banco Principal - Conta Movimento");
	PEDIDO_COMPRA.initMoneyInput($row.find(".parcela-valor").get(0));
};

PEDIDO_COMPRA.removerParcela = function () {
	$(this).closest("tr").remove();
	PEDIDO_COMPRA.renumerarParcelas();
	PEDIDO_COMPRA.validarParcelas();
};

PEDIDO_COMPRA.atualizarBadgeSituacao = function () {
	var classes = {
		aberto: "badge bg-blue-lt",
		recebido_parcial: "badge bg-azure-lt",
		recebido: "badge bg-green-lt",
		faturado: "badge bg-purple-lt",
		cancelado: "badge bg-danger-lt"
	};

	$("#badgeSituacao").attr("class", classes[$("#situacao").val()] || "badge bg-secondary-lt").text($("#situacao option:selected").text());
};

PEDIDO_COMPRA.preencherMock = function (pedido) {
	if (!pedido.numero) {
		return;
	}

	$("#numeroPedidoCompra").val(pedido.numero);
	$("#situacao").val(pedido.situacao || "aberto").trigger("change");
	PEDIDO_COMPRA.setTomValue("#fornecedorId", pedido.fornecedor_id);
	PEDIDO_COMPRA.setTomValue("#condicaoPagamento", pedido.condicao_pagamento);
	PEDIDO_COMPRA.setTomValue("#formaPagamento", pedido.forma_pagamento);
	PEDIDO_COMPRA.setTomValue("#contaFinanceira", pedido.conta_financeira);
	PEDIDO_COMPRA.setTomValue("#centroCusto", pedido.centro_custo);
	PEDIDO_COMPRA.setTomValue("#planoContas", pedido.plano_contas);
	PEDIDO_COMPRA.preencherFornecedorSelecionado();
};

PEDIDO_COMPRA.coletarPayload = function () {
	var payload = {};

	$("#formPedidoCompra").serializeArray().forEach(function (field) {
		payload[field.name] = field.value;
	});

	payload.total = PEDIDO_COMPRA.getTotalFinal();
	payload.itens = [];
	payload.parcelas = [];

	$("#pedidoCompraItens tr").each(function () {
		var $row = $(this);
		payload.itens.push({
			produto_id: $row.find(".item-produto").val(),
			descricao_xml: $row.find(".item-descricao-xml").val(),
			codigo_fornecedor: $row.find(".item-codigo-fornecedor").val(),
			quantidade_xml: PEDIDO_COMPRA.parseNumber($row.find(".item-quantidade-xml").val()),
			fator_conversao: $row.find(".item-fator").val(),
			fator_multiplicador: PEDIDO_COMPRA.getRowMultiplicador($row),
			quantidade_final: PEDIDO_COMPRA.parseNumber($row.find(".item-quantidade-final").val()),
			estoque_entrada: PEDIDO_COMPRA.parseNumber($row.find(".item-estoque-entrada").val()),
			valor_unitario: PEDIDO_COMPRA.parseNumber($row.find(".item-unitario").val()),
			valor_total: PEDIDO_COMPRA.parseNumber($row.find(".item-total").text())
		});
	});

	$("#pedidoCompraParcelas tr").each(function (index) {
		payload.parcelas.push({
			parcela: index + 1,
			vencimento: $(this).find(".parcela-vencimento").val(),
			valor: PEDIDO_COMPRA.parseNumber($(this).find(".parcela-valor").val()),
			plano_contas: $(this).find(".parcela-plano").val(),
			conta_banco: $(this).find(".parcela-conta").val(),
			status: $(this).find(".parcela-status").val()
		});
	});

	return payload;
};

PEDIDO_COMPRA.initTomSelects = function (context) {
	if (!window.TomSelect) {
		return;
	}

	$(context).find("select[data-tomselect]").each(function () {
		var select = this;

		if (select.tomselect) {
			return;
		}

		new window.TomSelect(select, {
			plugins: ["dropdown_input", "clear_button"],
			copyClassesToDropdown: false,
			controlInput: "<input>",
			dropdownParent: "body",
			valueField: "id",
			labelField: "text",
			searchField: ["text", "documento", "codigo", "sku", "ean13"],
			placeholder: $(select).data("placeholder") || "",
			preload: true,
			load: HELPER.debounce(function (query, callback) {
				callback(PEDIDO_COMPRA.filterOptions(PEDIDO_COMPRA.getOptionsForSelect(select.id), query));
			}, 300)
		});
	});
};

PEDIDO_COMPRA.initProductSelect = function (select) {
	if (!window.TomSelect || !select || select.tomselect) {
		return;
	}

	new window.TomSelect(select, {
		plugins: ["dropdown_input", "clear_button"],
		copyClassesToDropdown: false,
		controlInput: "<input>",
		dropdownParent: "body",
		valueField: "id",
		labelField: "text",
		searchField: ["text", "produto", "sku", "ean13", "referencia"],
		placeholder: "Buscar produto",
		options: PEDIDO_COMPRA.normalizeProductOptions(PEDIDO_COMPRA.data.produtos),
		preload: true,
		load: HELPER.debounce(function (query, callback) {
			callback(PEDIDO_COMPRA.filterOptions(PEDIDO_COMPRA.normalizeProductOptions(PEDIDO_COMPRA.data.produtos), query));
		}, 300)
	});
};

PEDIDO_COMPRA.initMasks = function () {
	$(".money-field").each(function () {
		PEDIDO_COMPRA.initMoneyInput(this);
	});

	if (window.IMask && document.getElementById("chaveAcesso")) {
		PEDIDO_COMPRA.masks.chaveAcesso = window.IMask(document.getElementById("chaveAcesso"), {
			mask: "0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
		});
	}
};

PEDIDO_COMPRA.initMoneyInput = function (element) {
	if (!window.IMask || !element || element.dataset.masked === "1") {
		return;
	}

	element.dataset.masked = "1";
	PEDIDO_COMPRA.masks[element.id || ("mask-" + Object.keys(PEDIDO_COMPRA.masks).length)] = window.IMask(element, {
		mask: Number,
		scale: 2,
		signed: false,
		thousandsSeparator: ".",
		padFractionalZeros: true,
		normalizeZeros: true,
		radix: ",",
		mapToRadix: ["."]
	});
};

PEDIDO_COMPRA.setDefaultDates = function () {
	var hoje = new Date().toISOString().substring(0, 10);
	$("#dataEmissao, #dataEntrada, #dataEmissaoNfe").val(hoje);
};

PEDIDO_COMPRA.getOptionsForSelect = function (id) {
	var map = {
		fornecedorId: PEDIDO_COMPRA.data.fornecedores,
		transportadoraId: PEDIDO_COMPRA.data.transportadoras,
		condicaoPagamento: PEDIDO_COMPRA.data.condicoes,
		formaPagamento: PEDIDO_COMPRA.data.formas,
		contaFinanceira: PEDIDO_COMPRA.data.contas,
		centroCusto: PEDIDO_COMPRA.data.centros,
		planoContas: PEDIDO_COMPRA.data.planos,
		naturezaOperacao: PEDIDO_COMPRA.data.naturezas
	};

	return map[id] || [];
};

PEDIDO_COMPRA.refreshSelect = function (selector, rows) {
	var select = $(selector).get(0);

	if (!select || !select.tomselect) {
		return;
	}

	select.tomselect.clearOptions();
	select.tomselect.addOptions(rows || []);
	select.tomselect.refreshOptions(false);
};

PEDIDO_COMPRA.ensureRemoteOption = function (selector, id, text, documento) {
	var select = $(selector).get(0);

	if (!id || !select || !select.tomselect) {
		return;
	}

	if (!select.tomselect.options[String(id)]) {
		select.tomselect.addOption({
			id: id,
			text: text || String(id),
			documento: documento || ""
		});
	}

	select.tomselect.refreshOptions(false);
};

PEDIDO_COMPRA.setTomValue = function (selectorOrElement, value) {
	var select = typeof selectorOrElement === "string" ? $(selectorOrElement).get(0) : selectorOrElement;

	if (select && select.tomselect) {
		select.tomselect.setValue(String(value || ""));
		return;
	}

	$(select).val(value);
};

PEDIDO_COMPRA.normalizeRows = function (response) {
	return response && Array.isArray(response.data) ? response.data : [];
};

PEDIDO_COMPRA.normalizeProductOptions = function (rows) {
	return rows.map(function (row) {
		return $.extend({}, row, { text: row.text || row.produto });
	});
};

PEDIDO_COMPRA.filterOptions = function (items, query) {
	var q = String(query || "").toLowerCase();

	if (!q) {
		return items;
	}

	return items.filter(function (item) {
		return [item.text, item.produto, item.documento, item.codigo, item.sku, item.ean13, item.referencia].join(" ").toLowerCase().indexOf(q) !== -1;
	});
};

PEDIDO_COMPRA.findById = function (items, id) {
	return items.find(function (item) {
		return String(item.id) === String(id);
	});
};

PEDIDO_COMPRA.getTotalFinal = function () {
	return Number($("#totalFinal").data("value") || 0);
};

PEDIDO_COMPRA.getRowMultiplicador = function ($row) {
	var option = $row.find(".item-fator option:selected");
	var multiplicador = Number(option.attr("data-multiplicador") || 1);

	return multiplicador || 1;
};

PEDIDO_COMPRA.renumerarParcelas = function () {
	$("#pedidoCompraParcelas tr").each(function (index) {
		$(this).find(".badge").text("Parcela " + (index + 1));
	});
};

PEDIDO_COMPRA.parseDate = function (value) {
	if (!value) {
		return null;
	}

	var parts = value.split("-");
	return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
};

PEDIDO_COMPRA.formatDateInput = function (date) {
	return date.toISOString().substring(0, 10);
};

PEDIDO_COMPRA.onlyDigits = function (value) {
	return String(value || "").replace(/\D/g, "");
};

PEDIDO_COMPRA.parseNumber = function (value) {
	var normalized = String(value || "").replace(/[^\d,.-]/g, "");

	if (normalized.indexOf(",") !== -1) {
		normalized = normalized.replace(/\./g, "").replace(",", ".");
	}

	var number = parseFloat(normalized);
	return isNaN(number) ? 0 : number;
};

PEDIDO_COMPRA.formatNumber = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
};

PEDIDO_COMPRA.formatPlainNumber = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		maximumFractionDigits: 3
	});
};

PEDIDO_COMPRA.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL"
	});
};

PEDIDO_COMPRA.getUrlParam = function (key) {
	return new URLSearchParams(window.location.search).get(key);
};

PEDIDO_COMPRA.escapeHtml = function (value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};
