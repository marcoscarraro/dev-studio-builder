const FLUXO_CAIXA = window.FLUXO_CAIXA || {};
window.FLUXO_CAIXA = FLUXO_CAIXA;

FLUXO_CAIXA.table = null;
FLUXO_CAIXA.rows = [];
FLUXO_CAIXA.filterRegistered = false;
FLUXO_CAIXA.meta = {};

$(document).ready(function () {
	FLUXO_CAIXA.init();
});

FLUXO_CAIXA.init = function () {
	FLUXO_CAIXA.initializeComponents();
	FLUXO_CAIXA.bindEvents();
	FLUXO_CAIXA.loadInitialData();
};

FLUXO_CAIXA.initializeComponents = function () {
	FLUXO_CAIXA.registerFilters();
	FLUXO_CAIXA.initTomSelect();
	FLUXO_CAIXA.setCurrentMonthFilter();
	FLUXO_CAIXA.initDataTable();
};

FLUXO_CAIXA.bindEvents = function () {
	$("#formFiltrosFluxoCaixa").on("submit", FLUXO_CAIXA.filtrar);
	$("#btnAtualizar").on("click", FLUXO_CAIXA.reloadTable);
	$("#btnExportar").on("click", FLUXO_CAIXA.exportar);
	$("#btnImprimir").on("click", FLUXO_CAIXA.imprimir);
	$("#btnLimparFiltros").on("click", FLUXO_CAIXA.limparFiltros);
	$("#btnNovaMovimentacao, #btnEmptyNovaMovimentacao").on("click", FLUXO_CAIXA.novaMovimentacao);
	$("#btnSangria").on("click", FLUXO_CAIXA.registrarSangria);
	$("#btnReforco").on("click", FLUXO_CAIXA.registrarReforco);
	$("#btnModalComprovante").on("click", function () { HELPER.showToast("Comprovante enviado para impressao.", "success"); });
	$("#btnModalConciliar").on("click", function () { HELPER.showToast("Solicitacao de conciliacao enviada ao backend.", "success"); });
	$("#filterCliente, #filterFornecedor, #filterPedidoVenda, #filterPedidoCompra, #filterCaixa, #filterPdv").on("keyup", HELPER.debounce(FLUXO_CAIXA.aplicarFiltros, 300));
	$("#formFiltrosFluxoCaixa select, #filterPeriodoInicio, #filterPeriodoFim").on("change", FLUXO_CAIXA.aplicarFiltros);
	$("#tableFluxoCaixa").on("click", "[data-fluxo-action]", FLUXO_CAIXA.executarAcaoLinha);
};

FLUXO_CAIXA.loadInitialData = function () {
	FLUXO_CAIXA.aplicarFiltros();
};

FLUXO_CAIXA.setCurrentMonthFilter = function () {
	var today = new Date();
	var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
	var lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

	$("#filterPeriodoInicio").val(FLUXO_CAIXA.toInputDate(firstDay));
	$("#filterPeriodoFim").val(FLUXO_CAIXA.toInputDate(lastDay));
};

FLUXO_CAIXA.initDataTable = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	FLUXO_CAIXA.table = $("#tableFluxoCaixa").DataTable({
		ajax: {
			url: "../mock/fluxo-caixa-list.json",
			dataSrc: function (response) {
				FLUXO_CAIXA.rows = response && Array.isArray(response.data) ? response.data : [];
				FLUXO_CAIXA.meta = response || {};
				FLUXO_CAIXA.atualizarResumoApi(FLUXO_CAIXA.meta);
				return FLUXO_CAIXA.rows;
			}
		},
		processing: true,
		responsive: true,
		colReorder: true,
		stateSave: true,
		stateDuration: 0,
		stateSaveCallback: HELPER.saveDataTableColumnVisibilityState,
		stateLoadCallback: HELPER.loadDataTableColumnVisibilityState,
		searchDelay: 500,
		autoWidth: false,
		pageLength: 50,
		lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
		order: [[0, "desc"]],
		dom: "<'card-body border-bottom py-3'<'d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center'<'text-secondary'l><'btn-list'Bf>>>rt<'card-footer d-flex flex-column flex-md-row gap-2 align-items-center justify-content-between'ip>",
		buttons: [
			{ extend: "colvis", text: "Colunas", className: "btn btn-outline-secondary" },
			{ extend: "csvHtml5", text: "CSV", className: "btn btn-outline-secondary", title: "fluxo-caixa" },
			{ extend: "excelHtml5", text: "Excel", className: "btn btn-outline-secondary", title: "fluxo-caixa" },
			{ extend: "pdfHtml5", text: "PDF", className: "btn btn-outline-secondary", title: "fluxo-caixa", orientation: "landscape", pageSize: "A4" },
			{ extend: "print", text: "Imprimir", className: "btn btn-outline-secondary" }
		],
		columns: [
			{ data: "data" },
			{ data: "tipo" },
			{ data: "origem" },
			{ data: "documento" },
			{ data: "descricao" },
			{ data: "pessoa" },
			{ data: "plano_contas" },
			{ data: "conta" },
			{ data: "entrada" },
			{ data: "saida" },
			{ data: "saldo" },
			{ data: "operador" },
			{ data: "status" },
			{ data: "acoes", orderable: false, searchable: false, className: "text-end all" }
		],
		columnDefs: [
			{ responsivePriority: 1, targets: 13 },
			{ responsivePriority: 2, targets: 0 },
			{ responsivePriority: 3, targets: 4 },
			{ responsivePriority: 4, targets: 8 },
			{ responsivePriority: 5, targets: 9 },
			{ responsivePriority: 6, targets: 10 },
			{ targets: [2, 3, 5, 6, 7, 11], className: "text-secondary" }
		],
		footerCallback: function () {
			var resumo = FLUXO_CAIXA.meta && FLUXO_CAIXA.meta.footer ? FLUXO_CAIXA.meta.footer : {};
			$("#footerFluxoCaixa").text(resumo.texto || "Resumo financeiro carregado via API.");
		},
		language: FLUXO_CAIXA.getDataTableLanguage(),
		drawCallback: function () {
			var api = this.api();
			var rows = FLUXO_CAIXA.getFilteredRows(api);

			FLUXO_CAIXA.prepareActionDropdowns();
			$("#emptyStateFluxoCaixa").toggleClass("d-none", rows.length > 0);
		},
		initComplete: function () {
			FLUXO_CAIXA.adjustTable();
		}
	});
};

FLUXO_CAIXA.filtrar = function (event) {
	event.preventDefault();
	FLUXO_CAIXA.aplicarFiltros();
};

FLUXO_CAIXA.aplicarFiltros = function () {
	if (FLUXO_CAIXA.table) {
		FLUXO_CAIXA.table.draw();
	}
};

FLUXO_CAIXA.reloadTable = function () {
	if (!FLUXO_CAIXA.table) {
		return;
	}

	FLUXO_CAIXA.table.ajax.reload(function () {
		HELPER.showToast("Fluxo de caixa atualizado.", "success");
	}, false);
};

FLUXO_CAIXA.exportar = function () {
	HELPER.showToast("Use os botoes CSV, Excel ou PDF na barra da tabela.", "success");
};

FLUXO_CAIXA.imprimir = function () {
	window.print();
};

FLUXO_CAIXA.limparFiltros = function () {
	$("#formFiltrosFluxoCaixa").get(0).reset();
	FLUXO_CAIXA.setCurrentMonthFilter();
	FLUXO_CAIXA.aplicarFiltros();
	HELPER.showToast("Filtros removidos. Periodo voltou para o mes atual.", "success");
};

FLUXO_CAIXA.novaMovimentacao = function () {
	HELPER.showToast("Formulario de nova movimentacao solicitado.", "success");
};

FLUXO_CAIXA.registrarSangria = function () {
	HELPER.showToast("Registro de sangria solicitado.", "warning");
};

FLUXO_CAIXA.registrarReforco = function () {
	HELPER.showToast("Registro de reforco/troco solicitado.", "success");
};

FLUXO_CAIXA.executarAcaoLinha = function (event) {
	event.preventDefault();

	var action = $(this).data("fluxo-action");
	var row = FLUXO_CAIXA.getRowFromElement(this);

	if (action === "visualizar") {
		FLUXO_CAIXA.visualizar(row);
		return;
	}

	if (action === "historico") {
		FLUXO_CAIXA.abrirHistorico(row);
		return;
	}

	if (action === "imprimir") {
		HELPER.showToast("Comprovante preparado para impressao.", "success");
		return;
	}

	if (action === "conciliar") {
		HELPER.showToast("Movimentacao enviada para conciliacao.", "success");
		return;
	}

	if (action === "estornar") {
		HELPER.showToast("Solicitacao de estorno enviada ao backend.", "warning");
		return;
	}

	if (action === "cancelar") {
		HELPER.showToast("Solicitacao de cancelamento enviada ao backend.", "warning");
		return;
	}

	HELPER.showToast("Acao financeira enviada para processamento.", "success");
};

FLUXO_CAIXA.visualizar = function (row) {
	if (!row) {
		return;
	}

	$("#modalDetalhesFluxoCaixaBody").html(
		'<div class="row g-3">' +
			'<div class="col-md-3"><div class="subheader">Data</div><div class="fw-medium">' + FLUXO_CAIXA.escapeHtml(row.data) + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Tipo</div><div>' + (row.tipo || "") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Status</div><div>' + (row.status || "") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Saldo apos lancamento</div><div class="h2 mb-0">' + FLUXO_CAIXA.escapeHtml(row.saldo) + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Origem financeira</div><div class="fw-medium">' + FLUXO_CAIXA.escapeHtml(row.origem) + '</div><div class="text-secondary">' + FLUXO_CAIXA.escapeHtml(row.documento) + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Conta financeira</div><div class="fw-medium">' + FLUXO_CAIXA.escapeHtml(row.conta) + '</div><div class="text-secondary">' + FLUXO_CAIXA.escapeHtml(row.forma_pagamento) + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Centro custo</div><div class="fw-medium">' + FLUXO_CAIXA.escapeHtml(row.centro_custo) + '</div><div class="text-secondary">Caixa ' + FLUXO_CAIXA.escapeHtml(row.caixa) + ' / PDV ' + FLUXO_CAIXA.escapeHtml(row.pdv) + '</div></div>' +
			'<div class="col-md-6"><div class="card bg-light"><div class="card-body"><div class="subheader">Descricao</div><div>' + FLUXO_CAIXA.escapeHtml(row.descricao) + '</div><div class="mt-2 text-secondary">' + FLUXO_CAIXA.escapeHtml(row.observacoes) + '</div></div></div></div>' +
			'<div class="col-md-6"><div class="card bg-light"><div class="card-body"><div class="subheader">Historico</div><div>' + FLUXO_CAIXA.escapeHtml(row.historico) + '</div><div class="mt-2 text-secondary">Usuario: ' + FLUXO_CAIXA.escapeHtml(row.operador) + '</div></div></div></div>' +
			'<div class="col-md-6"><label class="form-label">Anexos</label><textarea class="form-control" rows="3" readonly>' + FLUXO_CAIXA.escapeHtml(row.anexos || "Sem anexos vinculados") + '</textarea></div>' +
			'<div class="col-md-6"><label class="form-label">Alteracoes</label><textarea class="form-control" rows="3" readonly>' + FLUXO_CAIXA.escapeHtml(row.alteracoes || "Sem alteracoes registradas") + '</textarea></div>' +
		'</div>'
	);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalDetalhesFluxoCaixa")).show();
};

FLUXO_CAIXA.abrirHistorico = function (row) {
	if (!row) {
		return;
	}

	var html = (row.timeline || []).map(function (item) {
		return '<li class="timeline-event"><div class="timeline-event-icon bg-blue-lt"></div><div class="card timeline-event-card"><div class="card-body"><div class="fw-medium">' + FLUXO_CAIXA.escapeHtml(item.titulo) + '</div><div class="text-secondary">' + FLUXO_CAIXA.escapeHtml(item.descricao) + '</div></div></div></li>';
	}).join("");

	$("#timelineHistoricoFluxoCaixa").html(html || '<li class="timeline-event"><div class="timeline-event-icon bg-secondary-lt"></div><div class="card timeline-event-card"><div class="card-body">Sem historico adicional.</div></div></li>');
	window.bootstrap.Offcanvas.getOrCreateInstance(document.getElementById("offcanvasHistoricoFluxoCaixa")).show();
};

FLUXO_CAIXA.registerFilters = function () {
	if (FLUXO_CAIXA.filterRegistered || !$.fn.dataTable) {
		return;
	}

	$.fn.dataTable.ext.search.push(function (settings, data, dataIndex, rowData) {
		if (!settings.nTable || settings.nTable.id !== "tableFluxoCaixa") {
			return true;
		}

		var row = rowData || {};

		if ($("#filterConta").val() && row.conta !== $("#filterConta").val()) return false;
		if ($("#filterOperador").val() && row.operador !== $("#filterOperador").val()) return false;
		if ($("#filterTipo").val() && row.tipo_text !== $("#filterTipo").val()) return false;
		if ($("#filterStatus").val() && row.status_text !== $("#filterStatus").val()) return false;
		if ($("#filterCategoria").val() && row.categoria_financeira !== $("#filterCategoria").val()) return false;
		if ($("#filterPlano").val() && row.plano_contas !== $("#filterPlano").val()) return false;
		if ($("#filterOrigem").val() && row.origem !== $("#filterOrigem").val()) return false;
		if ($("#filterCentroCusto").val() && row.centro_custo !== $("#filterCentroCusto").val()) return false;
		if ($("#filterFormaPagamento").val() && row.forma_pagamento !== $("#filterFormaPagamento").val()) return false;
		if (!FLUXO_CAIXA.contains(row.cliente, $("#filterCliente").val())) return false;
		if (!FLUXO_CAIXA.contains(row.fornecedor, $("#filterFornecedor").val())) return false;
		if (!FLUXO_CAIXA.contains(row.pedido_venda, $("#filterPedidoVenda").val())) return false;
		if (!FLUXO_CAIXA.contains(row.pedido_compra, $("#filterPedidoCompra").val())) return false;
		if (!FLUXO_CAIXA.contains(row.caixa, $("#filterCaixa").val())) return false;
		if (!FLUXO_CAIXA.contains(row.pdv, $("#filterPdv").val())) return false;
		if (!FLUXO_CAIXA.dateInRange(row.data_iso, $("#filterPeriodoInicio").val(), $("#filterPeriodoFim").val())) return false;

		return true;
	});

	FLUXO_CAIXA.filterRegistered = true;
};

FLUXO_CAIXA.atualizarResumoApi = function (response) {
	var kpis = response.kpis || {};
	var resumo = response.resumo_diario || {};

	$("#kpiEntradas").text(kpis.entradas || "R$ 0,00");
	$("#kpiSaidas").text(kpis.saidas || "R$ 0,00");
	$("#kpiSaldoPeriodo").text(kpis.saldo_periodo || "R$ 0,00");
	$("#kpiSangrias").text(kpis.sangrias || "R$ 0,00");
	$("#kpiReforcos").text(kpis.reforcos || "R$ 0,00");
	$("#kpiEstornos").text(kpis.estornos || "R$ 0,00");
	$("#kpiSaldoAtual").text(kpis.saldo_atual || "R$ 0,00");
	$("#resumoData").text(resumo.data || "Hoje");
	$("#resumoSaldoInicial").text(resumo.saldo_inicial || "R$ 0,00");
	$("#resumoEntradas").text(resumo.entradas || "R$ 0,00");
	$("#resumoSaidas").text(resumo.saidas || "R$ 0,00");
	$("#resumoSangrias").text(resumo.sangrias || "R$ 0,00");
	$("#resumoReforcos").text(resumo.reforcos || "R$ 0,00");
	$("#resumoSaldoFinal").text(resumo.saldo_final || "R$ 0,00");
};

FLUXO_CAIXA.initTomSelect = function () {
	if (!window.TomSelect) {
		return;
	}

	$("#formFiltrosFluxoCaixa select").each(function () {
		if (this.tomselect) {
			return;
		}

		new TomSelect(this, {
			plugins: ["dropdown_input", "clear_button"],
			copyClassesToDropdown: false,
			controlInput: "<input>",
			dropdownParent: "body"
		});
	});
};

FLUXO_CAIXA.getRowFromElement = function (element) {
	if (!FLUXO_CAIXA.table) {
		return null;
	}

	var $tr = $(element).closest("tr");
	var row = FLUXO_CAIXA.table.row($tr).data();

	if (!row && $tr.hasClass("child")) {
		row = FLUXO_CAIXA.table.row($tr.prev()).data();
	}

	return row;
};

FLUXO_CAIXA.getFilteredRows = function (api) {
	var rows = [];
	api.rows({ filter: "applied" }).every(function () {
		rows.push(this.data());
	});
	return rows;
};

FLUXO_CAIXA.contains = function (value, query) {
	query = String(query || "").toLowerCase();
	if (!query) return true;
	return String(value || "").toLowerCase().indexOf(query) !== -1;
};

FLUXO_CAIXA.dateInRange = function (value, start, end) {
	if (!start && !end) return true;
	if (!value) return false;
	var current = new Date(value + "T00:00:00");
	if (start && current < new Date(start + "T00:00:00")) return false;
	if (end && current > new Date(end + "T23:59:59")) return false;
	return true;
};

FLUXO_CAIXA.toInputDate = function (date) {
	var year = date.getFullYear();
	var month = String(date.getMonth() + 1).padStart(2, "0");
	var day = String(date.getDate()).padStart(2, "0");
	return year + "-" + month + "-" + day;
};

FLUXO_CAIXA.prepareActionDropdowns = function () {
	$("#tableFluxoCaixa .dropdown-toggle").attr("data-bs-boundary", "viewport");
};

FLUXO_CAIXA.adjustTable = function () {
	if (!FLUXO_CAIXA.table) {
		return;
	}

	FLUXO_CAIXA.table.columns.adjust();

	if (FLUXO_CAIXA.table.responsive) {
		FLUXO_CAIXA.table.responsive.recalc();
	}
};

FLUXO_CAIXA.escapeHtml = function (value) {
	return String(value == null ? "" : value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};

FLUXO_CAIXA.getDataTableLanguage = function () {
	return {
		emptyTable: "Nenhuma movimentacao encontrada",
		info: "Mostrando _START_ ate _END_ de _TOTAL_ registros",
		infoEmpty: "Mostrando 0 ate 0 de 0 registros",
		infoFiltered: "(filtrado de _MAX_ registros no total)",
		lengthMenu: "Mostrar _MENU_ registros",
		loadingRecords: "Carregando...",
		processing: "Processando...",
		search: "Buscar:",
		zeroRecords: "Nenhuma movimentacao encontrada",
		paginate: {
			first: "Primeiro",
			last: "Ultimo",
			next: "Proximo",
			previous: "Anterior"
		},
		buttons: {
			colvis: "Colunas"
		}
	};
};

