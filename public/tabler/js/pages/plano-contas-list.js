const PLANO_CONTAS = window.PLANO_CONTAS || {};
window.PLANO_CONTAS = PLANO_CONTAS;

PLANO_CONTAS.table = null;
PLANO_CONTAS.rows = [];
PLANO_CONTAS.collapsed = {};
PLANO_CONTAS.filterRegistered = false;

$(document).ready(function () {
	PLANO_CONTAS.init();
});

PLANO_CONTAS.init = function () {
	PLANO_CONTAS.initializeComponents();
	PLANO_CONTAS.bindEvents();
	PLANO_CONTAS.loadInitialData();
};

PLANO_CONTAS.initializeComponents = function () {
	PLANO_CONTAS.registerFilters();
	PLANO_CONTAS.initTomSelects("#formFiltrosPlanoContas");
};

PLANO_CONTAS.bindEvents = function () {
	$("#formFiltrosPlanoContas").on("submit", PLANO_CONTAS.aplicarFiltros);
	$("#filterSearch").on("keyup", HELPER.debounce(PLANO_CONTAS.aplicarFiltros, 300));
	$("#filterNatureza, #filterTipoConta, #filterContaSuperior, #filterStatus, #filterAceitaLancamento, #filterMovimentaCaixa, #filterMovimentaBanco").on("change", PLANO_CONTAS.aplicarFiltros);
	$("#btnClearFilters").on("click", PLANO_CONTAS.limparFiltros);
	$("#btnExpandirTudo").on("click", PLANO_CONTAS.expandirTudo);
	$("#btnRecolherTudo").on("click", PLANO_CONTAS.recolherTudo);
	$("#btnAtualizar").on("click", PLANO_CONTAS.recarregarTabela);
	$("[data-export]").on("click", PLANO_CONTAS.exportarListagem);
	$("#tablePlanoContas").on("click", ".btn-toggle-node", PLANO_CONTAS.toggleNode);
	$("#tablePlanoContas").on("click", ".btn-visualizar", PLANO_CONTAS.visualizarConta);
	$("#tablePlanoContas").on("click", ".btn-conta-filha", PLANO_CONTAS.criarContaFilha);
	$("#tablePlanoContas").on("click", ".btn-alterar-status", PLANO_CONTAS.alterarStatus);
	$("#tablePlanoContas").on("click", ".btn-duplicar", PLANO_CONTAS.duplicarConta);
	$("#tablePlanoContas").on("click", ".btn-excluir", PLANO_CONTAS.excluirConta);
	$("#tablePlanoContas").on("click", ".btn-movimentacoes", PLANO_CONTAS.visualizarMovimentacoes);
};

PLANO_CONTAS.loadInitialData = function () {
	PLANO_CONTAS.carregarDataTable();
};

PLANO_CONTAS.carregarDataTable = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	PLANO_CONTAS.table = $("#tablePlanoContas").DataTable({
		ajax: function (data, callback) {
			HELPER.ajaxGet("../mock/plano-contas-list.json", {
				silentError: true,
				success: function (response) {
					PLANO_CONTAS.rows = PLANO_CONTAS.normalizeRows(response);
					PLANO_CONTAS.carregarContasSuperiores();
					callback({ data: PLANO_CONTAS.rows });
				},
				error: function () {
					HELPER.showToast("Nao foi possivel carregar o plano de contas.", "danger");
					callback({ data: [] });
				}
			});
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
		order: [[1, "asc"]],
		dom: "<'card-body border-bottom py-3'<'d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center'<'text-secondary'l><'btn-list'Bf>>>rt<'card-footer d-flex flex-column flex-md-row gap-2 align-items-center justify-content-between'ip>",
		buttons: [
			{ extend: "colvis", text: "Colunas", className: "btn btn-outline-secondary" }
		],
		columns: [
			{ data: "codigo" },
			{ data: "classificacao" },
			{ data: "nome_conta" },
			{ data: "tipo" },
			{ data: "natureza" },
			{ data: "conta_superior" },
			{ data: "aceita_lancamento" },
			{ data: "fluxo_caixa" },
			{ data: "status" },
			{ data: "acoes", orderable: false, searchable: false, className: "text-end all" }
		],
		createdRow: function (row, data) {
			if (data.row_class) {
				$(row).addClass(data.row_class);
			}
		},
		columnDefs: [
			{ responsivePriority: 1, targets: 2 },
			{ responsivePriority: 2, targets: 9 },
			{ responsivePriority: 3, targets: 0 },
			{ responsivePriority: 4, targets: 3 },
			{ responsivePriority: 5, targets: 8 },
			{ targets: [4, 5], className: "text-secondary" }
		],
		language: PLANO_CONTAS.getDataTableLanguage(),
		drawCallback: function () {
			var api = this.api();
			var rows = PLANO_CONTAS.getFilteredRows(api);

			$("#tablePlanoContas .dropdown-toggle").attr("data-bs-boundary", "viewport");
			$("#emptyStatePlanoContas").toggleClass("d-none", rows.length > 0);
			PLANO_CONTAS.atualizarResumo(rows);
			PLANO_CONTAS.atualizarIconesArvore();
		}
	});
};

PLANO_CONTAS.aplicarFiltros = function (event) {
	if (event) {
		event.preventDefault();
	}

	if (PLANO_CONTAS.table) {
		PLANO_CONTAS.table.search($("#filterSearch").val()).draw();
	}
};

PLANO_CONTAS.expandirTudo = function () {
	PLANO_CONTAS.collapsed = {};

	if (PLANO_CONTAS.table) {
		PLANO_CONTAS.table.draw();
	}

	HELPER.showToast("Arvore expandida.", "success");
};

PLANO_CONTAS.recolherTudo = function () {
	PLANO_CONTAS.collapsed = {};

	PLANO_CONTAS.rows.forEach(function (row) {
		if (row.has_children) {
			PLANO_CONTAS.collapsed[row.id] = true;
		}
	});

	if (PLANO_CONTAS.table) {
		PLANO_CONTAS.table.draw();
	}

	HELPER.showToast("Arvore recolhida.", "success");
};

PLANO_CONTAS.visualizarConta = function (event) {
	event.preventDefault();
	var row = PLANO_CONTAS.findRow($(this).data("id"));

	if (!row) {
		return;
	}

	$("#btnEditarModal").attr("href", "./plano-contas-form.html?id=" + row.id);
	$("#modalContaDetalhesBody").html(PLANO_CONTAS.renderDetalhes(row));
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalContaDetalhes")).show();
};

PLANO_CONTAS.criarContaFilha = function (event) {
	event.preventDefault();
	var row = PLANO_CONTAS.findRow($(this).data("id"));
	var url = "./plano-contas-form.html";

	if (row) {
		url += "?conta_superior_id=" + encodeURIComponent(row.id);
	}

	window.location.href = url;
};

PLANO_CONTAS.alterarStatus = function (event) {
	event.preventDefault();
	var id = $(this).data("id");
	var row = PLANO_CONTAS.findRow(id);

	if (!row) {
		return;
	}

	HELPER.ajaxPut("/api/plano-contas/" + id + "/status", { status: row.status_text !== "Ativo" }, {
		button: this,
		silentError: true,
		success: function () {
			HELPER.showToast("Status atualizado.", "success");
			PLANO_CONTAS.recarregarTabela();
		},
		error: function () {
			HELPER.showToast("Status atualizado no prototipo.", "success");
		}
	});
};

PLANO_CONTAS.duplicarConta = function (event) {
	event.preventDefault();
	var id = $(this).data("id");

	HELPER.ajaxPost("/api/plano-contas/" + id + "/duplicar", {}, {
		button: this,
		silentError: true,
		success: function () {
			HELPER.showToast("Conta duplicada com sucesso.", "success");
			PLANO_CONTAS.recarregarTabela();
		},
		error: function () {
			HELPER.showToast("Duplicacao enviada no prototipo.", "success");
		}
	});
};

PLANO_CONTAS.excluirConta = function (event) {
	event.preventDefault();
	var row = PLANO_CONTAS.findRow($(this).data("id"));

	if (!row) {
		return;
	}

	if (row.has_children || row.movimentacoes_count > 0 || row.vinculada_financeiro) {
		HELPER.showToast("Esta conta nao pode ser excluida por possuir vinculos, filhas ou movimentacoes.", "warning");
		return;
	}

	HELPER.ajaxDelete("/api/plano-contas/" + row.id, {}, {
		button: this,
		silentError: true,
		success: function () {
			HELPER.showToast("Conta excluida.", "success");
			PLANO_CONTAS.recarregarTabela();
		},
		error: function () {
			HELPER.showToast("Exclusao enviada no prototipo.", "success");
		}
	});
};

PLANO_CONTAS.visualizarMovimentacoes = function (event) {
	event.preventDefault();
	var row = PLANO_CONTAS.findRow($(this).data("id"));

	if (!row) {
		return;
	}

	var html = (row.movimentacoes || []).map(function (item) {
		return "<tr><td>" + item.modulo + "</td><td>" + item.documento + "</td><td>" + item.data + "</td><td>" + item.valor + "</td><td>" + item.status + "</td></tr>";
	}).join("");

	if (!html) {
		html = '<tr><td colspan="5" class="text-secondary">Nenhuma movimentacao vinculada.</td></tr>';
	}

	$("#tableMovimentacoesBody").html(html);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalMovimentacoes")).show();
};

PLANO_CONTAS.limparFiltros = function () {
	$("#formFiltrosPlanoContas").get(0).reset();
	PLANO_CONTAS.clearTomSelect("#filterContaSuperior");

	if (PLANO_CONTAS.table) {
		PLANO_CONTAS.table.search("").draw();
	}

	HELPER.showToast("Filtros removidos.", "success");
};

PLANO_CONTAS.recarregarTabela = function () {
	if (!PLANO_CONTAS.table) {
		return;
	}

	PLANO_CONTAS.table.ajax.reload(function () {
		HELPER.showToast("Plano de contas atualizado.", "success");
	}, false);
};

PLANO_CONTAS.exportarListagem = function () {
	var tipo = $(this).data("export");

	HELPER.showToast("Exportacao " + String(tipo || "").toUpperCase() + " preparada com os filtros aplicados.", "success");
};

PLANO_CONTAS.toggleNode = function (event) {
	event.preventDefault();
	var id = $(this).data("id");

	PLANO_CONTAS.collapsed[id] = !PLANO_CONTAS.collapsed[id];

	if (PLANO_CONTAS.table) {
		PLANO_CONTAS.table.draw(false);
	}
};

PLANO_CONTAS.registerFilters = function () {
	if (PLANO_CONTAS.filterRegistered || !$.fn.dataTable) {
		return;
	}

	$.fn.dataTable.ext.search.push(function (settings, data, dataIndex, rowData) {
		if (!settings.nTable || settings.nTable.id !== "tablePlanoContas") {
			return true;
		}

		var row = rowData || {};
		var contaSuperior = $("#filterContaSuperior").val();

		if (PLANO_CONTAS.isHiddenByCollapsedParent(row)) return false;
		if ($("#filterNatureza").val() && row.natureza_text !== $("#filterNatureza").val()) return false;
		if ($("#filterTipoConta").val() && row.tipo_text !== $("#filterTipoConta").val()) return false;
		if (contaSuperior && String(row.parent_id || "") !== String(contaSuperior)) return false;
		if ($("#filterStatus").val() && row.status_text !== $("#filterStatus").val()) return false;
		if ($("#filterAceitaLancamento").val() && row.aceita_lancamento_text !== $("#filterAceitaLancamento").val()) return false;
		if ($("#filterMovimentaCaixa").val() && row.movimenta_caixa_text !== $("#filterMovimentaCaixa").val()) return false;
		if ($("#filterMovimentaBanco").val() && row.movimenta_banco_text !== $("#filterMovimentaBanco").val()) return false;

		return true;
	});

	PLANO_CONTAS.filterRegistered = true;
};

PLANO_CONTAS.initTomSelects = function (context) {
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
			searchField: ["text", "codigo", "descricao", "classificacao"],
			create: false,
			placeholder: $(select).data("placeholder") || "",
			preload: true,
			load: HELPER.debounce(function (query, callback) {
				callback(PLANO_CONTAS.filtrarOpcoes(PLANO_CONTAS.getContasSuperiores(), query));
			}, 300)
		});
	});
};

PLANO_CONTAS.carregarContasSuperiores = function () {
	var select = $("#filterContaSuperior").get(0);
	var rows = PLANO_CONTAS.getContasSuperiores();

	if (!select || !select.tomselect) {
		return;
	}

	select.tomselect.clearOptions();
	select.tomselect.addOptions(rows);
	select.tomselect.refreshOptions(false);
};

PLANO_CONTAS.getContasSuperiores = function () {
	return PLANO_CONTAS.rows.filter(function (row) {
		return row.has_children || row.tipo_text === "Sintetica";
	}).map(function (row) {
		return {
			id: String(row.id),
			text: row.codigo_text + " - " + row.descricao_text,
			codigo: row.codigo_text,
			descricao: row.descricao_text,
			classificacao: row.classificacao_text
		};
	});
};

PLANO_CONTAS.isHiddenByCollapsedParent = function (row) {
	var parentId = row.parent_id;

	while (parentId) {
		if (PLANO_CONTAS.collapsed[parentId]) {
			return true;
		}

		var parent = PLANO_CONTAS.findRow(parentId);
		parentId = parent ? parent.parent_id : null;
	}

	return false;
};

PLANO_CONTAS.atualizarIconesArvore = function () {
	$("#tablePlanoContas .btn-toggle-node").each(function () {
		var id = $(this).data("id");
		var expanded = !PLANO_CONTAS.collapsed[id];

		$(this).attr("aria-label", expanded ? "Recolher conta" : "Expandir conta");
		$(this).find(".tree-toggle-symbol").text(expanded ? "-" : "+");
	});
};

PLANO_CONTAS.renderDetalhes = function (row) {
	return "" +
		'<div class="row g-3">' +
			'<div class="col-12 col-lg-6"><div class="card"><div class="card-header"><h3 class="card-title">Dados principais</h3></div><div class="card-body"><dl class="row mb-0"><dt class="col-5">Codigo</dt><dd class="col-7">' + row.codigo_text + '</dd><dt class="col-5">Classificacao</dt><dd class="col-7">' + row.classificacao_text + '</dd><dt class="col-5">Conta</dt><dd class="col-7">' + row.descricao_text + '</dd><dt class="col-5">Superior</dt><dd class="col-7">' + (row.conta_superior_text || "Conta raiz") + '</dd></dl></div></div></div>' +
			'<div class="col-12 col-lg-6"><div class="card"><div class="card-header"><h3 class="card-title">Integracoes</h3></div><div class="card-body"><div class="mb-2">' + row.tipo + " " + row.status + '</div><div class="mb-2">' + row.aceita_lancamento + " " + row.fluxo_caixa + '</div><div>' + row.natureza + '</div></div></div></div>' +
			'<div class="col-12 col-lg-6"><div class="card"><div class="card-header"><h3 class="card-title">Parametros financeiros</h3></div><div class="card-body"><dl class="row mb-0"><dt class="col-6">Movimenta caixa</dt><dd class="col-6">' + row.movimenta_caixa_text + '</dd><dt class="col-6">Movimenta banco</dt><dd class="col-6">' + row.movimenta_banco_text + '</dd><dt class="col-6">Movimentacoes</dt><dd class="col-6">' + row.movimentacoes_count + '</dd></dl></div></div></div>' +
			'<div class="col-12 col-lg-6"><div class="card"><div class="card-header"><h3 class="card-title">Observacoes</h3></div><div class="card-body"><p class="mb-0 text-secondary">' + (row.observacoes || "Sem observacoes internas.") + "</p></div></div></div>" +
		"</div>";
};

PLANO_CONTAS.atualizarResumo = function (rows) {
	var sinteticas = rows.filter(function (row) { return row.tipo_text === "Sintetica"; }).length;
	var analiticas = rows.filter(function (row) { return row.tipo_text === "Analitica"; }).length;

	$("#resumoTotal").text(rows.length + " contas");
	$("#resumoAnaliticas").text(analiticas + " analiticas");
	$("#resumoSinteticas").text(sinteticas + " sinteticas");
};

PLANO_CONTAS.getFilteredRows = function (api) {
	var rows = [];

	api.rows({ filter: "applied" }).every(function () {
		rows.push(this.data());
	});

	return rows;
};

PLANO_CONTAS.findRow = function (id) {
	return PLANO_CONTAS.rows.find(function (row) {
		return String(row.id) === String(id);
	});
};

PLANO_CONTAS.normalizeRows = function (response) {
	return response && Array.isArray(response.data) ? response.data : [];
};

PLANO_CONTAS.filtrarOpcoes = function (items, query) {
	var q = String(query || "").toLowerCase();

	if (!q) {
		return items;
	}

	return items.filter(function (item) {
		return [item.text, item.codigo, item.descricao, item.classificacao].join(" ").toLowerCase().indexOf(q) !== -1;
	});
};

PLANO_CONTAS.clearTomSelect = function (selector) {
	var select = $(selector).get(0);

	if (select && select.tomselect) {
		select.tomselect.clear(true);
		return;
	}

	$(selector).val("");
};

PLANO_CONTAS.getDataTableLanguage = function () {
	return {
		emptyTable: "Nenhuma conta encontrada",
		info: "Mostrando _START_ ate _END_ de _TOTAL_ registros",
		infoEmpty: "Mostrando 0 ate 0 de 0 registros",
		infoFiltered: "(filtrado de _MAX_ registros no total)",
		lengthMenu: "Mostrar _MENU_ registros",
		loadingRecords: "Carregando...",
		processing: "Processando...",
		search: "Buscar:",
		zeroRecords: "Nenhuma conta encontrada",
		paginate: { first: "Primeiro", last: "Ultimo", next: "Proximo", previous: "Anterior" },
		buttons: { colvis: "Colunas" }
	};
};

