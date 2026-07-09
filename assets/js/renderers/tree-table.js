(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ treeTable: renderTreeTableComponent });

  const MAX_TREE_DEPTH = 20;

  // Nivel de um item: quantos pais ate chegar na raiz (parentId vazio ou inexistente).
  // Guarda contra ciclo (parentId mal digitado apontando pra um descendente) com um
  // limite de profundidade — sem isso um ciclo travaria o navegador num loop infinito.
  function getItemLevel(item, itemsById) {
    let level = 0;
    let current = item;
    const visited = new Set();
    while (current && current.parentId && itemsById[current.parentId] && level < MAX_TREE_DEPTH) {
      if (visited.has(current.id)) {
        break;
      }
      visited.add(current.id);
      current = itemsById[current.parentId];
      level++;
    }
    return level;
  }

  function renderTreeTableComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const title = context.escapeHtml(props.title || "Categoria");
    const items = Array.isArray(props.items) ? props.items.filter(Boolean) : [];

    const itemsById = {};
    items.forEach((item) => {
      if (item.id) {
        itemsById[item.id] = item;
      }
    });
    const parentIds = new Set(items.map((item) => item.parentId).filter(Boolean));

    const rowsHtml = items.map((item) => {
      const level = getItemLevel(item, itemsById);
      const hasChildren = Boolean(item.id) && parentIds.has(item.id);
      return renderTreeRow(item, level, hasChildren, context);
    }).join("\n");

    return [
      `<div${cssClassAttr}>`,
      `  <div class="card-header"><h3 class="card-title">${title}</h3></div>`,
      '  <div class="table-responsive">',
      '    <table class="table table-vcenter card-table tree-table" data-tree-table>',
      "      <tbody>",
      context.indent(rowsHtml, 8),
      "      </tbody>",
      "    </table>",
      "  </div>",
      "</div>"
    ].join("\n");
  }

  function renderTreeRow(item, level, hasChildren, context) {
    const id = context.escapeAttr(item.id || "");
    const parentId = context.escapeAttr(item.parentId || "");
    const collapsed = context.toBooleanValue(item.collapsed);
    const label = context.escapeHtml(item.label || "");
    const sublabel = item.sublabel ? context.escapeHtml(item.sublabel) : "";
    const indent = level * 1.75;

    const inner = hasChildren
      ? [
          `<button type="button" class="tree-toggle" data-tree-toggle aria-expanded="${collapsed ? "false" : "true"}" aria-label="Expandir/recolher">`,
          '  <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6"/></svg>',
          "</button>",
          `<strong>${label}</strong>`
        ].join("")
      : [
          '<span class="tree-leaf-icon">',
          context.renderTablerIcon("corner-down-right", ""),
          "</span>",
          '<span>',
          `<span class="d-block">${label}</span>`,
          sublabel ? `<span class="d-block text-secondary small">${sublabel}</span>` : "",
          "</span>"
        ].join("");

    const actions = context.parseDropdownActions(item.actions);
    const actionsHtml = actions.length
      ? `<div class="tree-row-actions btn-list">${actions.map(context.renderDropdownAction).join("")}</div>`
      : "";

    return [
      `<tr class="tree-row" data-tree-row data-tree-id="${id}" data-tree-parent="${parentId}" data-tree-collapsed="${collapsed ? "true" : "false"}">`,
      "  <td>",
      '    <div class="tree-row-inner">',
      `      <div class="tree-row-main" style="padding-left:${indent}rem">${inner}</div>`,
      actionsHtml ? `      ${actionsHtml}` : "",
      "    </div>",
      "  </td>",
      "</tr>"
    ].filter(Boolean).join("\n");
  }
}());
