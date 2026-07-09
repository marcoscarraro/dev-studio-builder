(function () {
  "use strict";

  const previews = {};
  const renderers = {};
  const inlineInits = {};

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

  // registerInlineInits({ chaveInit: fn }): registra o gerador de "init inline" do
  // componente para a pagina exportada. A chave e o valor de assets.init do bloco no
  // components.json (ex.: "tomselect", "datatable"). fn(component, context) devolve
  // { title, code } — codigo JS legivel chamando a lib DIRETO (valores da pagina ja
  // resolvidos, sem data-*) — ou null para usar o runtime generico (casos com
  // maquinario: selecao de linhas, criar via modal, componente dentro de FieldList).
  function registerInlineInits(items) {
    Object.keys(items || {}).forEach((key) => {
      if (typeof items[key] === "function") {
        inlineInits[key] = items[key];
      }
    });
  }

  function getInlineInit(key) {
    return inlineInits[key] || null;
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
    registerInlineInits: registerInlineInits,
    getInlineInit: getInlineInit,
    getAll: getAll
  };
}());
