(function (root, factory) {
  const api = factory(root);
  root.FitFirstFill = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  const SKIP_RE = /password|passwd|username|user[_-]?name|login|ssn|fein|ein|account.?number|routing|card.?number|cvv|nordpass/i;

  const FIELDS = [
    {
      key: "address1",
      synonyms: [
        "property address",
        "street address",
        "premises address",
        "risk address",
        "dwelling address",
        "physical address",
        "location address",
        "insured location",
        "address 1",
        "address1",
        "street",
        "address",
      ],
      reject: ["email", "e-mail", "mailing"],
    },
    {
      key: "city",
      synonyms: ["city", "town"],
    },
    {
      key: "state",
      synonyms: ["state", "st"],
    },
    {
      key: "zip",
      synonyms: ["zip", "zip code", "postal", "postal code"],
    },
    {
      key: "yearBuilt",
      synonyms: [
        "year built",
        "year constructed",
        "year of construction",
        "yr built",
        "construction year",
        "built year",
        "yearbuilt",
      ],
    },
    {
      key: "coverageA",
      synonyms: [
        "dwelling / coverage a",
        "coverage a",
        "cov a",
        "cov. a",
        "dwelling limit",
        "dwelling coverage",
        "dwelling",
        "building coverage",
        "building limit",
        "coveragea",
        "cova",
      ],
    },
    {
      key: "occupancy",
      synonyms: ["occupancy type", "occupancy status", "occupied as", "how occupied", "occupancy"],
    },
    {
      key: "construction",
      synonyms: ["construction type", "construction", "wall construction"],
    },
    {
      key: "roofYear",
      synonyms: ["roof year", "year roof", "roof installed"],
    },
    {
      key: "roofCovering",
      synonyms: ["roof covering", "roof type", "roof material"],
    },
    {
      key: "namedInsured",
      synonyms: ["named insured", "primary named insured", "applicant name", "insured name"],
    },
    {
      key: "secondaryInsured",
      synonyms: ["additional named insured", "secondary named insured", "co-applicant"],
    },
    {
      key: "county",
      synonyms: ["county"],
    },
    {
      key: "stories",
      synonyms: ["stories", "number of stories", "# stories"],
    },
  ];

  const OCCUPANCY_ALIASES = {
    owner: ["owner occupied", "owner-occupied", "owneroccupied", "owner", "primary", "primary residence"],
    tenant: ["tenant occupied", "tenant", "rental", "rented"],
    vacant: ["vacant", "unoccupied"],
  };

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[_./#]+/g, " ")
      .replace(/[^a-z0-9 ]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function detectProfile(href, doc) {
    const harmony = root.FitFirstHarmony;
    if (harmony && harmony.isHarmonyDocument(doc, href)) return "harmony";
    if (harmony && harmony.isHarmonyHost(href)) return "harmony";
    return "generic";
  }

  function sheetValue(sheet, key) {
    if (!sheet) return null;
    if (key === "namedInsured") return sheet.insured && sheet.insured.primary;
    if (key === "secondaryInsured") return sheet.insured && sheet.insured.namedInsured;
    return sheet.risk ? sheet.risk[key] : null;
  }

  function formatValue(key, value) {
    if (value == null || value === "") return null;
    if (key === "coverageA" && typeof value === "number") return String(Math.round(value));
    if (typeof value === "number") return String(value);
    return String(value);
  }

  function occupancyChoices(value) {
    const raw = normalize(value);
    if (!raw) return [];
    for (const [canon, aliases] of Object.entries(OCCUPANCY_ALIASES)) {
      if (raw === canon || aliases.includes(raw) || aliases.some((a) => raw.includes(a))) {
        return [canon, ...aliases];
      }
    }
    return [raw];
  }

  function scoreField(candidate, def) {
    const blob = normalize([candidate.label, candidate.name, candidate.id, candidate.placeholder].join(" "));
    if (!blob) return 0;
    if (def.reject && def.reject.some((r) => blob.includes(r))) return 0;
    if (SKIP_RE.test(blob)) return 0;
    let score = 0;
    for (const syn of def.synonyms) {
      const s = normalize(syn);
      if (!s) continue;
      if (blob === s) score = Math.max(score, 80);
      else if (blob.includes(s)) score = Math.max(score, 55 + Math.min(s.length, 20));
    }
    return score;
  }

  function resolveFillPlan(candidates, sheet, prefilled) {
    const used = new Set();
    const plan = [];
    for (const def of FIELDS) {
      const value = formatValue(def.key, sheetValue(sheet, def.key));
      if (value == null) continue;
      if (prefilled && prefilled[def.key] != null) {
        plan.push({ key: def.key, value, index: -1, via: "harmony" });
        continue;
      }
      let best = null;
      candidates.forEach((candidate, index) => {
        if (used.has(index)) return;
        const score = scoreField(candidate, def);
        if (score > 0 && (!best || score > best.score)) {
          best = { index, score };
        }
      });
      if (best) {
        used.add(best.index);
        plan.push({ key: def.key, value, index: best.index, via: "label", score: best.score });
      }
    }
    return plan;
  }

  function shouldSkip(el) {
    if (!el) return true;
    const type = String(el.type || "").toLowerCase();
    if (type === "password" || type === "hidden" || type === "file" || type === "submit" || type === "button") {
      return true;
    }
    const blob = [el.name, el.id, el.autocomplete, el.getAttribute && el.getAttribute("aria-label")]
      .filter(Boolean)
      .join(" ");
    return SKIP_RE.test(blob);
  }

  function labelFor(el, root) {
    const parts = [];
    if (el.labels && el.labels.length) {
      for (const label of el.labels) parts.push(label.textContent || "");
    } else if (el.id && root && root.querySelector) {
      const escaped =
        typeof CSS !== "undefined" && CSS.escape ? CSS.escape(el.id) : String(el.id).replace(/"/g, '\\"');
      const label = root.querySelector(`label[for="${escaped}"]`);
      if (label) parts.push(label.textContent || "");
    }
    if (el.getAttribute) {
      parts.push(el.getAttribute("aria-label") || "");
      parts.push(el.getAttribute("placeholder") || "");
      parts.push(el.getAttribute("title") || "");
    }
    return parts.filter(Boolean).join(" ");
  }

  function collectCandidates(root) {
    const nodes = root.querySelectorAll("input, select, textarea");
    const out = [];
    nodes.forEach((el) => {
      if (shouldSkip(el)) return;
      out.push({
        el,
        label: labelFor(el, root),
        name: el.name || "",
        id: el.id || "",
        placeholder: el.getAttribute("placeholder") || "",
        type: el.type || el.tagName,
      });
    });
    return out;
  }

  function viewOf(el) {
    return (el && el.ownerDocument && el.ownerDocument.defaultView) || root;
  }

  function setNativeValue(el, value) {
    const view = viewOf(el);
    const proto =
      el.tagName === "SELECT"
        ? view.HTMLSelectElement.prototype
        : el.tagName === "TEXTAREA"
          ? view.HTMLTextAreaElement.prototype
          : view.HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
  }

  function pickSelect(el, key, value) {
    const options = Array.from(el.options || []);
    const choices = key === "occupancy" ? occupancyChoices(value) : [normalize(value), String(value).toLowerCase()];
    for (const option of options) {
      const hay = normalize(`${option.value} ${option.text}`);
      if (choices.some((c) => hay === c || hay.includes(c))) return option.value;
    }
    return null;
  }

  function applyValue(el, key, value) {
    if (shouldSkip(el)) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === "select") {
      const picked = pickSelect(el, key, value);
      if (picked == null) return false;
      setNativeValue(el, picked);
    } else if (el.type === "radio" || el.type === "checkbox") {
      const hay = normalize(`${el.value} ${labelFor(el, el.ownerDocument)}`);
      const choices = key === "occupancy" ? occupancyChoices(value) : [normalize(value)];
      const match = choices.some((c) => hay.includes(c));
      if (!match) return false;
      el.checked = true;
    } else {
      setNativeValue(el, value);
    }
    const view = viewOf(el);
    el.dispatchEvent(new view.Event("input", { bubbles: true }));
    el.dispatchEvent(new view.Event("change", { bubbles: true }));
    el.setAttribute("data-ff-filled", key);
    el.style.outline = "2px solid #1d6fb8";
    el.style.outlineOffset = "1px";
    return true;
  }

  function fillDocument(doc, sheet, href) {
    const parse = root.FitFirstSheet && root.FitFirstSheet.parseSheet;
    const parsed = parse ? parse(sheet) : sheet;
    if (!parsed) {
      return { ok: false, error: "No FitFirst sheet loaded.", filled: [], skipped: [] };
    }
    const profile = detectProfile(href || (doc.location && doc.location.href), doc);
    const rootEl = doc.documentElement || doc;
    const filled = [];
    const skipped = [];
    const usedEls = new Set();

    const harmony = root.FitFirstHarmony;
    const prefilled = {};
    if (profile === "harmony" && harmony) {
      const mapped = harmony.collect(doc);
      for (const [key, el] of Object.entries(mapped)) {
        const value = formatValue(key, sheetValue(parsed, key));
        if (value == null) continue;
        if (applyValue(el, key, value)) {
          usedEls.add(el);
          prefilled[key] = el;
          filled.push({ key, value, via: "harmony" });
        }
      }
    }

    const candidates = collectCandidates(rootEl).filter((c) => !usedEls.has(c.el));
    const plan = resolveFillPlan(candidates, parsed, prefilled);
    for (const step of plan) {
      if (step.via === "harmony") continue;
      const candidate = candidates[step.index];
      if (!candidate) {
        skipped.push(step.key);
        continue;
      }
      if (applyValue(candidate.el, step.key, step.value)) {
        filled.push({ key: step.key, value: step.value, via: step.via });
      } else {
        skipped.push(step.key);
      }
    }

    return { ok: filled.length > 0, profile, filled, skipped };
  }

  return {
    FIELDS,
    SKIP_RE,
    detectProfile,
    sheetValue,
    formatValue,
    occupancyChoices,
    scoreField,
    resolveFillPlan,
    collectCandidates,
    applyValue,
    fillDocument,
  };
});
