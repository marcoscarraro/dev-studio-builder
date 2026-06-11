const CONFIGURACAO_BANCARIA = window.CONFIGURACAO_BANCARIA || {};
window.CONFIGURACAO_BANCARIA = CONFIGURACAO_BANCARIA;

CONFIGURACAO_BANCARIA.table = null;
CONFIGURACAO_BANCARIA.rows = [];
CONFIGURACAO_BANCARIA.currentRow = null;

$(document).ready(function () {
	CONFIGURACAO_BANCARIA.init();
});

CONFIGURACAO_BANCARIA.init = function () {
	CONFIGURACAO_BANCARIA.initializeComponents();
	CONFIGURACAO_BANCARIA.bindEvents();
	CONFIGURACAO_BANCARIA.loadInitialData();
};

CONFIGURACAO_BANCARIA.initializeComponents = function () {
	CONFIGURACAO_BANCARIA.initTomSelects("#formFiltrosConfiguracaoBancaria");
};

CONFIGURACAO_BANCARIA.bindEvents = function () {
	$("#formFiltrosConfiguracaoBancaria").on("submit", CONFIGURACAO_BANCARIA.aplicarFiltros);
	$("#filterSearch").on("keyup", HELPER.debounce(CONFIGURACAO_BANCARIA.aplicarFiltros, 300));
	$("#filterBanco, #filterTipoConta, #filterAmbiente, #filterStatus, #filterContaPadrao, #filterPix, #filterBoleto, #filterCartao").on("change", CONFIGURACAO_BANCARIA.aplicarFiltros);
	$("#btnClearFilters").on("click", CONFIGURACAO_BANCARIA.limparFiltros);
	$("#btnAtualizarStatus, #btnAtualizarIntegracoes").on("click", CONFIGURACAO_BANCARIA.atualizarIntegracoes);
	$("[data-export]").on("click", CONFIGURACAO_BANCARIA.exportarListagem);
	$("#tableConfiguracaoBancaria").on("click", ".btn-visualizar", CONFIGURACAO_BANCARIA.visualizarConfiguracao);
	$("#tableConfiguracaoBancaria").on("click", ".btn-testar", CONFIGURACAO_BANCARIA.testarIntegracao);
	$("#tableConfiguracaoBancaria").on("click", ".btn-tokens", CONFIGURACAO_BANCARIA.atualizarTokens);
	$("#tableConfiguracaoBancaria").on("click", ".btn-status", CONFIGURACAO_BANCARIA.alterarStatus);
	$("#tableConfiguracaoBancaria").on("click", ".btn-logs", CONFIGURACAO_BANCARIA.visualizarLogs);
	$("#tableConfiguracaoBancaria").on("click", ".btn-duplicar", CONFIGURACAO_BANCARIA.duplicarConfiguracao);
	$("#tableConfiguracaoBancaria").on("click", ".btn-excluir", CONFIGURACAO_BANCARIA.excluirConfiguracao);
	$("#btnExecutarTesteModal").on("click", function () {
		if (CONFIGURACAO_BANCARIA.currentRow) {
			CONFIGURACAO_BANCARIA.executarTeste(CONFIGURACAO_BANCARIA.currentRow.id, "#btnExecutarTesteModal");
		}
	});
};

CONFIGURACAO_BANCARIA.loadInitialData = function () {
	CONFIGURACAO_BANCARIA.carregarDataTable();
};

CONFIGURACAO_BANCARIA.carregarDataTable = function () {
	if (!$.fn.DataTable) {
		HELPER.showToast("DataTables nao foi carregado.", "danger");
		return;
	}

	CONFIGURACAO_BANCARIA.table = $("#tableConfiguracaoBancaria").DataTable({
		ajax: function (data, callback) {
			HELPER.ajaxGet("../mock/configuracao-bancaria-list.json", {
				silentError: true,
				success: function (response) {
					var allRows = CONFIGURACAO_BANCARIA.normalizeRows(response);
					var filteredRows = CONFIGURACAO_BANCARIA.filtrarRows(allRows, data.search && data.search.value ? data.search.value : "");
					var orderedRows = CONFIGURACAO_BANCARIA.ordenarRows(filteredRows, data.order || [], data.columns || []);
					var pageRows = orderedRows.slice(data.start, data.start + data.length);

					CONFIGURACAO_BANCARIA.rows = allRows;
					callback({
						draw: data.draw,
						recordsTotal: allRows.length,
						recordsFiltered: filteredRows.length,
						data: pageRows
					});
				},
				error: function () {
					HELPER.showToast("Nao foi possivel carregar as configuracoes bancarias.", "danger");
					callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
				}
			});
		},
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
		order: [[0, "asc"]],
		dom: "<'card-body border-bottom py-3'<'d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center'<'text-secondary'l><'btn-list'B>>>rt<'card-footer d-flex flex-column flex-md-row gap-2 align-items-center justify-content-between'ip>",
		buttons: [
			{ extend: "colvis", text: "Colunas", className: "btn btn-outline-secondary" }
		],
		columns: [
			{ data: null, render: CONFIGURACAO_BANCARIA.renderBanco },
			{ data: null, render: CONFIGURACAO_BANCARIA.renderAgenciaConta },
			{ data: "titular" },
			{ data: null, render: CONFIGURACAO_BANCARIA.renderAmbiente },
			{ data: null, render: CONFIGURACAO_BANCARIA.renderPix },
			{ data: null, render: function (row) { return CONFIGURACAO_BANCARIA.renderFeatureBadge(row.boleto_habilitado, "Boleto"); } },
			{ data: null, render: CONFIGURACAO_BANCARIA.renderCartao },
			{ data: null, render: CONFIGURACAO_BANCARIA.renderCertificado },
			{ data: null, render: CONFIGURACAO_BANCARIA.renderContaPadrao },
			{ data: null, render: CONFIGURACAO_BANCARIA.renderStatusIntegracao },
			{ data: null, render: CONFIGURACAO_BANCARIA.renderStatusConta },
			{ data: null, orderable: false, searchable: false, className: "text-end all", render: CONFIGURACAO_BANCARIA.renderAcoes }
		],
		columnDefs: [
			{ responsivePriority: 1, targets: 0 },
			{ responsivePriority: 2, targets: 11 },
			{ responsivePriority: 3, targets: 9 },
			{ responsivePriority: 4, targets: 10 },
			{ responsivePriority: 5, targets: 7 },
			{ targets: [1, 2], className: "text-secondary" }
		],
		language: CONFIGURACAO_BANCARIA.getDataTableLanguage(),
		drawCallback: function () {
			var api = this.api();

			$("#tableConfiguracaoBancaria .dropdown-toggle").attr("data-bs-boundary", "viewport");
			$("#emptyStateConfiguracaoBancaria").toggleClass("d-none", api.page.info().recordsDisplay > 0);
			CONFIGURACAO_BANCARIA.atualizarResumo(CONFIGURACAO_BANCARIA.filtrarRows(CONFIGURACAO_BANCARIA.rows, CONFIGURACAO_BANCARIA.table ? CONFIGURACAO_BANCARIA.table.search() : ""));
		}
	});
};

CONFIGURACAO_BANCARIA.aplicarFiltros = function (event) {
	if (event) {
		event.preventDefault();
	}

	if (CONFIGURACAO_BANCARIA.table) {
		CONFIGURACAO_BANCARIA.table.search($("#filterSearch").val()).draw();
	}
};

CONFIGURACAO_BANCARIA.testarIntegracao = function (event) {
	event.preventDefault();
	var id = $(this).data("id");
	var row = CONFIGURACAO_BANCARIA.findRow(id);

	if (!row) {
		return;
	}

	CONFIGURACAO_BANCARIA.currentRow = row;
	CONFIGURACAO_BANCARIA.executarTeste(id, this);
};

CONFIGURACAO_BANCARIA.executarTeste = function (id, button) {
	var row = CONFIGURACAO_BANCARIA.findRow(id);

	if (!row) {
		return;
	}

	HELPER.ajaxPost("/financeiro/configuracoes-bancarias/" + id + "/testar", {}, {
		button: button,
		silentError: true,
		success: function () {
			$("#modalTesteIntegracaoBody").html(CONFIGURACAO_BANCARIA.renderTeste(row));
			window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalTesteIntegracao")).show();
			HELPER.showToast("Teste de integracao concluido.", "success");
		},
		error: function () {
			$("#modalTesteIntegracaoBody").html(CONFIGURACAO_BANCARIA.renderTeste(row));
			window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalTesteIntegracao")).show();
			HELPER.showToast("Teste simulado no prototipo.", "success");
		}
	});
};

CONFIGURACAO_BANCARIA.visualizarConfiguracao = function (event) {
	event.preventDefault();
	var row = CONFIGURACAO_BANCARIA.findRow($(this).data("id"));

	if (!row) {
		return;
	}

	CONFIGURACAO_BANCARIA.currentRow = row;
	$("#btnEditarModal").attr("href", "./configuracao-bancaria-form.html?id=" + row.id);
	$("#modalConfiguracaoDetalhesBody").html(CONFIGURACAO_BANCARIA.renderDetalhes(row));
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalConfiguracaoDetalhes")).show();
};

CONFIGURACAO_BANCARIA.atualizarTokens = function (event) {
	event.preventDefault();
	var id = $(this).data("id");

	HELPER.ajaxPost("/financeiro/configuracoes-bancarias/" + id + "/tokens", {}, {
		button: this,
		silentError: true,
		success: function () {
			HELPER.showToast("Tokens atualizados com sucesso.", "success");
			CONFIGURACAO_BANCARIA.recarregarTabela();
		},
		error: function () {
			HELPER.showToast("Atualizacao de tokens enviada no prototipo.", "success");
		}
	});
};

CONFIGURACAO_BANCARIA.alterarStatus = function (event) {
	event.preventDefault();
	var id = $(this).data("id");
	var row = CONFIGURACAO_BANCARIA.findRow(id);

	if (!row) {
		return;
	}

	HELPER.ajaxPut("/financeiro/configuracoes-bancarias/" + id + "/status", { status: row.status_conta !== "Ativo" }, {
		button: this,
		silentError: true,
		success: function () {
			HELPER.showToast("Status da conta atualizado.", "success");
			CONFIGURACAO_BANCARIA.recarregarTabela();
		},
		error: function () {
			HELPER.showToast("Status atualizado no prototipo.", "success");
		}
	});
};

CONFIGURACAO_BANCARIA.visualizarLogs = function (event) {
	event.preventDefault();
	var row = CONFIGURACAO_BANCARIA.findRow($(this).data("id"));

	if (!row) {
		return;
	}

	var html = (row.logs || []).map(function (item) {
		return "<tr><td>" + CONFIGURACAO_BANCARIA.escapeHtml(item.data_hora) + "</td><td>" + CONFIGURACAO_BANCARIA.escapeHtml(item.tipo) + "</td><td>" + CONFIGURACAO_BANCARIA.escapeHtml(item.evento) + "</td><td>" + CONFIGURACAO_BANCARIA.badge(item.status, item.status === "Erro" ? "red" : "green") + "</td><td>" + CONFIGURACAO_BANCARIA.escapeHtml(item.detalhe) + "</td></tr>";
	}).join("");

	if (!html) {
		html = '<tr><td colspan="5" class="text-secondary">Nenhum log encontrado.</td></tr>';
	}

	$("#tableLogsIntegracaoBody").html(html);
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogsIntegracao")).show();
};

CONFIGURACAO_BANCARIA.atualizarIntegracoes = function () {
	HELPER.ajaxPost("/financeiro/configuracoes-bancarias/atualizar-status", {}, {
		button: this && this.id ? "#" + this.id : "#btnAtualizarIntegracoes",
		silentError: true,
		success: function () {
			HELPER.showToast("Status das integracoes atualizado.", "success");
			CONFIGURACAO_BANCARIA.recarregarTabela();
		},
		error: function () {
			HELPER.showToast("Atualizacao de integracoes simulada no prototipo.", "success");
			CONFIGURACAO_BANCARIA.recarregarTabela();
		}
	});
};

CONFIGURACAO_BANCARIA.duplicarConfiguracao = function (event) {
	event.preventDefault();
	var id = $(this).data("id");

	HELPER.ajaxPost("/financeiro/configuracoes-bancarias/" + id + "/duplicar", {}, {
		button: this,
		silentError: true,
		success: function () {
			HELPER.showToast("Configuracao duplicada.", "success");
			CONFIGURACAO_BANCARIA.recarregarTabela();
		},
		error: function () {
			HELPER.showToast("Duplicacao enviada no prototipo.", "success");
		}
	});
};

CONFIGURACAO_BANCARIA.excluirConfiguracao = function (event) {
	event.preventDefault();
	var row = CONFIGURACAO_BANCARIA.findRow($(this).data("id"));

	if (!row) {
		return;
	}

	if (row.movimentacoes_count > 0 || row.vinculada_financeiro || row.conta_padrao) {
		HELPER.showToast("Esta conta nao pode ser excluida por possuir movimentacoes, vinculo financeiro ou conta padrao.", "warning");
		return;
	}

	HELPER.ajaxDelete("/financeiro/configuracoes-bancarias/" + row.id, {}, {
		button: this,
		silentError: true,
		success: function () {
			HELPER.showToast("Configuracao excluida.", "success");
			CONFIGURACAO_BANCARIA.recarregarTabela();
		},
		error: function () {
			HELPER.showToast("Exclusao enviada no prototipo.", "success");
		}
	});
};

CONFIGURACAO_BANCARIA.limparFiltros = function () {
	$("#formFiltrosConfiguracaoBancaria").get(0).reset();
	CONFIGURACAO_BANCARIA.clearTomSelect("#filterBanco");

	if (CONFIGURACAO_BANCARIA.table) {
		CONFIGURACAO_BANCARIA.table.search("").draw();
	}

	HELPER.showToast("Filtros removidos.", "success");
};

CONFIGURACAO_BANCARIA.recarregarTabela = function () {
	if (!CONFIGURACAO_BANCARIA.table) {
		return;
	}

	CONFIGURACAO_BANCARIA.table.ajax.reload(null, false);
};

CONFIGURACAO_BANCARIA.exportarListagem = function () {
	var tipo = $(this).data("export");

	HELPER.showToast("Exportacao " + String(tipo || "").toUpperCase() + " preparada com os filtros aplicados.", "success");
};

CONFIGURACAO_BANCARIA.filtrarRows = function (rows, search) {
	var filters = {
		banco: $("#filterBanco").val(),
		tipoConta: $("#filterTipoConta").val(),
		ambiente: $("#filterAmbiente").val(),
		status: $("#filterStatus").val(),
		contaPadrao: $("#filterContaPadrao").val(),
		pix: $("#filterPix").val(),
		boleto: $("#filterBoleto").val(),
		cartao: $("#filterCartao").val()
	};
	var q = String(search || "").toLowerCase();

	return rows.filter(function (row) {
		var searchable = [row.banco, row.codigo_banco, row.agencia, row.conta, row.titular, row.chave_pix_mask, row.integrador_pix, row.integrador_cartao, row.tipo_integracao_cartao].join(" ").toLowerCase();

		if (q && searchable.indexOf(q) === -1) return false;
		if (filters.banco && row.banco !== filters.banco) return false;
		if (filters.tipoConta && row.tipo_conta !== filters.tipoConta) return false;
		if (filters.ambiente && row.ambiente_api !== filters.ambiente) return false;
		if (filters.status && row.status_conta !== filters.status && row.status_integracao !== filters.status && row.certificado_status !== filters.status) return false;
		if (filters.contaPadrao && CONFIGURACAO_BANCARIA.boolFilter(row.conta_padrao) !== filters.contaPadrao) return false;
		if (filters.pix && CONFIGURACAO_BANCARIA.boolFilter(row.pix_habilitado) !== filters.pix) return false;
		if (filters.boleto && CONFIGURACAO_BANCARIA.boolFilter(row.boleto_habilitado) !== filters.boleto) return false;
		if (filters.cartao && CONFIGURACAO_BANCARIA.boolFilter(row.cartao_habilitado) !== filters.cartao) return false;

		return true;
	});
};

CONFIGURACAO_BANCARIA.ordenarRows = function (rows, order, columns) {
	var firstOrder = order && order.length ? order[0] : null;

	if (!firstOrder) {
		return rows;
	}

	var fieldByColumn = ["banco", "conta", "titular", "ambiente_api", "pix_habilitado", "boleto_habilitado", "cartao_habilitado", "certificado_validade", "conta_padrao", "status_integracao", "status_conta"];
	var field = fieldByColumn[firstOrder.column] || "banco";
	var direction = firstOrder.dir === "desc" ? -1 : 1;

	return rows.slice().sort(function (a, b) {
		return String(a[field] || "").localeCompare(String(b[field] || "")) * direction;
	});
};

CONFIGURACAO_BANCARIA.renderBanco = function (row) {
	var initials = row.banco.split(" ").map(function (part) { return part.charAt(0); }).join("").substring(0, 2).toUpperCase();

	return '<div class="d-flex align-items-center"><span class="avatar avatar-sm bg-blue-lt text-blue me-2">' + initials + '</span><div><div class="fw-medium">' + CONFIGURACAO_BANCARIA.escapeHtml(row.banco) + '</div><div class="text-secondary small">Codigo ' + CONFIGURACAO_BANCARIA.escapeHtml(row.codigo_banco) + "</div></div></div>";
};

CONFIGURACAO_BANCARIA.renderAgenciaConta = function (row) {
	return '<div class="fw-medium">' + CONFIGURACAO_BANCARIA.escapeHtml(row.agencia) + " / " + CONFIGURACAO_BANCARIA.escapeHtml(row.conta) + '</div><div class="text-secondary small">' + CONFIGURACAO_BANCARIA.escapeHtml(row.tipo_conta) + "</div>";
};

CONFIGURACAO_BANCARIA.renderAmbiente = function (row) {
	return row.ambiente_api === "Producao" ? CONFIGURACAO_BANCARIA.badge("Producao", "red") : CONFIGURACAO_BANCARIA.badge("Homologacao", "blue");
};

CONFIGURACAO_BANCARIA.renderFeatureBadge = function (enabled, label) {
	return enabled ? CONFIGURACAO_BANCARIA.badge(label, "green") : CONFIGURACAO_BANCARIA.badge("Inativo", "secondary");
};

CONFIGURACAO_BANCARIA.renderPix = function (row) {
	if (!row.pix_habilitado) {
		return CONFIGURACAO_BANCARIA.badge("Inativo", "secondary");
	}

	return '<div>' + CONFIGURACAO_BANCARIA.badge("PIX", "green") + '<div class="text-secondary small">' + CONFIGURACAO_BANCARIA.escapeHtml(row.integrador_pix || "Proprio banco") + "</div></div>";
};

CONFIGURACAO_BANCARIA.renderCartao = function (row) {
	if (!row.cartao_habilitado) {
		return CONFIGURACAO_BANCARIA.badge("Inativo", "secondary");
	}

	return '<div>' + CONFIGURACAO_BANCARIA.badge(row.tipo_integracao_cartao || "Cartao", "green") + '<div class="text-secondary small">' + CONFIGURACAO_BANCARIA.escapeHtml(row.integrador_cartao || "-") + "</div></div>";
};

CONFIGURACAO_BANCARIA.renderCertificado = function (row) {
	var days = CONFIGURACAO_BANCARIA.daysTo(row.certificado_validade);
	var color = "green";
	var label = "Valido";

	if (days < 0 || row.certificado_status === "Certificado Expirado") {
		color = "red";
		label = "Expirado";
	} else if (days <= 7) {
		color = "red";
		label = "Vence em " + days + " dias";
	} else if (days <= 30) {
		color = "yellow";
		label = "Vence em " + days + " dias";
	}

	return '<div>' + CONFIGURACAO_BANCARIA.badge(label, color) + '<div class="text-secondary small">' + CONFIGURACAO_BANCARIA.escapeHtml(row.certificado_validade_br) + "</div></div>";
};

CONFIGURACAO_BANCARIA.renderContaPadrao = function (row) {
	return row.conta_padrao ? CONFIGURACAO_BANCARIA.badge("Conta Padrao", "purple") : '<span class="text-secondary">-</span>';
};

CONFIGURACAO_BANCARIA.renderStatusIntegracao = function (row) {
	if (row.status_integracao === "Integracao OK") return CONFIGURACAO_BANCARIA.badge("Integracao OK", "green");
	if (row.status_integracao === "Erro Integracao") return CONFIGURACAO_BANCARIA.badge("Integracao Erro", "red");
	return CONFIGURACAO_BANCARIA.badge(row.status_integracao, "yellow");
};

CONFIGURACAO_BANCARIA.renderStatusConta = function (row) {
	if (row.status_conta === "Ativo") return CONFIGURACAO_BANCARIA.badge("Ativo", "green");
	if (row.status_conta === "Inativo") return CONFIGURACAO_BANCARIA.badge("Inativo", "secondary");
	return CONFIGURACAO_BANCARIA.badge(row.status_conta, "red");
};

CONFIGURACAO_BANCARIA.renderAcoes = function (row) {
	var statusLabel = row.status_conta === "Ativo" ? "Inativar" : "Ativar";

	return '' +
		'<div class="dropdown">' +
			'<button class="btn dropdown-toggle align-text-top" data-bs-toggle="dropdown">Acoes</button>' +
			'<div class="dropdown-menu dropdown-menu-end">' +
				'<a class="dropdown-item" href="./configuracao-bancaria-form.html?id=' + row.id + '">Editar</a>' +
				'<a class="dropdown-item btn-visualizar" href="#" data-id="' + row.id + '">Visualizar</a>' +
				'<a class="dropdown-item btn-testar" href="#" data-id="' + row.id + '">Testar Integracao</a>' +
				'<a class="dropdown-item btn-tokens" href="#" data-id="' + row.id + '">Atualizar Tokens</a>' +
				'<a class="dropdown-item btn-logs" href="#" data-id="' + row.id + '">Ver Logs</a>' +
				'<a class="dropdown-item btn-status" href="#" data-id="' + row.id + '">' + statusLabel + '</a>' +
				'<a class="dropdown-item btn-duplicar" href="#" data-id="' + row.id + '">Duplicar</a>' +
				'<div class="dropdown-divider"></div>' +
				'<a class="dropdown-item text-danger btn-excluir" href="#" data-id="' + row.id + '">Excluir</a>' +
			'</div>' +
		'</div>';
};

CONFIGURACAO_BANCARIA.renderDetalhes = function (row) {
	return '' +
		'<div class="row g-3">' +
			'<div class="col-12 col-lg-6"><div class="card"><div class="card-header"><h3 class="card-title">Dados bancarios</h3></div><div class="card-body"><dl class="row mb-0"><dt class="col-5">Banco</dt><dd class="col-7">' + CONFIGURACAO_BANCARIA.escapeHtml(row.banco) + '</dd><dt class="col-5">Agencia/Conta</dt><dd class="col-7">' + CONFIGURACAO_BANCARIA.escapeHtml(row.agencia + " / " + row.conta) + '</dd><dt class="col-5">Titular</dt><dd class="col-7">' + CONFIGURACAO_BANCARIA.escapeHtml(row.titular) + '</dd><dt class="col-5">CPF/CNPJ</dt><dd class="col-7">' + CONFIGURACAO_BANCARIA.escapeHtml(row.cpf_cnpj_titular_mask) + '</dd></dl></div></div></div>' +
			'<div class="col-12 col-lg-6"><div class="card"><div class="card-header"><h3 class="card-title">Parametros integracao</h3></div><div class="card-body"><div class="mb-2">' + CONFIGURACAO_BANCARIA.renderAmbiente(row) + " " + CONFIGURACAO_BANCARIA.renderStatusIntegracao(row) + '</div><dl class="row mb-0"><dt class="col-5">Client ID</dt><dd class="col-7">' + CONFIGURACAO_BANCARIA.escapeHtml(row.client_id_mask) + '</dd><dt class="col-5">Token</dt><dd class="col-7">' + CONFIGURACAO_BANCARIA.escapeHtml(row.token_mask) + '</dd><dt class="col-5">Callback</dt><dd class="col-7 text-break">' + CONFIGURACAO_BANCARIA.escapeHtml(row.url_callback) + '</dd></dl></div></div></div>' +
			'<div class="col-12 col-lg-6"><div class="card"><div class="card-header"><h3 class="card-title">PIX, boleto e cartao</h3></div><div class="card-body"><div class="mb-2">' + CONFIGURACAO_BANCARIA.renderPix(row) + " " + CONFIGURACAO_BANCARIA.renderFeatureBadge(row.boleto_habilitado, "Boleto") + " " + CONFIGURACAO_BANCARIA.renderCartao(row) + '</div><dl class="row mb-0"><dt class="col-5">Integrador PIX</dt><dd class="col-7">' + CONFIGURACAO_BANCARIA.escapeHtml(row.integrador_pix || "-") + '</dd><dt class="col-5">Chave PIX</dt><dd class="col-7">' + CONFIGURACAO_BANCARIA.escapeHtml(row.chave_pix_mask || "-") + '</dd><dt class="col-5">Integrador Cartao</dt><dd class="col-7">' + CONFIGURACAO_BANCARIA.escapeHtml(row.integrador_cartao || "-") + '</dd><dt class="col-5">Tipo Cartao</dt><dd class="col-7">' + CONFIGURACAO_BANCARIA.escapeHtml(row.tipo_integracao_cartao || "-") + '</dd><dt class="col-5">Carteira</dt><dd class="col-7">' + CONFIGURACAO_BANCARIA.escapeHtml(row.carteira || "-") + '</dd></dl></div></div></div>' +
			'<div class="col-12 col-lg-6"><div class="card"><div class="card-header"><h3 class="card-title">Certificado e webhooks</h3></div><div class="card-body"><div class="mb-2">' + CONFIGURACAO_BANCARIA.renderCertificado(row) + '</div><dl class="row mb-0"><dt class="col-5">CNPJ certificado</dt><dd class="col-7">' + CONFIGURACAO_BANCARIA.escapeHtml(row.certificado_cnpj_mask) + '</dd><dt class="col-5">Webhook</dt><dd class="col-7 text-break">' + CONFIGURACAO_BANCARIA.escapeHtml(row.url_webhook) + '</dd></dl></div></div></div>' +
		"</div>";
};

CONFIGURACAO_BANCARIA.renderTeste = function (row) {
	var ok = row.status_integracao === "Integracao OK";
	var certOk = CONFIGURACAO_BANCARIA.daysTo(row.certificado_validade) >= 0;

	return '' +
		'<div class="row g-3">' +
			CONFIGURACAO_BANCARIA.renderTesteItem("Conexao API", ok ? "Online" : "Falha", ok ? "green" : "red") +
			CONFIGURACAO_BANCARIA.renderTesteItem("Autenticacao", ok ? "Autenticada" : "Token invalido", ok ? "green" : "red") +
			CONFIGURACAO_BANCARIA.renderTesteItem("Validade token", row.token_validade, row.token_validade === "Valido" ? "green" : "yellow") +
			CONFIGURACAO_BANCARIA.renderTesteItem("Certificado", certOk ? "Valido" : "Expirado", certOk ? "green" : "red") +
			CONFIGURACAO_BANCARIA.renderTesteItem("Webhook", row.webhook_status, row.webhook_status === "Ativo" ? "green" : "red") +
			CONFIGURACAO_BANCARIA.renderTesteItem("Latencia API", row.latencia_api + " ms", row.latencia_api <= 900 ? "green" : "yellow") +
			'<div class="col-12"><div class="alert alert-info mb-0">Ambiente testado: ' + CONFIGURACAO_BANCARIA.escapeHtml(row.ambiente_api) + " - " + CONFIGURACAO_BANCARIA.escapeHtml(row.banco) + "</div></div>" +
		"</div>";
};

CONFIGURACAO_BANCARIA.renderTesteItem = function (title, value, color) {
	return '<div class="col-12 col-md-4"><div class="card card-sm"><div class="card-body"><div class="subheader">' + CONFIGURACAO_BANCARIA.escapeHtml(title) + '</div><div class="mt-2">' + CONFIGURACAO_BANCARIA.badge(value, color) + "</div></div></div></div>";
};

CONFIGURACAO_BANCARIA.atualizarResumo = function (rows) {
	var ok = rows.filter(function (row) { return row.status_integracao === "Integracao OK"; }).length;
	var alertas = rows.filter(function (row) { return row.status_integracao !== "Integracao OK" || CONFIGURACAO_BANCARIA.daysTo(row.certificado_validade) <= 30; }).length;

	$("#resumoTotal").text(rows.length + " contas");
	$("#resumoIntegracaoOk").text(ok + " integracoes OK");
	$("#resumoAlertas").text(alertas + " alertas");
};

CONFIGURACAO_BANCARIA.initTomSelects = function (context) {
	if (!window.TomSelect) {
		return;
	}

	$(context).find("select[data-tomselect]").each(function () {
		if (this.tomselect) {
			return;
		}

		new window.TomSelect(this, {
			plugins: ["dropdown_input", "clear_button"],
			copyClassesToDropdown: false,
			controlInput: "<input>",
			dropdownParent: "body",
			create: false,
			placeholder: $(this).data("placeholder") || ""
		});
	});
};

CONFIGURACAO_BANCARIA.findRow = function (id) {
	return CONFIGURACAO_BANCARIA.rows.find(function (row) {
		return String(row.id) === String(id);
	});
};

CONFIGURACAO_BANCARIA.normalizeRows = function (response) {
	return response && Array.isArray(response.data) ? response.data : [];
};

CONFIGURACAO_BANCARIA.boolFilter = function (value) {
	return value ? "sim" : "nao";
};

CONFIGURACAO_BANCARIA.daysTo = function (isoDate) {
	var today = new Date("2026-05-12T00:00:00");
	var date = new Date(String(isoDate || "") + "T00:00:00");

	if (isNaN(date.getTime())) {
		return -1;
	}

	return Math.ceil((date.getTime() - today.getTime()) / 86400000);
};

CONFIGURACAO_BANCARIA.badge = function (label, color) {
	return '<span class="badge bg-' + color + '-lt">' + CONFIGURACAO_BANCARIA.escapeHtml(label) + "</span>";
};

CONFIGURACAO_BANCARIA.clearTomSelect = function (selector) {
	var select = $(selector).get(0);

	if (select && select.tomselect) {
		select.tomselect.clear(true);
		return;
	}

	$(selector).val("");
};

CONFIGURACAO_BANCARIA.escapeHtml = function (value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};

CONFIGURACAO_BANCARIA.getDataTableLanguage = function () {
	return {
		emptyTable: "Nenhuma configuracao bancaria encontrada",
		info: "Mostrando _START_ ate _END_ de _TOTAL_ registros",
		infoEmpty: "Mostrando 0 ate 0 de 0 registros",
		infoFiltered: "(filtrado de _MAX_ registros no total)",
		lengthMenu: "Mostrar _MENU_ registros",
		loadingRecords: "Carregando...",
		processing: "Processando...",
		search: "Buscar:",
		zeroRecords: "Nenhuma configuracao bancaria encontrada",
		paginate: { first: "Primeiro", last: "Ultimo", next: "Proximo", previous: "Anterior" },
		buttons: { colvis: "Colunas" }
	};
};

