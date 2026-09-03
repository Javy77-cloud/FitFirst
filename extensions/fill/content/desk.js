(function () {
  const MESSAGE_TYPE = "FITFIRST_SEND_TO_FILL";
  const STORAGE_KEY = "fitfirst.fill.sheet";

  function parseSheet(raw) {
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function store(sheet, source) {
    if (!sheet || !chrome.runtime || !chrome.runtime.sendMessage) return;
    chrome.runtime.sendMessage({ type: "FITFIRST_STORE_SHEET", sheet, source: source || "desk" });
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== MESSAGE_TYPE) return;
    const sheet = parseSheet(data.sheet);
    if (sheet) store(sheet, "desk");
  });

  try {
    const cached = parseSheet(window.localStorage.getItem(STORAGE_KEY));
    if (cached) store(cached, "desk-local");
  } catch {
    // localStorage may be blocked
  }
})();
