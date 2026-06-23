(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ otp: renderOtpComponent });

  function clampDigits(value) {
    var n = parseInt(value, 10);
    if (isNaN(n)) n = 6;
    if (n < 1) n = 1;
    if (n > 12) n = 12;
    return n;
  }

  // Texto de instrucao: usa o override "hint" ou compoe a partir do canal de envio.
  function buildHint(props, digits) {
    if (props.hint && String(props.hint).trim()) {
      return String(props.hint);
    }
    var labels = { email: "e-mail", whatsapp: "WhatsApp", sms: "SMS" };
    var channel = labels[props.channel] || "e-mail";
    return "Digite o codigo de " + digits + " digitos enviado por " + channel + ".";
  }

  function renderOtpComponent(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var digits = clampDigits(props.digits);
    var numeric = context.toBooleanValue(props.numeric) !== false;
    var disabled = context.toBooleanValue(props.disabled);
    var required = context.toBooleanValue(props.required) ? ' <span class="required-mark">*</span>' : "";
    var hint = buildHint(props, digits);

    // Estilo inline para as caixas funcionarem no canvas e no export sem CSS extra.
    var boxStyle = "width:3rem;text-align:center;padding-left:.25rem;padding-right:.25rem;font-size:1.25rem";
    var boxes = [];
    for (var i = 0; i < digits; i++) {
      // O primeiro campo recebe autocomplete="one-time-code" p/ autofill do SMS (iOS/Android).
      var auto = i === 0 ? "one-time-code" : "off";
      boxes.push(
        '<input type="text" class="form-control" inputmode="' + (numeric ? "numeric" : "text") + '"' +
        ' autocomplete="' + auto + '" maxlength="1" aria-label="Digito ' + (i + 1) + '"' +
        ' style="' + boxStyle + '"' + (disabled ? " disabled" : "") + " data-otp-box>"
      );
    }

    var hidden = '<input type="hidden"' + context.attr("name", props.name || "codigo") + context.attr("id", props.inputId) + " data-otp-value>";

    var resend = "";
    if (context.toBooleanValue(props.showResend)) {
      resend = '<div class="mt-2"><a href="' + context.escapeAttr(props.resendHref || "#") + '" data-otp-resend>' +
        context.escapeHtml(props.resendText || "Reenviar codigo") + "</a></div>";
    }

    var dataAttrs = " data-otp" +
      ' data-otp-length="' + digits + '"' +
      ' data-otp-numeric="' + (numeric ? "true" : "false") + '"' +
      ' data-otp-autosubmit="' + (context.toBooleanValue(props.autosubmit) ? "true" : "false") + '"';

    return [
      context.renderFormLabel(context.escapeHtml(props.label || "Codigo de verificacao"), required),
      hint ? '<div class="text-secondary mb-2">' + context.escapeHtml(hint) + "</div>" : "",
      "<div" + cssClassAttr + dataAttrs + ">",
      '  <div style="display:flex;gap:.5rem;flex-wrap:wrap">',
      boxes.map(function (b) { return "    " + b; }).join("\n"),
      "  </div>",
      "  " + hidden,
      "</div>",
      resend,
      props.help ? '<div class="help-text">' + context.escapeHtml(props.help) + "</div>" : "",
      context.renderValidationFeedback(props)
    ].filter(function (line) { return line !== ""; }).join("\n");
  }
}());
