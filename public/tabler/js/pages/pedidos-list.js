const PEDIDO = window.PEDIDO || {};
window.PEDIDO = PEDIDO;

PEDIDO.tablePedidos = null;
PEDIDO.pedidosListFilterRegistered = false;
PEDIDO.pedidosRows = [];

$(document).ready(function () {
	PEDIDO.init();
});

PEDIDO.init = function () {
	PEDIDO.initializeComponents();
	PEDIDO.bindEvents();
	PEDIDO.loadInitialData();
};

PEDIDO.initializeComponents = function () {
	PEDIDO.registerPedidosFilters();
	PEDIDO.initSelect2();
	PEDIDO.initDataTablePedidos();
}

PEDIDO.bindEvents = function () {
	$("#formFiltrosPedidos").on("submit", PEDIDO.filtrarPedidos);
	$("#btnClearFilters").on("click", PEDIDO.limparFiltrosPedidos);
	$("#btnReloadTable").on("click", PEDIDO.recarregarTabelaPedidos);
	$("#filterSearch").on("keyup", HELPER.debounce(PEDIDO.aplicarBuscaRapida, 300));
	$("#filterTipo, #filterSituacao, #filterCliente, #filterVendedor, #filterFormaPagamento").on("change", PEDIDO.aplicarFiltrosPedidos);
	$("#btnExportarPedidos, #btnRelatoriosPedidos").on("click", PEDIDO.executarAcaoSecundaria);
}

PEDIDO.loadInitialData = function () {
	PEDIDO.carregarKpisPedidos();
}

PEDIDO.initDataTablePedidos = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	PEDIDO.tablePedidos = $("#tablePedidos").DataTable({
		ajax: {
			url: "../mock/pedidos.json",
			dataSrc: function (response) {
				PEDIDO.pedidosRows = response && Array.isArray(response.data) ? response.data : [];
				PEDIDO.atualizarKpisPedidos(PEDIDO.pedidosRows);
				return PEDIDO.pedidosRows;
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
		order: [[9, "desc"]],
		dom: "<'card-body border-bottom py-3'<'d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center'<'text-secondary'l><'btn-list'Bf>>>rt<'card-footer d-flex flex-column flex-md-row gap-2 align-items-center justify-content-between'ip>",
		buttons: [
			{
				extend: "colvis",
				text: "Colunas",
				className: "btn btn-outline-secondary"
			}
		],
		columns: [
			{ data: "numero" },
			{ data: "tipo" },
			{ data: "cliente" },
			{ data: "documento" },
			{ data: "vendedor" },
			{ data: "quantidade_itens" },
			{ data: "valor_total" },
			{ data: "forma_pagamento" },
			{ data: "situacao" },
			{ data: "data_emissao" },
			{ data: "vencimento" },
			{ data: "acoes", orderable: false, searchable: false, className: "text-end all", defaultContent: "" }
		],
		columnDefs: [
			{ responsivePriority: 1, targets: 11 },
			{ responsivePriority: 2, targets: 2 },
			{ responsivePriority: 3, targets: 6 },
			{ responsivePriority: 4, targets: 8 },
			{ responsivePriority: 5, targets: 0 },
			{ targets: [3, 4, 5, 7, 9, 10], className: "text-secondary" }
		],
		language: PEDIDO.getDataTableLanguage(),
		drawCallback: function () {
			var api = this.api();
			var hasRows = api.rows({ filter: "applied" }).data().length > 0;

			PEDIDO.prepareActionDropdowns();
			$("#emptyStatePedidos").toggleClass("d-none", hasRows);
			PEDIDO.atualizarKpisPedidos(PEDIDO.getFilteredRows(api));
		},
		initComplete: function () {
			PEDIDO.adjustPedidosTable();
		}
	});
}

PEDIDO.initSelect2 = function () {
	if ($.fn.select2) {
		$("#formFiltrosPedidos select").select2({
			width: "100%"
		});
	}
}

PEDIDO.filtrarPedidos = function (event) {
	event.preventDefault();
	PEDIDO.aplicarFiltrosPedidos();
}

PEDIDO.aplicarBuscaRapida = function () {
	if (!PEDIDO.tablePedidos) {
		return;
	}

	PEDIDO.tablePedidos.search($("#filterSearch").val()).draw();
}

PEDIDO.aplicarFiltrosPedidos = function () {
	if (!PEDIDO.tablePedidos) {
		return;
	}

	PEDIDO.tablePedidos.search($("#filterSearch").val());
	PEDIDO.tablePedidos.draw();
}

PEDIDO.limparFiltrosPedidos = function () {
	$("#formFiltrosPedidos").get(0).reset();

	if (!PEDIDO.tablePedidos) {
		return;
	}

	PEDIDO.tablePedidos.search("");
	PEDIDO.tablePedidos.draw();
	HELPER.showToast("Filtros removidos.", "success");
}

PEDIDO.recarregarTabelaPedidos = function () {
	if (!PEDIDO.tablePedidos) {
		return;
	}

	PEDIDO.tablePedidos.ajax.reload(function () {
		HELPER.showToast("Listagem atualizada.", "success");
	}, false);
}

PEDIDO.executarAcaoSecundaria = function (event) {
	event.preventDefault();
	HELPER.showToast("Acao enviada para processamento.", "success");
}

PEDIDO.carregarKpisPedidos = function () {
	HELPER.ajaxGet("../mock/pedidos.json", {
		success: function (response) {
			var rows = response && Array.isArray(response.data) ? response.data : [];

			PEDIDO.pedidosRows = rows;
			PEDIDO.atualizarKpisPedidos(rows);
		}
	});
}

PEDIDO.registerPedidosFilters = function () {
	if (PEDIDO.pedidosListFilterRegistered || !$.fn.dataTable) {
		return;
	}

	$.fn.dataTable.ext.search.push(function (settings, data, dataIndex, rowData) {
		if (!settings.nTable || settings.nTable.id !== "tablePedidos") {
			return true;
		}

		var row = rowData || {};
		var tipo = $("#filterTipo").val();
		var situacao = $("#filterSituacao").val();
		var cliente = $("#filterCliente").val();
		var vendedor = $("#filterVendedor").val();
		var formaPagamento = $("#filterFormaPagamento").val();
		var valorMin = PEDIDO.parseNumber($("#filterValorMin").val());
		var valorMax = PEDIDO.parseNumber($("#filterValorMax").val());
		var emissaoInicio = $("#filterEmissaoInicio").val();
		var emissaoFim = $("#filterEmissaoFim").val();
		var vencimentoInicio = $("#filterVencimentoInicio").val();
		var vencimentoFim = $("#filterVencimentoFim").val();
		var valorTotal = Number(row.valor_total_numero || 0);

		if (tipo && row.tipo_text !== tipo) {
			return false;
		}

		if (situacao && row.situacao_text !== situacao) {
			return false;
		}

		if (cliente && row.cliente !== cliente) {
			return false;
		}

		if (vendedor && row.vendedor !== vendedor) {
			return false;
		}

		if (formaPagamento && row.forma_pagamento !== formaPagamento) {
			return false;
		}

		if (valorMin && valorTotal < valorMin) {
			return false;
		}

		if (valorMax && valorTotal > valorMax) {
			return false;
		}

		if (!PEDIDO.dateInRange(row.data_emissao_iso, emissaoInicio, emissaoFim)) {
			return false;
		}

		if (!PEDIDO.dateInRange(row.vencimento_iso, vencimentoInicio, vencimentoFim)) {
			return false;
		}

		return true;
	});

	PEDIDO.pedidosListFilterRegistered = true;
}

PEDIDO.atualizarKpisPedidos = function (rows) {
	var hoje = "2026-05-09";

	$("#kpiTotalPedidos").text(PEDIDO.countByField(rows, "tipo_text", "Pedido"));
	$("#kpiTotalOrcamentos").text(PEDIDO.countByField(rows, "tipo_text", "Orcamento"));
	$("#kpiVendasDia").text(PEDIDO.formatCurrency(PEDIDO.sumRows(rows.filter(function (row) {
		return row.tipo_text === "Pedido" && row.data_emissao_iso === hoje && row.situacao_text !== "Cancelado";
	}))));
	$("#kpiOrcamentosPendentes").text(rows.filter(function (row) {
		return row.tipo_text === "Orcamento" && row.situacao_text === "Pendente";
	}).length);
	$("#kpiPedidosFaturados").text(rows.filter(function (row) {
		return row.tipo_text === "Pedido" && (row.situacao_text === "Faturado" || row.situacao_text === "Finalizado");
	}).length);
	$("#kpiValorPeriodo").text(PEDIDO.formatCurrency(PEDIDO.sumRows(rows.filter(function (row) {
		return row.situacao_text !== "Cancelado";
	}))));
}

PEDIDO.getFilteredRows = function (api) {
	var rows = [];

	api.rows({ filter: "applied" }).every(function () {
		rows.push(this.data());
	});

	return rows;
}

PEDIDO.countByField = function (rows, field, value) {
	return rows.filter(function (row) {
		return row[field] === value;
	}).length;
}

PEDIDO.sumRows = function (rows) {
	return rows.reduce(function (total, row) {
		return total + Number(row.valor_total_numero || 0);
	}, 0);
}

PEDIDO.dateInRange = function (value, start, end) {
	if (!start && !end) {
		return true;
	}

	if (!value) {
		return false;
	}

	var current = new Date(value + "T00:00:00");

	if (start && current < new Date(start + "T00:00:00")) {
		return false;
	}

	if (end && current > new Date(end + "T23:59:59")) {
		return false;
	}

	return true;
}

PEDIDO.parseNumber = function (value) {
	var normalized = String(value || "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);

	return isNaN(number) ? 0 : number;
}

PEDIDO.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL"
	});
}

PEDIDO.prepareActionDropdowns = function () {
	$("#tablePedidos .dropdown-toggle").attr("data-bs-boundary", "viewport");
}

PEDIDO.adjustPedidosTable = function () {
	if (!PEDIDO.tablePedidos) {
		return;
	}

	PEDIDO.tablePedidos.columns.adjust();

	if (PEDIDO.tablePedidos.responsive) {
		PEDIDO.tablePedidos.responsive.recalc();
	}
}

PEDIDO.getDataTableLanguage = function () {
	return {
		emptyTable: "Nenhum registro encontrado",
		info: "Mostrando _START_ ate _END_ de _TOTAL_ registros",
		infoEmpty: "Mostrando 0 ate 0 de 0 registros",
		infoFiltered: "(filtrado de _MAX_ registros no total)",
		lengthMenu: "Mostrar _MENU_ registros",
		loadingRecords: "Carregando...",
		processing: "Processando...",
		search: "Buscar:",
		zeroRecords: "Nenhum registro encontrado",
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
}




