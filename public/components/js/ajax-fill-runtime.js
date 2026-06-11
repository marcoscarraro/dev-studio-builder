(function () {
  var runtimeName = "TemplateBuilderAjaxFillRuntime";

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  function init() {
    if (document.documentElement.getAttribute("data-ajax-fill-runtime-ready") === "1") {
      return;
    }

    document.documentElement.setAttribute("data-ajax-fill-runtime-ready", "1");
    document.addEventListener("click", function (event) {
      var target;
      if (event.target && event.target.closest) {
        target = event.target;
      } else {
        target = null;
      }
      var trigger;
      if (target) {
        trigger = target.closest("[data-ajax-fill]");
      } else {
        trigger = null;
      }

      if (!trigger) {
        return;
      }

      event.preventDefault();
      runAjaxFill(trigger);
    });
  }

  function runAjaxFill(trigger) {
    var group = trigger.closest("[data-ajax-input-group]") || trigger.closest(".input-group");
    var source;
    if (group) {
      source = group.querySelector("[data-ajax-source], input:not([type=\"button\"]):not([type=\"submit\"]):not([type=\"reset\"]), textarea, select");
    } else {
      source = null;
    }
    var rawValue;
    if (source) {
      rawValue = String(source.value || "").trim();
    } else {
      rawValue = "";
    }
    var urlTemplate = trigger.getAttribute("data-ajax-url-template") || "";
    var url = buildUrl(urlTemplate, rawValue);
    var mappings = parseMappings(trigger.getAttribute("data-ajax-mappings"));
    var method = String(trigger.getAttribute("data-ajax-method") || "GET").toUpperCase();

    if (!url || !mappings.length) {
      return;
    }

    setLoading(trigger, true);

    var options = {
      method: method,
      headers: {
        Accept: "application/json"
      }
    };

    if (method === "POST") {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify({ value: rawValue });
    }

    fetch(url, options).then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      return response.json();
    }).then(function (json) {
      mappings.forEach(function (mapping) {
        var value = readJsonPath(json, mapping.key);
        var target = findTarget(trigger, mapping.value);

        if (target) {
          setFieldValue(target, value);
        }
      });

      trigger.dispatchEvent(new CustomEvent("ajax-fill:success", {
        bubbles: true,
        detail: {
          response: json,
          trigger: trigger
        }
      }));
    }).catch(function (error) {
      trigger.dispatchEvent(new CustomEvent("ajax-fill:error", {
        bubbles: true,
        detail: {
          error: error,
          trigger: trigger
        }
      }));

      if (window.console) {
        console.error(error);
      }
    }).finally(function () {
      setLoading(trigger, false);
    });
  }

  function buildUrl(template, value) {
    var encoded = encodeURIComponent(value);

    return String(template || "")
      .replace(/{{s*rawValues*}}/g, value)
      .replace(/{{s*values*}}/g, encoded)
      .replace(/{s*values*}/g, encoded);
  }

  function parseMappings(value) {
    try {
      var parsed = JSON.parse(value || "[]");

      if (Array.isArray(parsed)) {
        return parsed.filter(function (item) {
          return item && item.key && item.value;
        });
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  }

  function readJsonPath(source, path) {
    if (!path) {
      return source;
    }

    return String(path).replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean).reduce(function (value, key) {
      if (value == null) {
        return undefined;
      }

      return value[key];
    }, source);
  }

  function findTarget(trigger, targetName) {
    var scopes = [];
    var row = trigger.closest("[data-fieldlist] tr");
    var form = trigger.closest("form");

    if (row) {
      scopes.push(row);
    }

    if (form) {
      scopes.push(form);
    }

    scopes.push(document);

    for (var index = 0; index < scopes.length; index += 1) {
      var found = findTargetInScope(scopes[index], targetName, row);

      if (found) {
        return found;
      }
    }

    return null;
  }

  function findTargetInScope(scope, targetName, row) {
    var target = String(targetName || "").trim();

    if (!target) {
      return null;
    }

    var fields = Array.prototype.slice.call(scope.querySelectorAll("input, textarea, select"));
    var rowIndex;
    if (row) {
      rowIndex = row.getAttribute("data-index");
    } else {
      rowIndex = "";
    }

    return fields.find(function (field) {
      var name = field.getAttribute("name") || "";
      var id = field.getAttribute("id") || "";
      var template = field.getAttribute("data-fieldlist-name-template") || "";

      return name === target || id === target ||
        (rowIndex && name === target + "[" + rowIndex + "]") ||
        normalizeArrayName(name) === normalizeArrayName(target) ||
        (template && normalizeArrayName(template) === normalizeArrayName(createIndexedTemplate(target)));
    }) || null;
  }

  function createIndexedTemplate(value) {
    var target = String(value || "");

    if (/\[\d+\]/.test(target)) {
      return target.replace(/\[\d+\]/, "[__INDEX__]");
    }

    if (/\[\]/.test(target)) {
      return target.replace(/\[\]/, "[__INDEX__]");
    }

    return target + "[__INDEX__]";
  }

  function normalizeArrayName(value) {
    return String(value || "").replace(/\[\d+\]|\[__INDEX__\]/g, "[]");
  }

  function setFieldValue(field, value) {
    var normalized;
    if (value == null) {
      normalized = "";
    } else if (typeof value === "object") {
      normalized = JSON.stringify(value);
    } else {
      normalized = String(value);
    }
    var type = String(field.type || "").toLowerCase();

    if (type === "checkbox") {
      field.checked = ["1", "true", "sim", "yes"].includes(normalized.toLowerCase());
    } else if (type === "radio") {
      field.checked = field.value === normalized;
    } else {
      field.value = normalized;
    }

    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setLoading(trigger, loading) {
    if ("disabled" in trigger) {
      trigger.disabled = loading;
    }

    trigger.classList.toggle("disabled", loading);
    trigger.setAttribute("aria-busy", loading ? "true" : "false");
  }

  window[runtimeName] = {
    init: init,
    run: runAjaxFill
  };

  init();
}());