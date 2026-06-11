const REGRA_FISCAL = window.REGRA_FISCAL || {};
window.REGRA_FISCAL = REGRA_FISCAL;

REGRA_FISCAL.ufs = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

$(document).ready(function () {
	REGRA_FISCAL.init();
});

REGRA_FISCAL.init = function () {
	REGRA_FISCAL.initializeComponents();
	REGRA_FISCAL.bindEvents();
	REGRA_FISCAL.loadInitialData();
};

REGRA_FISCAL.initializeComponents = function () {
	REGRA_FISCAL.populateUfSelects();
	REGRA_FISCAL.initTomSelects("#formRegraFiscal");
	REGRA_FISCAL.updateRegrasAplicacao();
	REGRA_FISCAL.handleTipoOperacao();
	REGRA_FISCAL.handleDestinoOperacao();
	REGRA_FISCAL.atualizarIndicadores();
};

REGRA_FISCAL.bindEvents = function () {
	$("#btnHeaderSave").on("click", REGRA_FISCAL.acionarSalvar);
	$("#btnHeaderSaveNew").on("click", REGRA_FISCAL.salvarNovo);
	$("#btnSaveNew").on("click", REGRA_FISCAL.salvarNovo);
	$("#formRegraFiscal").on("submit", REGRA_FISCAL.salvarFormulario);
	$("#btnAddRegraAplicacao").on("click", REGRA_FISCAL.adicionarRegraAplicacao);
	$("#regrasAplicacaoWrapper").on("click", ".btnRemoveRegraAplicacao", REGRA_FISCAL.removerRegraAplicacao);
	$("#tipoOperacao, #finalidadeNf").on("change", REGRA_FISCAL.handleTipoOperacao);
	$("#destinoOperacao").on("change", REGRA_FISCAL.handleDestinoOperacao);
	$("#formRegraFiscal").on("change", ".js-produto-monofasico-aplicacao, #produtoMonofasicoFederal, .js-movimento", REGRA_FISCAL.atualizarIndicadores);
	$("#formRegraFiscal input, #formRegraFiscal select, #formRegraFiscal textarea").on("input change", REGRA_FISCAL.clearFieldError);
};

REGRA_FISCAL.loadInitialData = function () {
};

REGRA_FISCAL.acionarSalvar = function () {
	$("#btnSalvar").trigger("click");
};

REGRA_FISCAL.salvarFormulario = function (event) {
	event.preventDefault();

	if (!REGRA_FISCAL.validarFormulario()) {
		return;
	}

	REGRA_FISCAL.salvar(false, "#btnSalvar");
};

REGRA_FISCAL.salvarNovo = function (event) {
	if (event) {
		event.preventDefault();
	}

	if (!REGRA_FISCAL.validarFormulario()) {
		return;
	}

	var button = event && event.currentTarget ? "#" + event.currentTarget.id : "#btnSaveNew";

	REGRA_FISCAL.salvar(true, button);
};

REGRA_FISCAL.salvar = function (limpar, button) {
	HELPER.ajaxPost("/api/regras-fiscais", REGRA_FISCAL.getFormData(), {
		button: button,
		form: "#formRegraFiscal",
		success: function (response) {
			if (!response || !response.message) {
				HELPER.showToast(limpar ? "Regra fiscal salva. Pronta para novo cadastro." : "Regra fiscal salva com sucesso.", "success");
			}

			if (limpar) {
				REGRA_FISCAL.limparFormulario();
			}
		},
		error: function () {}
	});
};

REGRA_FISCAL.handleTipoOperacao = function () {
	var tipo = $("#tipoOperacao").val();
	var showDevolucao = tipo === "Devolucao" || $("#finalidadeNf").val() === "Devolucao";

	REGRA_FISCAL.toggleCollapse("#campoCfopDevolucao", showDevolucao);
	REGRA_FISCAL.atualizarIndicadores();
};

REGRA_FISCAL.handleDestinoOperacao = function () {
	var interestadual = $("#destinoOperacao").val() === "Interestadual";

	$("#grupoAplicaDifal, #grupoAplicaFcp").toggleClass("text-secondary", !interestadual);

	if (!interestadual) {
		$("#aplicaDifal, #aplicaFcp").prop("checked", false);
	}

	REGRA_FISCAL.atualizarIndicadores();
};

REGRA_FISCAL.validarFormulario = function () {
	var form = $("#formRegraFiscal").get(0);

	REGRA_FISCAL.clearValidation();

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Revise os campos obrigatorios.", "warning");
		return false;
	}

	if (!REGRA_FISCAL.validarRegrasFiscais()) {
		return false;
	}

	$(form).removeClass("was-validated");
	return true;
};

REGRA_FISCAL.validarRegrasFiscais = function () {
	if (!REGRA_FISCAL.getSelectValue("#cfopPrincipal")) {
		REGRA_FISCAL.toggleInvalid("#cfopPrincipal", true, "Informe o CFOP principal.");
		HELPER.showToast("CFOP principal obrigatorio.", "warning");
		return false;
	}

	if (!REGRA_FISCAL.validarTributacoesAplicacao()) {
		return false;
	}

	if (!$("#movimentaEstoque").is(":checked") && !$("#movimentaFinanceiro").is(":checked")) {
		REGRA_FISCAL.toggleInvalid("#movimentaEstoque", true, "A regra deve movimentar estoque ou financeiro.");
		REGRA_FISCAL.toggleInvalid("#movimentaFinanceiro", true, "A regra deve movimentar estoque ou financeiro.");
		HELPER.showToast("Operacao sem movimentacao e invalida.", "warning");
		return false;
	}

	if ($("#aplicaDifal").is(":checked") && $("#destinoOperacao").val() !== "Interestadual") {
		REGRA_FISCAL.toggleInvalid("#destinoOperacao", true, "DIFAL exige destino interestadual.");
		HELPER.showToast("DIFAL so pode ser aplicado em operacao interestadual.", "warning");
		return false;
	}

	if (($("#tipoOperacao").val() === "Devolucao" || $("#finalidadeNf").val() === "Devolucao") && !REGRA_FISCAL.getSelectValue("#cfopDevolucao")) {
		REGRA_FISCAL.toggleInvalid("#cfopDevolucao", true, "Informe o CFOP de devolucao.");
		HELPER.showToast("Devolucao exige CFOP de devolucao.", "warning");
		return false;
	}

	return true;
};

REGRA_FISCAL.validarTributacoesAplicacao = function () {
	var valido = true;

	$("#regrasAplicacaoWrapper .regra-aplicacao-row").each(function () {
		var $row = $(this);
		var uf = $row.find(".js-uf-aplicacao").val() || $row.find("[data-uf-hidden]").val() || "UF";
		var estadual = $row.find(".js-tributacao-estadual-aplicacao").get(0);
		var federal = $row.find(".js-tributacao-federal-aplicacao").get(0);

		if (!REGRA_FISCAL.getSelectValue(estadual)) {
			REGRA_FISCAL.toggleInvalid(estadual, true, "Informe a tributacao estadual.");
			HELPER.showToast("Informe a tributacao estadual da linha " + uf + ".", "warning");
			valido = false;
			return false;
		}

		if (!REGRA_FISCAL.getSelectValue(federal)) {
			REGRA_FISCAL.toggleInvalid(federal, true, "Informe a tributacao federal.");
			HELPER.showToast("Informe a tributacao federal da linha " + uf + ".", "warning");
			valido = false;
			return false;
		}

		return true;
	});

	return valido;
};

REGRA_FISCAL.getFormData = function () {
	var data = {};

	$("#formRegraFiscal").serializeArray().forEach(function (item) {
		data[item.name] = item.value;
	});

	$("#formRegraFiscal input[type='checkbox']").each(function () {
		data[this.name] = $(this).is(":checked");
	});

	return data;
};

REGRA_FISCAL.limparFormulario = function () {
	var form = $("#formRegraFiscal").get(0);

	form.reset();
	$("#ativo, #movimentaEstoque, #movimentaFinanceiro").prop("checked", true);
	$("#prioridade").val("10");
	$("#formRegraFiscal").removeClass("was-validated");
	REGRA_FISCAL.clearValidation();
	REGRA_FISCAL.clearTomSelects("#formRegraFiscal");
	REGRA_FISCAL.resetRegrasAplicacao();
	REGRA_FISCAL.handleTipoOperacao();
	REGRA_FISCAL.handleDestinoOperacao();
	$("#descricao").trigger("focus");
};

REGRA_FISCAL.populateUfSelects = function () {
	$(".js-uf-aplicacao").each(function () {
		var $select = $(this);
		var currentValue = $select.val() || $select.data("default-value") || "";

		if ($select.data("loaded")) {
			return;
		}

		REGRA_FISCAL.ufs.forEach(function (uf) {
			if (!$select.find('option[value="' + uf + '"]').length) {
				$select.append('<option value="' + uf + '">' + uf + "</option>");
			}
		});

		$select.data("loaded", true);
		$select.val(currentValue);
	});
};

REGRA_FISCAL.adicionarRegraAplicacao = function () {
	var index = $("#regrasAplicacaoWrapper .regra-aplicacao-row").length;
	var template = $("#regraAplicacaoTemplate").html();
	var html = template.replace(/__INDEX__/g, index);

	$("#regrasAplicacaoWrapper").append(html);
	REGRA_FISCAL.populateUfSelects();
	REGRA_FISCAL.reindexRegrasAplicacao();
	REGRA_FISCAL.initTomSelects("#regrasAplicacaoWrapper");
	REGRA_FISCAL.updateRegrasAplicacao();
};

REGRA_FISCAL.removerRegraAplicacao = function () {
	var $row = $(this).closest(".regra-aplicacao-row");

	if ($row.is("[data-default-row]")) {
		HELPER.showToast("A regra GERAL e padrao e nao pode ser removida.", "warning");
		return;
	}

	$row.remove();
	REGRA_FISCAL.reindexRegrasAplicacao();
	REGRA_FISCAL.updateRegrasAplicacao();
};

REGRA_FISCAL.resetRegrasAplicacao = function () {
	$("#regrasAplicacaoWrapper .regra-aplicacao-row").not("[data-default-row]").remove();
	$("#regrasAplicacaoWrapper .regra-aplicacao-row[data-default-row]").find("select").each(function () {
		var defaultValue = $(this).data("default-value");

		if (defaultValue) {
			$(this).val(defaultValue);
		}
	});
	REGRA_FISCAL.reindexRegrasAplicacao();
	REGRA_FISCAL.updateRegrasAplicacao();
};

REGRA_FISCAL.reindexRegrasAplicacao = function () {
	$("#regrasAplicacaoWrapper .regra-aplicacao-row").each(function (index) {
		var $row = $(this);

		$row.attr("data-regra-aplicacao-index", index);
		$row.find("[name]").each(function () {
			this.name = this.name.replace(/regras_aplicacao\[\d+\]/, "regras_aplicacao[" + index + "]");
		});
	});
};

REGRA_FISCAL.updateRegrasAplicacao = function () {
	var $defaultRow = $("#regrasAplicacaoWrapper .regra-aplicacao-row[data-default-row]");

	$defaultRow.find("[data-uf-hidden]").val("GERAL");
	$defaultRow.find(".js-uf-aplicacao").val("GERAL").prop("disabled", true);
	$defaultRow.find(".btnRemoveRegraAplicacao").prop("disabled", true);
};

REGRA_FISCAL.initTomSelects = function (context) {
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
			searchField: ["text", "codigo", "descricao"],
			placeholder: placeholder,
			load: HELPER.debounce(function (query, callback) {
				REGRA_FISCAL.loadTomSelectOptions(url, query, callback);
			}, 300),
			render: {
				no_results: function () {
					return '<div class="no-results">Nenhum registro encontrado.</div>';
				}
			}
		});
	});
};

REGRA_FISCAL.loadTomSelectOptions = function (url, query, callback) {
	if (!url) {
		callback();
		return;
	}

	HELPER.ajaxGet(url + (query ? "?q=" + encodeURIComponent(query) : ""), {
		silentError: true,
		success: function (response) {
			callback(REGRA_FISCAL.normalizeRows(response, query));
		},
		error: function () {
			callback();
		}
	});
};

REGRA_FISCAL.normalizeRows = function (response, query) {
	var rows = Array.isArray(response) ? response : response && Array.isArray(response.data) ? response.data : [];
	var normalizedQuery = String(query || "").toLowerCase();

	return rows.map(function (item) {
		var codigo = item.codigo || item.codigo_interno || item.cfop || "";
		var descricao = item.descricao || item.nome || item.text || "";
		var text = item.text || (codigo ? codigo + " - " + descricao : descricao);

		return {
			id: String(item.id || item.value || codigo || text),
			text: text,
			codigo: codigo,
			descricao: descricao
		};
	}).filter(function (item) {
		if (!normalizedQuery) {
			return true;
		}

		return (item.text + " " + item.codigo + " " + item.descricao).toLowerCase().indexOf(normalizedQuery) !== -1;
	});
};

REGRA_FISCAL.clearTomSelects = function (context) {
	$(context).find("select[data-tomselect]").each(function () {
		if (this.tomselect) {
			this.tomselect.clear(true);
			return;
		}

		$(this).val("");
	});
};

REGRA_FISCAL.getSelectValue = function (selector) {
	var select = $(selector).get(0);

	if (select && select.tomselect) {
		return select.tomselect.getValue();
	}

	return $(selector).val();
};

REGRA_FISCAL.toggleCollapse = function (selector, show) {
	var element = $(selector).get(0);

	if (!element || !window.bootstrap) {
		$(selector).toggle(!!show);
		return;
	}

	var instance = bootstrap.Collapse.getOrCreateInstance(element, {
		toggle: false
	});

	if (show) {
		instance.show();
		return;
	}

	instance.hide();
	$(selector).find("input:not([type='checkbox']), select, textarea").val("").removeClass("is-invalid");
	REGRA_FISCAL.clearTomSelects(selector);
};

REGRA_FISCAL.atualizarIndicadores = function () {
	var operacao = $("#tipoOperacao").val();
	var destino = $("#destinoOperacao").val();
	var movimentos = [];

	if ($("#movimentaEstoque").is(":checked")) {
		movimentos.push("Estoque");
	}

	if ($("#movimentaFinanceiro").is(":checked")) {
		movimentos.push("Financeiro");
	}

	$("#badgeOperacao").text(operacao ? operacao : "Operacao nao definida");
	$("#badgeDestino")
		.removeClass("bg-blue-lt bg-secondary-lt bg-success-lt bg-warning-lt bg-danger-lt")
		.addClass(destino === "Interestadual" ? "bg-warning-lt" : destino === "Exterior" ? "bg-danger-lt" : destino === "Interna" ? "bg-success-lt" : "bg-secondary-lt")
		.text(destino ? destino : "Destino nao definido");
	$("#badgeMovimentacao").text(movimentos.length ? movimentos.join(" + ") : "Sem movimentacao");
	$("#badgeMovimentacao").toggleClass("bg-green-lt", !!movimentos.length).toggleClass("bg-danger-lt", !movimentos.length).toggleClass("bg-secondary-lt", false);

	if ($(".js-produto-monofasico-aplicacao").filter(function () { return $(this).val() === "Sim"; }).length) {
		$("#produtoMonofasicoFederal").prop("checked", true);
	}
};

REGRA_FISCAL.clearFieldError = function () {
	$(this).removeClass("is-invalid");
	$(this).closest(".ts-wrapper").removeClass("is-invalid");
	$(this).closest(".input-group").next(".invalid-feedback.d-block").remove();
	$(this).next(".invalid-feedback.d-block").remove();
};

REGRA_FISCAL.toggleInvalid = function (selector, invalid, message) {
	var $input = $(selector);
	var select = $input.get(0);
	var $target = select && select.tomselect ? $(select.tomselect.wrapper) : $input.closest(".input-group").length ? $input.closest(".input-group") : $input;

	$input.removeClass("is-invalid");
	$target.removeClass("is-invalid");
	$target.next(".invalid-feedback.d-block").remove();

	if (!invalid) {
		return;
	}

	$input.addClass("is-invalid");
	$target.addClass("is-invalid");
	$target.after('<div class="invalid-feedback d-block">' + message + "</div>");
};

REGRA_FISCAL.clearValidation = function () {
	var $form = $("#formRegraFiscal");

	$form.find(".is-invalid").removeClass("is-invalid");
	$form.find(".invalid-feedback.d-block").remove();
};
