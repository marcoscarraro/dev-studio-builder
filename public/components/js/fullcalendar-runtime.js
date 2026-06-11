// Runtime do componente Calendario (FullCalendar) na pagina exportada.
// Inicializa no padrao da documentacao oficial do FullCalendar: espera o DOMContentLoaded,
// busca o elemento e chama new FullCalendar.Calendar(el, options).render() — nada alem disso.
// Varre o DOM por [data-fullcalendar]; as opcoes ja vem prontas em data-fc-options (JSON) e,
// quando ha data-fc-ajax-url, ela vira a fonte de eventos. Mesma logica da funcao
// initializePreviewFullCalendars do canvas do editor (builder.js).
(function () {
  var runtimeName = "TemplateBuilderFullCalendarRuntime";

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  function init(root) {
    if (!window.FullCalendar) {
      return;
    }

    var scope;
    if (root && root.querySelectorAll) {
      scope = root;
    } else {
      scope = document;
    }

    // IMPORTANTE: o seletor e qualificado com "div" porque o proprio FullCalendar injeta
    // uma tag <style data-fullcalendar> no <head> ao carregar. Um seletor generico
    // "[data-fullcalendar]" casaria com esse <style> tambem e inicializaria um calendario
    // dentro dele — corrompendo o CSS da lib (o calendario visivel fica sem grade/estilo).
    scope.querySelectorAll("div[data-fullcalendar]").forEach(function (el) {
      setup(el);
    });
  }

  function setup(el) {
    if (el._fullCalendar) {
      return;
    }

    var options = parseOptions(el.getAttribute("data-fc-options"));
    var ajaxUrl = (el.getAttribute("data-fc-ajax-url") || "").trim();

    if (ajaxUrl) {
      options.events = ajaxUrl;
    }

    var dayClick = buildDayClick(el);
    if (dayClick) {
      options.dateClick = dayClick;
    }

    var eventClick = buildEventClick(el);
    if (eventClick) {
      options.eventClick = eventClick;
    }

    el._fullCalendar = new window.FullCalendar.Calendar(el, options);
    el._fullCalendar.render();
  }

  // Clique no dia (no FullCalendar v6 o antigo "dayClick" do v3 chama-se "dateClick").
  // Abre a URL de data-fc-day-click-url no alvo de data-fc-day-click-target (_blank/_self).
  // O marcador {{date}} dentro da URL e trocado pela data clicada (YYYY-MM-DD).
  function buildDayClick(el) {
    var urlTemplate = (el.getAttribute("data-fc-day-click-url") || "").trim();
    if (!urlTemplate) {
      return null;
    }

    var target = (el.getAttribute("data-fc-day-click-target") || "").trim() || "_blank";

    return function (info) {
      var url = urlTemplate.replace(/\{\{\s*date\s*\}\}/g, encodeURIComponent(info.dateStr));
      window.open(url, target);
    };
  }

  // Clique no evento (eventClick): abre a URL de data-fc-event-click-url no alvo de
  // data-fc-event-click-target (_blank/_self). O marcador {{id}} dentro da URL e trocado
  // pelo id do evento (campo "id" no JSON de eventos) — cenario "ver detalhes do evento".
  function buildEventClick(el) {
    var urlTemplate = (el.getAttribute("data-fc-event-click-url") || "").trim();
    if (!urlTemplate) {
      return null;
    }

    var target = (el.getAttribute("data-fc-event-click-target") || "").trim() || "_blank";

    return function (info) {
      // Evita a navegacao padrao do FullCalendar quando o evento tem "url" no JSON
      // (a URL configurada aqui tem prioridade).
      if (info.jsEvent) {
        info.jsEvent.preventDefault();
      }
      var url = urlTemplate.replace(/\{\{\s*id\s*\}\}/g, encodeURIComponent(info.event.id || ""));
      window.open(url, target);
    };
  }

  function parseOptions(raw) {
    try {
      return JSON.parse(raw || "{}");
    } catch (error) {
      return {};
    }
  }

  window[runtimeName] = { init: init };

  // Padrao oficial: inicializar no DOMContentLoaded. O "else" cobre o caso de o runtime
  // ser carregado depois de a pagina ja estar pronta (ai o evento nao vai mais disparar).
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
    });
  } else {
    init();
  }
}());
