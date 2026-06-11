const PRODUTO = window.PRODUTO || {};
window.PRODUTO = PRODUTO;

PRODUTO.tableProdutos = null;
PRODUTO.produtosListFilterRegistered = false;

$(document).ready(function () {
	PRODUTO.init();
});

PRODUTO.init = function () {
	PRODUTO.initializeComponents();
	PRODUTO.bindEvents();
	PRODUTO.loadInitialData();
};

PRODUTO.initializeComponents = function () {
	PRODUTO.registerProdutosFilters();
	PRODUTO.initSelect2();
	PRODUTO.initDataTableProdutos();
}

PRODUTO.bindEvents = function () {
	$("#formFiltrosProdutos").on("submit", PRODUTO.filtrarProdutos);
	$("#btnClearFilters").on("click", PRODUTO.limparFiltrosProdutos);
	$("#btnReloadTable").on("click", PRODUTO.recarregarTabelaProdutos);
	$("#filterSearch").on("keyup", HELPER.debounce(PRODUTO.aplicarBuscaRapida, 300));
	$("#btnExportarProdutos, #btnImportarProdutos, #btnAtualizarEstoque, #btnRelatoriosProdutos").on("click", PRODUTO.executarAcaoSecundaria);
}

PRODUTO.loadInitialData = function () {
	PRODUTO.carregarKpisProdutos();
}

PRODUTO.initDataTableProdutos = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	PRODUTO.tableProdutos = $("#tableProdutos").DataTable({
		ajax: "../mock/produtos.json",
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
		order: [[1, "asc"]],
		dom: "<'card-body border-bottom py-3'<'d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center'<'text-secondary'l><'btn-list'Bf>>>rt<'card-footer d-flex flex-column flex-md-row gap-2 align-items-center justify-content-between'ip>",
		buttons: [
			{
				extend: "colvis",
				text: "Colunas",
				className: "btn btn-outline-secondary"
			}
		],
		columns: [
			{ data: "foto", orderable: false, searchable: false, defaultContent: "" },
			{ data: "id" },
			{ data: "produto" },
			{ data: "sku" },
			{ data: "ean13" },
			{ data: "categoria" },
			{ data: "tipo" },
			{ data: "estoque" },
			{ data: "estoque_minimo" },
			{ data: "preco_custo" },
			{ data: "preco_venda" },
			{ data: "margem" },
			{ data: "status" },
			{ data: "acoes", orderable: false, searchable: false, className: "text-end all", defaultContent: "" }
		],
		columnDefs: [
			{ responsivePriority: 1, targets: 13 },
			{ responsivePriority: 2, targets: 2 },
			{ responsivePriority: 3, targets: 7 },
			{ responsivePriority: 4, targets: 10 },
			{ responsivePriority: 5, targets: 0 },
			{ targets: [1, 3, 4, 5, 8, 9, 11], className: "text-secondary" }
		],
		language: PRODUTO.getDataTableLanguage(),
		drawCallback: function () {
			var hasRows = this.api().rows({ filter: "applied" }).data().length > 0;

			PRODUTO.prepareActionDropdowns();
			$("#emptyStateProdutos").toggleClass("d-none", hasRows);
		},
		initComplete: function () {
			PRODUTO.adjustProdutosTable();
		}
	});
}

PRODUTO.initSelect2 = function () {
	if ($.fn.select2) {
		$("#formFiltrosProdutos select").select2({
			width: "100%"
		});
	}
}

PRODUTO.filtrarProdutos = function (event) {
	event.preventDefault();
	PRODUTO.aplicarFiltrosProdutos();
}

PRODUTO.aplicarBuscaRapida = function () {
	if (!PRODUTO.tableProdutos) {
		return;
	}

	PRODUTO.tableProdutos.search($("#filterSearch").val()).draw();
}

PRODUTO.aplicarFiltrosProdutos = function () {
	if (!PRODUTO.tableProdutos) {
		return;
	}

	PRODUTO.tableProdutos.search($("#filterSearch").val());
	PRODUTO.tableProdutos.draw();
}

PRODUTO.limparFiltrosProdutos = function () {
	$("#formFiltrosProdutos").get(0).reset();

	if (!PRODUTO.tableProdutos) {
		return;
	}

	PRODUTO.tableProdutos.search("");
	PRODUTO.tableProdutos.draw();
	HELPER.showToast("Filtros removidos.", "success");
}

PRODUTO.recarregarTabelaProdutos = function () {
	if (!PRODUTO.tableProdutos) {
		return;
	}

	PRODUTO.tableProdutos.ajax.reload(function () {
		HELPER.showToast("Listagem atualizada.", "success");
		PRODUTO.carregarKpisProdutos();
	}, false);
}

PRODUTO.executarAcaoSecundaria = function (event) {
	event.preventDefault();
	HELPER.showToast("Acao enviada para processamento.", "success");
}

PRODUTO.carregarKpisProdutos = function () {
	HELPER.ajaxGet("../mock/produtos.json", {
		success: function (response) {
			var rows = response && Array.isArray(response.data) ? response.data : [];

			$("#kpiTotalProdutos").text(PRODUTO.countByField(rows, "tipo_text", "Produto"));
			$("#kpiTotalServicos").text(PRODUTO.countByField(rows, "tipo_text", "Servico"));
			$("#kpiProdutosAtivos").text(PRODUTO.countByField(rows, "status_text", "Ativo"));
			$("#kpiEstoqueBaixo").text(rows.filter(function (row) { return row.estoque_baixo === true; }).length);
			$("#kpiSemEstoque").text(rows.filter(function (row) { return Number(row.estoque_numero || 0) === 0 && row.tipo_text === "Produto"; }).length);
			$("#kpiValorEstoque").text(PRODUTO.formatCurrency(PRODUTO.sumField(rows, "valor_estoque")));
		}
	});
}

PRODUTO.registerProdutosFilters = function () {
	if (PRODUTO.produtosListFilterRegistered || !$.fn.dataTable) {
		return;
	}

	$.fn.dataTable.ext.search.push(function (settings, data, dataIndex, rowData) {
		if (!settings.nTable || settings.nTable.id !== "tableProdutos") {
			return true;
		}

		var row = rowData || {};
		var categoria = $("#filterCategoria").val();
		var marca = $("#filterMarca").val();
		var situacao = $("#filterSituacao").val();
		var tipo = $("#filterTipo").val();
		var estoqueBaixo = $("#filterEstoqueBaixo").val();
		var precoMin = PRODUTO.parseNumber($("#filterPrecoMin").val());
		var precoMax = PRODUTO.parseNumber($("#filterPrecoMax").val());
		var start = $("#filterDataInicio").val();
		var end = $("#filterDataFim").val();
		var rowDate = PRODUTO.parseBrazilianDate(row.data_cadastro);
		var precoVenda = Number(row.preco_venda_numero || 0);

		if (categoria && row.categoria !== categoria) {
			return false;
		}

		if (marca && row.marca !== marca) {
			return false;
		}

		if (situacao && row.status_text !== situacao) {
			return false;
		}

		if (tipo && row.tipo_text !== tipo) {
			return false;
		}

		if (estoqueBaixo === "sim" && row.estoque_baixo !== true) {
			return false;
		}

		if (estoqueBaixo === "nao" && row.estoque_baixo === true) {
			return false;
		}

		if (precoMin && precoVenda < precoMin) {
			return false;
		}

		if (precoMax && precoVenda > precoMax) {
			return false;
		}

		if (!start && !end) {
			return true;
		}

		if (!rowDate) {
			return false;
		}

		if (start && rowDate < new Date(start + "T00:00:00")) {
			return false;
		}

		if (end && rowDate > new Date(end + "T23:59:59")) {
			return false;
		}

		return true;
	});

	PRODUTO.produtosListFilterRegistered = true;
}

PRODUTO.countByField = function (rows, field, value) {
	return rows.filter(function (row) {
		return row[field] === value;
	}).length;
}

PRODUTO.sumField = function (rows, field) {
	return rows.reduce(function (total, row) {
		return total + Number(row[field] || 0);
	}, 0);
}

PRODUTO.parseBrazilianDate = function (value) {
	var parts = String(value || "").split("/");

	if (parts.length !== 3) {
		return null;
	}

	return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
}

PRODUTO.parseNumber = function (value) {
	var normalized = String(value || "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);

	return isNaN(number) ? 0 : number;
}

PRODUTO.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL"
	});
}

PRODUTO.prepareActionDropdowns = function () {
	$("#tableProdutos .dropdown-toggle").attr("data-bs-boundary", "viewport");
}

PRODUTO.adjustProdutosTable = function () {
	if (!PRODUTO.tableProdutos) {
		return;
	}

	PRODUTO.tableProdutos.columns.adjust();

	if (PRODUTO.tableProdutos.responsive) {
		PRODUTO.tableProdutos.responsive.recalc();
	}
}

PRODUTO.getDataTableLanguage = function () {
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




