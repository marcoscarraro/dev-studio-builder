const FINANCEIRO_RECEBER = window.FINANCEIRO_RECEBER || {};
window.FINANCEIRO_RECEBER = FINANCEIRO_RECEBER;

FINANCEIRO_RECEBER.masks = {};
FINANCEIRO_RECEBER.data = {
	clientes: [],
	pedidos: [],
	contas: [],
	planos: [],
	formas: [],
	historico: []
};

$(document).ready(function () {
	FINANCEIRO_RECEBER.init();
});

FINANCEIRO_RECEBER.init = function () {
	FINANCEIRO_RECEBER.initializeComponents();
	FINANCEIRO_RECEBER.bindEvents();
	FINANCEIRO_RECEBER.loadInitialData();
};

FINANCEIRO_RECEBER.initializeComponents = function () {
	FINANCEIRO_RECEBER.initTomSelects("#formFinanceiroReceber");
	FINANCEIRO_RECEBER.initMasks();
	FINANCEIRO_RECEBER.setDefaultDates();
	FINANCEIRO_RECEBER.calcularValores();
};

FINANCEIRO_RECEBER.bindEvents = function () {
	$("#formFinanceiroReceber").on("submit", function (event) {
		event.preventDefault();
		var submitter = event.originalEvent && event.originalEvent.submitter ? "#" + event.originalEvent.submitter.id : "#btnFooterSalvarReceber";
		FINANCEIRO_RECEBER.salvarFormulario(submitter);
	});
	$("#btnSalvarContinuar").on("click", function () {
		FINANCEIRO_RECEBER.salvarFormulario("#btnSalvarContinuar");
	});
	$("#btnGerarParcelas, #btnRecalcularParcelas").on("click", FINANCEIRO_RECEBER.gerarParcelas);
	$("#btnGerarCobranca").on("click", FINANCEIRO_RECEBER.gerarCobranca);
	$("#btnBaixaParcial").on("click", FINANCEIRO_RECEBER.registrarBaixaParcial);
	$("#pedidoId").on("change", FINANCEIRO_RECEBER.buscarPedido);
	$("#situacao").on("change", FINANCEIRO_RECEBER.atualizarBadgeSituacao);
	$("#valorOriginal, #desconto, #juros, #multa, #valorRecebido, #tipoDesconto, #tipoJuros, #tipoMulta").on("input change", FINANCEIRO_RECEBER.calcularValores);
	$("#numeroParcelas, #intervaloParcelas, #tipoIntervalo, #dataVencimento").on("change", FINANCEIRO_RECEBER.gerarParcelas);
	$("#parcelasTable").on("input change", ".parcela-valor, .parcela-vencimento, .parcela-status", FINANCEIRO_RECEBER.sincronizarParcelas);
	$("#parcelasTable").on("click", ".btn-remover-parcela", FINANCEIRO_RECEBER.removerParcela);
};

FINANCEIRO_RECEBER.loadInitialData = function () {
	HELPER.ajaxGet("../mock/clientes.json", {
		success: function (response) {
			FINANCEIRO_RECEBER.data.clientes = FINANCEIRO_RECEBER.normalizeRows(response);
			FINANCEIRO_RECEBER.refreshSelect("#clienteId", FINANCEIRO_RECEBER.data.clientes);
		}
	});

	HELPER.ajaxGet("../mock/financeiro-receber.json", {
		success: function (response) {
			var data = response.data || {};
			FINANCEIRO_RECEBER.data.pedidos = data.pedidos || [];
			FINANCEIRO_RECEBER.data.contas = data.contas_bancarias || [];
			FINANCEIRO_RECEBER.data.planos = data.planos_contas || [];
			FINANCEIRO_RECEBER.data.formas = data.formas_recebimento || [];
			FINANCEIRO_RECEBER.data.historico = data.historico || [];

			FINANCEIRO_RECEBER.refreshSelect("#pedidoId", FINANCEIRO_RECEBER.data.pedidos);
			FINANCEIRO_RECEBER.refreshSelect("#contaBancoId", FINANCEIRO_RECEBER.data.contas);
			FINANCEIRO_RECEBER.refreshSelect("#planoContasId", FINANCEIRO_RECEBER.data.planos);
			FINANCEIRO_RECEBER.renderFormasRecebimento();
			FINANCEIRO_RECEBER.renderHistorico();
			FINANCEIRO_RECEBER.gerarParcelas();
		}
	});
};

FINANCEIRO_RECEBER.calcularValores = function () {
	var original = Math.max(FINANCEIRO_RECEBER.parseNumber($("#valorOriginal").val()), 0);
	var desconto = FINANCEIRO_RECEBER.calcularAjuste(original, $("#desconto").val(), $("#tipoDesconto").val());
	var juros = FINANCEIRO_RECEBER.calcularAjuste(original, $("#juros").val(), $("#tipoJuros").val());
	var multa = FINANCEIRO_RECEBER.calcularAjuste(original, $("#multa").val(), $("#tipoMulta").val());
	var recebido = Math.max(FINANCEIRO_RECEBER.parseNumber($("#valorRecebido").val()), 0);
	var liquido = Math.max(original - desconto + juros + multa, 0);
	var saldo = Math.max(liquido - recebido, 0);

	$("#saldoRestante").val(FINANCEIRO_RECEBER.formatCurrency(saldo)).data("value", saldo);
	$("#resumoOriginal").text(FINANCEIRO_RECEBER.formatCurrency(original));
	$("#resumoDesconto").text(FINANCEIRO_RECEBER.formatCurrency(desconto));
	$("#resumoJuros").text(FINANCEIRO_RECEBER.formatCurrency(juros));
	$("#resumoMulta").text(FINANCEIRO_RECEBER.formatCurrency(multa));
	$("#resumoLiquido").text(FINANCEIRO_RECEBER.formatCurrency(liquido)).data("value", liquido);
	$("#resumoRecebido").text(FINANCEIRO_RECEBER.formatCurrency(recebido));
	$("#resumoSaldo").text(FINANCEIRO_RECEBER.formatCurrency(saldo));

	FINANCEIRO_RECEBER.atualizarSituacaoPorSaldo(saldo, recebido);
	FINANCEIRO_RECEBER.sincronizarParcelas();
};

FINANCEIRO_RECEBER.gerarParcelas = function () {
	var total = Number($("#resumoLiquido").data("value") || 0);
	var quantidade = Math.max(parseInt($("#numeroParcelas").val(), 10) || 1, 1);
	var vencimentoBase = FINANCEIRO_RECEBER.parseDate($("#dataVencimento").val()) || new Date();
	var valorBase = Math.floor((total / quantidade) * 100) / 100;
	var acumulado = 0;

	$("#parcelasTable").empty();

	for (var i = 1; i <= quantidade; i++) {
		var valor = i === quantidade ? total - acumulado : valorBase;
		var vencimento = FINANCEIRO_RECEBER.addInterval(vencimentoBase, i - 1);

		acumulado += valor;
		FINANCEIRO_RECEBER.adicionarParcela(i, vencimento, valor, "Aberto");
	}

	$("#totalParcelas").val(quantidade);
	FINANCEIRO_RECEBER.sincronizarParcelas();
};

FINANCEIRO_RECEBER.salvarFormulario = function (button) {
	var form = $("#formFinanceiroReceber").get(0);

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Revise os campos obrigatorios.", "warning");
		return;
	}

	$(form).removeClass("was-validated");

	var payload = FINANCEIRO_RECEBER.coletarPayload();
	var id = FINANCEIRO_RECEBER.getUrlParam("id");
	var request = id ? HELPER.ajaxPut : HELPER.ajaxPost;
	var url = id ? "/api/financeiro/receber/" + id : "/api/financeiro/receber";

	request(url, payload, {
		button: button,
		form: "#formFinanceiroReceber",
		success: function () {
			HELPER.showToast("Titulo financeiro salvo com sucesso.", "success");
		},
		error: function () {
			HELPER.showToast("Nao foi possivel salvar agora. Os dados foram mantidos na tela.", "danger");
		}
	});
};

FINANCEIRO_RECEBER.buscarPedido = function () {
	var pedido = FINANCEIRO_RECEBER.findById(FINANCEIRO_RECEBER.data.pedidos, $("#pedidoId").val());

	if (!pedido) {
		return;
	}

	$("#tipoTitulo").val(pedido.tipo_titulo || "Venda Produto");
	$("#numeroDocumento").val(pedido.numero || "");
	$("#valorOriginal").val(FINANCEIRO_RECEBER.formatNumber(pedido.valor || 0));
	$("#numeroParcelas").val(pedido.parcelas || 1);
	$("#totalParcelas").val(pedido.parcelas || 1);

	FINANCEIRO_RECEBER.setTomValue("#clienteId", pedido.cliente_id);
	FINANCEIRO_RECEBER.setTomValue("#planoContasId", pedido.plano_contas_id);
	FINANCEIRO_RECEBER.calcularValores();
	FINANCEIRO_RECEBER.gerarParcelas();
	HELPER.showToast("Dados da origem preenchidos.", "success");
};

FINANCEIRO_RECEBER.adicionarParcela = function (numero, vencimento, valor, status) {
	var row = "" +
		"<tr>" +
			'<td><span class="badge bg-blue-lt">Parcela ' + numero + "</span></td>" +
			'<td><input type="date" class="form-control parcela-vencimento" value="' + FINANCEIRO_RECEBER.formatDateInput(vencimento) + '"></td>' +
			'<td><input type="text" class="form-control parcela-valor" value="' + FINANCEIRO_RECEBER.formatNumber(valor) + '"></td>' +
			'<td><select class="form-select parcela-status"><option>Aberto</option><option>Pago</option><option>Parcial</option><option>Vencido</option><option>Cancelado</option></select></td>' +
			'<td class="text-end"><button type="button" class="btn btn-icon btn-outline-danger btn-remover-parcela" aria-label="Remover parcela">x</button></td>' +
		"</tr>";

	$("#parcelasTable").append(row);
	var $row = $("#parcelasTable tr").last();
	$row.find(".parcela-status").val(status || "Aberto");
	FINANCEIRO_RECEBER.initMoneyInput($row.find(".parcela-valor").get(0));
};

FINANCEIRO_RECEBER.removerParcela = function () {
	$(this).closest("tr").remove();
	FINANCEIRO_RECEBER.renumerarParcelas();
	FINANCEIRO_RECEBER.sincronizarParcelas();
};

FINANCEIRO_RECEBER.sincronizarParcelas = function () {
	var soma = 0;

	$("#parcelasTable .parcela-valor").each(function () {
		soma += FINANCEIRO_RECEBER.parseNumber($(this).val());
	});

	return soma;
};

FINANCEIRO_RECEBER.gerarCobranca = function () {
	var numero = $("#numeroDocumento").val() || "CR-2026";

	$("#nossoNumero").val("109/" + numero.replace(/\D/g, "").slice(-6));
	$("#linhaDigitavel").val("00190.00009 01234.567890 12345.678901 1 98760000000000");
	$("#codigoBoleto").val("34191.79001 01043.510047 91020.150008 8 98760000000000");
	$("#pixCopiaCola").val("00020101021226860014BR.GOV.BCB.PIX");
	$("#qrcodePix").val("pix://" + numero);
	HELPER.showToast("Cobranca preparada para conferencia.", "success");
};

FINANCEIRO_RECEBER.registrarBaixaParcial = function () {
	var saldo = Number($("#saldoRestante").data("value") || 0);
	var recebido = FINANCEIRO_RECEBER.parseNumber($("#valorRecebido").val());
	var baixa = Math.min(saldo, Math.max(saldo / 2, 0));

	$("#valorRecebido").val(FINANCEIRO_RECEBER.formatNumber(recebido + baixa));
	FINANCEIRO_RECEBER.calcularValores();
	$("#situacao").val("parcial").trigger("change");
	HELPER.showToast("Baixa parcial registrada na tela.", "success");
};

FINANCEIRO_RECEBER.renderFormasRecebimento = function () {
	var html = FINANCEIRO_RECEBER.data.formas.map(function (forma) {
		return '<div class="col-12 col-md-6"><label class="form-check"><input class="form-check-input" type="checkbox" name="formas_recebimento[]" value="' + FINANCEIRO_RECEBER.escapeHtml(forma.id) + '"><span class="form-check-label">' + FINANCEIRO_RECEBER.escapeHtml(forma.text) + "</span></label></div>";
	}).join("");

	$("#formasRecebimento").html(html);
};

FINANCEIRO_RECEBER.renderHistorico = function () {
	var html = FINANCEIRO_RECEBER.data.historico.map(function (item) {
		return "" +
			'<li class="timeline-event">' +
				'<div class="timeline-event-icon bg-' + FINANCEIRO_RECEBER.escapeHtml(item.status || "primary") + '-lt"></div>' +
				'<div class="card timeline-event-card">' +
					'<div class="card-body">' +
						'<div class="text-secondary small">' + FINANCEIRO_RECEBER.escapeHtml(item.data) + "</div>" +
						'<div class="fw-medium">' + FINANCEIRO_RECEBER.escapeHtml(item.titulo) + "</div>" +
						'<div class="text-secondary">' + FINANCEIRO_RECEBER.escapeHtml(item.descricao) + "</div>" +
					"</div>" +
				"</div>" +
			"</li>";
	}).join("");

	$("#historicoFinanceiro").html(html);
};

FINANCEIRO_RECEBER.atualizarBadgeSituacao = function () {
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

FINANCEIRO_RECEBER.atualizarSituacaoPorSaldo = function (saldo, recebido) {
	if ($("#situacao").val() === "cancelado" || $("#situacao").val() === "renegociado") {
		FINANCEIRO_RECEBER.atualizarBadgeSituacao();
		return;
	}

	if (recebido > 0 && saldo <= 0) {
		$("#situacao").val("pago");
	} else if (recebido > 0) {
		$("#situacao").val("parcial");
	}

	FINANCEIRO_RECEBER.atualizarBadgeSituacao();
};

FINANCEIRO_RECEBER.initTomSelects = function (context) {
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
				callback(FINANCEIRO_RECEBER.filterOptions(FINANCEIRO_RECEBER.getOptionsForSelect(select.id), query));
			}, 300)
		});
	});
};

FINANCEIRO_RECEBER.initMasks = function () {
	$(".money-field").each(function () {
		FINANCEIRO_RECEBER.initMoneyInput(this);
	});
};

FINANCEIRO_RECEBER.initMoneyInput = function (element) {
	if (!window.IMask || !element || element.dataset.masked === "1") {
		return;
	}

	element.dataset.masked = "1";
	FINANCEIRO_RECEBER.masks[element.id || ("mask-" + Object.keys(FINANCEIRO_RECEBER.masks).length)] = window.IMask(element, {
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

FINANCEIRO_RECEBER.setDefaultDates = function () {
	var hoje = new Date();
	var vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 30);

	$("#dataEmissao").val(FINANCEIRO_RECEBER.formatDateInput(hoje));
	$("#dataVencimento").val(FINANCEIRO_RECEBER.formatDateInput(vencimento));
};

FINANCEIRO_RECEBER.calcularAjuste = function (base, value, tipo) {
	var numero = Math.max(FINANCEIRO_RECEBER.parseNumber(value), 0);

	if (tipo === "percentual") {
		return base * numero / 100;
	}

	return numero;
};

FINANCEIRO_RECEBER.coletarPayload = function () {
	var payload = {};

	$("#formFinanceiroReceber").serializeArray().forEach(function (field) {
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
			valor: FINANCEIRO_RECEBER.parseNumber($(this).find(".parcela-valor").val()),
			status: $(this).find(".parcela-status").val()
		});
	});

	return payload;
};

FINANCEIRO_RECEBER.refreshSelect = function (selector, rows) {
	var select = $(selector).get(0);

	if (!select || !select.tomselect) {
		return;
	}

	select.tomselect.clearOptions();
	select.tomselect.addOptions(rows || []);
	select.tomselect.refreshOptions(false);
};

FINANCEIRO_RECEBER.setTomValue = function (selector, value) {
	var select = $(selector).get(0);

	if (select && select.tomselect) {
		select.tomselect.setValue(String(value || ""));
		return;
	}

	$(selector).val(value);
};

FINANCEIRO_RECEBER.getOptionsForSelect = function (id) {
	var map = {
		clienteId: FINANCEIRO_RECEBER.data.clientes,
		pedidoId: FINANCEIRO_RECEBER.data.pedidos,
		contaBancoId: FINANCEIRO_RECEBER.data.contas,
		planoContasId: FINANCEIRO_RECEBER.data.planos
	};

	return map[id] || [];
};

FINANCEIRO_RECEBER.filterOptions = function (items, query) {
	var q = String(query || "").toLowerCase();

	if (!q) {
		return items;
	}

	return items.filter(function (item) {
		return [item.text, item.documento, item.telefone, item.codigo, item.grupo, item.numero, item.cliente].join(" ").toLowerCase().indexOf(q) !== -1;
	});
};

FINANCEIRO_RECEBER.normalizeRows = function (response) {
	return response && Array.isArray(response.data) ? response.data : [];
};

FINANCEIRO_RECEBER.findById = function (items, id) {
	return items.find(function (item) {
		return String(item.id) === String(id);
	});
};

FINANCEIRO_RECEBER.renumerarParcelas = function () {
	$("#parcelasTable tr").each(function (index) {
		$(this).find(".badge").text("Parcela " + (index + 1));
	});
};

FINANCEIRO_RECEBER.addInterval = function (date, index) {
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

FINANCEIRO_RECEBER.parseDate = function (value) {
	if (!value) {
		return null;
	}

	var parts = value.split("-");
	return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
};

FINANCEIRO_RECEBER.formatDateInput = function (date) {
	return date.toISOString().substring(0, 10);
};

FINANCEIRO_RECEBER.parseNumber = function (value) {
	var normalized = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);

	return isNaN(number) ? 0 : number;
};

FINANCEIRO_RECEBER.formatNumber = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
};

FINANCEIRO_RECEBER.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL"
	});
};

FINANCEIRO_RECEBER.getUrlParam = function (key) {
	return new URLSearchParams(window.location.search).get(key);
};

FINANCEIRO_RECEBER.escapeHtml = function (value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};
