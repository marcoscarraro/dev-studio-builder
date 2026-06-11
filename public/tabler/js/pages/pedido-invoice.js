const PEDIDO_INVOICE = window.PEDIDO_INVOICE || {};
window.PEDIDO_INVOICE = PEDIDO_INVOICE;

$(document).ready(function () {
	PEDIDO_INVOICE.init();
});

PEDIDO_INVOICE.init = function () {
	PEDIDO_INVOICE.initializeComponents();
	PEDIDO_INVOICE.bindEvents();
	PEDIDO_INVOICE.loadInitialData();
};

PEDIDO_INVOICE.initializeComponents = function () {
}

PEDIDO_INVOICE.bindEvents = function () {
	$("#btnImprimirInvoice").on("click", function () {
		window.print();
	});
}

PEDIDO_INVOICE.loadInitialData = function () {
	var numero = PEDIDO_INVOICE.getUrlParam("numero");

	HELPER.ajaxGet("../mock/pedidos.json", {
		success: function (response) {
			var rows = response && Array.isArray(response.data) ? response.data : [];
			var pedido = rows.find(function (row) {
				return row.numero === numero;
			});

			if (!pedido) {
				$(".card-lg").addClass("d-none");
				$("#invoiceNotFound").removeClass("d-none");
				return;
			}

			PEDIDO_INVOICE.renderInvoicePedido(pedido);
		}
	});
}

PEDIDO_INVOICE.renderInvoicePedido = function (pedido) {
	var itens = PEDIDO_INVOICE.getPedidoItens(pedido);
	var subtotal = PEDIDO_INVOICE.sumItens(itens);
	var total = Number(pedido.valor_total_numero || 0);
	var desconto = Math.max(subtotal - total, 0);
	var frete = Math.max(total - subtotal, 0);

	$("#pageTitleInvoice").text("Detalhes - " + pedido.numero);
	$("#invoiceClienteNome").text(pedido.cliente);
	$("#invoiceClienteDados").html(
		PEDIDO_INVOICE.escapeHtml(pedido.documento) + "<br>" +
		PEDIDO_INVOICE.escapeHtml(pedido.forma_pagamento) + "<br>" +
		"Vencimento: " + PEDIDO_INVOICE.escapeHtml(pedido.vencimento)
	);
	$("#invoiceNumero").text(pedido.tipo_text + " " + pedido.numero);
	$("#invoiceDatas").text("Emissao: " + pedido.data_emissao + " | Vencimento: " + pedido.vencimento + " | Vendedor: " + pedido.vendedor);
	$("#invoiceBadges").html(pedido.tipo + " " + pedido.situacao + " " + pedido.financeiro);
	$("#invoiceTotalDestaque").text(PEDIDO_INVOICE.formatCurrency(total));
	$("#invoiceObservacoes").text(PEDIDO_INVOICE.getObservacaoPedido(pedido));
	$("#invoiceSubtotal").text(PEDIDO_INVOICE.formatCurrency(subtotal));
	$("#invoiceDescontos").text(PEDIDO_INVOICE.formatCurrency(desconto));
	$("#invoiceFrete").text(PEDIDO_INVOICE.formatCurrency(frete));
	$("#invoiceTotal").text(PEDIDO_INVOICE.formatCurrency(total));
	$("#btnEditarInvoice").attr("href", PEDIDO_INVOICE.getPedidoEditUrl(pedido));
	PEDIDO_INVOICE.renderInvoiceItens(itens);
}

PEDIDO_INVOICE.renderInvoiceItens = function (itens) {
	var html = "";

	itens.forEach(function (item, index) {
		html += "" +
			"<tr>" +
				'<td class="text-center">' + (index + 1) + "</td>" +
				"<td>" +
					'<p class="strong mb-1">' + PEDIDO_INVOICE.escapeHtml(item.nome) + "</p>" +
					'<div class="text-secondary">' + PEDIDO_INVOICE.escapeHtml(item.descricao) + "</div>" +
				"</td>" +
				'<td class="text-center">' + PEDIDO_INVOICE.formatQuantity(item.quantidade) + "</td>" +
				'<td class="text-end">' + PEDIDO_INVOICE.formatCurrency(item.unitario) + "</td>" +
				'<td class="text-end">' + PEDIDO_INVOICE.formatCurrency(item.quantidade * item.unitario) + "</td>" +
			"</tr>";
	});

	$("#invoiceItens").html(html);
}

PEDIDO_INVOICE.getPedidoItens = function (pedido) {
	var catalogo = {
		"PV-000123": [
			{ nome: "Coca-Cola 2L", descricao: "Refrigerante garrafa 2 litros", quantidade: 120, unitario: 9.9 },
			{ nome: "Cafe Torrado Tradicional 500g", descricao: "Pacote 500g", quantidade: 80, unitario: 19.9 },
			{ nome: "Arroz tipo 1 5kg", descricao: "Pacote 5kg", quantidade: 290, unitario: 29.9 }
		],
		"OR-000348": [
			{ nome: "Consultoria operacional", descricao: "Pacote de horas para melhoria de processos", quantidade: 24, unitario: 260 },
			{ nome: "Instalacao tecnica", descricao: "Servico tecnico em unidade do cliente", quantidade: 6, unitario: 150 },
			{ nome: "Suporte remoto", descricao: "Acompanhamento pos-proposta", quantidade: 4, unitario: 295.13 }
		],
		"PV-000124": [
			{ nome: "Detergente neutro 500ml", descricao: "Produto de limpeza institucional", quantidade: 900, unitario: 3.5 },
			{ nome: "Arroz tipo 1 5kg", descricao: "Suprimento alimenticio", quantidade: 380, unitario: 29.9 },
			{ nome: "Instalacao tecnica", descricao: "Servico de implantacao", quantidade: 12, unitario: 150 }
		],
		"OR-000349": [
			{ nome: "Instalacao tecnica", descricao: "Instalacao residencial assistida", quantidade: 4, unitario: 150 },
			{ nome: "Consultoria operacional", descricao: "Orientacao comercial", quantidade: 2, unitario: 260 },
			{ nome: "Material complementar", descricao: "Itens avulsos para execucao", quantidade: 1, unitario: 360 }
		],
		"PV-000125": [
			{ nome: "Cafe Torrado Tradicional 500g", descricao: "Abastecimento semanal", quantidade: 90, unitario: 19.9 },
			{ nome: "Detergente neutro 500ml", descricao: "Higienizacao operacional", quantidade: 120, unitario: 3.5 },
			{ nome: "Arroz tipo 1 5kg", descricao: "Consumo interno", quantidade: 50, unitario: 29.9 }
		],
		"PV-000126": [
			{ nome: "Instalacao tecnica", descricao: "Servico cancelado antes da execucao", quantidade: 2, unitario: 150 },
			{ nome: "Consultoria operacional", descricao: "Agenda cancelada", quantidade: 1, unitario: 620 }
		],
		"OR-000350": [
			{ nome: "Consultoria operacional", descricao: "Diagnostico e proposta tecnica", quantidade: 12, unitario: 260 },
			{ nome: "Instalacao tecnica", descricao: "Implantacao assistida", quantidade: 8, unitario: 150 },
			{ nome: "Treinamento de equipe", descricao: "Capacitacao presencial", quantidade: 7, unitario: 360.04 }
		],
		"PV-000127": [
			{ nome: "Coca-Cola 2L", descricao: "Venda avulsa", quantidade: 50, unitario: 9.9 },
			{ nome: "Arroz tipo 1 5kg", descricao: "Venda direta", quantidade: 40, unitario: 29.9 },
			{ nome: "Cafe Torrado Tradicional 500g", descricao: "Venda direta", quantidade: 23, unitario: 19.9 }
		]
	};

	return catalogo[pedido.numero] || [
		{ nome: "Itens do documento", descricao: "Resumo comercial consolidado", quantidade: Number(pedido.quantidade_itens || 1), unitario: Number(pedido.valor_total_numero || 0) / Number(pedido.quantidade_itens || 1) }
	];
}

PEDIDO_INVOICE.getObservacaoPedido = function (pedido) {
	if (pedido.tipo_text === "Orcamento") {
		return "Orcamento sujeito a aprovacao comercial. Validade considerada ate a data de vencimento informada.";
	}

	if (pedido.situacao_text === "Cancelado") {
		return "Pedido cancelado. Documento mantido apenas para historico operacional e conferencia.";
	}

	return "Pedido liberado para acompanhamento comercial, financeiro e operacional conforme situacao atual.";
}

PEDIDO_INVOICE.getPedidoEditUrl = function (pedido) {
	var id = pedido.numero.replace(/\D/g, "");
	var tipo = pedido.tipo_text === "Orcamento" ? "&tipo=orcamento" : "";

	return "./pedido-venda-form.html?id=" + id + tipo;
}

PEDIDO_INVOICE.sumItens = function (itens) {
	return itens.reduce(function (total, item) {
		return total + (Number(item.quantidade || 0) * Number(item.unitario || 0));
	}, 0);
}

PEDIDO_INVOICE.formatQuantity = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 3
	});
}

PEDIDO_INVOICE.formatCurrency = function (value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL"
	});
}

PEDIDO_INVOICE.getUrlParam = function (name) {
	return new URLSearchParams(window.location.search).get(name);
}

PEDIDO_INVOICE.escapeHtml = function (value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}



