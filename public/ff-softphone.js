(function () {
  function formatDuration(total) {
    const s = Math.max(0, Math.round(total));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m + ":" + String(sec).padStart(2, "0");
  }

  var stream = null;
  var timer = null;
  var seconds = 0;

  function panel() {
    return document.getElementById("desk-softphone");
  }

  function el(sel) {
    var root = panel();
    return root ? root.querySelector(sel) : null;
  }

  function stopTracks() {
    if (stream) {
      stream.getTracks().forEach(function (t) {
        t.stop();
      });
      stream = null;
    }
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    var videoEl = el("[data-sp-video]");
    if (videoEl) {
      videoEl.srcObject = null;
      videoEl.setAttribute("hidden", "");
    }
  }

  window.ffStartSoftphone = function () {
    var timerEl = el("[data-sp-timer]");
    var mediaEl = el("[data-sp-media]");
    var errorEl = el("[data-sp-error]");
    var videoEl = el("[data-sp-video]");
    var durationInput = el("[name=durationSeconds]");
    var camBox = el("[data-sp-cam]");
    if (errorEl) errorEl.textContent = "";
    seconds = 0;
    if (timer) clearInterval(timer);
    if (timerEl) timerEl.textContent = "0:00";
    if (durationInput) durationInput.value = "0";
    timer = setInterval(function () {
      seconds += 1;
      if (timerEl) timerEl.textContent = formatDuration(seconds);
      if (durationInput) durationInput.value = String(seconds);
    }, 1000);
    var useCam = !!(camBox && camBox.checked);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (mediaEl) {
        mediaEl.textContent =
          "This browser cannot open the microphone. The timer still runs — use the tel: fallback.";
      }
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: useCam ? { facingMode: "user" } : false })
      .then(function (mediaStream) {
        stream = mediaStream;
        if (videoEl) {
          videoEl.srcObject = stream;
          if (useCam) videoEl.removeAttribute("hidden");
          else videoEl.setAttribute("hidden", "");
          videoEl.play().catch(function () {});
        }
        if (mediaEl) mediaEl.textContent = "Microphone is live on this computer. PSTN trunk is not connected.";
      })
      .catch(function () {
        if (mediaEl) {
          mediaEl.textContent =
            "Microphone or camera is blocked. The timer still runs — use the tel: fallback to dial from your phone.";
        }
        if (videoEl) videoEl.setAttribute("hidden", "");
      });
  };

  window.ffHangSoftphone = function () {
    stopTracks();
    var durationInput = el("[name=durationSeconds]");
    var errorEl = el("[data-sp-error]");
    var notes = el("[name=notes]");
    if (durationInput) durationInput.value = String(seconds);
    if (errorEl) errorEl.textContent = "";
    if (notes) notes.focus();
  };

  function bind() {
    var startBtn = el("[data-sp-start]");
    var hangBtn = el("[data-sp-hang]");
    var root = panel();
    if (!root || root.dataset.softphoneBound === "1") return;
    root.dataset.softphoneBound = "1";
    if (startBtn) startBtn.addEventListener("click", window.ffStartSoftphone);
    if (hangBtn) hangBtn.addEventListener("click", window.ffHangSoftphone);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
