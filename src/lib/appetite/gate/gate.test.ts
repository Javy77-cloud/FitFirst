import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CITIZENS_SLUG, CITIZENS_WITHIN_PCT, DEFAULT_FL_HO_ORDER, UICNA_SLUG, UNIVERSAL_PC_SLUG } from "./fl-ho-order";
import { runQuoteGate } from "./gate";
import { slugFromCarrierName } from "./identity";
import { APPETITE_CSV_RELATIVE_PATH, parseAppetiteCsv } from "./parse";
import { emptySnapshot } from "./snapshot";
import { expandStatesAvailable, SE_STATES, US_50_STATES } from "./states";
import { REQUIRED_HARD_DECLINE_TOKENS, tokenHits } from "./tokens";
import type { AppetiteCarrier, MasterRiskSnapshot } from "./types";

function loadCatalog(): AppetiteCarrier[] {
  const text = readFileSync(path.resolve(process.cwd(), APPETITE_CSV_RELATIVE_PATH), "utf8");
  return parseAppetiteCsv(text);
}

function flHo3(partial?: Partial<MasterRiskSnapshot>): MasterRiskSnapshot {
  return emptySnapshot({
    state: "FL",
    line: "HO3",
    occupancy: "Owner",
    roofAgeYears: 5,
    roofCertified: true,
    yearBuilt: 2015,
    windMit: "full",
    coastTier: 2,
    milesToCoast: 8,
    constructionQuality: "average",
    isMobile: false,
    isManufactured: false,
    isVacant: false,
    modeledCatPass: true,
    windFloodNeedMismatch: false,
    admittedDeclinedCount: 0,
    ...partial,
  });
}

describe("state expand", () => {
  it("maps SE_coastal / SE / SE_select / SE_east to the documented SE list", () => {
    for (const token of ["SE_coastal", "SE", "SE_select", "SE_east"]) {
      expect(expandStatesAvailable(token).states).toEqual([...SE_STATES]);
    }
  });

  it("maps mid_atlantic_select to VA,MD,DE,NJ,PA,NY", () => {
    expect(expandStatesAvailable("mid_atlantic_select").states).toEqual(["VA", "MD", "DE", "NJ", "PA", "NY"]);
  });

  it("expands US to all 50 only when the source token is US", () => {
    const us = expandStatesAvailable("US");
    expect(us.states).toHaveLength(50);
    expect(us.states).toEqual([...US_50_STATES]);
    expect(expandStatesAvailable("33_plus_US_states").states).toEqual([]);
    expect(expandStatesAvailable("33_plus_US_states").needsStateConfirm).toBe(true);
    expect(expandStatesAvailable("45_plus_US_states").needsStateConfirm).toBe(true);
    expect(expandStatesAvailable("other").needsStateConfirm).toBe(true);
  });

  it("keeps explicit states and ignores coastal_other / CA_provinces", () => {
    const heritage = expandStatesAvailable("FL|NC|SC|AL|GA|MS|coastal_other");
    expect(heritage.states.sort()).toEqual(["AL", "FL", "GA", "MS", "NC", "SC"]);
    expect(heritage.ignoredTokens).toContain("coastal_other");

    const hagerty = expandStatesAvailable("US|CA_provinces");
    expect(hagerty.states).toHaveLength(50);
    expect(hagerty.ignoredTokens).toContain("CA_provinces");
  });

  it("does not invent 50 for 33_plus plus listed states", () => {
    const mendota = expandStatesAvailable("MN|TN|GA|IL|WI|other_15plus");
    expect(mendota.states.sort()).toEqual(["GA", "IL", "MN", "TN", "WI"]);
    expect(mendota.needsStateConfirm).toBe(true);
  });
});

describe("hard_decline evaluation", () => {
  it("implements every required token against the snapshot", () => {
    expect(REQUIRED_HARD_DECLINE_TOKENS).toHaveLength(27);

    const mobile = flHo3({ isMobile: true });
    expect(tokenHits("mobile_home", mobile)).toBe(true);

    expect(tokenHits("vacant", flHo3({ isVacant: true }))).toBe(true);
    expect(tokenHits("manufactured", flHo3({ isManufactured: true }))).toBe(true);
    expect(tokenHits("state!=FL", flHo3({ state: "GA" }))).toBe(true);
    expect(tokenHits("florida_risk", flHo3())).toBe(true);
    expect(tokenHits("state_not_ne_coast", flHo3())).toBe(true);
    expect(tokenHits("state_not_ne_coast", flHo3({ state: "MA" }))).toBe(false);
    expect(tokenHits("older_roof", flHo3({ roofAgeYears: 16 }))).toBe(true);
    expect(tokenHits("older_roof_no_cert", flHo3({ roofAgeYears: 16, roofCertified: false }))).toBe(true);
    expect(tokenHits("very_old_roof_no_update", flHo3({ roofAgeYears: 25 }))).toBe(true);
    expect(tokenHits("pre_2001_construction", flHo3({ yearBuilt: 1999 }))).toBe(true);
    expect(tokenHits("older_unmitigated", flHo3({ roofAgeYears: 16, windMit: "none" }))).toBe(true);
    expect(tokenHits("no_wind_mit_and_tier1_coast", flHo3({ windMit: "none", coastTier: 1 }))).toBe(true);
    expect(tokenHits("poor_mitigation", flHo3({ windMit: "poor" }))).toBe(true);
    expect(tokenHits("poor_construction", flHo3({ constructionQuality: "poor" }))).toBe(true);
    expect(tokenHits("no_modeled_cat_pass", flHo3({ modeledCatPass: false }))).toBe(true);
    expect(tokenHits("no_wind_flood_need_mismatch", flHo3({ windFloodNeedMismatch: true }))).toBe(true);
    expect(tokenHits("daily_driver", emptySnapshot({ line: "PAP", isCollectorAuto: false, isDailyDriver: true }))).toBe(
      true,
    );
    expect(tokenHits("no_secure_storage", emptySnapshot({ line: "COLLECTOR_AUTO", secureStorage: false }))).toBe(true);
    expect(
      tokenHits("dirty_mvr", emptySnapshot({ line: "PAP", autoFlags: { dui: true, sr22: false, lapse: false, tickets: false, accidents: false } })),
    ).toBe(true);
    expect(
      tokenHits(
        "preferred_only_profile",
        emptySnapshot({
          line: "NONSTANDARD_PAP",
          isPreferredAutoProfile: true,
          autoFlags: { dui: false, sr22: false, lapse: false, tickets: false, accidents: false },
        }),
      ),
    ).toBe(true);
    expect(
      tokenHits(
        "preferred_only_driver",
        emptySnapshot({
          line: "NONSTANDARD_PAP",
          autoFlags: { dui: false, sr22: false, lapse: false, tickets: false, accidents: false },
        }),
      ),
    ).toBe(true);
    expect(tokenHits("inland_preferred_standard", flHo3({ isInland: true, isPreferredStandardHome: true }))).toBe(true);
    expect(tokenHits("inland_only_outside_footprint", flHo3({ coastTier: "inland" }))).toBe(true);
    expect(tokenHits("admitted_market_already_open", flHo3({ admittedDeclinedCount: 0 }))).toBe(true);
    expect(tokenHits("FL_primary_book_assumption", flHo3())).toBe(true);
    expect(tokenHits("clean_preferred_better_priced_elsewhere", emptySnapshot({ line: "PAP" }))).toBe(true);
    expect(tokenHits("none_standard", flHo3({ isStandardPreferredNewConstruction: true }))).toBe(true);
  });

  it("Skip-Decline logs the matching hard_decline token", () => {
    const catalog = loadCatalog();
    const result = runQuoteGate(flHo3({ isMobile: true }), catalog);
    const ai = result.decisions.find((d) => d.carrierId === "american_integrity");
    expect(ai?.status).toBe("Skip-Decline");
    expect(ai?.matchingRule).toBe("mobile_home");
    expect(result.skipDecline.some((d) => d.carrierId === "american_integrity" && d.matchingRule === "mobile_home")).toBe(
      true,
    );
  });
});

describe("quote-gate routing", () => {
  it("ranks Florida HO in the documented specialist order", () => {
    const catalog = loadCatalog();
    const result = runQuoteGate(flHo3(), catalog);
    const quoteIds = result.quote.map((d) => d.carrierId);
    const expectedLead = ["universal_pc", "tower_hill", "slide"];
    expect(quoteIds.slice(0, 3)).toEqual(expectedLead);

    const core = DEFAULT_FL_HO_ORDER.filter(
      (slug) => !["foremost", "tapco", "cabrillo", "monarch", "loggerhead"].includes(slug),
    );
    const rankedCore = result.quote.filter((d) => core.includes(d.carrierId as (typeof core)[number]));
    expect(rankedCore.map((d) => d.carrierId)).toEqual(core);

    expect(result.maybe.every((d) => d.carrierId === "monarch" || d.carrierId === "loggerhead" || d.appointmentGated)).toBe(
      true,
    );
    const uicna = result.decisions.find((d) => d.carrierId === UICNA_SLUG);
    expect(uicna?.status).toBe("Skip-Decline");
    expect(["state_not_available", "FL_primary_book_assumption"]).toContain(uicna?.matchingRule);
  });

  it("encodes Citizens last + within-20% as a documented stub", () => {
    expect(CITIZENS_WITHIN_PCT).toBe(20);
    expect(CITIZENS_SLUG).toBe("citizens");
    const catalog = loadCatalog();
    expect(catalog.some((c) => c.carrierId === CITIZENS_SLUG)).toBe(false);
    const withCitizens: AppetiteCarrier[] = [
      ...catalog,
      {
        carrierId: CITIZENS_SLUG,
        legalName: "Citizens Property Insurance (stub)",
        segment: "fl_property",
        linesOffered: ["HO3"],
        linesNotOffered: [],
        statesAvailable: ["FL"],
        statesRestricted: [],
        statesRaw: ["FL"],
        portalName: null,
        csPhone: null,
        claimsPhone: null,
        rateable: true,
        hardDeclines: [],
        softCautions: [],
        preferredSignals: [],
        catPosture: "selective",
        notesForAgent: "Stub — within 20% of cheapest admitted. Not in this CSV.",
        quotePriority: 999,
        flHoOrder: 999,
        needsStateConfirm: false,
      },
    ];
    const result = runQuoteGate(flHo3(), withCitizens);
    const lastQuote = result.quote[result.quote.length - 1];
    expect(lastQuote?.carrierId).toBe(CITIZENS_SLUG);
  });

  it("collector auto is Hagerty-only", () => {
    const catalog = loadCatalog();
    const result = runQuoteGate(
      emptySnapshot({
        state: "FL",
        line: "COLLECTOR_AUTO",
        isCollectorAuto: true,
        secureStorage: true,
      }),
      catalog,
    );
    expect(result.quote.map((d) => d.carrierId)).toEqual(["hagerty"]);
    expect(result.skipDecline.every((d) => d.carrierId === "hagerty" || d.matchingRule === "hagerty_only_path")).toBe(
      true,
    );
    expect(result.decisions.find((d) => d.carrierId === "universal_pc")?.matchingRule).toBe("hagerty_only_path");
  });

  it("nonstandard auto (DUI/SR-22/lapse/tickets) routes only to dairyland / the_general / infinity / mendota", () => {
    const catalog = loadCatalog();
    const result = runQuoteGate(
      emptySnapshot({
        state: "FL",
        line: "NONSTANDARD_PAP",
        autoFlags: { dui: true, sr22: false, lapse: false, tickets: true, accidents: false },
        isPreferredAutoProfile: false,
      }),
      catalog,
    );
    const allowed = new Set(["dairyland", "the_general", "infinity", "mendota"]);
    for (const d of result.quote.concat(result.maybe)) {
      expect(allowed.has(d.carrierId)).toBe(true);
    }
    expect(result.decisions.find((d) => d.carrierId === "slide")?.matchingRule).toBe("nonstandard_auto_only");
    expect(result.decisions.find((d) => d.carrierId === "dairyland")?.status).not.toBe("Skip-Decline");
    expect(result.decisions.find((d) => d.carrierId === "the_general")?.status).not.toBe("Skip-Decline");
    expect(result.decisions.find((d) => d.carrierId === "infinity")?.status).not.toBe("Skip-Decline");
    expect(result.decisions.find((d) => d.carrierId === "mendota")?.matchingRule).toBe("state_not_available");
  });
});

describe("universal_pc ≠ uicna identity", () => {
  it("keeps Universal Property & Casualty and UICNA as separate slugs and footprints", () => {
    const catalog = loadCatalog();
    const upc = catalog.find((c) => c.carrierId === UNIVERSAL_PC_SLUG);
    const uicna = catalog.find((c) => c.carrierId === UICNA_SLUG);
    expect(upc).toBeTruthy();
    expect(uicna).toBeTruthy();
    expect(upc!.carrierId).not.toBe(uicna!.carrierId);
    expect(upc!.legalName).toMatch(/Property & Casualty/i);
    expect(uicna!.legalName).toMatch(/North America/i);
    expect(upc!.statesAvailable).toContain("FL");
    expect(uicna!.statesAvailable).not.toContain("FL");
    expect(uicna!.statesAvailable).toEqual(["TX", "SC", "NC", "GA", "HI"]);
    expect(slugFromCarrierName("Universal Property & Casualty")).toBe(UNIVERSAL_PC_SLUG);
    expect(slugFromCarrierName("Universal Insurance Company of North America")).toBe(UICNA_SLUG);
    expect(slugFromCarrierName("UICNA")).toBe(UICNA_SLUG);
    expect(slugFromCarrierName("Universal")).toBeNull();
  });

  it("does not merge the two Universals when parsing the committed CSV", () => {
    const catalog = loadCatalog();
    const slugs = catalog.map((c) => c.carrierId);
    expect(slugs.filter((s) => s === UNIVERSAL_PC_SLUG)).toHaveLength(1);
    expect(slugs.filter((s) => s === UICNA_SLUG)).toHaveLength(1);
    expect(new Set(slugs).size).toBe(catalog.length);
    expect(catalog).toHaveLength(28);
    expect(catalog.every((c) => c.rateable)).toBe(true);
  });
});

describe("CSV import parse (no DB)", () => {
  it("expands Foremost / Pacific Specialty / Hagerty US footprints to 50 states", () => {
    const catalog = loadCatalog();
    for (const slug of ["foremost", "pacific_specialty", "hagerty"]) {
      const row = catalog.find((c) => c.carrierId === slug);
      expect(row?.statesAvailable).toHaveLength(50);
    }
    expect(catalog.find((c) => c.carrierId === "dairyland")?.needsStateConfirm).toBe(true);
    expect(catalog.find((c) => c.carrierId === "dairyland")?.statesAvailable).toEqual([]);
  });

  it("is idempotent — parsing twice yields the same slugs and states", () => {
    const a = loadCatalog();
    const b = loadCatalog();
    expect(a.map((r) => [r.carrierId, r.statesAvailable.join("|")])).toEqual(
      b.map((r) => [r.carrierId, r.statesAvailable.join("|")]),
    );
  });
});
