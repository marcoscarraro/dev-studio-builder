const FINANCEIRO_PAGAR = window.FINANCEIRO_PAGAR || {};
window.FINANCEIRO_PAGAR = FINANCEIRO_PAGAR;

FINANCEIRO_PAGAR.table = null;
FINANCEIRO_PAGAR.rows = [];
FINANCEIRO_PAGAR.filterRegistered = false;
FINANCEIRO_PAGAR.currentRow = null;
FINANCEIRO_PAGAR.masks = {};

$(document).ready(function () {
	FINANCEIRO_PAGAR.init();
});

FINANCEIRO_PAGAR.init = function () {
	FINANCEIRO_PAGAR.initializeComponents();
	FINANCEIRO_PAGAR.bindEvents();
	FINANCEIRO_PAGAR.loadInitialData();
};

FINANCEIRO_PAGAR.initializeComponents = function () {
	FINANCEIRO_PAGAR.registerFilters();
	FINANCEIRO_PAGAR.iniciarDataTable();
	FINANCEIRO_PAGAR.initMasks();
	FINANCEIRO_PAGAR.setDefaultDates();
};

FINANCEIRO_PAGAR.bindEvents = function () {
	$("#formFiltrosPagar").on("submit", FINANCEIRO_PAGAR.aplicarFiltros);
	$("#filterSearch").on("keyup", HELPER.debounce(FINANCEIRO_PAGAR.aplicarBusca, 300));
	$("#filterSituacao, #filterFornecedor, #filterVencimentoInicio, #filterVencimentoFim").on("change", FINANCEIRO_PAGAR.aplicarFiltros);
	$("#btnClearFilters, #btnClearAdvanced").on("click", FINANCEIRO_PAGAR.limparFiltros);
	$("#btnApplyAdvanced").on("click", FINANCEIRO_PAGAR.aplicarFiltros);
	$("#btnReloadTable").on("click", FINANCEIRO_PAGAR.recarregarTabela);
	$("#tableFinanceiroPagar").on("click", ".btn-pagar", FINANCEIRO_PAGAR.abrirModalPagamentoTitulo);
	$("#tableFinanceiroPagar").on("click", ".btn-historico", FINANCEIRO_PAGAR.abrirHistorico);
	$("#tableFinanceiroPagar").on("click", ".btn-renegociar", FINANCEIRO_PAGAR.abrirRenegociacao);
	$("#tableFinanceiroPagar").on("click", ".btn-cancelar", FINANCEIRO_PAGAR.cancelarTitulo);
	$("#btnSalvarPagamentoTitulo").on("click", FINANCEIRO_PAGAR.salvarPagamentoTitulo);
	$("#btnSalvarRenegociacao").on("click", FINANCEIRO_PAGAR.salvarRenegociacao);
	$("#liqDesconto, #liqValorPago").on("input", FINANCEIRO_PAGAR.calcularPagamentoTitulo);
};

FINANCEIRO_PAGAR.loadInitialData = function () {
	HELPER.ajaxGet("../mock/financeiro-pagar-list.json", {
		success: function (response) {
			FINANCEIRO_PAGAR.rows = FINANCEIRO_PAGAR.normalizeRows(response);
			FINANCEIRO_PAGAR.atualizarKpis(FINANCEIRO_PAGAR.rows);
		}
	});
};

FINANCEIRO_PAGAR.iniciarDataTable = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	FINANCEIRO_PAGAR.table = $("#tableFinanceiroPagar").DataTable({
		ajax: {
			url: "../mock/financeiro-pagar-list.json",
			dataSrc: function (response) {
				FINANCEIRO_PAGAR.rows = FINANCEIRO_PAGAR.normalizeRows(response);
				FINANCEIRO_PAGAR.atualizarKpis(FINANCEIRO_PAGAR.rows);
				return FINANCEIRO_PAGAR.rows;
			}
		},
		processing: true,
		responsive: true,
		colReorder: true,
		stateSave: true,
		stateDuration: 0,
		stateSaveCallback: HELPER.saveDataTableColumnVisibilityState,
		stateLoadCallback: HELPER.loadDataTableColumnVisibilityState,
		autoWidth: false,
		pageLength: 10,
		lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
		order: [[6, "asc"]],
		dom: "<'card-body border-bottom py-3'<'d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center'<'text-secondary'l><'btn-list'Bf>>>rt<'card-footer d-flex flex-column flex-md-row gap-2 align-items-center justify-content-between'ip>",
		buttons: [
			{ extend: "colvis", text: "Colunas", className: "btn btn-outline-secondary" }
		],
		columns: [
			{ data: "situacao" },
			{ data: "fornecedor" },
			{ data: "documento" },
			{ data: "parcela" },
			{ data: "compra" },
			{ data: "emissao" },
			{ data: "vencimento" },
			{ data: "valor" },
			{ data: "desconto" },
			{ data: "juros" },
			{ data: "multa" },
			{ data: "valor_final" },
			{ data: "pago" },
			{ data: "saldo" },
			{ data: "conta_banco" },
			{ data: "plano_contas" },
			{ data: "acoes", orderable: false, searchable: false, className: "text-end all", defaultContent: "" }
		],
		createdRow: function (row, data) {
			if (data.row_class) {
				$(row).addClass(data.row_class);
			}
		},
		columnDefs: [
			{ responsivePriority: 1, targets: 16 },
			{ responsivePriority: 2, targets: 1 },
			{ responsivePriority: 3, targets: 6 },
			{ responsivePriority: 4, targets: 0 },
			{ responsivePriority: 5, targets: 11 },
			{ targets: [4, 5, 8, 9, 10, 14, 15], className: "text-secondary" }
		],
		language: FINANCEIRO_PAGAR.getDataTableLanguage(),
		drawCallback: function () {
			var api = this.api();
			var rows = FINANCEIRO_PAGAR.getFilteredRows(api);

			$("#tableFinanceiroPagar .dropdown-toggle").attr("data-bs-boundary", "viewport");
			$("#emptyStatePagar").toggleClass("d-none", rows.length > 0);
			FINANCEIRO_PAGAR.atualizarKpis(rows);
			FINANCEIRO_PAGAR.atualizarResumo(rows);
		}
	});
};

FINANCEIRO_PAGAR.abrirModalPagamentoTitulo = function (event) {
	event.preventDefault();
	var row = FINANCEIRO_PAGAR.findRow($(this).data("id"));

	if (!row) {
		return;
	}

	FINANCEIRO_PAGAR.currentRow = row;
	$("#pagamentoTituloId").val(row.id);
	$("#liqValorOriginal").val(row.valor);
	$("#liqJuros").val(row.juros);
	$("#liqMulta").val(row.multa);
	$("#liqDesconto").val(FINANCEIRO_PAGAR.formatNumber(row.desconto_numero));
	$("#liqValorFinal").val(row.valor_final);
	$("#liqValorPago").val(FINANCEIRO_PAGAR.formatNumber(row.saldo_numero));
	$("#liqDataPagamento").val(FINANCEIRO_PAGAR.today());
	$("#liqContaBanco").val(row.conta_banco);
	$("#liqParcial").prop("checked", false);
	FINANCEIRO_PAGAR.calcularPagamentoTitulo();
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPagamentoTitulo")).show();
};

FINANCEIRO_PAGAR.salvarPagamentoTitulo = function () {
	var form = $("#formPagamentoTitulo").get(0);

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Revise os campos da pagamento.", "warning");
		return;
	}

	HELPER.ajaxPost("/api/financeiro/pagar/" + $("#pagamentoTituloId").val() + "/pagar", FINANCEIRO_PAGAR.getPagamentoTituloPayload(), {
		button: "#btnSalvarPagamentoTitulo",
		silentError: true,
		success: FINANCEIRO_PAGAR.confirmarPagamentoTituloLocal,
		error: function () {
			FINANCEIRO_PAGAR.confirmarPagamentoTituloLocal();
		}
	});
};

FINANCEIRO_PAGAR.abrirHistorico = function (event) {
	event.preventDefault();
	var row = FINANCEIRO_PAGAR.findRow($(this).data("id"));

	if (!row) {
		return;
	}

	var html = [
		["Despesa criada", "Lancamento " + row.documento + " gerado para " + row.fornecedor + "."],
		["Pagamento emitida", "Conta vinculada: " + row.conta_banco + "."],
		["Ultima atualizacao", "Saldo atual: " + row.saldo + "."]
	].map(function (item) {
		return '<li class="timeline-event"><div class="timeline-event-icon bg-blue-lt"></div><div class="card timeline-event-card"><div class="card-body"><div class="fw-medium">' + item[0] + '</div><div class="text-secondary">' + item[1] + "</div></div></div></li>";
	}).join("");

	$("#timelineHistorico").html(html);
	window.bootstrap.Offcanvas.getOrCreateInstance(document.getElementById("offcanvasHistorico")).show();
};

FINANCEIRO_PAGAR.abrirRenegociacao = function (event) {
	event.preventDefault();
	var row = FINANCEIRO_PAGAR.findRow($(this).data("id"));

	if (!row) {
		return;
	}

	FINANCEIRO_PAGAR.currentRow = row;
	$("#renSaldo").val(row.saldo);
	$("#renPrimeiroVencimento").val(FINANCEIRO_PAGAR.todayPlus(30));
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalRenegociacao")).show();
};

FINANCEIRO_PAGAR.aplicarBusca = function () {
	if (FINANCEIRO_PAGAR.table) {
		FINANCEIRO_PAGAR.table.search($("#filterSearch").val()).draw();
	}
};

FINANCEIRO_PAGAR.aplicarFiltros = function (event) {
	if (event) {
		event.preventDefault();
	}

	if (FINANCEIRO_PAGAR.table) {
		FINANCEIRO_PAGAR.table.search($("#filterSearch").val()).draw();
	}
};

FINANCEIRO_PAGAR.limparFiltros = function () {
	$("#formFiltrosPagar").get(0).reset();
	$("#offcanvasFiltros input, #offcanvasFiltros select").val("");

	if (FINANCEIRO_PAGAR.table) {
		FINANCEIRO_PAGAR.table.search("").draw();
	}

	HELPER.showToast("Filtros removidos.", "success");
};

FINANCEIRO_PAGAR.recarregarTabela = function () {
	if (!FINANCEIRO_PAGAR.table) {
		return;
	}

	FINANCEIRO_PAGAR.table.ajax.reload(function () {
		HELPER.showToast("Listagem atualizada.", "success");
	}, false);
};

FINANCEIRO_PAGAR.cancelarTitulo = function (event) {
	event.preventDefault();
	HELPER.ajaxPut("/api/financeiro/pagar/" + $(this).data("id") + "/cancelar", {}, {
		silentError: true,
		success: function () {
			HELPER.showToast("Despesa enviada para cancelamento.", "success");
			FINANCEIRO_PAGAR.recarregarTabela();
		},
		error: function () {
			HELPER.showToast("Despesa enviada para cancelamento.", "success");
		}
	});
};

FINANCEIRO_PAGAR.salvarRenegociacao = function () {
	HELPER.ajaxPost("/api/financeiro/pagar/" + (FINANCEIRO_PAGAR.currentRow ? FINANCEIRO_PAGAR.currentRow.id : "") + "/renegociar", {
		parcelas: $("#renParcelas").val(),
		primeiro_vencimento: $("#renPrimeiroVencimento").val()
	}, {
		button: "#btnSalvarRenegociacao",
		silentError: true,
		success: function () {
			window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalRenegociacao")).hide();
			HELPER.showToast("Renegociacao gerada.", "success");
		},
		error: function () {
			window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalRenegociacao")).hide();
			HELPER.showToast("Renegociacao registrada no prototipo.", "success");
		}
	});
};

FINANCEIRO_PAGAR.registerFilters = function () {
	if (FINANCEIRO_PAGAR.filterRegistered || !$.fn.dataTable) {
		return;
	}

	$.fn.dataTable.ext.search.push(function (settings, data, dataIndex, rowData) {
		if (!settings.nTable || settings.nTable.id !== "tableFinanceiroPagar") {
			return true;
		}

		var row = rowData || {};
		var filters = {
			situacao: $("#filterSituacao").val(),
			fornecedor: $("#filterFornecedor").val(),
			conta: $("#filterConta").val(),
			plano: $("#filterPlano").val(),
			tipo: $("#filterTipo").val(),
			vendedor: $("#filterVendedor").val(),
			documento: $("#filterDocumento").val(),
			compra: $("#filterCompra").val(),
			nfe: $("#filterNfe").val()
		};

		if (filters.situacao && row.situacao_text !== filters.situacao) return false;
		if (filters.fornecedor && row.fornecedor !== filters.fornecedor) return false;
		if (filters.conta && row.conta_banco !== filters.conta) return false;
		if (filters.plano && row.plano_contas !== filters.plano) return false;
		if (filters.tipo && row.tipo_titulo !== filters.tipo) return false;
		if (filters.vendedor && row.vendedor !== filters.vendedor) return false;
		if (filters.documento && row.documento.toLowerCase().indexOf(filters.documento.toLowerCase()) === -1) return false;
		if (filters.compra && row.compra.toLowerCase().indexOf(filters.compra.toLowerCase()) === -1) return false;
		if (filters.nfe && row.nfe.toLowerCase().indexOf(filters.nfe.toLowerCase()) === -1) return false;
		if (!FINANCEIRO_PAGAR.dateInRange(row.vencimento_iso, $("#filterVencimentoInicio").val(), $("#filterVencimentoFim").val())) return false;
		if (!FINANCEIRO_PAGAR.dateInRange(row.emissao_iso, $("#filterEmissaoInicio").val(), $("#filterEmissaoFim").val())) return false;

		return true;
	});

	FINANCEIRO_PAGAR.filterRegistered = true;
};

FINANCEIRO_PAGAR.confirmarPagamentoTituloLocal = function () {
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPagamentoTitulo")).hide();
	HELPER.showToast("Baixa financeira registrada.", "success");

	if (FINANCEIRO_PAGAR.table) {
		FINANCEIRO_PAGAR.table.ajax.reload(null, false);
	}
};

FINANCEIRO_PAGAR.calcularPagamentoTitulo = function () {
	var row = FINANCEIRO_PAGAR.currentRow || {};
	var final = Math.max(Number(row.valor_final_numero || 0) - FINANCEIRO_PAGAR.parseNumber($("#liqDesconto").val()), 0);
	var pago = FINANCEIRO_PAGAR.parseNumber($("#liqValorPago").val());
	var diferenca = pago - final;

	$("#liqValorFinal").val(FINANCEIRO_PAGAR.formatCurrency(final));
	$("#liqTrocoSaldo").val(diferenca >= 0 ? "Troco " + FINANCEIRO_PAGAR.formatCurrency(diferenca) : "Saldo " + FINANCEIRO_PAGAR.formatCurrency(Math.abs(diferenca)));
};

FINANCEIRO_PAGAR.getPagamentoTituloPayload = function () {
	return {
		id: $("#pagamentoTituloId").val(),
		desconto: FINANCEIRO_PAGAR.parseNumber($("#liqDesconto").val()),
		valor_pago: FINANCEIRO_PAGAR.parseNumber($("#liqValorPago").val()),
		data_pagamento: $("#liqDataPagamento").val(),
		conta_banco: $("#liqContaBanco").val(),
		forma_pagamento: $("#liqFormaPagamento").val(),
		observacao: $("#liqObservacao").val(),
		parcial: $("#liqParcial").is(":checked")
	};
};

FINANCEIRO_PAGAR.atualizarKpis = function (rows) {
	var vencido = rows.filter(function (row) { return row.situacao_text === "Vencido"; });
	var aberto = rows.filter(function (row) { return row.situacao_text !== "Pago" && row.situacao_text !== "Cancelado"; });
	var pagos = rows.filter(function (row) { return row.pago_numero > 0; });
	var totalSaldo = FINANCEIRO_PAGAR.sumRows(aberto, "saldo_numero");
	var totalVencido = FINANCEIRO_PAGAR.sumRows(vencido, "saldo_numero");
	var totalpago = FINANCEIRO_PAGAR.sumRows(pagos, "pago_numero");
	var inadimplencia = totalSaldo > 0 ? (totalVencido / totalSaldo) * 100 : 0;

	$("#kpiAberto").text(FINANCEIRO_PAGAR.formatCurrency(totalSaldo));
	$("#kpiVencido").text(FINANCEIRO_PAGAR.formatCurrency(totalVencido));
	$("#kpiPagoMes").text(FINANCEIRO_PAGAR.formatCurrency(totalpago));
	$("#kpiDespesas").text(rows.length);
	$("#kpiInadimplencia").text(inadimplencia.toFixed(1).replace(".", ",") + "%");
	$("#kpiHoje").text(FINANCEIRO_PAGAR.formatCurrency(FINANCEIRO_PAGAR.sumRows(rows.filter(function (row) {
		return row.vencimento_iso === "2026-05-11" && row.pago_numero > 0;
	}), "pago_numero")));
};

FINANCEIRO_PAGAR.atualizarResumo = function (rows) {
	$("#resumoSaldo").text("Saldo: " + FINANCEIRO_PAGAR.formatCurrency(FINANCEIRO_PAGAR.sumRows(rows, "saldo_numero")));
	$("#resumoPago").text("Pago: " + FINANCEIRO_PAGAR.formatCurrency(FINANCEIRO_PAGAR.sumRows(rows, "pago_numero")));
};

FINANCEIRO_PAGAR.initMasks = function () {
	if (!window.IMask) {
		return;
	}

	$(".money-field").each(function () {
		if (this.dataset.masked === "1") {
			return;
		}

		this.dataset.masked = "1";
		FINANCEIRO_PAGAR.masks[this.id] = window.IMask(this, {
			mask: Number,
			scale: 2,
			signed: false,
			thousandsSeparator: ".",
			padFractionalZeros: true,
			normalizeZeros: true,
			radix: ",",
			mapToRadix: ["."]
		});
	});
};

FINANCEIRO_PAGAR.setDefaultDates = function () {
	$("#liqDataPagamento").val(FINANCEIRO_PAGAR.today());
	$("#renPrimeiroVencimento").val(FINANCEIRO_PAGAR.todayPlus(30));
};

FINANCEIRO_PAGAR.getFilteredRows = function (api) {
	var rows = [];
	api.rows({ filter: "applied" }).every(function () {
		rows.push(this.data());
	});
	return rows;
};

FINANCEIRO_PAGAR.findRow = function (id) {
	return FINANCEIRO_PAGAR.rows.find(function (row) {
		return String(row.id) === String(id);
	});
};

FINANCEIRO_PAGAR.normalizeRows = function (response) {
	return response && Array.isArray(response.data) ? response.data : [];
};

FINANCEIRO_PAGAR.sumRows = function (rows, field) {
	return rows.reduce(function (total, row) {
		return total + Number(row[field] || 0);
	}, 0);
};

FINANCEIRO_PAGAR.dateInRange = function (value, start, end) {
	if (!start && !end) return true;
	if (!value) return false;
	var current = new Date(value + "T00:00:00");
	if (start && current < new Date(start + "T00:00:00")) return false;
	if (end && current > new Date(end + "T23:59:59")) return false;
	return true;
};

FINANCEIRO_PAGAR.parseNumber = function (value) {
	var normalized = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);
	return isNaN(number) ? 0 : number;
};

FINANCEIRO_PAGAR.formatNumber = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

FINANCEIRO_PAGAR.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

FINANCEIRO_PAGAR.today = function () {
	return "2026-05-11";
};

FINANCEIRO_PAGAR.todayPlus = function (days) {
	var date = new Date("2026-05-11T00:00:00");
	date.setDate(date.getDate() + days);
	return date.toISOString().substring(0, 10);
};

FINANCEIRO_PAGAR.getDataTableLanguage = function () {
	return {
		emptyTable: "Nenhuma despesa encontrada",
		info: "Mostrando _START_ ate _END_ de _TOTAL_ registros",
		infoEmpty: "Mostrando 0 ate 0 de 0 registros",
		infoFiltered: "(filtrado de _MAX_ registros no total)",
		lengthMenu: "Mostrar _MENU_ registros",
		loadingRecords: "Carregando...",
		processing: "Processando...",
		search: "Buscar:",
		zeroRecords: "Nenhuma despesa encontrada",
		paginate: { first: "Primeiro", last: "Ultimo", next: "Proximo", previous: "Anterior" },
		buttons: { colvis: "Colunas" }
	};
};






