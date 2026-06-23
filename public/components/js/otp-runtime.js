// Runtime do componente Codigo 2FA / OTP na pagina exportada.
// Para cada [data-otp]: liga as caixas (auto-avanco, backspace, setas), trata colar/
// autofill (distribui o codigo nas caixas), filtra numeros (se data-otp-numeric) e
// mantem o valor completo num input hidden ([data-otp-value]) para o envio do form.
// Com data-otp-autosubmit="true", envia o formulario quando todas as caixas estao preenchidas.
(function () {
  var runtimeName = "TemplateBuilderOtpRuntime";

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  function init(root) {
    var scope = (root && root.querySelectorAll) ? root : document;
    scope.querySelectorAll("[data-otp]").forEach(setup);
  }

  function setup(el) {
    if (el._otpReady) {
      return;
    }
    el._otpReady = true;

    var boxes = Array.prototype.slice.call(el.querySelectorAll("[data-otp-box]"));
    if (!boxes.length) {
      return;
    }
    var hidden = el.querySelector("[data-otp-value]");
    var numeric = el.getAttribute("data-otp-numeric") !== "false";
    var autosubmit = el.getAttribute("data-otp-autosubmit") === "true";

    function clean(str) {
      str = String(str == null ? "" : str);
      return numeric ? str.replace(/\D/g, "") : str.replace(/\s/g, "");
    }

    function sync() {
      var value = boxes.map(function (b) { return b.value; }).join("");
      if (hidden) {
        hidden.value = value;
      }
      var complete = value.length === boxes.length && boxes.every(function (b) { return b.value !== ""; });
      if (complete) {
        el.dispatchEvent(new CustomEvent("otp:complete", { bubbles: true, detail: { value: value } }));
        if (autosubmit) {
          var form = el.closest("form");
          if (form) {
            if (form.requestSubmit) {
              form.requestSubmit();
            } else {
              form.submit();
            }
          }
        }
      }
    }

    function distribute(str, startIndex) {
      str = clean(str);
      for (var i = 0; i < str.length && (startIndex + i) < boxes.length; i++) {
        boxes[startIndex + i].value = str.charAt(i);
      }
      var next = Math.min(startIndex + str.length, boxes.length - 1);
      boxes[next].focus();
      sync();
    }

    boxes.forEach(function (box, index) {
      box.addEventListener("input", function () {
        var v = clean(box.value);
        if (v.length > 1) {
          // colou/autofill varios caracteres nesta caixa: distribui.
          distribute(v, index);
          return;
        }
        box.value = v;
        if (v && index < boxes.length - 1) {
          boxes[index + 1].focus();
        }
        sync();
      });

      box.addEventListener("keydown", function (event) {
        if (event.key === "Backspace" && box.value === "" && index > 0) {
          event.preventDefault();
          boxes[index - 1].value = "";
          boxes[index - 1].focus();
          sync();
        } else if (event.key === "ArrowLeft" && index > 0) {
          event.preventDefault();
          boxes[index - 1].focus();
        } else if (event.key === "ArrowRight" && index < boxes.length - 1) {
          event.preventDefault();
          boxes[index + 1].focus();
        }
      });

      box.addEventListener("paste", function (event) {
        event.preventDefault();
        var data = (event.clipboardData || window.clipboardData);
        distribute(data ? data.getData("text") : "", index);
      });

      box.addEventListener("focus", function () {
        box.select();
      });
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
