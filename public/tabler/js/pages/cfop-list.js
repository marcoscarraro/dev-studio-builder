const CFOP = window.CFOP || {};
window.CFOP = CFOP;

CFOP.tableCfops = null;
CFOP.rows = [];
CFOP.masks = {};
CFOP.pendingStatus = null;

$(document).ready(function () {
	CFOP.init();
});

CFOP.init = function () {
	CFOP.initializeComponents();
	CFOP.bindEvents();
	CFOP.loadInitialData();
};

CFOP.initializeComponents = function () {
	CFOP.initMasks();
	CFOP.loadDataTable();
};

CFOP.bindEvents = function () {
	$("#formFiltrosCfop").on("submit", CFOP.filtrar);
	$("#btnClearFilters").on("click", CFOP.limparFiltros);
	$("#btnReloadTable").on("click", CFOP.atualizar);
	$("#btnConfirmStatus").on("click", CFOP.confirmarAlteracaoStatus);
	$("#filterBuscaGeral, #filterCfop, #filterDescricao").on("keyup", HELPER.debounce(CFOP.aplicarFiltros, 350));
	$("#filterTipoOperacao, #filterFinalidade, #filterMovimentaEstoque, #filterMovimentaFinanceiro, #filterGeraFinanceiro, #filterAtualizaCusto, #filterPermiteDevolucao, #filterAtivo").on("change", CFOP.aplicarFiltros);
	$("#tableCfops").on("click", "[data-cfop-action]", CFOP.executarAcaoLinha);
	$("#tableCfops").on("click", "[data-cfop-code]", CFOP.abrirResumoRapido);
};

CFOP.loadInitialData = function () {
};

CFOP.loadDataTable = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	CFOP.tableCfops = $("#tableCfops").DataTable({
		processing: true,
		serverSide: true,
		responsive: true,
		colReorder: true,
		stateSave: true,
		stateDuration: 0,
		stateSaveCallback: HELPER.saveDataTableColumnVisibilityState,
		stateLoadCallback: HELPER.loadDataTableColumnVisibilityState,
		autoWidth: false,
		pageLength: 10,
		lengthMenu: [[10, 25, 50], [10, 25, 50]],
		order: [[1, "asc"]],
		dom: "<'card-body border-bottom py-3'<'d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center'<'text-secondary'l><'btn-list'Bf>>>rt<'card-footer d-flex flex-column flex-md-row gap-2 align-items-center justify-content-between'ip>",
		buttons: [
			{
				extend: "colvis",
				text: "Colunas",
				className: "btn btn-outline-secondary"
			},
			{
				extend: "excelHtml5",
				text: "Excel",
				className: "btn btn-outline-success",
				exportOptions: { columns: ":visible:not(.all)" }
			},
			{
				extend: "pdfHtml5",
				text: "PDF",
				className: "btn btn-outline-danger",
				exportOptions: { columns: ":visible:not(.all)" }
			}
		],
		ajax: function (request, callback) {
			CFOP.buscarRegistros(request, callback);
		},
		columns: [
			{ data: "cfop" },
			{ data: "descricao" },
			{ data: "tipo_operacao" },
			{ data: "finalidade" },
			{ data: "estoque" },
			{ data: "financeiro" },
			{ data: "gera_financeiro" },
			{ data: "atualiza_custo" },
			{ data: "devolucao" },
			{ data: "status" },
			{ data: "acoes", orderable: false, searchable: false, className: "text-end all", defaultContent: "" }
		],
		columnDefs: [
			{ responsivePriority: 1, targets: 10 },
			{ responsivePriority: 2, targets: 0 },
			{ responsivePriority: 3, targets: 1 },
			{ responsivePriority: 4, targets: 9 },
			{ targets: [0, 3, 4, 5, 6, 7, 8], className: "text-secondary" }
		],
		language: CFOP.getDataTableLanguage(),
		drawCallback: function () {
			var api = this.api();

			CFOP.prepareActionDropdowns();
			$("#emptyStateCfop").toggleClass("d-none", api.rows({ page: "current" }).data().length > 0);
			CFOP.atualizarResumo(CFOP.lastFilteredRows || []);
		},
		initComplete: function () {
			CFOP.adjustTable();
		}
	});
};

CFOP.buscarRegistros = function (request, callback) {
	HELPER.ajaxGet("../mock/cfop-list.json", {
		silentError: true,
		success: function (response) {
			var rows = response && Array.isArray(response.data) ? response.data : [];
			var result = CFOP.buildServerSideResponse(rows, request);

			CFOP.rows = result.data;
			CFOP.allRows = rows;
			CFOP.lastFilteredRows = result.filteredRows;
			callback(result);
		},
		error: function () {
			callback({
				draw: request.draw,
				recordsTotal: 0,
				recordsFiltered: 0,
				data: []
			});
			HELPER.showToast("Nao foi possivel carregar os CFOPs.", "danger");
		}
	});
};

CFOP.buildServerSideResponse = function (rows, request) {
	var filtered = CFOP.filtrarRows(rows, request);
	var ordered = CFOP.ordenarRows(filtered, request);
	var start = Number(request.start || 0);
	var length = Number(request.length || 10);
	var page = length > -1 ? ordered.slice(start, start + length) : ordered;

	return {
		draw: request.draw,
		recordsTotal: rows.length,
		recordsFiltered: filtered.length,
		data: page,
		filteredRows: filtered
	};
};

CFOP.filtrarRows = function (rows, request) {
	var buscaGlobal = String($("#filterBuscaGeral").val() || request.search && request.search.value || "").toLowerCase();
	var cfop = $("#filterCfop").val();
	var descricao = String($("#filterDescricao").val() || "").toLowerCase();
	var tipo = $("#filterTipoOperacao").val();
	var finalidade = $("#filterFinalidade").val();
	var estoque = $("#filterMovimentaEstoque").val();
	var financeiro = $("#filterMovimentaFinanceiro").val();
	var geraFinanceiro = $("#filterGeraFinanceiro").val();
	var atualizaCusto = $("#filterAtualizaCusto").val();
	var devolucao = $("#filterPermiteDevolucao").val();
	var ativo = $("#filterAtivo").val();

	return rows.filter(function (row) {
		var textoBusca = [row.cfop_text, row.descricao_text].join(" ").toLowerCase();

		if (buscaGlobal && textoBusca.indexOf(buscaGlobal) === -1) return false;
		if (cfop && row.cfop_text.indexOf(cfop) === -1) return false;
		if (descricao && String(row.descricao_text || "").toLowerCase().indexOf(descricao) === -1) return false;
		if (tipo && row.tipo_operacao_text !== tipo) return false;
		if (finalidade && row.finalidade_text !== finalidade) return false;
		if (estoque && row.estoque_text !== estoque) return false;
		if (financeiro && row.financeiro_text !== financeiro) return false;
		if (geraFinanceiro && row.gera_financeiro_text !== geraFinanceiro) return false;
		if (atualizaCusto && row.atualiza_custo_text !== atualizaCusto) return false;
		if (devolucao && row.devolucao_text !== devolucao) return false;
		if (ativo && row.ativo_text !== ativo) return false;

		return true;
	});
};

CFOP.ordenarRows = function (rows, request) {
	var order = request.order && request.order[0] ? request.order[0] : null;
	var columnIndex = order ? Number(order.column) : 1;
	var dir = order && order.dir === "desc" ? -1 : 1;
	var fields = ["cfop_text", "descricao_text", "tipo_operacao_text", "finalidade_text", "estoque_text", "financeiro_text", "gera_financeiro_text", "atualiza_custo_text", "devolucao_text", "ativo_text", ""];
	var field = fields[columnIndex] || "cfop_text";

	return rows.slice().sort(function (a, b) {
		return String(a[field] || "").localeCompare(String(b[field] || "")) * dir;
	});
};

CFOP.filtrar = function (event) {
	event.preventDefault();
	CFOP.aplicarFiltros();
};

CFOP.aplicarFiltros = function () {
	if (CFOP.tableCfops) {
		CFOP.tableCfops.ajax.reload(null, false);
	}
};

CFOP.atualizar = function () {
	if (!CFOP.tableCfops) {
		return;
	}

	CFOP.tableCfops.ajax.reload(function () {
		HELPER.showToast("Listagem de CFOPs atualizada.", "success");
	}, false);
};

CFOP.limparFiltros = function () {
	var form = $("#formFiltrosCfop").get(0);

	form.reset();
	if (CFOP.tableCfops) {
		CFOP.tableCfops.search("");
		CFOP.tableCfops.ajax.reload(null, false);
	}
	HELPER.showToast("Filtros removidos.", "success");
};

CFOP.executarAcaoLinha = function (event) {
	event.preventDefault();

	var action = $(this).data("cfop-action");
	var row = CFOP.getRowFromElement(this);

	if (!row) {
		return;
	}

	if (action === "visualizar") {
		CFOP.visualizar(row);
		return;
	}

	if (action === "duplicar") {
		window.location.href = "./cfop-form.html?duplicar=" + encodeURIComponent(row.cfop_text);
		return;
	}

	if (action === "ativar" || action === "inativar") {
		CFOP.abrirConfirmacaoStatus(row, action);
		return;
	}

	if (action === "utilizacao") {
		CFOP.visualizarUtilizacao(row);
		return;
	}

	if (action === "excluir") {
		CFOP.excluir(row);
		return;
	}

	window.location.href = "./cfop-form.html?id=" + encodeURIComponent(row.id);
};

CFOP.abrirResumoRapido = function (event) {
	event.preventDefault();
	CFOP.visualizar(CFOP.getRowFromElement(this));
};

CFOP.visualizar = function (row) {
	if (!row) {
		return;
	}

	$("#btnAbrirCfopModal").attr("href", "./cfop-form.html?id=" + encodeURIComponent(row.id) + "&modo=readonly");
	$("#modalResumoCfopBody").html(
		'<div class="row g-3">' +
			'<div class="col-md-3"><div class="subheader">CFOP</div><div class="h2 mb-0">' + CFOP.escapeHtml(row.cfop_text) + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Tipo operacao</div><div>' + (row.tipo_operacao || "") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Finalidade</div><div class="fw-medium">' + CFOP.escapeHtml(row.finalidade_text) + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Status</div><div>' + (row.status || "") + '</div></div>' +
			'<div class="col-12"><div class="subheader">Descricao</div><div class="fw-medium">' + CFOP.escapeHtml(row.descricao_text) + '</div></div>' +
			'<div class="col-12"><div class="subheader">Indicadores operacionais</div><div>' + (row.estoque || "") + ' ' + (row.financeiro || "") + ' ' + (row.gera_financeiro || "") + ' ' + (row.atualiza_custo || "") + ' ' + (row.devolucao || "") + '</div></div>' +
		'</div>'
	);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalResumoCfop")).show();
};

CFOP.visualizarUtilizacao = function (row) {
	var bloqueado = Number(row.movimentos_vinculados || 0) > 0;

	$("#modalUtilizacaoCfopBody").html(
		'<div class="row g-3">' +
			'<div class="col-12"><div class="subheader">CFOP</div><div class="h2 mb-0">' + CFOP.escapeHtml(row.cfop_text) + '</div><div class="text-secondary">' + CFOP.escapeHtml(row.descricao_text) + '</div></div>' +
			'<div class="col-sm-6 col-lg-4"><div class="card card-sm"><div class="card-body"><div class="subheader">NF-e</div><div class="h3 mb-0">' + Number(row.uso_nfe || 0) + '</div></div></div></div>' +
			'<div class="col-sm-6 col-lg-4"><div class="card card-sm"><div class="card-body"><div class="subheader">NFC-e</div><div class="h3 mb-0">' + Number(row.uso_nfce || 0) + '</div></div></div></div>' +
			'<div class="col-sm-6 col-lg-4"><div class="card card-sm"><div class="card-body"><div class="subheader">Pedidos</div><div class="h3 mb-0">' + Number(row.uso_pedidos || 0) + '</div></div></div></div>' +
			'<div class="col-sm-6 col-lg-4"><div class="card card-sm"><div class="card-body"><div class="subheader">Compras</div><div class="h3 mb-0">' + Number(row.uso_compras || 0) + '</div></div></div></div>' +
			'<div class="col-sm-6 col-lg-4"><div class="card card-sm"><div class="card-body"><div class="subheader">Devolucoes</div><div class="h3 mb-0">' + Number(row.uso_devolucoes || 0) + '</div></div></div></div>' +
			'<div class="col-sm-6 col-lg-4"><div class="card card-sm"><div class="card-body"><div class="subheader">Movimentacoes</div><div class="h3 mb-0">' + Number(row.uso_movimentacoes || 0) + '</div></div></div></div>' +
			'<div class="col-12"><div class="alert ' + (bloqueado ? "alert-warning" : "alert-success") + ' mb-0">' + (bloqueado ? "Este CFOP possui movimentacoes e deve ser apenas inativado." : "Este CFOP nao possui movimentacoes vinculadas.") + '</div></div>' +
		'</div>'
	);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalUtilizacaoCfop")).show();
};

CFOP.excluir = function (row) {
	if (Number(row.movimentos_vinculados || 0) > 0) {
		HELPER.showToast("CFOP utilizado nao pode ser excluido. Utilize inativacao.", "warning");
		return;
	}

	HELPER.ajaxDelete("/api/cfops/" + encodeURIComponent(row.id), {}, {
		silentError: true,
		success: function () {
			HELPER.showToast("CFOP excluido.", "success");
			CFOP.atualizar();
		},
		error: function () {
			HELPER.showToast("CFOP excluido no prototipo.", "success");
		}
	});
};

CFOP.atualizarResumo = function (rows) {
	rows = rows || [];

	$("#kpiTotalCfops").text(rows.length);
	$("#kpiEntrada").text(CFOP.countBy(rows, "tipo_operacao_text", "Entrada"));
	$("#kpiSaida").text(CFOP.countBy(rows, "tipo_operacao_text", "Saida"));
	$("#kpiEstoque").text(CFOP.countBy(rows, "estoque_text", "Sim"));
	$("#kpiFinanceiro").text(CFOP.countBy(rows, "financeiro_text", "Sim"));
};

CFOP.countBy = function (rows, field, value) {
	return rows.filter(function (row) {
		return row[field] === value;
	}).length;
};

CFOP.abrirConfirmacaoStatus = function (row, action) {
	CFOP.pendingStatus = { row: row, action: action };
	$("#modalStatusCfopTitle").text(action === "ativar" ? "Ativar CFOP" : "Inativar CFOP");
	$("#modalStatusCfopBody").html(
		'<p class="mb-2">Confirme a alteracao de status do CFOP <strong>' + CFOP.escapeHtml(row.cfop_text) + '</strong>.</p>' +
		'<div class="text-secondary">A inativacao e logica e nao remove o registro permanentemente.</div>'
	);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalStatusCfop")).show();
};

CFOP.confirmarAlteracaoStatus = function () {
	if (!CFOP.pendingStatus) {
		return;
	}

	CFOP.alterarStatus(CFOP.pendingStatus.row, CFOP.pendingStatus.action);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalStatusCfop")).hide();
	CFOP.pendingStatus = null;
};

CFOP.alterarStatus = function (row, action) {
	HELPER.ajaxPut("/api/cfops/" + encodeURIComponent(row.id) + "/status", { status: action }, {
		button: "#btnConfirmStatus",
		silentError: true,
		success: function (response) {
			if (!response || !response.message) {
				HELPER.showToast(action === "ativar" ? "CFOP ativado." : "CFOP inativado.", "success");
			}
			CFOP.atualizar();
		},
		error: function () {
			HELPER.showToast(action === "ativar" ? "CFOP ativado no prototipo." : "CFOP inativado no prototipo.", "success");
		}
	});
};

CFOP.initMasks = function () {
	if (!window.IMask) {
		return;
	}

	var input = document.getElementById("filterCfop");

	if (input) {
		CFOP.masks.cfop = window.IMask(input, { mask: "0000" });
	}
};

CFOP.getRowFromElement = function (element) {
	var $row = $(element).closest("tr");
	var row = CFOP.tableCfops ? CFOP.tableCfops.row($row).data() : null;

	if (!row && CFOP.tableCfops) {
		row = CFOP.tableCfops.row($row.prev()).data();
	}

	return row;
};

CFOP.prepareActionDropdowns = function () {
	$("#tableCfops .dropdown-toggle").attr("data-bs-boundary", "viewport");
};

CFOP.adjustTable = function () {
	if (!CFOP.tableCfops) {
		return;
	}

	CFOP.tableCfops.columns.adjust();

	if (CFOP.tableCfops.responsive) {
		CFOP.tableCfops.responsive.recalc();
	}
};

CFOP.escapeHtml = function (value) {
	return String(value == null ? "" : value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};

CFOP.getDataTableLanguage = function () {
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
};
