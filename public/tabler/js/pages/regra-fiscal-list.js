const REGRA_FISCAL = window.REGRA_FISCAL || {};
window.REGRA_FISCAL = REGRA_FISCAL;

REGRA_FISCAL.table = null;
REGRA_FISCAL.rows = [];
REGRA_FISCAL.allRows = [];
REGRA_FISCAL.pendingStatus = null;

$(document).ready(function () {
	REGRA_FISCAL.init();
});

REGRA_FISCAL.init = function () {
	REGRA_FISCAL.initializeComponents();
	REGRA_FISCAL.bindEvents();
	REGRA_FISCAL.loadInitialData();
};

REGRA_FISCAL.initializeComponents = function () {
	REGRA_FISCAL.loadDataTable();
};

REGRA_FISCAL.bindEvents = function () {
	$("#formFiltrosRegraFiscal").on("submit", REGRA_FISCAL.filtrar);
	$("#btnClearFilters").on("click", REGRA_FISCAL.limparFiltros);
	$("#btnReloadTable").on("click", REGRA_FISCAL.atualizar);
	$("#btnConfirmStatus").on("click", REGRA_FISCAL.confirmarAlteracaoStatus);
	$("#filterBuscaGeral").on("keyup", HELPER.debounce(REGRA_FISCAL.aplicarFiltros, 350));
	$("#filterTipoOperacao, #filterDestinoOperacao, #filterFinalidadeNf, #filterRegimeTributario, #filterConsumidorFinal, #filterPossuiSt, #filterMonofasico, #filterMovimentaEstoque, #filterMovimentaFinanceiro, #filterAtivo").on("change", REGRA_FISCAL.aplicarFiltros);
	$("#tableRegrasFiscais").on("click", "[data-regra-action]", REGRA_FISCAL.executarAcaoLinha);
};

REGRA_FISCAL.loadInitialData = function () {
};

REGRA_FISCAL.loadDataTable = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	REGRA_FISCAL.table = $("#tableRegrasFiscais").DataTable({
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
		lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
		order: [[9, "asc"]],
		dom: "<'card-body border-bottom py-3'<'d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center'<'text-secondary'l><'btn-list'Bf>>>rt<'card-footer d-flex flex-column flex-md-row gap-2 align-items-center justify-content-between'ip>",
		buttons: [
			{ extend: "colvis", text: "Colunas", className: "btn btn-outline-secondary" },
			{ extend: "excelHtml5", text: "Exportar Excel", className: "btn btn-outline-success", exportOptions: { columns: ":visible:not(.all)" } },
			{ extend: "csvHtml5", text: "Exportar CSV", className: "btn btn-outline-primary", exportOptions: { columns: ":visible:not(.all)" } },
			{ text: "Atualizar listagem", className: "btn btn-outline-secondary", action: REGRA_FISCAL.atualizar },
			{ text: "Limpar filtros", className: "btn btn-outline-secondary", action: REGRA_FISCAL.limparFiltros }
		],
		ajax: function (request, callback) {
			REGRA_FISCAL.buscarRegistros(request, callback);
		},
		columns: [
			{ data: "id" },
			{ data: "descricao" },
			{ data: "operacao" },
			{ data: "destino" },
			{ data: "cfop" },
			{ data: "tributacao_estadual" },
			{ data: "tributacao_federal" },
			{ data: "estoque" },
			{ data: "financeiro" },
			{ data: "prioridade", className: "text-end" },
			{ data: "ativo" },
			{ data: "acoes", orderable: false, searchable: false, className: "text-end all", defaultContent: "" }
		],
		columnDefs: [
			{ responsivePriority: 1, targets: 11 },
			{ responsivePriority: 2, targets: 1 },
			{ responsivePriority: 3, targets: [2, 3, 4] },
			{ responsivePriority: 4, targets: [7, 8, 10] },
			{ targets: [0, 4, 5, 6, 9], className: "text-secondary" }
		],
		language: REGRA_FISCAL.getDataTableLanguage(),
		drawCallback: function () {
			var api = this.api();

			REGRA_FISCAL.prepareActionDropdowns();
			$("#emptyStateRegraFiscal").toggleClass("d-none", api.rows({ page: "current" }).data().length > 0);
		},
		initComplete: function () {
			REGRA_FISCAL.adjustTable();
		}
	});
};

REGRA_FISCAL.buscarRegistros = function (request, callback) {
	HELPER.ajaxGet("../mock/regra-fiscal-list.json", {
		silentError: true,
		success: function (response) {
			var rows = response && Array.isArray(response.data) ? response.data : [];
			var result = REGRA_FISCAL.buildServerSideResponse(rows, request);

			REGRA_FISCAL.rows = result.data;
			REGRA_FISCAL.allRows = rows;
			callback(result);
		},
		error: function () {
			callback({ draw: request.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
			HELPER.showToast("Nao foi possivel carregar as regras fiscais.", "danger");
		}
	});
};

REGRA_FISCAL.buildServerSideResponse = function (rows, request) {
	var filtered = REGRA_FISCAL.filtrarRows(rows, request);
	var ordered = REGRA_FISCAL.ordenarRows(filtered, request);
	var start = Number(request.start || 0);
	var length = Number(request.length || 10);
	var page = length > -1 ? ordered.slice(start, start + length) : ordered;

	return {
		draw: request.draw,
		recordsTotal: rows.length,
		recordsFiltered: filtered.length,
		data: page.map(REGRA_FISCAL.formatRow)
	};
};

REGRA_FISCAL.filtrarRows = function (rows, request) {
	var busca = String($("#filterBuscaGeral").val() || request.search && request.search.value || "").toLowerCase();
	var tipoOperacao = $("#filterTipoOperacao").val();
	var destino = $("#filterDestinoOperacao").val();
	var finalidade = $("#filterFinalidadeNf").val();
	var regime = $("#filterRegimeTributario").val();
	var consumidor = $("#filterConsumidorFinal").val();
	var st = $("#filterPossuiSt").val();
	var monofasico = $("#filterMonofasico").val();
	var estoque = $("#filterMovimentaEstoque").val();
	var financeiro = $("#filterMovimentaFinanceiro").val();
	var ativo = $("#filterAtivo").val();

	return rows.filter(function (row) {
		var textoBusca = [
			row.descricao_text,
			row.codigo_interno_text,
			row.cfop_text,
			row.tributacao_estadual_text,
			row.tributacao_federal_text,
			row.observacoes_text,
			row.tipo_operacao_text,
			row.destino_operacao_text
		].join(" ").toLowerCase();

		if (busca && textoBusca.indexOf(busca) === -1) return false;
		if (tipoOperacao && row.tipo_operacao_text !== tipoOperacao) return false;
		if (destino && row.destino_operacao_text !== destino) return false;
		if (finalidade && row.finalidade_nf_text !== finalidade) return false;
		if (regime && row.regime_emitente_text !== regime && row.regime_destinatario_text !== regime) return false;
		if (consumidor && row.consumidor_final_text !== consumidor) return false;
		if (st && REGRA_FISCAL.boolToText(row.possui_st) !== st) return false;
		if (monofasico && REGRA_FISCAL.boolToText(row.produto_monofasico) !== monofasico) return false;
		if (estoque && REGRA_FISCAL.boolToText(row.movimenta_estoque) !== estoque) return false;
		if (financeiro && REGRA_FISCAL.boolToText(row.movimenta_financeiro) !== financeiro) return false;
		if (ativo && row.ativo_text !== ativo) return false;

		return true;
	});
};

REGRA_FISCAL.ordenarRows = function (rows, request) {
	var order = request.order && request.order[0] ? request.order[0] : null;
	var columnIndex = order ? Number(order.column) : 9;
	var dir = order && order.dir === "desc" ? -1 : 1;
	var fields = ["id", "descricao_text", "tipo_operacao_text", "destino_operacao_text", "cfop_text", "tributacao_estadual_text", "tributacao_federal_text", "movimenta_estoque", "movimenta_financeiro", "prioridade_numero", "ativo_text", ""];
	var field = fields[columnIndex] || "prioridade_numero";

	return rows.slice().sort(function (a, b) {
		if (field === "id" || field === "prioridade_numero") {
			return (Number(a[field] || 0) - Number(b[field] || 0)) * dir;
		}

		return String(a[field] || "").localeCompare(String(b[field] || "")) * dir;
	});
};

REGRA_FISCAL.formatRow = function (row) {
	return $.extend({}, row, {
		descricao: '<a href="#" class="text-reset fw-medium" data-regra-action="visualizar">' + REGRA_FISCAL.escapeHtml(row.descricao_text) + '</a><div class="text-secondary small">' + REGRA_FISCAL.escapeHtml(row.codigo_interno_text) + '</div>',
		operacao: REGRA_FISCAL.badgeOperacao(row.tipo_operacao_text),
		destino: REGRA_FISCAL.badgeDestino(row.destino_operacao_text),
		cfop: REGRA_FISCAL.escapeHtml(row.cfop_text || "-"),
		tributacao_estadual: REGRA_FISCAL.escapeHtml(row.tributacao_estadual_text || "-"),
		tributacao_federal: REGRA_FISCAL.escapeHtml(row.tributacao_federal_text || "-"),
		estoque: row.movimenta_estoque ? '<span class="badge bg-green-lt">Sim</span>' : '<span class="badge bg-secondary-lt">Nao</span>',
		financeiro: row.movimenta_financeiro ? '<span class="badge bg-green-lt">Sim</span>' : '<span class="badge bg-secondary-lt">Nao</span>',
		prioridade: '<span class="fw-medium">' + REGRA_FISCAL.escapeHtml(row.prioridade_numero) + '</span>',
		ativo: row.ativo_text === "Ativo" ? '<span class="badge bg-success-lt">Ativo</span>' : '<span class="badge bg-danger-lt">Inativo</span>',
		acoes: REGRA_FISCAL.renderActions(row)
	});
};

REGRA_FISCAL.renderActions = function (row) {
	var statusAction = row.ativo_text === "Ativo" ? "inativar" : "ativar";
	var statusText = row.ativo_text === "Ativo" ? "Inativar" : "Ativar";

	return '<div class="dropdown">' +
		'<button class="btn dropdown-toggle align-text-top" data-bs-toggle="dropdown" type="button">Acoes</button>' +
		'<div class="dropdown-menu dropdown-menu-end">' +
			'<a class="dropdown-item" href="./regra-fiscal-form.html?id=' + encodeURIComponent(row.id) + '">Editar</a>' +
			'<a class="dropdown-item" href="#" data-regra-action="visualizar">Visualizar</a>' +
			'<a class="dropdown-item" href="./regra-fiscal-form.html?duplicar=' + encodeURIComponent(row.id) + '">Duplicar</a>' +
			'<a class="dropdown-item" href="#" data-regra-action="' + statusAction + '">' + statusText + '</a>' +
			'<a class="dropdown-item" href="#" data-regra-action="historico">Historico</a>' +
			'<div class="dropdown-divider"></div>' +
			'<a class="dropdown-item text-danger" href="#" data-regra-action="excluir">Excluir</a>' +
		'</div>' +
	'</div>';
};

REGRA_FISCAL.filtrar = function (event) {
	event.preventDefault();
	REGRA_FISCAL.aplicarFiltros();
};

REGRA_FISCAL.aplicarFiltros = function () {
	if (REGRA_FISCAL.table) {
		REGRA_FISCAL.table.ajax.reload(null, false);
	}
};

REGRA_FISCAL.atualizar = function () {
	if (!REGRA_FISCAL.table) {
		return;
	}

	REGRA_FISCAL.table.ajax.reload(function () {
		HELPER.showToast("Listagem de regras fiscais atualizada.", "success");
	}, false);
};

REGRA_FISCAL.limparFiltros = function () {
	var form = $("#formFiltrosRegraFiscal").get(0);

	form.reset();
	if (REGRA_FISCAL.table) {
		REGRA_FISCAL.table.search("");
		REGRA_FISCAL.table.ajax.reload(null, false);
	}
	HELPER.showToast("Filtros removidos.", "success");
};

REGRA_FISCAL.executarAcaoLinha = function (event) {
	event.preventDefault();

	var action = $(this).data("regra-action");
	var row = REGRA_FISCAL.getRowFromElement(this);

	if (!row) {
		return;
	}

	if (action === "visualizar") {
		REGRA_FISCAL.visualizar(row);
		return;
	}

	if (action === "ativar" || action === "inativar") {
		REGRA_FISCAL.abrirConfirmacaoStatus(row, action);
		return;
	}

	if (action === "historico") {
		HELPER.showToast("Historico fiscal sera disponibilizado em auditoria futura.", "info");
		return;
	}

	if (action === "excluir") {
		REGRA_FISCAL.excluir(row);
	}
};

REGRA_FISCAL.visualizar = function (row) {
	$("#btnAbrirRegraModal").attr("href", "./regra-fiscal-form.html?id=" + encodeURIComponent(row.id) + "&modo=readonly");
	$("#modalVisualizarRegraBody").html(
		'<div class="row g-3">' +
			'<div class="col-md-2"><div class="subheader">ID</div><div class="h2 mb-0">' + row.id + '</div></div>' +
			'<div class="col-md-6"><div class="subheader">Descricao</div><div class="fw-medium">' + REGRA_FISCAL.escapeHtml(row.descricao_text) + '</div><div class="text-secondary">' + REGRA_FISCAL.escapeHtml(row.codigo_interno_text) + '</div></div>' +
			'<div class="col-md-2"><div class="subheader">Prioridade</div><div class="h2 mb-0">' + REGRA_FISCAL.escapeHtml(row.prioridade_numero) + '</div></div>' +
			'<div class="col-md-2"><div class="subheader">Status</div><div>' + (row.ativo || "") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Operacao</div><div>' + (row.operacao || "") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Destino</div><div>' + (row.destino || "") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Finalidade NF</div><div>' + REGRA_FISCAL.escapeHtml(row.finalidade_nf_text || "-") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Consumidor final</div><div>' + REGRA_FISCAL.escapeHtml(row.consumidor_final_text || "-") + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">CFOP principal</div><div>' + REGRA_FISCAL.escapeHtml(row.cfop_text || "-") + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Tributacao estadual</div><div>' + REGRA_FISCAL.escapeHtml(row.tributacao_estadual_text || "-") + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Tributacao federal</div><div>' + REGRA_FISCAL.escapeHtml(row.tributacao_federal_text || "-") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Regime emitente</div><div>' + REGRA_FISCAL.escapeHtml(row.regime_emitente_text || "-") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Regime destinatario</div><div>' + REGRA_FISCAL.escapeHtml(row.regime_destinatario_text || "-") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Movimentacoes</div><div>' + (row.estoque || "") + ' ' + (row.financeiro || "") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Indicadores fiscais</div><div>' + REGRA_FISCAL.escapeHtml(row.indicadores_text || "-") + '</div></div>' +
			'<div class="col-12"><div class="subheader">Observacoes</div><div>' + REGRA_FISCAL.escapeHtml(row.observacoes_text || "-") + '</div></div>' +
		'</div>'
	);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalVisualizarRegra")).show();
};

REGRA_FISCAL.abrirConfirmacaoStatus = function (row, action) {
	REGRA_FISCAL.pendingStatus = { row: row, action: action };
	$("#modalStatusRegraTitle").text(action === "ativar" ? "Ativar regra fiscal" : "Inativar regra fiscal");
	$("#modalStatusRegraBody").html(
		'<p class="mb-2">Confirme a alteracao de status da regra <strong>' + REGRA_FISCAL.escapeHtml(row.descricao_text) + '</strong>.</p>' +
		'<div class="text-secondary">A alteracao preserva a parametrizacao para auditoria fiscal.</div>'
	);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalStatusRegra")).show();
};

REGRA_FISCAL.confirmarAlteracaoStatus = function () {
	if (!REGRA_FISCAL.pendingStatus) {
		return;
	}

	REGRA_FISCAL.alterarStatus(REGRA_FISCAL.pendingStatus.row, REGRA_FISCAL.pendingStatus.action);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalStatusRegra")).hide();
	REGRA_FISCAL.pendingStatus = null;
};

REGRA_FISCAL.alterarStatus = function (row, action) {
	HELPER.ajaxPut("/api/regras-fiscais/" + encodeURIComponent(row.id) + "/status", { status: action }, {
		button: "#btnConfirmStatus",
		silentError: true,
		success: function (response) {
			if (!response || !response.message) {
				HELPER.showToast(action === "ativar" ? "Regra fiscal ativada." : "Regra fiscal inativada.", "success");
			}
			REGRA_FISCAL.atualizar();
		},
		error: function () {
			HELPER.showToast(action === "ativar" ? "Regra fiscal ativada no prototipo." : "Regra fiscal inativada no prototipo.", "success");
		}
	});
};

REGRA_FISCAL.excluir = function (row) {
	HELPER.ajaxDelete("/api/regras-fiscais/" + encodeURIComponent(row.id), {}, {
		silentError: true,
		success: function () {
			HELPER.showToast("Regra fiscal excluida.", "success");
			REGRA_FISCAL.atualizar();
		},
		error: function () {
			HELPER.showToast("Regra fiscal excluida no prototipo.", "success");
		}
	});
};

REGRA_FISCAL.getRowFromElement = function (element) {
	var $row = $(element).closest("tr");
	var row = REGRA_FISCAL.table ? REGRA_FISCAL.table.row($row).data() : null;

	if (!row && REGRA_FISCAL.table) {
		row = REGRA_FISCAL.table.row($row.prev()).data();
	}

	return row;
};

REGRA_FISCAL.prepareActionDropdowns = function () {
	$("#tableRegrasFiscais .dropdown-toggle").attr("data-bs-boundary", "viewport");
};

REGRA_FISCAL.adjustTable = function () {
	if (!REGRA_FISCAL.table) {
		return;
	}

	REGRA_FISCAL.table.columns.adjust();

	if (REGRA_FISCAL.table.responsive) {
		REGRA_FISCAL.table.responsive.recalc();
	}
};

REGRA_FISCAL.badgeOperacao = function (value) {
	var classes = {
		"Venda": "bg-green-lt",
		"Compra": "bg-blue-lt",
		"Devolucao": "bg-orange-lt",
		"Transferencia": "bg-cyan-lt",
		"Brinde": "bg-purple-lt"
	};

	return '<span class="badge ' + (classes[value] || "bg-secondary-lt") + '">' + REGRA_FISCAL.escapeHtml(value || "-") + '</span>';
};

REGRA_FISCAL.badgeDestino = function (value) {
	var classes = {
		"Interna": "bg-success-lt",
		"Interestadual": "bg-warning-lt",
		"Exterior": "bg-danger-lt"
	};

	return '<span class="badge ' + (classes[value] || "bg-secondary-lt") + '">' + REGRA_FISCAL.escapeHtml(value || "-") + '</span>';
};

REGRA_FISCAL.boolToText = function (value) {
	return value ? "Sim" : "Nao";
};

REGRA_FISCAL.escapeHtml = function (value) {
	return String(value == null ? "" : value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};

REGRA_FISCAL.getDataTableLanguage = function () {
	return {
		emptyTable: "Nenhuma regra fiscal encontrada.",
		info: "Mostrando _START_ ate _END_ de _TOTAL_ registros",
		infoEmpty: "Mostrando 0 ate 0 de 0 registros",
		infoFiltered: "(filtrado de _MAX_ registros no total)",
		lengthMenu: "Mostrar _MENU_ registros",
		loadingRecords: "Carregando...",
		processing: "Processando...",
		search: "Buscar:",
		zeroRecords: "Nenhuma regra fiscal encontrada.",
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
