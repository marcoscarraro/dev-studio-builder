// Logica de arrastar e soltar do canvas do editor.
// Exportado como window.TemplateBuilderDragDrop.
// Recebe um objeto "context" de builder.js com acesso ao state e funcoes de mutacao.
(function () {
  "use strict";

  // === VINCULACAO DE EVENTOS ===
  // bindCanvas: vincula dragover, dragleave, drop, click e dragstart
  //   nas tres superficies editaveis (header, canvas, footer).
  function bindCanvas(context) {
    bindEditingSurface(context, context.els.pageHeader);
    bindEditingSurface(context, context.els.canvas);
    bindEditingSurface(context, context.els.pageFooter);
  }

  function bindEditingSurface(context, surface) {
    surface.addEventListener("dragover", (event) => handleDragOver(context, event));
    surface.addEventListener("dragleave", (event) => handleDragLeave(context, event));
    surface.addEventListener("drop", (event) => handleDrop(context, event));

    surface.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]");
      if (action) {
        context.handleInlineAction(action);
        return;
      }

      const node = event.target.closest("[data-component-id], [data-row-id]");

      if (node && surface.contains(node)) {
        context.selectNode(node.dataset.componentId || node.dataset.rowId);
      } else {
        context.selectNode(surface === context.els.canvas ? null : context.state.page.id, context.getSurfaceSection(surface));
      }
    });

    surface.addEventListener("dragstart", (event) => {
      const row = event.target.closest("[data-row-id]");
      const component = event.target.closest("[data-component-id]");

      if (row && event.target.closest(".row-grip")) {
        context.state.drag = {
          source: "canvas-row",
          id: row.dataset.rowId
        };
      } else if (component) {
        context.state.drag = {
          source: "canvas-component",
          id: component.dataset.componentId
        };
      } else {
        event.preventDefault();
        return;
      }

      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", JSON.stringify(context.state.drag));
      event.target.classList.add("drag-ghost");
    });

    surface.addEventListener("dragend", (event) => {
      event.target.classList.remove("drag-ghost");
      context.clearDragState();
    });
  }

  function handleDragOver(context, event) {
    if (!context.state.drag) {
      return;
    }

    const target = getDropTarget(event.target);
    if (!target) {
      return;
    }

    const accepts = canDrop(context, context.state.drag, target);
    if (!accepts) {
      return;
    }

    event.preventDefault();
    if (context.state.drag.source === "palette") {
      event.dataTransfer.dropEffect = "copy";
    } else {
      event.dataTransfer.dropEffect = "move";
    }
    context.clearDropHighlights();
    target.classList.add("drop-zone-active");
  }

  function handleDragLeave(context, event) {
    const editorArea = document.querySelector(".canvas-scroll");
    if (!event.relatedTarget || !editorArea.contains(event.relatedTarget)) {
      context.clearDropHighlights();
    }
  }

  // === LOGICA DE DROP ===
  // handleDrop: determina a zona alvo e delega para dropOnSection,
  //   dropOnColumn ou dropOnRowContainer conforme data-drop-zone.
  // Apos o drop: commitHistory + render sao chamados via context.
  function handleDrop(context, event) {
    const target = getDropTarget(event.target);
    if (!target || !context.state.drag || !canDrop(context, context.state.drag, target)) {
      context.clearDropHighlights();
      return;
    }

    event.preventDefault();

    if (target.dataset.dropZone === "page" || target.dataset.dropZone === "header" || target.dataset.dropZone === "footer") {
      dropOnSection(context, target, event);
    }

    if (target.dataset.dropZone === "row-container") {
      dropOnRowContainer(context, target, event);
    }

    if (target.dataset.dropZone === "column") {
      dropOnColumn(context, target, event);
    }

    context.clearDragState();
    context.clearDropHighlights();
    context.commitHistory();
    context.render();
  }

  function dropOnSection(context, target, event) {
    const section = target.dataset.dropZone;
    if (context.state.drag.source === "palette") {
      const block = context.createBlock(context.state.drag.type);
      if (block.type === "row") {
        context.insertRowAt(block, context.getRowDropIndex(section, event.clientY), section);
        context.state.selectedId = block.id;
      } else {
        const row = context.createRow([12], [[block]]);
        context.insertRowAt(row, context.getRowDropIndex(section, event.clientY), section);
        context.state.selectedId = block.id;
      }
    }

    if (context.state.drag.source === "canvas-row") {
      const sourceLocation = context.findRowLocation(context.state.drag.id);
      let targetIndex = context.getRowDropIndex(section, event.clientY);
      const row = context.removeRow(context.state.drag.id);
      if (row) {
        if (sourceLocation && sourceLocation.section === section && sourceLocation.index < targetIndex) {
          targetIndex -= 1;
        }
        context.insertRowAt(row, targetIndex, section);
        context.state.selectedId = row.id;
      }
    }

    if (context.state.drag.source === "canvas-component") {
      const component = context.removeComponent(context.state.drag.id);
      if (component) {
        const row = context.createRow([12], [[component]]);
        context.insertRowAt(row, context.getRowDropIndex(section, event.clientY), section);
        context.state.selectedId = component.id;
      }
    }
  }

  function dropOnColumn(context, target, event) {
    if (context.state.drag.source === "canvas-row" && target.dataset.cardId) {
      dropOnRowContainer(context, target, event);
      return;
    }

    const column = context.findColumn(target.dataset.columnId);
    if (!column) {
      return;
    }

    let component = null;
    let index = context.getComponentDropIndex(target, event.clientY);
    let sourceLocation = null;

    if (context.state.drag.source === "palette") {
      const block = context.createBlock(context.state.drag.type);
      if (block.type === "row") {
        if (target.dataset.section === "row-container") {
          context.insertContainerRowAt(block, context.getContainerRowDropIndex(target, event.clientY), target.dataset.cardId, target.dataset.cardZone);
        } else {
          const section = context.getElementSection(target) || "page";
          context.insertRowAt(block, context.getRowDropIndex(section, event.clientY), section);
        }
        context.state.selectedId = block.id;
        return;
      }
      component = block;
    }

    if (context.state.drag.source === "canvas-component") {
      sourceLocation = context.findComponentLocation(context.state.drag.id);
      component = context.removeComponent(context.state.drag.id);
      if (sourceLocation && sourceLocation.column.id === column.id && sourceLocation.index < index) {
        index -= 1;
      }
    }

    if (!component) {
      return;
    }

    column.children.splice(index, 0, component);
    context.state.selectedId = component.id;
  }

  function dropOnRowContainer(context, target, event) {
    const cardId = target.dataset.cardId;
    const cardZone = target.dataset.cardZone;
    const rows = context.getContainerRows(cardId, cardZone);
    if (!rows) {
      return;
    }

    if (context.state.drag.source === "palette") {
      const block = context.createBlock(context.state.drag.type);
      if (block.type === "row") {
        context.insertContainerRowAt(block, context.getContainerRowDropIndex(target, event.clientY), cardId, cardZone);
        context.state.selectedId = block.id;
      } else {
        const row = context.createRow([12], [[block]]);
        context.insertContainerRowAt(row, context.getContainerRowDropIndex(target, event.clientY), cardId, cardZone);
        context.state.selectedId = block.id;
      }
    }

    if (context.state.drag.source === "canvas-row") {
      const sourceLocation = context.findRowLocation(context.state.drag.id);
      let targetIndex = context.getContainerRowDropIndex(target, event.clientY);
      const row = context.removeRow(context.state.drag.id);
      if (row) {
        if (sourceLocation && sourceLocation.rows === rows && sourceLocation.index < targetIndex) {
          targetIndex -= 1;
        }
        context.insertContainerRowAt(row, targetIndex, cardId, cardZone);
        context.state.selectedId = row.id;
      }
    }

    if (context.state.drag.source === "canvas-component") {
      const component = context.removeComponent(context.state.drag.id);
      if (component) {
        const row = context.createRow([12], [[component]]);
        context.insertContainerRowAt(row, context.getContainerRowDropIndex(target, event.clientY), cardId, cardZone);
        context.state.selectedId = component.id;
      }
    }
  }

  function getDropTarget(target) {
    return target.closest("[data-drop-zone]");
  }

  // === REGRAS DE VALIDACAO DO DROP ===
  // canDrop: valida se o arraste e permitido no alvo.
  // canDropIntoRowContainer: verifica accepts[] e rejectKinds[] da zona do container.
  // wouldCreateNestedForm: impede arrastar um formulario para dentro de outro formulario.
  // Para alterar o que um container aceita, edite "rejectKinds" em components.json.
  function canDrop(context, drag, target) {
    if (context.isDraggingIntoOwnNode(drag, target)) {
      return false;
    }

    if (wouldCreateNestedForm(context, drag, target)) {
      return false;
    }

    if (target.dataset.dropZone === "page" || target.dataset.dropZone === "header" || target.dataset.dropZone === "footer") {
      return true;
    }

    if (target.dataset.dropZone === "row-container") {
      return canDropIntoRowContainer(context, drag, target);
    }

    if (target.dataset.dropZone === "column") {
      if (target.dataset.cardId && !canDropIntoRowContainer(context, drag, target)) {
        return false;
      }
      if (target.dataset.cardId && drag.source === "canvas-row") {
        return true;
      }
      return drag.source !== "canvas-row";
    }

    return false;
  }

  function canDropIntoRowContainer(context, drag, target) {
    const container = context.findNode(target.dataset.cardId);
    let config;
    if (container) {
      config = context.getRowContainerZoneConfig(container, target.dataset.cardZone);
    } else {
      config = null;
    }
    if (!config) {
      return false;
    }

    const dragCategory = getDragCategory(context, drag);
    if (!config.accepts.includes(dragCategory)) {
      return false;
    }

    const draggedDefinition = getDraggedComponentDefinition(context, drag);
    return !draggedDefinition || !config.rejectKinds.includes(draggedDefinition.kind);
  }

  function wouldCreateNestedForm(context, drag, target) {
    return draggedContentContainsForm(context, drag) && isDropTargetInsideForm(context, target);
  }

  function draggedContentContainsForm(context, drag) {
    if (!drag) {
      return false;
    }

    if (drag.source === "palette") {
      const definition = getDraggedComponentDefinition(context, drag);
      return Boolean(definition && definition.kind === "formContainer");
    }

    if (drag.source === "canvas-component" || drag.source === "canvas-row") {
      return nodeContainsForm(context, context.findNode(drag.id));
    }

    return false;
  }

  function nodeContainsForm(context, node, visited) {
    if (!node) {
      return false;
    }

    const checked = visited || new Set();
    if (checked.has(node)) {
      return false;
    }
    checked.add(node);

    const definition = context.getComponentDefinition(node.type);
    if (definition.kind === "formContainer") {
      return true;
    }

    if ((node.columns || []).some((column) => nodeContainsForm(context, column, checked))) {
      return true;
    }

    if ((node.children || []).some((child) => nodeContainsForm(context, child, checked))) {
      return true;
    }

    return context.getAllRowContainerRows(node).some((rows) => {
      return rows.some((row) => nodeContainsForm(context, row, checked));
    });
  }

  function isDropTargetInsideForm(context, target) {
    let node = target;
    while (node && node !== document) {
      if (node.dataset && node.dataset.componentId) {
        const component = context.findNode(node.dataset.componentId);
        if (component && context.getComponentDefinition(component.type).kind === "formContainer") {
          return true;
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  function getDragCategory(context, drag) {
    if (drag.source === "canvas-row" || (drag.source === "palette" && context.state.layoutBlocksById[drag.type])) {
      return "layout";
    }
    return "component";
  }

  function getDraggedComponentDefinition(context, drag) {
    if (drag.source === "palette" && !context.state.layoutBlocksById[drag.type]) {
      return context.getComponentDefinition(drag.type);
    }
    if (drag.source === "canvas-component") {
      const component = context.findNode(drag.id);
      if (component) {
        return context.getComponentDefinition(component.type);
      } else {
        return null;
      }
    }
    return null;
  }

  window.TemplateBuilderDragDrop = {
    bindCanvas: bindCanvas
  };
}());
