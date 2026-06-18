(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ rating: renderRatingComponent });

  function renderRatingComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const label = props.label || "";
    const name = context.sanitizeElementId(props.name, context.sanitizeElementId(component.id, "rating"));
    const max = Math.min(10, Math.max(1, Number(props.max) || 5));
    const value = Number(props.value) || 0;
    const readonly = context.toBooleanValue(props.readonly);
    const color = props.color || "#f59f00";

    const stars = Array.from({ length: max }, (_, i) => {
      const starVal = i + 1;
      const filled = starVal <= value;
      const fillColor = filled ? context.escapeAttr(color) : "none";
      const strokeColor = context.escapeAttr(color);
      const star = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/></svg>`;

      if (readonly) {
        return star;
      }

      return `<label style="cursor:pointer" title="${starVal}"><input type="radio" name="${context.escapeAttr(name)}" value="${starVal}" style="display:none"${value === starVal ? " checked" : ""}>${star}</label>`;
    }).join("");

    const labelHtml = label ? `<label class="form-label d-block">${context.escapeHtml(label)}</label>` : "";

    return `<div${cssClassAttr}>${labelHtml}<div class="d-flex gap-1">${stars}</div></div>`;
  }
}());
