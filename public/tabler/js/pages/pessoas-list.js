const PESSOA = window.PESSOA || {};
window.PESSOA = PESSOA;

PESSOA.tablePessoas = null;
PESSOA.pessoasListFilterRegistered = false;

$(document).ready(function () {
	PESSOA.init();
});

PESSOA.init = function () {
	PESSOA.initializeComponents();
	PESSOA.bindEvents();
	PESSOA.loadInitialData();
};

PESSOA.initializeComponents = function () {
	PESSOA.registerDateFilter();
	PESSOA.initSelect2();
	PESSOA.initDataTablePessoas();
}

PESSOA.bindEvents = function () {
	$("#formFiltrosPessoas").on("submit", PESSOA.filtrarPessoas);
	$("#btnClearFilters").on("click", PESSOA.limparFiltrosPessoas);
	$("#btnReloadTable").on("click", PESSOA.recarregarTabelaPessoas);
	$("#filterSearch").on("keyup", HELPER.debounce(PESSOA.aplicarBuscaRapida, 300));
}

PESSOA.loadInitialData = function () {
	PESSOA.carregarKpisPessoas();
}

PESSOA.initDataTablePessoas = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	PESSOA.tablePessoas = $("#tablePessoas").DataTable({
		ajax: "../mock/pessoas.json",
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
		order: [[0, "asc"]],
		dom: "<'card-body border-bottom py-3'<'d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center'<'text-secondary'l><'btn-list'Bf>>>rt<'card-footer d-flex flex-column flex-md-row gap-2 align-items-center justify-content-between'ip>",
		buttons: [
			{
				extend: "colvis",
				text: "Colunas",
				className: "btn btn-outline-secondary"
			}
		],
		columns: [
			{ data: "id" },
			{ data: "nome" },
			{ data: "documento" },
			{ data: "cidade" },
			{ data: "tipo_pessoa" },
			{ data: "status" },
			{ data: "data_cadastro" },
			{ data: "acoes", orderable: false, searchable: false, className: "text-end all", defaultContent: "" }
		],
		columnDefs: [
			{ responsivePriority: 1, targets: 7 },
			{ responsivePriority: 2, targets: 1 },
			{ responsivePriority: 3, targets: 5 },
			{ responsivePriority: 4, targets: 2 },
			{ targets: [0, 3, 4, 6], className: "text-secondary" }
		],
		language: PESSOA.getDataTableLanguage(),
		drawCallback: function () {
			var hasRows = this.api().rows({ filter: "applied" }).data().length > 0;

			PESSOA.prepareActionDropdowns();
			$("#emptyStatePessoas").toggleClass("d-none", hasRows);
		},
		initComplete: function () {
			PESSOA.adjustPessoasTable();
		}
	});
}

PESSOA.initSelect2 = function () {
	if ($.fn.select2) {
		$("#formFiltrosPessoas select").select2({
			width: "100%"
		});
	}
}

PESSOA.filtrarPessoas = function (event) {
	event.preventDefault();
	PESSOA.aplicarFiltrosPessoas();
}

PESSOA.aplicarBuscaRapida = function () {
	if (!PESSOA.tablePessoas) {
		return;
	}

	PESSOA.tablePessoas.search($("#filterSearch").val()).draw();
}

PESSOA.aplicarFiltrosPessoas = function () {
	if (!PESSOA.tablePessoas) {
		return;
	}

	PESSOA.tablePessoas.search($("#filterSearch").val());
	PESSOA.tablePessoas.draw();
}

PESSOA.limparFiltrosPessoas = function () {
	$("#formFiltrosPessoas").get(0).reset();

	if (!PESSOA.tablePessoas) {
		return;
	}

	PESSOA.tablePessoas.search("");
	PESSOA.tablePessoas.draw();
	HELPER.showToast("Filtros removidos.", "success");
}

PESSOA.recarregarTabelaPessoas = function () {
	if (!PESSOA.tablePessoas) {
		return;
	}

	PESSOA.tablePessoas.ajax.reload(function () {
		HELPER.showToast("Listagem atualizada.", "success");
		PESSOA.carregarKpisPessoas();
	}, false);
}

PESSOA.carregarKpisPessoas = function () {
	HELPER.ajaxGet("../mock/pessoas.json", {
		success: function (response) {
			var rows = response && Array.isArray(response.data) ? response.data : [];

			$("#kpiTotalPessoas").text(rows.length);
			$("#kpiPessoasAtivas").text(PESSOA.countByField(rows, "status_text", "Ativo"));
			$("#kpiPessoasInativas").text(PESSOA.countByField(rows, "status_text", "Inativo"));
			$("#kpiNovosMes").text(PESSOA.countCurrentMonth(rows));
		}
	});
}

PESSOA.registerDateFilter = function () {
	if (PESSOA.pessoasListFilterRegistered || !$.fn.dataTable) {
		return;
	}

	$.fn.dataTable.ext.search.push(function (settings, data, dataIndex, rowData) {
		if (!settings.nTable || settings.nTable.id !== "tablePessoas") {
			return true;
		}

		var start = $("#filterDataInicio").val();
		var end = $("#filterDataFim").val();
		var status = $("#filterStatus").val();
		var tipoPessoa = $("#filterTipoPessoa").val();
		var cidade = $("#filterCidade").val();
		var row = rowData || {};
		var rowDate = PESSOA.parseBrazilianDate(row.data_cadastro || data[6]);

		if (status && row.status_text !== status) {
			return false;
		}

		if (tipoPessoa && PESSOA.stripHtml(row.tipo_pessoa || data[4]).indexOf(tipoPessoa) === -1) {
			return false;
		}

		if (cidade && row.cidade !== cidade) {
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

	PESSOA.pessoasListFilterRegistered = true;
}

PESSOA.countByField = function (rows, field, value) {
	return rows.filter(function (row) {
		return row[field] === value;
	}).length;
}

PESSOA.countCurrentMonth = function (rows) {
	var now = new Date();

	return rows.filter(function (row) {
		var rowDate = PESSOA.parseBrazilianDate(row.data_cadastro);

		return rowDate && rowDate.getMonth() === now.getMonth() && rowDate.getFullYear() === now.getFullYear();
	}).length;
}

PESSOA.parseBrazilianDate = function (value) {
	var parts = String(value || "").split("/");

	if (parts.length !== 3) {
		return null;
	}

	return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
}

PESSOA.stripHtml = function (value) {
	return $("<div>").html(value || "").text();
}

PESSOA.prepareActionDropdowns = function () {
	$("#tablePessoas .dropdown-toggle").attr("data-bs-boundary", "viewport");
}

PESSOA.adjustPessoasTable = function () {
	if (!PESSOA.tablePessoas) {
		return;
	}

	PESSOA.tablePessoas.columns.adjust();

	if (PESSOA.tablePessoas.responsive) {
		PESSOA.tablePessoas.responsive.recalc();
	}
}

PESSOA.getDataTableLanguage = function () {
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




