(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ avatar: renderAvatarComponent });

  function renderAvatarComponent(component, cssClassAttr, definition, context) {
    const props = component.props || {};
    const initials = context.escapeHtml(props.initials || "");
    const imageUrl = props.imageUrl || "";
    const size = props.size || "avatar";
    const color = props.color || "primary";
    const shape = props.shape || "";
    const status = props.status || "";

    let cls = size;
    if (shape === "rounded") cls += " rounded";
    else if (shape !== "circle") cls += " rounded-circle";

    let avatarInner;
    if (imageUrl) {
      avatarInner = `<img src="${context.escapeAttr(imageUrl)}" alt="${initials}">`;
    } else {
      cls += ` bg-${color}-lt text-${color}`;
      avatarInner = `<span class="avatar-initials">${initials}</span>`;
    }

    let statusDot = "";
    if (status === "online") statusDot = '<span class="badge bg-success"></span>';
    else if (status === "offline") statusDot = '<span class="badge bg-secondary"></span>';
    else if (status === "busy") statusDot = '<span class="badge bg-danger"></span>';

    return `<span${context.classAttr(cls)}>${avatarInner}${statusDot}</span>`;
  }
}());
