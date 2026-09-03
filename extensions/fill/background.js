const STORAGE_KEYS = {
  sheet: "lastSheet",
  loadedAt: "loadedAt",
  source: "source",
};

async function seedAnaIfEmpty() {
  const current = await chrome.storage.local.get([STORAGE_KEYS.sheet]);
  if (current[STORAGE_KEYS.sheet]) return;
  const url = chrome.runtime.getURL("seed/ana-sheet.json");
  const sheet = await fetch(url).then((res) => res.json());
  await chrome.storage.local.set({
    [STORAGE_KEYS.sheet]: sheet,
    [STORAGE_KEYS.loadedAt]: Date.now(),
    [STORAGE_KEYS.source]: "ana-seed",
  });
}

async function storeSheet(sheet, source) {
  if (!sheet) return;
  await chrome.storage.local.set({
    [STORAGE_KEYS.sheet]: sheet,
    [STORAGE_KEYS.loadedAt]: Date.now(),
    [STORAGE_KEYS.source]: source || "desk",
  });
}

chrome.runtime.onInstalled.addListener(() => {
  seedAnaIfEmpty();
});

chrome.runtime.onStartup.addListener(() => {
  seedAnaIfEmpty();
});

seedAnaIfEmpty();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "FITFIRST_STORE_SHEET") {
    storeSheet(message.sheet, message.source).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "FITFIRST_GET_SHEET") {
    chrome.storage.local.get(Object.values(STORAGE_KEYS)).then((stored) => {
      sendResponse({
        sheet: stored[STORAGE_KEYS.sheet] || null,
        loadedAt: stored[STORAGE_KEYS.loadedAt] || null,
        source: stored[STORAGE_KEYS.source] || null,
      });
    });
    return true;
  }

  return false;
});
