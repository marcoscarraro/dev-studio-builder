(function () {
  "use strict";

  const previews = {};
  const renderers = {};

  function register(items) {
    Object.keys(items || {}).forEach((key) => {
      if (typeof items[key] === "function") {
        renderers[key] = items[key];
      }
    });
  }

  function registerPreviews(items) {
    Object.keys(items || {}).forEach((key) => {
      if (typeof items[key] === "function") {
        previews[key] = items[key];
      }
    });
  }

  function getAll() {
    return Object.assign({}, renderers);
  }

  function getAllPreviews() {
    return Object.assign({}, previews);
  }

  window.TemplateBuilderRenderers = {
    getAllPreviews: getAllPreviews,
    register: register,
    registerPreviews: registerPreviews,
    getAll: getAll
  };
}());
