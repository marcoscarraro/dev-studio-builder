const NFCE = window.NFCE || {};
window.NFCE = NFCE;

NFCE.tableNfce = null;
NFCE.filterRegistered = false;
NFCE.rows = [];
NFCE.cancelRow = null;

$(document).ready(function () {
	NFCE.init();
});

NFCE.init = function () {
	NFCE.initializeComponents();
	NFCE.bindEvents();
	NFCE.loadInitialData();
};

NFCE.initializeComponents = function () {
	NFCE.registerFilters();
	NFCE.initMasks();
	NFCE.initDataTable();
};

NFCE.bindEvents = function () {
	$("#formFiltrosNfce").on("submit", NFCE.filtrar);
	$("#btnAtualizar").on("click", NFCE.reloadTable);
	$("#btnExportar").on("click", NFCE.exportar);
	$("#btnLimparFiltros").on("click", NFCE.limparFiltros);
	$("#filterNumero, #filterSerie, #filterCpf, #filterCliente, #filterChave, #filterPedido, #filterValorMin, #filterValorMax").on("keyup", HELPER.debounce(NFCE.aplicarFiltros, 300));
	$("#filterOperador, #filterStatus, #filterAmbiente, #filterContingencia, #filterPagamento, #filterEmissaoInicio, #filterEmissaoFim, #filterAutorizacaoInicio, #filterAutorizacaoFim").on("change", NFCE.aplicarFiltros);
	$("#tableNfce").on("click", "[data-nfce-action]", NFCE.executarAcaoLinha);
	$("#btnConfirmarCancelamento").on("click", NFCE.confirmarCancelamento);
	$("#btnModalDanfe").on("click", function () { HELPER.showToast("Preview do DANFE NFC-e preparado.", "success"); });
	$("#btnModalConsultar").on("click", function () { HELPER.showToast("Consulta SEFAZ enviada.", "success"); });
};

NFCE.loadInitialData = function () {
};

NFCE.initDataTable = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	NFCE.tableNfce = $("#tableNfce").DataTable({
		ajax: {
			url: "../mock/nfce-list.json",
			dataSrc: function (response) {
				NFCE.rows = response && Array.isArray(response.data) ? response.data : [];
				NFCE.atualizarResumo(NFCE.rows);
				return NFCE.rows;
			}
		},
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
		order: [[2, "desc"]],
		dom: "<'card-body border-bottom py-3'<'d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center'<'text-secondary'l><'btn-list'Bf>>>rt<'card-footer d-flex flex-column flex-md-row gap-2 align-items-center justify-content-between'ip>",
		buttons: [{ extend: "colvis", text: "Colunas", className: "btn btn-outline-secondary" }],
		columns: [
			{ data: "numero" },
			{ data: "serie" },
			{ data: "data_emissao" },
			{ data: "cliente" },
			{ data: "cpf" },
			{ data: "pedido" },
			{ data: "valor_total" },
			{ data: "status" },
			{ data: "sefaz" },
			{ data: "ambiente" },
			{ data: "chave" },
			{ data: "operador" },
			{ data: "acoes", orderable: false, searchable: false, className: "text-end all" }
		],
		columnDefs: [
			{ responsivePriority: 1, targets: 12 },
			{ responsivePriority: 2, targets: 0 },
			{ responsivePriority: 3, targets: 3 },
			{ responsivePriority: 4, targets: 6 },
			{ responsivePriority: 5, targets: 7 },
			{ targets: [1, 2, 4, 5, 8, 9, 10, 11], className: "text-secondary" }
		],
		language: NFCE.getDataTableLanguage(),
		drawCallback: function () {
			var rows = NFCE.getFilteredRows(this.api());

			NFCE.prepareActionDropdowns();
			$("#emptyStateNfce").toggleClass("d-none", rows.length > 0);
			NFCE.atualizarResumo(rows);
		},
		initComplete: function () {
			NFCE.adjustTable();
		}
	});
};

NFCE.filtrar = function (event) {
	event.preventDefault();
	NFCE.aplicarFiltros();
};

NFCE.aplicarFiltros = function () {
	if (NFCE.tableNfce) {
		NFCE.tableNfce.draw();
	}
};

NFCE.reloadTable = function () {
	if (!NFCE.tableNfce) {
		return;
	}

	NFCE.tableNfce.ajax.reload(function () {
		HELPER.showToast("Listagem de NFC-e atualizada.", "success");
	}, false);
};

NFCE.exportar = function () {
	HELPER.showToast("Exportacao da listagem de NFC-e solicitada.", "success");
};

NFCE.limparFiltros = function () {
	$("#formFiltrosNfce").get(0).reset();
	NFCE.aplicarFiltros();
	HELPER.showToast("Filtros removidos.", "success");
};

NFCE.executarAcaoLinha = function (event) {
	event.preventDefault();

	var action = $(this).data("nfce-action");
	var row = NFCE.getRowFromElement(this);

	if (action === "visualizar") {
		NFCE.visualizar(row);
		return;
	}
	if (action === "cancelar") {
		NFCE.abrirCancelamento(row);
		return;
	}
	if (action === "danfe") {
		HELPER.showToast("DANFE NFC-e enviado para impressao.", "success");
		return;
	}
	if (action === "xml") {
		HELPER.showToast("XML da NFC-e preparado para download.", "success");
		return;
	}
	if (action === "copiar-chave") {
		NFCE.copiarChave(row);
		return;
	}
	if (action === "rejeicao") {
		NFCE.visualizarRejeicao(row);
		return;
	}
	if (action === "reenviar") {
		HELPER.showToast("NFC-e reenviada para a SEFAZ.", "success");
		return;
	}
	if (action === "consultar") {
		HELPER.showToast("Consulta de status SEFAZ enviada.", "success");
		return;
	}
	if (action === "inutilizar") {
		HELPER.showToast("Solicitacao de inutilizacao enviada ao backend.", "warning");
		return;
	}

	HELPER.showToast("Acao fiscal enviada para processamento.", "success");
};

NFCE.visualizar = function (row) {
	if (!row) {
		return;
	}

	$("#modalDetalhesNfceBody").html(
		'<div class="row g-3">' +
			'<div class="col-md-4"><div class="subheader">Emitente</div><div class="fw-medium">' + NFCE.escapeHtml(row.emitente) + '</div><div class="text-secondary">' + NFCE.escapeHtml(row.empresa) + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Consumidor</div><div class="fw-medium">' + NFCE.escapeHtml(row.cliente) + '</div><div class="text-secondary">' + NFCE.escapeHtml(row.cpf || "Consumidor nao identificado") + '</div></div>' +
			'<div class="col-md-4"><div class="subheader">Documento</div><div class="fw-medium">NFC-e ' + NFCE.escapeHtml(row.numero) + ' / Serie ' + NFCE.escapeHtml(row.serie) + '</div><div>' + (row.status || "") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Valor total</div><div class="h2 mb-0">' + NFCE.escapeHtml(row.valor_total) + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Pagamento</div><div class="h2 mb-0">' + NFCE.escapeHtml(row.forma_pagamento) + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Protocolo</div><div>' + NFCE.escapeHtml(row.protocolo || "Pendente") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">QRCode</div><div>' + NFCE.escapeHtml(row.qrcode || "Nao gerado") + '</div></div>' +
			'<div class="col-12"><div class="subheader">Chave acesso</div><code>' + NFCE.escapeHtml(row.chave_completa || row.chave || "Nao gerada") + '</code></div>' +
			'<div class="col-md-6"><div class="card bg-light"><div class="card-body"><div class="subheader">Itens</div><div>' + NFCE.escapeHtml(row.itens_resumo) + '</div></div></div></div>' +
			'<div class="col-md-6"><div class="card bg-light"><div class="card-body"><div class="subheader">Historico SEFAZ</div><div>' + NFCE.escapeHtml(row.historico_sefaz) + '</div></div></div></div>' +
			'<div class="col-md-6"><label class="form-label">XML resumido</label><textarea class="form-control" rows="4" readonly>&lt;NFCe numero="' + NFCE.escapeHtml(row.numero) + '" serie="' + NFCE.escapeHtml(row.serie) + '" status="' + NFCE.escapeHtml(row.status_text) + '" /&gt;</textarea></div>' +
			'<div class="col-md-6"><label class="form-label">Protocolo/Rejeicao</label><textarea class="form-control" rows="4" readonly>' + NFCE.escapeHtml(row.rejeicao || row.protocolo || "Sem ocorrencias") + '</textarea></div>' +
		'</div>'
	);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalDetalhesNfce")).show();
};

NFCE.abrirCancelamento = function (row) {
	NFCE.cancelRow = row;
	$("#cancelamentoJustificativa").val("");
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalCancelarNfce")).show();
};

NFCE.confirmarCancelamento = function () {
	var justificativa = $("#cancelamentoJustificativa").val();

	if (String(justificativa || "").trim().length < 15) {
		HELPER.showToast("Informe uma justificativa com pelo menos 15 caracteres.", "warning");
		return;
	}

	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalCancelarNfce")).hide();
	HELPER.showToast("Solicitacao de cancelamento enviada ao backend.", "warning");
	NFCE.cancelRow = null;
};

NFCE.visualizarRejeicao = function (row) {
	if (!row) {
		return;
	}

	$("#modalDetalhesNfceBody").html(
		'<div class="alert alert-danger"><h4 class="alert-title">Rejeicao SEFAZ</h4><div>' + NFCE.escapeHtml(row.rejeicao || "Rejeicao sem mensagem detalhada.") + '</div></div>' +
		'<div class="row g-3">' +
			'<div class="col-md-3"><div class="subheader">Numero</div><div class="h3 mb-0">' + NFCE.escapeHtml(row.numero) + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Data rejeicao</div><div>' + NFCE.escapeHtml(row.data_rejeicao || "-") + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Pedido/Venda</div><div>' + NFCE.escapeHtml(row.pedido) + '</div></div>' +
			'<div class="col-md-3"><div class="subheader">Operador</div><div>' + NFCE.escapeHtml(row.operador) + '</div></div>' +
		'</div>'
	);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalDetalhesNfce")).show();
};

NFCE.copiarChave = function (row) {
	var chave = row && (row.chave_completa || row.chave);

	if (navigator.clipboard && chave) {
		navigator.clipboard.writeText(chave);
	}

	HELPER.showToast("Chave de acesso copiada.", "success");
};

NFCE.registerFilters = function () {
	if (NFCE.filterRegistered || !$.fn.dataTable) {
		return;
	}

	$.fn.dataTable.ext.search.push(function (settings, data, dataIndex, rowData) {
		if (!settings.nTable || settings.nTable.id !== "tableNfce") {
			return true;
		}

		var row = rowData || {};
		var valorMin = NFCE.parseNumber($("#filterValorMin").val());
		var valorMax = NFCE.parseNumber($("#filterValorMax").val());
		var contingencia = $("#filterContingencia").val();

		if (!NFCE.contains(row.numero, $("#filterNumero").val())) return false;
		if ($("#filterSerie").val() && row.serie !== $("#filterSerie").val()) return false;
		if (!NFCE.contains(row.cpf, $("#filterCpf").val())) return false;
		if (!NFCE.contains(row.cliente, $("#filterCliente").val())) return false;
		if (!NFCE.contains(row.chave_completa || row.chave, $("#filterChave").val())) return false;
		if (!NFCE.contains(row.pedido, $("#filterPedido").val())) return false;
		if ($("#filterOperador").val() && row.operador !== $("#filterOperador").val()) return false;
		if ($("#filterStatus").val() && row.status_text !== $("#filterStatus").val()) return false;
		if ($("#filterAmbiente").val() && row.ambiente_text !== $("#filterAmbiente").val()) return false;
		if ($("#filterPagamento").val() && row.forma_pagamento !== $("#filterPagamento").val()) return false;
		if (contingencia && row.contingencia !== contingencia) return false;
		if (valorMin && Number(row.valor_total_numero || 0) < valorMin) return false;
		if (valorMax && Number(row.valor_total_numero || 0) > valorMax) return false;
		if (!NFCE.dateInRange(row.emissao_iso, $("#filterEmissaoInicio").val(), $("#filterEmissaoFim").val())) return false;
		if (!NFCE.dateInRange(row.autorizacao_iso, $("#filterAutorizacaoInicio").val(), $("#filterAutorizacaoFim").val())) return false;

		return true;
	});

	NFCE.filterRegistered = true;
};

NFCE.atualizarResumo = function (rows) {
	var hoje = new Date().toISOString().substring(0, 10);
	var autorizadas = NFCE.countByStatus(rows, "Autorizada");
	var canceladas = NFCE.countByStatus(rows, "Cancelada");
	var rejeitadas = NFCE.countByStatus(rows, "Rejeitada");
	var contingencia = NFCE.countByStatus(rows, "Contingencia");
	var pendencias = rejeitadas + contingencia + NFCE.countByStatus(rows, "Pendente") + NFCE.countByStatus(rows, "Erro transmissao");
	var valorHoje = NFCE.sumRows(rows.filter(function (row) {
		return row.emissao_iso === hoje && row.status_text !== "Cancelada" && row.status_text !== "Inutilizada";
	}));
	var autorizado = NFCE.sumRows(rows.filter(function (row) { return row.status_text === "Autorizada"; }));
	var cancelado = NFCE.sumRows(rows.filter(function (row) { return row.status_text === "Cancelada"; }));

	$("#kpiEmitidas").text(rows.length);
	$("#kpiAutorizadas").text(autorizadas);
	$("#kpiCanceladas").text(canceladas);
	$("#kpiRejeitadas").text(rejeitadas);
	$("#kpiContingencia").text(contingencia);
	$("#kpiValorHoje").text(NFCE.formatCurrency(valorHoje));
	$("#footerRegistros").text(rows.length);
	$("#footerAutorizado").text(NFCE.formatCurrency(autorizado));
	$("#footerCancelado").text(NFCE.formatCurrency(cancelado));
	$("#footerPendencias").text(pendencias);
	$("#alertFiscalNfce").toggleClass("d-none", pendencias === 0);
	$("#alertFiscalNfceText").text(pendencias + " NFC-e(s) exigem acompanhamento fiscal ou operacional.");
};

NFCE.initMasks = function () {
	$("#filterValorMin, #filterValorMax").each(function () {
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

NFCE.getRowFromElement = function (element) {
	if (!NFCE.tableNfce) {
		return null;
	}

	var $tr = $(element).closest("tr");
	var row = NFCE.tableNfce.row($tr).data();

	if (!row && $tr.hasClass("child")) {
		row = NFCE.tableNfce.row($tr.prev()).data();
	}

	return row;
};

NFCE.getFilteredRows = function (api) {
	var rows = [];

	api.rows({ filter: "applied" }).every(function () {
		rows.push(this.data());
	});

	return rows;
};

NFCE.countByStatus = function (rows, status) {
	return rows.filter(function (row) { return row.status_text === status; }).length;
};

NFCE.sumRows = function (rows) {
	return rows.reduce(function (total, row) {
		return total + Number(row.valor_total_numero || 0);
	}, 0);
};

NFCE.contains = function (value, query) {
	query = String(query || "").toLowerCase();

	if (!query) {
		return true;
	}

	return String(value || "").toLowerCase().indexOf(query) !== -1;
};

NFCE.dateInRange = function (value, start, end) {
	if (!start && !end) return true;
	if (!value) return false;

	var current = new Date(value + "T00:00:00");

	if (start && current < new Date(start + "T00:00:00")) return false;
	if (end && current > new Date(end + "T23:59:59")) return false;

	return true;
};

NFCE.prepareActionDropdowns = function () {
	$("#tableNfce .dropdown-toggle").attr("data-bs-boundary", "viewport");
};

NFCE.adjustTable = function () {
	if (!NFCE.tableNfce) {
		return;
	}

	NFCE.tableNfce.columns.adjust();

	if (NFCE.tableNfce.responsive) {
		NFCE.tableNfce.responsive.recalc();
	}
};

NFCE.parseNumber = function (value) {
	var normalized = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);

	return isNaN(number) ? 0 : number;
};

NFCE.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL"
	});
};

NFCE.escapeHtml = function (value) {
	return String(value == null ? "" : value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};

NFCE.getDataTableLanguage = function () {
	return {
		emptyTable: "Nenhuma NFC-e encontrada",
		info: "Mostrando _START_ ate _END_ de _TOTAL_ registros",
		infoEmpty: "Mostrando 0 ate 0 de 0 registros",
		infoFiltered: "(filtrado de _MAX_ registros no total)",
		lengthMenu: "Mostrar _MENU_ registros",
		loadingRecords: "Carregando...",
		processing: "Processando...",
		search: "Buscar:",
		zeroRecords: "Nenhuma NFC-e encontrada",
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

