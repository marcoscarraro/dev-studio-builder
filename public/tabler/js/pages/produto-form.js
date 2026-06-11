const PRODUTO = window.PRODUTO || {};
window.PRODUTO = PRODUTO;

PRODUTO.produtoFormMasks = {};
PRODUTO.custoIndex = 1;
PRODUTO.regraFiscalIndex = 1;

$(document).ready(function () {
	PRODUTO.init();
});

PRODUTO.init = function () {
	PRODUTO.initializeComponents();
	PRODUTO.bindEvents();
	PRODUTO.loadInitialData();
};

PRODUTO.initializeComponents = function () {
	PRODUTO.initTomSelects("#formProduto");
	PRODUTO.initMasks();
	PRODUTO.updateStockFields();
}

PRODUTO.bindEvents = function () {
	$("#btnHeaderSave").on("click", PRODUTO.acionarSalvar);
	$("#btnHeaderSaveContinue").on("click", PRODUTO.salvarContinuar);
	$("#btnSaveContinue").on("click", PRODUTO.salvarContinuar);
	$("#formProduto").on("submit", PRODUTO.salvarFormulario);
	$("#btnGerarEan").on("click", PRODUTO.gerarEan13);
	$("#btnBuscarProduto").on("click", PRODUTO.buscarProdutoPorEan);
	$("#btnBuscarNcm").on("click", PRODUTO.buscarNcm);
	$("#ncm").on("input", HELPER.debounce(PRODUTO.buscarNcmDebounced, 400));
	$("#ncmSearchResults").on("click", "[data-ncm-code]", PRODUTO.selecionarNcm);
	$("#imagemProduto").on("change", PRODUTO.previewUploadImagem);
	$("#btnAdicionarCusto").on("click", PRODUTO.adicionarCusto);
	$("#custosProduto").on("click", ".btn-remover-custo", PRODUTO.removerCusto);
	$("#custosProduto").on("input", ".custo-valor", PRODUTO.atualizarCustoTotal);
	$("#margemLucro").on("input", PRODUTO.atualizarPrecoVenda);
	$("#precoVenda").on("input", PRODUTO.atualizarMargemMarkup);
	$("#btnUsarEstruturaFiscalPadrao").on("click", PRODUTO.usarEstruturaFiscalPadrao);
	$("#btnAdicionarRegraFiscal").on("click", function () {
		PRODUTO.adicionarRegraFiscal(null, { focus: true });
	});
	$("#regrasFiscaisBody").on("click", "[data-regra-fiscal-action]", PRODUTO.executarAcaoRegraFiscal);
	$("#regrasFiscaisBody").on("input", ".regra-fiscal-cfop", PRODUTO.formatarCfopRegraFiscal);
	$("#controlarEstoque").on("change", PRODUTO.updateStockFields);
	$("#btnAddEstoque").on("click", PRODUTO.adicionarEstoqueLocal);
	$("#estoquesWrapper").on("click", ".btnRemoveEstoqueLocal", PRODUTO.removerEstoqueLocal);
	$("#ean13").on("input", function () {
		this.value = HELPER.normalizeDigits(this.value).substring(0, 13);
	});
}

PRODUTO.loadInitialData = function () {
	PRODUTO.atualizarCustoTotal();
	PRODUTO.updateRegraFiscalActions();
}

PRODUTO.acionarSalvar = function () {
	$("#btnSave").trigger("click");
}

PRODUTO.salvarContinuar = function () {
	if (!PRODUTO.validarFormularioProduto()) {
		return;
	}

	HELPER.setButtonLoading("#btnSaveContinue", true);

	setTimeout(function () {
		HELPER.setButtonLoading("#btnSaveContinue", false);
		HELPER.showToast("Produto salvo. Voce pode continuar o cadastro.", "success");
	}, 500);
}

PRODUTO.salvarFormulario = function (event) {
	event.preventDefault();

	if (!PRODUTO.validarFormularioProduto()) {
		return;
	}

	HELPER.setButtonLoading("#btnSave", true);

	setTimeout(function () {
		HELPER.setButtonLoading("#btnSave", false);
		HELPER.showToast("Produto salvo com sucesso.", "success");
	}, 500);
}

PRODUTO.buscarProdutoPorEan = function () {
	var ean = HELPER.normalizeDigits($("#ean13").val());

	PRODUTO.clearProdutoValidation();

	if (!PRODUTO.isValidEan13(ean)) {
		PRODUTO.showInputGroupError("#ean13", "Informe um EAN13 valido para buscar o produto.");
		HELPER.showToast("Informe um codigo EAN13 valido.", "warning");
		return;
	}

	HELPER.buscarProdutoOpenFoodFacts(ean, {
		button: "#btnBuscarProduto",
		success: function (response) {
			if (!response || response.status !== 1 || !response.product) {
				HELPER.showToast("Produto nao encontrado. O preenchimento manual permanece disponivel.", "warning");
				return;
			}

			PRODUTO.preencherProdutoOpenFoodFacts(response.product, ean);
			HELPER.showToast("Produto localizado com sucesso.", "success");
		},
		error: function () {
			HELPER.showToast("Nao foi possivel consultar o produto agora. Preencha manualmente.", "danger");
		}
	});
}

PRODUTO.buscarNcmDebounced = function () {
	var query = String($("#ncm").val()).trim();

	if (query.length >= 3) {
		PRODUTO.buscarNcm();
		return;
	}

	PRODUTO.limparResultadosNcm();
}

PRODUTO.buscarNcm = function () {
	var query = String($("#ncm").val()).trim();

	PRODUTO.clearNcmValidation();

	if (query.length < 2) {
		PRODUTO.showInputGroupError("#ncm", "Digite ao menos 2 caracteres para buscar o NCM.");
		HELPER.showToast("Digite um trecho de codigo ou descricao para buscar o NCM.", "warning");
		return;
	}

	PRODUTO.consultarBrasilApiNcm(query);
}

PRODUTO.consultarBrasilApiNcm = function (query) {
	HELPER.buscarNcmBrasilApi(query, {
		button: "#btnBuscarNcm",
		silentError: true,
		success: function (response) {
			var results = Array.isArray(response) ? response : [];

			if (!results.length) {
				PRODUTO.exibirNcmSemResultados();
				return;
			}

			PRODUTO.renderizarResultadosNcm(results);
		},
		error: function () {
			PRODUTO.exibirNcmSemResultados();
		}
	});
}

PRODUTO.renderizarResultadosNcm = function (items) {
	var $results = $("#ncmSearchResults");

	$results.empty();

	items.slice(0, 12).forEach(function (item) {
		var codigo = item.codigo || "";
		var descricao = item.descricao || "";
		var vigencia = PRODUTO.formatNcmVigencia(item);
		var $button = $('<button type="button" class="list-group-item list-group-item-action"></button>');
		var $content = $('<div class="d-flex w-100 justify-content-between gap-3"></div>');
		var $text = $("<div></div>");

		$button.attr("data-ncm-code", codigo);
		$button.attr("data-ncm-description", descricao);
		$text.append($("<div class=\"fw-medium\"></div>").text(codigo));
		$text.append($("<div class=\"text-secondary small\"></div>").text(descricao || "Sem descricao informada"));
		$content.append($text);
		$content.append($("<span class=\"badge bg-secondary-lt text-secondary align-self-start\"></span>").text(vigencia));
		$button.append($content);
		$results.append($button);
	});

	$results.removeClass("d-none");
	$("#ncmHint").text("Selecione uma das opcoes encontradas para preencher o NCM.");
}

PRODUTO.selecionarNcm = function () {
	var $item = $(this);
	var codigo = $item.data("ncm-code") || "";
	var descricao = $item.data("ncm-description") || "";

	$("#ncm").val(codigo);
	$("#ncmDescricao").val(descricao);
	PRODUTO.limparResultadosNcm();
	HELPER.showToast("NCM selecionado.", "success");
}

PRODUTO.exibirNcmSemResultados = function () {
	var $results = $("#ncmSearchResults");

	$results.empty();
	$results.append('<div class="list-group-item text-secondary">Nenhum NCM encontrado. Tente outro termo ou informe manualmente.</div>');
	$results.removeClass("d-none");
	$("#ncmHint").text("A busca aceita codigo parcial ou palavras da descricao.");
}

PRODUTO.limparResultadosNcm = function () {
	$("#ncmSearchResults").empty().addClass("d-none");
	$("#ncmHint").text("Busque por trecho do codigo, produto ou descricao. Ex: 1905, pao, oleo de motor.");
}

PRODUTO.clearNcmValidation = function () {
	$("#ncm").removeClass("is-invalid");
	$("#ncm").closest(".input-group").next(".invalid-feedback.d-block").remove();
}

PRODUTO.formatNcmVigencia = function (item) {
	if (!item || !item.data_fim || item.data_fim === "9999-12-31") {
		return "Vigente";
	}

	return "Ate " + item.data_fim;
}

PRODUTO.preencherProdutoOpenFoodFacts = function (product, ean) {
	var nome = product.product_name_pt || product.product_name || product.generic_name || "";
	var descricao = product.generic_name_pt || product.generic_name || product.ingredients_text_pt || product.ingredients_text || "";
	var categoria = PRODUTO.firstCsvValue(product.categories_tags) || PRODUTO.firstCsvValue(product.categories_hierarchy) || product.categories || "";
	var marca = PRODUTO.firstCsvValue(product.brands_tags) || product.brands || "";
	var quantidade = product.quantity || product.product_quantity || "";

	$("#ean13").val(ean);
	$("#nome").val(nome);
	$("#descricao").val(descricao);
	$("#descricaoCompleta").val(product.ingredients_text_pt || product.ingredients_text || descricao);
	$("#quantidade").val(quantidade);

	if (categoria) {
		PRODUTO.setSelectValue("#categoria", PRODUTO.slugValue(categoria), PRODUTO.cleanOpenFoodText(categoria));
	}

	if (marca) {
		PRODUTO.setSelectValue("#marca", PRODUTO.slugValue(marca), PRODUTO.cleanOpenFoodText(marca));
	}

	if (product.image_url) {
		PRODUTO.setPreviewImagem(product.image_url);
	}
}

PRODUTO.gerarEan13 = function () {
	var prefixo = Math.random() >= 0.5 ? "789" : "790";
	var base = prefixo;

	while (base.length < 12) {
		base += Math.floor(Math.random() * 10);
	}

	$("#ean13").val(base + PRODUTO.calculateEan13CheckDigit(base));
	HELPER.showToast("EAN13 gerado com padrao brasileiro.", "success");
}

PRODUTO.atualizarPrecoVenda = function () {
	var custo = PRODUTO.parseNumber($("#precoCusto").val());
	var margem = PRODUTO.parseNumber($("#margemLucro").val());
	var venda = 0;

	if (!custo) {
		return;
	}

	if (margem > 0 && margem < 100) {
		venda = custo / (1 - (margem / 100));
	}

	if (venda > 0) {
		$("#precoVenda").val(PRODUTO.formatNumber(venda));
	}
}

PRODUTO.atualizarMargemMarkup = function () {
	var custo = PRODUTO.parseNumber($("#precoCusto").val());
	var venda = PRODUTO.parseNumber($("#precoVenda").val());

	if (!custo || !venda) {
		return;
	}

	$("#margemLucro").val(PRODUTO.formatNumber(((venda - custo) / venda) * 100));
}

PRODUTO.adicionarCusto = function () {
	var index = PRODUTO.custoIndex++;
	var row = [
		'<tr class="custo-row" data-custo-index="' + index + '">',
			'<td><input type="text" class="form-control" name="custos[' + index + '][descricao]" placeholder="Frete, imposto, seguro..." autocomplete="off"></td>',
			'<td><input type="text" class="form-control money-field custo-valor" name="custos[' + index + '][valor]" placeholder="0,00" autocomplete="off"></td>',
			'<td><input type="text" class="form-control" name="custos[' + index + '][observacao]" placeholder="Detalhe do custo" autocomplete="off"></td>',
			'<td class="text-end"><button type="button" class="btn btn-icon btn-outline-danger btn-remover-custo" aria-label="Remover custo">' +
				'<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>' +
			'</button></td>',
		'</tr>'
	].join("");

	$("#custosProduto").append(row);
	PRODUTO.initMoneyMasks("#custosProduto .custo-row:last .money-field");
}

PRODUTO.removerCusto = function () {
	$(this).closest("tr").remove();
	PRODUTO.atualizarCustoTotal();
}

PRODUTO.atualizarCustoTotal = function () {
	var total = 0;

	$("#custosProduto .custo-valor").each(function () {
		total += PRODUTO.parseNumber($(this).val());
	});

	$("#precoCusto").val(PRODUTO.formatNumber(total));

	if (PRODUTO.parseNumber($("#margemLucro").val()) > 0) {
		PRODUTO.atualizarPrecoVenda();
		return;
	}

	if (PRODUTO.parseNumber($("#precoVenda").val()) > 0) {
		PRODUTO.atualizarMargemMarkup();
	}
}

PRODUTO.previewUploadImagem = function () {
	var file = this.files && this.files[0] ? this.files[0] : null;

	if (!file) {
		return;
	}

	if (file.type.indexOf("image/") !== 0) {
		HELPER.showToast("Selecione um arquivo de imagem valido.", "warning");
		this.value = "";
		return;
	}

	var reader = new FileReader();

	reader.onload = function (event) {
		PRODUTO.setPreviewImagem(event.target.result);
	};

	reader.readAsDataURL(file);
}

PRODUTO.setPreviewImagem = function (src) {
	$("#previewImagem").attr("src", src).removeClass("d-none");
	$("#previewPlaceholder").addClass("d-none");
}

PRODUTO.updateStockFields = function () {
	var enabled = $("#controlarEstoque").is(":checked");

	$(".stock-field").prop("disabled", !enabled);
	$("#btnAddEstoque").prop("disabled", !enabled);
	$(".btnRemoveEstoqueLocal").prop("disabled", !enabled);
	$("[data-stock-required]").prop("required", enabled);
	PRODUTO.updateRemoveEstoqueButtons();
}

PRODUTO.adicionarEstoqueLocal = function () {
	var index = $("#estoquesWrapper .stock-location-row").length;
	var number = index + 1;
	var template = $("#estoqueLocalTemplate").html();
	var html = template.replace(/__INDEX__/g, index).replace(/__NUMBER__/g, number);

	$("#estoquesWrapper").append(html);
	PRODUTO.reindexEstoqueLocais();
	PRODUTO.updateStockFields();
}

PRODUTO.removerEstoqueLocal = function () {
	var $rows = $("#estoquesWrapper .stock-location-row");

	if ($rows.length <= 1) {
		return;
	}

	$(this).closest(".stock-location-row").remove();
	PRODUTO.reindexEstoqueLocais();
	PRODUTO.updateStockFields();
}

PRODUTO.reindexEstoqueLocais = function () {
	$("#estoquesWrapper .stock-location-row").each(function (index) {
		var $row = $(this);

		$row.attr("data-stock-index", index);
		$row.find("[name]").each(function () {
			this.name = this.name.replace(/estoques\[\d+\]/, "estoques[" + index + "]");
		});
	});
}

PRODUTO.updateRemoveEstoqueButtons = function () {
	var $rows = $("#estoquesWrapper .stock-location-row");

	$rows.first().find(".btnRemoveEstoqueLocal").prop("disabled", true);
	$rows.slice(1).find(".btnRemoveEstoqueLocal").prop("disabled", false);
}

PRODUTO.adicionarRegraFiscal = function (data, options) {
	data = data || {};
	options = options || {};

	var index = PRODUTO.regraFiscalIndex++;
	var template = $("#regraFiscalProdutoTemplate").html();
	var html = template.replace(/__INDEX__/g, index);
	var $row = $(html);

	if (options.after && options.after.length) {
		options.after.after($row);
	} else {
		$("#regrasFiscaisBody").append($row);
	}

	PRODUTO.reindexRegrasFiscais();
	PRODUTO.initTomSelects($row);
	PRODUTO.preencherRegraFiscal($row, data);
	PRODUTO.updateRegraFiscalActions();

	if (options.focus) {
		$row.find(".regra-fiscal-descricao").trigger("focus");
	}
}

PRODUTO.executarAcaoRegraFiscal = function (event) {
	event.preventDefault();

	var action = $(this).data("regra-fiscal-action");
	var $row = $(this).closest(".regra-fiscal-row");

	if (action === "duplicar") {
		var data = PRODUTO.getRegraFiscalData($row);

		delete data.id;
		PRODUTO.adicionarRegraFiscal(data, { after: $row, focus: true });
		return;
	}

	if (action === "remover") {
		if ($("#regrasFiscaisBody .regra-fiscal-row").length <= 1) {
			HELPER.showToast("Mantenha ao menos uma regra fiscal para o produto.", "warning");
			return;
		}

		PRODUTO.destroyTomSelects($row);
		$row.remove();
		PRODUTO.reindexRegrasFiscais();
		PRODUTO.updateRegraFiscalActions();
	}
}

PRODUTO.usarEstruturaFiscalPadrao = function () {
	var regras = [
		{ descricao: "Venda contribuinte ICMS", tipo_operacao: "Venda", perfil_destinatario: "Contribuinte ICMS", prioridade: 10, ativo: true },
		{ descricao: "Venda consumidor final", tipo_operacao: "Venda", perfil_destinatario: "Consumidor Final", prioridade: 20, ativo: true },
		{ descricao: "Devolucao", tipo_operacao: "Devolucao", prioridade: 30, ativo: true },
		{ descricao: "Padrao fallback", prioridade: 99, ativo: true }
	];

	PRODUTO.destroyTomSelects("#regrasFiscaisBody");
	$("#regrasFiscaisBody").empty();
	PRODUTO.regraFiscalIndex = 0;

	regras.forEach(function (regra) {
		PRODUTO.adicionarRegraFiscal(regra);
	});

	$("#regrasFiscaisBody .regra-fiscal-row:first .regra-fiscal-tributacao-estadual").trigger("focus");
	HELPER.showToast("Estrutura fiscal padrao aplicada.", "success");
}

PRODUTO.preencherRegraFiscal = function ($row, data) {
	PRODUTO.setFieldValue($row, ".regra-fiscal-id", data.id);
	PRODUTO.setFieldValue($row, ".regra-fiscal-descricao", data.descricao);
	PRODUTO.setFieldValue($row, ".regra-fiscal-tipo-operacao", data.tipo_operacao);
	PRODUTO.setFieldValue($row, ".regra-fiscal-cfop", data.cfop);
	PRODUTO.setFieldValue($row, ".regra-fiscal-perfil-destinatario", data.perfil_destinatario);
	PRODUTO.setFieldValue($row, ".regra-fiscal-finalidade", data.finalidade);
	PRODUTO.setFieldValue($row, ".regra-fiscal-prioridade", data.prioridade || 10);
	$row.find(".regra-fiscal-ativo").prop("checked", data.ativo !== false);
	PRODUTO.setSelectValue($row.find(".regra-fiscal-tributacao-estadual"), data.tributacao_estadual_id, data.tributacao_estadual_text);
	PRODUTO.setSelectValue($row.find(".regra-fiscal-tributacao-federal"), data.tributacao_federal_id, data.tributacao_federal_text);
}

PRODUTO.getRegraFiscalData = function ($row) {
	return {
		id: PRODUTO.valueOrNull($row.find(".regra-fiscal-id").val()),
		descricao: PRODUTO.valueOrNull($row.find(".regra-fiscal-descricao").val()),
		tipo_operacao: PRODUTO.valueOrNull($row.find(".regra-fiscal-tipo-operacao").val()),
		cfop: PRODUTO.valueOrNull($row.find(".regra-fiscal-cfop").val()),
		perfil_destinatario: PRODUTO.valueOrNull($row.find(".regra-fiscal-perfil-destinatario").val()),
		finalidade: PRODUTO.valueOrNull($row.find(".regra-fiscal-finalidade").val()),
		tributacao_estadual_id: PRODUTO.valueOrNull($row.find(".regra-fiscal-tributacao-estadual").val()),
		tributacao_estadual_text: PRODUTO.getSelectText($row.find(".regra-fiscal-tributacao-estadual")),
		tributacao_federal_id: PRODUTO.valueOrNull($row.find(".regra-fiscal-tributacao-federal").val()),
		tributacao_federal_text: PRODUTO.getSelectText($row.find(".regra-fiscal-tributacao-federal")),
		prioridade: PRODUTO.valueOrNull($row.find(".regra-fiscal-prioridade").val()) || 10,
		ativo: $row.find(".regra-fiscal-ativo").is(":checked")
	};
}

PRODUTO.reindexRegrasFiscais = function () {
	$("#regrasFiscaisBody .regra-fiscal-row").each(function (index) {
		var $row = $(this);

		$row.attr("data-regra-fiscal-index", index);
		$row.find("[name]").each(function () {
			this.name = this.name.replace(/produtos_regras_fiscais\[\d+\]/, "produtos_regras_fiscais[" + index + "]");
		});
	});
}

PRODUTO.updateRegraFiscalActions = function () {
	var $rows = $("#regrasFiscaisBody .regra-fiscal-row");
	var disabled = $rows.length <= 1;

	$rows.find('[data-regra-fiscal-action="remover"]').toggleClass("disabled", disabled).attr("aria-disabled", disabled ? "true" : "false");
}

PRODUTO.formatarCfopRegraFiscal = function () {
	this.value = HELPER.normalizeDigits(this.value).substring(0, 4);
}

PRODUTO.destroyTomSelects = function (context) {
	if (!window.TomSelect) {
		return;
	}

	$(context).find("select").each(function () {
		if (this.tomselect) {
			this.tomselect.destroy();
		}
	});
}

PRODUTO.validarRegrasFiscais = function () {
	var valido = true;

	PRODUTO.clearRegrasFiscaisValidation();

	if (!$("#regrasFiscaisBody .regra-fiscal-row").length) {
		PRODUTO.adicionarRegraFiscal(null, { focus: true });
		return false;
	}

	$("#regrasFiscaisBody .regra-fiscal-row").each(function () {
		var $row = $(this);
		var cfop = HELPER.normalizeDigits($row.find(".regra-fiscal-cfop").val());
		var tributacaoEstadual = PRODUTO.valueOrNull($row.find(".regra-fiscal-tributacao-estadual").val());
		var tributacaoFederal = PRODUTO.valueOrNull($row.find(".regra-fiscal-tributacao-federal").val());
		var prioridade = PRODUTO.valueOrNull($row.find(".regra-fiscal-prioridade").val());

		if (cfop && cfop.length !== 4) {
			PRODUTO.toggleRegraFiscalInvalid($row.find(".regra-fiscal-cfop"), true, "CFOP deve ter 4 digitos.");
			valido = false;
		}

		if (!tributacaoEstadual) {
			PRODUTO.toggleRegraFiscalInvalid($row.find(".regra-fiscal-tributacao-estadual"), true, "Selecione a tributacao estadual.");
			valido = false;
		}

		if (!tributacaoFederal) {
			PRODUTO.toggleRegraFiscalInvalid($row.find(".regra-fiscal-tributacao-federal"), true, "Selecione a tributacao federal.");
			valido = false;
		}

		if (!prioridade) {
			PRODUTO.toggleRegraFiscalInvalid($row.find(".regra-fiscal-prioridade"), true, "Informe a prioridade.");
			valido = false;
		}
	});

	return valido;
}

PRODUTO.toggleRegraFiscalInvalid = function (input, invalid, message) {
	var $input = $(input);
	var $cell = $input.closest("td");

	$input.removeClass("is-invalid");
	$cell.removeClass("border border-danger").removeAttr("title");

	if (!invalid) {
		return;
	}

	$input.addClass("is-invalid");
	$cell.addClass("border border-danger").attr("title", message);
}

PRODUTO.validarFormularioProduto = function () {
	var form = $("#formProduto").get(0);
	var ean = HELPER.normalizeDigits($("#ean13").val());

	PRODUTO.clearProdutoValidation();

	if (ean && !PRODUTO.isValidEan13(ean)) {
		PRODUTO.showInputGroupError("#ean13", "Informe um EAN13 valido.");
		HELPER.showToast("Revise o codigo EAN13 antes de salvar.", "warning");
		return false;
	}

	if (!form.checkValidity()) {
		$(form).addClass("was-validated");
		HELPER.showToast("Revise os campos obrigatorios.", "warning");
		return false;
	}

	if (!PRODUTO.validarRegrasFiscais()) {
		return false;
	}

	$(form).removeClass("was-validated");
	return true;
}

PRODUTO.initTomSelects = function (context) {
	if (!window.TomSelect) {
		return;
	}

	$(context).find("select[data-tomselect]").each(function () {
		var select = this;
		var url = $(select).data("ajax-url");
		var path = $(select).data("json-path");
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
			create: true,
			placeholder: placeholder,
			preload: true,
			load: HELPER.debounce(function (query, callback) {
				PRODUTO.loadTomSelectOptions(url, path, query, callback);
			}, 300),
			render: {
				no_results: function () {
					return '<div class="no-results px-2 py-2 text-secondary">Nenhum resultado encontrado</div>';
				}
			}
		});
	});
}

PRODUTO.loadTomSelectOptions = function (url, path, query, callback) {
	if (!url) {
		callback();
		return;
	}

	HELPER.ajaxGet(url, {
		success: function (response) {
			var items = path ? PRODUTO.safeGet(response, path, []) : PRODUTO.safeGet(response, "data", []);

			if (!Array.isArray(items)) {
				items = [];
			}

			items = items.map(function (item) {
				if ($.isPlainObject(item) && !item.text && item.descricao) {
					item.text = item.descricao;
				}

				return item;
			});

			callback(PRODUTO.filterOptions(items, query).slice(0, 50));
		},
		error: function () {
			callback();
		}
	});
}

PRODUTO.initMasks = function () {
	if (!window.IMask) {
		return;
	}

	PRODUTO.maskElement("ean13", "0000000000000");
	PRODUTO.maskElement("cest", "00.000.00");
	PRODUTO.maskElement("precoCusto", PRODUTO.moneyMaskOptions());
	PRODUTO.maskElement("precoVenda", PRODUTO.moneyMaskOptions());
	PRODUTO.initMoneyMasks(".custo-valor");

	$(".percent-field").each(function () {
		PRODUTO.produtoFormMasks[this.id] = window.IMask(this, PRODUTO.moneyMaskOptions());
	});
}

PRODUTO.initMoneyMasks = function (selector) {
	if (!window.IMask) {
		return;
	}

	$(selector).each(function () {
		if ($(this).data("money-mask-ready")) {
			return;
		}

		window.IMask(this, PRODUTO.moneyMaskOptions());
		$(this).data("money-mask-ready", true);
	});
}

PRODUTO.maskElement = function (id, mask) {
	var element = document.getElementById(id);
	var options = $.isPlainObject(mask) ? mask : { mask: mask };

	if (element) {
		PRODUTO.produtoFormMasks[id] = window.IMask(element, options);
	}
}

PRODUTO.moneyMaskOptions = function () {
	return {
		mask: Number,
		scale: 2,
		signed: false,
		thousandsSeparator: ".",
		padFractionalZeros: false,
		normalizeZeros: true,
		radix: ",",
		mapToRadix: ["."]
	};
}

PRODUTO.setSelectValue = function (selector, idValue, textValue) {
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

PRODUTO.setFieldValue = function (context, selector, value) {
	if (value !== undefined && value !== null) {
		$(context).find(selector).val(value).trigger("change");
	}
}

PRODUTO.getSelectText = function (selector) {
	var select = $(selector).get(0);

	if (!select) {
		return "";
	}

	if (select.tomselect) {
		var item = select.tomselect.options[select.tomselect.getValue()];
		return item ? item.text : "";
	}

	return $(select).find("option:selected").text();
}

PRODUTO.valueOrNull = function (value) {
	value = String(value || "").trim();
	return value ? value : null;
}

PRODUTO.showInputGroupError = function (selector, message) {
	var $input = $(selector);

	$input.closest(".input-group").next(".invalid-feedback.d-block").remove();
	$input.addClass("is-invalid");
	$input.closest(".input-group").after('<div class="invalid-feedback d-block">' + message + "</div>");
}

PRODUTO.clearProdutoValidation = function () {
	var $form = $("#formProduto");

	$form.find(".is-invalid").removeClass("is-invalid");
	$form.find(".input-group + .invalid-feedback.d-block").remove();
	PRODUTO.clearRegrasFiscaisValidation();
}

PRODUTO.clearRegrasFiscaisValidation = function () {
	$("#regrasFiscaisBody .is-invalid").removeClass("is-invalid");
	$("#regrasFiscaisBody td.border-danger").removeClass("border border-danger").removeAttr("title");
}

PRODUTO.filterOptions = function (items, query) {
	var q = String(query || "").toLowerCase();

	if (!q) {
		return items;
	}

	return items.filter(function (item) {
		return String(item.text || item.name || item.label || "").toLowerCase().indexOf(q) !== -1;
	});
}

PRODUTO.isValidEan13 = function (value) {
	var ean = HELPER.normalizeDigits(value);
	var checkDigit = 0;

	if (!/^\d{13}$/.test(ean)) {
		return false;
	}

	checkDigit = PRODUTO.calculateEan13CheckDigit(ean.substring(0, 12));

	return Number(ean.charAt(12)) === checkDigit;
}

PRODUTO.calculateEan13CheckDigit = function (base) {
	var sum = 0;

	for (var i = 0; i < 12; i++) {
		sum += Number(base.charAt(i)) * (i % 2 === 0 ? 1 : 3);
	}

	return (10 - (sum % 10)) % 10;
}

PRODUTO.parseNumber = function (value) {
	var normalized = String(value || "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);

	return isNaN(number) ? 0 : number;
}

PRODUTO.formatNumber = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

PRODUTO.firstCsvValue = function (value) {
	if (Array.isArray(value)) {
		return value[0] || "";
	}

	return String(value || "").split(",")[0] || "";
}

PRODUTO.cleanOpenFoodText = function (value) {
	return String(value || "").replace(/^([a-z]{2}:)/i, "").replace(/-/g, " ").trim();
}

PRODUTO.slugValue = function (value) {
	return PRODUTO.cleanOpenFoodText(value).toLowerCase().replace(/\s+/g, "-");
}

PRODUTO.safeGet = function (obj, path, fallback) {
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
