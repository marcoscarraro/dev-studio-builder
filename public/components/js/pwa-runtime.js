// Runtime do componente PWA na pagina exportada.
// - Registra o service worker (data-sw-url / data-sw-scope no elemento [data-pwa]).
// - Botao [data-pwa-install]: usa o evento beforeinstallprompt (Android/Chrome/Edge);
//   fica oculto ate o app ser instalavel. iOS nao dispara esse evento (instalacao
//   manual via "Adicionar a Tela de Inicio").
// - Botao [data-pwa-notify]: pede permissao de notificacao e dispara uma local de exemplo.
//   Push real (servidor) exige VAPID + backend — ver docs/PWA.md.
(function () {
  var runtimeName = "TemplateBuilderPwaRuntime";

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  var deferredPrompt = null;
  var globalBound = false;
  var swRegistered = false;

  function init(root) {
    var scope = (root && root.querySelectorAll) ? root : document;
    bindGlobal();
    scope.querySelectorAll("[data-pwa]").forEach(setup);
  }

  function bindGlobal() {
    if (globalBound) {
      return;
    }
    globalBound = true;

    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      deferredPrompt = event;
      document.querySelectorAll("[data-pwa-install]").forEach(function (btn) {
        btn.hidden = false;
      });
    });

    window.addEventListener("appinstalled", function () {
      deferredPrompt = null;
      document.querySelectorAll("[data-pwa-install]").forEach(function (btn) {
        btn.hidden = true;
      });
    });
  }

  function setup(el) {
    if (el._pwaReady) {
      return;
    }
    el._pwaReady = true;

    registerServiceWorker(el.getAttribute("data-sw-url") || "/sw.js", el.getAttribute("data-sw-scope") || "/");

    var installBtn = el.querySelector("[data-pwa-install]");
    if (installBtn && !installBtn._pwaBound) {
      installBtn._pwaBound = true;
      // Oculta ate o navegador sinalizar que o app e instalavel.
      if (!deferredPrompt) {
        installBtn.hidden = true;
      }
      installBtn.addEventListener("click", function () {
        if (!deferredPrompt) {
          return;
        }
        deferredPrompt.prompt();
        var choice = deferredPrompt.userChoice;
        deferredPrompt = null;
        installBtn.hidden = true;
        if (choice && choice.then) {
          choice.catch(function () {});
        }
      });
    }

    var notifyBtn = el.querySelector("[data-pwa-notify]");
    if (notifyBtn && !notifyBtn._pwaBound) {
      notifyBtn._pwaBound = true;
      notifyBtn.addEventListener("click", function () {
        if (!("Notification" in window)) {
          return;
        }
        Notification.requestPermission().then(function (permission) {
          if (permission !== "granted") {
            return;
          }
          var title = el.getAttribute("data-notify-title") || "Notificacao";
          var options = { body: el.getAttribute("data-notify-body") || "" };
          var icon = el.getAttribute("data-notify-icon") || "";
          if (icon) {
            options.icon = icon;
          }
          try {
            new Notification(title, options);
          } catch (e) {}
        });
      });
    }
  }

  function registerServiceWorker(url, scope) {
    if (swRegistered || !("serviceWorker" in navigator)) {
      return;
    }
    swRegistered = true;
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(url, { scope: scope }).catch(function () {});
    });
  }

  window[runtimeName] = { init: init };

  document.addEventListener("fieldlist:row-added", function (e) {
    if (e.detail && e.detail.row) {
      init(e.detail.row);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
