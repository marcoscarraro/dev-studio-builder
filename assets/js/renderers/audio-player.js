(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    audioPlayer: renderAudioPlayerComponent
  });

  function renderAudioPlayerComponent(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var src = (props.src || "").trim();
    var label = (props.label || "").trim();
    var width = (props.width || "100%").trim();
    var preload = context.escapeAttr(props.preload || "metadata");
    var autoplay = (props.autoplay === true || props.autoplay === "true") ? " autoplay" : "";
    var loop = (props.loop === true || props.loop === "true") ? " loop" : "";
    var muted = (props.muted === true || props.muted === "true") ? " muted" : "";
    var srcAttr = src ? " src=\"" + context.escapeAttr(src) + "\"" : "";
    var widthStyle = " style=\"width:" + context.escapeAttr(width) + "\"";

    var lines = ["<div" + cssClassAttr + ">"];
    if (label) {
      lines.push("  <p class=\"text-muted small mb-1\">" + context.escapeHtml(label) + "</p>");
    }
    lines.push(
      "  <audio controls" + srcAttr + " preload=\"" + preload + "\"" + autoplay + loop + muted + widthStyle + ">",
      "    Seu navegador nao suporta o player de audio HTML5.",
      "  </audio>",
      "</div>"
    );
    return lines.join("\n");
  }
}());
