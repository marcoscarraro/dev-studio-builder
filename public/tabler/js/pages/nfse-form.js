const NFSE = window.NFSE || {};
window.NFSE = NFSE;

NFSE.masks = {};
NFSE.data = {
	pessoas: [],
	servicosCatalogo: [],
	municipios: [],
	emitente: null,
	tomador: null,
	servicos: [],
	status: "Digitacao"
};

$(document).ready(function () {
	NFSE.init();
});

NFSE.init = function () {
	NFSE.initializeComponents();
	NFSE.bindEvents();
	NFSE.loadInitialData();
};

NFSE.initializeComponents = function () {
	var now = new Date();
	var month = String(now.getMonth() + 1).padStart(2, "0");

	$("#dataEmissao").val(now.toISOString().substring(0, 10));
	$("#competencia").val(month + "/" + now.getFullYear());
	NFSE.initTomSelects("#formNfse");
	NFSE.initMasks();
	NFSE.recalcularResumoFiscal();
	NFSE.recalcularTotais();
	NFSE.atualizarContadores();
	NFSE.atualizarStatus("Digitacao");
};

NFSE.bindEvents = function () {
	$("#numeroRps").on("input", function () { $("#headerNumeroRps").text($(this).val() || "-"); });
	$("#serieRps").on("input", function () { $("#headerSerieRps").text($(this).val() || "-"); });
	$("#origem").on("change", function () { NFSE.toggleOrigem(); });
	$("#origemId").on("change", function () { NFSE.carregarOrigem($("#origem").val(), $(this).val()); });
	$("#pessoa_id").on("change", NFSE.buscarTomador);
	$("#municipioIncidencia").on("change", NFSE.recalcularServicosExistentes);
	$("#servicoAdicionar").on("change", NFSE.preencherValorServicoSelecionado);
	$("#btnAdicionarServico").on("click", NFSE.resolverServicoSelecionado);
	$("#nfseServicos").on("input change", ".item-quantidade, .item-unitario, .item-desconto", NFSE.atualizarLinhaOperacional);
	$("#nfseServicos").on("input change", ".fiscal-field, .fiscal-switch, .item-discriminacao", NFSE.marcarAjusteManual);
	$("#nfseServicos").on("click", ".btn-remover-servico", function () { NFSE.removerServico(Number($(this).data("index"))); });
	$("#nfseServicos").on("click", ".btn-toggle-fiscal", function () { NFSE.togglePainelFiscal(Number($(this).data("index"))); });
	$("#nfseServicos").on("click", ".btn-recalcular-servico", function () { NFSE.recalcularServico(Number($(this).data("index"))); });
	$("#btnGerarDiscriminacao").on("click", NFSE.gerarDiscriminacaoGeral);
	$("#btnEditarTomador").on("click", NFSE.habilitarEdicaoTomadorNota);
	$("#btnSalvar, #btnSalvarTopo").on("click", NFSE.salvarRascunho);
	$("#btnEmitir, #btnEmitirTopo").on("click", NFSE.emitir);
	$("#btnCancelarNfse").on("click", NFSE.abrirCancelamento);
	$("#btnConfirmarCancelamento").on("click", NFSE.cancelar);
	$("#btnVisualizarDanfse").on("click", function () { HELPER.showToast("Visualizacao do DANFS-e preparada.", "success"); });
	$("#btnBaixarXml").on("click", function () { HELPER.showToast("XML disponivel apos autorizacao da prefeitura.", "warning"); });
	$("#btnSimularPessoaSalva").on("click", NFSE.simularPessoaSalva);
	$(".nfse-textarea").on("input", NFSE.atualizarContadores);
};

NFSE.loadInitialData = function () {
	HELPER.ajaxGet("../mock/nfse-pessoas.json", {
		success: function (response) {
			NFSE.data.pessoas = NFSE.normalizeRows(response);
			NFSE.refreshSelect("#pessoa_id", NFSE.data.pessoas);
		}
	});

	HELPER.ajaxGet("../mock/nfse-servicos.json", {
		success: function (response) {
			NFSE.data.servicosCatalogo = NFSE.normalizeRows(response);
			NFSE.refreshSelect("#servicoAdicionar", NFSE.data.servicosCatalogo);
		}
	});

	HELPER.ajaxGet("../mock/nfse-municipios.json", {
		success: function (response) {
			NFSE.data.municipios = NFSE.normalizeRows(response);
			NFSE.refreshSelect("#municipioIncidencia", NFSE.data.municipios);
			NFSE.aplicarEmitente();
		}
	});

	HELPER.ajaxGet("../mock/empresa-config.json", {
		success: function (response) {
			NFSE.data.emitente = response.data || response;
			NFSE.renderPrestador();
			NFSE.aplicarEmitente();
		}
	});
};

NFSE.aplicarEmitente = function () {
	var emitente = NFSE.data.emitente || {};
	var municipio = emitente.cidade || "Sao Paulo/SP";

	$("#numeroRps").val(emitente.proximo_numero_rps || "000042").trigger("input");
	$("#serieRps").val(emitente.serie_rps || "A").trigger("input");
	$("#headerMunicipioEmissao").text(municipio);
	NFSE.setTomValue("#municipioIncidencia", municipio);
	$("#optanteSimples").prop("checked", NFSE.isRegimeSimplificado());
};

NFSE.getRegimeTributario = function () {
	var regime = (NFSE.data.emitente.regime_tributario || "").toString().toLowerCase();
	regime = regime.replace(/[\s-]+/g, "_");

	if (regime === "mei" || regime === "microempreendedor_individual") {
		return "mei";
	}

	if (regime === "simples" || regime === "simples_nacional") {
		return "simples_nacional";
	}

	return "lucro_presumido";
};

NFSE.getRegimeLabel = function () {
	var labels = {
		mei: "MEI",
		simples_nacional: "Simples Nacional",
		lucro_presumido: "Lucro Presumido"
	};

	return labels[NFSE.getRegimeTributario()] || labels.lucro_presumido;
};

NFSE.isRegimeSimplificado = function () {
	var regime = NFSE.getRegimeTributario();
	return regime === "mei" || regime === "simples_nacional";
};

NFSE.toggleOrigem = function () {
	var origem = $("#origem").val();
	var automatico = origem !== "Manual";

	$("#grupoOrigemBusca").toggleClass("d-none", !automatico);
	$("#labelOrigemBusca").text(origem === "Pedido de Venda" ? "Pedido de Venda" : "Ordem de Servico");
};

NFSE.carregarOrigem = function (origem, id) {
	if (!id) {
		return;
	}

	HELPER.showToast(origem + " " + id + " carregada para a NFS-e.", "success");
	if (!$("#discriminacaoGeral").val()) {
		$("#discriminacaoGeral").val("Servicos carregados da origem " + id + ".");
		NFSE.atualizarContadores();
	}
};

NFSE.buscarTomador = function () {
	var pessoa = NFSE.findById(NFSE.data.pessoas, $("#pessoa_id").val());

	NFSE.data.tomador = pessoa || null;
	NFSE.renderTomadorResumo(pessoa);
	NFSE.recalcularServicosExistentes();
};

NFSE.preencherValorServicoSelecionado = function () {
	var servico = NFSE.findById(NFSE.data.servicosCatalogo, $("#servicoAdicionar").val());
	if (servico) {
		$("#servicoValorUnitario").val(NFSE.formatNumber(servico.valor_padrao || 0));
	}
};

NFSE.resolverServicoSelecionado = function () {
	var servicoId = $("#servicoAdicionar").val();
	var contexto = {
		quantidade: NFSE.parseNumber($("#servicoQtd").val()),
		valor_unitario: NFSE.parseNumber($("#servicoValorUnitario").val()),
		desconto: 0
	};

	if (!servicoId) {
		HELPER.showToast("Selecione um servico para adicionar.", "warning");
		return;
	}

	NFSE.resolverServicoFiscal(servicoId, contexto);
};

NFSE.resolverServicoFiscal = function (servico_id, contexto) {
	var payload = {
		servico_id: servico_id,
		tomador_id: $("#pessoa_id").val() || null,
		municipio_incidencia_id: $("#municipioIncidencia").val(),
		quantidade: contexto.quantidade,
		valor_unitario: contexto.valor_unitario,
		desconto: contexto.desconto || 0
	};

	HELPER.ajaxPost("/api/nfse/resolver-servico", payload, {
		button: "#btnAdicionarServico",
		silentError: true,
		success: function (response) {
			NFSE.adicionarServico(response.data || response);
		},
		error: function () {
			NFSE.adicionarServico(NFSE.mockResolverServico(payload));
		}
	});
};

NFSE.adicionarServico = function (dadosServico) {
	var dados = NFSE.normalizeServicoResolvido(dadosServico);
	dados.original = $.extend(true, {}, dados);
	dados.ajustado_manualmente = false;
	dados.expanded = false;
	NFSE.data.servicos.push(dados);
	NFSE.renderServicos();
	NFSE.recalcularResumoFiscal();
	NFSE.recalcularTotais();
	NFSE.gerarDiscriminacaoGeral(true);
	HELPER.showToast(dados.descricao + " adicionada - ISS " + NFSE.formatPercent(dados.aliquota_iss) + (dados.retencao_iss ? ", com retencao" : ", sem retencao"), "success");
};

NFSE.removerServico = function (index) {
	NFSE.data.servicos.splice(index, 1);
	NFSE.renderServicos();
	NFSE.recalcularResumoFiscal();
	NFSE.recalcularTotais();
	NFSE.gerarDiscriminacaoGeral(true);
	HELPER.showToast("Servico removido.", "success");
};

NFSE.togglePainelFiscal = function (index) {
	var item = NFSE.data.servicos[index];
	if (!item) return;
	item.expanded = !item.expanded;
	NFSE.renderServicos();
};

NFSE.atualizarPainelFiscal = function (index, dadosFiscais) {
	if (!NFSE.data.servicos[index]) return;
	NFSE.data.servicos[index] = $.extend(NFSE.data.servicos[index], dadosFiscais);
	NFSE.renderServicos();
	NFSE.recalcularResumoFiscal();
	NFSE.recalcularTotais();
};

NFSE.atualizarLinhaOperacional = function () {
	var index = Number($(this).closest("tr").data("index"));
	var item = NFSE.data.servicos[index];
	var $row = $(this).closest("tr");
	if (!item) return;

	item.quantidade = NFSE.parseNumber($row.find(".item-quantidade").val());
	item.valor_unitario = NFSE.parseNumber($row.find(".item-unitario").val());
	item.desconto = NFSE.parseNumber($row.find(".item-desconto").val());
	item.valor_total = Math.max((item.quantidade * item.valor_unitario) - item.desconto, 0);
	item.ajustado_manualmente = true;
	NFSE.renderServicos();
	NFSE.recalcularResumoFiscal();
	NFSE.recalcularTotais();
};

NFSE.marcarAjusteManual = function () {
	var index = Number($(this).closest("tr").prevAll("tr[data-index]").first().data("index"));
	if ($(this).closest("tr").is("[data-index]")) {
		index = Number($(this).closest("tr").data("index"));
	}
	var item = NFSE.data.servicos[index];
	if (!item) return;

	NFSE.readFiscalPanel(index);
	item.ajustado_manualmente = true;
	NFSE.renderServicos();
	NFSE.recalcularResumoFiscal();
	NFSE.recalcularTotais();
};

NFSE.recalcularServico = function (index) {
	var item = NFSE.data.servicos[index];
	if (!item) return;
	NFSE.data.servicos[index] = $.extend(true, {}, item.original, { original: item.original, expanded: true, ajustado_manualmente: false });
	NFSE.renderServicos();
	NFSE.recalcularResumoFiscal();
	NFSE.recalcularTotais();
	HELPER.showToast("Valores fiscais restaurados pela tributacao original.", "success");
};

NFSE.recalcularServicosExistentes = function () {
	if (!NFSE.data.servicos.length) return;
	NFSE.data.servicos.forEach(function (item, index) {
		if (!item.ajustado_manualmente) {
			NFSE.data.servicos[index] = $.extend(true, {}, item, NFSE.mockResolverServico({
				servico_id: item.servico_id,
				quantidade: item.quantidade,
				valor_unitario: item.valor_unitario,
				desconto: item.desconto
			}));
		}
	});
	NFSE.renderServicos();
	NFSE.recalcularResumoFiscal();
	NFSE.recalcularTotais();
};

NFSE.readFiscalPanel = function (index) {
	var item = NFSE.data.servicos[index];
	var $panel = $('[data-fiscal-index="' + index + '"]');
	if (!item || !$panel.length) return;

	item.base_iss = NFSE.parseNumber($panel.find(".base-iss").val());
	item.aliquota_iss = NFSE.parseNumber($panel.find(".aliquota-iss").val());
	item.valor_iss = NFSE.parseNumber($panel.find(".valor-iss").val());
	item.retencao_iss = $panel.find(".retencao-iss").is(":checked");
	item.valor_iss_retido = item.retencao_iss ? item.valor_iss : 0;
	["pis", "cofins", "csll", "irrf", "inss"].forEach(function (key) {
		item["percentual_" + key] = NFSE.parseNumber($panel.find(".percentual-" + key).val());
		item["valor_" + key] = NFSE.parseNumber($panel.find(".valor-" + key).val());
		item["retem_" + key] = $panel.find(".retem-" + key).is(":checked");
	});
	item.discriminacao = $panel.find(".item-discriminacao").val();
};

NFSE.recalcularTotais = function () {
	var bruto = NFSE.sum("valor_total");
	var desconto = NFSE.sum("desconto");
	var baseIss = NFSE.sum("base_iss");
	var iss = NFSE.sum("valor_iss_retido");
	var retencoes = iss + NFSE.sumRetidosFederais();
	var liquido = Math.max(bruto - retencoes, 0);

	$("#totaisOperacionais").html(
		'<div class="row g-3">' +
			NFSE.totalItem("Valor bruto servicos", NFSE.formatCurrency(bruto), "col-md-4") +
			NFSE.totalItem("Desconto", "-" + NFSE.formatCurrency(desconto), "col-md-4") +
			NFSE.totalItem("Base ISS", NFSE.formatCurrency(baseIss), "col-md-4") +
			NFSE.totalItem("Valor ISS retido", "-" + NFSE.formatCurrency(iss), "col-md-4") +
			NFSE.totalItem("Total retencoes", "-" + NFSE.formatCurrency(retencoes), "col-md-4") +
			'<div class="col-12"><div class="card bg-primary-lt"><div class="card-body"><div class="subheader">Valor liquido NFS-e</div><div class="display-6 fw-bold">' + NFSE.formatCurrency(liquido) + '</div></div></div></div>' +
		'</div>'
	);
};

NFSE.recalcularResumoFiscal = function () {
	var rows = [
		NFSE.resumoTributo("ISS", "base_iss", "aliquota_iss", "valor_iss"),
		NFSE.resumoRetido(NFSE.getRetencaoLabel("PIS retido", "pis"), "pis"),
		NFSE.resumoRetido(NFSE.getRetencaoLabel("COFINS retido", "cofins"), "cofins"),
		NFSE.resumoRetido("CSLL retido", "csll"),
		NFSE.resumoRetido("IRRF retido", "irrf"),
		NFSE.resumoRetido("INSS retido", "inss")
	];
	$("#resumoFiscal").html(rows.join("") || '<tr><td colspan="4" class="text-secondary">Nenhum servico informado.</td></tr>');
};

NFSE.gerarDiscriminacaoGeral = function (silent) {
	var text = NFSE.data.servicos.map(function (item) { return item.discriminacao; }).filter(Boolean).join("\n\n");
	$("#discriminacaoGeral").val(text);
	NFSE.atualizarContadores();
	if (!silent) {
		HELPER.showToast("Discriminacao geral gerada a partir dos servicos.", "success");
	}
};

NFSE.salvarRascunho = function () {
	if (!NFSE.validarFormularioBasico()) return;
	HELPER.ajaxPost("/api/nfse", NFSE.montarPayload(), {
		button: "#btnSalvar",
		silentError: true,
		complete: function () { HELPER.showToast("Rascunho da NFS-e salvo.", "success"); }
	});
};

NFSE.emitir = function () {
	if (!NFSE.validarFormulario()) return;
	HELPER.ajaxPost("/api/nfse/emitir", NFSE.montarPayload(), {
		button: "#btnEmitir",
		silentError: true,
		success: function (response) {
			if (response && response.status) {
				NFSE.atualizarStatus("Autorizada");
				NFSE.exibirNumeroNfse(response.data && response.data.numero_nfse);
			}
		},
		error: function () {
			NFSE.atualizarStatus("Autorizada");
			NFSE.exibirNumeroNfse("2026000123");
			HELPER.showToast("NFS-e autorizada no fluxo simulado.", "success");
		}
	});
};

NFSE.cancelar = function () {
	var motivo = $("#motivoCancelamento").val();
	if (String(motivo || "").trim().length < 15) {
		$("#motivoCancelamento").addClass("is-invalid");
		return;
	}

	$("#motivoCancelamento").removeClass("is-invalid");
	HELPER.ajaxPost("/api/nfse/cancelar", { motivo: motivo }, {
		button: "#btnConfirmarCancelamento",
		silentError: true,
		complete: function () {
			NFSE.atualizarStatus("Cancelada");
			window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalCancelarNfse")).hide();
			HELPER.showToast("Cancelamento enviado ao backend.", "warning");
		}
	});
};

NFSE.abrirCancelamento = function () {
	$("#motivoCancelamento").val("").removeClass("is-invalid");
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalCancelarNfse")).show();
};

NFSE.validarFormulario = function () {
	var errors = [];

	if (!NFSE.validarFormularioBasico(true)) errors.push("Revise os campos obrigatorios do cabecalho e tomador.");
	if (!$("#pessoa_id").val()) errors.push("Tomador obrigatorio.");
	if (!NFSE.data.servicos.length) errors.push("Informe ao menos um servico.");
	if (!$("#municipioIncidencia").val()) errors.push("Municipio de incidencia ISS obrigatorio.");
	if (!/^\d{2}\/\d{4}$/.test($("#competencia").val())) errors.push("Competencia deve estar no formato MM/AAAA.");
	if (!String($("#discriminacaoGeral").val() || "").trim()) errors.push("Discriminacao geral obrigatoria.");

	NFSE.data.servicos.forEach(function (item, index) {
		var lineErrors = [];
		if (!item.nbs) lineErrors.push("NBS");
		if (!item.codigo_servico_municipal) lineErrors.push("codigo municipal");
		if (NFSE.parseNumber(item.aliquota_iss) <= 0) lineErrors.push("aliquota ISS");
		if (NFSE.parseNumber(item.quantidade) <= 0) lineErrors.push("quantidade");
		if (NFSE.parseNumber(item.valor_unitario) <= 0) lineErrors.push("valor unitario");
		item.erros = lineErrors;
		if (lineErrors.length) {
			errors.push("Servico " + (index + 1) + ": revise " + lineErrors.join(", ") + ".");
		}
	});

	NFSE.renderServicos();
	NFSE.renderValidationErrors(errors);
	return errors.length === 0;
};

NFSE.validarFormularioBasico = function (silent) {
	var form = $("#formNfse").get(0);
	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		if (!silent) HELPER.showToast("Revise os campos obrigatorios da NFS-e.", "warning");
		return false;
	}
	$(form).removeClass("was-validated");
	return true;
};

NFSE.montarPayload = function () {
	return {
		numero_rps: $("#numeroRps").val(),
		serie_rps: $("#serieRps").val(),
		data_emissao: $("#dataEmissao").val(),
		competencia: $("#competencia").val(),
		natureza_operacao: $("#naturezaOperacao").val(),
		municipio_incidencia_id: $("#municipioIncidencia").val(),
		optante_simples: $("#optanteSimples").is(":checked"),
		incentivador_cultural: $("#incentivadorCultural").is(":checked"),
		tomador_id: $("#pessoa_id").val(),
		servicos: NFSE.data.servicos.map(function (item) {
			return {
				servico_id: item.servico_id,
				descricao: item.descricao,
				nbs: item.nbs,
				codigo_servico_municipal: item.codigo_servico_municipal,
				quantidade: NFSE.toPayloadNumber(item.quantidade),
				valor_unitario: NFSE.toPayloadNumber(item.valor_unitario),
				desconto: NFSE.toPayloadNumber(item.desconto),
				valor_total: NFSE.toPayloadNumber(item.valor_total),
				base_iss: NFSE.toPayloadNumber(item.base_iss),
				aliquota_iss: NFSE.toPayloadNumber(item.aliquota_iss),
				valor_iss: NFSE.toPayloadNumber(item.valor_iss),
				retencao_iss: !!item.retencao_iss,
				retem_pis: !!item.retem_pis,
				valor_pis: NFSE.toPayloadNumber(item.valor_pis),
				retem_cofins: !!item.retem_cofins,
				valor_cofins: NFSE.toPayloadNumber(item.valor_cofins),
				retem_csll: !!item.retem_csll,
				valor_csll: NFSE.toPayloadNumber(item.valor_csll),
				retem_irrf: !!item.retem_irrf,
				valor_irrf: NFSE.toPayloadNumber(item.valor_irrf),
				retem_inss: !!item.retem_inss,
				valor_inss: NFSE.toPayloadNumber(item.valor_inss),
				discriminacao: item.discriminacao,
				ajustado_manualmente: !!item.ajustado_manualmente,
				tributacao_federal_id: item.tributacao_federal_id
			};
		}),
		discriminacao_geral: $("#discriminacaoGeral").val(),
		informacoes_adicionais: $("#informacoesAdicionais").val(),
		observacoes_internas: $("#observacoesInternas").val(),
		origem: $("#origem").val(),
		pedido_id: $("#origem").val() === "Pedido de Venda" ? $("#origemId").val() : null,
		os_id: $("#origem").val() === "Ordem de Servico" ? $("#origemId").val() : null
	};
};

NFSE.renderServicos = function () {
	var html = [];
	NFSE.data.servicos.forEach(function (item, index) {
		html.push(NFSE.renderServicoRow(item, index));
		if (item.expanded) html.push(NFSE.renderFiscalPanel(item, index));
	});
	$("#nfseServicos").html(html.join("") || '<tr><td colspan="10" class="text-secondary">Nenhum servico adicionado.</td></tr>');
	NFSE.initMasks();
};

NFSE.renderServicoRow = function (item, index) {
	var badge = item.ajustado_manualmente ? '<span class="badge bg-yellow-lt ms-1">Ajustado manualmente</span>' : "";
	var errorBadge = item.erros && item.erros.length ? '<span class="badge bg-danger ms-1" title="' + NFSE.escapeHtml(item.erros.join(", ")) + '">Erro</span>' : "";
	return '<tr data-index="' + index + '">' +
		'<td>' + (index + 1) + '</td>' +
		'<td><div class="fw-medium">' + NFSE.escapeHtml(item.descricao) + badge + errorBadge + '</div><div class="text-secondary small">Codigo ' + NFSE.escapeHtml(item.servico_id) + '</div></td>' +
		'<td>' + NFSE.escapeHtml(item.nbs) + '</td>' +
		'<td>' + NFSE.escapeHtml(item.codigo_servico_municipal) + '</td>' +
		'<td><input type="number" class="form-control form-control-sm item-quantidade" min="0.01" step="0.01" value="' + NFSE.escapeHtml(item.quantidade) + '"></td>' +
		'<td><input type="text" class="form-control form-control-sm money-field item-unitario" value="' + NFSE.formatNumber(item.valor_unitario) + '"></td>' +
		'<td><input type="text" class="form-control form-control-sm money-field item-desconto" value="' + NFSE.formatNumber(item.desconto) + '"></td>' +
		'<td><strong>' + NFSE.formatCurrency(item.valor_total) + '</strong></td>' +
		'<td><button type="button" class="btn btn-icon btn-outline-secondary btn-toggle-fiscal" data-index="' + index + '" aria-label="Detalhes fiscais">+</button></td>' +
		'<td><button type="button" class="btn btn-icon btn-outline-danger btn-remover-servico" data-index="' + index + '" aria-label="Remover">x</button></td>' +
	'</tr>';
};

NFSE.renderFiscalPanel = function (item, index) {
	return '<tr class="nfse-fiscal-row" data-fiscal-index="' + index + '"><td colspan="10">' +
		'<div class="row g-3">' +
			'<div class="col-12"><div class="subheader">ISS</div></div>' +
			NFSE.fiscalInput("Base calc. ISS", "base-iss", item.base_iss, "col-md-3") +
			NFSE.fiscalInput("Aliquota ISS", "aliquota-iss", item.aliquota_iss, "col-md-3") +
			NFSE.fiscalInput("Valor ISS", "valor-iss", item.valor_iss, "col-md-3") +
			NFSE.fiscalSwitch("Retencao ISS", "retencao-iss", item.retencao_iss, "col-md-3") +
			'<div class="col-12"><div class="subheader">Retencoes federais</div></div>' +
			NFSE.retencaoFields("PIS", "pis", item) +
			NFSE.retencaoFields("COFINS", "cofins", item) +
			NFSE.retencaoFields("CSLL", "csll", item) +
			NFSE.retencaoFields("IRRF", "irrf", item) +
			NFSE.retencaoFields("INSS", "inss", item) +
			'<div class="col-12"><label class="form-label">Discriminacao do servico</label><textarea class="form-control item-discriminacao" rows="3">' + NFSE.escapeHtml(item.discriminacao) + '</textarea></div>' +
			'<div class="col-12 text-end"><button type="button" class="btn btn-outline-primary btn-recalcular-servico" data-index="' + index + '">Recalcular</button></div>' +
		'</div>' +
	'</td></tr>';
};

NFSE.renderPrestador = function () {
	var e = NFSE.data.emitente || {};
	var endereco = [e.logradouro || "Avenida Paulista", e.numero || "1000", e.complemento || "Conjunto 1201", e.bairro || "Bela Vista"].filter(Boolean).join(", ");
	$("#prestadorResumo").html(
		NFSE.readOnlyText("Razao Social", e.razao_social || "ERP Master Comercio Ltda", "col-md-4") +
		NFSE.readOnlyText("CNPJ", e.cnpj || "12.345.678/0001-90", "col-md-2") +
		NFSE.readOnlyText("Inscricao Municipal", e.im || "987654321", "col-md-2") +
		NFSE.readOnlyText("CNAE", e.cnae || "4751-2/01", "col-md-2") +
		NFSE.readOnlyText("Regime Tributario", NFSE.getRegimeLabel(), "col-md-2") +
		NFSE.readOnlyText("Endereco", endereco, "col-md-6") +
		NFSE.readOnlyText("Cidade / UF", e.cidade || "Sao Paulo/SP", "col-md-2") +
		NFSE.readOnlyText("CEP", e.cep || "01310-100", "col-md-2") +
		NFSE.readOnlyText("Telefone", e.telefone || "(11) 3000-0000", "col-md-2") +
		NFSE.readOnlyText("E-mail", e.email_principal || "financeiro@erpmaster.local", "col-md-4")
	);
};

NFSE.renderTomadorResumo = function (p) {
	if (!p) {
		$("#tomadorResumo").html('<div class="col-12"><div class="alert alert-info mb-0">Selecione o tomador para identificar municipio, UF e regras de retencao.</div></div>');
		return;
	}
	$("#tomadorResumo").html(
		'<div class="col-12"><div class="card bg-light"><div class="card-body"><div class="row g-3">' +
			NFSE.summaryText("Nome/Razao Social", p.nome, "col-md-4") +
			NFSE.summaryText("CPF/CNPJ", p.documento, "col-md-2") +
			NFSE.summaryText("Inscricao Municipal", p.im || "Isento", "col-md-2") +
			NFSE.summaryText("Endereco", p.endereco_resumo, "col-md-4") +
			NFSE.summaryText("Cidade / UF", p.cidade + "/" + p.uf, "col-md-2") +
			NFSE.summaryText("CEP", p.cep, "col-md-2") +
			NFSE.summaryText("E-mail", p.email, "col-md-4") +
			NFSE.summaryText("Telefone", p.telefone, "col-md-2") +
			NFSE.summaryText("Retencao", p.obrigado_reter ? "Tomador PJ com retencao obrigatoria" : "Sem retencao obrigatoria identificada", "col-md-4") +
		'</div></div></div></div>'
	);
};

NFSE.habilitarEdicaoTomadorNota = function () {
	HELPER.showToast("Edicao pontual dos dados do tomador liberada apenas para esta nota.", "success");
};

NFSE.atualizarStatus = function (status) {
	var map = { Digitacao: "bg-secondary", Processando: "bg-warning", Autorizada: "bg-success", Rejeitada: "bg-danger", Cancelada: "bg-dark" };
	NFSE.data.status = status;
	$("#badgeStatusNfse").attr("class", "badge " + (map[status] || "bg-secondary")).text(status);
	$("#btnSalvar, #btnSalvarTopo, #btnEmitir, #btnEmitirTopo").prop("disabled", status === "Processando" || status === "Autorizada" || status === "Cancelada");
	$("#btnCancelarNfse, #btnVisualizarDanfse, #btnBaixarXml").prop("disabled", status !== "Autorizada");
};

NFSE.exibirNumeroNfse = function (numero) {
	$("#numeroNfse").val(numero || "2026000123");
};

NFSE.mockResolverServico = function (payload) {
	var catalogo = NFSE.findById(NFSE.data.servicosCatalogo, payload.servico_id) || {};
	var quantidade = Number(payload.quantidade || 1);
	var unitario = Number(payload.valor_unitario || catalogo.valor_padrao || 0);
	var desconto = Number(payload.desconto || 0);
	var total = Math.max((quantidade * unitario) - desconto, 0);
	var aliquotaIss = Number(catalogo.aliquota_iss || 2);
	var tomadorRetem = !!(NFSE.data.tomador && NFSE.data.tomador.obrigado_reter);
	var regimeSimplificado = NFSE.isRegimeSimplificado();
	var mei = NFSE.getRegimeTributario() === "mei";
	var valorIss = total * (aliquotaIss / 100);
	var retemFederais = tomadorRetem && !mei;

	return {
		servico_id: payload.servico_id,
		descricao: catalogo.text || catalogo.descricao || "Servico",
		nbs: catalogo.nbs || "1.0901.00.00",
		codigo_servico_municipal: catalogo.codigo_servico_municipal || "01.07",
		quantidade: quantidade,
		valor_unitario: unitario,
		desconto: desconto,
		valor_total: total,
		base_iss: total,
		aliquota_iss: aliquotaIss,
		valor_iss: valorIss,
		retencao_iss: tomadorRetem,
		valor_iss_retido: tomadorRetem ? valorIss : 0,
		retem_pis: regimeSimplificado ? false : tomadorRetem,
		percentual_pis: regimeSimplificado ? 0 : 0.65,
		valor_pis: regimeSimplificado ? 0 : total * 0.0065,
		retem_cofins: regimeSimplificado ? false : tomadorRetem,
		percentual_cofins: regimeSimplificado ? 0 : 3,
		valor_cofins: regimeSimplificado ? 0 : total * 0.03,
		retem_csll: retemFederais,
		percentual_csll: 1,
		valor_csll: retemFederais ? total * 0.01 : 0,
		retem_irrf: retemFederais,
		percentual_irrf: 1.5,
		valor_irrf: retemFederais ? total * 0.015 : 0,
		retem_inss: false,
		percentual_inss: 11,
		valor_inss: total * 0.11,
		discriminacao: catalogo.discriminacao || ("Prestacao de servicos de " + (catalogo.text || "servico") + "."),
		tributacao_federal_id: catalogo.tributacao_federal_id || 3
	};
};

NFSE.normalizeServicoResolvido = function (dados) {
	var numeric = ["quantidade", "valor_unitario", "desconto", "valor_total", "base_iss", "aliquota_iss", "valor_iss", "valor_iss_retido", "percentual_pis", "valor_pis", "percentual_cofins", "valor_cofins", "percentual_csll", "valor_csll", "percentual_irrf", "valor_irrf", "percentual_inss", "valor_inss"];
	numeric.forEach(function (key) { dados[key] = NFSE.parseNumber(dados[key]); });
	return dados;
};

NFSE.fiscalInput = function (label, className, value, colClass) {
	return '<div class="' + colClass + '"><label class="form-label">' + label + '</label><input type="text" class="form-control fiscal-field money-field ' + className + '" value="' + NFSE.formatNumber(value) + '"></div>';
};

NFSE.fiscalSwitch = function (label, className, checked, colClass) {
	return '<div class="' + colClass + '"><label class="form-label">' + label + '</label><label class="form-check form-switch mt-2"><input class="form-check-input fiscal-switch ' + className + '" type="checkbox"' + (checked ? " checked" : "") + '><span class="form-check-label">Sim / Nao</span></label></div>';
};

NFSE.retencaoFields = function (label, key, item) {
	var das = NFSE.isRegimeSimplificado() && (key === "pis" || key === "cofins");
	var badge = das ? '<span class="badge bg-blue-lt ms-1">DAS</span>' : "";
	var locked = das ? " readonly" : "";
	var disabled = das ? " disabled" : "";
	return '<div class="col-12 col-xl"><div class="border rounded p-2 h-100"><div class="fw-medium mb-2">' + label + badge + '</div>' +
		'<label class="form-label">Percentual</label><input type="text" class="form-control form-control-sm fiscal-field money-field percentual-' + key + '" value="' + NFSE.formatNumber(das ? 0 : item["percentual_" + key]) + '"' + locked + '>' +
		'<label class="form-label mt-2">Valor</label><input type="text" class="form-control form-control-sm fiscal-field money-field valor-' + key + '" value="' + NFSE.formatNumber(das ? 0 : item["valor_" + key]) + '"' + locked + '>' +
		'<label class="form-check form-switch mt-2"><input class="form-check-input fiscal-switch retem-' + key + '" type="checkbox"' + (item["retem_" + key] && !das ? " checked" : "") + disabled + '><span class="form-check-label">Retido</span></label>' +
	'</div></div>';
};

NFSE.getRetencaoLabel = function (label, key) {
	if (NFSE.isRegimeSimplificado() && (key === "pis" || key === "cofins")) {
		return label + " (DAS)";
	}

	return label;
};

NFSE.resumoTributo = function (label, baseKey, aliquotaKey, valueKey) {
	var base = NFSE.sum(baseKey);
	var valor = NFSE.sum(valueKey);
	var aliquota = NFSE.mediaAliquota(aliquotaKey);
	return '<tr><td>' + label + '</td><td>' + NFSE.formatCurrency(base) + '</td><td>' + NFSE.formatPercent(aliquota) + '</td><td>' + NFSE.formatCurrency(valor) + '</td></tr>';
};

NFSE.resumoRetido = function (label, key) {
	var rows = NFSE.data.servicos.filter(function (item) { return item["retem_" + key]; });
	var base = rows.reduce(function (total, item) { return total + Number(item.base_iss || 0); }, 0);
	var valor = rows.reduce(function (total, item) { return total + Number(item["valor_" + key] || 0); }, 0);
	var aliquota = rows.length ? rows.reduce(function (total, item) { return total + Number(item["percentual_" + key] || 0); }, 0) / rows.length : 0;
	return '<tr><td>' + label + '</td><td>' + NFSE.formatCurrency(base) + '</td><td>' + NFSE.formatPercent(aliquota) + '</td><td>' + NFSE.formatCurrency(valor) + '</td></tr>';
};

NFSE.totalItem = function (label, value, col) {
	return '<div class="' + col + '"><div class="subheader">' + label + '</div><div class="h2 mb-0">' + value + '</div></div>';
};

NFSE.readOnlyText = function (label, value, col) {
	return '<div class="col-12 ' + col + '"><div class="subheader">' + label + '</div><div class="fw-medium">' + NFSE.escapeHtml(value) + '</div></div>';
};

NFSE.summaryText = NFSE.readOnlyText;

NFSE.renderValidationErrors = function (errors) {
	$("#alertValidacao").toggleClass("d-none", !errors.length);
	$("#listaValidacao").html(errors.map(function (error) { return '<li>' + NFSE.escapeHtml(error) + '</li>'; }).join(""));
};

NFSE.initTomSelects = function (context) {
	if (!window.TomSelect) return;
	$(context).find("select[data-tomselect]").each(function () {
		var select = this;
		if (select.tomselect) return;
		new window.TomSelect(select, {
			plugins: ["dropdown_input", "clear_button"],
			copyClassesToDropdown: false,
			controlInput: "<input>",
			dropdownParent: "body",
			valueField: "id",
			labelField: "text",
			searchField: ["text", "nome", "documento", "codigo_interno", "codigo_servico_municipal", "nbs"],
			placeholder: $(select).data("placeholder") || "",
			preload: true,
			load: HELPER.debounce(function (query, callback) {
				NFSE.loadSelectOptions($(select).data("ajax-url"), query, callback);
			}, 300)
		});
	});
};

NFSE.initMasks = function () {
	$(".money-field").each(function () {
		if (!window.IMask || this.dataset.masked === "1") return;
		this.dataset.masked = "1";
		NFSE.masks[this.id || ("mask-" + Object.keys(NFSE.masks).length)] = window.IMask(this, {
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

NFSE.loadSelectOptions = function (url, query, callback) {
	if (!url) {
		callback();
		return;
	}
	HELPER.ajaxGet(url, {
		success: function (response) {
			callback(NFSE.filterOptions(NFSE.normalizeRows(response), query));
		},
		error: function () { callback(); }
	});
};

NFSE.refreshSelect = function (selector, rows) {
	var select = $(selector).get(0);
	if (!select || !select.tomselect) return;
	select.tomselect.clearOptions();
	select.tomselect.addOptions(rows);
	select.tomselect.refreshOptions(false);
};

NFSE.setTomValue = function (selector, value) {
	var select = $(selector).get(0);
	if (select && select.tomselect) {
		select.tomselect.setValue(String(value), true);
		return;
	}
	$(selector).val(value);
};

NFSE.simularPessoaSalva = function () {
	var pessoa = { id: "novo-" + Date.now(), text: "Novo Tomador Servicos Ltda", nome: "Novo Tomador Servicos Ltda", documento: "10.200.300/0001-44", codigo_interno: "NT-001", cidade: "Sao Paulo", uf: "SP", telefone: "(11) 4000-0000", email: "fiscal@tomador.local", im: "445566", cep: "01000-000", endereco_resumo: "Rua Comercial, 100 - Centro - Sao Paulo/SP", obrigado_reter: true };
	NFSE.data.pessoas.push(pessoa);
	NFSE.refreshSelect("#pessoa_id", NFSE.data.pessoas);
	$("#pessoa_id").get(0).tomselect.setValue(String(pessoa.id));
	window.bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPessoaRapida")).hide();
	HELPER.showToast("Novo tomador selecionado na NFS-e.", "success");
};

NFSE.normalizeRows = function (response) {
	return response && Array.isArray(response.data) ? response.data : [];
};

NFSE.filterOptions = function (items, query) {
	var q = String(query || "").toLowerCase();
	if (!q) return items;
	return items.filter(function (item) {
		return [item.text, item.nome, item.documento, item.codigo_interno, item.codigo_servico_municipal, item.nbs].join(" ").toLowerCase().indexOf(q) !== -1;
	});
};

NFSE.findById = function (items, id) {
	return items.find(function (item) { return String(item.id) === String(id); });
};

NFSE.sum = function (field) {
	return NFSE.data.servicos.reduce(function (total, item) { return total + Number(item[field] || 0); }, 0);
};

NFSE.sumRetidosFederais = function () {
	return ["pis", "cofins", "csll", "irrf", "inss"].reduce(function (total, key) {
		return total + NFSE.data.servicos.reduce(function (subtotal, item) {
			return subtotal + (item["retem_" + key] ? Number(item["valor_" + key] || 0) : 0);
		}, 0);
	}, 0);
};

NFSE.mediaAliquota = function (field) {
	if (!NFSE.data.servicos.length) return 0;
	return NFSE.sum(field) / NFSE.data.servicos.length;
};

NFSE.atualizarContadores = function () {
	$(".nfse-textarea").each(function () {
		$('[data-counter-for="' + this.id + '"]').text(String($(this).val()).length);
	});
};

NFSE.parseNumber = function (value) {
	var normalized = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);
	return isNaN(number) ? 0 : number;
};

NFSE.toPayloadNumber = function (value) {
	return Number(value || 0).toFixed(2);
};

NFSE.formatNumber = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

NFSE.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

NFSE.formatPercent = function (value) {
	return NFSE.formatNumber(value) + "%";
};

NFSE.escapeHtml = function (value) {
	return String(value == null ? "" : value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};
