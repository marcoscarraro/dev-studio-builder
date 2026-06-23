(function () {
  "use strict";

  window.TemplateBuilderRenderers.register({ pwa: renderPwaComponent });

  // Componente PWA: emite a UI (botoes opcionais Instalar / Notificacoes) com os
  // atributos data-* que o pwa-runtime le. As tags de <head>, o manifest e o
  // service worker sao gerados no export (export-html.js), pois envolvem o documento.
  function renderPwaComponent(component, cssClassAttr, definition, context) {
    var props = component.props || {};
    var showInstall = context.toBooleanValue(props.showInstall);
    var showNotify = context.toBooleanValue(props.showNotify);

    var swUrl = String(props.swUrl || "/sw.js").trim();
    var swScope = String(props.swScope || "/").trim();

    var attrs = [
      cssClassAttr,
      " data-pwa",
      context.attr("data-sw-url", swUrl),
      context.attr("data-sw-scope", swScope),
      context.attr("data-notify-title", props.notifyTitle || props.appName || "Notificacao"),
      context.attr("data-notify-body", props.notifyBody || ""),
      context.attr("data-notify-icon", props.icon192 || "")
    ].join("");

    var parts = ["<div" + attrs + ">"];

    if (showInstall) {
      var installContent = context.renderButtonContent(
        props.installText || "Instalar app",
        props.installIcon,
        props.installIconPosition || "left",
        props.installIconColor
      );
      parts.push('  <button type="button"' + context.classAttr(props.installCssClass || "btn btn-primary") + " data-pwa-install>" + installContent + "</button>");
    }

    if (showNotify) {
      var notifyContent = context.renderButtonContent(
        props.notifyText || "Ativar notificacoes",
        props.notifyIcon,
        props.notifyIconPosition || "left",
        props.notifyIconColor
      );
      parts.push('  <button type="button"' + context.classAttr(props.notifyCssClass || "btn btn-outline-primary") + " data-pwa-notify>" + notifyContent + "</button>");
    }

    if (!showInstall && !showNotify) {
      parts.push('  <!-- PWA: sem botoes visiveis; o app continua instalavel/offline pelo manifest + service worker gerados. -->');
    }

    parts.push("</div>");
    return parts.join("\n");
  }
}());
