// Runtime do componente Leitor de Fala na pagina exportada.
// Usa a Web Speech API (window.speechSynthesis) — nativa, sem dependencia externa.
// Varre o DOM por [data-speech-reader] e le o conteudo de um elemento alvo (seletor CSS).
// Controles: Ouvir / Pausar / Retomar / Parar.
(function () {
  "use strict";

  var runtimeName = "TemplateBuilderSpeechReaderRuntime";

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  var supported = ("speechSynthesis" in window) && (typeof window.SpeechSynthesisUtterance === "function");

  // getVoices() pode retornar vazio na primeira chamada (carregamento assincrono).
  // Guardamos as vozes e resolvemos as pendencias quando o evento voiceschanged dispara.
  var voicesCache = [];
  var voicesReady = false;
  var voiceWaiters = [];

  function refreshVoices() {
    if (!supported) { return; }
    var list = window.speechSynthesis.getVoices();
    if (list && list.length) {
      voicesCache = list;
      voicesReady = true;
      var waiters = voiceWaiters.slice();
      voiceWaiters = [];
      waiters.forEach(function (cb) { cb(voicesCache); });
    }
  }

  function whenVoicesReady(cb) {
    if (voicesReady) { cb(voicesCache); return; }
    refreshVoices();
    if (voicesReady) { cb(voicesCache); return; }
    voiceWaiters.push(cb);
  }

  if (supported && typeof window.speechSynthesis.addEventListener === "function") {
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
  }

  function pickVoice(voices, voiceName, lang) {
    if (!voices || !voices.length) { return null; }
    if (voiceName) {
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].name === voiceName) { return voices[i]; }
      }
    }
    if (lang) {
      var langLower = lang.toLowerCase();
      // 1) casamento exato do locale (pt-BR)
      for (var j = 0; j < voices.length; j++) {
        if ((voices[j].lang || "").toLowerCase() === langLower) { return voices[j]; }
      }
      // 2) casamento so do idioma (pt)
      var base = langLower.split("-")[0];
      for (var k = 0; k < voices.length; k++) {
        if ((voices[k].lang || "").toLowerCase().indexOf(base) === 0) { return voices[k]; }
      }
    }
    return null;
  }

  function num(value, fallback, min, max) {
    var n = parseFloat(value);
    if (isNaN(n)) { return fallback; }
    if (typeof min === "number" && n < min) { n = min; }
    if (typeof max === "number" && n > max) { n = max; }
    return n;
  }

  function init(root) {
    var scope = (root && root.querySelectorAll) ? root : document;
    scope.querySelectorAll("div[data-speech-reader]").forEach(function (el) {
      setup(el);
    });
  }

  function setup(el) {
    if (el._speechReader) { return; }
    el._speechReader = true;

    var statusEl = el.querySelector("[data-sr-status]");
    var playBtn = el.querySelector("[data-sr-play]");
    var pauseBtn = el.querySelector("[data-sr-pause]");
    var stopBtn = el.querySelector("[data-sr-stop]");

    var target = el.getAttribute("data-sr-target") || "";
    var lang = el.getAttribute("data-sr-lang") || "pt-BR";
    var voiceName = el.getAttribute("data-sr-voice") || "";
    var rate = num(el.getAttribute("data-sr-rate"), 1, 0.1, 10);
    var pitch = num(el.getAttribute("data-sr-pitch"), 1, 0, 2);
    var volume = num(el.getAttribute("data-sr-volume"), 1, 0, 1);

    var pauseDefaultLabel = pauseBtn ? pauseBtn.textContent.trim() : "Pausar";
    var currentUtterance = null;

    function setStatus(text) {
      if (statusEl) { statusEl.textContent = text; }
    }

    if (!supported) {
      setStatus("Seu navegador nao suporta leitura de voz.");
      if (playBtn) { playBtn.disabled = true; }
      return;
    }

    function getTargetText() {
      if (!target) { return ""; }
      var node;
      try {
        node = document.querySelector(target);
      } catch (err) {
        console.error("[speech-reader] seletor invalido:", target, err);
        return "";
      }
      if (!node) { return ""; }
      return (node.textContent || "").replace(/\s+/g, " ").trim();
    }

    function showIdle() {
      if (playBtn) { playBtn.style.display = ""; }
      if (pauseBtn) { pauseBtn.style.display = "none"; pauseBtn.textContent = pauseDefaultLabel; }
      if (stopBtn) { stopBtn.style.display = "none"; }
    }

    function showSpeaking() {
      if (playBtn) { playBtn.style.display = "none"; }
      if (pauseBtn) { pauseBtn.style.display = ""; pauseBtn.textContent = pauseDefaultLabel; }
      if (stopBtn) { stopBtn.style.display = ""; }
    }

    function speak() {
      var text = getTargetText();
      if (!text) {
        setStatus("Nada para ler no elemento \"" + target + "\".");
        return;
      }

      // Cancela qualquer fala pendente antes de comecar (evita fila).
      window.speechSynthesis.cancel();

      whenVoicesReady(function (voices) {
        var utter = new SpeechSynthesisUtterance(text);
        utter.lang = lang;
        utter.rate = rate;
        utter.pitch = pitch;
        utter.volume = volume;

        var voice = pickVoice(voices, voiceName, lang);
        if (voice) { utter.voice = voice; }

        utter.onend = function () {
          currentUtterance = null;
          showIdle();
          setStatus("Concluido.");
        };
        utter.onerror = function (e) {
          currentUtterance = null;
          showIdle();
          // "canceled"/"interrupted" acontecem no Parar — nao sao erros reais.
          if (e && (e.error === "canceled" || e.error === "interrupted")) {
            setStatus("Pronto para ler");
          } else {
            console.error("[speech-reader] erro na sintese:", e && e.error);
            setStatus("Nao foi possivel reproduzir a fala.");
          }
        };

        currentUtterance = utter;
        window.speechSynthesis.speak(utter);
        showSpeaking();
        setStatus("Lendo...");
      });
    }

    function togglePause() {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        if (pauseBtn) { pauseBtn.textContent = pauseDefaultLabel; }
        setStatus("Lendo...");
      } else if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        if (pauseBtn) { pauseBtn.textContent = "Retomar"; }
        setStatus("Pausado.");
      }
    }

    function stop() {
      window.speechSynthesis.cancel();
      currentUtterance = null;
      showIdle();
      setStatus("Pronto para ler");
    }

    if (playBtn) { playBtn.addEventListener("click", speak); }
    if (pauseBtn) { pauseBtn.addEventListener("click", togglePause); }
    if (stopBtn) { stopBtn.addEventListener("click", stop); }
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
