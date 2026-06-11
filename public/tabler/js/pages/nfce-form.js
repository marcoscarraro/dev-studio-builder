const NFCE = window.NFCE || {};
window.NFCE = NFCE;

NFCE.masks = {};
NFCE.data = {
	pedidos: [],
	produtos: [],
	cfops: [],
	naturezas: [],
	formasPagamento: [],
	totais: { produtos: 0, desconto: 0, total: 0, tributos: { origem: "backend" } }
};

$(document).ready(function () {
	NFCE.init();
});

NFCE.init = function () {
	NFCE.initializeComponents();
	NFCE.bindEvents();
	NFCE.loadInitialData();
};

NFCE.initializeComponents = function () {
	var now = new Date();

	$("#dataEmissao").val(now.toISOString().substring(0, 10));
	$("#horaEmissao").val(now.toTimeString().substring(0, 5));
	NFCE.initTomSelects("#formNfce");
	NFCE.atualizarModoOrigem();
	NFCE.atualizarContadores();
	NFCE.renderTotais();
	NFCE.renderTributacao();
};

NFCE.bindEvents = function () {
	$("#tipoEmissao").on("change", function () { NFCE.alternarOrigem($(this).val()); });
	$("#pedidoOrigem").on("change", NFCE.buscarPedido);
	$("#btnCarregarPedido").on("click", NFCE.buscarPedido);
	$("#numeroNfce").on("input", function () { $("#headerNumeroNfce").text($(this).val() || "-"); });
	$("#serieNfce").on("input", function () { $("#headerSerieNfce").text($(this).val() || "-"); });
	$("#ambienteEmissao").on("change", function () { $("#headerAmbienteNfce").text($(this).val()); });
	$("#btnAdicionarItem").on("click", function () { NFCE.adicionarItem(); });
	$("#btnAdicionarPagamento").on("click", function () { NFCE.adicionarPagamento(); });
	$("#nfceItens").on("change", ".item-produto", NFCE.preencherProdutoItem);
	$("#nfceItens").on("input change", ".item-quantidade, .item-unitario, .item-desconto, .item-cfop", NFCE.calcularTotais);
	$("#nfceItens").on("click", ".btn-remover-item", NFCE.removerItem);
	$("#nfcePagamentos").on("input change", ".pagamento-valor, .pagamento-forma", NFCE.validarPagamentos);
	$("#nfcePagamentos").on("click", ".btn-remover-pagamento", NFCE.removerPagamento);
	$("#btnSalvarRascunho, #btnFooterSalvarRascunho").on("click", NFCE.salvarRascunho);
	$("#btnValidarNfce").on("click", NFCE.validarNfce);
	$("#btnTransmitirNfce, #btnFooterTransmitirNfce").on("click", NFCE.transmitirNfce);
	$("#btnGerarXml").on("click", function () { HELPER.showToast("XML da NFC-e gerado para conferencia.", "success"); });
	$("#btnVisualizarDanfe").on("click", function () { HELPER.showToast("Pre-visualizacao do DANFE NFC-e preparada.", "success"); });
	$(".nfce-textarea").on("input", NFCE.atualizarContadores);
};

NFCE.loadInitialData = function () {
	var pedidosRequest = HELPER.ajaxGet("../mock/nfce-pedidos.json", {
		success: function (response) {
			NFCE.data.pedidos = NFCE.normalizeRows(response);
			NFCE.refreshSelect("#pedidoOrigem", NFCE.data.pedidos);
		}
	});

	var produtosRequest = HELPER.ajaxGet("../mock/produtos.json", {
		success: function (response) {
			NFCE.data.produtos = NFCE.normalizeProdutos(NFCE.normalizeRows(response));
		}
	});

	HELPER.ajaxGet("../mock/cfops.json", {
		success: function (response) {
			NFCE.data.cfops = NFCE.normalizeRows(response);
			NFCE.refreshSelect("#cfopPrincipal", NFCE.data.cfops);
			NFCE.setTomValue("#cfopPrincipal", "5102");
		}
	});

	HELPER.ajaxGet("../mock/naturezas-operacao.json", {
		success: function (response) {
			NFCE.data.naturezas = NFCE.normalizeRows(response);
			NFCE.refreshSelect("#naturezaOperacao", NFCE.data.naturezas);
			if (NFCE.data.naturezas.length) {
				NFCE.setTomValue("#naturezaOperacao", NFCE.data.naturezas[0].id);
			}
		}
	});

	var pagamentosRequest = HELPER.ajaxGet("../mock/formas-pagamento.json", {
		success: function (response) {
			NFCE.data.formasPagamento = NFCE.normalizeRows(response);
		}
	});

	$.when(pedidosRequest, produtosRequest, pagamentosRequest).always(function () {
		if ($("#tipoEmissao").val() === "manual") {
			NFCE.adicionarItem();
			NFCE.adicionarPagamento();
		}
	});
};

NFCE.atualizarModoOrigem = function () {
	NFCE.alternarOrigem($("#tipoEmissao").val());
};

NFCE.alternarOrigem = function (origem) {
	$("#tipoEmissao").val(origem);
	var manual = $("#tipoEmissao").val() === "manual";

	$("#grupoPedidoOrigem, #grupoCarregarPedido").toggleClass("d-none", manual);
	$("#btnAdicionarItem").prop("disabled", !manual);
	$("#alertOrigem")
		.toggleClass("alert-info", !manual)
		.toggleClass("alert-warning", manual)
		.text(manual ? "Modo avulso: preencha consumidor, itens e pagamentos manualmente antes de transmitir." : "Selecione um pedido para carregar consumidor, itens, pagamentos, totais e regras fiscais. Depois revise os dados permitidos e transmita.");

	if (manual) {
		NFCE.limparDocumento();
		NFCE.setItensBloqueados(false);
		if (!$("#nfceItens tr").length) {
			NFCE.adicionarItem();
		}
		if (!$("#nfcePagamentos tr").length) {
			NFCE.adicionarPagamento();
		}
		NFCE.setPedidoFieldAccess(false);
		return;
	}

	NFCE.setItensBloqueados(true);
	NFCE.setPedidoFieldAccess(true);
};

NFCE.buscarPedido = function () {
	var pedido = NFCE.findById(NFCE.data.pedidos, $("#pedidoOrigem").val());

	if (!pedido) {
		HELPER.showToast("Selecione um pedido para carregar.", "warning");
		return;
	}

	HELPER.setButtonLoading("#btnCarregarPedido", true);
	setTimeout(function () {
		HELPER.setButtonLoading("#btnCarregarPedido", false);
		NFCE.carregarPedido(pedido.id);
		HELPER.showToast("Pedido " + pedido.numero + " carregado para conferencia fiscal.", "success");
	}, 350);
};

NFCE.carregarPedido = function (pedidoId) {
	var pedido = NFCE.findById(NFCE.data.pedidos, pedidoId);

	if (!pedido) {
		HELPER.showToast("Pedido nao localizado.", "danger");
		return;
	}

	NFCE.aplicarPedido(pedido);
};

NFCE.aplicarPedido = function (pedido) {
	$("#consumidorNome").val(pedido.consumidor.nome || "");
	$("#consumidorDocumento").val(pedido.consumidor.documento || pedido.cpf || "");
	$("#consumidorEmail").val(pedido.consumidor.email || "");
	$("#consumidorTelefone").val(pedido.consumidor.telefone || "");
	$("#consumidorEndereco").val(pedido.consumidor.endereco || "");
	$("#vendedor").val(pedido.vendedor || "");
	$("#observacoesInternas").val(pedido.observacoes || "");
	$("#mensagemDanfeCupom").val(pedido.mensagem_danfe || "");
	$("#modoContingencia").val(pedido.status_nfce === "CONTINGENCIA" ? "contingencia" : "normal");

	$("#nfceItens, #nfcePagamentos").empty();
	(pedido.itens || []).forEach(function (item) {
		NFCE.adicionarItem(item);
	});
	(pedido.pagamentos || []).forEach(function (pagamento) {
		NFCE.adicionarPagamento(pagamento);
	});

	NFCE.setItensBloqueados(true);
	NFCE.setPedidoFieldAccess(true);
	NFCE.calcularTotais();
	NFCE.atualizarContadores();
};

NFCE.limparDocumento = function () {
	$("#consumidorNome, #consumidorDocumento, #consumidorEmail, #consumidorTelefone, #consumidorEndereco, #observacoesInternas, #mensagemDanfeCupom").val("");
	$("#nfceItens, #nfcePagamentos").empty();
	NFCE.calcularTotais();
	NFCE.atualizarContadores();
};

NFCE.adicionarItem = function (item) {
	item = item || {};

	var row = '' +
		'<tr>' +
			'<td><select class="form-select form-select-sm item-produto" required><option value="">Selecione...</option></select><div class="text-secondary small mt-1 item-info">Unidade: - | Estoque: -</div></td>' +
			'<td><input type="text" class="form-control form-control-sm item-ncm" value="' + NFCE.escapeHtml(item.ncm || "") + '" required></td>' +
			'<td>' + NFCE.renderCfopSelect(item.cfop || $("#cfopPrincipal").val() || "5102") + '</td>' +
			'<td><input type="text" class="form-control form-control-sm item-cst" value="' + NFCE.escapeHtml(item.cst || "00") + '" required></td>' +
			'<td><input type="number" class="form-control form-control-sm item-quantidade" min="0.001" step="0.001" value="' + (item.quantidade || 1) + '"></td>' +
			'<td><input type="text" class="form-control form-control-sm item-unitario" value="' + NFCE.formatNumber(item.valor_unitario || 0) + '"></td>' +
			'<td><input type="text" class="form-control form-control-sm item-desconto" value="' + NFCE.formatNumber(item.desconto || 0) + '"></td>' +
			'<td><strong class="item-total">R$ 0,00</strong></td>' +
			'<td class="text-end"><button type="button" class="btn btn-icon btn-outline-danger btn-remover-item" aria-label="Remover item">x</button></td>' +
		'</tr>';

	$("#nfceItens").append(row);
	var $row = $("#nfceItens tr").last();
	$row.find(".item-produto").data("selected", item.produto_id || "");
	$row.data("produto-nome", item.produto || "");
	NFCE.initProductSelect($row.find(".item-produto").get(0));
	NFCE.initMoneyInput($row.find(".item-unitario").get(0));
	NFCE.initMoneyInput($row.find(".item-desconto").get(0));
	NFCE.preencherInfoProduto($row);
	NFCE.setItensBloqueados($("#tipoEmissao").val() === "pedido");
	NFCE.calcularTotais();
};

NFCE.adicionarPagamento = function (pagamento) {
	pagamento = pagamento || {};
	var options = NFCE.data.formasPagamento.map(function (forma) {
		var selected = String(forma.id) === String(pagamento.forma_pagamento_id) ? " selected" : "";
		return '<option value="' + forma.id + '"' + selected + '>' + NFCE.escapeHtml(forma.text) + '</option>';
	}).join("");
	var valor = pagamento.valor == null ? NFCE.getSaldoPagamento() : pagamento.valor;

	$("#nfcePagamentos").append(
		'<tr>' +
			'<td><select class="form-select pagamento-forma" required><option value="">Selecione...</option>' + options + '</select></td>' +
			'<td><input type="text" class="form-control pagamento-valor" value="' + NFCE.formatNumber(valor) + '"></td>' +
			'<td class="text-end"><button type="button" class="btn btn-icon btn-outline-danger btn-remover-pagamento" aria-label="Remover pagamento">x</button></td>' +
		'</tr>'
	);

	NFCE.initMoneyInput($("#nfcePagamentos tr").last().find(".pagamento-valor").get(0));
	NFCE.validarPagamentos();
};

NFCE.preencherProdutoItem = function () {
	var $row = $(this).closest("tr");
	var produto = NFCE.findById(NFCE.data.produtos, $(this).val());

	if (!produto) {
		return;
	}

	$row.data("produto-nome", produto.text);
	$row.find(".item-ncm").val(produto.ncm);
	$row.find(".item-unitario").val(NFCE.formatNumber(produto.preco_venda_numero));
	NFCE.preencherInfoProduto($row, produto);
	NFCE.calcularTotais();
};

NFCE.preencherInfoProduto = function ($row, produto) {
	produto = produto || NFCE.findById(NFCE.data.produtos, $row.find(".item-produto").val());
	if (!produto) {
		$row.find(".item-info").text("Unidade: - | Estoque: -");
		return;
	}

	$row.find(".item-info").text("Unidade: " + (produto.unidade || "UN") + " | Estoque: " + (produto.estoque_disponivel || produto.estoque_numero || 0));
};

NFCE.removerItem = function () {
	$(this).closest("tr").remove();
	NFCE.calcularTotais();
	HELPER.showToast("Item removido.", "success");
};

NFCE.removerPagamento = function () {
	$(this).closest("tr").remove();
	NFCE.validarPagamentos();
	HELPER.showToast("Pagamento removido.", "success");
};

NFCE.calcularTotais = function () {
	var produtos = 0;
	var desconto = 0;

	$("#nfceItens tr").each(function () {
		var $row = $(this);
		var quantidade = Math.max(NFCE.parseNumber($row.find(".item-quantidade").val()), 0);
		var unitario = Math.max(NFCE.parseNumber($row.find(".item-unitario").val()), 0);
		var descontoLinha = Math.max(NFCE.parseNumber($row.find(".item-desconto").val()), 0);
		var bruto = quantidade * unitario;
		var total = Math.max(bruto - descontoLinha, 0);

		$row.find(".item-total").text(NFCE.formatCurrency(total)).data("value", total);
		produtos += bruto;
		desconto += descontoLinha;
	});

	NFCE.data.totais = {
		produtos: produtos,
		desconto: desconto,
		total: Math.max(produtos - desconto, 0),
		tributos: { origem: "backend" }
	};

	NFCE.renderTotais();
	NFCE.renderTributacao();
	NFCE.validarPagamentos();
};

NFCE.renderTotais = function () {
	var total = NFCE.data.totais;
	var cards = [
		["Valor produtos", total.produtos],
		["Desconto", total.desconto],
		["Tributacao", "Backend/API"]
	].map(function (item) {
		var value = typeof item[1] === "number" ? NFCE.formatCurrency(item[1]) : NFCE.escapeHtml(item[1]);
		return '<div class="col-sm-6 col-lg-3"><div class="card card-sm"><div class="card-body"><div class="subheader">' + item[0] + '</div><div class="h2 mb-0">' + value + '</div></div></div></div>';
	}).join("");

	cards += '<div class="col-12"><div class="card bg-primary-lt"><div class="card-body"><div class="subheader">Valor total NFC-e</div><div class="display-6 fw-bold" id="valorTotalNfce">' + NFCE.formatCurrency(total.total) + '</div></div></div></div>';
	$("#cardsTotais").html(cards);
};

NFCE.renderTributacao = function () {
	var cards = '<div class="col-12"><div class="alert alert-info mb-0">A tributacao da NFC-e e resolvida pelo backend/API. O frontend apenas renderiza o retorno fiscal.</div></div>';

	$("#cardsTributos").html(cards);
	$("#nfceTributos").html(NFCE.renderTributosRows());
};

NFCE.renderTributosRows = function () {
	var rows = [];

	$("#nfceItens tr").each(function () {
		var $row = $(this);
		var produto = NFCE.getTomSelectedText($row.find(".item-produto").get(0)) || $row.data("produto-nome") || "Item sem produto";

		rows.push(
			'<tr>' +
				'<td>' + NFCE.escapeHtml(produto) + '</td>' +
				'<td><span class="badge bg-secondary-lt">' + NFCE.escapeHtml($row.find(".item-cfop").val() || "5102") + '</span></td>' +
				'<td><span class="badge bg-secondary-lt">Backend</span></td>' +
				'<td><span class="badge bg-secondary-lt">Backend</span></td>' +
				'<td><span class="badge bg-secondary-lt">Backend</span></td>' +
			'</tr>'
		);
	});

	return rows.join("") || '<tr><td colspan="5" class="text-secondary">Nenhum item informado.</td></tr>';
};

NFCE.validarPagamentos = function () {
	var saldo = NFCE.getSaldoPagamento();
	var ok = Math.abs(saldo) < 0.01;

	$("#alertPagamentos").toggleClass("d-none", ok);
	$("#saldoPagamentos").text(NFCE.formatCurrency(saldo));
	return ok;
};

NFCE.salvarRascunho = function () {
	if (!NFCE.validarFormularioBasico()) {
		return;
	}

	HELPER.showToast("Rascunho da NFC-e salvo.", "success");
};

NFCE.validarNfce = function () {
	if (!NFCE.validarFormulario()) {
		return;
	}

	HELPER.setButtonLoading("#btnValidarNfce", true);
	$("#badgeStatusNfce").attr("class", "badge bg-yellow-lt").text("Validando");

	setTimeout(function () {
		HELPER.setButtonLoading("#btnValidarNfce", false);
		$("#badgeStatusNfce").attr("class", "badge bg-green-lt").text("Validada");
		$("#badgeValidacaoFiscal").attr("class", "badge bg-green-lt").text("Validacao fiscal concluida");
		HELPER.showToast("NFC-e validada para transmissao.", "success");
	}, 500);
};

NFCE.transmitirNfce = function () {
	if (!NFCE.validarFormulario()) {
		return;
	}

	HELPER.setButtonLoading("#btnTransmitirNfce", true);
	HELPER.setButtonLoading("#btnFooterTransmitirNfce", true);

	setTimeout(function () {
		HELPER.setButtonLoading("#btnTransmitirNfce", false);
		HELPER.setButtonLoading("#btnFooterTransmitirNfce", false);
		$("#badgeStatusNfce").attr("class", "badge bg-success-lt").text("Autorizada");
		HELPER.showToast("NFC-e transmitida e autorizada no ambiente de homologacao.", "success");
	}, 750);
};

NFCE.validarFormulario = function () {
	if (!NFCE.validarFormularioBasico()) {
		return false;
	}

	if ($("#tipoEmissao").val() === "pedido" && !$("#pedidoOrigem").val()) {
		HELPER.showToast("Selecione e carregue um pedido antes de transmitir.", "warning");
		return false;
	}

	if (!$("#nfceItens tr").length || NFCE.data.totais.total <= 0) {
		HELPER.showToast("Informe ao menos um item com valor.", "warning");
		return false;
	}

	if (!NFCE.validarConsumidorCpf()) {
		return false;
	}

	if (!NFCE.validarRegimeTributario()) {
		return false;
	}

	if (!NFCE.validarPagamentos()) {
		HELPER.showToast("Os pagamentos precisam fechar com o total da NFC-e.", "danger");
		return false;
	}

	return true;
};

NFCE.validarRegimeTributario = function () {
	var permitidos = ["mei", "simples", "presumido"];

	if (permitidos.indexOf($("#regimeTributario").val()) === -1) {
		HELPER.showToast("Selecione um regime tributario atendido para NFC-e.", "warning");
		$("#regimeTributario").addClass("is-invalid").trigger("focus");
		return false;
	}

	$("#regimeTributario").removeClass("is-invalid");
	return true;
};

NFCE.validarConsumidorCpf = function () {
	var cpf = NFCE.onlyDigits($("#consumidorDocumento").val());
	var total = NFCE.data.totais.total || 0;

	if (!cpf && total <= 400) {
		return true;
	}

	if (!cpf && total > 400) {
		HELPER.showToast("CPF do consumidor e obrigatorio para NFC-e acima de R$ 400,00.", "warning");
		$("#consumidorDocumento").addClass("is-invalid").trigger("focus");
		return false;
	}

	if (cpf.length !== 11) {
		HELPER.showToast("Informe apenas CPF valido para NFC-e. CNPJ nao e permitido.", "warning");
		$("#consumidorDocumento").addClass("is-invalid").trigger("focus");
		return false;
	}

	$("#consumidorDocumento").removeClass("is-invalid");
	return true;
};

NFCE.validarFormularioBasico = function () {
	var form = $("#formNfce").get(0);

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Revise os campos obrigatorios da NFC-e.", "warning");
		return false;
	}

	$(form).removeClass("was-validated");
	return true;
};

NFCE.setItensBloqueados = function (bloqueado) {
	$("#nfceItens").find("input, select, button").prop("disabled", bloqueado);
	$("#btnAdicionarItem").prop("disabled", bloqueado);

	$("#nfceItens .item-produto").each(function () {
		if (!this.tomselect) {
			return;
		}

		if (bloqueado) {
			this.tomselect.disable();
			return;
		}

		this.tomselect.enable();
	});
};

NFCE.setPedidoFieldAccess = function (pedido) {
	if (!pedido) {
		$("#consumidorNome, #consumidorEmail, #consumidorTelefone, #consumidorEndereco").prop("readonly", false);
		return;
	}

	$("#consumidorNome, #consumidorEmail, #consumidorTelefone, #consumidorEndereco").prop("readonly", true);
	$("#consumidorDocumento, #observacoesInternas, #mensagemDanfeCupom").prop("readonly", false);
	$("#nfcePagamentos").find("select, input, button").prop("disabled", false);
};

NFCE.initTomSelects = function (context) {
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
			searchField: ["text", "numero", "cliente", "cpf", "status_nfce"],
			placeholder: $(select).data("placeholder") || "",
			preload: true,
			load: HELPER.debounce(function (query, callback) {
				var url = $(select).data("ajax-url");

				if (!url && select.id === "pedidoOrigem") {
					callback(NFCE.filterOptions(NFCE.data.pedidos, query));
					return;
				}

				NFCE.loadSelectOptions(url, query, callback);
			}, 300)
		});
	});
};

NFCE.initProductSelect = function (select) {
	if (!window.TomSelect || !select || select.tomselect) {
		return;
	}

	var selected = $(select).data("selected");
	var tom = new window.TomSelect(select, {
		plugins: ["dropdown_input", "clear_button"],
		copyClassesToDropdown: false,
		controlInput: "<input>",
		dropdownParent: "body",
		valueField: "id",
		labelField: "text",
		searchField: ["text", "produto", "sku", "ean13"],
		options: NFCE.data.produtos,
		placeholder: "Buscar produto",
		preload: true,
		load: HELPER.debounce(function (query, callback) {
			callback(NFCE.filterOptions(NFCE.data.produtos, query));
		}, 300)
	});

	if (selected) {
		tom.addOptions(NFCE.data.produtos);
		tom.setValue(String(selected), true);
	}
};

NFCE.initMoneyInput = function (element) {
	if (!window.IMask || !element || element.dataset.masked === "1") {
		return;
	}

	element.dataset.masked = "1";
	NFCE.masks[element.id || ("mask-" + Object.keys(NFCE.masks).length)] = window.IMask(element, {
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

NFCE.loadSelectOptions = function (url, query, callback) {
	if (!url) {
		callback();
		return;
	}

	HELPER.ajaxGet(url, {
		success: function (response) {
			callback(NFCE.filterOptions(NFCE.normalizeRows(response), query));
		},
		error: function () {
			callback();
		}
	});
};

NFCE.refreshSelect = function (selector, rows) {
	var select = $(selector).get(0);

	if (!select || !select.tomselect) {
		return;
	}

	select.tomselect.clearOptions();
	select.tomselect.addOptions(rows);
	select.tomselect.refreshOptions(false);
};

NFCE.setTomValue = function (selector, value) {
	var select = $(selector).get(0);

	if (select && select.tomselect) {
		select.tomselect.setValue(String(value), true);
		return;
	}

	$(selector).val(value);
};

NFCE.renderCfopSelect = function (selected) {
	var hasSelected = false;
	var html = '<select class="form-select form-select-sm item-cfop" required>';

	NFCE.data.cfops.forEach(function (cfop) {
		var value = cfop.id || cfop.text;
		var isSelected = String(value) === String(selected);
		hasSelected = hasSelected || isSelected;
		html += '<option value="' + NFCE.escapeHtml(value) + '"' + (isSelected ? " selected" : "") + '>' + NFCE.escapeHtml(cfop.text) + '</option>';
	});

	if (!NFCE.data.cfops.length || !hasSelected) {
		html += '<option value="' + NFCE.escapeHtml(selected || "5102") + '" selected>' + NFCE.escapeHtml(selected || "5102") + '</option>';
	}

	html += '</select>';
	return html;
};

NFCE.normalizeRows = function (response) {
	return response && Array.isArray(response.data) ? response.data : [];
};

NFCE.normalizeProdutos = function (rows) {
	return rows.map(function (row) {
		return $.extend({}, row, {
			text: row.text || row.produto,
			ncm: row.ncm || NFCE.ncmByCategoria(row.categoria),
			preco_venda_numero: row.preco_venda_numero || 0,
			estoque_disponivel: row.estoque_disponivel || row.estoque_numero || 0
		});
	});
};

NFCE.filterOptions = function (items, query) {
	var q = String(query || "").toLowerCase();

	if (!q) {
		return items;
	}

	return items.filter(function (item) {
		return [item.text, item.numero, item.cliente, item.cpf, item.status_nfce, item.produto, item.sku, item.ean13].join(" ").toLowerCase().indexOf(q) !== -1;
	});
};

NFCE.findById = function (items, id) {
	return items.find(function (item) {
		return String(item.id) === String(id);
	});
};

NFCE.getSaldoPagamento = function () {
	var soma = 0;

	$("#nfcePagamentos .pagamento-valor").each(function () {
		soma += NFCE.parseNumber($(this).val());
	});

	return NFCE.data.totais.total - soma;
};

NFCE.getTomSelectedText = function (select) {
	if (select && select.tomselect) {
		var item = select.tomselect.options[select.tomselect.getValue()];
		return item ? item.text : "";
	}

	return $(select).find("option:selected").text();
};

NFCE.atualizarContadores = function () {
	$(".nfce-textarea").each(function () {
		$('[data-counter-for="' + this.id + '"]').text(String($(this).val()).length);
	});
};

NFCE.parseNumber = function (value) {
	var normalized = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);

	return isNaN(number) ? 0 : number;
};

NFCE.onlyDigits = function (value) {
	return String(value || "").replace(/\D/g, "");
};

NFCE.formatNumber = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
};

NFCE.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL"
	});
};

NFCE.escapeHtml = function (value) {
	return String(value == null ? "" : value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};

NFCE.ncmByCategoria = function (categoria) {
	var map = {
		Bebidas: "22021000",
		Alimentos: "09012100",
		Servicos: "00000000",
		Limpeza: "34022000"
	};

	return map[categoria] || "84713012";
};
