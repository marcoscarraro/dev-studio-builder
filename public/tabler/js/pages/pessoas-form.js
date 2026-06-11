const PESSOA = window.PESSOA || {};
window.PESSOA = PESSOA;

PESSOA.pessoasFormMasks = {};
PESSOA.contatoIndex = 1;

$(document).ready(function () {
	PESSOA.init();
});

PESSOA.init = function () {
	PESSOA.initializeComponents();
	PESSOA.bindEvents();
	PESSOA.loadInitialData();
};

PESSOA.initializeComponents = function () {
	PESSOA.initTomSelects("#formPessoas");
	PESSOA.initMasks();
	PESSOA.updateTipoPessoaUI($("#tipoPessoa").val() || "F");
}

PESSOA.bindEvents = function () {
	$("#tipoPessoa").on("change", PESSOA.alterarTipoPessoa);
	$("#btnBuscarCep").on("click", PESSOA.buscarCep);
	$("#btnBuscarCnpj").on("click", PESSOA.buscarCnpj);
	$("#btnAdicionarContato").on("click", PESSOA.adicionarContato);
	$("#contatosPessoa").on("click", ".btn-remover-contato", PESSOA.removerContato);
	$("#btnHeaderSave").on("click", PESSOA.acionarSalvar);
	$("#btnSaveContinue").on("click", PESSOA.salvarContinuar);
	$("#formPessoas").on("submit", PESSOA.salvarFormulario);
}

PESSOA.loadInitialData = function () {
}

PESSOA.alterarTipoPessoa = function () {
	PESSOA.updateTipoPessoaUI($(this).val());
}

PESSOA.buscarCep = function () {
	var cep = HELPER.normalizeDigits($("#cep").val());

	HELPER.clearValidationErrors("#formPessoas");

	if (cep.length !== 8) {
		PESSOA.showInputGroupError("#cep", "CEP invalido.");
		HELPER.showToast("Informe um CEP valido para buscar o endereco.", "danger");
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

			if (response.localidade && response.uf) {
				PESSOA.setSelectValue("#cidade", response.localidade + "/" + response.uf, response.localidade + " - " + response.uf);
			}

			if (response.uf) {
				PESSOA.setSelectValue("#estado", response.uf, response.uf);
			}

			HELPER.showToast("Endereco preenchido a partir do CEP.", "success");
		}
	});
}

PESSOA.buscarCnpj = function () {
	var cnpj = HELPER.normalizeDigits($("#cpfCnpj").val());

	HELPER.clearValidationErrors("#formPessoas");

	if (cnpj.length !== 14) {
		PESSOA.showInputGroupError("#cpfCnpj", "CNPJ invalido.");
		HELPER.showToast("Informe um CNPJ valido para buscar os dados.", "danger");
		return;
	}

	HELPER.buscarCnpjWs(cnpj, {
		button: "#btnBuscarCnpj",
		success: function (response) {
			if (!response) {
				HELPER.showToast("Nao foi possivel consultar o CNPJ no momento.", "danger");
				return;
			}

			PESSOA.preencherDadosCnpj(response);
			HELPER.showToast("Dados preenchidos a partir do CNPJ.", "success");
		}
	});
}

PESSOA.acionarSalvar = function () {
	$("#btnSave").trigger("click");
}

PESSOA.salvarContinuar = function () {
	HELPER.showToast("Registro salvo. Voce pode continuar o cadastro.", "success");
}

PESSOA.salvarFormulario = function (event) {
	event.preventDefault();

	HELPER.clearValidationErrors("#formPessoas");
	HELPER.setButtonLoading("#btnSave", true);

	setTimeout(function () {
		HELPER.setButtonLoading("#btnSave", false);
		HELPER.showToast("Registro salvo com sucesso.", "success");
	}, 500);
}

PESSOA.adicionarContato = function () {
	var index = PESSOA.contatoIndex++;
	var row = [
		'<tr class="contato-row" data-index="' + index + '">',
			'<td><input type="text" class="form-control" name="contatos[' + index + '][nome]" placeholder="Nome do contato" autocomplete="off"></td>',
			'<td><input type="text" class="form-control" name="contatos[' + index + '][departamento]" placeholder="Diretoria, financeiro..." autocomplete="off"></td>',
			'<td><input type="text" class="form-control contato-telefone" name="contatos[' + index + '][telefone]" placeholder="(00) 0000-0000" autocomplete="off"></td>',
			'<td><input type="text" class="form-control contato-celular" name="contatos[' + index + '][celular]" placeholder="(00) 00000-0000" autocomplete="off"></td>',
			'<td><input type="email" class="form-control" name="contatos[' + index + '][email]" placeholder="nome@empresa.com.br" autocomplete="off"></td>',
			'<td><input type="url" class="form-control" name="contatos[' + index + '][site]" placeholder="https://..." autocomplete="off"></td>',
			'<td class="text-end"><button type="button" class="btn btn-icon btn-outline-danger btn-remover-contato" aria-label="Remover contato">' +
				'<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>' +
			'</button></td>',
		'</tr>'
	].join("");

	$("#contatosPessoa").append(row);
	PESSOA.initContactMasks();
}

PESSOA.removerContato = function () {
	$(this).closest("tr").remove();
}

PESSOA.preencherDadosCnpj = function (response) {
	var razao = response.razao_social || PESSOA.safeGet(response, "razao_social", "");
	var fantasia = response.nome_fantasia || PESSOA.safeGet(response, "estabelecimento.nome_fantasia", "");
	var situacao = PESSOA.safeGet(response, "estabelecimento.situacao_cadastral", "") || response.situacao_cadastral;
	var email = PESSOA.safeGet(response, "estabelecimento.email", "") || response.email;
	var telefone = PESSOA.getTelefoneCnpj(response);
	var cep = PESSOA.safeGet(response, "estabelecimento.cep", "");
	var cidadeNome = PESSOA.safeGet(response, "estabelecimento.cidade.nome", "");
	var uf = PESSOA.safeGet(response, "estabelecimento.estado.sigla", "");

	if (razao) {
		$('[name="nome"]').val(razao);
	}

	if (fantasia) {
		$('[name="nome_fantasia"]').val(fantasia);
	}

	if (telefone) {
		$("#telefone").val(telefone);
	}

	if (email) {
		$("#email").val(email);
	}

	if (situacao) {
		$('[name="situacao_cadastral"]').val(situacao);
	}

	$("#cep").val(cep);
	$("#logradouro").val(PESSOA.safeGet(response, "estabelecimento.logradouro", ""));
	$("#numero").val(PESSOA.safeGet(response, "estabelecimento.numero", ""));
	$("#complemento").val(PESSOA.safeGet(response, "estabelecimento.complemento", ""));
	$("#bairro").val(PESSOA.safeGet(response, "estabelecimento.bairro", ""));

	if (cidadeNome && uf) {
		PESSOA.setSelectValue("#cidade", cidadeNome + "/" + uf, cidadeNome + " - " + uf);
	}

	if (uf) {
		PESSOA.setSelectValue("#estado", uf, uf);
	}
}

PESSOA.initTomSelects = function (context) {
	if (!window.TomSelect) {
		return;
	}

	$(context).find("select[data-tomselect]").each(function () {
		var select = this;
		var url = $(select).data("ajax-url");
		var placeholder = $(select).data("placeholder") || "";
		var isMultiple = $(select).prop("multiple");

		if (select.tomselect) {
			return;
		}

		var options = {
			plugins: isMultiple ? ["remove_button", "clear_button"] : ["dropdown_input", "clear_button"],
			copyClassesToDropdown: false,
			controlInput: "<input>",
			valueField: "id",
			labelField: "text",
			searchField: ["text"],
			create: false,
			placeholder: placeholder,
			render: {
				no_results: function () {
					return '<div class="no-results px-2 py-2 text-secondary">Nenhum resultado encontrado</div>';
				}
			}
		};

		if (url) {
			options.preload = true;
			options.load = HELPER.debounce(function (query, callback) {
				PESSOA.loadTomSelectOptions(url, query, callback);
			}, 300);
		}

		new window.TomSelect(select, options);
	});
}

PESSOA.loadTomSelectOptions = function (url, query, callback) {
	if (!url) {
		callback();
		return;
	}

	HELPER.ajaxGet(url, {
		success: function (response) {
			var items = Array.isArray(response) ? response : PESSOA.safeGet(response, "data", []);

			if (!Array.isArray(items)) {
				items = [];
			}

			callback(PESSOA.filterOptions(items, query).slice(0, 50));
		},
		error: function () {
			callback();
		}
	});
}

PESSOA.initMasks = function () {
	if (!window.IMask) {
		return;
	}

	PESSOA.destroyMasks();
	PESSOA.maskElement("cep", "00000-000");
	PESSOA.initContactMasks();
	PESSOA.maskElement("limiteCredito", {
		mask: Number,
		scale: 2,
		signed: false,
		thousandsSeparator: ".",
		padFractionalZeros: true,
		normalizeZeros: true,
		radix: ",",
		mapToRadix: ["."]
	});
	PESSOA.applyMaskCpfCnpj($("#tipoPessoa").val() || "F");
}

PESSOA.initContactMasks = function () {
	if (!window.IMask) {
		return;
	}

	$(".contato-telefone").each(function () {
		PESSOA.maskInput(this, [
			{ mask: "(00) 0000-0000" },
			{ mask: "(00) 00000-0000" }
		]);
	});

	$(".contato-celular").each(function () {
		PESSOA.maskInput(this, "(00) 00000-0000");
	});
}

PESSOA.applyMaskCpfCnpj = function (tipoPessoa) {
	var input = document.getElementById("cpfCnpj");

	if (!window.IMask || !input) {
		return;
	}

	if (PESSOA.pessoasFormMasks.cpfCnpj) {
		PESSOA.pessoasFormMasks.cpfCnpj.destroy();
	}

	PESSOA.pessoasFormMasks.cpfCnpj = window.IMask(input, {
		mask: tipoPessoa === "J" ? "00.000.000/0000-00" : "000.000.000-00"
	});
}

PESSOA.updateTipoPessoaUI = function (tipoPessoa) {
	var isJuridica = tipoPessoa === "J";

	$("#labelCpfCnpj").text(isJuridica ? "CNPJ" : "CPF");
	$("#labelRgIe").text(isJuridica ? "IE" : "RG");
	$("#labelNomeRazao").text(isJuridica ? "Razao social" : "Nome");
	$("#hintCpfCnpj").text(isJuridica ? "Informe o CNPJ e, se desejar, busque os dados automaticamente." : "Informe o CPF.");

	$("#btnBuscarCnpj").toggleClass("d-none", !isJuridica).prop("disabled", !isJuridica);

	if (!isJuridica) {
		$('[name="situacao_cadastral"]').val("");
	}

	PESSOA.applyMaskCpfCnpj(tipoPessoa);
}

PESSOA.maskElement = function (id, mask) {
	var element = document.getElementById(id);

	if (element) {
		PESSOA.pessoasFormMasks[id] = PESSOA.maskInput(element, mask);
	}
}

PESSOA.maskInput = function (element, mask) {
	var options = $.isPlainObject(mask) ? mask : { mask: mask };

	if (element.imaskInstance) {
		return element.imaskInstance;
	}

	element.imaskInstance = window.IMask(element, options);
	return element.imaskInstance;
}

PESSOA.destroyMasks = function () {
	$.each(PESSOA.pessoasFormMasks, function (_, mask) {
		if (mask && typeof mask.destroy === "function") {
			mask.destroy();
		}
	});

	PESSOA.pessoasFormMasks = {};
}

PESSOA.setSelectValue = function (selector, idValue, textValue) {
	var select = $(selector).get(0);
	var value = idValue == null ? "" : String(idValue);
	var text = textValue == null ? value : String(textValue);

	if (!select) {
		return;
	}

	if (select.tomselect) {
		select.tomselect.addOption({ id: value, text: text });
		select.tomselect.setValue(value, true);
		return;
	}

	if (!$(select).find('option[value="' + value.replace(/"/g, '\\"') + '"]').length) {
		$(select).append('<option value="' + value + '">' + text + "</option>");
	}

	$(select).val(value).trigger("change");
}

PESSOA.showInputGroupError = function (selector, message) {
	var $input = $(selector);

	$input.addClass("is-invalid");
	$input.closest(".input-group").after('<div class="invalid-feedback d-block">' + message + "</div>");
}

PESSOA.filterOptions = function (items, query) {
	var q = String(query || "").toLowerCase();

	if (!q) {
		return items;
	}

	return items.filter(function (item) {
		return String(item.text || item.name || item.label || "").toLowerCase().indexOf(q) !== -1;
	});
}

PESSOA.getTelefoneCnpj = function (response) {
	var telefone = PESSOA.safeGet(response, "estabelecimento.telefone1", "") || PESSOA.safeGet(response, "estabelecimento.ddd1", "");
	var ddd = PESSOA.safeGet(response, "estabelecimento.ddd1", "");
	var digits = HELPER.normalizeDigits(telefone);

	if (ddd && telefone && String(telefone).indexOf(ddd) !== 0 && digits.length >= 8) {
		return "(" + ddd + ") " + digits;
	}

	return telefone;
}

PESSOA.safeGet = function (obj, path, fallback) {
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
}



