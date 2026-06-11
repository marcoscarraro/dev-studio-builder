const FINANCEIRO_RECEBER = window.FINANCEIRO_RECEBER || {};
window.FINANCEIRO_RECEBER = FINANCEIRO_RECEBER;

FINANCEIRO_RECEBER.table = null;
FINANCEIRO_RECEBER.rows = [];
FINANCEIRO_RECEBER.filterRegistered = false;
FINANCEIRO_RECEBER.currentRow = null;
FINANCEIRO_RECEBER.masks = {};

$(document).ready(function () {
	FINANCEIRO_RECEBER.init();
});

FINANCEIRO_RECEBER.init = function () {
	FINANCEIRO_RECEBER.initializeComponents();
	FINANCEIRO_RECEBER.bindEvents();
	FINANCEIRO_RECEBER.loadInitialData();
};

FINANCEIRO_RECEBER.initializeComponents = function () {
	FINANCEIRO_RECEBER.registerFilters();
	FINANCEIRO_RECEBER.iniciarDataTable();
	FINANCEIRO_RECEBER.initMasks();
	FINANCEIRO_RECEBER.setDefaultDates();
};

FINANCEIRO_RECEBER.bindEvents = function () {
	$("#formFiltrosReceber").on("submit", FINANCEIRO_RECEBER.aplicarFiltros);
	$("#filterSearch").on("keyup", HELPER.debounce(FINANCEIRO_RECEBER.aplicarBusca, 300));
	$("#filterSituacao, #filterCliente, #filterVencimentoInicio, #filterVencimentoFim").on("change", FINANCEIRO_RECEBER.aplicarFiltros);
	$("#btnClearFilters, #btnClearAdvanced").on("click", FINANCEIRO_RECEBER.limparFiltros);
	$("#btnApplyAdvanced").on("click", FINANCEIRO_RECEBER.aplicarFiltros);
	$("#btnReloadTable").on("click", FINANCEIRO_RECEBER.recarregarTabela);
	$("#tableFinanceiroReceber").on("click", ".btn-liquidar", FINANCEIRO_RECEBER.abrirModalLiquidacao);
	$("#tableFinanceiroReceber").on("click", ".btn-historico", FINANCEIRO_RECEBER.abrirHistorico);
	$("#tableFinanceiroReceber").on("click", ".btn-renegociar", FINANCEIRO_RECEBER.abrirRenegociacao);
	$("#tableFinanceiroReceber").on("click", ".btn-cancelar", FINANCEIRO_RECEBER.cancelarTitulo);
	$("#btnSalvarLiquidacao").on("click", FINANCEIRO_RECEBER.salvarLiquidacao);
	$("#btnSalvarRenegociacao").on("click", FINANCEIRO_RECEBER.salvarRenegociacao);
	$("#liqDesconto, #liqValorPago").on("input", FINANCEIRO_RECEBER.calcularLiquidacao);
};

FINANCEIRO_RECEBER.loadInitialData = function () {
	HELPER.ajaxGet("../mock/financeiro-receber-list.json", {
		success: function (response) {
			FINANCEIRO_RECEBER.rows = FINANCEIRO_RECEBER.normalizeRows(response);
			FINANCEIRO_RECEBER.atualizarKpis(FINANCEIRO_RECEBER.rows);
		}
	});
};

FINANCEIRO_RECEBER.iniciarDataTable = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	FINANCEIRO_RECEBER.table = $("#tableFinanceiroReceber").DataTable({
		ajax: {
			url: "../mock/financeiro-receber-list.json",
			dataSrc: function (response) {
				FINANCEIRO_RECEBER.rows = FINANCEIRO_RECEBER.normalizeRows(response);
				FINANCEIRO_RECEBER.atualizarKpis(FINANCEIRO_RECEBER.rows);
				return FINANCEIRO_RECEBER.rows;
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
		order: [[6, "asc"]],
		dom: "<'card-body border-bottom py-3'<'d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center'<'text-secondary'l><'btn-list'Bf>>>rt<'card-footer d-flex flex-column flex-md-row gap-2 align-items-center justify-content-between'ip>",
		buttons: [
			{ extend: "colvis", text: "Colunas", className: "btn btn-outline-secondary" }
		],
		columns: [
			{ data: "situacao" },
			{ data: "cliente" },
			{ data: "documento" },
			{ data: "parcela" },
			{ data: "pedido" },
			{ data: "emissao" },
			{ data: "vencimento" },
			{ data: "valor" },
			{ data: "desconto" },
			{ data: "juros" },
			{ data: "multa" },
			{ data: "valor_final" },
			{ data: "recebido" },
			{ data: "saldo" },
			{ data: "conta_banco" },
			{ data: "plano_contas" },
			{ data: "acoes", orderable: false, searchable: false, className: "text-end all", defaultContent: "" }
		],
		createdRow: function (row, data) {
			if (data.row_class) {
				$(row).addClass(data.row_class);
			}
		},
		columnDefs: [
			{ responsivePriority: 1, targets: 16 },
			{ responsivePriority: 2, targets: 1 },
			{ responsivePriority: 3, targets: 6 },
			{ responsivePriority: 4, targets: 0 },
			{ responsivePriority: 5, targets: 11 },
			{ targets: [4, 5, 8, 9, 10, 14, 15], className: "text-secondary" }
		],
		language: FINANCEIRO_RECEBER.getDataTableLanguage(),
		drawCallback: function () {
			var api = this.api();
			var rows = FINANCEIRO_RECEBER.getFilteredRows(api);

			$("#tableFinanceiroReceber .dropdown-toggle").attr("data-bs-boundary", "viewport");
			$("#emptyStateReceber").toggleClass("d-none", rows.length > 0);
			FINANCEIRO_RECEBER.atualizarKpis(rows);
			FINANCEIRO_RECEBER.atualizarResumo(rows);
		}
	});
};

FINANCEIRO_RECEBER.abrirModalLiquidacao = function (event) {
	event.preventDefault();
	var row = FINANCEIRO_RECEBER.findRow($(this).data("id"));

	if (!row) {
		return;
	}

	FINANCEIRO_RECEBER.currentRow = row;
	$("#liquidacaoId").val(row.id);
	$("#liqValorOriginal").val(row.valor);
	$("#liqJuros").val(row.juros);
	$("#liqMulta").val(row.multa);
	$("#liqDesconto").val(FINANCEIRO_RECEBER.formatNumber(row.desconto_numero));
	$("#liqValorFinal").val(row.valor_final);
	$("#liqValorPago").val(FINANCEIRO_RECEBER.formatNumber(row.saldo_numero));
	$("#liqDataRecebimento").val(FINANCEIRO_RECEBER.today());
	$("#liqContaBanco").val(row.conta_banco);
	$("#liqParcial").prop("checked", false);
	FINANCEIRO_RECEBER.calcularLiquidacao();
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLiquidacao")).show();
};

FINANCEIRO_RECEBER.salvarLiquidacao = function () {
	var form = $("#formLiquidacao").get(0);

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Revise os campos da liquidacao.", "warning");
		return;
	}

	HELPER.ajaxPost("/api/financeiro/receber/" + $("#liquidacaoId").val() + "/liquidar", FINANCEIRO_RECEBER.getLiquidacaoPayload(), {
		button: "#btnSalvarLiquidacao",
		silentError: true,
		success: FINANCEIRO_RECEBER.confirmarLiquidacaoLocal,
		error: function () {
			FINANCEIRO_RECEBER.confirmarLiquidacaoLocal();
		}
	});
};

FINANCEIRO_RECEBER.abrirHistorico = function (event) {
	event.preventDefault();
	var row = FINANCEIRO_RECEBER.findRow($(this).data("id"));

	if (!row) {
		return;
	}

	var html = [
		["Titulo criado", "Lancamento " + row.documento + " gerado para " + row.cliente + "."],
		["Cobranca emitida", "Conta vinculada: " + row.conta_banco + "."],
		["Ultima atualizacao", "Saldo atual: " + row.saldo + "."]
	].map(function (item) {
		return '<li class="timeline-event"><div class="timeline-event-icon bg-blue-lt"></div><div class="card timeline-event-card"><div class="card-body"><div class="fw-medium">' + item[0] + '</div><div class="text-secondary">' + item[1] + "</div></div></div></li>";
	}).join("");

	$("#timelineHistorico").html(html);
	window.bootstrap.Offcanvas.getOrCreateInstance(document.getElementById("offcanvasHistorico")).show();
};

FINANCEIRO_RECEBER.abrirRenegociacao = function (event) {
	event.preventDefault();
	var row = FINANCEIRO_RECEBER.findRow($(this).data("id"));

	if (!row) {
		return;
	}

	FINANCEIRO_RECEBER.currentRow = row;
	$("#renSaldo").val(row.saldo);
	$("#renPrimeiroVencimento").val(FINANCEIRO_RECEBER.todayPlus(30));
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalRenegociacao")).show();
};

FINANCEIRO_RECEBER.aplicarBusca = function () {
	if (FINANCEIRO_RECEBER.table) {
		FINANCEIRO_RECEBER.table.search($("#filterSearch").val()).draw();
	}
};

FINANCEIRO_RECEBER.aplicarFiltros = function (event) {
	if (event) {
		event.preventDefault();
	}

	if (FINANCEIRO_RECEBER.table) {
		FINANCEIRO_RECEBER.table.search($("#filterSearch").val()).draw();
	}
};

FINANCEIRO_RECEBER.limparFiltros = function () {
	$("#formFiltrosReceber").get(0).reset();
	$("#offcanvasFiltros input, #offcanvasFiltros select").val("");

	if (FINANCEIRO_RECEBER.table) {
		FINANCEIRO_RECEBER.table.search("").draw();
	}

	HELPER.showToast("Filtros removidos.", "success");
};

FINANCEIRO_RECEBER.recarregarTabela = function () {
	if (!FINANCEIRO_RECEBER.table) {
		return;
	}

	FINANCEIRO_RECEBER.table.ajax.reload(function () {
		HELPER.showToast("Listagem atualizada.", "success");
	}, false);
};

FINANCEIRO_RECEBER.cancelarTitulo = function (event) {
	event.preventDefault();
	HELPER.ajaxPut("/api/financeiro/receber/" + $(this).data("id") + "/cancelar", {}, {
		silentError: true,
		success: function () {
			HELPER.showToast("Titulo enviado para cancelamento.", "success");
			FINANCEIRO_RECEBER.recarregarTabela();
		},
		error: function () {
			HELPER.showToast("Titulo enviado para cancelamento.", "success");
		}
	});
};

FINANCEIRO_RECEBER.salvarRenegociacao = function () {
	HELPER.ajaxPost("/api/financeiro/receber/" + (FINANCEIRO_RECEBER.currentRow ? FINANCEIRO_RECEBER.currentRow.id : "") + "/renegociar", {
		parcelas: $("#renParcelas").val(),
		primeiro_vencimento: $("#renPrimeiroVencimento").val()
	}, {
		button: "#btnSalvarRenegociacao",
		silentError: true,
		success: function () {
			window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalRenegociacao")).hide();
			HELPER.showToast("Renegociacao gerada.", "success");
		},
		error: function () {
			window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalRenegociacao")).hide();
			HELPER.showToast("Renegociacao registrada no prototipo.", "success");
		}
	});
};

FINANCEIRO_RECEBER.registerFilters = function () {
	if (FINANCEIRO_RECEBER.filterRegistered || !$.fn.dataTable) {
		return;
	}

	$.fn.dataTable.ext.search.push(function (settings, data, dataIndex, rowData) {
		if (!settings.nTable || settings.nTable.id !== "tableFinanceiroReceber") {
			return true;
		}

		var row = rowData || {};
		var filters = {
			situacao: $("#filterSituacao").val(),
			cliente: $("#filterCliente").val(),
			conta: $("#filterConta").val(),
			plano: $("#filterPlano").val(),
			tipo: $("#filterTipo").val(),
			vendedor: $("#filterVendedor").val(),
			documento: $("#filterDocumento").val(),
			pedido: $("#filterPedido").val(),
			nfe: $("#filterNfe").val()
		};

		if (filters.situacao && row.situacao_text !== filters.situacao) return false;
		if (filters.cliente && row.cliente !== filters.cliente) return false;
		if (filters.conta && row.conta_banco !== filters.conta) return false;
		if (filters.plano && row.plano_contas !== filters.plano) return false;
		if (filters.tipo && row.tipo_titulo !== filters.tipo) return false;
		if (filters.vendedor && row.vendedor !== filters.vendedor) return false;
		if (filters.documento && row.documento.toLowerCase().indexOf(filters.documento.toLowerCase()) === -1) return false;
		if (filters.pedido && row.pedido.toLowerCase().indexOf(filters.pedido.toLowerCase()) === -1) return false;
		if (filters.nfe && row.nfe.toLowerCase().indexOf(filters.nfe.toLowerCase()) === -1) return false;
		if (!FINANCEIRO_RECEBER.dateInRange(row.vencimento_iso, $("#filterVencimentoInicio").val(), $("#filterVencimentoFim").val())) return false;
		if (!FINANCEIRO_RECEBER.dateInRange(row.emissao_iso, $("#filterEmissaoInicio").val(), $("#filterEmissaoFim").val())) return false;

		return true;
	});

	FINANCEIRO_RECEBER.filterRegistered = true;
};

FINANCEIRO_RECEBER.confirmarLiquidacaoLocal = function () {
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLiquidacao")).hide();
	HELPER.showToast("Baixa financeira registrada.", "success");

	if (FINANCEIRO_RECEBER.table) {
		FINANCEIRO_RECEBER.table.ajax.reload(null, false);
	}
};

FINANCEIRO_RECEBER.calcularLiquidacao = function () {
	var row = FINANCEIRO_RECEBER.currentRow || {};
	var final = Math.max(Number(row.valor_final_numero || 0) - FINANCEIRO_RECEBER.parseNumber($("#liqDesconto").val()), 0);
	var pago = FINANCEIRO_RECEBER.parseNumber($("#liqValorPago").val());
	var diferenca = pago - final;

	$("#liqValorFinal").val(FINANCEIRO_RECEBER.formatCurrency(final));
	$("#liqTrocoSaldo").val(diferenca >= 0 ? "Troco " + FINANCEIRO_RECEBER.formatCurrency(diferenca) : "Saldo " + FINANCEIRO_RECEBER.formatCurrency(Math.abs(diferenca)));
};

FINANCEIRO_RECEBER.getLiquidacaoPayload = function () {
	return {
		id: $("#liquidacaoId").val(),
		desconto: FINANCEIRO_RECEBER.parseNumber($("#liqDesconto").val()),
		valor_pago: FINANCEIRO_RECEBER.parseNumber($("#liqValorPago").val()),
		data_recebimento: $("#liqDataRecebimento").val(),
		conta_banco: $("#liqContaBanco").val(),
		forma_recebimento: $("#liqFormaRecebimento").val(),
		observacao: $("#liqObservacao").val(),
		parcial: $("#liqParcial").is(":checked")
	};
};

FINANCEIRO_RECEBER.atualizarKpis = function (rows) {
	var vencido = rows.filter(function (row) { return row.situacao_text === "Vencido"; });
	var aberto = rows.filter(function (row) { return row.situacao_text !== "Pago" && row.situacao_text !== "Cancelado"; });
	var recebidos = rows.filter(function (row) { return row.recebido_numero > 0; });
	var totalSaldo = FINANCEIRO_RECEBER.sumRows(aberto, "saldo_numero");
	var totalVencido = FINANCEIRO_RECEBER.sumRows(vencido, "saldo_numero");
	var totalRecebido = FINANCEIRO_RECEBER.sumRows(recebidos, "recebido_numero");
	var inadimplencia = totalSaldo > 0 ? (totalVencido / totalSaldo) * 100 : 0;

	$("#kpiAberto").text(FINANCEIRO_RECEBER.formatCurrency(totalSaldo));
	$("#kpiVencido").text(FINANCEIRO_RECEBER.formatCurrency(totalVencido));
	$("#kpiRecebidoMes").text(FINANCEIRO_RECEBER.formatCurrency(totalRecebido));
	$("#kpiTitulos").text(rows.length);
	$("#kpiInadimplencia").text(inadimplencia.toFixed(1).replace(".", ",") + "%");
	$("#kpiHoje").text(FINANCEIRO_RECEBER.formatCurrency(FINANCEIRO_RECEBER.sumRows(rows.filter(function (row) {
		return row.vencimento_iso === "2026-05-11" && row.recebido_numero > 0;
	}), "recebido_numero")));
};

FINANCEIRO_RECEBER.atualizarResumo = function (rows) {
	$("#resumoSaldo").text("Saldo: " + FINANCEIRO_RECEBER.formatCurrency(FINANCEIRO_RECEBER.sumRows(rows, "saldo_numero")));
	$("#resumoRecebido").text("Recebido: " + FINANCEIRO_RECEBER.formatCurrency(FINANCEIRO_RECEBER.sumRows(rows, "recebido_numero")));
};

FINANCEIRO_RECEBER.initMasks = function () {
	if (!window.IMask) {
		return;
	}

	$(".money-field").each(function () {
		if (this.dataset.masked === "1") {
			return;
		}

		this.dataset.masked = "1";
		FINANCEIRO_RECEBER.masks[this.id] = window.IMask(this, {
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

FINANCEIRO_RECEBER.setDefaultDates = function () {
	$("#liqDataRecebimento").val(FINANCEIRO_RECEBER.today());
	$("#renPrimeiroVencimento").val(FINANCEIRO_RECEBER.todayPlus(30));
};

FINANCEIRO_RECEBER.getFilteredRows = function (api) {
	var rows = [];
	api.rows({ filter: "applied" }).every(function () {
		rows.push(this.data());
	});
	return rows;
};

FINANCEIRO_RECEBER.findRow = function (id) {
	return FINANCEIRO_RECEBER.rows.find(function (row) {
		return String(row.id) === String(id);
	});
};

FINANCEIRO_RECEBER.normalizeRows = function (response) {
	return response && Array.isArray(response.data) ? response.data : [];
};

FINANCEIRO_RECEBER.sumRows = function (rows, field) {
	return rows.reduce(function (total, row) {
		return total + Number(row[field] || 0);
	}, 0);
};

FINANCEIRO_RECEBER.dateInRange = function (value, start, end) {
	if (!start && !end) return true;
	if (!value) return false;
	var current = new Date(value + "T00:00:00");
	if (start && current < new Date(start + "T00:00:00")) return false;
	if (end && current > new Date(end + "T23:59:59")) return false;
	return true;
};

FINANCEIRO_RECEBER.parseNumber = function (value) {
	var normalized = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);
	return isNaN(number) ? 0 : number;
};

FINANCEIRO_RECEBER.formatNumber = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

FINANCEIRO_RECEBER.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

FINANCEIRO_RECEBER.today = function () {
	return "2026-05-11";
};

FINANCEIRO_RECEBER.todayPlus = function (days) {
	var date = new Date("2026-05-11T00:00:00");
	date.setDate(date.getDate() + days);
	return date.toISOString().substring(0, 10);
};

FINANCEIRO_RECEBER.getDataTableLanguage = function () {
	return {
		emptyTable: "Nenhum titulo encontrado",
		info: "Mostrando _START_ ate _END_ de _TOTAL_ registros",
		infoEmpty: "Mostrando 0 ate 0 de 0 registros",
		infoFiltered: "(filtrado de _MAX_ registros no total)",
		lengthMenu: "Mostrar _MENU_ registros",
		loadingRecords: "Carregando...",
		processing: "Processando...",
		search: "Buscar:",
		zeroRecords: "Nenhum titulo encontrado",
		paginate: { first: "Primeiro", last: "Ultimo", next: "Proximo", previous: "Anterior" },
		buttons: { colvis: "Colunas" }
	};
};

