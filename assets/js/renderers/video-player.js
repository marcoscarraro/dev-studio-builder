(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    videoPlayer: renderVideoPlayerComponent
  });

  function renderVideoPlayerComponent(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var src = (props.src || "").trim();
    var poster = (props.poster || "").trim();
    var label = (props.label || "").trim();
    var width = (props.width || "100%").trim();
    var preload = context.escapeAttr(props.preload || "metadata");
    var controls = (props.controls !== false && props.controls !== "false") ? " controls" : "";
    var autoplay = (props.autoplay === true || props.autoplay === "true") ? " autoplay" : "";
    var loop = (props.loop === true || props.loop === "true") ? " loop" : "";
    var muted = (props.muted === true || props.muted === "true") ? " muted" : "";

    var attrs = controls + " preload=\"" + preload + "\"" + autoplay + loop + muted;
    attrs += " style=\"width:" + context.escapeAttr(width) + ";max-width:100%\"";
    if (src) { attrs += " src=\"" + context.escapeAttr(src) + "\""; }
    if (poster) { attrs += " poster=\"" + context.escapeAttr(poster) + "\""; }

    var lines = ["<div" + cssClassAttr + ">"];
    if (label) {
      lines.push("  <p class=\"text-muted small mb-1\">" + context.escapeHtml(label) + "</p>");
    }
    lines.push(
      "  <video" + attrs + ">",
      "    Seu navegador nao suporta o player de video HTML5.",
      "  </video>",
      "</div>"
    );
    return lines.join("\n");
  }
}());
