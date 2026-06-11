const NFSE = window.NFSE || {};
window.NFSE = NFSE;

NFSE.table = null;
NFSE.rows = [];
NFSE.filterRegistered = false;
NFSE.cancelRow = null;
NFSE.emailRow = null;

$(document).ready(function () {
	NFSE.init();
});

NFSE.init = function () {
	NFSE.initializeComponents();
	NFSE.bindEvents();
	NFSE.loadInitialData();
};

NFSE.initializeComponents = function () {
	NFSE.registerFilters();
	NFSE.setDefaultPeriod();
	NFSE.initTomSelects("#formFiltrosNfse");
	NFSE.initMasks();
	NFSE.initDataTable();
};

NFSE.bindEvents = function () {
	$("#formFiltrosNfse").on("submit", NFSE.filtrar);
	$("#btnLimparFiltros").on("click", NFSE.limparFiltros);
	$("#btnAtualizar").on("click", NFSE.reload);
	$("#btnExportarExcel").on("click", function () { NFSE.exportar("Excel"); });
	$("#btnExportarPdf").on("click", function () { NFSE.exportar("PDF"); });
	$("#filterNumero, #filterSerie, #filterValorInicial, #filterValorFinal").on("keyup", HELPER.debounce(NFSE.aplicarFiltros, 300));
	$("#filterEmissaoInicio, #filterEmissaoFim, #filterTomador, #filterStatus, #filterMunicipio, #filterTipoEmissao, #filterUsuario").on("change", NFSE.aplicarFiltros);
	$("#tableNfse").on("click", "[data-nfse-action]", NFSE.executarAcaoLinha);
	$("#tableNfse").on("click", ".js-preview-nfse", NFSE.abrirPreviewNumero);
	$("#btnConfirmarCancelamento").on("click", NFSE.confirmarCancelamento);
	$("#btnConfirmarEmail").on("click", NFSE.confirmarEmail);
};

NFSE.loadInitialData = function () {
	NFSE.loadRemoteOptions("#filterTomador", "../mock/pessoas.json");
	NFSE.loadRemoteOptions("#filterMunicipio", "../mock/cidades.json");
	NFSE.loadRows();
};

NFSE.initDataTable = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	NFSE.table = $("#tableNfse").DataTable({
		data: [],
		processing: true,
		responsive: true,
		colReorder: true,
		stateSave: true,
		stateDuration: 0,
		stateSaveCallback: HELPER.saveDataTableColumnVisibilityState,
		stateLoadCallback: HELPER.loadDataTableColumnVisibilityState,
		searchDelay: 500,
		autoWidth: false,
		pageLength: 25,
		lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
		order: [[6, "desc"]],
		dom: "<'card-body border-bottom py-3'<'d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center'<'text-secondary'l><'btn-list'Bf>>>rt<'card-footer d-flex flex-column flex-md-row gap-2 align-items-center justify-content-between'ip>",
		buttons: [{ extend: "colvis", text: "Colunas", className: "btn btn-outline-secondary" }],
		columns: [
			{ data: null, render: function (row) { return NFSE.renderStatus(row.status_text); } },
			{ data: null, render: function (row) { return '<a href="#" class="js-preview-nfse" data-id="' + row.id + '">' + NFSE.escapeHtml(row.numero) + '</a>'; } },
			{ data: "serie" },
			{ data: "cliente" },
			{ data: "documento" },
			{ data: "municipio" },
			{ data: "emissao" },
			{ data: "competencia" },
			{ data: "valor_servicos" },
			{ data: "valor_iss" },
			{ data: "valor_liquido" },
			{ data: "origem" },
			{ data: null, orderable: false, searchable: false, className: "text-end all", render: NFSE.renderActions }
		],
		columnDefs: [
			{ responsivePriority: 1, targets: 12 },
			{ responsivePriority: 2, targets: 1 },
			{ responsivePriority: 3, targets: 3 },
			{ responsivePriority: 4, targets: 0 },
			{ responsivePriority: 5, targets: 10 },
			{ targets: [2, 4, 5, 6, 7, 11], className: "text-secondary" }
		],
		language: NFSE.getDataTableLanguage(),
		drawCallback: function () {
			var rows = NFSE.getFilteredRows(this.api());
			NFSE.prepareActionDropdowns();
			$("#emptyStateNfse").toggleClass("d-none", rows.length > 0);
			NFSE.updateIndicators(rows);
		},
		initComplete: function () {
			NFSE.adjustTable();
		}
	});
};

NFSE.loadRows = function () {
	HELPER.ajaxGet("../mock/nfse-list.json", {
		success: function (response) {
			NFSE.rows = response && Array.isArray(response.data) ? response.data : [];
			NFSE.table.clear().rows.add(NFSE.rows).draw();
			NFSE.updateIndicators(NFSE.rows);
		}
	});
};

NFSE.filtrar = function (event) {
	event.preventDefault();
	NFSE.aplicarFiltros();
	HELPER.showToast("Filtros aplicados na listagem de NFS-e.", "success");
};

NFSE.aplicarFiltros = function () {
	if (NFSE.table) {
		NFSE.table.draw();
	}
};

NFSE.reload = function () {
	NFSE.loadRows();
	HELPER.showToast("Listagem de NFS-e atualizada.", "success");
};

NFSE.limparFiltros = function () {
	$("#formFiltrosNfse").get(0).reset();
	NFSE.setDefaultPeriod();
	$("#formFiltrosNfse select").each(function () {
		if (this.tomselect) {
			this.tomselect.clear(true);
		}
	});
	NFSE.aplicarFiltros();
	HELPER.showToast("Filtros removidos.", "success");
};

NFSE.exportar = function (type) {
	HELPER.ajaxGet("/api/nfse/exportar-" + type.toLowerCase(), {
		silentError: true,
		complete: function () {
			HELPER.showToast("Exportacao " + type + " solicitada com os filtros aplicados.", "success");
		}
	});
};

NFSE.executarAcaoLinha = function (event) {
	event.preventDefault();

	var action = $(this).data("nfse-action");
	var row = NFSE.getRowFromElement(this);

	if (!row) {
		return;
	}

	if (action === "visualizar") {
		NFSE.visualizar(row);
		return;
	}
	if (action === "editar") {
		window.location.href = "./nfse-form.html?id=" + encodeURIComponent(row.id);
		return;
	}
	if (action === "emitir") {
		NFSE.emitir(row);
		return;
	}
	if (action === "reprocessar") {
		NFSE.reprocessar(row);
		return;
	}
	if (action === "cancelar") {
		NFSE.abrirCancelamento(row);
		return;
	}
	if (action === "danfse") {
		HELPER.showToast("PDF do DANFS-e preparado para visualizacao.", "success");
		return;
	}
	if (action === "xml") {
		HELPER.showToast("XML da NFS-e preparado para download.", "success");
		return;
	}
	if (action === "email") {
		NFSE.abrirEmail(row);
		return;
	}
	if (action === "duplicar") {
		window.location.href = "./nfse-form.html?duplicar=" + encodeURIComponent(row.id);
		return;
	}
};

NFSE.visualizar = function (row) {
	$("#modalPreviewNfseBody").html(
		'<div class="row g-3">' +
			'<div class="col-md-4"><div class="subheader">Cliente</div><div class="fw-bold">' + NFSE.escapeHtml(row.cliente) + '</div><div class="text-secondary">' + NFSE.escapeHtml(row.documento) + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Documento</div><div>NFS-e ' + NFSE.escapeHtml(row.numero) + ' / Serie ' + NFSE.escapeHtml(row.serie) + '</div><div>' + NFSE.renderStatus(row.status_text) + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Municipio</div><div>' + NFSE.escapeHtml(row.municipio) + '</div><div class="text-secondary">Competencia ' + NFSE.escapeHtml(row.competencia) + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Valor servicos</div><div class="h2 mb-0">' + NFSE.escapeHtml(row.valor_servicos) + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">ISS</div><div class="h2 mb-0">' + NFSE.escapeHtml(row.valor_iss) + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Retencoes</div><div class="h2 mb-0">' + NFSE.formatCurrency(row.valor_retencoes_numero) + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Valor liquido</div><div class="h2 mb-0">' + NFSE.escapeHtml(row.valor_liquido) + '</div></div>' +
			'<div class="col-md-6"><div class="card bg-light"><div class="card-body"><div class="subheader">Servicos</div><div>' + NFSE.escapeHtml(row.servicos_resumo) + '</div></div></div></div>' +
			'<div class="col-md-6"><div class="card bg-light"><div class="card-body"><div class="subheader">Impostos e status</div><div>' + NFSE.escapeHtml(row.historico) + '</div></div></div></div>' +
			'<div class="col-12"><label class="form-label">Observacoes</label><textarea class="form-control" rows="4" readonly>' + NFSE.escapeHtml(row.observacoes || "") + '</textarea></div>' +
		'</div>'
	);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPreviewNfse")).show();
};

NFSE.abrirPreviewNumero = function (event) {
	event.preventDefault();
	var id = $(this).data("id");
	var row = NFSE.rows.find(function (item) { return String(item.id) === String(id); });
	NFSE.visualizar(row);
};

NFSE.emitir = function (row) {
	HELPER.ajaxPost("/api/nfse/" + row.id + "/emitir", {}, {
		silentError: true,
		complete: function () {
			row.status_text = "Processando";
			NFSE.table.rows().invalidate().draw(false);
			HELPER.showToast("NFS-e enviada para emissao municipal.", "success");
		}
	});
};

NFSE.reprocessar = function (row) {
	HELPER.ajaxPost("/api/nfse/" + row.id + "/reprocessar", {}, {
		silentError: true,
		complete: function () {
			row.status_text = "Processando";
			NFSE.table.rows().invalidate().draw(false);
			HELPER.showToast("NFS-e reenviada para reprocessamento.", "success");
		}
	});
};

NFSE.abrirCancelamento = function (row) {
	NFSE.cancelRow = row;
	$("#motivoCancelamento").val("").removeClass("is-invalid");
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalCancelarNfse")).show();
};

NFSE.confirmarCancelamento = function () {
	var motivo = $("#motivoCancelamento").val();

	if (String(motivo || "").trim().length < 15) {
		$("#motivoCancelamento").addClass("is-invalid");
		return;
	}

	$("#motivoCancelamento").removeClass("is-invalid");
	HELPER.ajaxPost("/api/nfse/" + NFSE.cancelRow.id + "/cancelar", { motivo: motivo }, {
		button: "#btnConfirmarCancelamento",
		silentError: true,
		complete: function () {
			NFSE.cancelRow.status_text = "Cancelada";
			NFSE.table.rows().invalidate().draw(false);
			window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalCancelarNfse")).hide();
			HELPER.showToast("Solicitacao de cancelamento enviada ao backend.", "warning");
			NFSE.cancelRow = null;
		}
	});
};

NFSE.abrirEmail = function (row) {
	NFSE.emailRow = row;
	$("#emailDestino").val(row.email || "").removeClass("is-invalid");
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalEmailNfse")).show();
};

NFSE.confirmarEmail = function () {
	var email = $("#emailDestino").val();

	if (!email || email.indexOf("@") === -1) {
		$("#emailDestino").addClass("is-invalid");
		return;
	}

	$("#emailDestino").removeClass("is-invalid");
	HELPER.ajaxPost("/api/nfse/" + NFSE.emailRow.id + "/enviar-email", { email: email }, {
		button: "#btnConfirmarEmail",
		silentError: true,
		complete: function () {
			window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalEmailNfse")).hide();
			HELPER.showToast("E-mail da NFS-e encaminhado.", "success");
			NFSE.emailRow = null;
		}
	});
};

NFSE.registerFilters = function () {
	if (NFSE.filterRegistered || !$.fn.dataTable) {
		return;
	}

	$.fn.dataTable.ext.search.push(function (settings, data, dataIndex, rowData) {
		if (!settings.nTable || settings.nTable.id !== "tableNfse") {
			return true;
		}

		var row = rowData || {};
		var valorInicial = NFSE.parseNumber($("#filterValorInicial").val());
		var valorFinal = NFSE.parseNumber($("#filterValorFinal").val());

		if (!NFSE.contains(row.numero, $("#filterNumero").val())) return false;
		if ($("#filterSerie").val() && row.serie !== $("#filterSerie").val()) return false;
		if (NFSE.getTomText("#filterTomador") && row.cliente !== NFSE.getTomText("#filterTomador")) return false;
		if ($("#filterStatus").val() && row.status_text !== $("#filterStatus").val()) return false;
		if (NFSE.getTomText("#filterMunicipio") && row.municipio_text !== NFSE.getTomText("#filterMunicipio")) return false;
		if ($("#filterTipoEmissao").val() && row.origem !== $("#filterTipoEmissao").val()) return false;
		if (NFSE.getTomText("#filterUsuario") && row.usuario !== NFSE.getTomText("#filterUsuario")) return false;
		if (valorInicial && Number(row.valor_liquido_numero || 0) < valorInicial) return false;
		if (valorFinal && Number(row.valor_liquido_numero || 0) > valorFinal) return false;
		if (!NFSE.dateInRange(row.emissao_iso, $("#filterEmissaoInicio").val(), $("#filterEmissaoFim").val())) return false;

		return true;
	});

	NFSE.filterRegistered = true;
};

NFSE.updateIndicators = function (rows) {
	var autorizadas = NFSE.countByStatus(rows, "Autorizada");
	var canceladas = NFSE.countByStatus(rows, "Cancelada");
	var rejeitadas = NFSE.countByStatus(rows, "Rejeitada");
	var valorEmitido = NFSE.sumRows(rows.filter(function (row) { return row.status_text !== "Cancelada"; }), "valor_servicos_numero");
	var valorIss = NFSE.sumRows(rows.filter(function (row) { return row.status_text !== "Cancelada"; }), "valor_iss_numero");

	$("#kpiEmitidas").text(rows.length);
	$("#kpiAutorizadas").text(autorizadas);
	$("#kpiCanceladas").text(canceladas);
	$("#kpiRejeitadas").text(rejeitadas);
	$("#kpiValorEmitido").text(NFSE.formatCurrency(valorEmitido));
	$("#kpiValorIss").text(NFSE.formatCurrency(valorIss));
};

NFSE.renderStatus = function (status) {
	var classes = {
		"Autorizada": "bg-success",
		"Rejeitada": "bg-danger",
		"Cancelada": "bg-secondary",
		"Processando": "bg-warning",
		"Digitacao": "bg-blue"
	};

	return '<span class="badge ' + (classes[status] || "bg-secondary") + '">' + NFSE.escapeHtml(status || "-") + '</span>';
};

NFSE.renderActions = function (row) {
	var items = [
		'<a class="dropdown-item" href="#" data-nfse-action="visualizar">Visualizar</a>'
	];

	if (row.status_text !== "Autorizada") {
		items.push('<a class="dropdown-item" href="#" data-nfse-action="editar">Editar</a>');
	}
	if (row.status_text === "Digitacao") {
		items.push('<a class="dropdown-item" href="#" data-nfse-action="emitir">Emitir NFS-e</a>');
	}
	if (row.status_text === "Rejeitada") {
		items.push('<a class="dropdown-item" href="#" data-nfse-action="reprocessar">Reprocessar</a>');
	}
	if (row.status_text === "Autorizada") {
		items.push('<a class="dropdown-item text-danger" href="#" data-nfse-action="cancelar">Cancelar NFS-e</a>');
	}

	items.push('<div class="dropdown-divider"></div>');
	items.push('<a class="dropdown-item" href="#" data-nfse-action="danfse">Visualizar DANFS-e</a>');
	items.push('<a class="dropdown-item" href="#" data-nfse-action="xml">Baixar XML</a>');
	items.push('<a class="dropdown-item" href="#" data-nfse-action="email">Enviar e-mail</a>');
	items.push('<a class="dropdown-item" href="#" data-nfse-action="duplicar">Duplicar NFS-e</a>');

	return '<div class="dropdown"><button class="btn dropdown-toggle align-text-top" data-bs-toggle="dropdown" data-bs-boundary="viewport">Acoes</button><div class="dropdown-menu dropdown-menu-end">' + items.join("") + '</div></div>';
};

NFSE.setDefaultPeriod = function () {
	var now = new Date();
	var first = new Date(now.getFullYear(), now.getMonth(), 1);
	var last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

	$("#filterEmissaoInicio").val(first.toISOString().substring(0, 10));
	$("#filterEmissaoFim").val(last.toISOString().substring(0, 10));
};

NFSE.initTomSelects = function (context) {
	if (!window.TomSelect) {
		return;
	}

	$(context).find("select[data-tomselect]").each(function () {
		var select = this;

		if (select.tomselect) {
			return;
		}

		new window.TomSelect(select, {
			plugins: ["dropdown_input", "clear_button"],
			copyClassesToDropdown: false,
			controlInput: "<input>",
			dropdownParent: "body",
			valueField: "id",
			labelField: "text",
			searchField: ["text", "nome", "documento", "telefone", "cidade", "uf"],
			placeholder: $(select).data("placeholder") || "",
			preload: true,
			load: HELPER.debounce(function (query, callback) {
				var url = $(select).data("ajax-url");
				if (!url) {
					callback(NFSE.filterOptions(NFSE.getStaticOptions(select), query));
					return;
				}
				NFSE.loadRemoteOptions("#" + select.id, url, query, callback);
			}, 300)
		});
	});
};

NFSE.loadRemoteOptions = function (selector, url, query, callback) {
	HELPER.ajaxGet(url, {
		success: function (response) {
			var rows = Array.isArray(response) ? response : (response && Array.isArray(response.data) ? response.data : []);
			var options = NFSE.filterOptions(rows.map(NFSE.normalizeOption), query);
			var select = $(selector).get(0);

			if (select && select.tomselect && !callback) {
				select.tomselect.clearOptions();
				select.tomselect.addOptions(options);
				select.tomselect.refreshOptions(false);
			}

			if (callback) {
				callback(options);
			}
		},
		error: function () {
			if (callback) callback();
		}
	});
};

NFSE.initMasks = function () {
	$(".money-filter").each(function () {
		if (!window.IMask || this.dataset.masked === "1") {
			return;
		}

		this.dataset.masked = "1";
		window.IMask(this, {
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

NFSE.getStaticOptions = function (select) {
	return Array.prototype.slice.call(select.options).map(function (option) {
		return { id: option.value, text: option.text };
	}).filter(function (option) {
		return option.id;
	});
};

NFSE.normalizeOption = function (row) {
	return $.extend({}, row, {
		id: row.id,
		text: row.text || row.nome || row.razao_social || row.cidade || ""
	});
};

NFSE.filterOptions = function (items, query) {
	var q = String(query || "").toLowerCase();

	if (!q) {
		return items;
	}

	return items.filter(function (item) {
		return [item.text, item.nome, item.documento, item.telefone, item.cidade, item.uf].join(" ").toLowerCase().indexOf(q) !== -1;
	});
};

NFSE.getTomText = function (selector) {
	var select = $(selector).get(0);

	if (select && select.tomselect) {
		var value = select.tomselect.getValue();
		var item = value ? select.tomselect.options[value] : null;
		return item ? item.text : "";
	}

	return $(selector).val() ? $(selector).find("option:selected").text() : "";
};

NFSE.getRowFromElement = function (element) {
	var $tr = $(element).closest("tr");
	var row = NFSE.table.row($tr).data();

	if (!row && $tr.hasClass("child")) {
		row = NFSE.table.row($tr.prev()).data();
	}

	return row;
};

NFSE.getFilteredRows = function (api) {
	var rows = [];

	api.rows({ filter: "applied" }).every(function () {
		rows.push(this.data());
	});

	return rows;
};

NFSE.countByStatus = function (rows, status) {
	return rows.filter(function (row) { return row.status_text === status; }).length;
};

NFSE.sumRows = function (rows, field) {
	return rows.reduce(function (total, row) {
		return total + Number(row[field] || 0);
	}, 0);
};

NFSE.contains = function (value, query) {
	query = String(query || "").toLowerCase();

	if (!query) {
		return true;
	}

	return String(value || "").toLowerCase().indexOf(query) !== -1;
};

NFSE.dateInRange = function (value, start, end) {
	if (!start && !end) return true;
	if (!value) return false;

	var current = new Date(value + "T00:00:00");

	if (start && current < new Date(start + "T00:00:00")) return false;
	if (end && current > new Date(end + "T23:59:59")) return false;

	return true;
};

NFSE.prepareActionDropdowns = function () {
	$("#tableNfse .dropdown-toggle").attr("data-bs-boundary", "viewport");
};

NFSE.adjustTable = function () {
	if (!NFSE.table) {
		return;
	}

	NFSE.table.columns.adjust();
	if (NFSE.table.responsive) {
		NFSE.table.responsive.recalc();
	}
};

NFSE.parseNumber = function (value) {
	var normalized = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);

	return isNaN(number) ? 0 : number;
};

NFSE.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL"
	});
};

NFSE.escapeHtml = function (value) {
	return String(value == null ? "" : value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};

NFSE.getDataTableLanguage = function () {
	return {
		emptyTable: "Nenhuma NFS-e encontrada",
		info: "Mostrando _START_ ate _END_ de _TOTAL_ registros",
		infoEmpty: "Mostrando 0 ate 0 de 0 registros",
		infoFiltered: "(filtrado de _MAX_ registros no total)",
		lengthMenu: "Mostrar _MENU_ registros",
		loadingRecords: "Carregando...",
		processing: "Processando...",
		search: "Buscar:",
		zeroRecords: "Nenhuma NFS-e encontrada",
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

