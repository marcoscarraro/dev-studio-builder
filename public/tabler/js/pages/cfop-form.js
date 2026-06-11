const CFOP = window.CFOP || {};
window.CFOP = CFOP;

CFOP.masks = {};
CFOP.lastAutoDescricao = "";

$(document).ready(function () {
	CFOP.init();
});

CFOP.init = function () {
	CFOP.initializeComponents();
	CFOP.bindEvents();
	CFOP.loadInitialData();
};

CFOP.initializeComponents = function () {
	CFOP.initMasks();
	CFOP.atualizarIndicadores();
};

CFOP.bindEvents = function () {
	$("#btnHeaderSave").on("click", CFOP.acionarSalvar);
	$("#btnHeaderSaveNew").on("click", CFOP.salvarNovo);
	$("#btnSaveNew").on("click", CFOP.salvarNovo);
	$("#formCfop").on("submit", CFOP.salvarFormulario);
	$("#cfop").on("input", CFOP.onCfopInput);
	$("#classificacaoAutomatica, #abrangenciaOperacao, #tipoOperacao").on("change", CFOP.atualizarIndicadores);
	$("#descricao, #cfop, #classificacaoAutomatica, #tipoOperacao").on("input change", CFOP.validarCampoImediato);
};

CFOP.loadInitialData = function () {
	CFOP.sugerirDadosPeloCfop();
};

CFOP.acionarSalvar = function () {
	$("#btnSalvar").trigger("click");
};

CFOP.salvarFormulario = function (event) {
	event.preventDefault();

	if (!CFOP.validarFormulario()) {
		return;
	}

	CFOP.salvar(false, "#btnSalvar");
};

CFOP.salvarNovo = function (event) {
	if (!CFOP.validarFormulario()) {
		return;
	}

	var button = event && event.currentTarget ? "#" + event.currentTarget.id : "#btnSaveNew";

	CFOP.salvar(true, button);
};

CFOP.salvar = function (limpar, button) {
	HELPER.ajaxPost("/api/cfops", CFOP.getFormData(), {
		button: button,
		form: "#formCfop",
		success: function (response) {
			if (!response || !response.message) {
				HELPER.showToast(limpar ? "CFOP salvo. Pronto para novo cadastro." : "CFOP salvo com sucesso.", "success");
			}

			if (limpar) {
				CFOP.limparFormulario();
			}
		},
		error: function () {}
	});
};

CFOP.onCfopInput = function () {
	this.value = HELPER.normalizeDigits(this.value).substring(0, 4);
	CFOP.sugerirDadosPeloCfop();
	CFOP.validarCampoImediato.call(this);
};

CFOP.sugerirDadosPeloCfop = function () {
	var cfop = HELPER.normalizeDigits($("#cfop").val());
	var sugestao = CFOP.getSugestaoPorPrefixo(cfop);

	if (cfop.length === 4 && sugestao.tipo && !$("#tipoOperacao").val()) {
		$("#tipoOperacao").val(sugestao.tipo);
	}

	if (cfop.length === 4 && sugestao.abrangencia && !$("#abrangenciaOperacao").val()) {
		$("#abrangenciaOperacao").val(sugestao.abrangencia);
	}

	CFOP.atualizarIndicadores();
};

CFOP.atualizarIndicadores = function () {
	var classificacao = $("#classificacaoAutomatica").val() || "Classificacao pendente";
	var abrangencia = $("#abrangenciaOperacao").val() || "Abrangencia nao definida";
	var tipo = $("#tipoOperacao").val();

	$("#badgeClassificacao").text(classificacao);
	$("#badgeAbrangencia").text(abrangencia);
	$("#badgeClassificacao")
		.removeClass("bg-blue-lt bg-green-lt bg-orange-lt bg-secondary-lt")
		.addClass(tipo === "entrada" ? "bg-blue-lt" : (tipo === "saida" ? "bg-green-lt" : "bg-secondary-lt"));
};

CFOP.validarFormulario = function () {
	var form = $("#formCfop").get(0);

	CFOP.clearValidation();

	if (!CFOP.validarCfop()) {
		HELPER.showToast("Informe um CFOP valido com 4 digitos.", "warning");
		return false;
	}

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Revise os campos obrigatorios.", "warning");
		return false;
	}

	$(form).removeClass("was-validated");
	return true;
};

CFOP.validarCfop = function () {
	var cfop = HELPER.normalizeDigits($("#cfop").val());
	var valido = /^\d{4}$/.test(cfop);

	CFOP.toggleInvalid("#cfop", !valido, "Informe exatamente 4 digitos numericos.");

	return valido;
};

CFOP.validarCampoImediato = function () {
	var selector = "#" + this.id;

	if (selector === "#cfop") {
		CFOP.validarCfop();
		return;
	}

	if ($(this).prop("required")) {
		CFOP.toggleInvalid(selector, !this.checkValidity(), "Campo obrigatorio.");
	}
};

CFOP.getFormData = function () {
	var data = {};

	$("#formCfop").serializeArray().forEach(function (item) {
		data[item.name] = item.value;
	});

	$("#formCfop input[type='checkbox']").each(function () {
		data[this.name] = $(this).is(":checked");
	});

	return data;
};

CFOP.limparFormulario = function () {
	var form = $("#formCfop").get(0);

	form.reset();
	CFOP.lastAutoDescricao = "";
	$("#ativo").prop("checked", true);
	$("[name='movimenta_estoque'], [name='movimenta_financeiro'], [name='permite_devolucao']").prop("checked", true);
	$("#consumidorFinal").val("Automatico");
	$("#indicadorPresenca").val("Nao se aplica");
	$("#finalidadeNfe").val("Normal");
	$("#tipoFretePadrao").val("Sem frete");
	$("#formCfop").removeClass("was-validated");
	CFOP.clearValidation();
	CFOP.atualizarIndicadores();
	$("#cfop").trigger("focus");
};

CFOP.initMasks = function () {
	if (!window.IMask) {
		return;
	}

	var element = document.getElementById("cfop");

	if (element) {
		CFOP.masks.cfop = window.IMask(element, { mask: "0000" });
	}
};

CFOP.getSugestaoPorPrefixo = function (cfop) {
	var prefixo = String(cfop || "").charAt(0);
	var map = {
		"1": { tipo: "entrada", abrangencia: "Interna" },
		"2": { tipo: "entrada", abrangencia: "Interestadual" },
		"3": { tipo: "entrada", abrangencia: "Exterior" },
		"5": { tipo: "saida", abrangencia: "Interna" },
		"6": { tipo: "saida", abrangencia: "Interestadual" },
		"7": { tipo: "saida", abrangencia: "Exterior" }
	};

	return map[prefixo] || {};
};

CFOP.toggleInvalid = function (selector, invalid, message) {
	var $input = $(selector);

	$input.removeClass("is-invalid");
	$input.next(".invalid-feedback.d-block").remove();

	if (!invalid) {
		return;
	}

	$input.addClass("is-invalid");

	if (!$input.next(".invalid-feedback").length) {
		$input.after('<div class="invalid-feedback d-block">' + message + "</div>");
	}
};

CFOP.clearValidation = function () {
	var $form = $("#formCfop");

	$form.find(".is-invalid").removeClass("is-invalid");
	$form.find(".invalid-feedback.d-block").remove();
};
