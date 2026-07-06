(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    speechReader: renderSpeechReaderComponent
  });

  function renderSpeechReaderComponent(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var readerId = context.sanitizeElementId(props.readerId, component.id, "leitor");
    var target = (props.targetSelector || "#conteudo").trim();
    var lang = (props.lang || "pt-BR").trim();
    var voice = (props.voiceName || "").trim();
    var rate = clampNumber(props.rate, 1);
    var pitch = clampNumber(props.pitch, 1);
    var volume = clampNumber(props.volume, 1);
    var showStatus = props.showStatus == null ? true : context.toBooleanValue(props.showStatus);
    var btnPlay = context.escapeHtml(props.btnPlayLabel || "Ouvir");
    var btnPause = context.escapeHtml(props.btnPauseLabel || "Pausar");
    var btnStop = context.escapeHtml(props.btnStopLabel || "Parar");

    var lines = [
      "<div" + cssClassAttr + " id=\"" + context.escapeAttr(readerId) + "\"" +
        " data-speech-reader" +
        " data-sr-target=\"" + context.escapeAttr(target) + "\"" +
        " data-sr-lang=\"" + context.escapeAttr(lang) + "\"" +
        " data-sr-voice=\"" + context.escapeAttr(voice) + "\"" +
        " data-sr-rate=\"" + rate + "\"" +
        " data-sr-pitch=\"" + pitch + "\"" +
        " data-sr-volume=\"" + volume + "\">"
    ];

    if (showStatus) {
      lines.push("  <div data-sr-status class=\"text-muted small mb-2\">Pronto para ler</div>");
    }

    lines.push(
      "  <div class=\"d-flex gap-2 align-items-center flex-wrap\">",
      "    <button type=\"button\" class=\"btn btn-primary\" data-sr-play>",
      "      " + context.renderTablerIcon("volume") + " " + btnPlay,
      "    </button>",
      "    <button type=\"button\" class=\"btn btn-secondary\" data-sr-pause style=\"display:none\">",
      "      " + context.renderTablerIcon("player-pause") + " " + btnPause,
      "    </button>",
      "    <button type=\"button\" class=\"btn btn-link text-danger px-0\" data-sr-stop style=\"display:none\">" + btnStop + "</button>",
      "  </div>",
      "</div>"
    );

    return lines.join("\n");
  }

  function clampNumber(value, fallback) {
    var n = parseFloat(value);
    if (isNaN(n)) { return fallback; }
    return n;
  }
}());
