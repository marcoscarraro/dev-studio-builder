const PEDIDO_VENDA = window.PEDIDO_VENDA || {};
window.PEDIDO_VENDA = PEDIDO_VENDA;

PEDIDO_VENDA.pedidoVendaMasks = {};
PEDIDO_VENDA.pedidoVendaData = {
	clientes: [],
	produtos: [],
	formasPagamento: [],
	itemRemocao: null
};

$(document).ready(function () {
	PEDIDO_VENDA.init();
});

PEDIDO_VENDA.init = function () {
	PEDIDO_VENDA.initializeComponents();
	PEDIDO_VENDA.bindEvents();
	PEDIDO_VENDA.loadInitialData();
};

PEDIDO_VENDA.initializeComponents = function () {
	PEDIDO_VENDA.initPedidoTomSelects("#formPedidoVenda");
	PEDIDO_VENDA.initPedidoMasks();
	$("#dataEmissao").val(new Date().toISOString().substring(0, 10));
	PEDIDO_VENDA.aplicarTipoDocumentoInicial();
	PEDIDO_VENDA.atualizarNumeroDocumento();
}

PEDIDO_VENDA.bindEvents = function () {
	$("#formPedidoVenda").on("submit", function (event) {
		event.preventDefault();
		PEDIDO_VENDA.salvarPedido("#btnFooterSalvarPedido", "Pedido salvo com sucesso.");
	});
	$("#btnSalvarPedido").on("click", function () { $("#formPedidoVenda").trigger("submit"); });
	$("#btnFooterSalvarOrcamento, #btnSalvarOrcamento").on("click", PEDIDO_VENDA.salvarOrcamento);
	$("#btnFinalizarVenda, #btnFooterFinalizarVenda").on("click", PEDIDO_VENDA.finalizarVenda);
	$("#btnAdicionarItem").on("click", PEDIDO_VENDA.adicionarItem);
	$("#btnAdicionarParcela").on("click", PEDIDO_VENDA.adicionarParcelaManual);
	$("#btnGerarParcelas").on("click", PEDIDO_VENDA.gerarParcelas);
	$("#btnConfirmarRemoverItem").on("click", PEDIDO_VENDA.confirmarRemocaoItem);
	$("#clienteId").on("change", PEDIDO_VENDA.preencherClienteSelecionado);
	$("#tipoDocumento").on("change", PEDIDO_VENDA.atualizarNumeroDocumento);
	$("#situacao").on("change", PEDIDO_VENDA.atualizarBadgeSituacao);
	$("#frete, #acrescimos").on("input", PEDIDO_VENDA.recalcularTotais);
	$("#pedidoItens").on("input", ".item-quantidade, .item-preco, .item-desconto-percentual, .item-desconto-valor", PEDIDO_VENDA.recalcularTotais);
	$("#pedidoItens").on("change", ".item-produto", PEDIDO_VENDA.preencherProdutoSelecionado);
	$("#pedidoItens").on("click", ".btn-remover-item", PEDIDO_VENDA.solicitarRemocaoItem);
	$("#pedidoParcelas").on("input change", ".parcela-valor", PEDIDO_VENDA.validarParcelas);
	$("#pedidoParcelas").on("click", ".btn-remover-parcela", PEDIDO_VENDA.removerParcela);
	$("#formaPagamento").on("change", PEDIDO_VENDA.sincronizarFormaPagamentoParcelas);
}

PEDIDO_VENDA.loadInitialData = function () {
	HELPER.ajaxGet("../mock/clientes.json", {
		success: function (response) {
			PEDIDO_VENDA.pedidoVendaData.clientes = PEDIDO_VENDA.normalizeRows(response);
			PEDIDO_VENDA.refreshRemoteSelect("#clienteId", PEDIDO_VENDA.pedidoVendaData.clientes);
		}
	});

	HELPER.ajaxGet("../mock/produtos.json", {
		success: function (response) {
			PEDIDO_VENDA.pedidoVendaData.produtos = PEDIDO_VENDA.normalizeRows(response);
			PEDIDO_VENDA.adicionarItem();
		}
	});

	HELPER.ajaxGet("../mock/formas-pagamento.json", {
		success: function (response) {
			PEDIDO_VENDA.pedidoVendaData.formasPagamento = PEDIDO_VENDA.normalizeRows(response);
			PEDIDO_VENDA.refreshRemoteSelect("#formaPagamento", PEDIDO_VENDA.pedidoVendaData.formasPagamento);
			PEDIDO_VENDA.gerarParcelas();
		}
	});
}

PEDIDO_VENDA.adicionarItem = function () {
	var index = $("#pedidoItens tr").length + 1;
	var row = '' +
		'<tr>' +
			'<td>' +
				'<select class="form-select item-produto" data-placeholder="Buscar produto" required>' +
					'<option value="">Selecione...</option>' +
				'</select>' +
				'<input type="text" class="form-control form-control-sm mt-2 item-descricao" placeholder="Descricao do item">' +
				'<div class="text-secondary small mt-1 item-info">Unidade: - | Estoque: -</div>' +
			'</td>' +
			'<td><input type="number" class="form-control item-quantidade" min="0.001" step="0.001" value="1"></td>' +
			'<td><input type="text" class="form-control item-preco" value="0,00"></td>' +
			'<td><input type="number" class="form-control item-desconto-percentual" min="0" max="100" step="0.01" value="0"></td>' +
			'<td><input type="text" class="form-control item-desconto-valor" value="0,00"></td>' +
			'<td><strong class="item-subtotal">R$ 0,00</strong></td>' +
			'<td class="text-end"><button type="button" class="btn btn-icon btn-outline-danger btn-remover-item" aria-label="Remover item">' +
				'<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>' +
			'</button></td>' +
		'</tr>';

	$("#pedidoItens").append(row);
	var $row = $("#pedidoItens tr").last();
	$row.attr("data-index", index);
	PEDIDO_VENDA.initProductSelect($row.find(".item-produto").get(0));
	PEDIDO_VENDA.initMoneyInput($row.find(".item-preco").get(0));
	PEDIDO_VENDA.initMoneyInput($row.find(".item-desconto-valor").get(0));
	PEDIDO_VENDA.recalcularTotais();
}

PEDIDO_VENDA.preencherProdutoSelecionado = function () {
	var $row = $(this).closest("tr");
	var produto = PEDIDO_VENDA.findById(PEDIDO_VENDA.pedidoVendaData.produtos, $(this).val());

	if (!produto) {
		return;
	}

	$row.find(".item-descricao").val(produto.descricao || produto.produto || produto.text);
	$row.find(".item-preco").val(PEDIDO_VENDA.formatNumber(produto.preco_venda_numero || 0));
	$row.find(".item-info").text("Unidade: " + (produto.unidade || "UN") + " | Estoque: " + (produto.estoque_disponivel || produto.estoque_numero || 0));
	PEDIDO_VENDA.recalcularTotais();
}

PEDIDO_VENDA.solicitarRemocaoItem = function () {
	PEDIDO_VENDA.pedidoVendaData.itemRemocao = $(this).closest("tr");
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalRemoverItem")).show();
}

PEDIDO_VENDA.confirmarRemocaoItem = function () {
	if (PEDIDO_VENDA.pedidoVendaData.itemRemocao) {
		PEDIDO_VENDA.pedidoVendaData.itemRemocao.remove();
		PEDIDO_VENDA.pedidoVendaData.itemRemocao = null;
		PEDIDO_VENDA.recalcularTotais();
		HELPER.showToast("Item removido.", "success");
	}

	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalRemoverItem")).hide();
}

PEDIDO_VENDA.recalcularTotais = function () {
	var subtotalPedido = 0;
	var descontoPedido = 0;

	$("#pedidoItens tr").each(function () {
		var $row = $(this);
		var quantidade = Math.max(PEDIDO_VENDA.parseNumber($row.find(".item-quantidade").val()), 0);
		var preco = Math.max(PEDIDO_VENDA.parseNumber($row.find(".item-preco").val()), 0);
		var descontoPercentual = Math.min(Math.max(PEDIDO_VENDA.parseNumber($row.find(".item-desconto-percentual").val()), 0), 100);
		var descontoValor = Math.max(PEDIDO_VENDA.parseNumber($row.find(".item-desconto-valor").val()), 0);
		var bruto = quantidade * preco;
		var desconto = Math.min((bruto * descontoPercentual / 100) + descontoValor, bruto);
		var subtotal = Math.max(bruto - desconto, 0);

		$row.find(".item-desconto-percentual").val(descontoPercentual);
		$row.find(".item-subtotal").text(PEDIDO_VENDA.formatCurrency(subtotal));
		subtotalPedido += bruto;
		descontoPedido += desconto;
	});

	var frete = Math.max(PEDIDO_VENDA.parseNumber($("#frete").val()), 0);
	var acrescimos = Math.max(PEDIDO_VENDA.parseNumber($("#acrescimos").val()), 0);
	var total = Math.max(subtotalPedido - descontoPedido + frete + acrescimos, 0);

	$("#totalSubtotal").text(PEDIDO_VENDA.formatCurrency(subtotalPedido));
	$("#totalDesconto").text(PEDIDO_VENDA.formatCurrency(descontoPedido));
	$("#totalGeral").text(PEDIDO_VENDA.formatCurrency(total)).data("value", total);
	PEDIDO_VENDA.validarParcelas();
}

PEDIDO_VENDA.gerarParcelas = function () {
	var total = PEDIDO_VENDA.getTotalGeral();
	var quantidade = Math.max(parseInt($("#numeroParcelas").val(), 10) || 1, 1);
	var hoje = new Date();
	var valorBase = Math.floor((total / quantidade) * 100) / 100;
	var acumulado = 0;

	$("#pedidoParcelas").empty();

	for (var i = 1; i <= quantidade; i++) {
		var valor = i === quantidade ? total - acumulado : valorBase;
		var vencimento = new Date(hoje.getFullYear(), hoje.getMonth() + i - 1, hoje.getDate());

		acumulado += valor;
		PEDIDO_VENDA.adicionarParcela(i, valor, vencimento.toISOString().substring(0, 10));
	}

	PEDIDO_VENDA.validarParcelas();
}

PEDIDO_VENDA.adicionarParcelaManual = function () {
	PEDIDO_VENDA.adicionarParcela($("#pedidoParcelas tr").length + 1, 0, new Date().toISOString().substring(0, 10));
	PEDIDO_VENDA.validarParcelas();
}

PEDIDO_VENDA.adicionarParcela = function (numero, valor, vencimento) {
	var formaText = PEDIDO_VENDA.getSelectedText("#formaPagamento") || "Selecione";
	var row = '' +
		'<tr>' +
			'<td><span class="badge bg-blue-lt">Parcela ' + numero + '</span></td>' +
			'<td><input type="text" class="form-control parcela-valor" value="' + PEDIDO_VENDA.formatNumber(valor) + '"></td>' +
			'<td><input type="date" class="form-control parcela-vencimento" value="' + vencimento + '"></td>' +
			'<td><input type="text" class="form-control parcela-forma" value="' + PEDIDO_VENDA.escapeHtml(formaText) + '"></td>' +
			'<td><input type="text" class="form-control parcela-observacao" placeholder="Opcional"></td>' +
			'<td class="text-end"><button type="button" class="btn btn-icon btn-outline-danger btn-remover-parcela" aria-label="Remover parcela">x</button></td>' +
		'</tr>';

	$("#pedidoParcelas").append(row);
	PEDIDO_VENDA.initMoneyInput($("#pedidoParcelas tr").last().find(".parcela-valor").get(0));
}

PEDIDO_VENDA.removerParcela = function () {
	$(this).closest("tr").remove();
	PEDIDO_VENDA.renumerarParcelas();
	PEDIDO_VENDA.validarParcelas();
}

PEDIDO_VENDA.renumerarParcelas = function () {
	$("#pedidoParcelas tr").each(function (index) {
		$(this).find(".badge").text("Parcela " + (index + 1));
	});
}

PEDIDO_VENDA.validarParcelas = function () {
	var total = PEDIDO_VENDA.getTotalGeral();
	var soma = 0;

	$("#pedidoParcelas .parcela-valor").each(function () {
		soma += PEDIDO_VENDA.parseNumber($(this).val());
	});

	var saldo = total - soma;
	var ok = Math.abs(saldo) < 0.01;

	$("#alertParcelas").toggleClass("d-none", ok);
	$("#alertParcelasOk").toggleClass("d-none", !ok);
	$("#saldoParcelas").text(PEDIDO_VENDA.formatCurrency(saldo));

	return ok;
}

PEDIDO_VENDA.aplicarTipoDocumentoInicial = function () {
	var tipo = new URLSearchParams(window.location.search).get("tipo");

	if (tipo === "pedido" || tipo === "orcamento") {
		$("#tipoDocumento").val(tipo);
	}
}

PEDIDO_VENDA.atualizarNumeroDocumento = function () {
	var prefixo = $("#tipoDocumento").val() === "orcamento" ? "OC" : "PV";
	var numeroAtual = String($("#numeroPedido").val() || "");
	var partes = numeroAtual.split("-");
	var ano = new Date().getFullYear();
	var sequencia = "0001";

	if (partes.length >= 3) {
		ano = partes[1] || ano;
		sequencia = partes.slice(2).join("-") || sequencia;
	}

	$("#numeroPedido").val(prefixo + "-" + ano + "-" + sequencia);
}

PEDIDO_VENDA.salvarOrcamento = function () {
	$("#tipoDocumento").val("orcamento").trigger("change");
	PEDIDO_VENDA.salvarPedido("#btnSalvarOrcamento", "Orcamento salvo com sucesso.");
}

PEDIDO_VENDA.finalizarVenda = function () {
	if (!PEDIDO_VENDA.validarFormularioPedido(true)) {
		return;
	}

	HELPER.setButtonLoading("#btnFinalizarVenda", true);
	HELPER.setButtonLoading("#btnFooterFinalizarVenda", true);

	setTimeout(function () {
		HELPER.setButtonLoading("#btnFinalizarVenda", false);
		HELPER.setButtonLoading("#btnFooterFinalizarVenda", false);
		$("#situacao").val("faturado").trigger("change");
		HELPER.showToast("Venda finalizada com sucesso.", "success");
	}, 600);
}

PEDIDO_VENDA.salvarPedido = function (button, message) {
	if (!PEDIDO_VENDA.validarFormularioPedido(false)) {
		return;
	}

	HELPER.setButtonLoading(button, true);

	setTimeout(function () {
		HELPER.setButtonLoading(button, false);
		HELPER.showToast(message, "success");
	}, 500);
}

PEDIDO_VENDA.validarFormularioPedido = function (exigeParcelas) {
	var form = $("#formPedidoVenda").get(0);

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Revise os campos obrigatorios.", "warning");
		return false;
	}

	if (!$("#pedidoItens tr").length || PEDIDO_VENDA.getTotalGeral() <= 0) {
		HELPER.showToast("Adicione ao menos um produto com valor.", "warning");
		return false;
	}

	if (exigeParcelas && !PEDIDO_VENDA.validarParcelas()) {
		HELPER.showToast("A soma das parcelas precisa fechar com o total do pedido.", "danger");
		return false;
	}

	$(form).removeClass("was-validated");
	return true;
}

PEDIDO_VENDA.preencherClienteSelecionado = function () {
	var cliente = PEDIDO_VENDA.findById(PEDIDO_VENDA.pedidoVendaData.clientes, $("#clienteId").val());

	$("#clienteFantasia").val(cliente ? cliente.nome_fantasia : "");
	$("#clienteDocumento").val(cliente ? cliente.documento : "");
	$("#clienteTelefone").val(cliente ? cliente.telefone : "");
	$("#clienteEmail").val(cliente ? cliente.email : "");
	$("#clienteEndereco").val(cliente ? cliente.endereco : "");
}

PEDIDO_VENDA.atualizarBadgeSituacao = function () {
	var text = $("#situacao option:selected").text();
	var classes = {
		digitacao: "badge bg-blue-lt",
		aprovado: "badge bg-green-lt",
		faturado: "badge bg-success-lt",
		cancelado: "badge bg-danger-lt"
	};

	$("#badgeSituacao").attr("class", classes[$("#situacao").val()] || "badge bg-secondary-lt").text(text);
}

PEDIDO_VENDA.sincronizarFormaPagamentoParcelas = function () {
	var text = PEDIDO_VENDA.getSelectedText("#formaPagamento");

	if (!text) {
		return;
	}

	$("#pedidoParcelas .parcela-forma").val(text);
}

PEDIDO_VENDA.initPedidoTomSelects = function (context) {
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
				PEDIDO_VENDA.loadSelectOptions($(select).data("ajax-url"), query, callback);
			}, 300)
		});
	});
}

PEDIDO_VENDA.initProductSelect = function (select) {
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
		searchField: ["text", "produto", "sku", "ean13"],
		placeholder: "Buscar produto",
		options: PEDIDO_VENDA.normalizeProductOptions(PEDIDO_VENDA.pedidoVendaData.produtos),
		preload: true,
		load: HELPER.debounce(function (query, callback) {
			callback(PEDIDO_VENDA.filterOptions(PEDIDO_VENDA.normalizeProductOptions(PEDIDO_VENDA.pedidoVendaData.produtos), query));
		}, 300)
	});
}

PEDIDO_VENDA.loadSelectOptions = function (url, query, callback) {
	HELPER.ajaxGet(url, {
		success: function (response) {
			callback(PEDIDO_VENDA.filterOptions(PEDIDO_VENDA.normalizeRows(response), query));
		},
		error: function () {
			callback();
		}
	});
}

PEDIDO_VENDA.refreshRemoteSelect = function (selector, rows) {
	var select = $(selector).get(0);

	if (!select || !select.tomselect) {
		return;
	}

	select.tomselect.clearOptions();
	select.tomselect.addOptions(rows);
	select.tomselect.refreshOptions(false);
}

PEDIDO_VENDA.initPedidoMasks = function () {
	PEDIDO_VENDA.initMoneyInput(document.getElementById("frete"));
	PEDIDO_VENDA.initMoneyInput(document.getElementById("acrescimos"));
}

PEDIDO_VENDA.initMoneyInput = function (element) {
	if (!window.IMask || !element || element.dataset.masked === "1") {
		return;
	}

	element.dataset.masked = "1";
	PEDIDO_VENDA.pedidoVendaMasks[element.id || ("mask-" + Object.keys(PEDIDO_VENDA.pedidoVendaMasks).length)] = window.IMask(element, PEDIDO_VENDA.moneyMaskOptions());
}

PEDIDO_VENDA.moneyMaskOptions = function () {
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
}

PEDIDO_VENDA.normalizeRows = function (response) {
	return response && Array.isArray(response.data) ? response.data : [];
}

PEDIDO_VENDA.normalizeProductOptions = function (rows) {
	return rows.map(function (row) {
		return $.extend({}, row, {
			text: row.text || row.produto
		});
	});
}

PEDIDO_VENDA.filterOptions = function (items, query) {
	var q = String(query || "").toLowerCase();

	if (!q) {
		return items;
	}

	return items.filter(function (item) {
		return [item.text, item.produto, item.documento, item.codigo, item.sku, item.ean13].join(" ").toLowerCase().indexOf(q) !== -1;
	});
}

PEDIDO_VENDA.findById = function (items, id) {
	return items.find(function (item) {
		return String(item.id) === String(id);
	});
}

PEDIDO_VENDA.getTotalGeral = function () {
	return Number($("#totalGeral").data("value") || 0);
}

PEDIDO_VENDA.getSelectedText = function (selector) {
	var select = $(selector).get(0);

	if (select && select.tomselect) {
		var item = select.tomselect.options[select.tomselect.getValue()];
		return item ? item.text : "";
	}

	return $(selector).find("option:selected").text();
}

PEDIDO_VENDA.parseNumber = function (value) {
	var normalized = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);

	return isNaN(number) ? 0 : number;
}

PEDIDO_VENDA.formatNumber = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

PEDIDO_VENDA.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL"
	});
}

PEDIDO_VENDA.escapeHtml = function (value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}



