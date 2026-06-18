(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ timeline: renderTimelineComponent });

  function renderTimelineComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const items = Array.isArray(props.items) ? props.items : [];

    const itemsHtml = items.map((item) => {
      const icon = item.icon ? context.renderTablerIcon(item.icon, item.iconColor) : "";
      const iconColor = item.iconColor || "";
      const variant = item.variant || "primary";
      const dotHtml = icon
        ? `<span class="avatar avatar-xs bg-${context.escapeAttr(variant)}-lt">${icon}</span>`
        : `<span class="avatar avatar-xs bg-${context.escapeAttr(variant)}"></span>`;

      const date = item.date ? `<div class="timeline-time text-secondary">${context.escapeHtml(String(item.date))}</div>` : "";
      const desc = item.description ? `<div class="text-secondary">${context.escapeHtml(String(item.description))}</div>` : "";

      return [
        "<div class=\"timeline-event\">",
        `  <div class="timeline-event-icon">${dotHtml}</div>`,
        "  <div class=\"card timeline-event-card\">",
        "    <div class=\"card-body\">",
        date,
        `      <h4>${context.escapeHtml(String(item.title || "Evento"))}</h4>`,
        desc,
        "    </div>",
        "  </div>",
        "</div>"
      ].filter(Boolean).join("\n");
    }).join("\n");

    return `<div${cssClassAttr}>\n${itemsHtml}\n</div>`;
  }
}());
