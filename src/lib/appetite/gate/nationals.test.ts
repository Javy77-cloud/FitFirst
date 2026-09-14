import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CITIZENS_SLUG, DEFAULT_FL_HO_ORDER } from "./fl-ho-order";
import { runQuoteGate } from "./gate";
import { slugFromCarrierName } from "./identity";
import {
  APPETITE_FL_SPECIALTY_CSV,
  APPETITE_NATIONALS_CSV,
  APPETITE_NATIONALS_STATE_RULES_CSV,
  companionStateRulesPath,
  parseAppetiteCsv,
  parseAppetiteStateRulesCsv,
} from "./parse";
import { emptySnapshot } from "./snapshot";
import { quoteDecisionInserts, sharedStateCarrierKey, tenantStateCarrierKey } from "./state-learning";
import { US_50_STATES } from "./states";
import type { AppetiteCarrier, MasterRiskSnapshot } from "./types";

function loadCsv(rel: string): string {
  return readFileSync(path.resolve(process.cwd(), rel), "utf8");
}

function loadSpecialty(): AppetiteCarrier[] {
  return parseAppetiteCsv(loadCsv(APPETITE_FL_SPECIALTY_CSV));
}

function loadNationals(): AppetiteCarrier[] {
  return parseAppetiteCsv(loadCsv(APPETITE_NATIONALS_CSV));
}

function loadCombined(): { carriers: AppetiteCarrier[]; stateRules: ReturnType<typeof parseAppetiteStateRulesCsv> } {
  const specialty = loadSpecialty();
  const nationals = loadNationals();
  return {
    carriers: [...specialty, ...nationals],
    stateRules: parseAppetiteStateRulesCsv(loadCsv(APPETITE_NATIONALS_STATE_RULES_CSV)),
  };
}

function snap(partial: Partial<MasterRiskSnapshot>): MasterRiskSnapshot {
  return emptySnapshot({
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

describe("nationals CSV pack", () => {
  it("parses unique slugs and does not overlap FL specialty carrier_ids", () => {
    const specialty = loadSpecialty();
    const nationals = loadNationals();
    const specSlugs = specialty.map((c) => c.carrierId);
    const natSlugs = nationals.map((c) => c.carrierId);
    expect(new Set(specSlugs).size).toBe(specSlugs.length);
    expect(new Set(natSlugs).size).toBe(natSlugs.length);
    expect(new Set([...specSlugs, ...natSlugs]).size).toBe(specSlugs.length + natSlugs.length);
    expect(natSlugs).not.toContain("slide");
    expect(natSlugs).not.toContain("universal_pc");
    expect(specSlugs).not.toContain("progressive");
    expect(specSlugs).not.toContain(CITIZENS_SLUG);
    expect(nationals).toHaveLength(14);
    expect(nationals.every((c) => c.rateable)).toBe(true);
    expect(nationals.every((c) => c.segment === "national" || c.carrierId === CITIZENS_SLUG)).toBe(true);
  });

  it("keeps Citizens as a normal FL residual row — not a special last-resort record", () => {
    const nationals = loadNationals();
    const citizens = nationals.find((c) => c.carrierId === CITIZENS_SLUG);
    expect(citizens).toBeTruthy();
    expect(citizens!.legalName).toMatch(/Citizens Property/i);
    expect(citizens!.segment).toBe("fl_property");
    expect(citizens!.statesAvailable).toEqual(["FL"]);
    expect(citizens!.linesOffered).toEqual(expect.arrayContaining(["HO3", "HO6", "DP1", "DP3"]));
    expect(citizens!.hardDeclines).toContain("state!=FL");
    expect(citizens!.notesForAgent ?? "").toMatch(/residual/i);
    expect(citizens!.notesForAgent ?? "").not.toMatch(/within\s*20/i);
    expect(citizens!.flHoOrder).toBeNull();
  });

  it("does not invent 50 states unless the source token is US", () => {
    const nationals = loadNationals();
    const usOk = new Set(["progressive", "geico", "state_farm", "allstate", "usaa"]);
    for (const row of nationals) {
      if (usOk.has(row.carrierId)) {
        expect(row.statesAvailable).toEqual([...US_50_STATES]);
        expect(row.statesRaw).toContain("US");
      } else {
        expect(row.statesAvailable.length).toBeLessThan(50);
        expect(row.statesRaw).not.toContain("US");
      }
    }
    expect(nationals.find((c) => c.carrierId === "farmers")?.needsStateConfirm).toBe(true);
    expect(nationals.find((c) => c.carrierId === "nationwide")?.needsStateConfirm).toBe(true);
    expect(nationals.find((c) => c.carrierId === "liberty_mutual")?.needsStateConfirm).toBe(true);
    expect(nationals.find((c) => c.carrierId === "farmers")?.statesAvailable).not.toContain("FL");
    expect(nationals.find((c) => c.carrierId === "american_family")?.statesAvailable).not.toContain("FL");
  });

  it("keeps Liberty Mutual and Safeco as distinct companies", () => {
    const nationals = loadNationals();
    expect(nationals.find((c) => c.carrierId === "liberty_mutual")).toBeTruthy();
    expect(nationals.find((c) => c.carrierId === "safeco")).toBeTruthy();
    expect(slugFromCarrierName("Liberty Mutual Insurance")).toBe("liberty_mutual");
    expect(slugFromCarrierName("Safeco Insurance")).toBe("safeco");
    expect(slugFromCarrierName("State Farm")).toBe("state_farm");
    expect(slugFromCarrierName("Citizens Property Insurance")).toBe(CITIZENS_SLUG);
  });
});

describe("per-state overlays", () => {
  it("parses CA HO closed overlays without closing nationwide HO", () => {
    const rules = parseAppetiteStateRulesCsv(loadCsv(APPETITE_NATIONALS_STATE_RULES_CSV));
    expect(rules).toHaveLength(2);
    expect(rules.map((r) => `${r.carrierId}:${r.state}`).sort()).toEqual(["allstate:CA", "state_farm:CA"]);
    for (const rule of rules) {
      expect(rule.catPosture).toBe("closed_new_biz");
      expect(rule.hardDeclines).toContain("new_homeowners");
      expect(rule.researchDated).toBe("2026-09");
      expect(rule.lines).toEqual(expect.arrayContaining(["HO3", "HO6"]));
    }
    expect(companionStateRulesPath(APPETITE_NATIONALS_CSV)).toBe(APPETITE_NATIONALS_STATE_RULES_CSV);
    expect(companionStateRulesPath(APPETITE_FL_SPECIALTY_CSV)).toBeNull();
  });

  it("Skip-Declines State Farm / Allstate CA new HO and still quotes TX HO + CA auto", () => {
    const { carriers, stateRules } = loadCombined();
    const opts = { stateRules };

    const sfCaHo = runQuoteGate(snap({ state: "CA", line: "HO3" }), carriers, opts);
    expect(sfCaHo.decisions.find((d) => d.carrierId === "state_farm")?.status).toBe("Skip-Decline");
    expect(sfCaHo.decisions.find((d) => d.carrierId === "state_farm")?.matchingRule).toBe("closed_new_biz");
    expect(sfCaHo.decisions.find((d) => d.carrierId === "allstate")?.status).toBe("Skip-Decline");
    expect(sfCaHo.decisions.find((d) => d.carrierId === "allstate")?.matchingRule).toBe("closed_new_biz");

    const sfTxHo = runQuoteGate(snap({ state: "TX", line: "HO3" }), carriers, opts);
    expect(sfTxHo.decisions.find((d) => d.carrierId === "state_farm")?.status).not.toBe("Skip-Decline");
    expect(sfTxHo.decisions.find((d) => d.carrierId === "allstate")?.status).not.toBe("Skip-Decline");

    const sfCaAuto = runQuoteGate(snap({ state: "CA", line: "PAP" }), carriers, opts);
    expect(sfCaAuto.decisions.find((d) => d.carrierId === "state_farm")?.status).not.toBe("Skip-Decline");
    expect(sfCaAuto.decisions.find((d) => d.carrierId === "allstate")?.status).not.toBe("Skip-Decline");
  });

  it("Progressive skips new DP-3 and still quotes auto", () => {
    const { carriers, stateRules } = loadCombined();
    const prog = carriers.find((c) => c.carrierId === "progressive");
    expect(prog?.linesNotOffered).toContain("DP3");
    expect(prog?.hardDeclines).toContain("no_new_dp3");
    expect(prog?.notesForAgent ?? "").toMatch(/auto-first/i);

    const dp3 = runQuoteGate(snap({ state: "TX", line: "DP3" }), carriers, { stateRules });
    const progDp3 = dp3.decisions.find((d) => d.carrierId === "progressive");
    expect(progDp3?.status).toBe("Skip-Decline");
    expect(["DP3", "no_new_dp3", "line_not_offered"]).toContain(progDp3?.matchingRule);

    const pap = runQuoteGate(snap({ state: "TX", line: "PAP" }), carriers, { stateRules });
    expect(pap.decisions.find((d) => d.carrierId === "progressive")?.status).not.toBe("Skip-Decline");
  });
});

describe("FL specialists outrank nationals; Citizens is normal", () => {
  it("ranks FL HO specialists ahead of Progressive / State Farm / Citizens", () => {
    const { carriers, stateRules } = loadCombined();
    const result = runQuoteGate(snap({ state: "FL", line: "HO3" }), carriers, { stateRules });
    const quoteIds = result.quote.map((d) => d.carrierId);
    expect(quoteIds.slice(0, 3)).toEqual(["universal_pc", "tower_hill", "slide"]);

    const specialistLead = result.quote.find((d) => d.carrierId === "universal_pc")!;
    for (const slug of ["progressive", "state_farm", "allstate", CITIZENS_SLUG]) {
      const row = result.quote.find((d) => d.carrierId === slug) ?? result.maybe.find((d) => d.carrierId === slug);
      expect(row, slug).toBeTruthy();
      expect(row!.rank).toBeGreaterThan(specialistLead.rank);
    }
    expect(DEFAULT_FL_HO_ORDER).not.toContain("progressive");
    expect(DEFAULT_FL_HO_ORDER).not.toContain(CITIZENS_SLUG);
  });

  it("treats Citizens as a normal FL-only Quote and skips it outside Florida", () => {
    const { carriers, stateRules } = loadCombined();
    const fl = runQuoteGate(snap({ state: "FL", line: "HO3" }), carriers, { stateRules });
    const ga = runQuoteGate(snap({ state: "GA", line: "HO3" }), carriers, { stateRules });
    const citFl = fl.decisions.find((d) => d.carrierId === CITIZENS_SLUG);
    const citGa = ga.decisions.find((d) => d.carrierId === CITIZENS_SLUG);
    expect(citFl?.status).toBe("Quote");
    expect(citFl?.matchingRule ?? "").not.toMatch(/within|last.?resort/i);
    expect(["state_not_available", "state!=FL"]).toContain(citGa?.matchingRule);
    const afterSpecialists = fl.quote.filter((d) => !DEFAULT_FL_HO_ORDER.includes(d.carrierId as (typeof DEFAULT_FL_HO_ORDER)[number]));
    expect(afterSpecialists.some((d) => d.carrierId === CITIZENS_SLUG)).toBe(true);
    expect(afterSpecialists.length).toBeGreaterThan(1);
  });

  it("keeps GEICO out of homeowners and Farmers out of Florida", () => {
    const { carriers, stateRules } = loadCombined();
    const flHo = runQuoteGate(snap({ state: "FL", line: "HO3" }), carriers, { stateRules });
    expect(flHo.decisions.find((d) => d.carrierId === "geico")?.status).toBe("Skip-Decline");
    expect(flHo.decisions.find((d) => d.carrierId === "farmers")?.matchingRule).toBe("state_not_available");
    expect(flHo.decisions.find((d) => d.carrierId === "american_family")?.matchingRule).toBe("state_not_available");
  });
});

describe("state-keyed decision learning", () => {
  it("records risk_state / risk_line and separates tenant vs shared state keys", () => {
    const { carriers, stateRules } = loadCombined();
    const snapshot = snap({
      state: "FL",
      line: "HO3",
      dealId: "deal-1",
      riskId: "risk-1",
    });
    const result = runQuoteGate(snapshot, carriers, { stateRules });
    const tenantA = quoteDecisionInserts({ result, tenantId: "agency-a", snapshot });
    const tenantB = quoteDecisionInserts({ result, tenantId: "agency-b", snapshot });
    expect(tenantA.length).toBe(result.decisions.length);
    expect(tenantA.every((row) => row.riskState === "FL" && row.riskLine === "HO3")).toBe(true);
    expect(tenantA[0]!.tenantId).toBe("agency-a");
    expect(tenantB[0]!.tenantId).toBe("agency-b");
    expect(tenantStateCarrierKey("agency-a", "FL", "progressive")).not.toBe(
      tenantStateCarrierKey("agency-b", "FL", "progressive"),
    );
    expect(sharedStateCarrierKey("FL", "progressive")).toBe(sharedStateCarrierKey("fl", "progressive"));
    expect(sharedStateCarrierKey("FL", "progressive")).not.toBe(sharedStateCarrierKey("CA", "progressive"));
  });
});
