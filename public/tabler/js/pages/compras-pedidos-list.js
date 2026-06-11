const PEDIDO_COMPRA = window.PEDIDO_COMPRA || {};
window.PEDIDO_COMPRA = PEDIDO_COMPRA;

PEDIDO_COMPRA.table = null;
PEDIDO_COMPRA.rows = [];
PEDIDO_COMPRA.filterRegistered = false;

$(document).ready(function () {
	PEDIDO_COMPRA.init();
});

PEDIDO_COMPRA.init = function () {
	PEDIDO_COMPRA.initializeComponents();
	PEDIDO_COMPRA.bindEvents();
	PEDIDO_COMPRA.loadInitialData();
};

PEDIDO_COMPRA.initializeComponents = function () {
	PEDIDO_COMPRA.registerFilters();
	PEDIDO_COMPRA.iniciarDataTable();
};

PEDIDO_COMPRA.bindEvents = function () {
	$("#formFiltrosCompras").on("submit", PEDIDO_COMPRA.aplicarFiltros);
	$("#filterSearch").on("keyup", HELPER.debounce(PEDIDO_COMPRA.aplicarBusca, 300));
	$("#formFiltrosCompras select, #formFiltrosCompras input[type='date']").on("change", PEDIDO_COMPRA.aplicarFiltros);
	$("#filterNumeroPedido, #filterNfe").on("keyup", HELPER.debounce(PEDIDO_COMPRA.aplicarFiltros, 300));
	$("#btnClearFilters, #btnClearAdvanced").on("click", PEDIDO_COMPRA.limparFiltros);
	$("#btnApplyAdvanced").on("click", PEDIDO_COMPRA.aplicarFiltros);
	$("#btnReloadTable").on("click", PEDIDO_COMPRA.recarregarTabela);
	$("#btnExportar, #btnImportarXml, #btnRelatorios").on("click", PEDIDO_COMPRA.executarAcaoSecundaria);
};

PEDIDO_COMPRA.loadInitialData = function () {
	HELPER.ajaxGet("../mock/compras-pedidos.json", {
		success: function (response) {
			PEDIDO_COMPRA.rows = PEDIDO_COMPRA.normalizeRows(response);
			PEDIDO_COMPRA.atualizarKpis(PEDIDO_COMPRA.rows);
		}
	});
};

PEDIDO_COMPRA.iniciarDataTable = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	PEDIDO_COMPRA.table = $("#tablePedidosCompra").DataTable({
		ajax: {
			url: "../mock/compras-pedidos.json",
			dataSrc: function (response) {
				PEDIDO_COMPRA.rows = PEDIDO_COMPRA.normalizeRows(response);
				PEDIDO_COMPRA.atualizarKpis(PEDIDO_COMPRA.rows);
				return PEDIDO_COMPRA.rows;
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
		order: [[3, "desc"]],
		dom: "<'card-body border-bottom py-3'<'d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center'<'text-secondary'l><'btn-list'Bf>>>rt<'card-footer d-flex flex-column flex-md-row gap-2 align-items-center justify-content-between'ip>",
		buttons: [
			{ extend: "colvis", text: "Colunas", className: "btn btn-outline-secondary" }
		],
		columns: [
			{ data: "pedido" },
			{ data: "fornecedor" },
			{ data: "nfe" },
			{ data: "emissao" },
			{ data: "previsao_entrega" },
			{ data: "itens" },
			{ data: "valor_total" },
			{ data: "entrada_estoque" },
			{ data: "financeiro" },
			{ data: "status" },
			{ data: "comprador" },
			{ data: "empresa" },
			{ data: "acoes", orderable: false, searchable: false, className: "text-end all", defaultContent: "" }
		],
		columnDefs: [
			{ responsivePriority: 1, targets: 12 },
			{ responsivePriority: 2, targets: 0 },
			{ responsivePriority: 3, targets: 1 },
			{ responsivePriority: 4, targets: 6 },
			{ responsivePriority: 5, targets: 9 },
			{ targets: [2, 3, 4, 5, 7, 8, 10, 11], className: "text-secondary" }
		],
		language: PEDIDO_COMPRA.getDataTableLanguage(),
		drawCallback: function () {
			var api = this.api();
			var rows = PEDIDO_COMPRA.getFilteredRows(api);

			$("#tablePedidosCompra .dropdown-toggle").attr("data-bs-boundary", "viewport");
			$("#emptyStateCompras").toggleClass("d-none", rows.length > 0);
			PEDIDO_COMPRA.atualizarKpis(rows);
		}
	});
};

PEDIDO_COMPRA.registerFilters = function () {
	if (PEDIDO_COMPRA.filterRegistered || !$.fn.dataTable) {
		return;
	}

	$.fn.dataTable.ext.search.push(function (settings, data, dataIndex, rowData) {
		if (!settings.nTable || settings.nTable.id !== "tablePedidosCompra") {
			return true;
		}

		var row = rowData || {};
		var filters = {
			fornecedor: $("#filterFornecedor").val(),
			status: $("#filterStatus").val(),
			numeroPedido: $("#filterNumeroPedido").val(),
			nfe: $("#filterNfe").val(),
			comprador: $("#filterComprador").val(),
			empresa: $("#filterEmpresa").val(),
			estoque: $("#filterEstoque").val(),
			financeiro: $("#filterFinanceiro").val(),
			produto: $("#filterProduto").val(),
			categoria: $("#filterCategoria").val(),
			xml: $("#filterXml").val(),
			fluxo: $("#filterFluxo").val(),
			conta: $("#filterContaFinanceira").val(),
			centro: $("#filterCentroCusto").val()
		};

		if (filters.fornecedor && row.fornecedor_text !== filters.fornecedor) return false;
		if (filters.status && row.status_text !== filters.status) return false;
		if (filters.numeroPedido && row.pedido_text.toLowerCase().indexOf(filters.numeroPedido.toLowerCase()) === -1) return false;
		if (filters.nfe && row.nfe_text.toLowerCase().indexOf(filters.nfe.toLowerCase()) === -1) return false;
		if (filters.comprador && row.comprador !== filters.comprador) return false;
		if (filters.empresa && row.empresa !== filters.empresa) return false;
		if (filters.estoque && row.entrada_estoque_text !== filters.estoque) return false;
		if (filters.financeiro && row.financeiro_text !== filters.financeiro) return false;
		if (filters.produto && String(row.produtos || "").toLowerCase().indexOf(filters.produto.toLowerCase()) === -1) return false;
		if (filters.categoria && row.categoria_produto !== filters.categoria) return false;
		if (filters.xml && row.xml_importado !== filters.xml) return false;
		if (filters.fluxo && row.fluxo !== filters.fluxo) return false;
		if (filters.conta && row.conta_financeira !== filters.conta) return false;
		if (filters.centro && row.centro_custo !== filters.centro) return false;
		if (!PEDIDO_COMPRA.dateInRange(row.emissao_iso, $("#filterEmissaoInicio").val(), $("#filterEmissaoFim").val())) return false;
		if (!PEDIDO_COMPRA.dateInRange(row.previsao_entrega_iso, $("#filterEntregaInicio").val(), $("#filterEntregaFim").val())) return false;

		return true;
	});

	PEDIDO_COMPRA.filterRegistered = true;
};

PEDIDO_COMPRA.aplicarBusca = function () {
	if (PEDIDO_COMPRA.table) {
		PEDIDO_COMPRA.table.search($("#filterSearch").val()).draw();
	}
};

PEDIDO_COMPRA.aplicarFiltros = function (event) {
	if (event) {
		event.preventDefault();
	}

	if (PEDIDO_COMPRA.table) {
		PEDIDO_COMPRA.table.search($("#filterSearch").val()).draw();
	}
};

PEDIDO_COMPRA.limparFiltros = function () {
	$("#formFiltrosCompras").get(0).reset();
	$("#offcanvasFiltros input, #offcanvasFiltros select").val("");

	if (PEDIDO_COMPRA.table) {
		PEDIDO_COMPRA.table.search("").draw();
	}

	HELPER.showToast("Filtros removidos.", "success");
};

PEDIDO_COMPRA.recarregarTabela = function () {
	if (!PEDIDO_COMPRA.table) {
		return;
	}

	PEDIDO_COMPRA.table.ajax.reload(function () {
		HELPER.showToast("Listagem atualizada.", "success");
	}, false);
};

PEDIDO_COMPRA.executarAcaoSecundaria = function (event) {
	event.preventDefault();
	HELPER.showToast("Acao enviada para processamento.", "success");
};

PEDIDO_COMPRA.atualizarKpis = function (rows) {
	var mesAtual = "2026-05";
	var ativos = rows.filter(function (row) {
		return row.status_text !== "Cancelado";
	});

	$("#kpiTotalPedidos").text(rows.length);
	$("#kpiAbertos").text(rows.filter(function (row) {
		return row.status_text === "Aberto" || row.status_text === "Aguardando NF-e";
	}).length);
	$("#kpiRecebidos").text(rows.filter(function (row) {
		return row.status_text === "Recebido" || row.status_text === "Finalizado";
	}).length);
	$("#kpiCancelados").text(rows.filter(function (row) {
		return row.status_text === "Cancelado";
	}).length);
	$("#kpiValorTotal").text(PEDIDO_COMPRA.formatCurrency(PEDIDO_COMPRA.sumRows(ativos)));
	$("#kpiComprasMes").text(PEDIDO_COMPRA.formatCurrency(PEDIDO_COMPRA.sumRows(ativos.filter(function (row) {
		return String(row.emissao_iso || "").indexOf(mesAtual) === 0;
	}))));
};

PEDIDO_COMPRA.getFilteredRows = function (api) {
	var rows = [];
	api.rows({ filter: "applied" }).every(function () {
		rows.push(this.data());
	});
	return rows;
};

PEDIDO_COMPRA.normalizeRows = function (response) {
	return response && Array.isArray(response.data) ? response.data : [];
};

PEDIDO_COMPRA.sumRows = function (rows) {
	return rows.reduce(function (total, row) {
		return total + Number(row.valor_total_numero || 0);
	}, 0);
};

PEDIDO_COMPRA.dateInRange = function (value, start, end) {
	if (!start && !end) return true;
	if (!value) return false;
	var current = new Date(value + "T00:00:00");
	if (start && current < new Date(start + "T00:00:00")) return false;
	if (end && current > new Date(end + "T23:59:59")) return false;
	return true;
};

PEDIDO_COMPRA.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL"
	});
};

PEDIDO_COMPRA.getDataTableLanguage = function () {
	return {
		emptyTable: "Nenhum pedido de compra encontrado",
		info: "Mostrando _START_ ate _END_ de _TOTAL_ registros",
		infoEmpty: "Mostrando 0 ate 0 de 0 registros",
		infoFiltered: "(filtrado de _MAX_ registros no total)",
		lengthMenu: "Mostrar _MENU_ registros",
		loadingRecords: "Carregando...",
		processing: "Processando...",
		search: "Buscar:",
		zeroRecords: "Nenhum pedido de compra encontrado",
		paginate: { first: "Primeiro", last: "Ultimo", next: "Proximo", previous: "Anterior" },
		buttons: { colvis: "Colunas" }
	};
};

