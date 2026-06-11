const EMPRESA = window.EMPRESA || {};
window.EMPRESA = EMPRESA;

EMPRESA.masks = {};

$(document).ready(function () {
	EMPRESA.init();
});

EMPRESA.init = function () {
	EMPRESA.initializeComponents();
	EMPRESA.bindEvents();
	EMPRESA.loadInitialData();
};

EMPRESA.initializeComponents = function () {
	EMPRESA.initTomSelects("#formEmpresaConfig");
	EMPRESA.initMasks();
};

EMPRESA.bindEvents = function () {
	$("#btnHeaderSave, #btnFooterSave").on("click", EMPRESA.submitForm);
	$("#btnBuscarCnpj, #btnAtualizarEmpresa").on("click", EMPRESA.buscarCnpj);
	$("#btnBuscarCep").on("click", EMPRESA.buscarCep);
	$("#btnValidarCertificado").on("click", EMPRESA.validarCertificado);
	$("#btnTestarSmtp").on("click", EMPRESA.testarSmtp);
	$("#btnTestarIntegracoes").on("click", EMPRESA.testarIntegracoes);
	$("#btnRestaurarParametros").on("click", EMPRESA.restaurarParametros);
	$("#formEmpresaConfig").on("submit", EMPRESA.salvarFormulario);
	$("#logotipoEmpresa").on("change", EMPRESA.previewLogo);
	$(document).on("click", "[data-toggle-password]", EMPRESA.togglePassword);
	$(document).on("click", "[data-copy-target]", EMPRESA.copyTargetValue);
};

EMPRESA.loadInitialData = function () {
	HELPER.ajaxGet("/mock/empresa-config.json", {
		button: "#btnHeaderSave",
		silentError: true,
		success: function (response) {
			var data = response && response.data ? response.data : response;

			EMPRESA.populateForm(data);
			HELPER.showToast("Configuracoes da empresa carregadas.", "success");
		},
		error: function () {
			HELPER.showToast("Nao foi possivel carregar o mock de configuracoes.", "danger");
		}
	});
};

EMPRESA.submitForm = function () {
	$("#formEmpresaConfig").trigger("submit");
};

EMPRESA.salvarFormulario = function (event) {
	event.preventDefault();

	var form = $("#formEmpresaConfig").get(0);

	EMPRESA.clearValidation();

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Revise os campos obrigatorios antes de salvar.", "warning");
		return;
	}

	$(form).removeClass("was-validated");
	HELPER.setButtonLoading("#btnSave", true);
	HELPER.setButtonLoading("#btnFooterSave", true);
	HELPER.setButtonLoading("#btnHeaderSave", true);

	setTimeout(function () {
		HELPER.setButtonLoading("#btnSave", false);
		HELPER.setButtonLoading("#btnFooterSave", false);
		HELPER.setButtonLoading("#btnHeaderSave", false);
		HELPER.showToast("Configuracoes salvas com sucesso.", "success");
	}, 700);
};

EMPRESA.buscarCnpj = function () {
	var cnpj = HELPER.normalizeDigits($("#cnpj").val());

	EMPRESA.clearValidation();

	if (cnpj.length !== 14) {
		EMPRESA.showInputGroupError("#cnpj", "Informe um CNPJ valido.");
		HELPER.showToast("Informe um CNPJ valido para buscar os dados.", "warning");
		return;
	}

	HELPER.buscarCnpjWs(cnpj, {
		button: this.id ? "#" + this.id : "#btnBuscarCnpj",
		success: function (response) {
			if (!response) {
				HELPER.showToast("Nao foi possivel consultar o CNPJ no momento.", "danger");
				return;
			}

			EMPRESA.preencherDadosCnpj(response);
			HELPER.showToast("Dados da empresa atualizados a partir do CNPJ.", "success");
		}
	});
};

EMPRESA.buscarCep = function () {
	var cep = HELPER.normalizeDigits($("#cep").val());

	EMPRESA.clearValidation();

	if (cep.length !== 8) {
		EMPRESA.showInputGroupError("#cep", "Informe um CEP valido.");
		HELPER.showToast("Informe um CEP valido para buscar o endereco.", "warning");
		return;
	}

	HELPER.buscarCepViaCep(cep, {
		button: "#btnBuscarCep",
		success: function (response) {
			if (!response || response.erro) {
				HELPER.showToast("CEP nao encontrado. Verifique e tente novamente.", "danger");
				return;
			}

			$("#logradouro").val(response.logradouro || "");
			$("#bairro").val(response.bairro || "");
			$("#cidade").val(response.localidade && response.uf ? response.localidade + "/" + response.uf : response.localidade || "");
			$("#estado").val(response.uf || "");
			HELPER.showToast("Endereco preenchido a partir do CEP.", "success");
		}
	});
};

EMPRESA.validarCertificado = function () {
	HELPER.setButtonLoading("#btnValidarCertificado", true);

	setTimeout(function () {
		HELPER.setButtonLoading("#btnValidarCertificado", false);
		HELPER.showToast("Solicitacao de validacao enviada ao backend.", "success");
	}, 700);
};

EMPRESA.testarSmtp = function () {
	HELPER.setButtonLoading("#btnTestarSmtp", true);

	setTimeout(function () {
		HELPER.setButtonLoading("#btnTestarSmtp", false);
		HELPER.showToast("Teste de envio SMTP simulado com sucesso.", "success");
	}, 700);
};

EMPRESA.testarIntegracoes = function () {
	HELPER.setButtonLoading("#btnTestarIntegracoes", true);

	setTimeout(function () {
		HELPER.setButtonLoading("#btnTestarIntegracoes", false);
		HELPER.showToast("Testes de integracoes iniciados. Consulte os status individuais.", "success");
	}, 900);
};

EMPRESA.restaurarParametros = function () {
	HELPER.setButtonLoading("#btnRestaurarParametros", true);

	setTimeout(function () {
		HELPER.setButtonLoading("#btnRestaurarParametros", false);
		HELPER.showToast("Parametros padrao restaurados no formulario.", "success");
		EMPRESA.loadInitialData();
	}, 700);
};

EMPRESA.previewLogo = function () {
	var file = this.files && this.files[0] ? this.files[0] : null;

	if (!file) {
		return;
	}

	if (file.type.indexOf("image/") !== 0) {
		HELPER.showToast("Selecione uma imagem valida para o logotipo.", "warning");
		this.value = "";
		return;
	}

	$("#logoFileName").text(file.name);
};

EMPRESA.togglePassword = function (event) {
	event.preventDefault();

	var target = $(this).data("toggle-password");
	var $input = $(target);
	var visible = $input.attr("type") === "text";

	$input.attr("type", visible ? "password" : "text");
	$(this).attr("aria-label", visible ? "Mostrar senha" : "Ocultar senha");
	$(this).text(visible ? "Mostrar" : "Ocultar");
};

EMPRESA.copyTargetValue = function (event) {
	event.preventDefault();

	var target = $(this).data("copy-target");
	var value = $(target).val();

	if (!value) {
		HELPER.showToast("Nao ha valor para copiar.", "warning");
		return;
	}

	if (navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(value);
		HELPER.showToast("Valor copiado.", "success");
		return;
	}

	$(target).trigger("select");
	document.execCommand("copy");
	HELPER.showToast("Valor copiado.", "success");
};

EMPRESA.preencherDadosCnpj = function (response) {
	var estabelecimento = response.estabelecimento || {};
	var cidade = EMPRESA.safeGet(estabelecimento, "cidade.nome", "");
	var uf = EMPRESA.safeGet(estabelecimento, "estado.sigla", "");
	var atividade = response.atividade_principal || {};

	$("#razaoSocial").val(response.razao_social || "");
	$("#nomeFantasia").val(estabelecimento.nome_fantasia || response.nome_fantasia || "");
	$("#situacaoCadastral").val(estabelecimento.situacao_cadastral || "");
	$("#telefone").val(EMPRESA.formatTelefoneCnpj(estabelecimento));
	$("#emailPrincipal").val(estabelecimento.email || "");
	$("#cep").val(estabelecimento.cep || "");
	$("#logradouro").val(estabelecimento.logradouro || "");
	$("#numero").val(estabelecimento.numero || "");
	$("#complemento").val(estabelecimento.complemento || "");
	$("#bairro").val(estabelecimento.bairro || "");
	$("#cidade").val(cidade && uf ? cidade + "/" + uf : cidade);
	$("#estado").val(uf);
	$("#codigoIbgeMunicipio").val(EMPRESA.safeGet(estabelecimento, "cidade.ibge_id", ""));
	$("#cnae").val(atividade.codigo || response.cnae_fiscal || "");
};

EMPRESA.populateForm = function (data) {
	HELPER.populateForm("#formEmpresaConfig", data);

	$.each(data || {}, function (field, value) {
		var $inputs = $('#formEmpresaConfig [name="' + field + '"]');

		if (!$inputs.length) {
			return;
		}

		if ($inputs.first().is(":checkbox")) {
			$inputs.prop("checked", !!value);
			return;
		}

		if ($inputs.first().is("select")) {
			EMPRESA.setSelectValue($inputs.first(), value, value);
		}
	});

	$("#logoFileName").text("logotipo-empresa.png");
};

EMPRESA.setSelectValue = function (select, idValue, textValue) {
	var element = $(select).get(0);
	var value = idValue == null ? "" : String(idValue);
	var text = textValue == null ? value : String(textValue);

	if (!element) {
		return;
	}

	if (element.tomselect) {
		if (value && !element.tomselect.options[value]) {
			element.tomselect.addOption({ id: value, text: text });
		}

		element.tomselect.setValue(value, true);
		return;
	}

	$(element).val(value).trigger("change");
};

EMPRESA.initTomSelects = function (context) {
	if (!window.TomSelect) {
		return;
	}

	$(context).find("select[data-tomselect]").each(function () {
		var select = this;
		var url = $(select).data("ajax-url");
		var placeholder = $(select).data("placeholder") || "";

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
			searchField: ["text"],
			create: false,
			placeholder: placeholder,
			preload: true,
			load: HELPER.debounce(function (query, callback) {
				EMPRESA.loadTomSelectOptions(url, query, callback);
			}, 300),
			render: {
				no_results: function () {
					return '<div class="no-results px-2 py-2 text-secondary">Nenhum resultado encontrado</div>';
				}
			}
		});
	});
};

EMPRESA.loadTomSelectOptions = function (url, query, callback) {
	if (!url) {
		callback();
		return;
	}

	HELPER.ajaxGet(url, {
		success: function (response) {
			var items = Array.isArray(response) ? response : EMPRESA.safeGet(response, "data", []);

			if (!Array.isArray(items)) {
				items = [];
			}

			callback(EMPRESA.filterOptions(items, query).slice(0, 50));
		},
		error: function () {
			callback();
		}
	});
};

EMPRESA.initMasks = function () {
	if (!window.IMask) {
		return;
	}

	EMPRESA.maskElement("cnpj", "00.000.000/0000-00");
	EMPRESA.maskElement("telefone", [{ mask: "(00) 0000-0000" }, { mask: "(00) 00000-0000" }]);
	EMPRESA.maskElement("whatsapp", "(00) 00000-0000");
	EMPRESA.maskElement("cep", "00000-000");
	EMPRESA.maskElement("certificadoCnpj", "00.000.000/0000-00");
	EMPRESA.maskElement("aliquotaPadrao", EMPRESA.numberMaskOptions());
	EMPRESA.maskElement("jurosPadrao", EMPRESA.numberMaskOptions());
	EMPRESA.maskElement("multaPadrao", EMPRESA.numberMaskOptions());
	EMPRESA.maskElement("descontoMaximoPadrao", EMPRESA.numberMaskOptions());
};

EMPRESA.maskElement = function (id, mask) {
	var element = document.getElementById(id);
	var options = $.isPlainObject(mask) || Array.isArray(mask) ? mask : { mask: mask };

	if (element) {
		EMPRESA.masks[id] = window.IMask(element, options);
	}
};

EMPRESA.numberMaskOptions = function () {
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

EMPRESA.showInputGroupError = function (selector, message) {
	var $input = $(selector);

	$input.closest(".input-group").next(".invalid-feedback.d-block").remove();
	$input.addClass("is-invalid");
	$input.closest(".input-group").after('<div class="invalid-feedback d-block">' + message + "</div>");
};

EMPRESA.clearValidation = function () {
	var $form = $("#formEmpresaConfig");

	$form.find(".is-invalid").removeClass("is-invalid");
	$form.find(".input-group + .invalid-feedback.d-block").remove();
};

EMPRESA.filterOptions = function (items, query) {
	var q = String(query || "").toLowerCase();

	if (!q) {
		return items;
	}

	return items.filter(function (item) {
		return String(item.text || item.name || item.label || "").toLowerCase().indexOf(q) !== -1;
	});
};

EMPRESA.formatTelefoneCnpj = function (estabelecimento) {
	var ddd = estabelecimento.ddd1 || "";
	var telefone = estabelecimento.telefone1 || "";

	if (ddd && telefone) {
		return "(" + ddd + ") " + telefone;
	}

	return telefone;
};

EMPRESA.safeGet = function (obj, path, fallback) {
	try {
		var parts = String(path || "").split(".");
		var cur = obj;

		for (var i = 0; i < parts.length; i++) {
			if (cur == null) {
				return fallback;
			}

			cur = cur[parts[i]];
		}

		return cur == null ? fallback : cur;
	} catch (e) {
		return fallback;
	}
};
