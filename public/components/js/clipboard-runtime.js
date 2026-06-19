(function () {
  "use strict";

  var runtimeName = "TemplateBuilderClipboardRuntime";

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  function init(root) {
    var scope = (root && root.querySelectorAll) ? root : document;
    scope.querySelectorAll("[data-copy-btn]").forEach(function (btn) {
      if (btn._clipboard) { return; }
      btn._clipboard = true;
      btn.addEventListener("click", function () {
        var group = btn.closest(".input-group");
        var target = group ? group.querySelector("input, textarea") : null;
        if (!target) { return; }

        var icon = btn.querySelector("i");
        var origClass = icon ? icon.className : null;

        function showFeedback() {
          if (icon) { icon.className = "ti ti-check"; }
          btn.classList.add("text-success");
          setTimeout(function () {
            if (icon && origClass) { icon.className = origClass; }
            btn.classList.remove("text-success");
          }, 1500);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(target.value).then(showFeedback).catch(fallbackCopy);
        } else {
          fallbackCopy();
        }

        function fallbackCopy() {
          try {
            target.select();
            document.execCommand("copy");
            showFeedback();
          } catch (e) { console.warn("[clipboard] copy failed", e); }
        }
      });
    });
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
