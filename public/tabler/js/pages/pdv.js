const PDV = window.PDV || {};
window.PDV = PDV;

PDV.data = {
	produtos: [],
	clientes: [],
	vendedores: [],
	pagamentos: [],
	itens: [],
	pagamentosVenda: [],
	categoriaAtual: "Todos",
	catalogLimit: 8,
	tableProdutos: null,
	itemRemocao: null
};

PDV.masks = {};

$(document).ready(function () {
	PDV.init();
});

PDV.init = function () {
	PDV.initializeComponents();
	PDV.bindEvents();
	PDV.loadInitialData();
};

PDV.initializeComponents = function () {
	PDV.restoreCatalogState();
	PDV.initMoneyInput(document.getElementById("descontoGeral"));
	PDV.initMoneyInput(document.getElementById("pagamentoValor"));
};

PDV.bindEvents = function () {
	$("#btnToggleCatalog").on("click", PDV.toggleCatalog);
	$("#clienteId").on("change", PDV.preencherCliente);
	$("#vendedorId").on("change", PDV.preencherVendedor);
	$("#btnNovoCliente").on("click", PDV.abrirNovoCliente);
	$("#btnSimularClienteSalvo").on("click", PDV.simularClienteSalvo);
	$("#produtoBusca").on("input", HELPER.debounce(PDV.buscarProdutoRapido, 180));
	$("#produtoBusca").on("keydown", PDV.tratarTeclasProduto);
	$("#produtoResultados").on("click", "[data-produto-id]", PDV.adicionarProdutoResultado);
	$("#btnPesquisaProdutos").on("click", PDV.abrirPesquisaProdutos);
	$("#pdvItens").on("click", ".btn-remover-item", PDV.removerItem);
	$("#pdvItens").on("click", ".btn-qty-minus", PDV.decrementarQuantidade);
	$("#pdvItens").on("click", ".btn-qty-plus", PDV.incrementarQuantidade);
	$("#pdvItens").on("input", ".item-quantidade, .item-preco, .item-desconto", PDV.atualizarItemEditado);
	$("#descontoGeral, #tipoDescontoGeral").on("input change", PDV.recalcularTotais);
	$("#catalogSearch").on("input", HELPER.debounce(PDV.renderCatalogo, 250));
	$("#pdvCategorias").on("click", "[data-categoria]", PDV.selecionarCategoria);
	$("#pdvCatalogGrid").on("click keydown", "[data-produto-id]", PDV.adicionarProdutoCatalogo);
	$("#btnCarregarMais").on("click", PDV.carregarMaisCatalogo);
	$("#btnPagamento, #btnPagamentoFooter").on("click", PDV.abrirPagamento);
	$("#btnAdicionarPagamento").on("click", PDV.adicionarPagamento);
	$("#pagamentosLista").on("click", ".btn-remover-pagamento", PDV.removerPagamento);
	$("#btnFinalizarVenda").on("click", PDV.finalizarVenda);
	$("#btnEspera, #btnEsperaFooter").on("click", PDV.salvarEspera);
	$("#btnCancelar").on("click", PDV.abrirCancelamento);
	$("#btnConfirmarCancelamento").on("click", PDV.cancelarVenda);
	$("#modalProdutoBusca").on("keyup", HELPER.debounce(PDV.filtrarModalProdutos, 250));
	$("#modalProdutoCategoria").on("change", PDV.filtrarModalProdutos);
	$("#btnLimparFiltroProdutos").on("click", PDV.limparFiltroModalProdutos);
	$("#tablePdvProdutos").on("click", "[data-modal-produto-id]", PDV.adicionarProdutoModalClick);
	$(document).on("keydown", PDV.tratarAtalhos);
	$(document).on("click", function (event) {
		if (!$(event.target).closest("#produtoBusca, #produtoResultados").length) {
			$("#produtoResultados").addClass("d-none");
		}
	});
};

PDV.loadInitialData = function () {
	HELPER.ajaxGet("../mock/produtos.json", {
		success: function (response) {
			PDV.data.produtos = PDV.normalizeRows(response).filter(function (produto) {
				return produto.status_text !== "Inativo";
			});
			PDV.renderCategorias();
			PDV.renderCatalogo();
			PDV.initProdutosDataTable();
		}
	});

	HELPER.ajaxGet("../mock/clientes.json", {
		success: function (response) {
			PDV.data.clientes = PDV.normalizeRows(response);
			PDV.initTomSelect("#clienteId", PDV.data.clientes, ["text", "documento", "telefone", "id"]);
			PDV.selectFirstOption("#clienteId");
		}
	});

	HELPER.ajaxGet("../mock/vendedores.json", {
		success: function (response) {
			PDV.data.vendedores = PDV.normalizeRows(response);
			PDV.initTomSelect("#vendedorId", PDV.data.vendedores, ["text", "codigo", "id"]);
			PDV.selectFirstOption("#vendedorId");
		}
	});

	HELPER.ajaxGet("../mock/pagamentos.json", {
		success: function (response) {
			PDV.data.pagamentos = PDV.normalizeRows(response);
			PDV.renderFormasPagamento();
		}
	});
};

PDV.initTomSelect = function (selector, rows, searchFields) {
	var select = $(selector).get(0);

	if (!window.TomSelect || !select || select.tomselect) {
		return;
	}

	new window.TomSelect(select, {
		plugins: ["dropdown_input", "clear_button"],
		copyClassesToDropdown: false,
		controlInput: "<input>",
		valueField: "id",
		labelField: "text",
		searchField: searchFields,
		options: rows,
		placeholder: $(select).data("placeholder") || "",
		load: HELPER.debounce(function (query, callback) {
			callback(PDV.filterRows(rows, query, searchFields));
		}, 300),
		render: {
			option: function (item, escape) {
				var detail = item.documento || item.telefone || item.codigo || ("Codigo " + item.id);
				return '<div><div class="fw-medium">' + escape(item.text) + '</div><div class="text-secondary small">' + escape(detail || "") + "</div></div>";
			}
		}
	});
};

PDV.selectFirstOption = function (selector) {
	var select = $(selector).get(0);

	if (select && select.tomselect && Object.keys(select.tomselect.options).length) {
		select.tomselect.setValue(Object.keys(select.tomselect.options)[0]);
	}
};

PDV.preencherCliente = function () {
	var cliente = PDV.findById(PDV.data.clientes, $("#clienteId").val());

	$("#clienteDocumento").val(cliente ? cliente.documento : "");
	$("#clienteTelefone").val(cliente ? cliente.telefone : "");
};

PDV.preencherVendedor = function () {
	var vendedor = PDV.findById(PDV.data.vendedores, $("#vendedorId").val());

	$("#vendedorAvatar").text(vendedor ? vendedor.avatar : "--");
	$("#vendedorNome").text(vendedor ? vendedor.text : "Selecione um vendedor");
	$("#vendedorCodigo").text(vendedor ? vendedor.codigo : "Codigo interno");
};

PDV.getModal = function (modalId) {
	var element = document.getElementById(modalId);
	var Modal = (window.bootstrap && window.bootstrap.Modal) || (window.tabler && window.tabler.Modal);

	if (!element || !Modal) {
		return null;
	}

	return Modal.getOrCreateInstance(element);
};

PDV.abrirNovoCliente = function () {
	var modal = PDV.getModal("modalCliente");

	if (modal) {
		modal.show();
	}
};

PDV.simularClienteSalvo = function () {
	var novoCliente = {
		id: "novo-" + Date.now(),
		text: "Cliente cadastrado no PDV",
		nome_fantasia: "Cliente PDV",
		documento: "000.000.000-00",
		telefone: "(00) 90000-0000",
		email: "",
		endereco: ""
	};
	var select = $("#clienteId").get(0);

	PDV.data.clientes.push(novoCliente);

	if (select && select.tomselect) {
		select.tomselect.addOption(novoCliente);
		select.tomselect.setValue(novoCliente.id);
	}

	var modal = PDV.getModal("modalCliente");

	if (modal) {
		modal.hide();
	}
	HELPER.showToast("Cliente selecionado no PDV.", "success");
};

PDV.buscarProdutoRapido = function () {
	var termo = String($("#produtoBusca").val()).trim();
	var resultados = [];

	if (!termo) {
		$("#produtoResultados").addClass("d-none").empty();
		return;
	}

	var exato = PDV.buscarProdutoExato(termo);

	if (exato && (/^\d{8,14}$/.test(termo) || termo.toUpperCase() === String(exato.sku || "").toUpperCase())) {
		PDV.adicionarProduto(exato);
		PDV.limparBuscaProduto();
		return;
	}

	resultados = PDV.filterRows(PDV.data.produtos, termo, ["produto", "descricao", "sku", "ean13", "categoria"]).slice(0, 8);
	PDV.renderResultadosProduto(resultados);
};

PDV.tratarTeclasProduto = function (event) {
	if (event.key !== "Enter") {
		return;
	}

	event.preventDefault();

	var termo = String($("#produtoBusca").val()).trim();
	var produto = PDV.buscarProdutoExato(termo) || PDV.filterRows(PDV.data.produtos, termo, ["produto", "descricao", "sku", "ean13"])[0];

	if (produto) {
		PDV.adicionarProduto(produto);
		PDV.limparBuscaProduto();
		return;
	}

	HELPER.showToast("Produto nao encontrado.", "warning");
};

PDV.buscarProdutoExato = function (termo) {
	var q = String(termo || "").toLowerCase();

	return PDV.data.produtos.find(function (produto) {
		return [produto.ean13, produto.sku, produto.id].some(function (field) {
			return String(field || "").toLowerCase() === q;
		});
	});
};

PDV.renderResultadosProduto = function (produtos) {
	var $container = $("#produtoResultados").empty();

	if (!produtos.length) {
		$container.addClass("d-none");
		return;
	}

	produtos.forEach(function (produto) {
		$container.append(
			'<button type="button" class="list-group-item list-group-item-action" data-produto-id="' + produto.id + '">' +
				'<div class="d-flex align-items-center gap-2">' +
					(produto.foto || '<span class="avatar avatar-md rounded bg-secondary-lt">--</span>') +
					'<div class="flex-fill text-start">' +
						'<div class="fw-medium">' + PDV.escapeHtml(produto.produto) + '</div>' +
						'<div class="text-secondary small">' + PDV.escapeHtml(produto.sku || produto.ean13 || "") + " · Estoque " + PDV.escapeHtml(produto.estoque_disponivel) + '</div>' +
					'</div>' +
					'<div class="fw-bold">' + PDV.formatCurrency(produto.preco_venda_numero) + '</div>' +
				'</div>' +
			'</button>'
		);
	});

	$container.removeClass("d-none");
};

PDV.adicionarProdutoResultado = function () {
	PDV.adicionarProduto(PDV.findById(PDV.data.produtos, $(this).data("produto-id")));
	PDV.limparBuscaProduto();
};

PDV.adicionarProdutoCatalogo = function (event) {
	if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") {
		return;
	}

	event.preventDefault();
	PDV.adicionarProduto(PDV.findById(PDV.data.produtos, $(this).data("produto-id")));
	$("#produtoBusca").trigger("focus");
};

PDV.adicionarProduto = function (produto) {
	var itemExistente;

	if (!produto) {
		return;
	}

	itemExistente = PDV.data.itens.find(function (item) {
		return String(item.produto.id) === String(produto.id);
	});

	if (itemExistente) {
		itemExistente.quantidade += 1;
	} else {
		PDV.data.itens.push({
			id: Date.now() + "-" + produto.id,
			produto: produto,
			quantidade: 1,
			preco: Number(produto.preco_venda_numero || 0),
			desconto: 0
		});
	}

	PDV.renderItens();
	PDV.recalcularTotais();
};

PDV.renderItens = function () {
	var $tbody = $("#pdvItens").empty();

	PDV.data.itens.forEach(function (item) {
		var subtotal = PDV.getSubtotalItem(item);
		$tbody.append(
			'<tr data-item-id="' + item.id + '">' +
				'<td><button type="button" class="btn btn-icon btn-sm btn-outline-danger btn-remover-item" aria-label="Remover item"><svg xmlns="http://www.w3.org/2000/svg" class="icon icon-1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/></svg></button></td>' +
				'<td>' + (item.produto.foto || '<span class="avatar avatar-md rounded bg-secondary-lt">--</span>') + '</td>' +
				'<td><div class="fw-medium">' + PDV.escapeHtml(item.produto.produto) + '</div><div class="text-secondary small">' + PDV.escapeHtml(item.produto.categoria || "") + '</div></td>' +
				'<td class="text-secondary">' + PDV.escapeHtml(item.produto.sku || item.produto.ean13 || item.produto.id) + '</td>' +
				'<td><div class="input-group input-group-sm" style="width: 150px;"><button class="btn btn-outline-secondary btn-qty-minus" type="button">-</button><input type="number" class="form-control text-center item-quantidade" min="0.001" step="0.001" value="' + item.quantidade + '"><button class="btn btn-outline-secondary btn-qty-plus" type="button">+</button></div></td>' +
				'<td><input type="text" class="form-control form-control-sm item-preco" value="' + PDV.formatNumber(item.preco) + '" style="width: 110px;"></td>' +
				'<td><input type="text" class="form-control form-control-sm item-desconto" value="' + PDV.formatNumber(item.desconto) + '" style="width: 100px;"></td>' +
				'<td><strong>' + PDV.formatCurrency(subtotal) + '</strong></td>' +
			'</tr>'
		);
	});

	$("#pdvEmptyState").toggleClass("d-none", PDV.data.itens.length > 0);
	$("#badgeItens").text(PDV.data.itens.length + (PDV.data.itens.length === 1 ? " item" : " itens"));
	PDV.initDynamicMoneyMasks();
};

PDV.initDynamicMoneyMasks = function () {
	$("#pdvItens .item-preco, #pdvItens .item-desconto").each(function () {
		PDV.initMoneyInput(this);
	});
};

PDV.atualizarItemEditado = function () {
	var $row = $(this).closest("tr");
	var item = PDV.findItem($row.data("item-id"));

	if (!item) {
		return;
	}

	item.quantidade = Math.max(PDV.parseNumber($row.find(".item-quantidade").val()), 0);
	item.preco = Math.max(PDV.parseNumber($row.find(".item-preco").val()), 0);
	item.desconto = Math.max(PDV.parseNumber($row.find(".item-desconto").val()), 0);
	$row.find("td:last strong").text(PDV.formatCurrency(PDV.getSubtotalItem(item)));
	PDV.recalcularTotais();
};

PDV.incrementarQuantidade = function () {
	var item = PDV.findItem($(this).closest("tr").data("item-id"));

	if (item) {
		item.quantidade += 1;
		PDV.renderItens();
		PDV.recalcularTotais();
	}
};

PDV.decrementarQuantidade = function () {
	var item = PDV.findItem($(this).closest("tr").data("item-id"));

	if (item) {
		item.quantidade = Math.max(item.quantidade - 1, 0);
		if (item.quantidade === 0) {
			PDV.data.itens = PDV.data.itens.filter(function (row) { return row.id !== item.id; });
		}
		PDV.renderItens();
		PDV.recalcularTotais();
	}
};

PDV.removerItem = function () {
	var itemId = $(this).closest("tr").data("item-id");

	PDV.data.itens = PDV.data.itens.filter(function (item) {
		return item.id !== itemId;
	});
	PDV.renderItens();
	PDV.recalcularTotais();
	HELPER.showToast("Item removido.", "success");
};

PDV.recalcularTotais = function () {
	var subtotal = 0;
	var descontosItens = 0;
	var quantidade = 0;
	var descontoGeralBase = Math.max(PDV.parseNumber($("#descontoGeral").val()), 0);
	var descontoGeral = 0;
	var total;

	PDV.data.itens.forEach(function (item) {
		subtotal += item.quantidade * item.preco;
		descontosItens += Math.min(item.desconto, item.quantidade * item.preco);
		quantidade += item.quantidade;
	});

	if ($("#tipoDescontoGeral").val() === "percentual") {
		descontoGeral = Math.max((subtotal - descontosItens) * descontoGeralBase / 100, 0);
	} else {
		descontoGeral = descontoGeralBase;
	}

	total = Math.max(subtotal - descontosItens - descontoGeral, 0);
	$("#totalSubtotal").text(PDV.formatCurrency(subtotal));
	$("#totalDesconto").text(PDV.formatCurrency(descontosItens + descontoGeral));
	$("#totalQuantidade").text(PDV.formatNumberPlain(quantidade));
	$("#totalGeral").text(PDV.formatCurrency(total)).data("value", total);
	PDV.atualizarResumoPagamento();
};

PDV.getSubtotalItem = function (item) {
	return Math.max((item.quantidade * item.preco) - item.desconto, 0);
};

PDV.renderCategorias = function () {
	var categorias = ["Todos", "Favoritos"].concat(Array.from(new Set(PDV.data.produtos.map(function (produto) {
		return produto.categoria || "Outros";
	}))));
	var $container = $("#pdvCategorias").empty();
	var $modal = $("#modalProdutoCategoria");

	$modal.find("option:not(:first)").remove();

	categorias.forEach(function (categoria) {
		$container.append('<button type="button" class="btn btn-sm ' + (categoria === PDV.data.categoriaAtual ? "btn-primary" : "btn-outline-secondary") + '" data-categoria="' + PDV.escapeHtml(categoria) + '">' + PDV.escapeHtml(categoria) + '</button>');
		if (categoria !== "Todos" && categoria !== "Favoritos") {
			$modal.append('<option value="' + PDV.escapeHtml(categoria) + '">' + PDV.escapeHtml(categoria) + '</option>');
		}
	});
};

PDV.renderCatalogo = function () {
	var termo = $("#catalogSearch").val();
	var produtos = PDV.filterCatalogo(termo).slice(0, PDV.data.catalogLimit);
	var $grid = $("#pdvCatalogGrid").empty();

	produtos.forEach(function (produto) {
		$grid.append(
			'<div class="card pdv-product-card text-start" role="button" tabindex="0" data-produto-id="' + produto.id + '">' +
				'<div class="card-body p-2">' +
					'<div class="d-flex justify-content-between align-items-start mb-2">' + (produto.foto || '<span class="avatar rounded bg-secondary-lt">--</span>') + '<span class="badge bg-green-lt">' + PDV.formatCurrency(produto.preco_venda_numero) + '</span></div>' +
					'<div class="fw-medium text-truncate">' + PDV.escapeHtml(produto.produto) + '</div>' +
					'<div class="text-secondary small text-truncate">' + PDV.escapeHtml(produto.categoria || "") + '</div>' +
					'<div class="text-secondary small">Estoque ' + PDV.escapeHtml(produto.estoque_disponivel) + '</div>' +
				'</div>' +
			'</div>'
		);
	});

	$("#catalogCount").text(PDV.filterCatalogo(termo).length + " produtos");
	$("#btnCarregarMais").toggleClass("d-none", PDV.filterCatalogo(termo).length <= PDV.data.catalogLimit);
};

PDV.filterCatalogo = function (termo) {
	var produtos = PDV.data.produtos;

	if (PDV.data.categoriaAtual === "Favoritos") {
		produtos = produtos.slice(0, 6);
	} else if (PDV.data.categoriaAtual !== "Todos") {
		produtos = produtos.filter(function (produto) {
			return produto.categoria === PDV.data.categoriaAtual;
		});
	}

	return PDV.filterRows(produtos, termo, ["produto", "descricao", "sku", "ean13", "categoria"]);
};

PDV.selecionarCategoria = function () {
	PDV.data.categoriaAtual = $(this).data("categoria");
	PDV.data.catalogLimit = 8;
	PDV.renderCategorias();
	PDV.renderCatalogo();
};

PDV.carregarMaisCatalogo = function () {
	PDV.data.catalogLimit += 8;
	PDV.renderCatalogo();
};

PDV.toggleCatalog = function () {
	var hidden = !$("#pdvLayout").hasClass("pdv-catalog-hidden");

	$("#pdvLayout").toggleClass("pdv-catalog-hidden", hidden);
	$("#btnToggleCatalog").text(hidden ? "Mostrar catalogo" : "Ocultar catalogo");
	localStorage.setItem("pdvCatalogVisible", hidden ? "false" : "true");
};

PDV.restoreCatalogState = function () {
	var visible = localStorage.getItem("pdvCatalogVisible");

	if (visible === "false") {
		$("#pdvLayout").addClass("pdv-catalog-hidden");
		$("#btnToggleCatalog").text("Mostrar catalogo");
	}
};

PDV.abrirPesquisaProdutos = function () {
	var modal = PDV.getModal("modalProdutos");

	if (modal) {
		modal.show();
	}

	if (PDV.data.tableProdutos) {
		setTimeout(function () {
			PDV.data.tableProdutos.columns.adjust().responsive.recalc();
		}, 150);
	}
};

PDV.initProdutosDataTable = function () {
	if (!$.fn.DataTable || PDV.data.tableProdutos) {
		return;
	}

	PDV.data.tableProdutos = $("#tablePdvProdutos").DataTable({
		data: PDV.data.produtos,
		responsive: true,
		autoWidth: false,
		pageLength: 8,
		columns: [
			{ data: "foto", orderable: false, searchable: false },
			{ data: "produto" },
			{ data: "sku" },
			{ data: "categoria" },
			{ data: "estoque_disponivel" },
			{ data: "preco_venda" },
			{ data: null, orderable: false, searchable: false, className: "text-end", render: function (row) {
				return '<button type="button" class="btn btn-primary btn-sm" data-modal-produto-id="' + row.id + '">Adicionar</button>';
			}}
		],
		language: PDV.getDataTableLanguage()
	});
};

PDV.adicionarProdutoModalClick = function () {
	PDV.adicionarProdutoModal($(this).data("modal-produto-id"));
};

PDV.adicionarProdutoModal = function (id) {
	PDV.adicionarProduto(PDV.findById(PDV.data.produtos, id));
	var modal = PDV.getModal("modalProdutos");

	if (modal) {
		modal.hide();
	}

	$("#produtoBusca").trigger("focus");
};

PDV.filtrarModalProdutos = function () {
	var termo = $("#modalProdutoBusca").val();
	var categoria = $("#modalProdutoCategoria").val();

	if (!PDV.data.tableProdutos) {
		return;
	}

	PDV.data.tableProdutos.search(termo);
	PDV.data.tableProdutos.column(3).search(categoria || "");
	PDV.data.tableProdutos.draw();
};

PDV.limparFiltroModalProdutos = function () {
	$("#modalProdutoBusca").val("");
	$("#modalProdutoCategoria").val("");
	PDV.filtrarModalProdutos();
};

PDV.abrirPagamento = function () {
	if (!PDV.data.itens.length) {
		HELPER.showToast("Adicione ao menos um item antes do pagamento.", "warning");
		$("#produtoBusca").trigger("focus");
		return;
	}

	PDV.preencherValorPagamentoRestante();
	var modal = PDV.getModal("modalPagamento");

	if (modal) {
		modal.show();
	}

	setTimeout(function () { $("#pagamentoValor").trigger("focus").select(); }, 180);
};

PDV.renderFormasPagamento = function () {
	var $select = $("#pagamentoForma").empty();

	PDV.data.pagamentos.forEach(function (forma) {
		$select.append('<option value="' + forma.id + '">' + PDV.escapeHtml(forma.text) + '</option>');
	});
};

PDV.preencherValorPagamentoRestante = function () {
	var restante = Math.max(PDV.getTotalGeral() - PDV.getTotalPago(), 0);

	$("#pagamentoValor").val(PDV.formatNumber(restante));
	PDV.atualizarResumoPagamento();
};

PDV.adicionarPagamento = function () {
	var forma = PDV.findById(PDV.data.pagamentos, $("#pagamentoForma").val());
	var valor = PDV.parseNumber($("#pagamentoValor").val());

	if (!forma || valor <= 0) {
		HELPER.showToast("Informe uma forma e valor validos.", "warning");
		return;
	}

	PDV.data.pagamentosVenda.push({
		id: Date.now(),
		forma: forma,
		valor: valor
	});
	PDV.renderPagamentos();
	PDV.preencherValorPagamentoRestante();
};

PDV.renderPagamentos = function () {
	var $tbody = $("#pagamentosLista").empty();

	PDV.data.pagamentosVenda.forEach(function (pagamento) {
		$tbody.append(
			'<tr data-pagamento-id="' + pagamento.id + '">' +
				'<td>' + PDV.escapeHtml(pagamento.forma.text) + '</td>' +
				'<td>' + PDV.formatCurrency(pagamento.valor) + '</td>' +
				'<td class="text-end"><button type="button" class="btn btn-icon btn-sm btn-outline-danger btn-remover-pagamento" aria-label="Remover pagamento">x</button></td>' +
			'</tr>'
		);
	});
};

PDV.removerPagamento = function () {
	var pagamentoId = $(this).closest("tr").data("pagamento-id");

	PDV.data.pagamentosVenda = PDV.data.pagamentosVenda.filter(function (pagamento) {
		return pagamento.id !== pagamentoId;
	});
	PDV.renderPagamentos();
	PDV.preencherValorPagamentoRestante();
};

PDV.atualizarResumoPagamento = function () {
	var total = PDV.getTotalGeral();
	var pago = PDV.getTotalPago();
	var saldo = pago - total;

	$("#pagamentoTotal").text(PDV.formatCurrency(total));
	$("#pagamentoPago").text(PDV.formatCurrency(pago));
	$("#pagamentoTroco").text(PDV.formatCurrency(saldo));
	$("#pagamentoTroco").toggleClass("text-success", saldo >= 0).toggleClass("text-danger", saldo < 0);
};

PDV.finalizarVenda = function () {
	if (!PDV.data.itens.length) {
		HELPER.showToast("Venda sem itens.", "warning");
		return;
	}

	if (PDV.getTotalPago() + 0.001 < PDV.getTotalGeral()) {
		HELPER.showToast("O pagamento ainda nao fecha o total da venda.", "danger");
		return;
	}

	HELPER.setButtonLoading("#btnFinalizarVenda", true);
	setTimeout(function () {
		var modal = PDV.getModal("modalPagamento");

		HELPER.setButtonLoading("#btnFinalizarVenda", false);
		if (modal) {
			modal.hide();
		}
		PDV.limparVenda();
		HELPER.showToast("Venda finalizada com sucesso.", "success");
	}, 500);
};

PDV.salvarEspera = function () {
	if (!PDV.data.itens.length) {
		HELPER.showToast("Nao ha venda para colocar em espera.", "warning");
		return;
	}

	localStorage.setItem("pdvVendaEspera", JSON.stringify({
		itens: PDV.data.itens,
		cliente: $("#clienteId").val(),
		vendedor: $("#vendedorId").val(),
		total: PDV.getTotalGeral()
	}));
	PDV.limparVenda();
	HELPER.showToast("Venda colocada em espera.", "success");
};

PDV.abrirCancelamento = function () {
	var modal = PDV.getModal("modalCancelar");

	if (modal) {
		modal.show();
	}
};

PDV.cancelarVenda = function () {
	PDV.limparVenda();
	$("#motivoCancelamento").val("");
	var modal = PDV.getModal("modalCancelar");

	if (modal) {
		modal.hide();
	}

	HELPER.showToast("Venda cancelada.", "success");
};

PDV.limparVenda = function () {
	PDV.data.itens = [];
	PDV.data.pagamentosVenda = [];
	$("#descontoGeral").val("0,00");
	$("#pagamentosLista").empty();
	PDV.renderItens();
	PDV.recalcularTotais();
	PDV.limparBuscaProduto();
};

PDV.tratarAtalhos = function (event) {
	if ($(event.target).is("input, textarea") && event.key !== "F2" && event.key !== "F3" && event.key !== "F4" && event.key !== "F8" && event.key !== "F9") {
		return;
	}

	if (event.key === "F2") {
		event.preventDefault();
		PDV.focusSelect("#clienteId");
	}

	if (event.key === "F3") {
		event.preventDefault();
		$("#produtoBusca").trigger("focus");
	}

	if (event.key === "F4") {
		event.preventDefault();
		$("#descontoGeral").trigger("focus").select();
	}

	if (event.key === "F8") {
		event.preventDefault();
		PDV.salvarEspera();
	}

	if (event.key === "F9") {
		event.preventDefault();
		PDV.abrirPagamento();
	}
};

PDV.focusSelect = function (selector) {
	var select = $(selector).get(0);

	if (select && select.tomselect) {
		select.tomselect.focus();
		return;
	}

	$(selector).trigger("focus");
};

PDV.limparBuscaProduto = function () {
	$("#produtoBusca").val("").trigger("focus");
	$("#produtoResultados").addClass("d-none").empty();
};

PDV.initMoneyInput = function (element) {
	var key;

	if (!window.IMask || !element || element.dataset.masked === "1") {
		return;
	}

	element.dataset.masked = "1";
	key = element.id || ("money-" + Object.keys(PDV.masks).length);
	PDV.masks[key] = window.IMask(element, {
		mask: Number,
		scale: 2,
		signed: false,
		thousandsSeparator: ".",
		padFractionalZeros: true,
		normalizeZeros: true,
		radix: ",",
		mapToRadix: ["."]
	});
};

PDV.findItem = function (id) {
	return PDV.data.itens.find(function (item) {
		return String(item.id) === String(id);
	});
};

PDV.findById = function (rows, id) {
	return rows.find(function (row) {
		return String(row.id) === String(id);
	});
};

PDV.normalizeRows = function (response) {
	return response && Array.isArray(response.data) ? response.data : [];
};

PDV.filterRows = function (rows, query, fields) {
	var q = String(query || "").toLowerCase();

	if (!q) {
		return rows;
	}

	return rows.filter(function (row) {
		return fields.map(function (field) {
			return row[field] || "";
		}).join(" ").toLowerCase().indexOf(q) !== -1;
	});
};

PDV.parseNumber = function (value) {
	var normalized = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
	var number = parseFloat(normalized);

	return isNaN(number) ? 0 : number;
};

PDV.getTotalGeral = function () {
	return Number($("#totalGeral").data("value") || 0);
};

PDV.getTotalPago = function () {
	return PDV.data.pagamentosVenda.reduce(function (total, pagamento) {
		return total + Number(pagamento.valor || 0);
	}, 0);
};

PDV.formatNumber = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
};

PDV.formatNumberPlain = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		maximumFractionDigits: 3
	});
};

PDV.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL"
	});
};

PDV.escapeHtml = function (value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};

PDV.getDataTableLanguage = function () {
	return {
		emptyTable: "Nenhum registro encontrado",
		info: "Mostrando _START_ ate _END_ de _TOTAL_ registros",
		infoEmpty: "Mostrando 0 ate 0 de 0 registros",
		infoFiltered: "(filtrado de _MAX_ registros)",
		lengthMenu: "Mostrar _MENU_",
		loadingRecords: "Carregando...",
		processing: "Processando...",
		search: "Buscar:",
		zeroRecords: "Nenhum registro encontrado",
		paginate: {
			first: "Primeiro",
			last: "Ultimo",
			next: "Proximo",
			previous: "Anterior"
		}
	};
};
