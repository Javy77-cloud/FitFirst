(function (root, factory) {
  const api = factory();
  root.FitFirstHarmony = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const HOST_RE = /(?:^|\.)harmony-ins\.com$/i;

  const SELECTORS = {
    address1: [
      '[name*="PropertyAddress" i]',
      '[id*="PropertyAddress" i]',
      '[name*="StreetAddress" i]',
      '[id*="StreetAddress" i]',
      '[name="Address1"]',
      '[data-field="propertyAddress"]',
    ],
    city: ['[name="City" i]', '[id*="City" i]'],
    state: ['[name="State" i]', '[id*="State" i]'],
    zip: ['[name*="Zip" i]', '[id*="Zip" i]', '[name*="Postal" i]'],
    yearBuilt: ['[name*="YearBuilt" i]', '[id*="YearBuilt" i]', '[name*="YearConstructed" i]'],
    coverageA: [
      '[name*="CoverageA" i]',
      '[id*="CoverageA" i]',
      '[name*="CovA" i]',
      '[name*="DwellingLimit" i]',
      '[id*="Dwelling" i]',
    ],
    occupancy: ['[name*="Occupancy" i]', '[id*="Occupancy" i]'],
    construction: ['[name*="Construction" i]', '[id*="Construction" i]'],
    roofYear: ['[name*="RoofYear" i]', '[id*="RoofYear" i]'],
    roofCovering: ['[name*="RoofCovering" i]', '[id*="RoofCovering" i]', '[name*="RoofType" i]'],
    namedInsured: ['[name*="NamedInsured" i]', '[id*="NamedInsured" i]'],
    secondaryInsured: ['[name*="AdditionalInsured" i]', '[id*="AdditionalInsured" i]'],
  };

  function isHarmonyHost(href) {
    if (!href) return false;
    try {
      const url = new URL(href);
      return HOST_RE.test(url.hostname) || url.hostname === "agency.harmony-ins.com";
    } catch {
      return /harmony-ins\.com/i.test(String(href));
    }
  }

  function isHarmonyDocument(doc, href) {
    if (isHarmonyHost(href || (doc && doc.location && doc.location.href))) return true;
    const root = doc && doc.documentElement;
    if (root && String(root.getAttribute("data-ff-portal") || "").toLowerCase() === "harmony") {
      return true;
    }
    const form = doc && doc.querySelector && doc.querySelector("[data-ff-portal='harmony']");
    return Boolean(form);
  }

  function queryFirst(root, selectors) {
    for (const selector of selectors) {
      try {
        const el = root.querySelector(selector);
        if (el) return el;
      } catch {
        // invalid selector in older engines
      }
    }
    return null;
  }

  function collect(root) {
    const found = {};
    for (const [key, selectors] of Object.entries(SELECTORS)) {
      const el = queryFirst(root, selectors);
      if (el) found[key] = el;
    }
    return found;
  }

  return { HOST_RE, SELECTORS, isHarmonyHost, isHarmonyDocument, collect };
});
