// Runtime do componente Gantt (timeline horizontal) na pagina exportada.
// Por [data-gantt]: busca {resources, tasks} via data-gantt-url (AJAX, com auth opcional) e
// monta a timeline mobile-first (coluna de recursos fixa + cabecalho fixo + scroll horizontal).
// Posiciona as barras por tempo (suporta granularidade hora/dia/semana/mes). Somente leitura:
// tocar numa barra abre detalhes (bottom sheet) ou navega (barClickUrl / task.url).
(function () {
  "use strict";

  var RUNTIME = "TemplateBuilderGanttRuntime";
  if (window[RUNTIME] && window[RUNTIME].init) {
    window[RUNTIME].init();
    return;
  }

  var COL_W = { hour: 50, day: 64, week: 94, month: 120 };
  var GRAN_LABEL = { hour: "Hora", day: "Dia", week: "Semana", month: "Mes" };
  var GRANS = ["hour", "day", "week", "month"];
  var MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  var DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  var RES_W = 140;

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function parseDate(s) {
    if (s instanceof Date) { return s; }
    var str = String(s || "").trim();
    if (!str) { return null; }
    // "YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM[:SS]"
    var m = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (m) {
      return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0, 0, 0);
    }
    var d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  function debounce(fn, wait) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, wait); };
  }

  function alignStart(d, gran) {
    var x = new Date(d.getTime());
    x.setMinutes(0, 0, 0);
    if (gran === "hour") { return x; }
    x.setHours(0);
    if (gran === "day") { return x; }
    if (gran === "week") {
      var dow = (x.getDay() + 6) % 7; // segunda = 0
      x.setDate(x.getDate() - dow);
      return x;
    }
    x.setDate(1); // month
    return x;
  }
  function addStep(d, gran) {
    var x = new Date(d.getTime());
    if (gran === "hour") { x.setHours(x.getHours() + 1); }
    else if (gran === "day") { x.setDate(x.getDate() + 1); }
    else if (gran === "week") { x.setDate(x.getDate() + 7); }
    else { x.setMonth(x.getMonth() + 1); }
    return x;
  }
  function fineLabel(d, gran) {
    if (gran === "hour") { return pad(d.getHours()) + "h"; }
    if (gran === "day") { return pad(d.getDate()); }
    if (gran === "week") { return pad(d.getDate()) + "/" + pad(d.getMonth() + 1); }
    return MES[d.getMonth()];
  }
  function coarseKey(d, gran) {
    if (gran === "hour") { return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }
    if (gran === "month") { return "" + d.getFullYear(); }
    return d.getFullYear() + "-" + d.getMonth();
  }
  function coarseLabel(d, gran) {
    if (gran === "hour") { return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + " " + DIA[d.getDay()]; }
    if (gran === "month") { return "" + d.getFullYear(); }
    return MES[d.getMonth()] + " " + d.getFullYear();
  }

  function buildTicks(ws, we, gran) {
    var t = alignStart(ws, gran);
    var ticks = [];
    var guard = 0;
    while (t < we && guard < 5000) {
      var nx = addStep(t, gran);
      ticks.push({ start: t, next: nx });
      t = nx;
      guard++;
    }
    if (!ticks.length) { ticks.push({ start: alignStart(ws, gran), next: addStep(ws, gran) }); }
    return ticks;
  }
  function timeToX(date, ticks, colW) {
    if (date <= ticks[0].start) { return 0; }
    var last = ticks[ticks.length - 1];
    if (date >= last.next) { return ticks.length * colW; }
    for (var i = 0; i < ticks.length; i++) {
      if (date >= ticks[i].start && date < ticks[i].next) {
        return i * colW + (date - ticks[i].start) / (ticks[i].next - ticks[i].start) * colW;
      }
    }
    return ticks.length * colW;
  }

  function loadData(el) {
    var url = el.getAttribute("data-gantt-url");
    if (!url) { return Promise.resolve(null); }
    var headers = {};
    var authType = el.getAttribute("data-gantt-auth-type");
    var token = el.getAttribute("data-gantt-auth-token");
    if (authType === "bearer" && token) {
      headers.Authorization = "Bearer " + token;
    } else if (authType === "header" && token) {
      headers[el.getAttribute("data-gantt-auth-header") || "X-API-Key"] = token;
    }
    return fetch(url, { headers: headers }).then(function (r) {
      if (!r.ok) { throw new Error("HTTP " + r.status); }
      return r.json();
    });
  }

  function render(state) {
    if (state.view === "agenda") { renderAgenda(state); } else { renderTimeline(state); }
  }

  function toolbarHtml(state) {
    var isAgenda = state.view === "agenda";
    var btns = GRANS.map(function (g) {
      var active = !isAgenda && g === state.gran;
      return "<button type='button' class='btn btn-sm" + (active ? " btn-primary" : " btn-outline-secondary") + "' data-gantt-gran='" + g + "'>" + GRAN_LABEL[g] + "</button>";
    }).join("");
    btns += "<button type='button' class='btn btn-sm" + (isAgenda ? " btn-primary" : " btn-outline-secondary") + "' data-gantt-view='agenda'>Agenda</button>";
    return "<div class='dsb-gantt-toolbar'>"
      + "<button type='button' class='btn btn-sm btn-outline-secondary' data-gantt-today>Hoje</button>"
      + "<div class='btn-group btn-group-sm' role='group'>" + btns + "</div>"
      + "</div>";
  }

  function renderTimeline(state) {
    var el = state.el;
    var opt = state.options;
    var gran = state.gran;
    var colW = COL_W[gran] || COL_W.day;
    var tasks = (state.tasks || []).map(function (t) {
      return { raw: t, start: parseDate(t.start), end: parseDate(t.end) };
    }).filter(function (t) { return t.start && t.end && t.end > t.start; });

    if (!state.resources.length) {
      el.innerHTML = "<div class='dsb-gantt-status'>Sem dados para exibir.</div>";
      return;
    }

    // Janela de tempo
    var ws, we;
    if (opt.rangeMode === "fixed" && parseDate(opt.rangeStart) && parseDate(opt.rangeEnd)) {
      ws = parseDate(opt.rangeStart); we = parseDate(opt.rangeEnd);
    } else if (tasks.length) {
      ws = new Date(Math.min.apply(null, tasks.map(function (t) { return t.start.getTime(); })));
      we = new Date(Math.max.apply(null, tasks.map(function (t) { return t.end.getTime(); })));
    } else {
      ws = new Date(); we = addStep(alignStart(new Date(), gran), gran);
    }
    ws = alignStart(ws, gran);
    we = addStep(alignStart(new Date(we.getTime() - 1), gran), gran); // inclui o ultimo

    var ticks = buildTicks(ws, we, gran);
    var totalW = ticks.length * colW;
    var rowH = parseInt(opt.rowHeight, 10) || 44;

    var tasksByRes = {};
    tasks.forEach(function (t) {
      var rid = t.raw.resourceId;
      (tasksByRes[rid] = tasksByRes[rid] || []).push(t);
    });

    // Cabecalho de 2 niveis
    var coarse = [];
    ticks.forEach(function (tk) {
      var key = coarseKey(tk.start, gran);
      var lastSeg = coarse[coarse.length - 1];
      if (lastSeg && lastSeg.key === key) { lastSeg.span++; }
      else { coarse.push({ key: key, label: coarseLabel(tk.start, gran), span: 1 }); }
    });
    var coarseHtml = coarse.map(function (s) {
      return "<div class='dsb-gantt-coarse' style='width:" + (s.span * colW) + "px'>" + esc(s.label) + "</div>";
    }).join("");
    var fineHtml = ticks.map(function (tk) {
      var dayStart = (gran === "hour" && tk.start.getHours() === 0) ? " dsb-gantt-dayedge" : "";
      return "<div class='dsb-gantt-fine" + dayStart + "' style='width:" + colW + "px'>" + esc(fineLabel(tk.start, gran)) + "</div>";
    }).join("");

    // Linhas
    var rowsHtml = state.resources.map(function (res) {
      var bars = (tasksByRes[res.id] || []).map(function (t) {
        var x = timeToX(t.start, ticks, colW);
        var w = Math.max(timeToX(t.end, ticks, colW) - x, 8);
        var color = String(t.raw.color || "blue").replace(/[^a-z0-9-]/gi, "");
        return "<button type='button' class='dsb-gantt-bar' data-task-id='" + esc(t.raw.id) + "'"
          + " style='left:" + x + "px;width:" + w + "px;background:var(--tblr-" + color + ",#206bc4)'"
          + " title='" + esc(t.raw.label) + "'><span class='dsb-gantt-bar-label'>" + esc(t.raw.label) + "</span></button>";
      }).join("");
      return "<div class='dsb-gantt-row' style='height:" + rowH + "px'>"
        + "<div class='dsb-gantt-res' style='width:" + RES_W + "px'>"
        + "<span class='dsb-gantt-res-label'>" + esc(res.label) + "</span>"
        + (res.group ? "<span class='dsb-gantt-res-group'>" + esc(res.group) + "</span>" : "")
        + "</div>"
        + "<div class='dsb-gantt-track' style='width:" + totalW + "px'>" + bars + "</div>"
        + "</div>";
    }).join("");

    // Linha de hoje
    var todayHtml = "";
    if (opt.showToday) {
      var now = new Date();
      if (now >= ws && now < we) {
        var tx = RES_W + timeToX(now, ticks, colW);
        todayHtml = "<div class='dsb-gantt-today' style='left:" + tx + "px'></div>";
      }
    }

    state._ticks = ticks;
    state._colW = colW;
    el.innerHTML =
      toolbarHtml(state)
      + "<div class='dsb-gantt-scroll'>"
      + "<div class='dsb-gantt-grid' style='min-width:" + (RES_W + totalW) + "px'>"
      + "<div class='dsb-gantt-head'>"
      + "<div class='dsb-gantt-corner' style='width:" + RES_W + "px'>Recurso</div>"
      + "<div class='dsb-gantt-head-time' style='width:" + totalW + "px'>"
      + "<div class='dsb-gantt-coarse-row'>" + coarseHtml + "</div>"
      + "<div class='dsb-gantt-fine-row'>" + fineHtml + "</div>"
      + "</div></div>"
      + "<div class='dsb-gantt-body'>" + rowsHtml + todayHtml + "</div>"
      + "</div></div>";

    wireToolbar(state);
    wireTaskClicks(state);
    scrollToToday(state, ticks, colW, ws, we);
  }

  // Modo Agenda: tarefas em lista vertical, agrupadas por dia (data de inicio).
  function dateKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function agendaDateLabel(d) { return DIA[d.getDay()] + ", " + pad(d.getDate()) + " " + MES[d.getMonth()] + " " + d.getFullYear(); }

  function renderAgenda(state) {
    var el = state.el;
    var resById = {};
    (state.resources || []).forEach(function (r) { resById[r.id] = r; });
    var tasks = (state.tasks || []).map(function (t) {
      return { raw: t, start: parseDate(t.start) };
    }).filter(function (t) { return t.start; }).sort(function (a, b) { return a.start - b.start; });

    var body;
    if (!tasks.length) {
      body = "<div class='dsb-gantt-status'>Sem dados para exibir.</div>";
    } else {
      var todayKey = dateKey(new Date());
      var groups = [];
      var lastKey = null;
      tasks.forEach(function (t) {
        var key = dateKey(t.start);
        if (key !== lastKey) { groups.push({ key: key, date: t.start, items: [] }); lastKey = key; }
        groups[groups.length - 1].items.push(t);
      });
      body = "<div class='dsb-gantt-agenda'>" + groups.map(function (g) {
        var isToday = g.key === todayKey;
        var itemsHtml = g.items.map(function (t) {
          var res = resById[t.raw.resourceId];
          var color = String(t.raw.color || "blue").replace(/[^a-z0-9-]/gi, "");
          var meta = (res ? esc(res.label) + " &middot; " : "") + esc(fmtRange(t.raw));
          var status = t.raw.status ? "<span class='dsb-gantt-agenda-status badge bg-" + color + "-lt'>" + esc(t.raw.status) + "</span>" : "";
          return "<button type='button' class='dsb-gantt-agenda-item' data-task-id='" + esc(t.raw.id) + "'>"
            + "<span class='dsb-gantt-agenda-bar' style='background:var(--tblr-" + color + ",#206bc4)'></span>"
            + "<span class='dsb-gantt-agenda-info'>"
            + "<span class='dsb-gantt-agenda-title'>" + esc(t.raw.label) + "</span>"
            + "<span class='dsb-gantt-agenda-meta'>" + meta + "</span>"
            + "</span>" + status + "</button>";
        }).join("");
        return "<div class='dsb-gantt-agenda-day" + (isToday ? " is-today" : "") + "'>"
          + "<div class='dsb-gantt-agenda-date'>" + esc(agendaDateLabel(g.date)) + (isToday ? " <span class='dsb-gantt-agenda-todaytag'>Hoje</span>" : "") + "</div>"
          + itemsHtml + "</div>";
      }).join("") + "</div>";
    }

    el.innerHTML = toolbarHtml(state) + body;
    wireToolbar(state);
    wireTaskClicks(state);
    scrollToTodayAgenda(state);
  }

  function scrollToTodayAgenda(state) {
    requestAnimationFrame(function () {
      var container = state.el.querySelector(".dsb-gantt-agenda");
      if (!container) { return; }
      var todayEl = container.querySelector(".dsb-gantt-agenda-day.is-today");
      if (!todayEl) { return; }
      container.scrollTop += todayEl.getBoundingClientRect().top - container.getBoundingClientRect().top;
    });
  }

  function wireToolbar(state) {
    var el = state.el;
    el.querySelectorAll("[data-gantt-gran]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.view = "timeline";
        state.gran = b.getAttribute("data-gantt-gran");
        render(state);
      });
    });
    var agendaBtn = el.querySelector("[data-gantt-view='agenda']");
    if (agendaBtn) {
      agendaBtn.addEventListener("click", function () { state.view = "agenda"; render(state); });
    }
    var todayBtn = el.querySelector("[data-gantt-today]");
    if (todayBtn) {
      todayBtn.addEventListener("click", function () {
        if (state.view === "agenda") { scrollToTodayAgenda(state); }
        else { scrollToToday(state, state._ticks, state._colW, null, null, true); }
      });
    }
  }

  function wireTaskClicks(state) {
    state.el.querySelectorAll("[data-task-id]").forEach(function (b) {
      b.addEventListener("click", function () {
        var task = findTask(state, b.getAttribute("data-task-id"));
        if (task) { onBarClick(state, task); }
      });
    });
  }

  function findTask(state, id) {
    var list = state.tasks || [];
    for (var i = 0; i < list.length; i++) { if (String(list[i].id) === String(id)) { return list[i]; } }
    return null;
  }

  function onBarClick(state, task) {
    var url = (state.options.barClickUrl || "").trim();
    if (url) {
      url = url.replace(/\{\{\s*id\s*\}\}/g, encodeURIComponent(task.id));
      window.open(url, state.options.barClickTarget || "_self");
      return;
    }
    if (task.url) { window.open(task.url, state.options.barClickTarget || "_self"); return; }
    showSheet(state, task);
  }

  function fmtRange(task) {
    var s = parseDate(task.start), e = parseDate(task.end);
    function f(d) { return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
    return s && e ? f(s) + "  ->  " + f(e) : "";
  }

  function showSheet(state, task) {
    closeSheet(state);
    var res = (state.resources || []).filter(function (r) { return r.id === task.resourceId; })[0];
    var sheet = document.createElement("div");
    sheet.className = "dsb-gantt-sheet";
    sheet.innerHTML =
      "<div class='dsb-gantt-sheet-backdrop' data-gantt-sheet-close></div>"
      + "<div class='dsb-gantt-sheet-panel' role='dialog' aria-modal='true'>"
      + "<div class='dsb-gantt-sheet-head'><strong>" + esc(task.label) + "</strong>"
      + "<button type='button' class='btn-close' aria-label='Fechar' data-gantt-sheet-close></button></div>"
      + "<div class='dsb-gantt-sheet-body'>"
      + (res ? "<div><span class='text-secondary'>Recurso:</span> " + esc(res.label) + "</div>" : "")
      + "<div><span class='text-secondary'>Periodo:</span> " + esc(fmtRange(task)) + "</div>"
      + (task.status ? "<div><span class='text-secondary'>Status:</span> " + esc(task.status) + "</div>" : "")
      + (task.url ? "<div class='mt-2'><a class='btn btn-sm btn-primary' href='" + esc(task.url) + "'>Abrir</a></div>" : "")
      + "</div></div>";
    document.body.appendChild(sheet);
    state._sheet = sheet;
    sheet.querySelectorAll("[data-gantt-sheet-close]").forEach(function (c) {
      c.addEventListener("click", function () { closeSheet(state); });
    });
  }
  function closeSheet(state) {
    if (state._sheet && state._sheet.parentNode) { state._sheet.parentNode.removeChild(state._sheet); }
    state._sheet = null;
  }

  function scrollToToday(state, ticks, colW, ws, we, force) {
    var scroll = state.el.querySelector(".dsb-gantt-scroll");
    if (!scroll) { return; }
    var now = new Date();
    requestAnimationFrame(function () {
      var x = timeToX(now, ticks, colW);
      var target = Math.max(0, x - scroll.clientWidth / 2 + RES_W);
      if (force || x > 0) { scroll.scrollLeft = target; }
    });
  }

  function setup(el) {
    if (el._ganttReady) { return; }
    el._ganttReady = true;
    var options = {};
    try { options = JSON.parse(el.getAttribute("data-gantt-options") || "{}"); } catch (e) {}
    var state = { el: el, options: options, gran: options.granularity || "day", view: "timeline", resources: [], tasks: [] };
    el._ganttState = state;

    el.innerHTML = "<div class='dsb-gantt-status'>Carregando…</div>";
    loadData(el).then(function (data) {
      if (!data) { el.innerHTML = "<div class='dsb-gantt-status'>Defina a URL dos dados (JSON com resources e tasks).</div>"; return; }
      state.resources = Array.isArray(data.resources) ? data.resources : [];
      state.tasks = Array.isArray(data.tasks) ? data.tasks : [];
      render(state);
    }).catch(function () {
      el.innerHTML = "<div class='dsb-gantt-status dsb-gantt-error'>Nao foi possivel carregar os dados.</div>";
    });

    window.addEventListener("resize", debounce(function () {
      if (el._ganttState && el._ganttState.resources.length) { render(el._ganttState); }
    }, 200));
  }

  function init(root) {
    var scope = (root && root.querySelectorAll) ? root : document;
    scope.querySelectorAll("[data-gantt]").forEach(function (el) { setup(el); });
  }

  window[RUNTIME] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
