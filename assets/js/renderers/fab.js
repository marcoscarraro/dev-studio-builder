(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ fab: renderFabComponent });

  // Botao flutuante (ajuda/suporte/info): fixo no canto inferior, sempre por cima.
  // Pode ser um link simples OU um "speed-dial" com subitens que sobem ao clicar.
  function renderFabComponent(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var esc = context.escapeAttr;
    var html = context.escapeHtml;

    var icon = props.icon || "help";
    var iconOpen = props.iconOpen || "x";
    var href = esc(props.href || "#");
    var mainTarget = props.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
    var radius = esc(String(props.radius || "50%"));
    var color = /^#[0-9A-Fa-f]{6}$/.test(String(props.color || "")) ? props.color : "";
    var iconColor = /^#[0-9A-Fa-f]{6}$/.test(String(props.iconColor || "")) ? props.iconColor : "";
    var position = props.position === "bottom-left" ? "dsb-fab-bottom-left" : "dsb-fab-bottom-right";
    var ariaLabel = esc(props.label || "Ajuda");
    var items = Array.isArray(props.items) ? props.items : [];

    var styleVar = "--dsb-fab-radius:" + radius
      + (color ? (";--dsb-fab-bg:" + color) : "")
      + (iconColor ? (";--dsb-fab-fg:" + iconColor) : "");

    var lines = ['<div class="dsb-fab ' + position + '" data-fab style="' + styleVar + '">'];

    if (items.length) {
      lines.push('  <ul class="dsb-fab-items">');
      items.forEach(function (it) {
        var iHref = esc(it.href || "#");
        var iTarget = it.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
        var hasIcon = !!it.icon;
        var hasLabel = !!(it.label && String(it.label).trim());
        var subClass = "dsb-fab-sub" + (hasIcon && !hasLabel ? " dsb-fab-sub--icon" : "");
        var labelHtml = hasLabel ? ('<span class="dsb-fab-sub-label">' + html(it.label) + '</span>') : "";
        var iconHtml = hasIcon ? ('<span class="dsb-fab-sub-icon">' + context.renderTablerIcon(it.icon) + '</span>') : "";
        lines.push('    <li class="dsb-fab-item"><a class="' + subClass + '" href="' + iHref + '"' + iTarget + '>' + labelHtml + iconHtml + '</a></li>');
      });
      lines.push('  </ul>');
      lines.push('  <button class="dsb-fab-btn" type="button" data-fab-toggle data-icon="' + esc(icon) + '" data-icon-open="' + esc(iconOpen) + '" aria-expanded="false" aria-label="' + ariaLabel + '">' + context.renderTablerIcon(icon) + '</button>');
    } else {
      lines.push('  <a class="dsb-fab-btn" href="' + href + '"' + mainTarget + ' aria-label="' + ariaLabel + '">' + context.renderTablerIcon(icon) + '</a>');
    }

    lines.push('</div>');
    return lines.join("\n");
  }
}());
