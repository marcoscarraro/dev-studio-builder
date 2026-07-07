(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    youtubeEmbed: renderYouTubeEmbedComponent
  });

  // --- YouTube ---
  function extractYouTubeId(raw) {
    var url = (raw || "").trim();
    if (!url) return "";
    if (/^[\w-]{11}$/.test(url)) return url;
    var m;
    m = url.match(/[?&]v=([\w-]{11})/);  if (m) return m[1];
    m = url.match(/youtu\.be\/([\w-]{11})/);  if (m) return m[1];
    m = url.match(/\/embed\/([\w-]{11})/);  if (m) return m[1];
    m = url.match(/\/shorts\/([\w-]{11})/);  if (m) return m[1];
    return "";
  }

  // --- Vimeo ---
  function extractVimeoId(raw) {
    var url = (raw || "").trim();
    if (!url) return "";
    if (/^\d{6,12}$/.test(url)) return url;
    var m;
    // player.vimeo.com/video/ID
    m = url.match(/player\.vimeo\.com\/video\/(\d+)/);  if (m) return m[1];
    // vimeo.com/ID  ou  vimeo.com/channels/.../ID  ou  vimeo.com/groups/.../videos/ID
    m = url.match(/vimeo\.com\/(?:.*\/)?(\d{6,12})(?:[/?#]|$)/);  if (m) return m[1];
    return "";
  }

  function detectPlatform(raw) {
    var url = (raw || "").trim().toLowerCase();
    if (url.indexOf("vimeo") !== -1) return "vimeo";
    if (url.indexOf("youtu") !== -1) return "youtube";
    // ID puro: YouTube usa 11 chars alfanum, Vimeo usa 6-12 digitos
    if (/^\d{6,12}$/.test(url)) return "vimeo";
    if (/^[\w-]{11}$/.test(url)) return "youtube";
    return "";
  }

  function renderYouTubeEmbedComponent(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var rawUrl = (props.url || "").trim();
    var platform = detectPlatform(rawUrl);
    var ratio = (props.ratio || "16x9").replace(/[^0-9x]/g, "") || "16x9";
    var title = context.escapeAttr(props.title || "Video");
    var controls = (props.controls !== false && props.controls !== "false") ? 1 : 0;
    var autoplay = (props.autoplay === true || props.autoplay === "true") ? 1 : 0;
    var start = parseInt(props.start, 10) || 0;
    var rel = (props.rel === true || props.rel === "true") ? 1 : 0;

    var src = "";

    if (platform === "youtube") {
      var ytId = extractYouTubeId(rawUrl);
      if (ytId) {
        var params = "rel=" + rel + "&controls=" + controls + "&autoplay=" + autoplay;
        if (start > 0) { params += "&start=" + start; }
        src = "https://www.youtube.com/embed/" + context.escapeAttr(ytId) + "?" + params;
      }
    } else if (platform === "vimeo") {
      var vimeoId = extractVimeoId(rawUrl);
      if (vimeoId) {
        var vParams = "autoplay=" + autoplay + "&loop=0&muted=0&controls=" + controls;
        if (start > 0) { vParams += "&t=" + start + "s"; }
        src = "https://player.vimeo.com/video/" + context.escapeAttr(vimeoId) + "?" + vParams;
      }
    }

    if (!src) {
      return [
        "<div" + cssClassAttr + ">",
        "  <div class=\"ratio ratio-" + ratio + "\" style=\"background:var(--tblr-secondary-bg,#f0f4f8);border:2px dashed var(--tblr-border-color,#c8cfd8);display:flex;align-items:center;justify-content:center;color:var(--tblr-secondary-color,#8a99af);font-size:13px\">",
        "    Cole a URL do YouTube ou Vimeo nas propriedades",
        "  </div>",
        "</div>"
      ].join("\n");
    }

    var allow = platform === "vimeo"
      ? "autoplay; fullscreen; picture-in-picture"
      : "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";

    return [
      "<div" + cssClassAttr + ">",
      "  <div class=\"ratio ratio-" + ratio + "\">",
      "    <iframe src=\"" + src + "\"",
      "            title=\"" + title + "\"",
      "            frameborder=\"0\"",
      "            allow=\"" + allow + "\"",
      "            allowfullscreen></iframe>",
      "  </div>",
      "</div>"
    ].join("\n");
  }
}());
