const TRIBUTACAO_ESTADUAL = window.TRIBUTACAO_ESTADUAL || {};
window.TRIBUTACAO_ESTADUAL = TRIBUTACAO_ESTADUAL;

TRIBUTACAO_ESTADUAL.masks = {};
TRIBUTACAO_ESTADUAL.rowIndex = 0;

$(document).ready(function () {
	TRIBUTACAO_ESTADUAL.init();
});

TRIBUTACAO_ESTADUAL.init = function () {
	TRIBUTACAO_ESTADUAL.initializeComponents();
	TRIBUTACAO_ESTADUAL.bindEvents();
	TRIBUTACAO_ESTADUAL.loadInitialData();
};

TRIBUTACAO_ESTADUAL.initializeComponents = function () {
	TRIBUTACAO_ESTADUAL.initMasks();
	TRIBUTACAO_ESTADUAL.atualizarIndicadores();
};

TRIBUTACAO_ESTADUAL.bindEvents = function () {
	$("#btnHeaderSave").on("click", TRIBUTACAO_ESTADUAL.acionarSalvar);
	$("#btnHeaderSaveNew").on("click", TRIBUTACAO_ESTADUAL.salvarNovo);
	$("#btnSaveNew").on("click", TRIBUTACAO_ESTADUAL.salvarNovo);
	$("#btnAdicionarUf").on("click", function () {
		TRIBUTACAO_ESTADUAL.adicionarLinhaUf();
	});
	$("#formTributacaoEstadual").on("submit", TRIBUTACAO_ESTADUAL.salvarFormulario);
	$("#ufRulesBody").on("click", "[data-uf-action]", TRIBUTACAO_ESTADUAL.executarAcaoLinha);
	$("#ufRulesBody").on("input change", "input, select, textarea", TRIBUTACAO_ESTADUAL.onLinhaChange);
	$("#descricao, #codigoInterno, #ativo, #observacaoInterna").on("input change", TRIBUTACAO_ESTADUAL.clearFieldError);
};

TRIBUTACAO_ESTADUAL.loadInitialData = function () {
	if (!$("#ufRulesBody .uf-rule-row").length) {
		TRIBUTACAO_ESTADUAL.adicionarLinhaUf({ uf_destino: "RS", cfop: "6102", tipo_operacao: "Venda", finalidade_operacao: "Revenda", aliquota_icms: "12,00", possui_fcp: true, aliquota_fcp: "2,00", ativo: true });
		TRIBUTACAO_ESTADUAL.adicionarLinhaUf({ uf_destino: "SP", cfop: "6102", tipo_operacao: "Venda", finalidade_operacao: "Revenda", aliquota_icms: "12,00", ativo: true });
	}
};

TRIBUTACAO_ESTADUAL.acionarSalvar = function () {
	$("#btnSalvar").trigger("click");
};

TRIBUTACAO_ESTADUAL.salvarFormulario = function (event) {
	event.preventDefault();

	if (!TRIBUTACAO_ESTADUAL.validarFormulario()) {
		return;
	}

	TRIBUTACAO_ESTADUAL.salvar(false, "#btnSalvar");
};

TRIBUTACAO_ESTADUAL.salvarNovo = function (event) {
	if (!TRIBUTACAO_ESTADUAL.validarFormulario()) {
		return;
	}

	var button = event && event.currentTarget ? "#" + event.currentTarget.id : "#btnSaveNew";

	TRIBUTACAO_ESTADUAL.salvar(true, button);
};

TRIBUTACAO_ESTADUAL.salvar = function (limpar, button) {
	HELPER.ajaxPost("/api/tributacoes-estaduais", TRIBUTACAO_ESTADUAL.getFormData(), {
		button: button,
		form: "#formTributacaoEstadual",
		success: function (response) {
			if (!response || !response.message) {
				HELPER.showToast(limpar ? "Tributacao estadual salva. Pronta para novo cadastro." : "Tributacao estadual salva com sucesso.", "success");
			}

			if (limpar) {
				TRIBUTACAO_ESTADUAL.limparFormulario();
			}
		},
		error: function () {}
	});
};

TRIBUTACAO_ESTADUAL.adicionarLinhaUf = function (data, options) {
	data = data || {};
	options = options || {};
	TRIBUTACAO_ESTADUAL.rowIndex += 1;

	var rowId = "uf-row-" + TRIBUTACAO_ESTADUAL.rowIndex;
	var $row = $(TRIBUTACAO_ESTADUAL.getLinhaUfTemplate(rowId));

	if (data.id) {
		$row.attr("data-regra-id", data.id);
	}

	if (options.after && options.after.length) {
		options.after.after($row);
	} else {
		$("#ufRulesBody").append($row);
	}

	TRIBUTACAO_ESTADUAL.preencherLinha($row, data);
	TRIBUTACAO_ESTADUAL.initMasks($row);
	TRIBUTACAO_ESTADUAL.atualizarVisibilidadeLinha($row);
	TRIBUTACAO_ESTADUAL.atualizarIndicadores();

	if (options.focusUf) {
		$row.find(".uf-destino").trigger("focus");
	}

	return $row;
};

TRIBUTACAO_ESTADUAL.getLinhaUfTemplate = function (rowId) {
	return '<tr class="uf-rule-row" data-row-id="' + rowId + '">' +
		'<td class="align-top"><select class="form-select form-select-sm uf-destino">' + TRIBUTACAO_ESTADUAL.getUfOptions() + '</select><div class="invalid-feedback">Informe a UF.</div></td>' +
		'<td class="align-top"><input type="text" class="form-control form-control-sm cfop" maxlength="4" placeholder="6102"><div class="invalid-feedback">Informe 4 digitos.</div></td>' +
		'<td class="align-top"><select class="form-select form-select-sm tipo-operacao"><option value="">Tipo</option><option>Venda</option><option>Compra</option><option>Devolucao</option><option>Transferencia</option><option>Bonificacao</option><option>Brinde</option><option>Remessa</option><option>Retorno</option><option>Uso e consumo</option></select><select class="form-select form-select-sm mt-1 finalidade-operacao"><option value="">Finalidade</option><option>Revenda</option><option>Uso e consumo</option><option>Ativo imobilizado</option><option>Comercializacao</option></select><input type="number" class="form-control form-control-sm mt-1 prioridade-aplicacao" min="1" max="999" value="10" title="Prioridade"></td>' +
		'<td class="align-top"><label class="form-check form-switch mb-1"><input class="form-check-input consumidor-final" type="checkbox"><span class="form-check-label">Cons. final</span></label><label class="form-check form-switch mb-1"><input class="form-check-input contribuinte-icms" type="checkbox" checked><span class="form-check-label">Contrib.</span></label><label class="form-check form-switch mb-1"><input class="form-check-input aplicar-venda" type="checkbox" checked><span class="form-check-label">Venda</span></label><label class="form-check form-switch mb-1"><input class="form-check-input aplicar-compra" type="checkbox"><span class="form-check-label">Compra</span></label></td>' +
		'<td class="align-top"><select class="form-select form-select-sm cst-icms"><option value="">CST</option><option>00</option><option>10</option><option>20</option><option>30</option><option>40</option><option>41</option><option>50</option><option>51</option><option>60</option><option>70</option><option>90</option></select><select class="form-select form-select-sm mt-1 csosn"><option value="">CSOSN</option><option>101</option><option>102</option><option>103</option><option>201</option><option>202</option><option>203</option><option>300</option><option>400</option><option>500</option><option>900</option></select></td>' +
		'<td class="align-top"><select class="form-select form-select-sm origem-mercadoria"><option value="0">0 - Nacional</option><option value="1">1 - Importacao direta</option><option value="2">2 - Estrangeira interna</option><option value="3">3 - Nacional importacao > 40%</option><option value="4">4 - PPB</option><option value="5">5 - Nacional importacao <= 40%</option><option value="6">6 - Importacao sem similar</option><option value="7">7 - Interna sem similar</option><option value="8">8 - Nacional importacao > 70%</option></select></td>' +
		'<td class="align-top"><div class="input-group input-group-sm"><input type="text" class="form-control js-percent aliquota-icms" placeholder="0,00"><span class="input-group-text">%</span></div><div class="input-group input-group-sm mt-1"><input type="text" class="form-control js-percent reducao-bc" placeholder="Red. BC"><span class="input-group-text">%</span></div><select class="form-select form-select-sm mt-1 modalidade-bc"><option value="">Modalidade BC</option><option>Margem Valor Agregado</option><option>Pauta</option><option>Preco Tabelado</option><option>Valor Operacao</option></select></td>' +
		'<td class="align-top"><div class="d-flex align-items-center gap-1 mb-1"><label class="form-check form-switch mb-0"><input class="form-check-input possui-st" type="checkbox"><span class="form-check-label">ST</span></label><span class="badge bg-red-lt st-obrigatorio d-none" title="ST obrigatorio pelo CST selecionado">CST</span></div><div class="js-st-fields d-none"><div class="input-group input-group-sm"><input type="text" class="form-control js-percent mva" placeholder="MVA"><span class="input-group-text">%</span></div><div class="input-group input-group-sm mt-1"><input type="text" class="form-control js-percent aliquota-icms-st" placeholder="ICMS ST"><span class="input-group-text">%</span></div><select class="form-select form-select-sm mt-1 modalidade-bc-st"><option value="">Modalidade BC ST</option><option>Preco Tabelado ou Maximo Sugerido</option><option>Lista Negativa</option><option>Lista Positiva</option><option>Lista Neutra</option><option>Margem Valor Agregado</option><option>Pauta</option><option>Valor Operacao</option></select><div class="input-group input-group-sm mt-1"><input type="text" class="form-control js-percent reducao-bc-st" placeholder="Red. BC ST"><span class="input-group-text">%</span></div></div></td>' +
		'<td class="align-top"><label class="form-check form-switch mb-1"><input class="form-check-input possui-fcp" type="checkbox"><span class="form-check-label">FCP</span></label><div class="js-fcp-fields d-none"><div class="input-group input-group-sm"><input type="text" class="form-control js-percent aliquota-fcp" placeholder="FCP"><span class="input-group-text">%</span></div></div><div class="js-fcp-st-field d-none"><div class="input-group input-group-sm mt-1"><input type="text" class="form-control js-percent aliquota-fcp-st" placeholder="FCP-ST"><span class="input-group-text">%</span></div></div><div class="js-fcp-difal-field d-none"><div class="input-group input-group-sm mt-1"><input type="text" class="form-control js-percent aliquota-fcp-difal" placeholder="FCP DIFAL"><span class="input-group-text">%</span></div></div></td>' +
		'<td class="align-top"><label class="form-check form-switch mb-1"><input class="form-check-input possui-difal" type="checkbox"><span class="form-check-label">DIFAL</span></label><div class="js-difal-fields d-none"><div class="input-group input-group-sm"><input type="text" class="form-control js-percent aliquota-interestadual" placeholder="Inter"><span class="input-group-text">%</span></div><div class="input-group input-group-sm mt-1"><input type="text" class="form-control js-percent aliquota-interna-destino" placeholder="Interna"><span class="input-group-text">%</span></div><div class="input-group input-group-sm mt-1" title="Partilha assumida em 100% para a UF destino no modelo pos-2019."><input type="text" class="form-control js-percent percentual-partilha-destino" placeholder="Partilha"><span class="input-group-text">%</span></div></div></td>' +
		'<td class="align-top"><label class="form-check form-switch mb-1" title="Aplicavel a MEI e Simples Nacional"><input class="form-check-input permite-credito-sn" type="checkbox"><span class="form-check-label">Cred. SN</span></label><div class="js-credito-sn-field d-none"><div class="input-group input-group-sm"><input type="text" class="form-control js-percent percentual-credito-sn" placeholder="Cred."><span class="input-group-text">%</span></div></div><label class="form-check form-switch my-1" title="Aplicavel a MEI e Simples Nacional"><input class="form-check-input diferimento" type="checkbox"><span class="form-check-label">Difer.</span></label><div class="js-diferimento-field d-none"><div class="input-group input-group-sm"><input type="text" class="form-control js-percent percentual-diferimento" placeholder="Difer."><span class="input-group-text">%</span></div></div></td>' +
		'<td class="align-top"><input type="text" class="form-control form-control-sm cbenef" maxlength="20" placeholder="cBenef"><input type="text" class="form-control form-control-sm mt-1 codigo-beneficio-uf" maxlength="50" placeholder="Cod. UF"><textarea class="form-control form-control-sm mt-1 motivo-beneficio" rows="2" placeholder="Motivo"></textarea></td>' +
		'<td class="align-top text-end"><label class="form-check form-switch justify-content-end mb-2"><input class="form-check-input regra-ativa" type="checkbox" checked><span class="form-check-label">Ativa</span></label><div class="dropdown"><button class="btn btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" data-bs-boundary="viewport">Acoes</button><div class="dropdown-menu dropdown-menu-end"><a class="dropdown-item" href="#" data-uf-action="duplicar">Duplicar linha</a><a class="dropdown-item text-danger" href="#" data-uf-action="remover">Remover linha</a></div></div></td>' +
	'</tr>';
};

TRIBUTACAO_ESTADUAL.getUfOptions = function () {
	var ufs = ["", "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

	return ufs.map(function (uf) {
		return '<option value="' + uf + '">' + (uf || "UF") + '</option>';
	}).join("");
};

TRIBUTACAO_ESTADUAL.preencherLinha = function ($row, data) {
	TRIBUTACAO_ESTADUAL.setValue($row, ".uf-destino", data.uf_destino);
	TRIBUTACAO_ESTADUAL.setValue($row, ".cfop", data.cfop);
	TRIBUTACAO_ESTADUAL.setValue($row, ".tipo-operacao", data.tipo_operacao);
	TRIBUTACAO_ESTADUAL.setValue($row, ".finalidade-operacao", data.finalidade_operacao);
	TRIBUTACAO_ESTADUAL.setValue($row, ".prioridade-aplicacao", data.prioridade_aplicacao || 10);
	TRIBUTACAO_ESTADUAL.setChecked($row, ".consumidor-final", data.consumidor_final);
	TRIBUTACAO_ESTADUAL.setChecked($row, ".contribuinte-icms", data.contribuinte_icms !== false);
	TRIBUTACAO_ESTADUAL.setChecked($row, ".aplicar-venda", data.aplicar_venda !== false);
	TRIBUTACAO_ESTADUAL.setChecked($row, ".aplicar-compra", data.aplicar_compra);
	TRIBUTACAO_ESTADUAL.setValue($row, ".cst-icms", data.cst_icms);
	TRIBUTACAO_ESTADUAL.setValue($row, ".csosn", data.csosn);
	TRIBUTACAO_ESTADUAL.setValue($row, ".origem-mercadoria", data.origem_mercadoria || "0");
	TRIBUTACAO_ESTADUAL.setPercentValue($row, ".aliquota-icms", data.aliquota_icms);
	TRIBUTACAO_ESTADUAL.setPercentValue($row, ".reducao-bc", data.reducao_bc);
	TRIBUTACAO_ESTADUAL.setValue($row, ".modalidade-bc", data.modalidade_bc);
	TRIBUTACAO_ESTADUAL.setChecked($row, ".possui-st", data.possui_st);
	TRIBUTACAO_ESTADUAL.setPercentValue($row, ".mva", data.mva);
	TRIBUTACAO_ESTADUAL.setPercentValue($row, ".aliquota-icms-st", data.aliquota_icms_st);
	TRIBUTACAO_ESTADUAL.setValue($row, ".modalidade-bc-st", data.modalidade_bc_st);
	TRIBUTACAO_ESTADUAL.setPercentValue($row, ".reducao-bc-st", data.reducao_bc_st);
	TRIBUTACAO_ESTADUAL.setChecked($row, ".possui-fcp", data.possui_fcp);
	TRIBUTACAO_ESTADUAL.setPercentValue($row, ".aliquota-fcp", data.aliquota_fcp);
	TRIBUTACAO_ESTADUAL.setPercentValue($row, ".aliquota-fcp-st", data.aliquota_fcp_st);
	TRIBUTACAO_ESTADUAL.setPercentValue($row, ".aliquota-fcp-difal", data.aliquota_fcp_difal);
	TRIBUTACAO_ESTADUAL.setChecked($row, ".possui-difal", data.possui_difal);
	TRIBUTACAO_ESTADUAL.setPercentValue($row, ".aliquota-interestadual", data.aliquota_interestadual);
	TRIBUTACAO_ESTADUAL.setPercentValue($row, ".aliquota-interna-destino", data.aliquota_interna_destino);
	TRIBUTACAO_ESTADUAL.setPercentValue($row, ".percentual-partilha-destino", data.percentual_partilha_destino);
	TRIBUTACAO_ESTADUAL.setChecked($row, ".permite-credito-sn", data.permite_credito_sn);
	TRIBUTACAO_ESTADUAL.setPercentValue($row, ".percentual-credito-sn", data.percentual_credito_sn);
	TRIBUTACAO_ESTADUAL.setChecked($row, ".diferimento", data.diferimento);
	TRIBUTACAO_ESTADUAL.setPercentValue($row, ".percentual-diferimento", data.percentual_diferimento);
	TRIBUTACAO_ESTADUAL.setValue($row, ".cbenef", data.cbenef);
	TRIBUTACAO_ESTADUAL.setValue($row, ".codigo-beneficio-uf", data.codigo_beneficio_uf);
	TRIBUTACAO_ESTADUAL.setValue($row, ".motivo-beneficio", data.motivo_beneficio);
	TRIBUTACAO_ESTADUAL.setChecked($row, ".regra-ativa", data.ativo !== false);
	TRIBUTACAO_ESTADUAL.atualizarVisibilidadeLinha($row);
};

TRIBUTACAO_ESTADUAL.setValue = function ($row, selector, value) {
	if (value !== undefined && value !== null) {
		$row.find(selector).val(value);
	}
};

TRIBUTACAO_ESTADUAL.setPercentValue = function ($row, selector, value) {
	if (value !== undefined && value !== null && value !== "") {
		$row.find(selector).val(TRIBUTACAO_ESTADUAL.formatPercentValue(value));
	}
};

TRIBUTACAO_ESTADUAL.setChecked = function ($row, selector, value) {
	$row.find(selector).prop("checked", !!value);
};

TRIBUTACAO_ESTADUAL.atualizarVisibilidadeLinha = function ($row) {
	var cst = $row.find(".cst-icms").val();
	var stObrigatorio = ["10", "70", "90"].indexOf(cst) !== -1;
	var $possuiSt = $row.find(".possui-st");
	var possuiSt = $possuiSt.is(":checked") || stObrigatorio;
	var possuiFcp = $row.find(".possui-fcp").is(":checked");
	var possuiDifal = $row.find(".possui-difal").is(":checked");
	var permiteCreditoSn = $row.find(".permite-credito-sn").is(":checked");
	var diferimento = $row.find(".diferimento").is(":checked");

	if (stObrigatorio) {
		$possuiSt.prop("checked", true);
	}

	$possuiSt.prop("disabled", stObrigatorio);
	$row.find(".st-obrigatorio").toggleClass("d-none", !stObrigatorio);
	$row.find(".js-st-fields").toggleClass("d-none", !possuiSt);
	$row.find(".js-fcp-fields").toggleClass("d-none", !possuiFcp);
	$row.find(".js-fcp-st-field").toggleClass("d-none", !(possuiFcp && possuiSt));
	$row.find(".js-fcp-difal-field").toggleClass("d-none", !(possuiFcp && possuiDifal));
	$row.find(".js-difal-fields").toggleClass("d-none", !possuiDifal);
	$row.find(".js-credito-sn-field").toggleClass("d-none", !permiteCreditoSn);
	$row.find(".js-diferimento-field").toggleClass("d-none", !diferimento);

	if (possuiDifal && !String($row.find(".percentual-partilha-destino").val() || "").trim()) {
		$row.find(".percentual-partilha-destino").val("100,0000");
	}

	if (!possuiSt) {
		$row.find(".mva, .aliquota-icms-st, .reducao-bc-st").val("");
		$row.find(".modalidade-bc-st").val("");
	}

	if (!possuiFcp) {
		$row.find(".aliquota-fcp, .aliquota-fcp-st, .aliquota-fcp-difal").val("");
	}

	if (!possuiDifal) {
		$row.find(".aliquota-interestadual, .aliquota-interna-destino, .percentual-partilha-destino, .aliquota-fcp-difal").val("");
	}

	if (!(possuiFcp && possuiSt)) {
		$row.find(".aliquota-fcp-st").val("");
	}

	if (!permiteCreditoSn) {
		$row.find(".percentual-credito-sn").val("");
	}

	if (!diferimento) {
		$row.find(".percentual-diferimento").val("");
	}
};

TRIBUTACAO_ESTADUAL.executarAcaoLinha = function (event) {
	event.preventDefault();

	var action = $(this).data("uf-action");
	var $row = $(this).closest(".uf-rule-row");

	if (action === "duplicar") {
		var data = TRIBUTACAO_ESTADUAL.getLinhaData($row);

		delete data.id;
		data.uf_destino = "";
		TRIBUTACAO_ESTADUAL.adicionarLinhaUf(data, { after: $row, focusUf: true });
		return;
	}

	if (action === "remover") {
		if ($("#ufRulesBody .uf-rule-row").length === 1) {
			HELPER.showToast("Mantenha ao menos uma UF destino.", "warning");
			return;
		}

		$row.remove();
		TRIBUTACAO_ESTADUAL.atualizarIndicadores();
	}
};

TRIBUTACAO_ESTADUAL.onLinhaChange = function () {
	var $input = $(this);
	var $row = $input.closest(".uf-rule-row");

	if ($input.hasClass("cfop")) {
		$input.val(String($input.val() || "").replace(/\D/g, "").slice(0, 4));
	}

	TRIBUTACAO_ESTADUAL.clearFieldError.call(this);
	TRIBUTACAO_ESTADUAL.atualizarVisibilidadeLinha($row);
	TRIBUTACAO_ESTADUAL.atualizarIndicadores();
};

TRIBUTACAO_ESTADUAL.atualizarIndicadores = function () {
	var total = $("#ufRulesBody .uf-rule-row").length;
	var adicionais = [];

	$("#ufRulesBody .uf-rule-row").each(function () {
		var uf = $(this).find(".uf-destino").val();

		if (uf) {
			adicionais.push(uf);
		}
	});

	$("#badgeIcms").text(total ? total + " UF(s) configurada(s)" : "Nenhuma UF configurada");
	$("#badgeRecursos").text(adicionais.length ? adicionais.slice(0, 5).join(", ") + (adicionais.length > 5 ? "..." : "") : "Informe as UFs");
	$("#badgeRecursos").toggleClass("bg-secondary-lt", !adicionais.length).toggleClass("bg-green-lt", !!adicionais.length);
};

TRIBUTACAO_ESTADUAL.validarFormulario = function () {
	var form = $("#formTributacaoEstadual").get(0);

	TRIBUTACAO_ESTADUAL.clearValidation();

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Revise os campos obrigatorios.", "warning");
		return false;
	}

	if (!TRIBUTACAO_ESTADUAL.validarRegrasUf()) {
		return false;
	}

	$(form).removeClass("was-validated");
	return true;
};

TRIBUTACAO_ESTADUAL.validarRegrasUf = function () {
	var valido = true;
	var ufs = {};

	if (!$("#ufRulesBody .uf-rule-row").length) {
		TRIBUTACAO_ESTADUAL.adicionarLinhaUf(null, { focusUf: true });
		TRIBUTACAO_ESTADUAL.toggleInvalid($("#ufRulesBody .uf-rule-row:first .uf-destino"), true, "Informe ao menos uma UF destino.");
		return false;
	}

	$("#ufRulesBody .uf-rule-row").each(function () {
		var $row = $(this);
		var uf = $row.find(".uf-destino").val();
		var cfop = $row.find(".cfop").val();
		var cst = $row.find(".cst-icms").val();
		var csosn = $row.find(".csosn").val();
		var possuiSt = $row.find(".possui-st").is(":checked");
		var possuiFcp = $row.find(".possui-fcp").is(":checked");
		var possuiDifal = $row.find(".possui-difal").is(":checked");
		var permiteCreditoSn = $row.find(".permite-credito-sn").is(":checked");
		var diferimento = $row.find(".diferimento").is(":checked");
		var beneficio = String($row.find(".motivo-beneficio").val() || "").trim();
		var possuiFcpSt = TRIBUTACAO_ESTADUAL.hasPercentValue($row.find(".aliquota-fcp-st"));
		var possuiFcpDifal = TRIBUTACAO_ESTADUAL.hasPercentValue($row.find(".aliquota-fcp-difal"));
		var percentualInvalido = TRIBUTACAO_ESTADUAL.getPercentualForaDoLimite($row);

		if (!uf) {
			TRIBUTACAO_ESTADUAL.toggleInvalid($row.find(".uf-destino"), true, "Informe a UF destino.");
			valido = false;
			return false;
		}

		if (percentualInvalido) {
			TRIBUTACAO_ESTADUAL.toggleInvalid(percentualInvalido, true, "Informe percentual entre 0 e 999,9999.");
			valido = false;
			return false;
		}

		if (ufs[uf]) {
			TRIBUTACAO_ESTADUAL.toggleInvalid($row.find(".uf-destino"), true, "UF ja informada em outra linha.");
			valido = false;
			return false;
		}

		ufs[uf] = true;

		if (cfop && !/^\d{4}$/.test(cfop)) {
			TRIBUTACAO_ESTADUAL.toggleInvalid($row.find(".cfop"), true, "Informe um CFOP com 4 digitos.");
			valido = false;
			return false;
		}

		if (cst && csosn) {
			TRIBUTACAO_ESTADUAL.toggleInvalid($row.find(".csosn"), true, "Use CST ou CSOSN, nao ambos.");
			valido = false;
			return false;
		}

		if (possuiSt && !TRIBUTACAO_ESTADUAL.hasPercentValue($row.find(".mva"))) {
			TRIBUTACAO_ESTADUAL.toggleInvalid($row.find(".mva"), true, "Informe MVA para ST.");
			valido = false;
			return false;
		}

		if (possuiSt && !$row.find(".modalidade-bc-st").val()) {
			TRIBUTACAO_ESTADUAL.toggleInvalid($row.find(".modalidade-bc-st"), true, "Informe Modalidade BC ST.");
			valido = false;
			return false;
		}

		if (possuiFcp && !TRIBUTACAO_ESTADUAL.anyPercentValue([$row.find(".aliquota-fcp"), $row.find(".aliquota-fcp-st"), $row.find(".aliquota-fcp-difal")])) {
			TRIBUTACAO_ESTADUAL.toggleInvalid($row.find(".aliquota-fcp"), true, "Informe percentual FCP.");
			valido = false;
			return false;
		}

		if (possuiFcpSt && !possuiSt) {
			TRIBUTACAO_ESTADUAL.toggleInvalid($row.find(".aliquota-fcp-st"), true, "FCP-ST exige ST ativo na mesma UF.");
			valido = false;
			return false;
		}

		if (possuiFcpDifal && !possuiDifal) {
			TRIBUTACAO_ESTADUAL.toggleInvalid($row.find(".aliquota-fcp-difal"), true, "FCP DIFAL exige DIFAL ativo na mesma UF.");
			valido = false;
			return false;
		}

		if (possuiDifal && !TRIBUTACAO_ESTADUAL.hasPercentValue($row.find(".aliquota-interestadual"))) {
			TRIBUTACAO_ESTADUAL.toggleInvalid($row.find(".aliquota-interestadual"), true, "Informe aliquota interestadual.");
			valido = false;
			return false;
		}

		if (possuiDifal && !TRIBUTACAO_ESTADUAL.hasPercentValue($row.find(".aliquota-interna-destino"))) {
			TRIBUTACAO_ESTADUAL.toggleInvalid($row.find(".aliquota-interna-destino"), true, "Informe aliquota interna.");
			valido = false;
			return false;
		}

		if (possuiDifal && !$row.find(".consumidor-final").is(":checked")) {
			TRIBUTACAO_ESTADUAL.toggleInvalid($row.find(".consumidor-final"), true, "DIFAL exige consumidor final.");
			valido = false;
			return false;
		}

		if (beneficio && !String($row.find(".cbenef").val() || "").trim() && !String($row.find(".codigo-beneficio-uf").val() || "").trim()) {
			TRIBUTACAO_ESTADUAL.toggleInvalid($row.find(".cbenef"), true, "Informe cBenef ou codigo UF.");
			valido = false;
			return false;
		}

		if (diferimento && !TRIBUTACAO_ESTADUAL.hasPercentValue($row.find(".percentual-diferimento"))) {
			TRIBUTACAO_ESTADUAL.toggleInvalid($row.find(".percentual-diferimento"), true, "Informe percentual de diferimento.");
			valido = false;
			return false;
		}

		if (permiteCreditoSn && !TRIBUTACAO_ESTADUAL.hasPercentValue($row.find(".percentual-credito-sn"))) {
			TRIBUTACAO_ESTADUAL.toggleInvalid($row.find(".percentual-credito-sn"), true, "Informe percentual de credito SN.");
			valido = false;
			return false;
		}
	});

	if (!valido) {
		$("#ufRulesBody .is-invalid:first").trigger("focus");
	}

	return valido;
};

TRIBUTACAO_ESTADUAL.getFormData = function () {
	return {
		id: TRIBUTACAO_ESTADUAL.intOrNull($("#tributacaoEstadualId").val()),
		descricao: TRIBUTACAO_ESTADUAL.valueOrNull($("#descricao").val()),
		codigo_interno: TRIBUTACAO_ESTADUAL.valueOrNull($("#codigoInterno").val()),
		ativo: $("#ativo").is(":checked"),
		observacao_interna: TRIBUTACAO_ESTADUAL.valueOrNull($("#observacaoInterna").val()),
		observacoes: TRIBUTACAO_ESTADUAL.valueOrNull($("#observacoes").val()),
		regras_uf: TRIBUTACAO_ESTADUAL.getRegrasUf()
	};
};

TRIBUTACAO_ESTADUAL.getRegrasUf = function () {
	var rows = [];

	$("#ufRulesBody .uf-rule-row").each(function () {
		rows.push(TRIBUTACAO_ESTADUAL.getLinhaData($(this)));
	});

	return rows;
};

TRIBUTACAO_ESTADUAL.getLinhaData = function ($row) {
	return {
		id: TRIBUTACAO_ESTADUAL.intOrNull($row.attr("data-regra-id")),
		tributacao_estadual_id: TRIBUTACAO_ESTADUAL.intOrNull($("#tributacaoEstadualId").val()),
		uf_destino: TRIBUTACAO_ESTADUAL.valueOrNull($row.find(".uf-destino").val()),
		cfop: TRIBUTACAO_ESTADUAL.valueOrNull($row.find(".cfop").val()),
		tipo_operacao: TRIBUTACAO_ESTADUAL.valueOrNull($row.find(".tipo-operacao").val()),
		finalidade_operacao: TRIBUTACAO_ESTADUAL.valueOrNull($row.find(".finalidade-operacao").val()),
		prioridade_aplicacao: TRIBUTACAO_ESTADUAL.intOrDefault($row.find(".prioridade-aplicacao").val(), 10),
		consumidor_final: $row.find(".consumidor-final").is(":checked"),
		contribuinte_icms: $row.find(".contribuinte-icms").is(":checked"),
		aplicar_venda: $row.find(".aplicar-venda").is(":checked"),
		aplicar_compra: $row.find(".aplicar-compra").is(":checked"),
		cst_icms: TRIBUTACAO_ESTADUAL.valueOrNull($row.find(".cst-icms").val()),
		csosn: TRIBUTACAO_ESTADUAL.valueOrNull($row.find(".csosn").val()),
		origem_mercadoria: TRIBUTACAO_ESTADUAL.valueOrNull($row.find(".origem-mercadoria").val()),
		aliquota_icms: TRIBUTACAO_ESTADUAL.percentToDatabase($row.find(".aliquota-icms").val()),
		reducao_bc: TRIBUTACAO_ESTADUAL.percentToDatabase($row.find(".reducao-bc").val()),
		modalidade_bc: TRIBUTACAO_ESTADUAL.valueOrNull($row.find(".modalidade-bc").val()),
		possui_st: $row.find(".possui-st").is(":checked"),
		mva: TRIBUTACAO_ESTADUAL.percentToDatabase($row.find(".mva").val()),
		aliquota_icms_st: TRIBUTACAO_ESTADUAL.percentToDatabase($row.find(".aliquota-icms-st").val()),
		modalidade_bc_st: TRIBUTACAO_ESTADUAL.valueOrNull($row.find(".modalidade-bc-st").val()),
		reducao_bc_st: TRIBUTACAO_ESTADUAL.percentToDatabase($row.find(".reducao-bc-st").val()),
		possui_fcp: $row.find(".possui-fcp").is(":checked"),
		aliquota_fcp: TRIBUTACAO_ESTADUAL.percentToDatabase($row.find(".aliquota-fcp").val()),
		aliquota_fcp_st: TRIBUTACAO_ESTADUAL.percentToDatabase($row.find(".aliquota-fcp-st").val()),
		aliquota_fcp_difal: TRIBUTACAO_ESTADUAL.percentToDatabase($row.find(".aliquota-fcp-difal").val()),
		possui_difal: $row.find(".possui-difal").is(":checked"),
		aliquota_interestadual: TRIBUTACAO_ESTADUAL.percentToDatabase($row.find(".aliquota-interestadual").val()),
		aliquota_interna_destino: TRIBUTACAO_ESTADUAL.percentToDatabase($row.find(".aliquota-interna-destino").val()),
		percentual_partilha_destino: $row.find(".possui-difal").is(":checked") ? (TRIBUTACAO_ESTADUAL.percentToDatabase($row.find(".percentual-partilha-destino").val()) || "100.0000") : null,
		permite_credito_sn: $row.find(".permite-credito-sn").is(":checked"),
		percentual_credito_sn: TRIBUTACAO_ESTADUAL.percentToDatabase($row.find(".percentual-credito-sn").val()),
		diferimento: $row.find(".diferimento").is(":checked"),
		percentual_diferimento: TRIBUTACAO_ESTADUAL.percentToDatabase($row.find(".percentual-diferimento").val()),
		cbenef: TRIBUTACAO_ESTADUAL.valueOrNull($row.find(".cbenef").val()),
		codigo_beneficio_uf: TRIBUTACAO_ESTADUAL.valueOrNull($row.find(".codigo-beneficio-uf").val()),
		motivo_beneficio: TRIBUTACAO_ESTADUAL.valueOrNull($row.find(".motivo-beneficio").val()),
		ativo: $row.find(".regra-ativa").is(":checked")
	};
};

TRIBUTACAO_ESTADUAL.limparFormulario = function () {
	var form = $("#formTributacaoEstadual").get(0);

	form.reset();
	$("#tributacaoEstadualId").val("");
	$("#ativo").prop("checked", true);
	$("#ufRulesBody").empty();
	$("#formTributacaoEstadual").removeClass("was-validated");
	TRIBUTACAO_ESTADUAL.clearValidation();
	TRIBUTACAO_ESTADUAL.adicionarLinhaUf();
	$("#descricao").trigger("focus");
};

TRIBUTACAO_ESTADUAL.initMasks = function (context) {
	if (!window.IMask) {
		return;
	}

	var $root = context ? $(context) : $(document);

	$root.find(".js-percent").each(function () {
		if (this.dataset.masked === "1") {
			return;
		}

		this.dataset.masked = "1";
		TRIBUTACAO_ESTADUAL.masks[this.dataset.maskId || this.name || this.className + TRIBUTACAO_ESTADUAL.rowIndex] = window.IMask(this, {
			mask: Number,
			scale: 4,
			signed: false,
			thousandsSeparator: ".",
			padFractionalZeros: false,
			normalizeZeros: true,
			radix: ",",
			mapToRadix: ["."],
			min: 0,
			max: 999.9999
		});
	});
};

TRIBUTACAO_ESTADUAL.hasPercentValue = function (input) {
	return TRIBUTACAO_ESTADUAL.percentToNumber($(input).val()) > 0;
};

TRIBUTACAO_ESTADUAL.anyPercentValue = function (inputs) {
	return inputs.some(function (input) {
		return TRIBUTACAO_ESTADUAL.hasPercentValue(input);
	});
};

TRIBUTACAO_ESTADUAL.getPercentualForaDoLimite = function ($row) {
	var invalido = null;

	$row.find(".js-percent").each(function () {
		var value = String($(this).val() || "").trim();
		var number = TRIBUTACAO_ESTADUAL.percentToNumber(value);

		if (value && (number < 0 || number > 999.9999)) {
			invalido = this;
			return false;
		}
	});

	return invalido;
};

TRIBUTACAO_ESTADUAL.percentToNumber = function (value) {
	var text = String(value || "");
	var normalized = text.indexOf(",") !== -1 ? text.replace(/\./g, "").replace(",", ".") : text;
	var number = parseFloat(normalized);

	return Number.isFinite(number) ? number : 0;
};

TRIBUTACAO_ESTADUAL.percentToDatabase = function (value) {
	var text = String(value || "").trim();

	if (!text) {
		return null;
	}

	return TRIBUTACAO_ESTADUAL.percentToNumber(text).toFixed(4);
};

TRIBUTACAO_ESTADUAL.formatPercentValue = function (value) {
	var text = String(value || "").trim();

	if (!text) {
		return "";
	}

	return TRIBUTACAO_ESTADUAL.percentToNumber(text).toLocaleString("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 4
	});
};

TRIBUTACAO_ESTADUAL.valueOrNull = function (value) {
	var text = String(value || "").trim();

	return text ? text : null;
};

TRIBUTACAO_ESTADUAL.intOrNull = function (value) {
	var number = parseInt(value, 10);

	return Number.isFinite(number) ? number : null;
};

TRIBUTACAO_ESTADUAL.intOrDefault = function (value, defaultValue) {
	var number = TRIBUTACAO_ESTADUAL.intOrNull(value);

	return number === null ? defaultValue : number;
};

TRIBUTACAO_ESTADUAL.clearFieldError = function () {
	var $input = $(this);

	$input.removeClass("is-invalid");
	$input.closest("td").removeClass("border border-danger").removeAttr("title");
};

TRIBUTACAO_ESTADUAL.toggleInvalid = function (input, invalid, message) {
	var $input = $(input);
	var $cell = $input.closest("td");

	$input.removeClass("is-invalid");
	$cell.removeClass("border border-danger").removeAttr("title");

	if (!invalid) {
		return;
	}

	$input.addClass("is-invalid");
	$cell.addClass("border border-danger").attr("title", message);
};

TRIBUTACAO_ESTADUAL.clearValidation = function () {
	var $form = $("#formTributacaoEstadual");

	$form.find(".is-invalid").removeClass("is-invalid");
	$form.find("td.border-danger").removeClass("border border-danger").removeAttr("title");
};
