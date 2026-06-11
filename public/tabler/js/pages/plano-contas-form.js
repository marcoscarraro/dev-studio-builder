const PLANO_CONTAS = window.PLANO_CONTAS || {};
window.PLANO_CONTAS = PLANO_CONTAS;

PLANO_CONTAS.data = {
	contasSuperiores: [],
	contasBancarias: []
};

PLANO_CONTAS.masks = {};

$(document).ready(function () {
	PLANO_CONTAS.init();
});

PLANO_CONTAS.init = function () {
	PLANO_CONTAS.initializeComponents();
	PLANO_CONTAS.bindEvents();
	PLANO_CONTAS.loadInitialData();
};

PLANO_CONTAS.initializeComponents = function () {
	PLANO_CONTAS.initTomSelects("#formPlanoContas");
	PLANO_CONTAS.initMasks();
	PLANO_CONTAS.calcularNivelHierarquico();
};

PLANO_CONTAS.bindEvents = function () {
	$("#formPlanoContas").on("submit", function (event) {
		event.preventDefault();
		var submitter = event.originalEvent && event.originalEvent.submitter ? "#" + event.originalEvent.submitter.id : "#btnSalvar";
		PLANO_CONTAS.salvarFormulario(submitter, false);
	});

	$("#btnSalvarNovo, #btnSalvarNovoHeader").on("click", function () {
		PLANO_CONTAS.salvarFormulario("#" + this.id, true);
	});

	$("#tipoConta").on("change", PLANO_CONTAS.atualizarRegrasTipoConta);
	$("#status").on("change", PLANO_CONTAS.atualizarBadgeStatus);
	$("#contaSuperiorId").on("change", function () {
		PLANO_CONTAS.calcularNivelHierarquico();
		PLANO_CONTAS.sugerirClassificacao();
	});

	$("#formPlanoContas").on("input change", "input, select, textarea", PLANO_CONTAS.removerErroCampo);
};

PLANO_CONTAS.loadInitialData = function () {
	HELPER.ajaxGet("../mock/plano-contas.json", {
		silentError: true,
		success: function (response) {
			var data = response && response.data ? response.data : {};

			PLANO_CONTAS.data.contasSuperiores = data.contas_superiores || [];
			PLANO_CONTAS.data.contasBancarias = data.contas_bancarias || [];
			PLANO_CONTAS.refreshTomSelect("#contaSuperiorId", PLANO_CONTAS.data.contasSuperiores);
			PLANO_CONTAS.refreshTomSelect("#contaBancariaId", PLANO_CONTAS.data.contasBancarias);
			PLANO_CONTAS.aplicarSugestaoInicial(data.sugestao || {});
		},
		error: function () {
			HELPER.showToast("Nao foi possivel carregar os dados auxiliares do plano de contas.", "warning");
		}
	});
};

PLANO_CONTAS.salvarFormulario = function (button, novoAposSalvar) {
	var form = $("#formPlanoContas").get(0);

	PLANO_CONTAS.clearValidation();

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Revise os campos obrigatorios antes de salvar.", "warning");
		return;
	}

	if (!PLANO_CONTAS.validarRegrasNegocio()) {
		return;
	}

	$(form).removeClass("was-validated");

	var id = PLANO_CONTAS.getUrlParam("id");
	var request = id ? HELPER.ajaxPut : HELPER.ajaxPost;
	var url = id ? form.action + "/" + id : form.action;

	request(url, PLANO_CONTAS.coletarPayload(), {
		button: button,
		form: "#formPlanoContas",
		success: function () {
			HELPER.showToast("Plano de contas salvo com sucesso.", "success");

			if (novoAposSalvar) {
				PLANO_CONTAS.limparFormulario();
			}
		},
		error: function () {
			HELPER.showToast("Nao foi possivel salvar agora. Os dados foram mantidos na tela.", "danger");
		}
	});
};

PLANO_CONTAS.buscarContaSuperior = function (query, callback) {
	HELPER.ajaxGet("../mock/plano-contas.json", {
		silentError: true,
		success: function (response) {
			var data = response && response.data ? response.data : {};
			var contas = PLANO_CONTAS.normalizarOpcoes(data.contas_superiores || []);

			PLANO_CONTAS.data.contasSuperiores = contas;
			callback(PLANO_CONTAS.filtrarContas(contas, query).slice(0, 20));
		},
		error: function () {
			callback();
		}
	});
};

PLANO_CONTAS.calcularNivelHierarquico = function () {
	var conta = PLANO_CONTAS.getContaSuperiorSelecionada();
	var nivel = conta ? Number(conta.nivel || 1) + 1 : 1;

	$("#nivelHierarquico").val(nivel);

	return nivel;
};

PLANO_CONTAS.sugerirClassificacao = function () {
	var $classificacao = $("#classificacao");

	if ($classificacao.val()) {
		return;
	}

	var conta = PLANO_CONTAS.getContaSuperiorSelecionada();

	if (conta) {
		$classificacao.val(String(conta.classificacao || conta.codigo || "1") + ".001").trigger("input");
		return;
	}

	$classificacao.val(PLANO_CONTAS.proximaClassificacaoRaiz()).trigger("input");
};

PLANO_CONTAS.atualizarRegrasTipoConta = function () {
	var tipo = $("#tipoConta").val();
	var $aceitaLancamento = $("#aceitaLancamento");

	if (tipo === "sintetica") {
		$aceitaLancamento.prop("checked", false).prop("disabled", true);
		HELPER.showToast("Conta sintetica nao recebe lancamentos financeiros.", "info");
		return;
	}

	if (tipo === "analitica") {
		$aceitaLancamento.prop("disabled", false).prop("checked", true);
		return;
	}

	$aceitaLancamento.prop("disabled", false);
};

PLANO_CONTAS.validarRegrasNegocio = function () {
	if ($("#tipoConta").val() === "sintetica" && $("#aceitaLancamento").is(":checked")) {
		PLANO_CONTAS.showFieldError("#aceitaLancamento", "Conta sintetica nao pode receber lancamentos.");
		HELPER.showToast("Conta sintetica nao pode receber lancamentos.", "warning");
		return false;
	}

	return true;
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
			preload: true,
			placeholder: $(select).data("placeholder") || "",
			load: HELPER.debounce(function (query, callback) {
				if (select.id === "contaSuperiorId") {
					PLANO_CONTAS.buscarContaSuperior(query, callback);
					return;
				}

				callback(PLANO_CONTAS.filtrarContas(PLANO_CONTAS.getOptionsForSelect(select.id), query).slice(0, 20));
			}, 350),
			render: {
				no_results: function () {
					return '<div class="no-results px-2 py-2 text-secondary">Nenhum resultado encontrado</div>';
				},
				option: function (data, escape) {
					var meta = [data.codigo, data.classificacao].filter(Boolean).join(" - ");
					return '<div><div class="fw-medium">' + escape(data.text || "") + '</div><div class="text-secondary small">' + escape(meta) + "</div></div>";
				}
			}
		});
	});
};

PLANO_CONTAS.initMasks = function () {
	var element = document.getElementById("classificacao");

	if (!window.IMask || !element) {
		return;
	}

	PLANO_CONTAS.masks.classificacao = window.IMask(element, {
		mask: /^[0-9.]*$/
	});
};

PLANO_CONTAS.refreshTomSelect = function (selector, rows) {
	var select = $(selector).get(0);
	var normalized = PLANO_CONTAS.normalizarOpcoes(rows || []);

	if (!select || !select.tomselect) {
		return;
	}

	select.tomselect.clearOptions();
	select.tomselect.addOptions(normalized);
	select.tomselect.refreshOptions(false);
};

PLANO_CONTAS.aplicarSugestaoInicial = function (sugestao) {
	$("#codigoConta").val(sugestao.codigo_conta || "1.01.001");
	$("#classificacao").val(sugestao.classificacao || "1.01.001");
	$("#ordemExibicao").val(sugestao.ordem_exibicao || 10);
	$("#nivelHierarquico").val(1);
};

PLANO_CONTAS.coletarPayload = function () {
	var payload = {};

	$("#formPlanoContas").serializeArray().forEach(function (field) {
		payload[field.name] = field.value;
	});

	$("#formPlanoContas input[type='checkbox']").each(function () {
		payload[this.name] = $(this).is(":checked");
	});

	payload.nivel_hierarquico = Number($("#nivelHierarquico").val() || 1);
	payload.ordem_exibicao = Number($("#ordemExibicao").val() || 0);

	return payload;
};

PLANO_CONTAS.limparFormulario = function () {
	var form = $("#formPlanoContas").get(0);

	form.reset();
	$("#formPlanoContas").removeClass("was-validated");
	PLANO_CONTAS.clearValidation();
	PLANO_CONTAS.clearTomSelect("#contaSuperiorId");
	PLANO_CONTAS.clearTomSelect("#contaBancariaId");
	$("#status, #aceitaLancamento").prop("checked", true);
	$("#aceitaLancamento").prop("disabled", false);
	PLANO_CONTAS.aplicarSugestaoInicial({});
	PLANO_CONTAS.atualizarBadgeStatus();
};

PLANO_CONTAS.removerErroCampo = function () {
	var $field = $(this);

	$field.removeClass("is-invalid");
	$field.closest(".mb-3, .col-12, .col-6").find("> .invalid-feedback[data-generated='true']").remove();
};

PLANO_CONTAS.showFieldError = function (selector, message) {
	var $field = $(selector);

	$field.addClass("is-invalid");
	$field.closest(".form-check").next(".invalid-feedback[data-generated='true']").remove();
	$field.closest(".form-check").after('<div class="invalid-feedback d-block" data-generated="true">' + PLANO_CONTAS.escapeHtml(message) + "</div>");
};

PLANO_CONTAS.clearValidation = function () {
	var $form = $("#formPlanoContas");

	$form.find(".is-invalid").removeClass("is-invalid");
	$form.find(".invalid-feedback[data-generated='true']").remove();
};

PLANO_CONTAS.atualizarBadgeStatus = function () {
	var ativo = $("#status").is(":checked");

	$("#badgeStatusConta").attr("class", ativo ? "badge bg-green-lt" : "badge bg-secondary-lt").text(ativo ? "Ativa" : "Inativa");
};

PLANO_CONTAS.getContaSuperiorSelecionada = function () {
	var id = $("#contaSuperiorId").val();

	if (!id) {
		return null;
	}

	return PLANO_CONTAS.data.contasSuperiores.find(function (conta) {
		return String(conta.id) === String(id);
	}) || null;
};

PLANO_CONTAS.getOptionsForSelect = function (id) {
	var map = {
		contaSuperiorId: PLANO_CONTAS.data.contasSuperiores,
		contaBancariaId: PLANO_CONTAS.data.contasBancarias
	};

	return map[id] || [];
};

PLANO_CONTAS.clearTomSelect = function (selector) {
	var select = $(selector).get(0);

	if (select && select.tomselect) {
		select.tomselect.clear(true);
		return;
	}

	$(selector).val("");
};

PLANO_CONTAS.normalizarOpcoes = function (rows) {
	return rows.map(function (row) {
		var codigo = row.codigo || row.codigo_conta || "";
		var descricao = row.descricao || row.nome || row.text || "";
		var classificacao = row.classificacao || "";

		return $.extend({}, row, {
			id: String(row.id),
			codigo: codigo,
			descricao: descricao,
			classificacao: classificacao,
			text: [codigo, descricao].filter(Boolean).join(" - ")
		});
	});
};

PLANO_CONTAS.filtrarContas = function (items, query) {
	var q = String(query || "").toLowerCase();

	if (!q) {
		return items;
	}

	return items.filter(function (item) {
		return [item.text, item.codigo, item.descricao, item.classificacao, item.natureza].join(" ").toLowerCase().indexOf(q) !== -1;
	});
};

PLANO_CONTAS.proximaClassificacaoRaiz = function () {
	var maiores = PLANO_CONTAS.data.contasSuperiores
		.filter(function (conta) {
			return Number(conta.nivel || 1) === 1;
		})
		.map(function (conta) {
			return parseInt(String(conta.classificacao || conta.codigo || "0").split(".")[0], 10) || 0;
		});

	return String((Math.max.apply(null, maiores.concat([0])) || 0) + 1);
};

PLANO_CONTAS.getUrlParam = function (key) {
	return new URLSearchParams(window.location.search).get(key);
};

PLANO_CONTAS.escapeHtml = function (value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};
