const TRIBUTACAO_ESTADUAL = window.TRIBUTACAO_ESTADUAL || {};
window.TRIBUTACAO_ESTADUAL = TRIBUTACAO_ESTADUAL;

TRIBUTACAO_ESTADUAL.table = null;
TRIBUTACAO_ESTADUAL.rows = [];
TRIBUTACAO_ESTADUAL.pendingStatus = null;

$(document).ready(function () {
	TRIBUTACAO_ESTADUAL.init();
});

TRIBUTACAO_ESTADUAL.init = function () {
	TRIBUTACAO_ESTADUAL.initializeComponents();
	TRIBUTACAO_ESTADUAL.bindEvents();
	TRIBUTACAO_ESTADUAL.loadInitialData();
};

TRIBUTACAO_ESTADUAL.initializeComponents = function () {
	TRIBUTACAO_ESTADUAL.loadDataTable();
};

TRIBUTACAO_ESTADUAL.bindEvents = function () {
	$("#formFiltrosTributacaoEstadual").on("submit", TRIBUTACAO_ESTADUAL.filtrar);
	$("#btnClearFilters").on("click", TRIBUTACAO_ESTADUAL.limparFiltros);
	$("#btnReloadTable").on("click", TRIBUTACAO_ESTADUAL.atualizar);
	$("#btnConfirmStatus").on("click", TRIBUTACAO_ESTADUAL.confirmarAlteracaoStatus);
	$("#filterBuscaGeral, #filterCfop").on("keyup", HELPER.debounce(TRIBUTACAO_ESTADUAL.aplicarFiltros, 350));
	$("#filterUfDestino, #filterCst, #filterCsosn, #filterPossuiSt, #filterPossuiFcp, #filterPossuiDifal, #filterAtivo").on("change", TRIBUTACAO_ESTADUAL.aplicarFiltros);
	$("#tableTributacoesEstaduais").on("click", "[data-tributacao-action]", TRIBUTACAO_ESTADUAL.executarAcaoLinha);
};

TRIBUTACAO_ESTADUAL.loadInitialData = function () {
};

TRIBUTACAO_ESTADUAL.loadDataTable = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	TRIBUTACAO_ESTADUAL.table = $("#tableTributacoesEstaduais").DataTable({
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
			{ extend: "csvHtml5", text: "Exportar CSV", className: "btn btn-outline-primary", exportOptions: { columns: ":visible:not(.all)" } }
		],
		ajax: function (request, callback) {
			TRIBUTACAO_ESTADUAL.buscarRegistros(request, callback);
		},
		columns: [
			{ data: "id" },
			{ data: "descricao" },
			{ data: "ufs_destino" },
			{ data: "regras" },
			{ data: "cfops" },
			{ data: "icms" },
			{ data: "st" },
			{ data: "fcp" },
			{ data: "difal" },
			{ data: "beneficios" },
			{ data: "ativo" },
			{ data: "acoes", orderable: false, searchable: false, className: "text-end all", defaultContent: "" }
		],
		columnDefs: [
			{ responsivePriority: 1, targets: 11 },
			{ responsivePriority: 2, targets: 1 },
			{ responsivePriority: 3, targets: 2 },
			{ responsivePriority: 4, targets: 5 },
			{ responsivePriority: 5, targets: [6, 7, 8] },
			{ targets: [0, 3, 4, 5, 9], className: "text-secondary" }
		],
		language: TRIBUTACAO_ESTADUAL.getDataTableLanguage(),
		drawCallback: function () {
			var api = this.api();

			TRIBUTACAO_ESTADUAL.prepareActionDropdowns();
			$("#emptyStateTributacaoEstadual").toggleClass("d-none", api.rows({ page: "current" }).data().length > 0);
		},
		initComplete: function () {
			TRIBUTACAO_ESTADUAL.adjustTable();
		}
	});
};

TRIBUTACAO_ESTADUAL.buscarRegistros = function (request, callback) {
	HELPER.ajaxGet("../mock/tributacao-estadual-list.json", {
		silentError: true,
		success: function (response) {
			var rows = response && Array.isArray(response.data) ? response.data : [];
			var result = TRIBUTACAO_ESTADUAL.buildServerSideResponse(rows, request);

			TRIBUTACAO_ESTADUAL.rows = result.data;
			TRIBUTACAO_ESTADUAL.allRows = rows;
			callback(result);
		},
		error: function () {
			callback({ draw: request.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
			HELPER.showToast("Nao foi possivel carregar as tributacoes estaduais.", "danger");
		}
	});
};

TRIBUTACAO_ESTADUAL.buildServerSideResponse = function (rows, request) {
	var filtered = TRIBUTACAO_ESTADUAL.filtrarRows(rows, request);
	var ordered = TRIBUTACAO_ESTADUAL.ordenarRows(filtered, request);
	var start = Number(request.start || 0);
	var length = Number(request.length || 10);
	var page = length > -1 ? ordered.slice(start, start + length) : ordered;

	return {
		draw: request.draw,
		recordsTotal: rows.length,
		recordsFiltered: filtered.length,
		data: page.map(TRIBUTACAO_ESTADUAL.formatRow),
		filteredRows: filtered
	};
};

TRIBUTACAO_ESTADUAL.filtrarRows = function (rows, request) {
	var busca = String($("#filterBuscaGeral").val() || request.search && request.search.value || "").toLowerCase();
	var ufDestino = $("#filterUfDestino").val();
	var cfop = $("#filterCfop").val();
	var cst = $("#filterCst").val();
	var csosn = $("#filterCsosn").val();
	var st = $("#filterPossuiSt").val();
	var fcp = $("#filterPossuiFcp").val();
	var difal = $("#filterPossuiDifal").val();
	var ativo = $("#filterAtivo").val();

	return rows.filter(function (row) {
		var regras = TRIBUTACAO_ESTADUAL.getRegras(row);
		var textoBusca = [
			row.descricao_text,
			row.codigo_interno_text,
			TRIBUTACAO_ESTADUAL.getUniqueValues(regras, "uf_destino").join(" "),
			TRIBUTACAO_ESTADUAL.getUniqueValues(regras, "cfop").join(" "),
			TRIBUTACAO_ESTADUAL.getUniqueValues(regras, "cst_icms").join(" "),
			TRIBUTACAO_ESTADUAL.getUniqueValues(regras, "csosn").join(" "),
			TRIBUTACAO_ESTADUAL.getUniqueValues(regras, "cbenef").join(" "),
			TRIBUTACAO_ESTADUAL.getUniqueValues(regras, "codigo_beneficio_uf").join(" ")
		].join(" ").toLowerCase();

		if (busca && textoBusca.indexOf(busca) === -1) return false;
		if (ufDestino && !TRIBUTACAO_ESTADUAL.hasRegraValue(regras, "uf_destino", ufDestino)) return false;
		if (cfop && !TRIBUTACAO_ESTADUAL.hasRegraValue(regras, "cfop", cfop)) return false;
		if (cst && !TRIBUTACAO_ESTADUAL.hasRegraValue(regras, "cst_icms", cst)) return false;
		if (csosn && !TRIBUTACAO_ESTADUAL.hasRegraValue(regras, "csosn", csosn)) return false;
		if (st && TRIBUTACAO_ESTADUAL.boolToText(regras.some(function (regra) { return !!regra.possui_st; })) !== st) return false;
		if (fcp && TRIBUTACAO_ESTADUAL.boolToText(regras.some(function (regra) { return !!regra.possui_fcp; })) !== fcp) return false;
		if (difal && TRIBUTACAO_ESTADUAL.boolToText(regras.some(function (regra) { return !!regra.possui_difal; })) !== difal) return false;
		if (ativo && row.ativo_text !== ativo) return false;

		return true;
	});
};

TRIBUTACAO_ESTADUAL.ordenarRows = function (rows, request) {
	var order = request.order && request.order[0] ? request.order[0] : null;
	var columnIndex = order ? Number(order.column) : 1;
	var dir = order && order.dir === "desc" ? -1 : 1;
	var fields = ["id", "descricao_text", "ufs_sort", "regras_count", "cfops_sort", "icms_sort", "st_count", "fcp_count", "difal_count", "beneficios_sort", "ativo_text", ""];
	var field = fields[columnIndex] || "descricao_text";

	return rows.slice().sort(function (a, b) {
		var preparedA = TRIBUTACAO_ESTADUAL.prepareRow(a);
		var preparedB = TRIBUTACAO_ESTADUAL.prepareRow(b);

		if (["id", "regras_count", "st_count", "fcp_count", "difal_count", "icms_sort"].indexOf(field) >= 0) {
			return (Number(preparedA[field] || 0) - Number(preparedB[field] || 0)) * dir;
		}

		return String(preparedA[field] || "").localeCompare(String(preparedB[field] || "")) * dir;
	});
};

TRIBUTACAO_ESTADUAL.formatRow = function (row) {
	var prepared = TRIBUTACAO_ESTADUAL.prepareRow(row);

	return $.extend({}, row, prepared, {
		descricao: '<a href="#" class="text-reset fw-medium" data-tributacao-action="visualizar">' + TRIBUTACAO_ESTADUAL.escapeHtml(row.descricao_text) + '</a><div class="text-secondary small">' + TRIBUTACAO_ESTADUAL.escapeHtml(row.codigo_interno_text) + '</div>',
		ufs_destino: TRIBUTACAO_ESTADUAL.renderBadges(prepared.ufs, "bg-blue-lt"),
		regras: '<span class="badge bg-secondary-lt">' + prepared.regras_count + ' regra(s)</span>',
		cfops: prepared.cfops.length ? TRIBUTACAO_ESTADUAL.renderBadges(prepared.cfops, "bg-secondary-lt") : '<span class="text-secondary">-</span>',
		icms: prepared.icmsResumo || '<span class="text-secondary">-</span>',
		st: prepared.st_count ? '<span class="badge bg-red-lt">' + prepared.st_count + ' UF(s)</span>' : '<span class="badge bg-secondary-lt">Sem ST</span>',
		fcp: prepared.fcp_count ? '<span class="badge bg-orange-lt">' + prepared.fcp_count + ' UF(s)</span>' : '<span class="badge bg-secondary-lt">Sem FCP</span>',
		difal: prepared.difal_count ? '<span class="badge bg-blue-lt">' + prepared.difal_count + ' UF(s)</span>' : '<span class="badge bg-secondary-lt">Sem DIFAL</span>',
		beneficios: prepared.beneficios.length ? TRIBUTACAO_ESTADUAL.renderBadges(prepared.beneficios, "bg-green-lt") : '<span class="text-secondary">-</span>',
		ativo: row.ativo_text === "Ativo" ? '<span class="badge bg-success-lt">Ativo</span>' : '<span class="badge bg-danger-lt">Inativo</span>',
		acoes: TRIBUTACAO_ESTADUAL.renderActions(row)
	});
};

TRIBUTACAO_ESTADUAL.prepareRow = function (row) {
	var regras = TRIBUTACAO_ESTADUAL.getRegras(row);
	var ufs = TRIBUTACAO_ESTADUAL.getUniqueValues(regras, "uf_destino");
	var cfops = TRIBUTACAO_ESTADUAL.getUniqueValues(regras, "cfop");
	var beneficios = TRIBUTACAO_ESTADUAL.getUniqueValues(regras, "cbenef").concat(TRIBUTACAO_ESTADUAL.getUniqueValues(regras, "codigo_beneficio_uf"));
	var icmsResumo = regras.map(function (regra) {
		if (!regra.uf_destino || !regra.aliquota_icms) {
			return "";
		}

		return '<span class="badge bg-secondary-lt">' + TRIBUTACAO_ESTADUAL.escapeHtml(regra.uf_destino + " " + regra.aliquota_icms + "%") + '</span>';
	}).filter(Boolean).join(" ");

	return {
		regras: regras,
		ufs: ufs,
		ufs_sort: ufs.join(" "),
		regras_count: regras.length,
		cfops: cfops,
		cfops_sort: cfops.join(" "),
		icmsResumo: icmsResumo,
		icms_sort: TRIBUTACAO_ESTADUAL.getMaiorAliquota(regras),
		st_count: regras.filter(function (regra) { return !!regra.possui_st; }).length,
		fcp_count: regras.filter(function (regra) { return !!regra.possui_fcp; }).length,
		difal_count: regras.filter(function (regra) { return !!regra.possui_difal; }).length,
		beneficios: TRIBUTACAO_ESTADUAL.unique(beneficios),
		beneficios_sort: beneficios.join(" ")
	};
};

TRIBUTACAO_ESTADUAL.getRegras = function (row) {
	return row && Array.isArray(row.regras_uf) ? row.regras_uf : [];
};

TRIBUTACAO_ESTADUAL.getUniqueValues = function (rows, field) {
	return TRIBUTACAO_ESTADUAL.unique(rows.map(function (row) {
		return row[field];
	}).filter(Boolean));
};

TRIBUTACAO_ESTADUAL.hasRegraValue = function (rows, field, value) {
	value = String(value || "").toLowerCase();

	return rows.some(function (row) {
		return String(row[field] || "").toLowerCase().indexOf(value) >= 0;
	});
};

TRIBUTACAO_ESTADUAL.unique = function (values) {
	var found = {};

	return values.filter(function (value) {
		if (found[value]) {
			return false;
		}

		found[value] = true;
		return true;
	});
};

TRIBUTACAO_ESTADUAL.getMaiorAliquota = function (regras) {
	return Math.max.apply(null, regras.map(function (regra) {
		return TRIBUTACAO_ESTADUAL.percentToNumber(regra.aliquota_icms);
	}).concat([0]));
};

TRIBUTACAO_ESTADUAL.percentToNumber = function (value) {
	var normalized = String(value || "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);

	return Number.isFinite(number) ? number : 0;
};

TRIBUTACAO_ESTADUAL.renderBadges = function (values, className) {
	return values.map(function (value) {
		return '<span class="badge ' + className + '">' + TRIBUTACAO_ESTADUAL.escapeHtml(value) + '</span>';
	}).join(" ");
};

TRIBUTACAO_ESTADUAL.renderActions = function (row) {
	var statusAction = row.ativo_text === "Ativo" ? "inativar" : "ativar";
	var statusText = row.ativo_text === "Ativo" ? "Inativar" : "Ativar";

	return '<div class="dropdown">' +
		'<button class="btn dropdown-toggle align-text-top" data-bs-toggle="dropdown" type="button">Acoes</button>' +
		'<div class="dropdown-menu dropdown-menu-end">' +
			'<a class="dropdown-item" href="./tributacao-estadual-form.html?id=' + encodeURIComponent(row.id) + '">Editar</a>' +
			'<a class="dropdown-item" href="./tributacao-estadual-form.html?duplicar=' + encodeURIComponent(row.id) + '">Duplicar</a>' +
			'<a class="dropdown-item" href="#" data-tributacao-action="' + statusAction + '">' + statusText + '</a>' +
			'<a class="dropdown-item" href="#" data-tributacao-action="visualizar">Visualizar</a>' +
			'<a class="dropdown-item" href="#" data-tributacao-action="historico">Historico</a>' +
			'<div class="dropdown-divider"></div>' +
			'<a class="dropdown-item text-danger" href="#" data-tributacao-action="excluir">Excluir</a>' +
		'</div>' +
	'</div>';
};

TRIBUTACAO_ESTADUAL.filtrar = function (event) {
	event.preventDefault();
	TRIBUTACAO_ESTADUAL.aplicarFiltros();
};

TRIBUTACAO_ESTADUAL.aplicarFiltros = function () {
	if (TRIBUTACAO_ESTADUAL.table) {
		TRIBUTACAO_ESTADUAL.table.ajax.reload(null, false);
	}
};

TRIBUTACAO_ESTADUAL.atualizar = function () {
	if (!TRIBUTACAO_ESTADUAL.table) {
		return;
	}

	TRIBUTACAO_ESTADUAL.table.ajax.reload(function () {
		HELPER.showToast("Listagem de tributacoes estaduais atualizada.", "success");
	}, false);
};

TRIBUTACAO_ESTADUAL.limparFiltros = function () {
	var form = $("#formFiltrosTributacaoEstadual").get(0);

	form.reset();
	if (TRIBUTACAO_ESTADUAL.table) {
		TRIBUTACAO_ESTADUAL.table.search("");
		TRIBUTACAO_ESTADUAL.table.ajax.reload(null, false);
	}
	HELPER.showToast("Filtros removidos.", "success");
};

TRIBUTACAO_ESTADUAL.executarAcaoLinha = function (event) {
	event.preventDefault();

	var action = $(this).data("tributacao-action");
	var row = TRIBUTACAO_ESTADUAL.getRowFromElement(this);

	if (!row) {
		return;
	}

	if (action === "visualizar") {
		TRIBUTACAO_ESTADUAL.visualizar(row);
		return;
	}

	if (action === "ativar" || action === "inativar") {
		TRIBUTACAO_ESTADUAL.abrirConfirmacaoStatus(row, action);
		return;
	}

	if (action === "historico") {
		HELPER.showToast("Historico fiscal sera disponibilizado em auditoria futura.", "info");
		return;
	}

	if (action === "excluir") {
		TRIBUTACAO_ESTADUAL.excluir(row);
	}
};

TRIBUTACAO_ESTADUAL.visualizar = function (row) {
	var prepared = TRIBUTACAO_ESTADUAL.prepareRow(row);

	$("#btnAbrirTributacaoModal").attr("href", "./tributacao-estadual-form.html?id=" + encodeURIComponent(row.id) + "&modo=readonly");
	$("#modalVisualizarTributacaoBody").html(
		'<div class="row g-3">' +
			'<div class="col-md-3"><div class="subheader">ID</div><div class="h2 mb-0">' + row.id + '</div></div>' +
			'<div class="col-md-5"><div class="subheader">Descricao</div><div class="fw-medium">' + TRIBUTACAO_ESTADUAL.escapeHtml(row.descricao_text) + '</div><div class="text-secondary">' + TRIBUTACAO_ESTADUAL.escapeHtml(row.codigo_interno_text) + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Status</div><div>' + (row.ativo || "") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">UFs destino</div><div>' + TRIBUTACAO_ESTADUAL.renderBadges(prepared.ufs, "bg-blue-lt") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Regras por UF</div><div class="h3 mb-0">' + prepared.regras_count + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">CFOPs</div><div>' + (prepared.cfops.length ? TRIBUTACAO_ESTADUAL.renderBadges(prepared.cfops, "bg-secondary-lt") : "-") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Indicadores</div><div>' + (row.st || "") + ' ' + (row.fcp || "") + ' ' + (row.difal || "") + '</div></div>' +
			'<div class="col-12"><div class="subheader">Regras e calculos</div>' + TRIBUTACAO_ESTADUAL.renderRegrasDetalhe(prepared.regras) + '</div>' +
			'<div class="col-12"><div class="subheader">Observacoes</div><div>' + TRIBUTACAO_ESTADUAL.escapeHtml(row.observacoes_text || "-") + '</div></div>' +
		'</div>'
	);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalVisualizarTributacao")).show();
};

TRIBUTACAO_ESTADUAL.renderRegrasDetalhe = function (regras) {
	if (!regras.length) {
		return '<div class="text-secondary">Nenhuma UF configurada.</div>';
	}

	return '<div class="table-responsive"><table class="table table-sm table-vcenter"><thead><tr><th>UF</th><th>CFOP</th><th>CST/CSOSN</th><th>ICMS</th><th>ST</th><th>FCP</th><th>DIFAL</th><th>Beneficio</th></tr></thead><tbody>' +
		regras.map(function (regra) {
			return '<tr>' +
				'<td>' + TRIBUTACAO_ESTADUAL.escapeHtml(regra.uf_destino || "-") + '</td>' +
				'<td>' + TRIBUTACAO_ESTADUAL.escapeHtml(regra.cfop || "-") + '</td>' +
				'<td>' + TRIBUTACAO_ESTADUAL.escapeHtml(regra.cst_icms || regra.csosn || "-") + '</td>' +
				'<td>' + TRIBUTACAO_ESTADUAL.escapeHtml(regra.aliquota_icms ? regra.aliquota_icms + "%" : "-") + '</td>' +
				'<td>' + (regra.possui_st ? '<span class="badge bg-red-lt">ST</span>' : '<span class="badge bg-secondary-lt">Sem ST</span>') + '</td>' +
				'<td>' + (regra.possui_fcp ? '<span class="badge bg-orange-lt">FCP</span>' : '<span class="badge bg-secondary-lt">Sem FCP</span>') + '</td>' +
				'<td>' + (regra.possui_difal ? '<span class="badge bg-blue-lt">DIFAL</span>' : '<span class="badge bg-secondary-lt">Sem DIFAL</span>') + '</td>' +
				'<td>' + TRIBUTACAO_ESTADUAL.escapeHtml(regra.cbenef || regra.codigo_beneficio_uf || "-") + '</td>' +
			'</tr>';
		}).join("") +
	'</tbody></table></div>';
};

TRIBUTACAO_ESTADUAL.abrirConfirmacaoStatus = function (row, action) {
	TRIBUTACAO_ESTADUAL.pendingStatus = { row: row, action: action };
	$("#modalStatusTributacaoTitle").text(action === "ativar" ? "Ativar tributacao" : "Inativar tributacao");
	$("#modalStatusTributacaoBody").html(
		'<p class="mb-2">Confirme a alteracao de status da tributacao <strong>' + TRIBUTACAO_ESTADUAL.escapeHtml(row.descricao_text) + '</strong>.</p>' +
		'<div class="text-secondary">A alteracao preserva a configuracao para auditoria fiscal.</div>'
	);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalStatusTributacao")).show();
};

TRIBUTACAO_ESTADUAL.confirmarAlteracaoStatus = function () {
	if (!TRIBUTACAO_ESTADUAL.pendingStatus) {
		return;
	}

	TRIBUTACAO_ESTADUAL.alterarStatus(TRIBUTACAO_ESTADUAL.pendingStatus.row, TRIBUTACAO_ESTADUAL.pendingStatus.action);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalStatusTributacao")).hide();
	TRIBUTACAO_ESTADUAL.pendingStatus = null;
};

TRIBUTACAO_ESTADUAL.alterarStatus = function (row, action) {
	HELPER.ajaxPut("/api/tributacoes-estaduais/" + encodeURIComponent(row.id) + "/status", { status: action }, {
		button: "#btnConfirmStatus",
		silentError: true,
		success: function (response) {
			if (!response || !response.message) {
				HELPER.showToast(action === "ativar" ? "Tributacao ativada." : "Tributacao inativada.", "success");
			}
			TRIBUTACAO_ESTADUAL.atualizar();
		},
		error: function () {
			HELPER.showToast(action === "ativar" ? "Tributacao ativada no prototipo." : "Tributacao inativada no prototipo.", "success");
		}
	});
};

TRIBUTACAO_ESTADUAL.excluir = function (row) {
	HELPER.ajaxDelete("/api/tributacoes-estaduais/" + encodeURIComponent(row.id), {}, {
		silentError: true,
		success: function () {
			HELPER.showToast("Tributacao estadual excluida.", "success");
			TRIBUTACAO_ESTADUAL.atualizar();
		},
		error: function () {
			HELPER.showToast("Tributacao estadual excluida no prototipo.", "success");
		}
	});
};

TRIBUTACAO_ESTADUAL.getRowFromElement = function (element) {
	var $row = $(element).closest("tr");
	var row = TRIBUTACAO_ESTADUAL.table ? TRIBUTACAO_ESTADUAL.table.row($row).data() : null;

	if (!row && TRIBUTACAO_ESTADUAL.table) {
		row = TRIBUTACAO_ESTADUAL.table.row($row.prev()).data();
	}

	return row;
};

TRIBUTACAO_ESTADUAL.prepareActionDropdowns = function () {
	$("#tableTributacoesEstaduais .dropdown-toggle").attr("data-bs-boundary", "viewport");
};

TRIBUTACAO_ESTADUAL.adjustTable = function () {
	if (!TRIBUTACAO_ESTADUAL.table) {
		return;
	}

	TRIBUTACAO_ESTADUAL.table.columns.adjust();

	if (TRIBUTACAO_ESTADUAL.table.responsive) {
		TRIBUTACAO_ESTADUAL.table.responsive.recalc();
	}
};

TRIBUTACAO_ESTADUAL.boolToText = function (value) {
	return value ? "Sim" : "Nao";
};

TRIBUTACAO_ESTADUAL.escapeHtml = function (value) {
	return String(value == null ? "" : value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};

TRIBUTACAO_ESTADUAL.getDataTableLanguage = function () {
	return {
		emptyTable: "Nenhuma tributacao estadual encontrada.",
		info: "Mostrando _START_ ate _END_ de _TOTAL_ registros",
		infoEmpty: "Mostrando 0 ate 0 de 0 registros",
		infoFiltered: "(filtrado de _MAX_ registros no total)",
		lengthMenu: "Mostrar _MENU_ registros",
		loadingRecords: "Carregando...",
		processing: "Processando...",
		search: "Buscar:",
		zeroRecords: "Nenhuma tributacao estadual encontrada.",
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
