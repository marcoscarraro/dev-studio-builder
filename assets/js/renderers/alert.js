(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({
    alert: renderAlertComponent
  });

  function renderAlertComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const alertClass = getAlertClass(component, context);
    const icon = renderAlertIcon(props, context);
    const content = renderAlertContent(props, context);
    const action = renderAlertAction(props, context);
    let close;
    if (context.toBooleanValue(props.dismissible)) {
      close = `<a class="btn-close" data-bs-dismiss="alert" aria-label="${context.escapeAttr(props.closeLabel || "close")}"></a>`;
    } else {
      close = "";
    }

    return [
      `<div${context.classAttr(alertClass)}${context.attr("role", props.role || "alert")}>`,
      context.indent(icon, 2),
      context.indent(content, 2),
      context.indent(action, 2),
      context.indent(close, 2),
      "</div>"
    ].filter((line) => line !== "").join("\n");
  }

  function getAlertClass(component, context) {
    const props = component.props || {};
    const styleClass = getAlertStyleClass(props.alertStyle);
    let dismissibleClass;
    if (context.toBooleanValue(props.dismissible)) {
      dismissibleClass = "alert-dismissible";
    } else {
      dismissibleClass = "";
    }

    return context.mergeClassNames(
      context.getComponentClass(component),
      styleClass,
      dismissibleClass
    );
  }

  function getAlertStyleClass(value) {
    if (value === "important") {
      return "alert-important";
    }
    if (value === "minor") {
      return "alert-minor";
    }
    return "";
  }

  function renderAlertIcon(props, context) {
    if (!context.toBooleanValue(props.showIcon)) {
      return "";
    }

    const iconName = props.icon || getDefaultIcon(props.variant);
    const icon = context.renderTablerIcon(iconName, props.iconColor);
    if (icon) {
      return `<div class="alert-icon">${icon}</div>`;
    } else {
      return "";
    }
  }

  function renderAlertContent(props, context) {
    const hasDetails = Boolean(props.title || props.description || getAlertListItems(props).length);
    if (!hasDetails) {
      return context.escapeHtml(props.message || "");
    }

    let title;
    if (props.title) {
      title = `<h4 class="alert-heading">${context.escapeHtml(props.title)}</h4>`;
    } else {
      title = "";
    }
    const description = renderAlertDescription(props, context);

    return [
      "<div>",
      context.indent(title, 2),
      context.indent(description, 2),
      "</div>"
    ].filter((line) => line !== "").join("\n");
  }

  function renderAlertDescription(props, context) {
    let text;
    if (props.description) {
      text = context.escapeHtml(props.description);
    } else {
      text = "";
    }
    const list = renderAlertList(props, context);
    if (!text && !list) {
      return "";
    }

    return [
      '<div class="alert-description">',
      context.indent(text, 2),
      context.indent(list, 2),
      "</div>"
    ].filter((line) => line !== "").join("\n");
  }

  function renderAlertList(props, context) {
    const items = getAlertListItems(props);
    if (!items.length) {
      return "";
    }

    const listItems = items.map((item) => {
      return `<li>${context.escapeHtml(item.text || "")}</li>`;
    }).join("\n");

    return [
      '<ul class="alert-list">',
      context.indent(listItems, 2),
      "</ul>"
    ].join("\n");
  }

  function getAlertListItems(props) {
    if (Array.isArray(props.listItems)) {
      return props.listItems.filter((item) => item && item.text);
    } else {
      return [];
    }
  }

  function renderAlertAction(props, context) {
    if (!context.toBooleanValue(props.showAction) || !props.actionText) {
      return "";
    }

    return `<a href="${context.escapeAttr(props.actionHref || "#")}"${context.classAttr(props.actionCssClass || "alert-action")}>${context.escapeHtml(props.actionText)}</a>`;
  }

  function getDefaultIcon(variant) {
    const icons = {
      danger: "alert-circle",
      warning: "alert-triangle",
      success: "check",
      info: "info-circle",
      primary: "info-circle",
      secondary: "info-circle"
    };

    return icons[variant] || "info-circle";
  }
}());
