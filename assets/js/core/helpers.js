// Helpers globais de HTML, atributos CSS e strings JS.
// Exportado como window.TemplateBuilderHelpers e importado por builder.js.
// Use sempre estes helpers nos renderers em vez de concatenar strings manualmente.
(function () {
  "use strict";

  // === ESCAPAMENTO E ATRIBUTOS HTML ===
  // escapeHtml: escapa conteudo de texto para prevenir XSS.
  // escapeAttr: escapa valor de atributo HTML (inclui backtick).
  // attr: retorna ' name="valor"' ou "" se valor for nulo/vazio.
  // classAttr: retorna ' class="..."' normalizado ou "".
  // idAttr: retorna ' id="..."' seguro ou "".
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function attr(name, value) {
    if (value == null || value === "") {
      return "";
    } else {
      return ` ${name}="${escapeAttr(value)}"`;
    }
  }

  function classAttr(value) {
    const cssClass = normalizeCssClass(value);
    if (cssClass) {
      return ` class="${escapeAttr(cssClass)}"`;
    } else {
      return "";
    }
  }

  function idAttr(value) {
    if (value) {
      return attr("id", sanitizeElementId(value, ""));
    } else {
      return "";
    }
  }

  function indent(value, spaces) {
    if (!value) {
      return "";
    }

    const pad = " ".repeat(spaces);
    return value.split("\n").map((line) => line ? pad + line : line).join("\n");
  }

  function mergeClassNames() {
    return Array.from(arguments).map(normalizeCssClass).filter(Boolean).join(" ");
  }

  function normalizeCssClass(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function sanitizeElementId(value, fallback) {
    const cleaned = String(value || "").trim().replace(/[^A-Za-z0-9_-]/g, "_");
    return cleaned || fallback || "element";
  }

  // === CONVERSAO DE VALORES ===
  // toPositiveInteger: converte para inteiro positivo ou retorna fallback.
  // toBooleanValue: true para true, "true", "1", 1.
  // toJsString: converte para literal JS entre aspas duplas, escapando < > &.
  // toJsLiteral: JSON.stringify com escape extra para uso seguro em <script>.
  function toPositiveInteger(value, fallback) {
    const number = Math.floor(Number(value));
    if (number > 0) {
      return number;
    } else {
      return fallback;
    }
  }

  function toBooleanValue(value) {
    return value === true || value === "true" || value === "1" || value === 1;
  }

  function toJsString(value) {
    return toJsLiteral(String(value == null ? "" : value));
  }

  function toJsLiteral(value) {
    return JSON.stringify(value)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026");
  }

  window.TemplateBuilderHelpers = {
    attr: attr,
    classAttr: classAttr,
    escapeAttr: escapeAttr,
    escapeHtml: escapeHtml,
    idAttr: idAttr,
    indent: indent,
    mergeClassNames: mergeClassNames,
    normalizeCssClass: normalizeCssClass,
    sanitizeElementId: sanitizeElementId,
    toBooleanValue: toBooleanValue,
    toJsLiteral: toJsLiteral,
    toJsString: toJsString,
    toPositiveInteger: toPositiveInteger
  };
}());
