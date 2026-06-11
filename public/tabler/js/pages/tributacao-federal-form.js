const TRIBUTACAO_FEDERAL = window.TRIBUTACAO_FEDERAL || {};
window.TRIBUTACAO_FEDERAL = TRIBUTACAO_FEDERAL;

TRIBUTACAO_FEDERAL.masks = {};
TRIBUTACAO_FEDERAL.numericFields = [
	"aliquota_pis",
	"valor_pis_unidade",
	"reducao_bc_pis",
	"percentual_credito_pis",
	"aliquota_cofins",
	"valor_cofins_unidade",
	"reducao_bc_cofins",
	"percentual_credito_cofins",
	"aliquota_ipi",
	"reducao_bc_ipi",
	"aliquota_ii",
	"reducao_bc_ii",
	"percentual_pis_retido",
	"percentual_cofins_retido",
	"percentual_csll",
	"percentual_irrf",
	"percentual_inss",
	"valor_minimo_retencao",
	"aliquota_pis_monofasico",
	"aliquota_cofins_monofasico"
];
TRIBUTACAO_FEDERAL.dateFields = ["vigencia_inicio", "vigencia_fim"];
TRIBUTACAO_FEDERAL.digitFields = ["cnpj_produtor"];
TRIBUTACAO_FEDERAL.textFields = [
	"descricao",
	"codigo_interno",
	"observacao_interna",
	"observacoes",
	"cst_pis",
	"tipo_calculo_pis",
	"cst_cofins",
	"tipo_calculo_cofins",
	"cst_ipi",
	"codigo_enquadramento_ipi",
	"classe_enquadramento",
	"selo_controle",
	"cbenef",
	"tributo_beneficiado",
	"codigo_beneficio_federal",
	"descricao_beneficio"
];
TRIBUTACAO_FEDERAL.booleanFields = [
	"ativo",
	"possui_credito_pis",
	"possui_credito_cofins",
	"possui_ipi",
	"possui_ii",
	"retem_pis",
	"retem_cofins",
	"retem_csll",
	"retem_irrf",
	"retem_inss",
	"produto_monofasico",
	"incidencia_concentrada",
	"permite_credito_revenda",
	"possui_beneficio"
];

$(document).ready(function () {
	TRIBUTACAO_FEDERAL.init();
});

TRIBUTACAO_FEDERAL.init = function () {
	TRIBUTACAO_FEDERAL.initializeComponents();
	TRIBUTACAO_FEDERAL.bindEvents();
	TRIBUTACAO_FEDERAL.loadInitialData();
};

TRIBUTACAO_FEDERAL.initializeComponents = function () {
	TRIBUTACAO_FEDERAL.initMasks();
	TRIBUTACAO_FEDERAL.toggleAll();
	TRIBUTACAO_FEDERAL.toggleCalculoPIS();
	TRIBUTACAO_FEDERAL.toggleCalculoCOFINS();
	TRIBUTACAO_FEDERAL.atualizarIndicadores();
};

TRIBUTACAO_FEDERAL.bindEvents = function () {
	$("#btnHeaderSave").on("click", TRIBUTACAO_FEDERAL.acionarSalvar);
	$("#btnHeaderSaveNew").on("click", TRIBUTACAO_FEDERAL.salvarNovo);
	$("#btnSaveNew").on("click", TRIBUTACAO_FEDERAL.salvarNovo);
	$("#formTributacaoFederal").on("submit", TRIBUTACAO_FEDERAL.salvarFormulario);

	$("[data-toggle-target]").on("change", TRIBUTACAO_FEDERAL.onToggleChange);
	$("#tipo_calculo_pis").on("change", TRIBUTACAO_FEDERAL.toggleCalculoPIS);
	$("#tipo_calculo_cofins").on("change", TRIBUTACAO_FEDERAL.toggleCalculoCOFINS);
	$("#produto_monofasico").on("change", TRIBUTACAO_FEDERAL.sugerirCstMonofasico);
	$("#btnConfirmarCstMonofasico").on("click", TRIBUTACAO_FEDERAL.aplicarCstMonofasico);
	$("#modalConfirmarCstMonofasico [data-bs-dismiss='modal']").on("click", TRIBUTACAO_FEDERAL.fecharModalCstMonofasico);
	$("#cst_pis, #cst_cofins, #possui_ipi, #possui_ii, .js-retencao, #produto_monofasico, #possui_beneficio").on("change", TRIBUTACAO_FEDERAL.atualizarIndicadores);
	$("#formTributacaoFederal input, #formTributacaoFederal select, #formTributacaoFederal textarea").on("input change", TRIBUTACAO_FEDERAL.clearFieldError);
};

TRIBUTACAO_FEDERAL.loadInitialData = function () {
};

TRIBUTACAO_FEDERAL.acionarSalvar = function () {
	$("#btnSalvar").trigger("click");
};

TRIBUTACAO_FEDERAL.salvarFormulario = function (event) {
	event.preventDefault();

	if (!TRIBUTACAO_FEDERAL.validarFormulario()) {
		return;
	}

	TRIBUTACAO_FEDERAL.salvar(false, "#btnSalvar");
};

TRIBUTACAO_FEDERAL.salvarNovo = function (event) {
	if (!TRIBUTACAO_FEDERAL.validarFormulario()) {
		return;
	}

	var button = event && event.currentTarget ? "#" + event.currentTarget.id : "#btnSaveNew";

	TRIBUTACAO_FEDERAL.salvar(true, button);
};

TRIBUTACAO_FEDERAL.salvar = function (limpar, button) {
	HELPER.ajaxPost("/api/tributacoes-federais", TRIBUTACAO_FEDERAL.getFormData(), {
		button: button,
		form: "#formTributacaoFederal",
		success: function (response) {
			if (!response || !response.message) {
				HELPER.showToast(limpar ? "Tributacao federal salva. Pronta para novo cadastro." : "Tributacao federal salva com sucesso.", "success");
			}

			if (limpar) {
				TRIBUTACAO_FEDERAL.limparFormulario();
			}
		},
		error: function () {}
	});
};

TRIBUTACAO_FEDERAL.onToggleChange = function () {
	TRIBUTACAO_FEDERAL.toggleByElement(this);
	TRIBUTACAO_FEDERAL.atualizarIndicadores();
};

TRIBUTACAO_FEDERAL.toggleAll = function () {
	$("[data-toggle-target]").each(function () {
		TRIBUTACAO_FEDERAL.toggleByElement(this);
	});
};

TRIBUTACAO_FEDERAL.toggleByElement = function (element) {
	var $element = $(element);
	var target = $element.data("toggle-target");

	if (!target || !$(target).length) {
		return;
	}

	var $target = $(target);

	if ($element.is(":checked")) {
		if ($target.hasClass("collapse")) {
			$target.addClass("show");
		} else {
			$target.removeClass("d-none");
		}
		return;
	}

	if ($target.hasClass("collapse")) {
		$target.removeClass("show");
	} else {
		$target.addClass("d-none");
	}

	$target.find("input:not([type='checkbox']), select, textarea").val("").removeClass("is-invalid");
	$target.find("input[type='checkbox']").prop("checked", false);
	$target.find(".invalid-feedback.d-block").remove();
};

TRIBUTACAO_FEDERAL.toggleCalculoPIS = function () {
	TRIBUTACAO_FEDERAL.toggleCalculo("#tipo_calculo_pis", "[data-pis-calculo]");
};

TRIBUTACAO_FEDERAL.toggleCalculoCOFINS = function () {
	TRIBUTACAO_FEDERAL.toggleCalculo("#tipo_calculo_cofins", "[data-cofins-calculo]");
};

TRIBUTACAO_FEDERAL.toggleCalculo = function (select, selector) {
	var tipo = $(select).val();

	$(selector).each(function () {
		var $group = $(this);
		var visible = $group.attr(selector.indexOf("pis") !== -1 ? "data-pis-calculo" : "data-cofins-calculo") === tipo;

		$group.toggleClass("d-none", !visible);

		if (!visible) {
			$group.find("input").val("").removeClass("is-invalid");
			$group.find(".invalid-feedback.d-block").remove();
		}
	});
};

TRIBUTACAO_FEDERAL.sugerirCstMonofasico = function () {
	if (!$("#produto_monofasico").is(":checked")) {
		return;
	}

	if ($("#cst_pis").val() === "04" && $("#cst_cofins").val() === "04") {
		return;
	}

	TRIBUTACAO_FEDERAL.abrirModalCstMonofasico();
};

TRIBUTACAO_FEDERAL.aplicarCstMonofasico = function () {
	$("#cst_pis").val("04").removeClass("is-invalid");
	$("#cst_cofins").val("04").removeClass("is-invalid");
	$("#cst_pis, #cst_cofins").next(".invalid-feedback.d-block").remove();

	TRIBUTACAO_FEDERAL.fecharModalCstMonofasico();
	TRIBUTACAO_FEDERAL.atualizarIndicadores();
	HELPER.showToast("CST PIS e COFINS 04 aplicados para tributacao monofasica.", "info");
};

TRIBUTACAO_FEDERAL.abrirModalCstMonofasico = function () {
	var element = document.getElementById("modalConfirmarCstMonofasico");

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

TRIBUTACAO_FEDERAL.fecharModalCstMonofasico = function () {
	var element = document.getElementById("modalConfirmarCstMonofasico");

	if (!element) {
		return;
	}

	if (window.bootstrap && window.bootstrap.Modal) {
		window.bootstrap.Modal.getOrCreateInstance(element).hide();
		return;
	}

	$(element).removeClass("show").css("display", "none").removeAttr("aria-modal").attr("aria-hidden", "true");
	$("body").removeClass("modal-open");
};

TRIBUTACAO_FEDERAL.atualizarIndicadores = function () {
	var pis = $("#cst_pis").val();
	var cofins = $("#cst_cofins").val();
	var recursos = [];

	if ($("#possui_ipi").is(":checked")) recursos.push("IPI");
	if ($("#possui_ii").is(":checked")) recursos.push("II");
	if ($(".js-retencao:checked").length) recursos.push("Retencoes");
	if ($("#produto_monofasico").is(":checked")) recursos.push("Monofasico");
	if ($("#possui_beneficio").is(":checked")) recursos.push("Beneficio");

	$("#badgePisCofins").text(pis || cofins ? "CST PIS " + (pis || "-") + " / COFINS " + (cofins || "-") : "PIS/COFINS nao configurado");
	$("#badgeRecursos").text(recursos.length ? recursos.join(" + ") : "Sem adicionais");
	$("#badgeRecursos").toggleClass("bg-secondary-lt", !recursos.length).toggleClass("bg-green-lt", !!recursos.length);
};

TRIBUTACAO_FEDERAL.validarFormulario = function () {
	var form = $("#formTributacaoFederal").get(0);

	TRIBUTACAO_FEDERAL.clearValidation();

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Revise os campos obrigatorios.", "warning");
		return false;
	}

	if (!TRIBUTACAO_FEDERAL.validarRegrasFiscais()) {
		return false;
	}

	$(form).removeClass("was-validated");
	return true;
};

TRIBUTACAO_FEDERAL.validarRegrasFiscais = function () {
	if (!TRIBUTACAO_FEDERAL.validarObrigatorio("#descricao", "Informe a descricao da tributacao.")) return false;
	if (!TRIBUTACAO_FEDERAL.validarObrigatorio("#cst_pis", "Informe o CST PIS.")) return false;
	if (!TRIBUTACAO_FEDERAL.validarObrigatorio("#cst_cofins", "Informe o CST COFINS.")) return false;
	if (!TRIBUTACAO_FEDERAL.validarObrigatorio("#tipo_calculo_pis", "Informe o tipo de calculo PIS.")) return false;
	if (!TRIBUTACAO_FEDERAL.validarObrigatorio("#tipo_calculo_cofins", "Informe o tipo de calculo COFINS.")) return false;

	if (!TRIBUTACAO_FEDERAL.validarPisCofins()) return false;
	if (!TRIBUTACAO_FEDERAL.validarIPI()) return false;
	if (!TRIBUTACAO_FEDERAL.validarII()) return false;
	if (!TRIBUTACAO_FEDERAL.validarRetencoes()) return false;
	if (!TRIBUTACAO_FEDERAL.validarMonofasico()) return false;
	if (!TRIBUTACAO_FEDERAL.validarBeneficio()) return false;

	return true;
};

TRIBUTACAO_FEDERAL.validarPisCofins = function () {
	var pisTributavel = ["01", "02"].indexOf($("#cst_pis").val()) !== -1;
	var cofinsTributavel = ["01", "02"].indexOf($("#cst_cofins").val()) !== -1;

	if ($("#tipo_calculo_pis").val() === "Percentual" && pisTributavel && !TRIBUTACAO_FEDERAL.hasNumberValue("#aliquota_pis")) {
		return TRIBUTACAO_FEDERAL.fail("#aliquota_pis", "Informe a aliquota PIS.");
	}

	if ($("#tipo_calculo_pis").val() === "Valor por Quantidade" && $("#cst_pis").val() === "03" && !TRIBUTACAO_FEDERAL.hasNumberValue("#valor_pis_unidade")) {
		return TRIBUTACAO_FEDERAL.fail("#valor_pis_unidade", "Informe o valor PIS por unidade.");
	}

	if ($("#tipo_calculo_cofins").val() === "Percentual" && cofinsTributavel && !TRIBUTACAO_FEDERAL.hasNumberValue("#aliquota_cofins")) {
		return TRIBUTACAO_FEDERAL.fail("#aliquota_cofins", "Informe a aliquota COFINS.");
	}

	if ($("#tipo_calculo_cofins").val() === "Valor por Quantidade" && $("#cst_cofins").val() === "03" && !TRIBUTACAO_FEDERAL.hasNumberValue("#valor_cofins_unidade")) {
		return TRIBUTACAO_FEDERAL.fail("#valor_cofins_unidade", "Informe o valor COFINS por unidade.");
	}

	if ($("#possui_credito_pis").is(":checked") && !TRIBUTACAO_FEDERAL.hasNumberValue("#percentual_credito_pis")) {
		return TRIBUTACAO_FEDERAL.fail("#percentual_credito_pis", "Informe o percentual de credito PIS.");
	}

	if ($("#possui_credito_cofins").is(":checked") && !TRIBUTACAO_FEDERAL.hasNumberValue("#percentual_credito_cofins")) {
		return TRIBUTACAO_FEDERAL.fail("#percentual_credito_cofins", "Informe o percentual de credito COFINS.");
	}

	return true;
};

TRIBUTACAO_FEDERAL.validarIPI = function () {
	if (!$("#possui_ipi").is(":checked")) {
		return true;
	}

	if (!TRIBUTACAO_FEDERAL.validarObrigatorio("#cst_ipi", "Informe o CST IPI.")) return false;
	if (!TRIBUTACAO_FEDERAL.validarObrigatorio("#codigo_enquadramento_ipi", "Informe o codigo de enquadramento IPI.")) return false;

	if ($("#cst_ipi").val() === "50" && !TRIBUTACAO_FEDERAL.hasNumberValue("#aliquota_ipi")) {
		return TRIBUTACAO_FEDERAL.fail("#aliquota_ipi", "Informe a aliquota IPI para CST 50.");
	}

	return true;
};

TRIBUTACAO_FEDERAL.validarII = function () {
	if ($("#possui_ii").is(":checked") && !TRIBUTACAO_FEDERAL.hasNumberValue("#aliquota_ii")) {
		return TRIBUTACAO_FEDERAL.fail("#aliquota_ii", "Informe a aliquota II.");
	}

	return true;
};

TRIBUTACAO_FEDERAL.validarRetencoes = function () {
	var rules = [
		["#retem_pis", "#percentual_pis_retido", "Informe o percentual PIS retido."],
		["#retem_cofins", "#percentual_cofins_retido", "Informe o percentual COFINS retido."],
		["#retem_csll", "#percentual_csll", "Informe o percentual CSLL."],
		["#retem_irrf", "#percentual_irrf", "Informe o percentual IRRF."],
		["#retem_inss", "#percentual_inss", "Informe o percentual INSS."]
	];

	for (var i = 0; i < rules.length; i++) {
		if ($(rules[i][0]).is(":checked") && !TRIBUTACAO_FEDERAL.hasNumberValue(rules[i][1])) {
			return TRIBUTACAO_FEDERAL.fail(rules[i][1], rules[i][2]);
		}
	}

	return true;
};

TRIBUTACAO_FEDERAL.validarMonofasico = function () {
	if (!$("#produto_monofasico").is(":checked")) {
		return true;
	}

	if (!TRIBUTACAO_FEDERAL.hasNumberInput("#aliquota_pis_monofasico")) {
		return TRIBUTACAO_FEDERAL.fail("#aliquota_pis_monofasico", "Informe a aliquota PIS monofasico.");
	}

	if (!TRIBUTACAO_FEDERAL.hasNumberInput("#aliquota_cofins_monofasico")) {
		return TRIBUTACAO_FEDERAL.fail("#aliquota_cofins_monofasico", "Informe a aliquota COFINS monofasico.");
	}

	return true;
};

TRIBUTACAO_FEDERAL.validarBeneficio = function () {
	if (!$("#possui_beneficio").is(":checked")) {
		return true;
	}

	if (!TRIBUTACAO_FEDERAL.validarObrigatorio("#cbenef", "Informe o cBenef.")) return false;
	if (!TRIBUTACAO_FEDERAL.validarObrigatorio("#tributo_beneficiado", "Informe o tributo beneficiado.")) return false;

	return true;
};

TRIBUTACAO_FEDERAL.validarObrigatorio = function (selector, message) {
	if (String($(selector).val() || "").trim()) {
		return true;
	}

	return TRIBUTACAO_FEDERAL.fail(selector, message);
};

TRIBUTACAO_FEDERAL.fail = function (selector, message) {
	TRIBUTACAO_FEDERAL.toggleInvalid(selector, true, message);
	HELPER.showToast(message, "warning");
	TRIBUTACAO_FEDERAL.focusVisible(selector);
	return false;
};

TRIBUTACAO_FEDERAL.focusVisible = function (selector) {
	var $field = $(selector);
	var $collapse = $field.closest(".collapse");

	if ($collapse.length) {
		$collapse.addClass("show");
	}

	$field.trigger("focus");
};

TRIBUTACAO_FEDERAL.getFormData = function () {
	var data = {};

	TRIBUTACAO_FEDERAL.textFields.forEach(function (field) {
		data[field] = String($("#" + field).val() || "").trim();
	});

	TRIBUTACAO_FEDERAL.booleanFields.forEach(function (field) {
		data[field] = $("#" + field).is(":checked");
	});

	TRIBUTACAO_FEDERAL.numericFields.forEach(function (field) {
		data[field] = TRIBUTACAO_FEDERAL.toDatabaseNumber($("#" + field).val());
	});

	TRIBUTACAO_FEDERAL.dateFields.forEach(function (field) {
		data[field] = $("#" + field).val() || null;
	});

	TRIBUTACAO_FEDERAL.digitFields.forEach(function (field) {
		data[field] = HELPER.normalizeDigits($("#" + field).val() || "") || null;
	});

	TRIBUTACAO_FEDERAL.emptyStringToNull(data, [
		"codigo_interno",
		"observacao_interna",
		"observacoes",
		"cst_pis",
		"tipo_calculo_pis",
		"cst_cofins",
		"tipo_calculo_cofins",
		"cst_ipi",
		"codigo_enquadramento_ipi",
		"classe_enquadramento",
		"selo_controle",
		"cbenef",
		"tributo_beneficiado",
		"codigo_beneficio_federal",
		"descricao_beneficio"
	]);

	return data;
};

TRIBUTACAO_FEDERAL.limparFormulario = function () {
	var form = $("#formTributacaoFederal").get(0);

	form.reset();
	$("#ativo").prop("checked", true);
	$("#formTributacaoFederal").removeClass("was-validated");
	TRIBUTACAO_FEDERAL.clearValidation();
	TRIBUTACAO_FEDERAL.toggleAll();
	TRIBUTACAO_FEDERAL.toggleCalculoPIS();
	TRIBUTACAO_FEDERAL.toggleCalculoCOFINS();
	TRIBUTACAO_FEDERAL.atualizarIndicadores();
	$("#descricao").trigger("focus");
};

TRIBUTACAO_FEDERAL.initMasks = function () {
	if (!window.IMask) {
		return;
	}

	$(".js-percent").each(function () {
		TRIBUTACAO_FEDERAL.masks[this.id] = window.IMask(this, {
			mask: Number,
			scale: 4,
			signed: false,
			thousandsSeparator: ".",
			padFractionalZeros: false,
			normalizeZeros: true,
			radix: ",",
			mapToRadix: ["."],
			min: 0,
			max: 100
		});
	});

	$(".js-money-4").each(function () {
		TRIBUTACAO_FEDERAL.masks[this.id] = window.IMask(this, {
			mask: Number,
			scale: 4,
			signed: false,
			thousandsSeparator: ".",
			padFractionalZeros: false,
			normalizeZeros: true,
			radix: ",",
			mapToRadix: ["."],
			min: 0
		});
	});

	$(".js-money").each(function () {
		TRIBUTACAO_FEDERAL.masks[this.id] = window.IMask(this, {
			mask: Number,
			scale: 2,
			signed: false,
			thousandsSeparator: ".",
			padFractionalZeros: true,
			normalizeZeros: true,
			radix: ",",
			mapToRadix: ["."],
			min: 0
		});
	});

	$(".js-cnpj").each(function () {
		TRIBUTACAO_FEDERAL.masks[this.id] = window.IMask(this, {
			mask: "00.000.000/0000-00"
		});
	});
};

TRIBUTACAO_FEDERAL.hasNumberValue = function (selector) {
	return TRIBUTACAO_FEDERAL.toNumber($(selector).val()) > 0;
};

TRIBUTACAO_FEDERAL.hasNumberInput = function (selector) {
	return TRIBUTACAO_FEDERAL.toDatabaseNumber($(selector).val()) !== null;
};

TRIBUTACAO_FEDERAL.toNumber = function (value) {
	var normalized = String(value || "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);

	return Number.isFinite(number) ? number : 0;
};

TRIBUTACAO_FEDERAL.toDatabaseNumber = function (value) {
	var normalized = String(value || "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);

	return Number.isFinite(number) ? number : null;
};

TRIBUTACAO_FEDERAL.emptyStringToNull = function (data, fields) {
	fields.forEach(function (field) {
		if (data[field] === "") {
			data[field] = null;
		}
	});
};

TRIBUTACAO_FEDERAL.clearFieldError = function () {
	$(this).removeClass("is-invalid");
	$(this).closest(".input-group").next(".invalid-feedback.d-block").remove();
	$(this).next(".invalid-feedback.d-block").remove();
};

TRIBUTACAO_FEDERAL.toggleInvalid = function (selector, invalid, message) {
	var $input = $(selector);
	var $target = $input.closest(".input-group").length ? $input.closest(".input-group") : $input;

	$input.removeClass("is-invalid");
	$target.next(".invalid-feedback.d-block").remove();

	if (!invalid) {
		return;
	}

	$input.addClass("is-invalid");
	$target.after('<div class="invalid-feedback d-block">' + message + "</div>");
};

TRIBUTACAO_FEDERAL.clearValidation = function () {
	var $form = $("#formTributacaoFederal");

	$form.find(".is-invalid").removeClass("is-invalid");
	$form.find(".invalid-feedback.d-block").remove();
};
