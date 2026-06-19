// Runtime do componente Gravador de Audio na pagina exportada.
// Usa getUserMedia + MediaRecorder (APIs nativas — sem dependencia externa).
// Varre o DOM por [data-audio-recorder] e inicializa cada gravador.
// A gravacao e armazenada como DataURL base64 no input hidden para envio no form.
(function () {
  "use strict";

  var runtimeName = "TemplateBuilderAudioRecorderRuntime";

  if (window[runtimeName] && window[runtimeName].init) {
    window[runtimeName].init();
    return;
  }

  // Ordem de preferencia de MIME types (do mais compativel ao menos).
  var MIME_CANDIDATES = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4"
  ];

  function chooseMimeType() {
    if (typeof MediaRecorder === "undefined") { return ""; }
    for (var i = 0; i < MIME_CANDIDATES.length; i++) {
      if (MediaRecorder.isTypeSupported(MIME_CANDIDATES[i])) {
        return MIME_CANDIDATES[i];
      }
    }
    return "";
  }

  function init(root) {
    var scope = (root && root.querySelectorAll) ? root : document;
    scope.querySelectorAll("div[data-audio-recorder]").forEach(function (el) {
      setup(el);
    });
  }

  function setup(el) {
    if (el._audioRecorder) { return; }
    el._audioRecorder = true;

    var recorderId = el.id;
    var maxSeconds = parseInt(el.getAttribute("data-ar-max-seconds"), 10) || 60;
    var showPreview = el.getAttribute("data-ar-show-preview") !== "false";

    var statusEl = el.querySelector("[data-ar-status]");
    var playbackEl = el.querySelector("[data-ar-playback]");
    var audioEl = el.querySelector("[data-ar-audio]");
    var recordBtn = el.querySelector("[data-ar-btn-record]");
    var stopBtn = el.querySelector("[data-ar-btn-stop]");
    var clearBtn = el.querySelector("[data-ar-btn-clear]");
    var resultInput = document.querySelector("[data-ar-result-input=\"" + recorderId + "\"]");

    var mediaRecorder = null;
    var chunks = [];
    var blobUrl = null;
    var timer = null;
    var elapsed = 0;
    var recording = false;

    function setStatus(text) {
      if (statusEl) { statusEl.textContent = text; }
    }

    function startRecording() {
      if (recording) { return; }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus("Seu navegador nao suporta gravacao de audio.");
        return;
      }

      if (typeof MediaRecorder === "undefined") {
        setStatus("MediaRecorder nao disponivel neste navegador.");
        return;
      }

      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        var mimeType = chooseMimeType();
        var options = mimeType ? { mimeType: mimeType } : {};

        mediaRecorder = new MediaRecorder(stream, options);
        chunks = [];
        elapsed = 0;
        recording = true;

        mediaRecorder.addEventListener("dataavailable", function (e) {
          if (e.data && e.data.size > 0) { chunks.push(e.data); }
        });

        mediaRecorder.addEventListener("stop", function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          recording = false;

          var blob = new Blob(chunks, { type: mimeType || "audio/webm" });

          if (blobUrl) { URL.revokeObjectURL(blobUrl); }
          blobUrl = URL.createObjectURL(blob);

          if (showPreview && audioEl) {
            audioEl.src = blobUrl;
            if (playbackEl) { playbackEl.style.display = ""; }
          }

          if (resultInput) {
            var reader = new FileReader();
            reader.onloadend = function () { resultInput.value = reader.result; };
            reader.readAsDataURL(blob);
          }

          clearTimer();
          setStatus("Gravacao concluida — " + elapsed + "s");
          if (recordBtn) { recordBtn.style.display = ""; }
          if (stopBtn) { stopBtn.style.display = "none"; }
          if (clearBtn) { clearBtn.style.display = ""; }
        });

        mediaRecorder.start(500);

        if (recordBtn) { recordBtn.style.display = "none"; }
        if (stopBtn) { stopBtn.style.display = ""; }
        if (clearBtn) { clearBtn.style.display = "none"; }
        if (playbackEl) { playbackEl.style.display = "none"; }

        setStatus("Gravando... 0s");

        timer = setInterval(function () {
          elapsed++;
          setStatus("Gravando... " + elapsed + "s");
          if (elapsed >= maxSeconds) { stopRecording(); }
        }, 1000);

      }).catch(function (err) {
        recording = false;
        console.error("[audio-recorder] getUserMedia:", err);
        setStatus("Acesso ao microfone negado ou indisponivel.");
      });
    }

    function stopRecording() {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
      clearTimer();
    }

    function clearRecording() {
      if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
      if (audioEl) { audioEl.src = ""; }
      if (playbackEl) { playbackEl.style.display = "none"; }
      if (resultInput) { resultInput.value = ""; }
      if (clearBtn) { clearBtn.style.display = "none"; }
      setStatus("Pronto para gravar");
    }

    function clearTimer() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    if (recordBtn) { recordBtn.addEventListener("click", startRecording); }
    if (stopBtn) { stopBtn.addEventListener("click", stopRecording); }
    if (clearBtn) { clearBtn.addEventListener("click", clearRecording); }
  }

  window[runtimeName] = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
}());
