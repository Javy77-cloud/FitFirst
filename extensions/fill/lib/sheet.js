(function (root, factory) {
  const api = factory();
  root.FitFirstSheet = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const KIND = "fitfirst.sheet";

  function asText(value) {
    if (value == null || value === "") return null;
    return String(value);
  }

  function asNumber(value) {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(String(value).replace(/[$,]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  function emptyRisk() {
    return {
      address1: null,
      city: null,
      county: null,
      state: null,
      zip: null,
      line: null,
      occupancy: null,
      occupancyNote: null,
      stories: null,
      yearBuilt: null,
      roofYear: null,
      roofCovering: null,
      construction: null,
      openingProtection: null,
      pool: null,
      protectionClass: null,
      milesToCoast: null,
      coverageA: null,
    };
  }

  function coerce(raw) {
    if (!raw || typeof raw !== "object") return null;
    const riskSrc = raw.risk && typeof raw.risk === "object" ? raw.risk : raw;
    const insuredSrc = raw.insured && typeof raw.insured === "object" ? raw.insured : {};
    const hintSrc = raw.carrierHint && typeof raw.carrierHint === "object" ? raw.carrierHint : {};

    const sheet = {
      kind: KIND,
      version: 1,
      tenantId: asText(raw.tenantId) || asText(raw.tenant_id),
      dealId: asText(raw.dealId) || asText(raw.deal_id),
      shopDate: asText(raw.shopDate) || asText(raw.shop_date),
      carrierHint: {
        key: asText(hintSrc.key) || "tailrow",
        name: asText(hintSrc.name) || "Tailrow",
        portal: asText(hintSrc.portal) || "Harmony",
        host: asText(hintSrc.host) || "agency.harmony-ins.com",
      },
      insured: {
        primary: asText(insuredSrc.primary) || asText(raw.primaryNamedInsured),
        namedInsured: asText(insuredSrc.namedInsured) || asText(raw.secondaryNamedInsured),
      },
      risk: {
        ...emptyRisk(),
        address1: asText(riskSrc.address1) || asText(riskSrc.address),
        city: asText(riskSrc.city),
        county: asText(riskSrc.county),
        state: asText(riskSrc.state),
        zip: asText(riskSrc.zip) || asText(riskSrc.zipCode),
        line: asText(riskSrc.line) || asText(riskSrc.lineOfBusiness),
        occupancy: asText(riskSrc.occupancy),
        occupancyNote: asText(riskSrc.occupancyNote),
        stories: asNumber(riskSrc.stories),
        yearBuilt: asNumber(riskSrc.yearBuilt),
        roofYear: asNumber(riskSrc.roofYear),
        roofCovering: asText(riskSrc.roofCovering),
        construction: asText(riskSrc.construction),
        openingProtection: asText(riskSrc.openingProtection),
        pool: typeof riskSrc.pool === "boolean" ? riskSrc.pool : null,
        protectionClass: asText(riskSrc.protectionClass),
        milesToCoast: asNumber(riskSrc.milesToCoast),
        coverageA: asNumber(riskSrc.coverageA),
      },
    };

    if (!sheet.insured.primary && !sheet.risk.address1 && sheet.risk.coverageA == null) {
      return null;
    }
    return sheet;
  }

  function extractJson(text) {
    if (!text || typeof text !== "string") return null;
    const trimmed = text.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      const start = trimmed.indexOf("{");
      const end = trimmed.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(trimmed.slice(start, end + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  function parseSheet(textOrObject) {
    if (textOrObject && typeof textOrObject === "object") return coerce(textOrObject);
    return coerce(extractJson(textOrObject));
  }

  return { KIND, parseSheet, coerce, extractJson };
});
