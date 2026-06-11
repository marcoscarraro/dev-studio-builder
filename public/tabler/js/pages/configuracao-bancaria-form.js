const CONFIGURACAO_BANCARIA = window.CONFIGURACAO_BANCARIA || {};
window.CONFIGURACAO_BANCARIA = CONFIGURACAO_BANCARIA;

CONFIGURACAO_BANCARIA.masks = {};

CONFIGURACAO_BANCARIA.bancos = {
	"banco-do-brasil": { nome: "Banco do Brasil", codigo: "001", api: "OAuth2 com certificado A1 para boleto, PIX e conciliacao.", agencia: "0000", conta: "00000-0" },
	"caixa-economica": { nome: "Caixa Economica", codigo: "104", api: "Integracao por convenio, beneficiario e certificado A1.", agencia: "0000", conta: "000000000-0" },
	"sicredi": { nome: "Sicredi", codigo: "748", api: "Parametros de cooperativa, posto, carteira e token de cobranca.", agencia: "0000", conta: "00000-0" },
	"sicoob": { nome: "Sicoob", codigo: "756", api: "OAuth2 com client credentials, certificado e chave PIX.", agencia: "0000", conta: "000000-0" },
	santander: { nome: "Santander", codigo: "033", api: "Client ID, secret e certificado para cobrancas registradas.", agencia: "0000", conta: "00000000-0" },
	itau: { nome: "Itau", codigo: "341", api: "Client credentials, certificado e parametros de carteira.", agencia: "0000", conta: "00000-0" },
	bradesco: { nome: "Bradesco", codigo: "237", api: "Chave API, certificado e configuracao CNAB.", agencia: "0000", conta: "0000000-0" },
	inter: { nome: "Inter", codigo: "077", api: "OAuth2, certificado A1 e webhooks de boleto e PIX.", agencia: "0001", conta: "00000000-0" },
	nubank: { nome: "Nubank", codigo: "260", api: "Conta pagamento com integracao via token e webhooks.", agencia: "0001", conta: "00000000-0" },
	"c6-bank": { nome: "C6 Bank", codigo: "336", api: "Client ID, secret e certificado para API financeira.", agencia: "0001", conta: "00000000-0" },
	"mercado-pago": { nome: "Mercado Pago", codigo: "323", api: "Access token, refresh token e webhooks de pagamento.", agencia: "0001", conta: "000000000" },
	asaas: { nome: "Asaas", codigo: "461", api: "Chave API e webhooks para cobrancas, PIX e cartao.", agencia: "0001", conta: "000000000" },
	"efi-bank": { nome: "Efi Bank", codigo: "364", api: "Client ID, secret, certificado e webhooks PIX.", agencia: "0001", conta: "000000000" },
	pagseguro: { nome: "PagSeguro", codigo: "290", api: "Token, chave publica e notificacoes transacionais.", agencia: "0001", conta: "000000000" },
	pagarme: { nome: "Pagar.me", codigo: "000", api: "Chave API, recebedor e webhook de transacoes.", agencia: "0001", conta: "000000000" },
	stripe: { nome: "Stripe", codigo: "000", api: "Chaves secretas, webhook assinado e recebimentos por cartao.", agencia: "0001", conta: "000000000" }
};

$(document).ready(function () {
	CONFIGURACAO_BANCARIA.init();
});

CONFIGURACAO_BANCARIA.init = function () {
	CONFIGURACAO_BANCARIA.initializeComponents();
	CONFIGURACAO_BANCARIA.bindEvents();
	CONFIGURACAO_BANCARIA.loadInitialData();
};

CONFIGURACAO_BANCARIA.initializeComponents = function () {
	CONFIGURACAO_BANCARIA.initTomSelects("#formConfiguracaoBancaria");
	CONFIGURACAO_BANCARIA.initMasks();
};

CONFIGURACAO_BANCARIA.bindEvents = function () {
	$("#formConfiguracaoBancaria").on("submit", function (event) {
		event.preventDefault();
		var submitter = event.originalEvent && event.originalEvent.submitter ? "#" + event.originalEvent.submitter.id : "#btnSalvar";
		CONFIGURACAO_BANCARIA.salvarFormulario(submitter, false);
	});

	$("#btnSalvarNovo").on("click", function () {
		CONFIGURACAO_BANCARIA.salvarFormulario("#btnSalvarNovo", true);
	});

	$("#btnTestarIntegracao, #btnTestarIntegracaoHeader").on("click", CONFIGURACAO_BANCARIA.testarIntegracao);
	$("#banco").on("change", CONFIGURACAO_BANCARIA.alterarBanco);
	$("#ambienteApi").on("change", CONFIGURACAO_BANCARIA.alterarAmbiente);
	$("#agencia, #conta, #digitoConta").on("input", CONFIGURACAO_BANCARIA.atualizarContasLiquidacao);
	$("#certificadoA1").on("change", CONFIGURACAO_BANCARIA.validarCertificado);
	$("#status").on("change", CONFIGURACAO_BANCARIA.atualizarStatus);
	$("#tipoChavePix").on("change", CONFIGURACAO_BANCARIA.atualizarPlaceholderPix);
	$("#accessToken, #refreshToken").on("blur", CONFIGURACAO_BANCARIA.maskSensitiveField);
	$("#accessToken, #refreshToken").on("focus", CONFIGURACAO_BANCARIA.unmaskSensitiveField);
	$(document).on("click", "[data-toggle-password]", CONFIGURACAO_BANCARIA.togglePassword);
	$("#formConfiguracaoBancaria").on("input change", "input, select, textarea", CONFIGURACAO_BANCARIA.removerErroCampo);
};

CONFIGURACAO_BANCARIA.loadInitialData = function () {
	CONFIGURACAO_BANCARIA.alterarAmbiente();
	CONFIGURACAO_BANCARIA.alterarBanco();
	CONFIGURACAO_BANCARIA.atualizarStatus();
	CONFIGURACAO_BANCARIA.atualizarPlaceholderPix();
	CONFIGURACAO_BANCARIA.preencherUrls();
};

CONFIGURACAO_BANCARIA.salvarFormulario = function (button, novoAposSalvar) {
	var form = $("#formConfiguracaoBancaria").get(0);

	CONFIGURACAO_BANCARIA.clearValidation();

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Revise os campos obrigatorios antes de salvar.", "warning");
		return;
	}

	if (!CONFIGURACAO_BANCARIA.validarRegrasNegocio()) {
		return;
	}

	$(form).removeClass("was-validated");

	var id = CONFIGURACAO_BANCARIA.getUrlParam("id") || $("#configuracaoBancariaId").val();
	var request = id ? HELPER.ajaxPut : HELPER.ajaxPost;
	var url = id ? form.action + "/" + id : form.action;

	request(url, CONFIGURACAO_BANCARIA.coletarPayload(), {
		button: button,
		form: "#formConfiguracaoBancaria",
		contentType: false,
		processData: false,
		success: function () {
			HELPER.showToast("Configuracao bancaria salva com sucesso.", "success");

			if (novoAposSalvar) {
				CONFIGURACAO_BANCARIA.limparFormulario();
			}
		},
		error: function () {
			HELPER.showToast("Nao foi possivel salvar agora. Os dados foram mantidos na tela.", "danger");
		}
	});
};

CONFIGURACAO_BANCARIA.testarIntegracao = function () {
	var form = $("#formConfiguracaoBancaria").get(0);

	CONFIGURACAO_BANCARIA.clearValidation();

	if (!$("#banco").val()) {
		CONFIGURACAO_BANCARIA.showFieldError("#banco", "Selecione o banco antes de testar a integracao.");
		HELPER.showToast("Selecione o banco antes de testar a integracao.", "warning");
		return;
	}

	if (!CONFIGURACAO_BANCARIA.validarCertificado(false)) {
		return;
	}

	HELPER.ajaxPost("/financeiro/bancos/testar-integracao", CONFIGURACAO_BANCARIA.coletarPayload(), {
		button: this && this.id ? "#" + this.id : "#btnTestarIntegracao",
		form: "#formConfiguracaoBancaria",
		contentType: false,
		processData: false,
		success: function () {
			HELPER.showToast("Teste de integracao enviado. Verifique o retorno do banco.", "success");
		},
		error: function () {
			HELPER.showToast("Nao foi possivel testar a integracao agora.", "danger");
		}
	});
};

CONFIGURACAO_BANCARIA.validarCertificado = function (mostrarSucesso) {
	var input = $("#certificadoA1").get(0);
	var file = input && input.files && input.files[0] ? input.files[0] : null;

	if (!file) {
		$("#certificadoInfo").text("Nenhum certificado selecionado.");
		return true;
	}

	var extensao = file.name.split(".").pop().toLowerCase();

	if (["pfx", "p12"].indexOf(extensao) === -1) {
		CONFIGURACAO_BANCARIA.showFieldError("#certificadoA1", "O certificado deve ser .pfx ou .p12.");
		$("#certificadoInfo").text("Arquivo invalido.");
		input.value = "";
		return false;
	}

	$("#certificadoInfo").text("Arquivo: " + file.name + " | Validade e CNPJ serao validados pelo backend.");

	if (mostrarSucesso !== false) {
		HELPER.showToast("Certificado anexado para validacao segura no backend.", "success");
	}

	return true;
};

CONFIGURACAO_BANCARIA.alterarBanco = function () {
	var bancoKey = $("#banco").val();
	var banco = CONFIGURACAO_BANCARIA.bancos[bancoKey] || null;

	$("#codigoBanco").val(banco ? banco.codigo : "");
	$("#agencia").attr("placeholder", banco ? banco.agencia : "");
	$("#conta").attr("placeholder", banco ? banco.conta : "");
	CONFIGURACAO_BANCARIA.atualizarContasLiquidacao();

	if (banco) {
		$("#alertBancoParametros").removeClass("alert-info").addClass("alert-primary").find(".d-flex > div:last").text(banco.nome + ": " + banco.api);
	} else {
		$("#alertBancoParametros").removeClass("alert-primary").addClass("alert-info").find(".d-flex > div:last").text("Selecione o banco para ajustar parametros e URLs da integracao.");
	}

	CONFIGURACAO_BANCARIA.preencherUrls();
};

CONFIGURACAO_BANCARIA.alterarAmbiente = function () {
	var ambiente = $("#ambienteApi").val();
	var producao = ambiente === "producao";

	$("#badgeAmbiente")
		.attr("class", producao ? "badge bg-red-lt" : "badge bg-blue-lt")
		.text(producao ? "Producao" : "Homologacao");

	CONFIGURACAO_BANCARIA.preencherUrls();
};

CONFIGURACAO_BANCARIA.validarRegrasNegocio = function () {
	if (!CONFIGURACAO_BANCARIA.validarCertificado(false)) {
		return false;
	}

	if ($("#contaPadrao").is(":checked") && !$("#tipoConta").val()) {
		CONFIGURACAO_BANCARIA.showFieldError("#tipoConta", "Conta padrao exige o tipo da conta.");
		HELPER.showToast("Informe o tipo da conta para controlar a conta padrao por tipo.", "warning");
		return false;
	}

	if ($("#habilitarBoleto").is(":checked")) {
		if (!CONFIGURACAO_BANCARIA.requireFields([
			{ selector: "#carteira", message: "Informe a carteira do boleto." },
			{ selector: "#convenio", message: "Informe o convenio do boleto." },
			{ selector: "#codigoBeneficiario", message: "Informe o codigo beneficiario." }
		])) {
			return false;
		}
	}

	if ($("#habilitarPix").is(":checked") && !CONFIGURACAO_BANCARIA.validarPix()) {
		return false;
	}

	if ($("#habilitarCartao").is(":checked")) {
		if (!CONFIGURACAO_BANCARIA.requireFields([
			{ selector: "#integradorCartao", message: "Selecione o integrador de cartao/TEF." },
			{ selector: "#tipoIntegracaoCartao", message: "Selecione o tipo de integracao de cartao." }
		])) {
			return false;
		}
	}

	return true;
};

CONFIGURACAO_BANCARIA.validarPix = function () {
	var tipo = $("#tipoChavePix").val();
	var chave = String($("#chavePix").val() || "").trim();

	if (!CONFIGURACAO_BANCARIA.requireFields([
		{ selector: "#integradorPix", message: "Selecione o integrador PIX." },
		{ selector: "#tipoChavePix", message: "Selecione o tipo da chave PIX." },
		{ selector: "#chavePix", message: "Informe a chave PIX." },
		{ selector: "#nomeRecebedor", message: "Informe o nome do recebedor." },
		{ selector: "#cidadeRecebedor", message: "Informe a cidade do recebedor." }
	])) {
		return false;
	}

	if (tipo === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chave)) {
		CONFIGURACAO_BANCARIA.showFieldError("#chavePix", "Informe um e-mail valido para a chave PIX.");
		return false;
	}

	if (tipo === "cpf" && HELPER.normalizeDigits(chave).length !== 11) {
		CONFIGURACAO_BANCARIA.showFieldError("#chavePix", "CPF da chave PIX deve conter 11 digitos.");
		return false;
	}

	if (tipo === "cnpj" && HELPER.normalizeDigits(chave).length !== 14) {
		CONFIGURACAO_BANCARIA.showFieldError("#chavePix", "CNPJ da chave PIX deve conter 14 digitos.");
		return false;
	}

	if (tipo === "celular" && HELPER.normalizeDigits(chave).length < 10) {
		CONFIGURACAO_BANCARIA.showFieldError("#chavePix", "Celular da chave PIX deve conter DDD.");
		return false;
	}

	if (tipo === "aleatoria" && (chave.length < 20 || chave.length > 36)) {
		CONFIGURACAO_BANCARIA.showFieldError("#chavePix", "Chave aleatoria PIX deve ter entre 20 e 36 caracteres.");
		return false;
	}

	return true;
};

CONFIGURACAO_BANCARIA.preencherUrls = function () {
	var banco = $("#banco").val() || "novo";
	var id = $("#configuracaoBancariaId").val() || CONFIGURACAO_BANCARIA.getUrlParam("id") || "novo";
	var base = "https://erp.com.br/api";

	$("#urlCallback").val(base + "/bancos/callback/" + banco);
	$("#urlWebhook").val(base + "/webhook/bancos/" + id);

	if (!$("#webhookPix").val()) {
		$("#webhookPix").val(base + "/bancos/pix/" + banco);
	}
};

CONFIGURACAO_BANCARIA.atualizarContasLiquidacao = function () {
	var bancoKey = $("#banco").val();
	var banco = CONFIGURACAO_BANCARIA.bancos[bancoKey] || null;
	var agencia = $("#agencia").val();
	var conta = $("#conta").val();
	var digito = $("#digitoConta").val();
	var contaTexto = [banco ? banco.nome : "", agencia, conta ? conta + (digito ? "-" + digito : "") : ""].filter(Boolean).join(" / ");

	$("#contaLiquidacaoPix, #contaLiquidacaoCartao").val(contaTexto);
};

CONFIGURACAO_BANCARIA.coletarPayload = function () {
	var formData = new FormData($("#formConfiguracaoBancaria").get(0));

	$("#formConfiguracaoBancaria input[type='checkbox']").each(function () {
		formData.set(this.name, $(this).is(":checked") ? "1" : "0");
	});

	$("#accessToken, #refreshToken").each(function () {
		var raw = $(this).data("secret-raw");

		if (raw) {
			formData.set(this.name, raw);
		}
	});

	return formData;
};

CONFIGURACAO_BANCARIA.limparFormulario = function () {
	var form = $("#formConfiguracaoBancaria").get(0);

	form.reset();
	$("#formConfiguracaoBancaria").removeClass("was-validated");
	CONFIGURACAO_BANCARIA.clearValidation();
	CONFIGURACAO_BANCARIA.clearTomSelect("#banco");
	$("#status, #qrcodeDinamico, #recebimentoAutomatico, #webhookAtivo").prop("checked", true);
	$("#ambienteApi").val("homologacao");
	$("#ambientePix").val("homologacao");
	$("#timeoutApi").val(30);
	$("#expiracaoPix").val(3600);
	$("#certificadoInfo").text("Nenhum certificado selecionado.");
	CONFIGURACAO_BANCARIA.loadInitialData();
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
			placeholder: $(this).data("placeholder") || "",
			render: {
				no_results: function () {
					return '<div class="no-results px-2 py-2 text-secondary">Nenhum resultado encontrado</div>';
				}
			}
		});
	});
};

CONFIGURACAO_BANCARIA.initMasks = function () {
	if (!window.IMask) {
		return;
	}

	CONFIGURACAO_BANCARIA.maskElement("cpfCnpjTitular", [{ mask: "000.000.000-00" }, { mask: "00.000.000/0000-00" }]);
	CONFIGURACAO_BANCARIA.maskElement("jurosMora", CONFIGURACAO_BANCARIA.numberMaskOptions());
	CONFIGURACAO_BANCARIA.maskElement("multa", CONFIGURACAO_BANCARIA.numberMaskOptions());
	CONFIGURACAO_BANCARIA.maskElement("taxaDebito", CONFIGURACAO_BANCARIA.numberMaskOptions());
	CONFIGURACAO_BANCARIA.maskElement("taxaCredito", CONFIGURACAO_BANCARIA.numberMaskOptions());
	CONFIGURACAO_BANCARIA.maskElement("taxaParcelado", CONFIGURACAO_BANCARIA.numberMaskOptions());
};

CONFIGURACAO_BANCARIA.maskElement = function (id, mask) {
	var element = document.getElementById(id);
	var options = $.isPlainObject(mask) || Array.isArray(mask) ? mask : { mask: mask };

	if (element) {
		CONFIGURACAO_BANCARIA.masks[id] = window.IMask(element, options);
	}
};

CONFIGURACAO_BANCARIA.numberMaskOptions = function () {
	return {
		mask: Number,
		scale: 2,
		signed: false,
		thousandsSeparator: ".",
		padFractionalZeros: true,
		normalizeZeros: true,
		radix: ",",
		mapToRadix: ["."]
	};
};

CONFIGURACAO_BANCARIA.atualizarStatus = function () {
	var ativo = $("#status").is(":checked");

	$("#badgeStatusConta").attr("class", ativo ? "badge bg-green-lt" : "badge bg-secondary-lt").text(ativo ? "Ativa" : "Inativa");
};

CONFIGURACAO_BANCARIA.atualizarPlaceholderPix = function () {
	var tipo = $("#tipoChavePix").val();
	var placeholders = {
		cpf: "000.000.000-00",
		cnpj: "00.000.000/0000-00",
		email: "financeiro@empresa.com.br",
		celular: "+55 00 00000-0000",
		aleatoria: "Chave aleatoria gerada pelo banco"
	};

	$("#chavePix").attr("placeholder", placeholders[tipo] || "");
};

CONFIGURACAO_BANCARIA.togglePassword = function (event) {
	event.preventDefault();

	var target = $(this).data("toggle-password");
	var $input = $(target);
	var visible = $input.attr("type") === "text";

	$input.attr("type", visible ? "password" : "text");
	$(this).text(visible ? "Mostrar" : "Ocultar");
};

CONFIGURACAO_BANCARIA.maskSensitiveField = function () {
	var value = $(this).val();

	if (!value || value.indexOf("...") !== -1) {
		return;
	}

	$(this).data("secret-raw", value);
	$(this).val(CONFIGURACAO_BANCARIA.maskSecret(value));
};

CONFIGURACAO_BANCARIA.unmaskSensitiveField = function () {
	var raw = $(this).data("secret-raw");

	if (raw) {
		$(this).val(raw);
	}
};

CONFIGURACAO_BANCARIA.maskSecret = function (value) {
	var text = String(value || "");

	if (text.length <= 12) {
		return "********";
	}

	return text.slice(0, 4) + "..." + text.slice(-4);
};

CONFIGURACAO_BANCARIA.requireFields = function (fields) {
	for (var i = 0; i < fields.length; i++) {
		if (!String($(fields[i].selector).val() || "").trim()) {
			CONFIGURACAO_BANCARIA.showFieldError(fields[i].selector, fields[i].message);
			HELPER.showToast(fields[i].message, "warning");
			return false;
		}
	}

	return true;
};

CONFIGURACAO_BANCARIA.removerErroCampo = function () {
	var $field = $(this);

	$field.removeClass("is-invalid");
	$field.closest(".input-group").next(".invalid-feedback[data-generated='true']").remove();
	$field.closest(".col-12, .col-6").find("> .invalid-feedback[data-generated='true']").remove();
};

CONFIGURACAO_BANCARIA.showFieldError = function (selector, message) {
	var $field = $(selector);
	var $inputGroup = $field.closest(".input-group");
	var feedback = '<div class="invalid-feedback d-block" data-generated="true">' + CONFIGURACAO_BANCARIA.escapeHtml(message) + "</div>";

	$field.addClass("is-invalid");

	if ($inputGroup.length) {
		$inputGroup.next(".invalid-feedback[data-generated='true']").remove();
		$inputGroup.after(feedback);
		return;
	}

	$field.closest(".col-12, .col-6").find("> .invalid-feedback[data-generated='true']").remove();
	$field.after(feedback);
};

CONFIGURACAO_BANCARIA.clearValidation = function () {
	var $form = $("#formConfiguracaoBancaria");

	$form.find(".is-invalid").removeClass("is-invalid");
	$form.find(".invalid-feedback[data-generated='true']").remove();
};

CONFIGURACAO_BANCARIA.clearTomSelect = function (selector) {
	var select = $(selector).get(0);

	if (select && select.tomselect) {
		select.tomselect.clear(true);
		return;
	}

	$(selector).val("");
};

CONFIGURACAO_BANCARIA.getUrlParam = function (key) {
	return new URLSearchParams(window.location.search).get(key);
};

CONFIGURACAO_BANCARIA.escapeHtml = function (value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};
