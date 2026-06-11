const FINANCEIRO_PAGAR = window.FINANCEIRO_PAGAR || {};
window.FINANCEIRO_PAGAR = FINANCEIRO_PAGAR;

FINANCEIRO_PAGAR.masks = {};
FINANCEIRO_PAGAR.data = {
	fornecedores: [],
	compras: [],
	contas: [],
	planos: [],
	formas: [],
	historico: []
};

$(document).ready(function () {
	FINANCEIRO_PAGAR.init();
});

FINANCEIRO_PAGAR.init = function () {
	FINANCEIRO_PAGAR.initializeComponents();
	FINANCEIRO_PAGAR.bindEvents();
	FINANCEIRO_PAGAR.loadInitialData();
};

FINANCEIRO_PAGAR.initializeComponents = function () {
	FINANCEIRO_PAGAR.initTomSelects("#formFinanceiroPagar");
	FINANCEIRO_PAGAR.initMasks();
	FINANCEIRO_PAGAR.setDefaultDates();
	FINANCEIRO_PAGAR.calcularValores();
};

FINANCEIRO_PAGAR.bindEvents = function () {
	$("#formFinanceiroPagar").on("submit", function (event) {
		event.preventDefault();
		var submitter = event.originalEvent && event.originalEvent.submitter ? "#" + event.originalEvent.submitter.id : "#btnFooterSalvarPagar";
		FINANCEIRO_PAGAR.salvarFormulario(submitter);
	});
	$("#btnSalvarContinuar").on("click", function () {
		FINANCEIRO_PAGAR.salvarFormulario("#btnSalvarContinuar");
	});
	$("#btnGerarParcelas, #btnRecalcularParcelas").on("click", FINANCEIRO_PAGAR.gerarParcelas);
	$("#btnGerarPagamento").on("click", FINANCEIRO_PAGAR.gerarPagamento);
	$("#btnBaixaParcial").on("click", FINANCEIRO_PAGAR.registrarBaixaParcial);
	$("#compraId").on("change", FINANCEIRO_PAGAR.buscarCompra);
	$("#situacao").on("change", FINANCEIRO_PAGAR.atualizarBadgeSituacao);
	$("#valorOriginal, #desconto, #juros, #multa, #valorPago, #tipoDesconto, #tipoJuros, #tipoMulta").on("input change", FINANCEIRO_PAGAR.calcularValores);
	$("#numeroParcelas, #intervaloParcelas, #tipoIntervalo, #dataVencimento").on("change", FINANCEIRO_PAGAR.gerarParcelas);
	$("#parcelasTable").on("input change", ".parcela-valor, .parcela-vencimento, .parcela-status", FINANCEIRO_PAGAR.sincronizarParcelas);
	$("#parcelasTable").on("click", ".btn-remover-parcela", FINANCEIRO_PAGAR.removerParcela);
};

FINANCEIRO_PAGAR.loadInitialData = function () {
	HELPER.ajaxGet("../mock/fornecedores.json", {
		success: function (response) {
			FINANCEIRO_PAGAR.data.fornecedores = FINANCEIRO_PAGAR.normalizeRows(response);
			FINANCEIRO_PAGAR.refreshSelect("#fornecedorId", FINANCEIRO_PAGAR.data.fornecedores);
		}
	});

	HELPER.ajaxGet("../mock/financeiro-pagar.json", {
		success: function (response) {
			var data = response.data || {};
			FINANCEIRO_PAGAR.data.compras = data.compras || [];
			FINANCEIRO_PAGAR.data.contas = data.contas_bancarias || [];
			FINANCEIRO_PAGAR.data.planos = data.planos_contas || [];
			FINANCEIRO_PAGAR.data.formas = data.formas_pagamento || [];
			FINANCEIRO_PAGAR.data.historico = data.historico || [];

			FINANCEIRO_PAGAR.refreshSelect("#compraId", FINANCEIRO_PAGAR.data.compras);
			FINANCEIRO_PAGAR.refreshSelect("#contaBancoId", FINANCEIRO_PAGAR.data.contas);
			FINANCEIRO_PAGAR.refreshSelect("#planoContasId", FINANCEIRO_PAGAR.data.planos);
			FINANCEIRO_PAGAR.renderFormasPagamento();
			FINANCEIRO_PAGAR.renderHistorico();
			FINANCEIRO_PAGAR.gerarParcelas();
		}
	});
};

FINANCEIRO_PAGAR.calcularValores = function () {
	var original = Math.max(FINANCEIRO_PAGAR.parseNumber($("#valorOriginal").val()), 0);
	var desconto = FINANCEIRO_PAGAR.calcularAjuste(original, $("#desconto").val(), $("#tipoDesconto").val());
	var juros = FINANCEIRO_PAGAR.calcularAjuste(original, $("#juros").val(), $("#tipoJuros").val());
	var multa = FINANCEIRO_PAGAR.calcularAjuste(original, $("#multa").val(), $("#tipoMulta").val());
	var pago = Math.max(FINANCEIRO_PAGAR.parseNumber($("#valorPago").val()), 0);
	var liquido = Math.max(original - desconto + juros + multa, 0);
	var saldo = Math.max(liquido - pago, 0);

	$("#saldoRestante").val(FINANCEIRO_PAGAR.formatCurrency(saldo)).data("value", saldo);
	$("#resumoOriginal").text(FINANCEIRO_PAGAR.formatCurrency(original));
	$("#resumoDesconto").text(FINANCEIRO_PAGAR.formatCurrency(desconto));
	$("#resumoJuros").text(FINANCEIRO_PAGAR.formatCurrency(juros));
	$("#resumoMulta").text(FINANCEIRO_PAGAR.formatCurrency(multa));
	$("#resumoLiquido").text(FINANCEIRO_PAGAR.formatCurrency(liquido)).data("value", liquido);
	$("#resumoPago").text(FINANCEIRO_PAGAR.formatCurrency(pago));
	$("#resumoSaldo").text(FINANCEIRO_PAGAR.formatCurrency(saldo));

	FINANCEIRO_PAGAR.atualizarSituacaoPorSaldo(saldo, pago);
	FINANCEIRO_PAGAR.sincronizarParcelas();
};

FINANCEIRO_PAGAR.gerarParcelas = function () {
	var total = Number($("#resumoLiquido").data("value") || 0);
	var quantidade = Math.max(parseInt($("#numeroParcelas").val(), 10) || 1, 1);
	var vencimentoBase = FINANCEIRO_PAGAR.parseDate($("#dataVencimento").val()) || new Date();
	var valorBase = Math.floor((total / quantidade) * 100) / 100;
	var acumulado = 0;

	$("#parcelasTable").empty();

	for (var i = 1; i <= quantidade; i++) {
		var valor = i === quantidade ? total - acumulado : valorBase;
		var vencimento = FINANCEIRO_PAGAR.addInterval(vencimentoBase, i - 1);

		acumulado += valor;
		FINANCEIRO_PAGAR.adicionarParcela(i, vencimento, valor, "Aberto");
	}

	$("#totalParcelas").val(quantidade);
	FINANCEIRO_PAGAR.sincronizarParcelas();
};

FINANCEIRO_PAGAR.salvarFormulario = function (button) {
	var form = $("#formFinanceiroPagar").get(0);

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Revise os campos obrigatorios.", "warning");
		return;
	}

	$(form).removeClass("was-validated");

	var payload = FINANCEIRO_PAGAR.coletarPayload();
	var id = FINANCEIRO_PAGAR.getUrlParam("id");
	var request = id ? HELPER.ajaxPut : HELPER.ajaxPost;
	var url = id ? "/api/financeiro/pagar/" + id : "/api/financeiro/pagar";

	request(url, payload, {
		button: button,
		form: "#formFinanceiroPagar",
		success: function () {
			HELPER.showToast("Despesa financeira salva com sucesso.", "success");
		},
		error: function () {
			HELPER.showToast("Nao foi possivel salvar agora. Os dados foram mantidos na tela.", "danger");
		}
	});
};

FINANCEIRO_PAGAR.buscarCompra = function () {
	var compra = FINANCEIRO_PAGAR.findById(FINANCEIRO_PAGAR.data.compras, $("#compraId").val());

	if (!compra) {
		return;
	}

	$("#tipoTitulo").val(compra.tipo_titulo || "Compra Mercadoria");
	$("#numeroDocumento").val(compra.numero || "");
	$("#valorOriginal").val(FINANCEIRO_PAGAR.formatNumber(compra.valor || 0));
	$("#numeroParcelas").val(compra.parcelas || 1);
	$("#totalParcelas").val(compra.parcelas || 1);

	FINANCEIRO_PAGAR.setTomValue("#fornecedorId", compra.fornecedor_id);
	FINANCEIRO_PAGAR.setTomValue("#planoContasId", compra.plano_contas_id);
	FINANCEIRO_PAGAR.calcularValores();
	FINANCEIRO_PAGAR.gerarParcelas();
	HELPER.showToast("Dados da origem preenchidos.", "success");
};

FINANCEIRO_PAGAR.adicionarParcela = function (numero, vencimento, valor, status) {
	var row = "" +
		"<tr>" +
			'<td><span class="badge bg-blue-lt">Parcela ' + numero + "</span></td>" +
			'<td><input type="date" class="form-control parcela-vencimento" value="' + FINANCEIRO_PAGAR.formatDateInput(vencimento) + '"></td>' +
			'<td><input type="text" class="form-control parcela-valor" value="' + FINANCEIRO_PAGAR.formatNumber(valor) + '"></td>' +
			'<td><select class="form-select parcela-status"><option>Aberto</option><option>Pago</option><option>Parcial</option><option>Vencido</option><option>Cancelado</option></select></td>' +
			'<td class="text-end"><button type="button" class="btn btn-icon btn-outline-danger btn-remover-parcela" aria-label="Remover parcela">x</button></td>' +
		"</tr>";

	$("#parcelasTable").append(row);
	var $row = $("#parcelasTable tr").last();
	$row.find(".parcela-status").val(status || "Aberto");
	FINANCEIRO_PAGAR.initMoneyInput($row.find(".parcela-valor").get(0));
};

FINANCEIRO_PAGAR.removerParcela = function () {
	$(this).closest("tr").remove();
	FINANCEIRO_PAGAR.renumerarParcelas();
	FINANCEIRO_PAGAR.sincronizarParcelas();
};

FINANCEIRO_PAGAR.sincronizarParcelas = function () {
	var soma = 0;

	$("#parcelasTable .parcela-valor").each(function () {
		soma += FINANCEIRO_PAGAR.parseNumber($(this).val());
	});

	return soma;
};

FINANCEIRO_PAGAR.gerarPagamento = function () {
	var numero = $("#numeroDocumento").val() || "CP-2026";

	$("#nossoNumero").val("109/" + numero.replace(/\D/g, "").slice(-6));
	$("#linhaDigitavel").val("00190.00009 01234.567890 12345.678901 1 98760000000000");
	$("#codigoBoleto").val("34191.79001 01043.510047 91020.150008 8 98760000000000");
	$("#pixCopiaCola").val("00020101021226860014BR.GOV.BCB.PIX");
	$("#qrcodePix").val("pix://" + numero);
	HELPER.showToast("Pagamento preparado para conferencia.", "success");
};

FINANCEIRO_PAGAR.registrarBaixaParcial = function () {
	var saldo = Number($("#saldoRestante").data("value") || 0);
	var pago = FINANCEIRO_PAGAR.parseNumber($("#valorPago").val());
	var baixa = Math.min(saldo, Math.max(saldo / 2, 0));

	$("#valorPago").val(FINANCEIRO_PAGAR.formatNumber(pago + baixa));
	FINANCEIRO_PAGAR.calcularValores();
	$("#situacao").val("parcial").trigger("change");
	HELPER.showToast("Baixa parcial registrada na tela.", "success");
};

FINANCEIRO_PAGAR.renderFormasPagamento = function () {
	var html = FINANCEIRO_PAGAR.data.formas.map(function (forma) {
		return '<div class="col-12 col-md-6"><label class="form-check"><input class="form-check-input" type="checkbox" name="formas_pagamento[]" value="' + FINANCEIRO_PAGAR.escapeHtml(forma.id) + '"><span class="form-check-label">' + FINANCEIRO_PAGAR.escapeHtml(forma.text) + "</span></label></div>";
	}).join("");

	$("#formasPagamento").html(html);
};

FINANCEIRO_PAGAR.renderHistorico = function () {
	var html = FINANCEIRO_PAGAR.data.historico.map(function (item) {
		return "" +
			'<li class="timeline-event">' +
				'<div class="timeline-event-icon bg-' + FINANCEIRO_PAGAR.escapeHtml(item.status || "primary") + '-lt"></div>' +
				'<div class="card timeline-event-card">' +
					'<div class="card-body">' +
						'<div class="text-secondary small">' + FINANCEIRO_PAGAR.escapeHtml(item.data) + "</div>" +
						'<div class="fw-medium">' + FINANCEIRO_PAGAR.escapeHtml(item.titulo) + "</div>" +
						'<div class="text-secondary">' + FINANCEIRO_PAGAR.escapeHtml(item.descricao) + "</div>" +
					"</div>" +
				"</div>" +
			"</li>";
	}).join("");

	$("#historicoFinanceiro").html(html);
};

FINANCEIRO_PAGAR.atualizarBadgeSituacao = function () {
	var labels = {
		aberto: "Aberto",
		pago: "Pago",
		parcial: "Parcial",
		vencido: "Vencido",
		cancelado: "Cancelado",
		renegociado: "Renegociado"
	};
	var classes = {
		aberto: "badge bg-blue-lt",
		pago: "badge bg-green-lt",
		parcial: "badge bg-azure-lt",
		vencido: "badge bg-orange-lt",
		cancelado: "badge bg-danger-lt",
		renegociado: "badge bg-purple-lt"
	};
	var situacao = $("#situacao").val();

	$("#badgeSituacao").attr("class", classes[situacao] || "badge bg-secondary-lt").text(labels[situacao] || "Aberto");
};

FINANCEIRO_PAGAR.atualizarSituacaoPorSaldo = function (saldo, pago) {
	if ($("#situacao").val() === "cancelado" || $("#situacao").val() === "renegociado") {
		FINANCEIRO_PAGAR.atualizarBadgeSituacao();
		return;
	}

	if (pago > 0 && saldo <= 0) {
		$("#situacao").val("pago");
	} else if (pago > 0) {
		$("#situacao").val("parcial");
	}

	FINANCEIRO_PAGAR.atualizarBadgeSituacao();
};

FINANCEIRO_PAGAR.initTomSelects = function (context) {
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
			valueField: "id",
			labelField: "text",
			searchField: ["text", "documento", "telefone", "codigo", "grupo"],
			placeholder: $(select).data("placeholder") || "",
			preload: true,
			load: HELPER.debounce(function (query, callback) {
				callback(FINANCEIRO_PAGAR.filterOptions(FINANCEIRO_PAGAR.getOptionsForSelect(select.id), query));
			}, 300)
		});
	});
};

FINANCEIRO_PAGAR.initMasks = function () {
	$(".money-field").each(function () {
		FINANCEIRO_PAGAR.initMoneyInput(this);
	});
};

FINANCEIRO_PAGAR.initMoneyInput = function (element) {
	if (!window.IMask || !element || element.dataset.masked === "1") {
		return;
	}

	element.dataset.masked = "1";
	FINANCEIRO_PAGAR.masks[element.id || ("mask-" + Object.keys(FINANCEIRO_PAGAR.masks).length)] = window.IMask(element, {
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

FINANCEIRO_PAGAR.setDefaultDates = function () {
	var hoje = new Date();
	var vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 30);

	$("#dataEmissao").val(FINANCEIRO_PAGAR.formatDateInput(hoje));
	$("#dataVencimento").val(FINANCEIRO_PAGAR.formatDateInput(vencimento));
};

FINANCEIRO_PAGAR.calcularAjuste = function (base, value, tipo) {
	var numero = Math.max(FINANCEIRO_PAGAR.parseNumber(value), 0);

	if (tipo === "percentual") {
		return base * numero / 100;
	}

	return numero;
};

FINANCEIRO_PAGAR.coletarPayload = function () {
	var payload = {};

	$("#formFinanceiroPagar").serializeArray().forEach(function (field) {
		if (payload[field.name]) {
			if (!Array.isArray(payload[field.name])) {
				payload[field.name] = [payload[field.name]];
			}
			payload[field.name].push(field.value);
			return;
		}

		payload[field.name] = field.value;
	});

	payload.parcelas = [];
	$("#parcelasTable tr").each(function (index) {
		payload.parcelas.push({
			parcela: index + 1,
			vencimento: $(this).find(".parcela-vencimento").val(),
			valor: FINANCEIRO_PAGAR.parseNumber($(this).find(".parcela-valor").val()),
			status: $(this).find(".parcela-status").val()
		});
	});

	return payload;
};

FINANCEIRO_PAGAR.refreshSelect = function (selector, rows) {
	var select = $(selector).get(0);

	if (!select || !select.tomselect) {
		return;
	}

	select.tomselect.clearOptions();
	select.tomselect.addOptions(rows || []);
	select.tomselect.refreshOptions(false);
};

FINANCEIRO_PAGAR.setTomValue = function (selector, value) {
	var select = $(selector).get(0);

	if (select && select.tomselect) {
		select.tomselect.setValue(String(value || ""));
		return;
	}

	$(selector).val(value);
};

FINANCEIRO_PAGAR.getOptionsForSelect = function (id) {
	var map = {
		fornecedorId: FINANCEIRO_PAGAR.data.fornecedores,
		compraId: FINANCEIRO_PAGAR.data.compras,
		contaBancoId: FINANCEIRO_PAGAR.data.contas,
		planoContasId: FINANCEIRO_PAGAR.data.planos
	};

	return map[id] || [];
};

FINANCEIRO_PAGAR.filterOptions = function (items, query) {
	var q = String(query || "").toLowerCase();

	if (!q) {
		return items;
	}

	return items.filter(function (item) {
		return [item.text, item.documento, item.telefone, item.codigo, item.grupo, item.numero, item.fornecedor].join(" ").toLowerCase().indexOf(q) !== -1;
	});
};

FINANCEIRO_PAGAR.normalizeRows = function (response) {
	return response && Array.isArray(response.data) ? response.data : [];
};

FINANCEIRO_PAGAR.findById = function (items, id) {
	return items.find(function (item) {
		return String(item.id) === String(id);
	});
};

FINANCEIRO_PAGAR.renumerarParcelas = function () {
	$("#parcelasTable tr").each(function (index) {
		$(this).find(".badge").text("Parcela " + (index + 1));
	});
};

FINANCEIRO_PAGAR.addInterval = function (date, index) {
	var intervalo = Math.max(parseInt($("#intervaloParcelas").val(), 10) || 1, 1);
	var tipo = $("#tipoIntervalo").val();
	var result = new Date(date.getTime());

	if (tipo === "mensal") {
		result.setMonth(result.getMonth() + (index * intervalo));
	} else if (tipo === "quinzenal") {
		result.setDate(result.getDate() + (index * intervalo * 15));
	} else if (tipo === "semanal") {
		result.setDate(result.getDate() + (index * intervalo * 7));
	} else {
		result.setDate(result.getDate() + (index * intervalo));
	}

	return result;
};

FINANCEIRO_PAGAR.parseDate = function (value) {
	if (!value) {
		return null;
	}

	var parts = value.split("-");
	return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
};

FINANCEIRO_PAGAR.formatDateInput = function (date) {
	return date.toISOString().substring(0, 10);
};

FINANCEIRO_PAGAR.parseNumber = function (value) {
	var normalized = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);

	return isNaN(number) ? 0 : number;
};

FINANCEIRO_PAGAR.formatNumber = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
};

FINANCEIRO_PAGAR.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL"
	});
};

FINANCEIRO_PAGAR.getUrlParam = function (key) {
	return new URLSearchParams(window.location.search).get(key);
};

FINANCEIRO_PAGAR.escapeHtml = function (value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};





