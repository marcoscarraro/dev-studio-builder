const NFE = window.NFE || {};
window.NFE = NFE;

NFE.masks = {};
NFE.tableItens = null;
NFE.resolverEndpoint = "/api/nfe/resolver-item";
NFE.useBackendResolver = false;
NFE.data = {
	pessoas: [],
	produtos: [],
	cfops: [],
	naturezas: [],
	formasPagamento: [],
	itens: [],
	parcelas: [],
	destinatarioContexto: null,
	regimeTributario: "Simples Nacional",
	totais: null
};

$(document).ready(function () {
	NFE.init();
});

NFE.init = function () {
	NFE.initializeComponents();
	NFE.bindEvents();
	NFE.loadInitialData();
};

NFE.initializeComponents = function () {
	var now = new Date();

	$("#dataEmissao, #dataSaida").val(now.toISOString().substring(0, 10));
	$("#horaEmissao").val(now.toTimeString().substring(0, 5));
	NFE.initTomSelects("#formNfe");
	NFE.initMasks();
	NFE.initDataTable();
	NFE.atualizarContadores();
	NFE.toggleTransporte();
	NFE.recalcularTotais();
};

NFE.bindEvents = function () {
	$("#numeroNfe").on("input", function () {
		$("#headerNumeroNfe").text($(this).val() || "-");
	});
	$("#serieNfe").on("input", function () {
		$("#headerSerieNfe").text($(this).val() || "-");
	});
	$("#ambienteEmissao").on("change", function () {
		$("#headerAmbienteNfe").text($(this).val());
	});
	$("#tipoOperacao").on("change", function () {
		if ($(this).val() === "Devolucao") {
			$("#finalidadeNfe").val("Devolucao/Retorno");
		}
		NFE.recalcularItensExistentes();
	});
	$("#regimeTributario").on("change", function () {
		NFE.data.regimeTributario = $(this).val();
		NFE.recalcularItensExistentes();
	});
	$("#destinatarioId").on("change", NFE.buscarDestinatario);
	$("#transportadoraId").on("change", NFE.buscarTransportadora);
	$("#produtoAdicionarId").on("change", NFE.preencherProdutoAdicionar);
	$("#btnAdicionarItem").on("click", function () {
		NFE.adicionarItem();
	});
	$("#btnAdicionarParcela").on("click", function () {
		NFE.adicionarParcela();
	});
	$("#btnSalvarRascunhoFooter, #btnSalvarRascunho").on("click", NFE.salvarRascunho);
	$("#btnValidarNfe, #btnValidarNfeFooter").on("click", NFE.validarNfe);
	$("#btnTransmitirNfe, #btnFooterTransmitirNfe").on("click", NFE.transmitirNfe);
	$("#btnHeaderGerarXml").on("click", NFE.gerarXml);
	$("#btnHeaderDanfe").on("click", NFE.visualizarDanfe);
	$("#btnCancelarNfe").on("click", NFE.cancelarNfe);
	$("#btnSimularPessoaSalva").on("click", NFE.simularPessoaSalva);
	$("#modalidadeFrete").on("change", NFE.toggleTransporte);
	$(".totalizador-nfe").on("input change", NFE.recalcularTotais);
	$(".nfe-textarea").on("input", NFE.atualizarContadores);

	$("#tableNfeItens tbody")
		.on("input change", ".item-quantidade, .item-unitario, .item-desconto, .item-cfop", NFE.atualizarItemOperacional)
		.on("click", ".btn-remover-item", function () {
			NFE.removerItem(Number($(this).data("index")));
		})
		.on("click", ".btn-toggle-fiscal", function () {
			NFE.atualizarPainelFiscal(Number($(this).data("index")));
		});

	$(document)
		.on("input change", ".fiscal-field", NFE.marcarAjusteFiscal)
		.on("click", ".btn-recalcular-fiscal", function () {
			NFE.recalcularItemFiscal(Number($(this).data("index")));
		})
		.on("click", ".btn-remover-parcela", function () {
			$(this).closest("tr").remove();
			NFE.renumerarParcelas();
			NFE.validarParcelas();
		})
		.on("input change", ".parcela-forma, .parcela-valor, .parcela-vencimento", NFE.validarParcelas);
};

NFE.loadInitialData = function () {
	var pessoasRequest = HELPER.ajaxGet("../mock/nfe-pessoas.json", {
		success: function (response) {
			NFE.data.pessoas = NFE.normalizePessoas(NFE.normalizeRows(response));
			NFE.refreshSelect("#destinatarioId", NFE.data.pessoas);
			NFE.refreshSelect("#transportadoraId", NFE.data.pessoas);
		}
	});

	var produtosRequest = HELPER.ajaxGet("../mock/nfe-produtos.json", {
		success: function (response) {
			NFE.data.produtos = NFE.normalizeProdutos(NFE.normalizeRows(response));
			NFE.refreshSelect("#produtoAdicionarId", NFE.data.produtos);
		}
	});

	var cfopsRequest = HELPER.ajaxGet("../mock/nfe-cfops.json", {
		success: function (response) {
			NFE.data.cfops = NFE.normalizeRows(response);
			NFE.refreshSelect("#cfopPrincipal", NFE.data.cfops);
		}
	});

	var naturezasRequest = HELPER.ajaxGet("../mock/nfe-naturezas.json", {
		success: function (response) {
			NFE.data.naturezas = NFE.normalizeRows(response);
			NFE.refreshSelect("#naturezaOperacao", NFE.data.naturezas);
		}
	});

	var pagamentosRequest = HELPER.ajaxGet("../mock/nfe-formas-pagamento.json", {
		success: function (response) {
			NFE.data.formasPagamento = NFE.normalizeRows(response);
			NFE.adicionarParcela(1, 0, new Date().toISOString().substring(0, 10));
		}
	});

	$.when(pessoasRequest, produtosRequest, cfopsRequest, naturezasRequest, pagamentosRequest).always(function () {
		if ($("#naturezaOperacao").get(0) && $("#naturezaOperacao").get(0).tomselect && NFE.data.naturezas[0]) {
			$("#naturezaOperacao").get(0).tomselect.setValue(String(NFE.data.naturezas[0].id), true);
		}
		if ($("#cfopPrincipal").get(0) && $("#cfopPrincipal").get(0).tomselect && NFE.data.cfops[0]) {
			$("#cfopPrincipal").get(0).tomselect.setValue(String(NFE.data.cfops[0].id), true);
		}
		NFE.recalcularTotais();
	});
};

NFE.buscarDestinatario = function () {
	var pessoa = NFE.findById(NFE.data.pessoas, $("#destinatarioId").val());

	NFE.renderPessoaResumo("#destinatarioResumo", pessoa);
	NFE.data.destinatarioContexto = pessoa ? {
		uf_destino: pessoa.uf,
		perfil_destinatario: pessoa.indicador_ie === "Contribuinte ICMS" ? "Contribuinte ICMS" : "Consumidor final",
		destinatario_id: pessoa.id
	} : null;

	if (pessoa) {
		$("#consumidorFinal").prop("checked", NFE.data.destinatarioContexto.perfil_destinatario !== "Contribuinte ICMS");
		NFE.recalcularItensExistentes();
	}
};

NFE.buscarCliente = NFE.buscarDestinatario;

NFE.buscarTransportadora = function () {
	var pessoa = NFE.findById(NFE.data.pessoas, $("#transportadoraId").val());

	if (!pessoa) {
		$("#transportadoraResumo").empty();
		return;
	}

	$("#transportadoraResumo").html(
		'<div class="card card-sm bg-light"><div class="card-body">' +
			'<div class="row g-2">' +
				'<div class="col-md-4"><div class="subheader">Razao social</div><div class="fw-medium">' + NFE.escapeHtml(pessoa.nome) + '</div></div>' +
				'<div class="col-md-2"><div class="subheader">CNPJ/CPF</div><div>' + NFE.escapeHtml(pessoa.documento) + '</div></div>' +
				'<div class="col-md-2"><div class="subheader">IE</div><div>' + NFE.escapeHtml(pessoa.ie) + '</div></div>' +
				'<div class="col-md-4"><div class="subheader">Endereco</div><div>' + NFE.escapeHtml(pessoa.endereco_resumo) + '</div></div>' +
			'</div>' +
		'</div></div>'
	);
};

NFE.resolverItemFiscal = function (produtoId, contexto) {
	var produto = NFE.findById(NFE.data.produtos, produtoId);
	var dfd = $.Deferred();

	if (!produto || !contexto) {
		dfd.reject();
		return dfd.promise();
	}

	var payload = {
		produto_id: produtoId,
		tipo_operacao: contexto.tipo_operacao,
		perfil_destinatario: contexto.perfil_destinatario,
		uf_destino: contexto.uf_destino,
		regime_tributario: NFE.getRegimeTributario(),
		cfop: contexto.cfop,
		quantidade: contexto.quantidade,
		valor_unitario: contexto.valor_unitario,
		desconto: contexto.desconto || 0
	};

	if (NFE.useBackendResolver) {
		return HELPER.ajaxPost(NFE.resolverEndpoint, payload);
	}

	var quantidade = Number(contexto.quantidade || 1);
	var unitario = Number(contexto.valor_unitario || produto.preco_venda_numero || 0);
	var desconto = Number(contexto.desconto || 0);
	var base = Math.max((quantidade * unitario) - desconto, 0);
	var fiscal = $.extend(true, {}, produto.fiscal || {});
	var perfilConsumidor = contexto.perfil_destinatario !== "Contribuinte ICMS";
	var regime = NFE.getRegimeTributario();
	var usaCsosn = regime === "MEI" || regime === "Simples Nacional";

	// Simula o retorno do endpoint /api/nfe/resolver-item.
	var response = $.extend({
		produto_id: produto.id,
		descricao: produto.produto || produto.text,
		sku: produto.sku || produto.id,
		ncm: produto.ncm,
		cfop: contexto.cfop || produto.cfop_padrao || "5102",
		unidade: produto.unidade || "UN",
		quantidade: quantidade,
		valor_unitario: unitario,
		desconto: desconto,
		cest: produto.cest || "",
		origem: "0",
		cst_icms: usaCsosn ? null : (perfilConsumidor ? "60" : "00"),
		csosn: usaCsosn ? (fiscal.csosn || "102") : null,
		modalidade_bc: "Valor Operacao",
		base_icms: base,
		aliquota_icms: perfilConsumidor ? 0 : Number(fiscal.aliquota_icms || 18),
		valor_icms: perfilConsumidor ? 0 : Number(fiscal.valor_icms || 0),
		reducao_bc: 0,
		mva: Number(fiscal.mva || 0),
		base_icms_st: Number(fiscal.base_icms_st || 0),
		aliquota_icms_st: Number(fiscal.aliquota_icms_st || 0),
		valor_icms_st: Number(fiscal.valor_icms_st || 0),
		modalidade_bc_st: "Margem Valor Agregado",
		aliquota_fcp: Number(fiscal.aliquota_fcp || 0),
		valor_fcp: Number(fiscal.valor_fcp || 0),
		aliquota_fcp_st: Number(fiscal.aliquota_fcp_st || 0),
		valor_fcp_st: Number(fiscal.valor_fcp_st || 0),
		aliquota_interestadual: contexto.uf_destino === "SP" ? 0 : 12,
		aliquota_interna: Number(fiscal.aliquota_interna || 18),
		valor_difal: Number(fiscal.valor_difal || 0),
		partilha: contexto.uf_destino === "SP" ? "" : "100% destino",
		possui_ipi: regime === "Lucro Presumido" && fiscal.possui_ipi === true,
		cst_ipi: regime === "Lucro Presumido" && fiscal.possui_ipi === true ? (fiscal.cst_ipi || "50") : null,
		enquadramento_ipi: regime === "Lucro Presumido" && fiscal.possui_ipi === true ? (fiscal.enquadramento_ipi || "999") : null,
		aliquota_ipi: regime === "Lucro Presumido" && fiscal.possui_ipi === true ? Number(fiscal.aliquota_ipi || 0) : 0,
		valor_ipi: regime === "Lucro Presumido" && fiscal.possui_ipi === true ? Number(fiscal.valor_ipi || 0) : 0,
		cst_pis: usaCsosn ? (fiscal.cst_pis || "07") : (fiscal.cst_pis || "01"),
		base_pis: base,
		aliquota_pis: usaCsosn ? 0 : Number(fiscal.aliquota_pis || 0.65),
		valor_pis: usaCsosn ? 0 : Number(fiscal.valor_pis || 0),
		cst_cofins: usaCsosn ? (fiscal.cst_cofins || "07") : (fiscal.cst_cofins || "01"),
		base_cofins: base,
		aliquota_cofins: usaCsosn ? 0 : Number(fiscal.aliquota_cofins || 3),
		valor_cofins: usaCsosn ? 0 : Number(fiscal.valor_cofins || 0),
		cbenef: fiscal.cbenef || "",
		motivo_beneficio: fiscal.motivo_beneficio || "",
		tributacao_estadual_id: fiscal.tributacao_estadual_id || 1,
		tributacao_federal_id: fiscal.tributacao_federal_id || 1,
		regra_fiscal_id: fiscal.regra_fiscal_id || 1
	}, fiscal);

	response.regime_tributario = regime;
	response.cst_icms = usaCsosn ? null : (response.cst_icms || "00");
	response.csosn = usaCsosn ? (response.csosn || "102") : null;
	response.possui_ipi = regime === "Lucro Presumido" && response.possui_ipi === true;
	if (usaCsosn) {
		response.cst_pis = response.cst_pis === "04" ? "04" : "07";
		response.aliquota_pis = 0;
		response.valor_pis = 0;
		response.cst_cofins = response.cst_cofins === "04" ? "04" : "07";
		response.aliquota_cofins = 0;
		response.valor_cofins = 0;
		response.cst_ipi = null;
		response.enquadramento_ipi = null;
		response.aliquota_ipi = 0;
		response.valor_ipi = 0;
	} else {
		response.cst_pis = response.cst_pis === "04" ? "04" : "01";
		response.aliquota_pis = response.cst_pis === "04" ? 0 : NFE.toNumber(response.aliquota_pis || 0.65);
		response.cst_cofins = response.cst_cofins === "04" ? "04" : "01";
		response.aliquota_cofins = response.cst_cofins === "04" ? 0 : NFE.toNumber(response.aliquota_cofins || 3);
	}

	window.setTimeout(function () {
		dfd.resolve(response);
	}, 180);

	return dfd.promise();
};

NFE.adicionarItem = function (dadosItem) {
	var produtoId = dadosItem && dadosItem.produto_id ? dadosItem.produto_id : $("#produtoAdicionarId").val();

	if (!NFE.data.destinatarioContexto) {
		HELPER.showToast("Selecione o destinatario antes de adicionar produtos para resolver a tributacao.", "warning");
		return;
	}

	if (!produtoId) {
		HELPER.showToast("Selecione um produto para adicionar.", "warning");
		return;
	}

	var produto = NFE.findById(NFE.data.produtos, produtoId);
	var contexto = $.extend({}, NFE.data.destinatarioContexto, {
		tipo_operacao: $("#tipoOperacao").val(),
		finalidade: $("#finalidadeNfe").val(),
		cfop: $("#cfopPrincipal").val(),
		quantidade: dadosItem && dadosItem.quantidade || NFE.parseNumber($("#itemAdicionarQuantidade").val()),
		valor_unitario: dadosItem && dadosItem.valor_unitario || NFE.parseNumber($("#itemAdicionarValorUnitario").val()) || Number(produto && produto.preco_venda_numero || 0),
		desconto: dadosItem && dadosItem.desconto || 0
	});

	HELPER.setButtonLoading("#btnAdicionarItem", true);
	NFE.resolverItemFiscal(produtoId, contexto).done(function (fiscal) {
		var item = $.extend({}, fiscal, {
			original_fiscal: $.extend(true, {}, fiscal),
			ajustado_manualmente: false,
			erros_validacao: []
		});

		NFE.data.itens.push(item);
		NFE.renderItens();
		NFE.recalcularTotais();
		NFE.limparAdicionarItem();
		HELPER.showToast(NFE.getToastItemAdicionado(item), "success");
	}).always(function () {
		HELPER.setButtonLoading("#btnAdicionarItem", false);
	});
};

NFE.removerItem = function (index) {
	NFE.data.itens.splice(index, 1);
	NFE.renderItens();
	NFE.recalcularTotais();
	HELPER.showToast("Item removido.", "success");
};

NFE.atualizarPainelFiscal = function (index) {
	var row = NFE.tableItens.row(index);
	var item = NFE.data.itens[index];

	if (!item) {
		return;
	}

	if (row.child.isShown()) {
		row.child.hide();
		return;
	}

	row.child(NFE.renderPainelFiscal(index, item)).show();
};

NFE.recalcularTotais = function () {
	var totalProdutos = 0;
	var totalDesconto = 0;
	var frete = NFE.parseNumber($("#freteNfe").val());
	var seguro = NFE.parseNumber($("#seguroNfe").val());
	var outras = NFE.parseNumber($("#outrasDespesasNfe").val());
	var resumo = NFE.emptyTributos();

	NFE.data.itens.forEach(function (item) {
		var bruto = Number(item.quantidade || 0) * Number(item.valor_unitario || 0);
		var total = Math.max(bruto - Number(item.desconto || 0), 0);

		item.valor_total = total;
		totalProdutos += bruto;
		totalDesconto += Number(item.desconto || 0);
		NFE.somarTributosResolvidos(resumo, item);
	});

	NFE.data.totais = {
		produtos: totalProdutos,
		desconto: totalDesconto,
		frete: frete,
		seguro: seguro,
		outras: outras,
		total: totalProdutos - totalDesconto + frete + seguro + outras + resumo.ipi.valor + resumo.icms_st.valor,
		tributos: resumo
	};

	NFE.recalcularResumoFiscal();
	NFE.renderTotais();
	NFE.validarParcelas();
};

NFE.recalcularResumoFiscal = function () {
	var t = NFE.data.totais ? NFE.data.totais.tributos : NFE.emptyTributos();
	var rows = [
		["ICMS", t.icms],
		["ICMS ST", t.icms_st],
		["FCP", t.fcp],
		["DIFAL", t.difal],
		["IPI", t.ipi],
		["PIS", t.pis],
		["COFINS", t.cofins]
	];

	$("#resumoFiscalTabela").html(rows.map(function (row) {
		var aliquotaMedia = row[1].base > 0 ? (row[1].valor / row[1].base) * 100 : 0;
		return '<tr><td>' + row[0] + '</td><td>' + NFE.formatCurrency(row[1].base) + '</td><td>' + NFE.formatPercent(aliquotaMedia) + '</td><td class="text-end fw-medium">' + NFE.formatCurrency(row[1].valor) + '</td></tr>';
	}).join(""));
};

NFE.adicionarParcela = function (numero, valor, vencimento) {
	var index = numero || ($("#nfeParcelas tr").length + 1);
	var total = valor == null ? Math.max(NFE.getTotalNfe() - NFE.getSomaParcelas(), 0) : valor;
	var due = vencimento || new Date().toISOString().substring(0, 10);
	var options = NFE.data.formasPagamento.map(function (item) {
		return '<option value="' + NFE.escapeHtml(item.id) + '">' + NFE.escapeHtml(item.text) + '</option>';
	}).join("");

	$("#nfeParcelas").append(
		'<tr>' +
			'<td><span class="badge bg-blue-lt">Parcela ' + index + '</span></td>' +
			'<td><select class="form-select parcela-forma" required><option value="">Selecione...</option>' + options + '</select></td>' +
			'<td><input type="text" class="form-control parcela-valor" value="' + NFE.formatNumber(total) + '"></td>' +
			'<td><input type="date" class="form-control parcela-vencimento" value="' + due + '"></td>' +
			'<td class="text-end"><button type="button" class="btn btn-icon btn-outline-danger btn-remover-parcela" aria-label="Remover parcela">x</button></td>' +
		'</tr>'
	);

	NFE.initMoneyInput($("#nfeParcelas tr").last().find(".parcela-valor").get(0));
	NFE.validarParcelas();
};

NFE.validarNfe = function () {
	var errors = NFE.validarFormulario();

	if (errors.length) {
		NFE.renderValidationErrors(errors);
		HELPER.showToast("Revise os erros de validacao da NF-e.", "warning");
		return false;
	}

	NFE.renderValidationErrors([]);
	$("#badgeStatusNfe").attr("class", "badge bg-yellow-lt").text("Validando");
	$("#badgeValidacaoFiscal").attr("class", "badge bg-green-lt").text("Validacao fiscal concluida");
	HELPER.showToast("NF-e validada com sucesso.", "success");
	return true;
};

NFE.transmitirNfe = function () {
	if (!NFE.validarNfe()) {
		return;
	}

	HELPER.setButtonLoading("#btnTransmitirNfe", true);
	HELPER.setButtonLoading("#btnFooterTransmitirNfe", true);

	setTimeout(function () {
		HELPER.setButtonLoading("#btnTransmitirNfe", false);
		HELPER.setButtonLoading("#btnFooterTransmitirNfe", false);
		$("#badgeStatusNfe").attr("class", "badge bg-success-lt").text("Autorizada");
		$("#btnSalvarRascunho, #btnTransmitirNfe, #btnSalvarRascunhoFooter, #btnValidarNfeFooter, #btnFooterTransmitirNfe").prop("disabled", true);
		$("#btnHeaderGerarXml, #btnHeaderDanfe, #btnCancelarNfe").removeClass("d-none");
		HELPER.showToast("NF-e transmitida e autorizada no ambiente de homologacao.", "success");
	}, 800);
};

NFE.renderItens = function () {
	NFE.tableItens.clear();
	NFE.data.itens.forEach(function (item, index) {
		NFE.tableItens.row.add([
			index + 1,
			NFE.renderProdutoCell(item),
			'<input type="text" class="form-control form-control-sm item-ncm" value="' + NFE.escapeHtml(item.ncm || "") + '" readonly>',
			'<input type="text" class="form-control form-control-sm item-cfop" data-index="' + index + '" value="' + NFE.escapeHtml(item.cfop || "") + '">',
			'<input type="number" class="form-control form-control-sm item-quantidade" data-index="' + index + '" min="0.001" step="0.001" value="' + NFE.escapeHtml(item.quantidade || 1) + '">',
			NFE.escapeHtml(item.unidade || "UN"),
			'<input type="text" class="form-control form-control-sm item-unitario" data-index="' + index + '" value="' + NFE.formatNumber(item.valor_unitario || 0) + '">',
			'<input type="text" class="form-control form-control-sm item-desconto" data-index="' + index + '" value="' + NFE.formatNumber(item.desconto || 0) + '">',
			'<strong>' + NFE.formatCurrency(item.valor_total || ((item.quantidade || 0) * (item.valor_unitario || 0))) + '</strong>',
			'<button type="button" class="btn btn-icon btn-outline-primary btn-toggle-fiscal" data-index="' + index + '" aria-label="Detalhe fiscal">F</button>',
			'<button type="button" class="btn btn-icon btn-outline-danger btn-remover-item" data-index="' + index + '" aria-label="Remover item">x</button>'
		]);
	});
	NFE.tableItens.draw(false);
	$("#tableNfeItens .item-unitario, #tableNfeItens .item-desconto").each(function () {
		NFE.initMoneyInput(this);
	});
};

NFE.renderProdutoCell = function (item) {
	var badge = item.ajustado_manualmente ? '<span class="badge bg-yellow-lt ms-2">Ajustado manualmente</span>' : "";
	var erros = item.erros_validacao && item.erros_validacao.length ? '<span class="badge bg-danger-lt ms-2" title="' + NFE.escapeHtml(item.erros_validacao.join("; ")) + '">Erro</span>' : "";

	return '<div class="fw-medium">' + NFE.escapeHtml(item.descricao || "") + badge + erros + '</div><div class="text-secondary small">Codigo ' + NFE.escapeHtml(item.sku || item.produto_id) + '</div>';
};

NFE.renderPainelFiscal = function (index, item) {
	var usaCsosn = item.regime_tributario === "MEI" || item.regime_tributario === "Simples Nacional";
	var groups = [
		["ICMS / CSOSN", [["origem", "Origem"], [usaCsosn ? "csosn" : "cst_icms", usaCsosn ? "CSOSN" : "CST ICMS"], ["modalidade_bc", "Modalidade BC"], ["base_icms", "Base"], ["aliquota_icms", "Aliquota"], ["valor_icms", "Valor"], ["reducao_bc", "Reducao BC"]]],
		["ST", [["mva", "MVA"], ["base_icms_st", "Base calc. ST"], ["aliquota_icms_st", "Aliquota ST"], ["valor_icms_st", "Valor ST"], ["modalidade_bc_st", "Modalidade BC ST"]]],
		["FCP", [["aliquota_fcp", "Aliquota FCP"], ["valor_fcp", "Valor FCP"], ["aliquota_fcp_st", "Aliquota FCP-ST"], ["valor_fcp_st", "Valor FCP-ST"]]],
		["DIFAL", [["aliquota_interestadual", "Aliquota interestadual"], ["aliquota_interna", "Aliquota interna"], ["valor_difal", "Valor DIFAL"], ["partilha", "Partilha"]]],
		["PIS", [["cst_pis", "CST PIS"], ["base_pis", "Base calc."], ["aliquota_pis", "Aliquota"], ["valor_pis", "Valor"]]],
		["COFINS", [["cst_cofins", "CST COFINS"], ["base_cofins", "Base calc."], ["aliquota_cofins", "Aliquota"], ["valor_cofins", "Valor"]]],
		["Beneficio fiscal", [["cbenef", "cBenef"], ["motivo_beneficio", "Motivo"]]]
	];

	if (item.possui_ipi === true) {
		groups.splice(4, 0, ["IPI", [["cst_ipi", "CST IPI"], ["enquadramento_ipi", "Enquadramento"], ["aliquota_ipi", "Aliquota"], ["valor_ipi", "Valor"]]]);
	}

	return '<div class="p-3 bg-light">' +
		'<div class="d-flex justify-content-between align-items-center mb-3"><div class="fw-bold">Detalhe fiscal do item</div><button type="button" class="btn btn-sm btn-outline-primary btn-recalcular-fiscal" data-index="' + index + '">Recalcular</button></div>' +
		groups.map(function (group) {
			return '<div class="mb-3"><div class="subheader mb-2">' + group[0] + '</div><div class="row g-2">' + group[1].map(function (field) {
				return '<div class="col-12 col-md-3 col-xl-2"><label class="form-label">' + field[1] + '</label><input type="text" class="form-control form-control-sm fiscal-field" data-index="' + index + '" data-field="' + field[0] + '" value="' + NFE.escapeHtml(item[field[0]] == null ? "" : item[field[0]]) + '"></div>';
			}).join("") + '</div></div>';
		}).join("") +
	'</div>';
};

NFE.atualizarItemOperacional = function () {
	var $input = $(this);
	var index = Number($input.data("index"));
	var item = NFE.data.itens[index];

	if (!item) {
		return;
	}

	item.cfop = $input.closest("tr").find(".item-cfop").val();
	item.quantidade = NFE.parseNumber($input.closest("tr").find(".item-quantidade").val());
	item.valor_unitario = NFE.parseNumber($input.closest("tr").find(".item-unitario").val());
	item.desconto = NFE.parseNumber($input.closest("tr").find(".item-desconto").val());
	NFE.recalcularItemFiscal(index);
};

NFE.marcarAjusteFiscal = function () {
	var index = Number($(this).data("index"));
	var field = $(this).data("field");
	var item = NFE.data.itens[index];

	if (!item) {
		return;
	}

	item[field] = $(this).val();
	item.ajustado_manualmente = true;
	NFE.renderItens();
	NFE.recalcularTotais();
};

NFE.recalcularItemFiscal = function (index) {
	var item = NFE.data.itens[index];

	if (!item || !NFE.data.destinatarioContexto) {
		return;
	}

	var contexto = $.extend({}, NFE.data.destinatarioContexto, {
		tipo_operacao: $("#tipoOperacao").val(),
		finalidade: $("#finalidadeNfe").val(),
		cfop: item.cfop,
		quantidade: item.quantidade,
		valor_unitario: item.valor_unitario,
		desconto: item.desconto
	});

	NFE.resolverItemFiscal(item.produto_id, contexto).done(function (fiscal) {
		NFE.data.itens[index] = $.extend({}, fiscal, {
			original_fiscal: $.extend(true, {}, fiscal),
			ajustado_manualmente: false,
			erros_validacao: []
		});
		NFE.renderItens();
		NFE.recalcularTotais();
	});
};

NFE.recalcularItensExistentes = function () {
	NFE.data.itens.forEach(function (item, index) {
		if (!item.ajustado_manualmente) {
			NFE.recalcularItemFiscal(index);
		}
	});
};

NFE.preencherProdutoAdicionar = function () {
	var produto = NFE.findById(NFE.data.produtos, $("#produtoAdicionarId").val());

	if (produto) {
		$("#itemAdicionarValorUnitario").val(NFE.formatNumber(produto.preco_venda_numero || 0));
	}
};

NFE.limparAdicionarItem = function () {
	if ($("#produtoAdicionarId").get(0) && $("#produtoAdicionarId").get(0).tomselect) {
		$("#produtoAdicionarId").get(0).tomselect.clear(true);
	}
	$("#itemAdicionarQuantidade").val("1");
	$("#itemAdicionarValorUnitario").val("0,00");
};

NFE.renderPessoaResumo = function (selector, pessoa) {
	if (!pessoa) {
		$(selector).html('<div class="col-12"><div class="alert alert-info mb-0">Selecione uma pessoa cadastrada para carregar UF, indicador IE e endereco fiscal.</div></div>');
		return;
	}

	$(selector).html(
		'<div class="col-12"><div class="card bg-light"><div class="card-body"><div class="row g-3">' +
			'<div class="col-md-4"><div class="subheader">Nome/Razao social</div><div class="fw-bold">' + NFE.escapeHtml(pessoa.nome) + '</div><div class="text-secondary">' + NFE.escapeHtml(pessoa.fantasia || "") + '</div></div>' +
			'<div class="col-md-2"><div class="subheader">CPF/CNPJ</div><div>' + NFE.escapeHtml(pessoa.documento) + '</div></div>' +
			'<div class="col-md-2"><div class="subheader">IE</div><div>' + NFE.escapeHtml(pessoa.ie) + '</div><div class="text-secondary">' + NFE.escapeHtml(pessoa.indicador_ie) + '</div></div>' +
			'<div class="col-md-2"><div class="subheader">Telefone</div><div>' + NFE.escapeHtml(pessoa.telefone) + '</div><div class="text-secondary">' + NFE.escapeHtml(pessoa.email) + '</div></div>' +
			'<div class="col-md-2"><div class="subheader">Cidade/UF</div><div>' + NFE.escapeHtml(pessoa.cidade) + '/' + NFE.escapeHtml(pessoa.uf) + '</div><div class="text-secondary">IBGE ' + NFE.escapeHtml(pessoa.codigo_ibge) + '</div></div>' +
			'<div class="col-md-8"><div class="subheader">Endereco</div><div>' + NFE.escapeHtml(pessoa.endereco_resumo) + '</div></div>' +
			'<div class="col-md-2"><div class="subheader">CEP</div><div>' + NFE.escapeHtml(pessoa.cep) + '</div></div>' +
			'<div class="col-md-2"><div class="subheader">SUFRAMA</div><div>' + NFE.escapeHtml(pessoa.suframa || "-") + '</div></div>' +
		'</div></div></div></div>'
	);
};

NFE.validarFormulario = function () {
	var errors = [];

	if (!$("#naturezaOperacao").val()) errors.push("Natureza da operacao obrigatoria.");
	if (!$("#destinatarioId").val()) errors.push("Destinatario obrigatorio.");
	if (!NFE.data.itens.length) errors.push("Adicione ao menos um item.");
	if ($("#dataSaida").val() < $("#dataEmissao").val()) errors.push("Data de saida nao pode ser anterior a data de emissao.");
	if ($("#modalidadeFrete").val() !== "Sem frete" && !$("#transportadoraId").val()) errors.push("Transportadora obrigatoria quando a modalidade de frete nao e Sem frete.");
	if (!NFE.validarParcelas()) errors.push("A soma das parcelas deve ser igual ao total da NF-e.");

	NFE.data.itens.forEach(function (item, index) {
		var usaCsosn = item.regime_tributario === "MEI" || item.regime_tributario === "Simples Nacional";

		item.erros_validacao = [];
		if (!item.ncm) item.erros_validacao.push("NCM obrigatorio");
		if (!item.cfop) item.erros_validacao.push("CFOP obrigatorio");
		if (usaCsosn && !item.csosn) item.erros_validacao.push("CSOSN obrigatorio para MEI/Simples Nacional");
		if (!usaCsosn && !item.cst_icms) item.erros_validacao.push("CST ICMS obrigatorio para Lucro Presumido");
		if (Number(item.quantidade || 0) <= 0) item.erros_validacao.push("Quantidade deve ser maior que zero");
		if (Number(item.valor_unitario || 0) <= 0) item.erros_validacao.push("Valor unitario deve ser maior que zero");
		if (item.erros_validacao.length) {
			errors.push("Item " + (index + 1) + ": " + item.erros_validacao.join(", ") + ".");
		}
	});

	NFE.renderItens();
	return errors;
};

NFE.renderValidationErrors = function (errors) {
	$("#validationErrorsNfe").toggleClass("d-none", !errors.length);
	$("#validationErrorsNfeList").html(errors.map(function (error) {
		return '<li>' + NFE.escapeHtml(error) + '</li>';
	}).join(""));
};

NFE.validarParcelas = function () {
	var total = NFE.getTotalNfe();
	var soma = NFE.getSomaParcelas();
	var semPagamento = false;
	var saldo = total - soma;

	$("#nfeParcelas tr").each(function () {
		var linhaSemPagamento = $(this).find(".parcela-forma option:selected").text() === "Sem pagamento";
		semPagamento = semPagamento || linhaSemPagamento;
		$(this).find(".parcela-valor, .parcela-vencimento").closest("td").toggleClass("d-none", linhaSemPagamento);
	});

	var ok = semPagamento || Math.abs(saldo) < 0.01;

	$("#alertParcelas").toggleClass("d-none", ok);
	$("#saldoParcelas").text(NFE.formatCurrency(saldo));

	return ok;
};

NFE.renderTotais = function () {
	var total = NFE.data.totais || { produtos: 0, desconto: 0, frete: 0, seguro: 0, outras: 0, total: 0 };
	var html = [
		["Valor produtos", total.produtos, ""],
		["Desconto total", total.desconto, "-"],
		["Frete", total.frete, ""],
		["Seguro", total.seguro, ""],
		["Outras despesas", total.outras, ""]
	].map(function (item) {
		return '<div class="col-sm-6 col-lg-2"><div class="card card-sm"><div class="card-body"><div class="subheader">' + item[0] + '</div><div class="h3 mb-0">' + item[2] + NFE.formatCurrency(item[1]) + '</div></div></div></div>';
	}).join("");

	html += '<div class="col-sm-6 col-lg-2"><div class="card card-sm bg-primary-lt"><div class="card-body"><div class="subheader">Valor total NF-e</div><div class="h2 mb-0" id="valorTotalNfe">' + NFE.formatCurrency(total.total) + '</div></div></div></div>';
	$("#cardsTotais").html(html);
};

NFE.toggleTransporte = function () {
	var semFrete = $("#modalidadeFrete").val() === "Sem frete";

	$("#transporteCamposComplementares, #transportadoraResumo").toggleClass("d-none", semFrete);
	$("#transportadoraId").prop("required", !semFrete);
};

NFE.salvarRascunho = function () {
	HELPER.showToast("Rascunho da NF-e salvo.", "success");
};

NFE.gerarXml = function () {
	HELPER.showToast("XML gerado a partir dos dados autorizados.", "success");
};

NFE.visualizarDanfe = function () {
	HELPER.showToast("Pre-visualizacao do DANFE preparada.", "success");
};

NFE.cancelarNfe = function () {
	$("#badgeStatusNfe").attr("class", "badge bg-danger").text("Cancelada");
	$("#formNfe :input, #formNfe button").prop("disabled", true);
	$("#btnHeaderGerarXml, #btnHeaderDanfe").prop("disabled", false);
	HELPER.showToast("NF-e marcada como cancelada.", "warning");
};

NFE.initDataTable = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	NFE.tableItens = $("#tableNfeItens").DataTable({
		paging: false,
		searching: false,
		info: false,
		ordering: false,
		responsive: false,
		autoWidth: false,
		language: NFE.getDataTableLanguage(),
		columnDefs: [
			{ targets: 10, className: "text-end text-nowrap" },
			{ targets: [0, 2, 3, 4, 5, 6, 7, 8, 9], className: "text-nowrap" }
		]
	});
};

NFE.initTomSelects = function (context) {
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
			searchField: ["text", "nome", "documento", "telefone", "codigo_interno", "fantasia", "produto", "sku", "ean13"],
			placeholder: $(select).data("placeholder") || "",
			preload: true,
			load: HELPER.debounce(function (query, callback) {
				NFE.loadSelectOptions($(select).data("ajax-url"), query, callback);
			}, 300)
		});
	});
};

NFE.loadSelectOptions = function (url, query, callback) {
	if (!url) {
		callback();
		return;
	}

	HELPER.ajaxGet(url, {
		success: function (response) {
			callback(NFE.filterOptions(NFE.normalizeRows(response), query));
		},
		error: function () {
			callback();
		}
	});
};

NFE.refreshSelect = function (selector, rows) {
	var select = $(selector).get(0);

	if (!select || !select.tomselect) {
		return;
	}

	select.tomselect.clearOptions();
	select.tomselect.addOptions(rows);
	select.tomselect.refreshOptions(false);
};

NFE.initMasks = function () {
	$(".money-field").each(function () {
		NFE.initMoneyInput(this);
	});
};

NFE.initMoneyInput = function (element) {
	if (!window.IMask || !element || element.dataset.masked === "1") {
		return;
	}

	element.dataset.masked = "1";
	NFE.masks[element.id || ("mask-" + Object.keys(NFE.masks).length)] = window.IMask(element, NFE.moneyMaskOptions());
};

NFE.moneyMaskOptions = function () {
	return {
		mask: Number,
		scale: 2,
		signed: false,
		thousandsSeparator: ".",
		padFractionalZeros: true,
		normalizeZeros: true,
		radix: ",",
		mapToRadix: ["."]
	};
};

NFE.simularPessoaSalva = function () {
	var pessoa = {
		id: "novo-" + Date.now(),
		text: "Novo Destinatario Modal Ltda",
		nome: "Novo Destinatario Modal Ltda",
		fantasia: "Novo Destinatario",
		documento: "10.200.300/0001-44",
		cidade: "Sao Paulo",
		uf: "SP",
		telefone: "(11) 4000-0000",
		email: "fiscal@novodestinatario.com.br",
		ie: "110042490114",
		indicador_ie: "Contribuinte ICMS",
		cep: "01310-100",
		endereco_resumo: "Av. Paulista, 1000 - Bela Vista - Sao Paulo/SP",
		codigo_ibge: "3550308",
		suframa: ""
	};

	NFE.data.pessoas.push(pessoa);
	NFE.refreshSelect("#destinatarioId", NFE.data.pessoas);
	$("#destinatarioId").get(0).tomselect.setValue(String(pessoa.id));
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPessoaRapida")).hide();
	HELPER.showToast("Novo destinatario selecionado na NF-e.", "success");
};

NFE.normalizeRows = function (response) {
	return response && Array.isArray(response.data) ? response.data : [];
};

NFE.normalizePessoas = function (rows) {
	return rows.map(function (row) {
		var cidade = row.cidade || "Sao Paulo";
		var uf = row.uf || "SP";

		return $.extend({}, row, {
			text: row.text || row.nome,
			fantasia: row.fantasia || row.nome_fantasia || row.nome,
			telefone: row.telefone || "(11) 3000-0000",
			email: row.email || "contato@empresa.com.br",
			ie: row.ie || "ISENTO",
			indicador_ie: row.indicador_ie || "Contribuinte ICMS",
			cep: row.cep || "01000-000",
			cidade: cidade,
			uf: uf,
			codigo_ibge: row.codigo_ibge || "3550308",
			suframa: row.suframa || "",
			codigo_interno: row.codigo_interno || row.id,
			endereco_resumo: row.endereco_resumo || "Rua Comercial, 100 - Centro - " + cidade + "/" + uf
		});
	});
};

NFE.normalizeProdutos = function (rows) {
	return rows.map(function (row) {
		return $.extend({}, row, {
			text: row.text || row.produto,
			preco_venda_numero: Number(row.preco_venda_numero || row.preco || 0),
			estoque_disponivel: row.estoque_disponivel || row.estoque_numero || 0,
			unidade: row.unidade || "UN"
		});
	});
};

NFE.emptyTributos = function () {
	return {
		icms: { base: 0, valor: 0 },
		icms_st: { base: 0, valor: 0 },
		fcp: { base: 0, valor: 0 },
		difal: { base: 0, valor: 0 },
		ipi: { base: 0, valor: 0 },
		pis: { base: 0, valor: 0 },
		cofins: { base: 0, valor: 0 }
	};
};

NFE.somarTributosResolvidos = function (totais, item) {
	totais.icms.base += NFE.toNumber(item.base_icms);
	totais.icms.valor += NFE.toNumber(item.valor_icms);
	totais.icms_st.base += NFE.toNumber(item.base_icms_st);
	totais.icms_st.valor += NFE.toNumber(item.valor_icms_st);
	totais.fcp.base += NFE.toNumber(item.base_icms);
	totais.fcp.valor += NFE.toNumber(item.valor_fcp) + NFE.toNumber(item.valor_fcp_st);
	totais.difal.base += NFE.toNumber(item.base_icms);
	totais.difal.valor += NFE.toNumber(item.valor_difal);
	totais.ipi.base += NFE.toNumber(item.valor_ipi) > 0 ? NFE.toNumber(item.valor_total) : 0;
	totais.ipi.valor += NFE.toNumber(item.valor_ipi);
	totais.pis.base += NFE.toNumber(item.base_pis);
	totais.pis.valor += NFE.toNumber(item.valor_pis);
	totais.cofins.base += NFE.toNumber(item.base_cofins);
	totais.cofins.valor += NFE.toNumber(item.valor_cofins);
};

NFE.renumerarParcelas = function () {
	$("#nfeParcelas tr").each(function (index) {
		$(this).find(".badge").text("Parcela " + (index + 1));
	});
};

NFE.atualizarContadores = function () {
	$(".nfe-textarea").each(function () {
		$('[data-counter-for="' + this.id + '"]').text(String($(this).val()).length);
	});
};

NFE.findById = function (items, id) {
	return items.find(function (item) {
		return String(item.id) === String(id);
	});
};

NFE.filterOptions = function (items, query) {
	var q = String(query || "").toLowerCase();

	if (!q) {
		return items;
	}

	return items.filter(function (item) {
		return [item.text, item.nome, item.fantasia, item.documento, item.telefone, item.codigo_interno, item.produto, item.sku, item.ean13].join(" ").toLowerCase().indexOf(q) !== -1;
	});
};

NFE.getTotalNfe = function () {
	return Number(NFE.data.totais && NFE.data.totais.total || 0);
};

NFE.getRegimeTributario = function () {
	return $("#regimeTributario").val() || NFE.data.regimeTributario || "Simples Nacional";
};

NFE.getToastItemAdicionado = function (item) {
	var usaCsosn = item.regime_tributario === "MEI" || item.regime_tributario === "Simples Nacional";
	var fiscalPrincipal = usaCsosn ? ("CSOSN " + (item.csosn || "-")) : ("CST ICMS " + (item.cst_icms || "-"));
	var st = NFE.toNumber(item.valor_icms_st) > 0 ? ", ST " + NFE.formatCurrency(item.valor_icms_st) : "";

	return item.descricao + " adicionada - " + fiscalPrincipal + st + ".";
};

NFE.getSomaParcelas = function () {
	var soma = 0;

	$("#nfeParcelas .parcela-valor").each(function () {
		if ($(this).closest("tr").find(".parcela-forma option:selected").text() !== "Sem pagamento") {
			soma += NFE.parseNumber($(this).val());
		}
	});

	return soma;
};

NFE.parseNumber = function (value) {
	var normalized = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);

	return isNaN(number) ? 0 : number;
};

NFE.toNumber = function (value) {
	var number = Number(value);
	return isNaN(number) ? NFE.parseNumber(value) : number;
};

NFE.formatNumber = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
};

NFE.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL"
	});
};

NFE.formatPercent = function (value) {
	return NFE.formatNumber(value || 0) + "%";
};

NFE.escapeHtml = function (value) {
	return String(value == null ? "" : value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};

NFE.getDataTableLanguage = function () {
	return {
		emptyTable: "Nenhum item informado",
		loadingRecords: "Carregando...",
		processing: "Processando...",
		zeroRecords: "Nenhum item encontrado",
		paginate: {
			first: "Primeiro",
			last: "Ultimo",
			next: "Proximo",
			previous: "Anterior"
		}
	};
};
