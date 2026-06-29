(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    audioRecorder: renderAudioRecorderComponent
  });

  function renderAudioRecorderComponent(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var recorderId = context.sanitizeElementId(props.recorderId, component.id, "gravador");
    var resultId = recorderId + "-result";
    var inputName = (props.inputName || "audio").trim();
    var maxSeconds = parseInt(props.maxSeconds, 10) || 60;
    var showPreview = (props.showPreview !== false && props.showPreview !== "false") ? "true" : "false";
    var btnRecord = context.escapeHtml(props.btnRecordLabel || "Gravar");
    var btnStop = context.escapeHtml(props.btnStopLabel || "Parar");
    var btnClear = context.escapeHtml(props.btnClearLabel || "Descartar");

    return [
      "<div" + cssClassAttr + " id=\"" + context.escapeAttr(recorderId) + "\"" +
        " data-audio-recorder" +
        " data-ar-max-seconds=\"" + maxSeconds + "\"" +
        " data-ar-show-preview=\"" + showPreview + "\">",
      "  <div data-ar-status class=\"text-muted small mb-2\">Pronto para gravar</div>",
      "  <div class=\"d-flex gap-2 align-items-center flex-wrap\">",
      "    <button type=\"button\" class=\"btn btn-danger\" data-ar-btn-record>",
      "      " + context.renderTablerIcon("microphone") + " " + btnRecord,
      "    </button>",
      "    <button type=\"button\" class=\"btn btn-secondary\" data-ar-btn-stop style=\"display:none\">",
      "      " + context.renderTablerIcon("player-stop") + " " + btnStop,
      "    </button>",
      "    <button type=\"button\" class=\"btn btn-link text-danger px-0\" data-ar-btn-clear style=\"display:none\">" + btnClear + "</button>",
      "  </div>",
      "  <div data-ar-playback class=\"mt-2\" style=\"display:none\">",
      "    <audio data-ar-audio controls style=\"width:100%\"></audio>",
      "  </div>",
      "</div>",
      "<input type=\"hidden\" id=\"" + context.escapeAttr(resultId) + "\" name=\"" + context.escapeAttr(inputName) + "\" data-ar-result-input=\"" + context.escapeAttr(recorderId) + "\">"
    ].join("\n");
  }
}());
