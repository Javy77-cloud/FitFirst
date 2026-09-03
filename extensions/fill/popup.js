const $ = (id) => document.getElementById(id);

function money(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function setStatus(text, isError) {
  const el = $("status");
  el.textContent = text;
  el.classList.toggle("error", Boolean(isError));
}

function render(payload) {
  const sheet = payload.sheet;
  if (!sheet) {
    $("insured").textContent = "No sheet loaded";
    $("address").textContent = "Send a sheet from the desk, or keep the Ana seed.";
    $("year-built").textContent = "—";
    $("coverage-a").textContent = "—";
    $("occupancy").textContent = "—";
    $("carrier-hint").textContent = "Carrier hint: —";
    $("source").textContent = "";
    $("fill").disabled = true;
    return;
  }

  const risk = sheet.risk || {};
  const hint = sheet.carrierHint || {};
  $("insured").textContent = (sheet.insured && sheet.insured.primary) || "Unnamed insured";
  $("address").textContent = [risk.address1, risk.city, risk.state, risk.zip].filter(Boolean).join(", ") || "—";
  $("year-built").textContent = risk.yearBuilt != null ? String(risk.yearBuilt) : "—";
  $("coverage-a").textContent = money(risk.coverageA);
  $("occupancy").textContent = risk.occupancy || "—";
  $("carrier-hint").textContent = hint.host
    ? `Carrier hint: ${hint.name} · ${hint.portal} · ${hint.host}`
    : `Carrier hint: ${hint.name || "—"} · ${hint.portal || "—"}`;
  const source =
    payload.source === "ana-seed"
      ? "Source: Ana Dib HO3 seed (2026-09-02)"
      : payload.source
        ? `Source: ${payload.source}`
        : "";
  $("source").textContent = source;
  $("fill").disabled = false;
}

async function loadStored() {
  const payload = await chrome.runtime.sendMessage({ type: "FITFIRST_GET_SHEET" });
  render(payload || {});
}

async function loadClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Clipboard is not a FitFirst sheet.");
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!parsed || (!parsed.risk && parsed.kind !== "fitfirst.sheet")) {
      throw new Error("Clipboard is not a FitFirst sheet.");
    }
    await chrome.runtime.sendMessage({
      type: "FITFIRST_STORE_SHEET",
      sheet: parsed,
      source: "clipboard",
    });
    await loadStored();
    setStatus("Loaded sheet from clipboard.");
  } catch (err) {
    setStatus(err.message || "Could not read clipboard JSON.", true);
  }
}

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function fillPage() {
  const payload = await chrome.runtime.sendMessage({ type: "FITFIRST_GET_SHEET" });
  if (!payload || !payload.sheet) {
    setStatus("No sheet loaded.", true);
    return;
  }
  const tab = await currentTab();
  if (!tab || tab.id == null) {
    setStatus("No active tab.", true);
    return;
  }
  if (tab.url && /^(chrome|chrome-extension|edge|about):/i.test(tab.url) && !tab.url.startsWith("chrome-extension://")) {
    setStatus("Open a carrier form or the Harmony demo, then click Fill.", true);
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["lib/sheet.js", "lib/harmony.js", "lib/fill.js"],
    });
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (sheet) => globalThis.FitFirstFill.fillDocument(document, sheet),
      args: [payload.sheet],
    });
    const result = injected && injected.result;
    if (!result || !result.ok) {
      setStatus((result && result.error) || "No matching fields on this page.", true);
      return;
    }
    const keys = result.filled.map((row) => row.key).join(", ");
    setStatus(`Filled ${result.filled.length} fields (${result.profile}): ${keys}.`);
  } catch (err) {
    setStatus(err.message || "Fill failed on this page.", true);
  }
}

$("fill").addEventListener("click", () => {
  void fillPage();
});
$("clipboard").addEventListener("click", () => {
  void loadClipboard();
});
$("demo").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("demo/harmony-quote.html") });
});

loadStored();
