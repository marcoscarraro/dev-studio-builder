(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ stepper: renderStepperComponent });

  function renderStepperComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const steps = Array.isArray(props.steps) ? props.steps : [];
    const orientation = props.orientation === "vertical" ? "steps-vertical" : "steps";
    const showDescription = context.toBooleanValue(props.showDescription);

    const stepsHtml = steps.map((step) => {
      const status = step.status || "pending";
      const statusMap = {
        active: "active",
        completed: "steps-item-completed",
        error: "steps-item-error",
        pending: ""
      };
      const stepCls = context.mergeClassNames("steps-item", statusMap[status] || "");
      const title = context.escapeHtml(String(step.label || "Etapa"));
      const desc = showDescription && step.description
        ? `<span class="steps-item-subtitle">${context.escapeHtml(String(step.description))}</span>`
        : "";

      return `<a class="${context.escapeAttr(stepCls)}" href="#"><span class="steps-item-icon"></span><span class="steps-item-title">${title}${desc}</span></a>`;
    }).join("\n");

    return `<div${context.classAttr(orientation)}>\n${stepsHtml}\n</div>`;
  }
}());
