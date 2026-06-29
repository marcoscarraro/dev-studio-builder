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

        // O icone do botao e um <span class="button-icon"> com mask-image (SVG self-hosted).
        var icon = btn.querySelector(".button-icon");
        var origMask = icon ? (icon.style.webkitMaskImage || icon.style.maskImage) : null;

        function showFeedback() {
          if (icon) {
            var checkMask = 'url("public/components/icons/outline/check.svg")';
            icon.style.webkitMaskImage = checkMask;
            icon.style.maskImage = checkMask;
          }
          btn.classList.add("text-success");
          setTimeout(function () {
            if (icon && origMask) {
              icon.style.webkitMaskImage = origMask;
              icon.style.maskImage = origMask;
            }
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
