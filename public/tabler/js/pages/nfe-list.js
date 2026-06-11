const NFE = window.NFE || {};
window.NFE = NFE;

NFE.tableNfe = null;
NFE.nfeListFilterRegistered = false;
NFE.rows = [];

$(document).ready(function () {
	NFE.init();
});

NFE.init = function () {
	NFE.initializeComponents();
	NFE.bindEvents();
	NFE.loadInitialData();
};

NFE.initializeComponents = function () {
	NFE.registerFilters();
	NFE.initTomSelects("#formFiltrosNfe");
	NFE.carregarTabela();
};

NFE.bindEvents = function () {
	$("#formFiltrosNfe").on("submit", NFE.filtrar);
	$("#btnClearFilters").on("click", NFE.limparFiltros);
	$("#btnReloadTable").on("click", NFE.atualizar);
	$("#btnExportarNfe, #btnImportarXml, #btnManifestarNfe, #btnRelatoriosNfe").on("click", NFE.executarAcaoToolbar);
	$("#filterNumero, #filterDocumento, #filterChave, #filterCfop").on("keyup", HELPER.debounce(NFE.aplicarFiltros, 300));
	$("#filterEmissaoInicio, #filterEmissaoFim, #filterSaidaInicio, #filterSaidaFim, #filterSerie, #filterStatus, #filterTipo, #filterCliente, #filterVendedor, #filterEmpresa, #filterAmbiente, #filterModelo").on("change", NFE.aplicarFiltros);
	$("#tableNfe").on("click", "[data-nfe-action]", NFE.executarAcaoLinha);
};

NFE.loadInitialData = function () {
	NFE.carregarCombos();
};

NFE.carregarTabela = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	NFE.tableNfe = $("#tableNfe").DataTable({
		ajax: {
			url: "../mock/nfe-list.json",
			dataSrc: function (response) {
				NFE.rows = response && Array.isArray(response.data) ? response.data : [];
				NFE.atualizarResumo(NFE.rows);
				return NFE.rows;
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
		order: [[2, "desc"]],
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
			{ data: "serie" },
			{ data: "emissao" },
			{ data: "cliente" },
			{ data: "documento" },
			{ data: "tipo" },
			{ data: "cfop" },
			{ data: "valor_total" },
			{ data: "status" },
			{ data: "ambiente" },
			{ data: "chave_acesso" },
			{ data: "xml", orderable: false, searchable: false },
			{ data: "danfe", orderable: false, searchable: false },
			{ data: "acoes", orderable: false, searchable: false, className: "text-end all", defaultContent: "" }
		],
		columnDefs: [
			{ responsivePriority: 1, targets: 13 },
			{ responsivePriority: 2, targets: 3 },
			{ responsivePriority: 3, targets: 8 },
			{ responsivePriority: 4, targets: 7 },
			{ responsivePriority: 5, targets: 0 },
			{ targets: [1, 2, 4, 5, 6, 9, 10], className: "text-secondary" }
		],
		language: NFE.getDataTableLanguage(),
		drawCallback: function () {
			var api = this.api();
			var rows = NFE.getFilteredRows(api);

			NFE.prepareActionDropdowns();
			$("#emptyStateNfe").toggleClass("d-none", rows.length > 0);
			NFE.atualizarResumo(rows);
		},
		initComplete: function () {
			NFE.adjustTable();
		}
	});
};

NFE.carregarCombos = function () {
	NFE.loadRemoteOptions("#filterCliente", "../mock/pessoas.json");
	NFE.loadRemoteOptions("#filterEmpresa", "../mock/empresas.json");
	NFE.loadRemoteOptions("#filterStatus", "../mock/status-nfe.json");
	NFE.loadRemoteOptions("#filterTipo", "../mock/tipos-operacao.json");
};

NFE.filtrar = function (event) {
	event.preventDefault();
	NFE.aplicarFiltros();
};

NFE.aplicarFiltros = function () {
	if (!NFE.tableNfe) {
		return;
	}

	NFE.tableNfe.draw();
};

NFE.atualizar = function () {
	if (!NFE.tableNfe) {
		return;
	}

	NFE.tableNfe.ajax.reload(function () {
		HELPER.showToast("Listagem de NF-e atualizada.", "success");
	}, false);
};

NFE.limparFiltros = function () {
	var form = $("#formFiltrosNfe").get(0);

	form.reset();
	$("#formFiltrosNfe select").each(function () {
		if (this.tomselect) {
			this.tomselect.clear(true);
		}
	});
	NFE.aplicarFiltros();
	HELPER.showToast("Filtros removidos.", "success");
};

NFE.visualizar = function (row) {
	if (!row) {
		return;
	}

	$("#modalDetalhesNfeBody").html(
		'<div class="row g-3">' +
			'<div class="col-md-4"><div class="subheader">Emitente</div><div class="fw-medium">' + NFE.escapeHtml(row.emitente) + '</div><div class="text-secondary">' + NFE.escapeHtml(row.empresa) + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Destinatario</div><div class="fw-medium">' + NFE.escapeHtml(row.cliente) + '</div><div class="text-secondary">' + NFE.escapeHtml(row.documento) + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Documento</div><div class="fw-medium">NF-e ' + NFE.escapeHtml(row.numero) + ' / Serie ' + NFE.escapeHtml(row.serie) + '</div><div>' + (row.status || "") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Valor total</div><div class="h2 mb-0">' + NFE.escapeHtml(row.valor_total) + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Impostos</div><div class="h2 mb-0">' + NFE.formatCurrency(row.valor_impostos_numero) + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Protocolo</div><div>' + NFE.escapeHtml(row.protocolo || "Pendente") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Ambiente</div><div>' + NFE.escapeHtml(row.ambiente) + '</div></div>' +
			'<div class="col-12"><div class="subheader">Chave acesso</div><code>' + NFE.escapeHtml(row.chave_acesso || "Nao gerada") + '</code></div>' +
			'<div class="col-md-6"><div class="card bg-light"><div class="card-body"><div class="subheader">Itens</div><div>' + NFE.escapeHtml(row.itens_resumo) + '</div></div></div></div>' +
			'<div class="col-md-6"><div class="card bg-light"><div class="card-body"><div class="subheader">Historico transmissao</div><div>Consulta preparada para eventos SEFAZ, CC-e, cancelamento e logs.</div></div></div></div>' +
			'<div class="col-12"><label class="form-label">XML resumido</label><textarea class="form-control" rows="4" readonly>&lt;NFe numero="' + NFE.escapeHtml(row.numero) + '" serie="' + NFE.escapeHtml(row.serie) + '" status="' + NFE.escapeHtml(row.status_text) + '" /&gt;</textarea></div>' +
		'</div>'
	);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalDetalhesNfe")).show();
};

NFE.cancelar = function () {
	HELPER.showToast("Solicitacao de cancelamento enviada.", "warning");
};

NFE.transmitir = function () {
	HELPER.showToast("NF-e enviada para transmissao.", "success");
};

NFE.baixarXml = function () {
	HELPER.showToast("Download do XML preparado.", "success");
};

NFE.visualizarDanfe = function () {
	HELPER.showToast("DANFE aberto para visualizacao.", "success");
};

NFE.executarAcaoLinha = function (event) {
	event.preventDefault();

	var action = $(this).data("nfe-action");
	var row = NFE.tableNfe ? NFE.tableNfe.row($(this).closest("tr")).data() : null;

	if (!row && NFE.tableNfe) {
		row = NFE.tableNfe.row($(this).closest("tr").prev()).data();
	}

	if (action === "visualizar") {
		NFE.visualizar(row);
		return;
	}

	if (action === "cancelar") {
		NFE.cancelar(row);
		return;
	}

	if (action === "transmitir") {
		NFE.transmitir(row);
		return;
	}

	if (action === "xml") {
		NFE.baixarXml(row);
		return;
	}

	HELPER.showToast("Acao fiscal enviada para processamento.", "success");
};

NFE.executarAcaoToolbar = function (event) {
	event.preventDefault();
	HELPER.showToast("Acao solicitada para a central fiscal.", "success");
};

NFE.registerFilters = function () {
	if (NFE.nfeListFilterRegistered || !$.fn.dataTable) {
		return;
	}

	$.fn.dataTable.ext.search.push(function (settings, data, dataIndex, rowData) {
		if (!settings.nTable || settings.nTable.id !== "tableNfe") {
			return true;
		}

		var row = rowData || {};
		var numero = $("#filterNumero").val();
		var serie = $("#filterSerie").val();
		var cliente = NFE.getTomText("#filterCliente");
		var documento = $("#filterDocumento").val();
		var chave = $("#filterChave").val();
		var status = NFE.getTomText("#filterStatus");
		var tipo = NFE.getTomText("#filterTipo");
		var cfop = $("#filterCfop").val();
		var vendedor = $("#filterVendedor").val();
		var empresa = NFE.getTomText("#filterEmpresa");
		var ambiente = $("#filterAmbiente").val();
		var modelo = $("#filterModelo").val();

		if (numero && row.numero.indexOf(numero) === -1) return false;
		if (serie && row.serie !== serie) return false;
		if (cliente && row.cliente !== cliente) return false;
		if (documento && row.documento.indexOf(documento) === -1) return false;
		if (chave && row.chave_acesso.indexOf(chave) === -1) return false;
		if (status && row.status_text !== status) return false;
		if (tipo && row.tipo !== tipo) return false;
		if (cfop && row.cfop.indexOf(cfop) === -1) return false;
		if (vendedor && row.vendedor !== vendedor) return false;
		if (empresa && row.empresa !== empresa) return false;
		if (ambiente && row.ambiente !== ambiente) return false;
		if (modelo && row.modelo !== modelo) return false;
		if (!NFE.dateInRange(row.emissao_iso, $("#filterEmissaoInicio").val(), $("#filterEmissaoFim").val())) return false;
		if (!NFE.dateInRange(row.saida_iso, $("#filterSaidaInicio").val(), $("#filterSaidaFim").val())) return false;

		return true;
	});

	NFE.nfeListFilterRegistered = true;
};

NFE.atualizarResumo = function (rows) {
	var autorizadas = NFE.countByStatus(rows, "Autorizada");
	var rejeitadas = NFE.countByStatus(rows, "Rejeitada");
	var canceladas = NFE.countByStatus(rows, "Cancelada");
	var contingencia = NFE.countByStatus(rows, "Contingencia");
	var faturado = NFE.sumRows(rows.filter(function (row) {
		return row.status_text !== "Cancelada" && row.status_text !== "Inutilizada";
	}));
	var cancelado = NFE.sumRows(rows.filter(function (row) {
		return row.status_text === "Cancelada";
	}));
	var impostos = rows.reduce(function (total, row) {
		return total + Number(row.valor_impostos_numero || 0);
	}, 0);
	var alertas = rejeitadas + contingencia + NFE.countByStatus(rows, "Em Digitacao");

	$("#kpiEmitidas").text(rows.length);
	$("#kpiAutorizadas").text(autorizadas);
	$("#kpiCanceladas").text(canceladas);
	$("#kpiRejeitadas").text(rejeitadas);
	$("#kpiContingencia").text(contingencia);
	$("#kpiValorHoje").text(NFE.formatCurrency(faturado));
	$("#footerTotalRegistros").text(rows.length);
	$("#footerTotalFaturado").text(NFE.formatCurrency(faturado));
	$("#footerTotalCancelado").text(NFE.formatCurrency(cancelado));
	$("#footerTotalImpostos").text(NFE.formatCurrency(impostos));
	$("#alertFiscal").toggleClass("d-none", alertas === 0);
	$("#alertFiscalText").text(alertas + " documento(s) exigem acompanhamento fiscal.");
};

NFE.initTomSelects = function (context) {
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
			searchField: ["text", "nome", "documento", "cnpj"],
			placeholder: $(select).data("placeholder") || "",
			preload: true,
			load: HELPER.debounce(function (query, callback) {
				NFE.loadRemoteOptions("#" + select.id, $(select).data("ajax-url"), query, callback);
			}, 300)
		});
	});
};

NFE.loadRemoteOptions = function (selector, url, query, callback) {
	if (!url) {
		if (callback) callback();
		return;
	}

	HELPER.ajaxGet(url, {
		success: function (response) {
			var rows = response && Array.isArray(response.data) ? response.data : [];
			var options = NFE.filterOptions(rows.map(NFE.normalizeOption), query);
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

NFE.normalizeOption = function (row) {
	return $.extend({}, row, {
		id: row.id,
		text: row.text || row.nome || row.razao_social || row.nome_fantasia || row.cnpj || ""
	});
};

NFE.filterOptions = function (items, query) {
	var q = String(query || "").toLowerCase();

	if (!q) {
		return items;
	}

	return items.filter(function (item) {
		return [item.text, item.nome, item.documento, item.cnpj].join(" ").toLowerCase().indexOf(q) !== -1;
	});
};

NFE.getTomText = function (selector) {
	var select = $(selector).get(0);

	if (select && select.tomselect) {
		var value = select.tomselect.getValue();
		var item = value ? select.tomselect.options[value] : null;
		return item ? item.text : "";
	}

	return $(selector).val() ? $(selector).find("option:selected").text() : "";
};

NFE.getFilteredRows = function (api) {
	var rows = [];

	api.rows({ filter: "applied" }).every(function () {
		rows.push(this.data());
	});

	return rows;
};

NFE.countByStatus = function (rows, status) {
	return rows.filter(function (row) {
		return row.status_text === status;
	}).length;
};

NFE.sumRows = function (rows) {
	return rows.reduce(function (total, row) {
		return total + Number(row.valor_total_numero || 0);
	}, 0);
};

NFE.dateInRange = function (value, start, end) {
	if (!start && !end) return true;
	if (!value) return false;

	var current = new Date(value + "T00:00:00");

	if (start && current < new Date(start + "T00:00:00")) return false;
	if (end && current > new Date(end + "T23:59:59")) return false;

	return true;
};

NFE.prepareActionDropdowns = function () {
	$("#tableNfe .dropdown-toggle").attr("data-bs-boundary", "viewport");
};

NFE.adjustTable = function () {
	if (!NFE.tableNfe) {
		return;
	}

	NFE.tableNfe.columns.adjust();

	if (NFE.tableNfe.responsive) {
		NFE.tableNfe.responsive.recalc();
	}
};

NFE.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL"
	});
};

NFE.escapeHtml = function (value) {
	return String(value == null ? "" : value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};

NFE.getDataTableLanguage = function () {
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


