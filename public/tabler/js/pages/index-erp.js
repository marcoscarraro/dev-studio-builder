const INDEX_ERP = window.INDEX_ERP || {};
window.INDEX_ERP = INDEX_ERP;

$(document).ready(function () {
	INDEX_ERP.init();
});

INDEX_ERP.init = function () {
	INDEX_ERP.initializeComponents();
	INDEX_ERP.bindEvents();
	INDEX_ERP.loadInitialData();
};

INDEX_ERP.initializeComponents = function () {
	INDEX_ERP.initFaturamentoChart();
}

INDEX_ERP.bindEvents = function () {
}

INDEX_ERP.loadInitialData = function () {
}

INDEX_ERP.initFaturamentoChart = function () {
	var $chart = $("#chart-faturamento-12m");

	if (!$chart.length || !window.ApexCharts) {
		return;
	}

	var chart = new window.ApexCharts($chart.get(0), {
		chart: {
			type: "line",
			fontFamily: "inherit",
			height: 340,
			toolbar: {
				show: false
			},
			animations: {
				enabled: false
			}
		},
		series: [
			{
				name: "Ano atual",
				data: [182, 195, 178, 214, 226, 241, 233, 252, 268, 279, 291, 305]
			},
			{
				name: "Mesmo periodo do ano passado",
				data: [154, 161, 150, 173, 180, 189, 186, 197, 204, 212, 218, 224]
			}
		],
		stroke: {
			width: [3, 2],
			curve: "smooth"
		},
		colors: ["var(--tblr-primary)", "var(--tblr-secondary)"],
		dataLabels: {
			enabled: false
		},
		grid: {
			strokeDashArray: 4
		},
		xaxis: {
			categories: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
			axisBorder: {
				show: false
			},
			axisTicks: {
				show: false
			}
		},
		yaxis: {
			labels: {
				formatter: function (value) {
					return "R$ " + value + "k";
				}
			}
		},
		tooltip: {
			theme: "dark",
			y: {
				formatter: function (value) {
					return "R$ " + value + " mil";
				}
			}
		},
		legend: {
			position: "top",
			horizontalAlign: "left"
		}
	});

	chart.render();
}



