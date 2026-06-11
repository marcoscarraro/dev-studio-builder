const TRIBUTACAO_FEDERAL = window.TRIBUTACAO_FEDERAL || {};
window.TRIBUTACAO_FEDERAL = TRIBUTACAO_FEDERAL;

TRIBUTACAO_FEDERAL.table = null;
TRIBUTACAO_FEDERAL.rows = [];
TRIBUTACAO_FEDERAL.allRows = [];
TRIBUTACAO_FEDERAL.pendingStatus = null;

$(document).ready(function () {
	TRIBUTACAO_FEDERAL.init();
});

TRIBUTACAO_FEDERAL.init = function () {
	TRIBUTACAO_FEDERAL.initializeComponents();
	TRIBUTACAO_FEDERAL.bindEvents();
	TRIBUTACAO_FEDERAL.loadInitialData();
};

TRIBUTACAO_FEDERAL.initializeComponents = function () {
	TRIBUTACAO_FEDERAL.loadDataTable();
};

TRIBUTACAO_FEDERAL.bindEvents = function () {
	$("#formFiltrosTributacaoFederal").on("submit", TRIBUTACAO_FEDERAL.filtrar);
	$("#btnClearFilters").on("click", TRIBUTACAO_FEDERAL.limparFiltros);
	$("#btnReloadTable").on("click", TRIBUTACAO_FEDERAL.atualizar);
	$("#btnConfirmStatus").on("click", TRIBUTACAO_FEDERAL.confirmarAlteracaoStatus);
	$("#filterBuscaGeral").on("keyup", HELPER.debounce(TRIBUTACAO_FEDERAL.aplicarFiltros, 350));
	$("#filterCstPis, #filterCstCofins, #filterCstIpi, #filterPossuiIpi, #filterPossuiIi, #filterMonofasico, #filterRetencoes, #filterBeneficio, #filterAtivo").on("change", TRIBUTACAO_FEDERAL.aplicarFiltros);
	$("#tableTributacoesFederais").on("click", "[data-tributacao-action]", TRIBUTACAO_FEDERAL.executarAcaoLinha);
	$("#modalVisualizarTributacao, #modalStatusTributacao").on("click", "[data-bs-dismiss='modal']", TRIBUTACAO_FEDERAL.fecharModalAtual);
};

TRIBUTACAO_FEDERAL.loadInitialData = function () {
};

TRIBUTACAO_FEDERAL.loadDataTable = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	TRIBUTACAO_FEDERAL.table = $("#tableTributacoesFederais").DataTable({
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
		order: [[1, "asc"]],
		dom: "<'card-body border-bottom py-3'<'d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center'<'text-secondary'l><'btn-list'Bf>>>rt<'card-footer d-flex flex-column flex-md-row gap-2 align-items-center justify-content-between'ip>",
		buttons: [
			{ extend: "colvis", text: "Colunas", className: "btn btn-outline-secondary" },
			{ extend: "excelHtml5", text: "Exportar Excel", className: "btn btn-outline-success", exportOptions: { columns: ":visible:not(.all)" } },
			{ extend: "csvHtml5", text: "Exportar CSV", className: "btn btn-outline-primary", exportOptions: { columns: ":visible:not(.all)" } },
			{ text: "Atualizar listagem", className: "btn btn-outline-secondary", action: TRIBUTACAO_FEDERAL.atualizar },
			{ text: "Limpar filtros", className: "btn btn-outline-secondary", action: TRIBUTACAO_FEDERAL.limparFiltros }
		],
		ajax: function (request, callback) {
			TRIBUTACAO_FEDERAL.buscarRegistros(request, callback);
		},
		columns: [
			{ data: "id" },
			{ data: "descricao" },
			{ data: "cst_pis" },
			{ data: "cst_cofins" },
			{ data: "ipi" },
			{ data: "ii" },
			{ data: "monofasico" },
			{ data: "retencoes" },
			{ data: "credito" },
			{ data: "beneficio" },
			{ data: "ativo" },
			{ data: "acoes", orderable: false, searchable: false, className: "text-end all", defaultContent: "" }
		],
		columnDefs: [
			{ responsivePriority: 1, targets: 11 },
			{ responsivePriority: 2, targets: 1 },
			{ responsivePriority: 3, targets: [2, 3] },
			{ responsivePriority: 4, targets: [4, 5, 6, 7] },
			{ targets: [0, 2, 3], className: "text-secondary" }
		],
		language: TRIBUTACAO_FEDERAL.getDataTableLanguage(),
		drawCallback: function () {
			var api = this.api();

			TRIBUTACAO_FEDERAL.prepareActionDropdowns();
			$("#emptyStateTributacaoFederal").toggleClass("d-none", api.rows({ page: "current" }).data().length > 0);
		},
		initComplete: function () {
			TRIBUTACAO_FEDERAL.adjustTable();
		}
	});
};

TRIBUTACAO_FEDERAL.buscarRegistros = function (request, callback) {
	HELPER.ajaxGet("../mock/tributacao-federal-list.json", {
		silentError: true,
		success: function (response) {
			var rows = response && Array.isArray(response.data) ? response.data : [];
			var result = TRIBUTACAO_FEDERAL.buildServerSideResponse(rows, request);

			TRIBUTACAO_FEDERAL.rows = result.data;
			TRIBUTACAO_FEDERAL.allRows = rows;
			callback(result);
		},
		error: function () {
			callback({ draw: request.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
			HELPER.showToast("Nao foi possivel carregar as tributacoes federais.", "danger");
		}
	});
};

TRIBUTACAO_FEDERAL.buildServerSideResponse = function (rows, request) {
	var filtered = TRIBUTACAO_FEDERAL.filtrarRows(rows, request);
	var ordered = TRIBUTACAO_FEDERAL.ordenarRows(filtered, request);
	var start = Number(request.start || 0);
	var length = Number(request.length || 10);
	var page = length > -1 ? ordered.slice(start, start + length) : ordered;

	return {
		draw: request.draw,
		recordsTotal: rows.length,
		recordsFiltered: filtered.length,
		data: page.map(TRIBUTACAO_FEDERAL.formatRow),
		filteredRows: filtered
	};
};

TRIBUTACAO_FEDERAL.filtrarRows = function (rows, request) {
	var busca = String($("#filterBuscaGeral").val() || request.search && request.search.value || "").toLowerCase();
	var cstPis = $("#filterCstPis").val();
	var cstCofins = $("#filterCstCofins").val();
	var cstIpi = $("#filterCstIpi").val();
	var possuiIpi = $("#filterPossuiIpi").val();
	var possuiIi = $("#filterPossuiIi").val();
	var monofasico = $("#filterMonofasico").val();
	var retencoes = $("#filterRetencoes").val();
	var beneficio = $("#filterBeneficio").val();
	var ativo = $("#filterAtivo").val();

	return rows.filter(function (row) {
		var textoBusca = [
			row.descricao_text,
			row.codigo_interno_text,
			row.cst_pis_text,
			row.cst_cofins_text,
			row.cst_ipi_text,
			row.aliquota_ii_text,
			row.retencoes_text,
			row.credito_text,
			row.codigo_beneficio_text,
			row.cbenef_text,
			row.tributo_beneficiado_text,
			row.observacoes_text
		].join(" ").toLowerCase();

		if (busca && textoBusca.indexOf(busca) === -1) return false;
		if (cstPis && row.cst_pis_text !== cstPis) return false;
		if (cstCofins && row.cst_cofins_text !== cstCofins) return false;
		if (cstIpi && row.cst_ipi_text !== cstIpi) return false;
		if (possuiIpi && TRIBUTACAO_FEDERAL.boolToText(row.possui_ipi) !== possuiIpi) return false;
		if (possuiIi && TRIBUTACAO_FEDERAL.boolToText(row.possui_ii) !== possuiIi) return false;
		if (monofasico && TRIBUTACAO_FEDERAL.boolToText(row.produto_monofasico) !== monofasico) return false;
		if (retencoes && TRIBUTACAO_FEDERAL.boolToText(row.possui_retencoes) !== retencoes) return false;
		if (beneficio && TRIBUTACAO_FEDERAL.boolToText(row.possui_beneficio) !== beneficio) return false;
		if (ativo && row.ativo_text !== ativo) return false;

		return true;
	});
};

TRIBUTACAO_FEDERAL.ordenarRows = function (rows, request) {
	var order = request.order && request.order[0] ? request.order[0] : null;
	var columnIndex = order ? Number(order.column) : 1;
	var dir = order && order.dir === "desc" ? -1 : 1;
	var fields = ["id", "descricao_text", "cst_pis_text", "cst_cofins_text", "possui_ipi", "possui_ii", "produto_monofasico", "possui_retencoes", "possui_credito", "possui_beneficio", "ativo_text", ""];
	var field = fields[columnIndex] || "descricao_text";

	return rows.slice().sort(function (a, b) {
		if (field === "id") {
			return (Number(a[field] || 0) - Number(b[field] || 0)) * dir;
		}

		return String(a[field] || "").localeCompare(String(b[field] || "")) * dir;
	});
};

TRIBUTACAO_FEDERAL.formatRow = function (row) {
	return $.extend({}, row, {
		descricao: '<a href="#" class="text-reset fw-medium" data-tributacao-action="visualizar">' + TRIBUTACAO_FEDERAL.escapeHtml(row.descricao_text) + '</a><div class="text-secondary small">' + TRIBUTACAO_FEDERAL.escapeHtml(row.codigo_interno_text) + '</div>',
		cst_pis: row.cst_pis_text || '<span class="text-secondary">-</span>',
		cst_cofins: row.cst_cofins_text || '<span class="text-secondary">-</span>',
		ipi: row.possui_ipi ? '<span class="badge bg-orange-lt">IPI</span>' : '<span class="badge bg-secondary-lt">Sem IPI</span>',
		ii: row.possui_ii ? '<span class="badge bg-cyan-lt">II</span>' : '<span class="badge bg-secondary-lt">Sem II</span>',
		monofasico: row.produto_monofasico ? '<span class="badge bg-purple-lt">Monofasico</span>' : '<span class="badge bg-secondary-lt">Normal</span>',
		retencoes: row.possui_retencoes ? '<span class="badge bg-red-lt">Retencoes</span>' : '<span class="badge bg-secondary-lt">Sem retencoes</span>',
		credito: row.possui_credito ? '<span class="badge bg-green-lt">Credito</span>' : '<span class="badge bg-secondary-lt">Sem credito</span>',
		beneficio: row.possui_beneficio ? '<span class="badge bg-blue-lt">Beneficio</span>' : '<span class="badge bg-secondary-lt">Sem beneficio</span>',
		ativo: row.ativo_text === "Ativo" ? '<span class="badge bg-success-lt">Ativo</span>' : '<span class="badge bg-danger-lt">Inativo</span>',
		acoes: TRIBUTACAO_FEDERAL.renderActions(row)
	});
};

TRIBUTACAO_FEDERAL.renderActions = function (row) {
	var statusAction = row.ativo_text === "Ativo" ? "inativar" : "ativar";
	var statusText = row.ativo_text === "Ativo" ? "Inativar" : "Ativar";

	return '<div class="dropdown">' +
		'<button class="btn dropdown-toggle align-text-top" data-bs-toggle="dropdown" type="button">Acoes</button>' +
		'<div class="dropdown-menu dropdown-menu-end">' +
			'<a class="dropdown-item" href="./tributacao-federal-form.html?id=' + encodeURIComponent(row.id) + '">Editar</a>' +
			'<a class="dropdown-item" href="./tributacao-federal-form.html?duplicar=' + encodeURIComponent(row.id) + '">Duplicar</a>' +
			'<a class="dropdown-item" href="#" data-tributacao-action="' + statusAction + '">' + statusText + '</a>' +
			'<a class="dropdown-item" href="#" data-tributacao-action="visualizar">Visualizar</a>' +
			'<a class="dropdown-item" href="#" data-tributacao-action="historico">Historico</a>' +
			'<div class="dropdown-divider"></div>' +
			'<a class="dropdown-item text-danger" href="#" data-tributacao-action="excluir">Excluir</a>' +
		'</div>' +
	'</div>';
};

TRIBUTACAO_FEDERAL.filtrar = function (event) {
	event.preventDefault();
	TRIBUTACAO_FEDERAL.aplicarFiltros();
};

TRIBUTACAO_FEDERAL.aplicarFiltros = function () {
	if (TRIBUTACAO_FEDERAL.table) {
		TRIBUTACAO_FEDERAL.table.ajax.reload(null, false);
	}
};

TRIBUTACAO_FEDERAL.atualizar = function () {
	if (!TRIBUTACAO_FEDERAL.table) {
		return;
	}

	TRIBUTACAO_FEDERAL.table.ajax.reload(function () {
		HELPER.showToast("Listagem de tributacoes federais atualizada.", "success");
	}, false);
};

TRIBUTACAO_FEDERAL.limparFiltros = function () {
	var form = $("#formFiltrosTributacaoFederal").get(0);

	form.reset();
	if (TRIBUTACAO_FEDERAL.table) {
		TRIBUTACAO_FEDERAL.table.search("");
		TRIBUTACAO_FEDERAL.table.ajax.reload(null, false);
	}
	HELPER.showToast("Filtros removidos.", "success");
};

TRIBUTACAO_FEDERAL.executarAcaoLinha = function (event) {
	event.preventDefault();

	var action = $(this).data("tributacao-action");
	var row = TRIBUTACAO_FEDERAL.getRowFromElement(this);

	if (!row) {
		return;
	}

	if (action === "visualizar") {
		TRIBUTACAO_FEDERAL.visualizar(row);
		return;
	}

	if (action === "ativar" || action === "inativar") {
		TRIBUTACAO_FEDERAL.abrirConfirmacaoStatus(row, action);
		return;
	}

	if (action === "historico") {
		HELPER.showToast("Historico fiscal sera disponibilizado em auditoria futura.", "info");
		return;
	}

	if (action === "excluir") {
		TRIBUTACAO_FEDERAL.excluir(row);
	}
};

TRIBUTACAO_FEDERAL.visualizar = function (row) {
	$("#btnAbrirTributacaoModal").attr("href", "./tributacao-federal-form.html?id=" + encodeURIComponent(row.id) + "&modo=readonly");
	$("#modalVisualizarTributacaoBody").html(
		'<div class="row g-3">' +
			'<div class="col-md-2"><div class="subheader">ID</div><div class="h2 mb-0">' + row.id + '</div></div>' +
			'<div class="col-md-6"><div class="subheader">Descricao</div><div class="fw-medium">' + TRIBUTACAO_FEDERAL.escapeHtml(row.descricao_text) + '</div><div class="text-secondary">' + TRIBUTACAO_FEDERAL.escapeHtml(row.codigo_interno_text) + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Status</div><div>' + (row.ativo || "") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">PIS</div><div>CST ' + TRIBUTACAO_FEDERAL.escapeHtml(row.cst_pis_text || "-") + '</div><div class="text-secondary">' + TRIBUTACAO_FEDERAL.escapeHtml(row.aliquota_pis_text || "-") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">COFINS</div><div>CST ' + TRIBUTACAO_FEDERAL.escapeHtml(row.cst_cofins_text || "-") + '</div><div class="text-secondary">' + TRIBUTACAO_FEDERAL.escapeHtml(row.aliquota_cofins_text || "-") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">IPI</div><div>' + (row.ipi || "") + '</div><div class="text-secondary">CST ' + TRIBUTACAO_FEDERAL.escapeHtml(row.cst_ipi_text || "-") + ' / ' + TRIBUTACAO_FEDERAL.escapeHtml(row.aliquota_ipi_text || "-") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">II</div><div>' + (row.ii || "") + '</div><div class="text-secondary">' + TRIBUTACAO_FEDERAL.escapeHtml(row.aliquota_ii_text || "-") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Credito</div><div>' + (row.credito || "") + '</div><div class="text-secondary">' + TRIBUTACAO_FEDERAL.escapeHtml(row.credito_text || "-") + '</div></div>' +
			'<div class="col-12"><div class="subheader">Indicadores</div><div>' + (row.monofasico || "") + ' ' + (row.retencoes || "") + ' ' + (row.beneficio || "") + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Retencoes</div><div>' + TRIBUTACAO_FEDERAL.escapeHtml(row.retencoes_text || "-") + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Monofasico</div><div>' + TRIBUTACAO_FEDERAL.escapeHtml(row.monofasico_text || "-") + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Beneficio federal</div><div>' + TRIBUTACAO_FEDERAL.escapeHtml(row.beneficio_text || "-") + '</div></div>' +
			'<div class="col-12"><div class="subheader">Observacoes</div><div>' + TRIBUTACAO_FEDERAL.escapeHtml(row.observacoes_text || "-") + '</div></div>' +
		'</div>'
	);
	TRIBUTACAO_FEDERAL.showModal("#modalVisualizarTributacao");
};

TRIBUTACAO_FEDERAL.abrirConfirmacaoStatus = function (row, action) {
	TRIBUTACAO_FEDERAL.pendingStatus = { row: row, action: action };
	$("#modalStatusTributacaoTitle").text(action === "ativar" ? "Ativar tributacao" : "Inativar tributacao");
	$("#modalStatusTributacaoBody").html(
		'<p class="mb-2">Confirme a alteracao de status da tributacao <strong>' + TRIBUTACAO_FEDERAL.escapeHtml(row.descricao_text) + '</strong>.</p>' +
		'<div class="text-secondary">A alteracao preserva a configuracao para auditoria fiscal.</div>'
	);
	TRIBUTACAO_FEDERAL.showModal("#modalStatusTributacao");
};

TRIBUTACAO_FEDERAL.confirmarAlteracaoStatus = function () {
	if (!TRIBUTACAO_FEDERAL.pendingStatus) {
		return;
	}

	TRIBUTACAO_FEDERAL.alterarStatus(TRIBUTACAO_FEDERAL.pendingStatus.row, TRIBUTACAO_FEDERAL.pendingStatus.action);
	TRIBUTACAO_FEDERAL.hideModal("#modalStatusTributacao");
	TRIBUTACAO_FEDERAL.pendingStatus = null;
};

TRIBUTACAO_FEDERAL.alterarStatus = function (row, action) {
	HELPER.ajaxPut("/api/tributacoes-federais/" + encodeURIComponent(row.id) + "/status", { status: action }, {
		button: "#btnConfirmStatus",
		silentError: true,
		success: function (response) {
			if (!response || !response.message) {
				HELPER.showToast(action === "ativar" ? "Tributacao ativada." : "Tributacao inativada.", "success");
			}
			TRIBUTACAO_FEDERAL.atualizar();
		},
		error: function () {
			HELPER.showToast(action === "ativar" ? "Tributacao ativada no prototipo." : "Tributacao inativada no prototipo.", "success");
		}
	});
};

TRIBUTACAO_FEDERAL.excluir = function (row) {
	HELPER.ajaxDelete("/api/tributacoes-federais/" + encodeURIComponent(row.id), {}, {
		silentError: true,
		success: function () {
			HELPER.showToast("Tributacao federal excluida.", "success");
			TRIBUTACAO_FEDERAL.atualizar();
		},
		error: function () {
			HELPER.showToast("Tributacao federal excluida no prototipo.", "success");
		}
	});
};

TRIBUTACAO_FEDERAL.getRowFromElement = function (element) {
	var $row = $(element).closest("tr");
	var row = TRIBUTACAO_FEDERAL.table ? TRIBUTACAO_FEDERAL.table.row($row).data() : null;

	if (!row && TRIBUTACAO_FEDERAL.table) {
		row = TRIBUTACAO_FEDERAL.table.row($row.prev()).data();
	}

	return row;
};

TRIBUTACAO_FEDERAL.prepareActionDropdowns = function () {
	$("#tableTributacoesFederais .dropdown-toggle").attr("data-bs-boundary", "viewport");
};

TRIBUTACAO_FEDERAL.adjustTable = function () {
	if (!TRIBUTACAO_FEDERAL.table) {
		return;
	}

	TRIBUTACAO_FEDERAL.table.columns.adjust();

	if (TRIBUTACAO_FEDERAL.table.responsive) {
		TRIBUTACAO_FEDERAL.table.responsive.recalc();
	}
};

TRIBUTACAO_FEDERAL.boolToText = function (value) {
	return value ? "Sim" : "Nao";
};

TRIBUTACAO_FEDERAL.showModal = function (selector) {
	var element = document.querySelector(selector);

	if (!element) {
		return;
	}

	if (window.bootstrap && window.bootstrap.Modal) {
		window.bootstrap.Modal.getOrCreateInstance(element).show();
		return;
	}

	$(element).addClass("show").css("display", "block").attr("aria-modal", "true").removeAttr("aria-hidden");
	$("body").addClass("modal-open");
};

TRIBUTACAO_FEDERAL.hideModal = function (selector) {
	var element = document.querySelector(selector);

	if (!element) {
		return;
	}

	if (window.bootstrap && window.bootstrap.Modal) {
		window.bootstrap.Modal.getOrCreateInstance(element).hide();
		return;
	}

	$(element).removeClass("show").css("display", "none").attr("aria-hidden", "true").removeAttr("aria-modal");
	$("body").removeClass("modal-open");
};

TRIBUTACAO_FEDERAL.fecharModalAtual = function () {
	TRIBUTACAO_FEDERAL.hideModal("#" + $(this).closest(".modal").attr("id"));
};

TRIBUTACAO_FEDERAL.escapeHtml = function (value) {
	return String(value == null ? "" : value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};

TRIBUTACAO_FEDERAL.getDataTableLanguage = function () {
	return {
		emptyTable: "Nenhuma tributacao federal encontrada.",
		info: "Mostrando _START_ ate _END_ de _TOTAL_ registros",
		infoEmpty: "Mostrando 0 ate 0 de 0 registros",
		infoFiltered: "(filtrado de _MAX_ registros no total)",
		lengthMenu: "Mostrar _MENU_ registros",
		loadingRecords: "Carregando...",
		processing: "Processando...",
		search: "Buscar:",
		zeroRecords: "Nenhuma tributacao federal encontrada.",
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
