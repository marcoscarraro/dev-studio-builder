(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ emptyState: renderEmptyStateComponent });

  function renderEmptyStateComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const icon = props.icon ? context.renderTablerIcon(props.icon, props.iconColor) : "";
    const title = context.escapeHtml(props.title || "Nenhum resultado");
    const description = context.escapeHtml(props.description || "");
    const showAction = context.toBooleanValue(props.showAction);
    const actionText = context.escapeHtml(props.actionText || "Adicionar");
    const actionHref = props.actionHref || "#";
    const actionCssClass = props.actionCssClass || "btn btn-primary";

    const iconHtml = icon
      ? `<div class="mb-3"><span class="avatar avatar-lg bg-primary-lt text-primary">${icon}</span></div>`
      : "";

    const descHtml = description
      ? `<p class="text-secondary">${description}</p>`
      : "";

    const actionHtml = showAction
      ? `<div class="mt-3"><a href="${context.escapeAttr(actionHref)}"${context.classAttr(actionCssClass)}>${actionText}</a></div>`
      : "";

    return [
      `<div${cssClassAttr}>`,
      `  ${iconHtml}<h3>${title}</h3>${descHtml}${actionHtml}`,
      "</div>"
    ].join("\n");
  }
}());
