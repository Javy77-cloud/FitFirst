import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COMMON_CARRIER_OPTIONS } from "@/lib/custom-fields/starter-picklists";
import {
  PERSONAL_LINES_CARRIERS,
  PERSONAL_LINES_FIXTURE_TAG,
  UW_QUESTIONS_RP_PARK,
  matchesPersonalLinesName,
  personalLinesAppetiteNote,
  personalLinesSummary,
} from "./personal-lines-carriers";
import { APPETITE_FL_SPECIALTY_CSV, parseAppetiteCsv } from "./gate/parse";

function source(rel: string) {
  return readFileSync(path.resolve(process.cwd(), rel), "utf8");
}

describe("personal-lines carriers 2026-09-22", () => {
  it("catalogs notes carriers without inventing under-50 state lists", () => {
    expect(PERSONAL_LINES_CARRIERS.length).toBeGreaterThanOrEqual(35);
    const am = PERSONAL_LINES_CARRIERS.find((c) => c.name === "American Modern");
    expect(am?.enrichOnly).toBe(true);
    expect(PERSONAL_LINES_CARRIERS.filter((c) => c.enrichOnly)).toHaveLength(1);

    for (const spec of PERSONAL_LINES_CARRIERS) {
      if (spec.statesToken === "US" || spec.statesToken === "FL" || spec.statesToken === "NJ" || spec.statesToken === "FL|TX") {
        continue;
      }
      expect(spec.statesToken).toBe("");
      expect(spec.territory.toLowerCase()).toMatch(/unknown|~|list/);
    }

    const usaa = PERSONAL_LINES_CARRIERS.find((c) => c.name === "USAA");
    expect(usaa?.tags).toContain("military-only");
    expect(personalLinesAppetiteNote(usaa!)).toMatch(/military/i);

    const chubb = PERSONAL_LINES_CARRIERS.find((c) => c.name === "Chubb");
    expect(chubb?.tags).toContain("high-value");
  });

  it("matches existing desk names and never duplicates American Modern", () => {
    const neonish = [
      "American Modern",
      "Progressive",
      "Geico",
      "AAA",
      "Foremost",
      "Tower Hill",
      "Heritage",
      "American Traditions",
      "Universal P&C",
    ];
    const summary = personalLinesSummary(neonish);
    expect(summary.enrichOnly).toEqual(["American Modern"]);
    expect(summary.alreadyPresent).toContain("American Modern");
    expect(summary.alreadyPresent).toContain("Progressive");
    expect(summary.toAdd).toContain("State Farm");
    expect(summary.toAdd).toContain("USAA");
    expect(summary.toAdd).toContain("Erie");
    expect(summary.toAdd).toContain("Assurant");
    expect(summary.toAdd).not.toContain("American Modern");

    const farmers = PERSONAL_LINES_CARRIERS.find((c) => c.name === "Farmers")!;
    expect(matchesPersonalLinesName("Farmers Insurance", farmers)).toBe(true);
    expect(matchesPersonalLinesName("Southern Farm Bureau", farmers)).toBe(false);

    const erie = PERSONAL_LINES_CARRIERS.find((c) => c.name === "Erie")!;
    expect(matchesPersonalLinesName("Erie", erie)).toBe(true);
    expect(matchesPersonalLinesName("Coterie", erie)).toBe(false);
    const amica = PERSONAL_LINES_CARRIERS.find((c) => c.name === "Amica")!;
    expect(matchesPersonalLinesName("Amica", amica)).toBe(true);
    expect(matchesPersonalLinesName("American Amicable", amica)).toBe(false);
  });

  it("wires seed + migration and parks UW→RP densify", () => {
    expect(UW_QUESTIONS_RP_PARK).toMatch(/PARK/);
    expect(source("src/lib/db/seed.ts")).toMatch(/seedPersonalLinesCarriers/);
    const seed = source("src/lib/db/seed-personal-lines-carriers.ts");
    expect(seed).toContain("seedPersonalLinesCarriers");
    expect(seed).toContain("enrichOnly");
    expect(seed).not.toMatch(/portalPassword|portalUsername/);
    const sql = source("drizzle/0151_personal_lines_carriers.sql");
    expect(sql).toContain(PERSONAL_LINES_FIXTURE_TAG);
    expect(sql).toMatch(/enrich_only := true/);
    expect(sql).toContain("American Modern");
    expect(sql).toContain("State Farm");
    expect(sql).toContain("Assurant");
    expect(COMMON_CARRIER_OPTIONS).toContain("American Modern");
    expect(COMMON_CARRIER_OPTIONS).toContain("State Farm");
    expect(COMMON_CARRIER_OPTIONS).toContain("Erie");
    expect(COMMON_CARRIER_OPTIONS).toContain("Assurant");
    expect(COMMON_CARRIER_OPTIONS).toContain("NJM");
  });

  it("densifies FL MHO four specialty notes without inventing UW mins", () => {
    const specialty = parseAppetiteCsv(source(APPETITE_FL_SPECIALTY_CSV));
    const byId = Object.fromEntries(specialty.map((c) => [c.carrierId, c]));
    expect(byId.foremost.notesForAgent).toMatch(/Default first call/);
    expect(byId.foremost.notesForAgent).toMatch(/tie-down/);
    expect(byId.heritage.notesForAgent).toMatch(/strictest/);
    expect(byId.tower_hill.notesForAgent).toMatch(/\$300k|300k/);
    expect(byId.american_traditions).toBeTruthy();
    expect(byId.american_traditions.statesAvailable).toEqual(["FL"]);
    expect(byId.american_traditions.notesForAgent).toMatch(/manufactured-home leader/i);
    expect(byId.american_traditions.preferredSignals).toEqual(
      expect.arrayContaining(["manufactured", "mobile_home", "mho"]),
    );
  });
});
