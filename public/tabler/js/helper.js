const HELPER = window.HELPER || {};
window.HELPER = HELPER;

HELPER.init = function () {
	HELPER.initSidebarState();
	HELPER.bindEvents();
};

HELPER.getCsrfToken = function () {
	var token = $('meta[name="csrf-token"]').attr("content");

	return token || null;
}

HELPER.setButtonLoading = function (button, loading) {
	var $button = $(button);

	if (!$button.length) {
		return;
	}

	if (loading) {
		$button.data("original-html", $button.html());
		$button.prop("disabled", true);
		$button.addClass("btn-loading");
		return;
	}

	$button.prop("disabled", false);
	$button.removeClass("btn-loading");

	var originalHtml = $button.data("original-html");
	if (originalHtml) {
		$button.html(originalHtml);
		$button.removeData("original-html");
	}
}

HELPER.ensureToastContainer = function () {
	var $container = $(".toast-container");

	if ($container.length) {
		return $container;
	}

	$container = $('<div class="toast-container position-fixed top-0 end-0 p-3"></div>');
	$container.css("z-index", 1080);
	$("body").append($container);

	return $container;
}

HELPER.showToast = function (message, type, options) {
	type = type || "success";
	options = options || {};

	var $container = HELPER.ensureToastContainer();
	var $toast = $(
		'<div class="toast align-items-center text-bg-' + type + ' border-0" role="alert" aria-live="assertive" aria-atomic="true">' +
			'<div class="d-flex">' +
				'<div class="toast-body"></div>' +
				'<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>' +
			"</div>" +
		"</div>"
	);

	$toast.find(".toast-body").text(message);
	$container.append($toast);

	if (window.bootstrap && window.bootstrap.Toast) {
		window.bootstrap.Toast.getOrCreateInstance($toast.get(0), {
			delay: options.delay || 5000
		}).show();
	} else {
		$toast.addClass("show");
		setTimeout(function () {
			$toast.remove();
		}, options.delay || 5000);
	}

	return $toast;
}

HELPER.clearValidationErrors = function (context) {
	var $root = $(context);

	if (!$root.length) {
		$root = $(document);
	}

	$root.find(".is-invalid").removeClass("is-invalid");
	$root.find(".invalid-feedback").remove();
}

HELPER.showValidationErrors = function (errors, context) {
	var $root = $(context);

	if (!$root.length) {
		$root = $(document);
	}

	HELPER.clearValidationErrors($root);

	$.each(errors, function (field, messages) {
		var $input = $root.find('[name="' + field + '"]').first();

		if (!$input.length) {
			return;
		}

		if (!Array.isArray(messages)) {
			messages = [messages];
		}

		$input.addClass("is-invalid");
		$input.after('<div class="invalid-feedback">' + (messages[0] || "Campo invalido.") + "</div>");
	});
}

HELPER.debounce = function (fn, delay) {
	var timer;

	return function () {
		var args = arguments;
		var context = this;

		clearTimeout(timer);
		timer = setTimeout(function () {
			fn.apply(context, args);
		}, delay || 300);
	};
}

HELPER.normalizeDigits = function (value) {
	return String(value || "").replace(/\D/g, "");
}

HELPER.ajaxRequest = function (method, url, data, options) {
	options = options || {};
	data = data || {};

	if (options.button) {
		HELPER.setButtonLoading(options.button, true);
	}

	var ajaxOptions = {
		url: url,
		method: method,
		data: data,
		dataType: "json"
	};

	if (options.headers) {
		ajaxOptions.headers = $.extend({}, options.headers);
	}

	if (method !== "GET") {
		ajaxOptions.contentType = options.contentType || "application/json; charset=utf-8";
		ajaxOptions.processData = options.processData === undefined ? false : options.processData;
		ajaxOptions.beforeSend = function (xhr) {
			var csrf = HELPER.getCsrfToken();

			if (csrf) {
				xhr.setRequestHeader("X-CSRF-TOKEN", csrf);
			}
		};

		if (options.contentType === false || data instanceof FormData) {
			ajaxOptions.contentType = false;
			ajaxOptions.processData = false;
			ajaxOptions.data = data;
		} else {
			ajaxOptions.data = JSON.stringify(data);
		}
	}

	ajaxOptions.success = function (response) {
		if (response && response.message) {
			HELPER.showToast(response.message, response.status === false ? "danger" : "success");
		}

		if (response && response.redirect) {
			window.location.href = response.redirect;
		}

		if (typeof options.success === "function") {
			options.success(response);
		}
	};

	ajaxOptions.error = function (xhr) {
		var response = xhr.responseJSON || {};

		if (xhr.status === 422) {
			if (response.message && !options.silentError) {
				HELPER.showToast(response.message, "danger");
			}

			if (response.errors) {
				HELPER.showValidationErrors(response.errors, options.form || document);
			}
		} else if (!options.silentError) {
			HELPER.showToast(response.message || "Ocorreu um erro inesperado.", "danger");
		}

		if (typeof options.error === "function") {
			options.error(xhr);
		}
	};

	ajaxOptions.complete = function () {
		if (options.button) {
			HELPER.setButtonLoading(options.button, false);
		}

		if (typeof options.complete === "function") {
			options.complete();
		}
	};

	return $.ajax(ajaxOptions);
}

HELPER.ajaxGet = function (url, options) {
	return HELPER.ajaxRequest("GET", url, {}, options);
}

HELPER.buscarCepViaCep = function (cep, options) {
	var cepDigits = HELPER.normalizeDigits(cep);

	return HELPER.ajaxGet("https://viacep.com.br/ws/" + cepDigits + "/json/", options);
}

HELPER.buscarCnpjWs = function (cnpj, options) {
	var cnpjDigits = HELPER.normalizeDigits(cnpj);

	return HELPER.ajaxGet("https://publica.cnpj.ws/cnpj/" + cnpjDigits, options);
}

HELPER.buscarProdutoOpenFoodFacts = function (ean, options) {
	var eanDigits = HELPER.normalizeDigits(ean);

	return HELPER.ajaxGet("https://world.openfoodfacts.org/api/v2/product/" + eanDigits + ".json", options);
}

HELPER.buscarNcmBrasilApi = function (query, options) {
	return HELPER.ajaxGet("https://brasilapi.com.br/api/ncm/v1?search=" + encodeURIComponent(query), options);
}

HELPER.ajaxPost = function (url, data, options) {
	return HELPER.ajaxRequest("POST", url, data, options);
}

HELPER.ajaxPut = function (url, data, options) {
	return HELPER.ajaxRequest("PUT", url, data, options);
}

HELPER.ajaxDelete = function (url, data, options) {
	return HELPER.ajaxRequest("DELETE", url, data, options);
}

HELPER.populateForm = function (form, data) {
	var $root = $(form);

	if (!$root.length || !data) {
		return;
	}

	$.each(data, function (field, value) {
		var $input = $root.find('[name="' + field + '"]').first();

		if (!$input.length) {
			return;
		}

		if ($input.is(":checkbox")) {
			$input.prop("checked", !!value);
			return;
		}

		if ($input.is(":radio")) {
			$root.find('[name="' + field + '"][value="' + value + '"]').prop("checked", true);
			return;
		}

		$input.val(value);
	});
}

HELPER.getDataTableColumnVisibilityStorageKey = function (settings) {
	var tableId = settings && (settings.sInstance || settings.sTableId);

	if (!tableId && settings && settings.nTable) {
		tableId = settings.nTable.id;
	}

	return "DataTables_ColumnVisibility_" + (tableId || "table") + "_" + window.location.pathname;
}

HELPER.saveDataTableColumnVisibilityState = function (settings, data) {
	if (!data || !Array.isArray(data.columns)) {
		return;
	}

	try {
		var state = {
			time: data.time || Date.now(),
			columns: data.columns.map(function (column) {
				return {
					visible: column.visible !== false
				};
			})
		};

		if (Array.isArray(data.ColReorder)) {
			state.ColReorder = data.ColReorder.slice();
		}

		localStorage.setItem(HELPER.getDataTableColumnVisibilityStorageKey(settings), JSON.stringify(state));
	} catch (error) {
	}
}

HELPER.loadDataTableColumnVisibilityState = function (settings) {
	try {
		var rawState = localStorage.getItem(HELPER.getDataTableColumnVisibilityStorageKey(settings));

		if (!rawState) {
			return null;
		}

		var state = JSON.parse(rawState);
		var columns = state && Array.isArray(state.columns) ? state.columns : null;
		var currentColumnCount = settings && settings.aoColumns ? settings.aoColumns.length : 0;

		if (!columns || (currentColumnCount && columns.length !== currentColumnCount)) {
			return null;
		}

		var loadedState = {
			time: state.time || Date.now(),
			columns: columns.map(function (column) {
				return {
					visible: column.visible !== false
				};
			})
		};

		if (Array.isArray(state.ColReorder) && (!currentColumnCount || state.ColReorder.length === currentColumnCount)) {
			loadedState.ColReorder = state.ColReorder.slice();
		} else if (currentColumnCount) {
			loadedState.ColReorder = columns.map(function (column, index) {
				return index;
			});
		}

		return loadedState;
	} catch (error) {
		return null;
	}
}



HELPER.bindEvents = function () {
	$(document)
		.off("click.fullscreenToggle", "[data-fullscreen-toggle]")
		.on("click.fullscreenToggle", "[data-fullscreen-toggle]", HELPER.fullscreenToggle);
}

HELPER.isDesktopSidebar = function () {
	return window.matchMedia("(min-width: 992px)").matches;
}

HELPER.initSidebarState = function () {
	if (localStorage.getItem("sidebar-collapsed") === "1" && HELPER.isDesktopSidebar()) {
		document.body.classList.add("sidebar-collapsed");
	}

	HELPER.updateSidebarToggle();
}

HELPER.updateSidebarToggle = function () {
	var collapsed = document.body.classList.contains("sidebar-collapsed");
	var label = collapsed ? "Mostrar menu" : "Recolher menu";

	var $buttons = $("[data-sidebar-collapse-toggle]");

	$buttons
		.attr("aria-label", label)
		.attr("title", label)
		.attr("aria-pressed", collapsed ? "true" : "false");

	if (HELPER.isDesktopSidebar()) {
		$buttons.attr("aria-expanded", collapsed ? "false" : "true");
		return;
	}

	$buttons.attr("aria-expanded", "false");
}

HELPER.toggleSidebar = function () {
	var collapsed = document.body.classList.toggle("sidebar-collapsed");

	localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
	HELPER.updateSidebarToggle();
}

document.addEventListener("click", function (event) {
	var button = event.target.closest("[data-sidebar-collapse-toggle]");

	if (!button || !HELPER.isDesktopSidebar()) {
		return;
	}

	event.preventDefault();
	event.stopImmediatePropagation();
	HELPER.toggleSidebar();
}, true);

window.addEventListener("resize", HELPER.debounce(function () {
	if (!HELPER.isDesktopSidebar()) {
		document.body.classList.remove("sidebar-collapsed");
	}

	HELPER.updateSidebarToggle();
}, 150));

HELPER.fullscreenToggle = function (event) {
	event.preventDefault();

	if (!document.fullscreenElement) {
		document.documentElement.requestFullscreen();
		return;
	}

	document.exitFullscreen();
}



$(document).ready(function () {
	HELPER.init();
});

