# FitFirst Fill (Chrome MV3)

Unpacked Chrome add-on that writes the current Quote Sheet onto the open carrier page. The agent opens Harmony (or the demo form) and clicks **Fill this page**. There is no bot per agent, no portal login, and no password vault.

QuoteRush / EZLynx APIs stay finish-line. This pass is clipboard JSON + `chrome.storage`.

## Load unpacked

1. Chrome → `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → choose `extensions/fill/` in this repo.
3. Pin **FitFirst Fill**. The popup already shows Ana Dib’s 2026-09-02 HO3 seed (1098 Adige Ct SE, Cov A $321,000, owner).

## Four-step demo on Ana

1. Run the desk (`npm run dev`) and open **Ana Dib HO3 shop** → **Quote sheet**.
2. Pick the Tailrow / Harmony hint if it is not already selected. Click **Send to Fill** (or **Copy sheet**).
3. In the extension popup click **Open Harmony demo** — or go to `http://127.0.0.1:43147/fill-demo`.
4. Click **Fill this page**. Property address, year built, dwelling / Cov A, and occupancy come from Ana’s sheet. Username and password fields are never written.

`demo/generic-quote.html` is the label-only fallback (Address, Year built, Dwelling, Occupancy) with no Harmony field names. `demo/run-ana.html` runs the same engine against Ana’s sheet without loading the popup.

On a real Harmony tab (`agency.harmony-ins.com`) the same button runs the Harmony selectors first, then the generic label matcher. You still log in yourself.

## What the desk sends

`Copy sheet` / `Send to Fill` writes JSON with `"kind": "fitfirst.sheet"`. Send also posts a window message and stores `localStorage.fitfirst.fill.sheet` so the desk content script can copy it into `chrome.storage`.

If the extension is loaded before the desk, the Ana seed is enough for the demo.

## Out of scope

Real OAuth, NordPass / any credential vault, SaaS billing, QuoteRush/EZLynx APIs, Gaya macros, Chrome Web Store listing.
