import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { APEX_STAR_SLUG, DEFAULT_FL_HO_ORDER } from "./gate/fl-ho-order";
import { slugFromCarrierName } from "./gate/identity";
import { APPETITE_FL_SPECIALTY_CSV, parseAppetiteCsv } from "./gate/parse";
import { emptySnapshot } from "./gate/snapshot";
import { runQuoteGate } from "./gate/gate";
import {
  APEX_STAR_CARRIER_INFO,
  APEX_STAR_HO_APPETITE,
  APEX_STAR_HO_NOTES,
  publishedHoBySlug,
} from "./published-appetite";
import { APEX_STAR_CARRIER_ID, APEX_STAR_CARRIER_NAME, APEX_STAR_NAIC } from "@/lib/fixtures/ids";
import { COMMON_CARRIER_OPTIONS } from "@/lib/custom-fields/starter-picklists";

function source(rel: string) {
  return readFileSync(path.resolve(process.cwd(), rel), "utf8");
}

describe("Apex Star Reciprocal Exchange", () => {
  it("publishes contacts without inventing UW mins and without matching StarLight / Star Vantage", () => {
    expect(publishedHoBySlug(APEX_STAR_SLUG)?.csPhone).toBe("(888) 876-8005");
    expect(APEX_STAR_HO_APPETITE.legalName).toBe(APEX_STAR_CARRIER_NAME);
    expect(APEX_STAR_HO_APPETITE.notesForAgent).toBe(APEX_STAR_HO_NOTES);
    expect(APEX_STAR_HO_APPETITE.minCovA).toBeNull();
    expect(APEX_STAR_HO_APPETITE.maxCovA).toBeNull();
    expect(APEX_STAR_HO_APPETITE.hardDeclines).toEqual(["state!=FL", "mobile_home"]);
    expect(APEX_STAR_HO_NOTES).toMatch(/Apex Star Insurance Exchange/);
    expect(APEX_STAR_HO_NOTES).toMatch(/StarLight Insurance Group/);
    expect(APEX_STAR_HO_NOTES).toMatch(/customerservice@apexstarins.com/);
    expect(APEX_STAR_HO_NOTES).toMatch(/\(888\) 876-8005/);
    expect(APEX_STAR_HO_NOTES).toMatch(/apexstarins\.com/);
    expect(APEX_STAR_HO_NOTES).toMatch(/Tampa/);
    expect(APEX_STAR_HO_NOTES).toMatch(/HO-3/);
    expect(APEX_STAR_HO_NOTES).toMatch(/DP-3/);
    expect(APEX_STAR_HO_NOTES).toMatch(/commercial property/);
    expect(APEX_STAR_HO_NOTES).toMatch(/No UW mins/);
    expect(APEX_STAR_CARRIER_INFO).toMatch(/Apex Star Insurance Exchange/);
    expect(APEX_STAR_NAIC).toBe("17742");

    expect(slugFromCarrierName("Apex Star Reciprocal Exchange")).toBe(APEX_STAR_SLUG);
    expect(slugFromCarrierName("Apex Star Insurance Exchange")).toBe(APEX_STAR_SLUG);
    expect(slugFromCarrierName("Apex Star Reciprocal")).toBe(APEX_STAR_SLUG);
    expect(slugFromCarrierName("Apex Star")).toBe(APEX_STAR_SLUG);
    expect(slugFromCarrierName("StarLight Insurance Group")).toBeNull();
    expect(slugFromCarrierName("Star Vantage Reciprocal Exchange")).toBeNull();

    expect(DEFAULT_FL_HO_ORDER).toContain(APEX_STAR_SLUG);
    expect(DEFAULT_FL_HO_ORDER.indexOf(APEX_STAR_SLUG)).toBe(
      DEFAULT_FL_HO_ORDER.indexOf("trident_reciprocal") + 1,
    );
    expect(COMMON_CARRIER_OPTIONS).toContain(APEX_STAR_CARRIER_NAME);
  });

  it("keeps the specialty CSV in sync and quote-gates FL HO without invented mins", () => {
    const catalog = parseAppetiteCsv(source(APPETITE_FL_SPECIALTY_CSV));
    const apex = catalog.find((row) => row.carrierId === APEX_STAR_SLUG);
    expect(apex?.legalName).toBe(APEX_STAR_CARRIER_NAME);
    expect(apex?.notesForAgent).toBe(APEX_STAR_HO_NOTES);
    expect(apex?.csPhone).toBe(APEX_STAR_HO_APPETITE.csPhone);
    expect(apex?.linesOffered).toEqual(expect.arrayContaining(["HO3", "DP3", "COMM_RES"]));
    expect(apex?.hardDeclines).toEqual(APEX_STAR_HO_APPETITE.hardDeclines);
    expect(apex?.flHoOrder).toBe(DEFAULT_FL_HO_ORDER.indexOf(APEX_STAR_SLUG));
    expect(apex?.statesAvailable).toContain("FL");

    const ok = runQuoteGate(
      emptySnapshot({
        state: "FL",
        line: "HO3",
        coverageA: 180_000,
        yearBuilt: 2010,
        roofAgeYears: 5,
        occupancy: "Owner",
        isMobile: false,
      }),
      catalog,
    );
    expect(ok.decisions.find((d) => d.carrierId === APEX_STAR_SLUG)?.status).toBe("Quote");

    const mobile = runQuoteGate(
      emptySnapshot({
        state: "FL",
        line: "HO3",
        coverageA: 180_000,
        yearBuilt: 2010,
        isMobile: true,
      }),
      catalog,
    );
    expect(mobile.decisions.find((d) => d.carrierId === APEX_STAR_SLUG)?.status).toBe("Skip-Decline");
    expect(mobile.decisions.find((d) => d.carrierId === APEX_STAR_SLUG)?.matchingRule).toBe("mobile_home");
  });

  it("upserts the desk row via seed-trident pattern without a second UUID", () => {
    const seed = source("src/lib/db/seed-apex-star.ts");
    expect(seed).toContain("seedApexStarReciprocal");
    expect(seed).toContain("carrierInfo: APEX_STAR_CARRIER_INFO");
    expect(seed).toContain("appetiteNotes: APEX_STAR_APPETITE_NOTE");
    expect(seed).toMatch(/%apex star%/);
    expect(source("src/lib/db/seed.ts")).toMatch(/seedApexStarReciprocal/);

    const sql = source("drizzle/0142_apex_star_reciprocal.sql");
    expect(sql).toContain(APEX_STAR_CARRIER_ID);
    expect(sql).toContain(APEX_STAR_CARRIER_NAME);
    expect(sql).toContain("Apex Star Insurance Exchange");
    expect(sql).toContain("customerservice@apexstarins.com");
    expect(sql).toContain("(888) 876-8005");
    expect(sql).toContain("https://apexstarins.com");
    expect(sql).toContain("StarLight Insurance Group");
    expect(sql).toContain("17742");
    expect(sql).toContain("apex_star");
    expect(sql).toMatch(/ON CONFLICT \(tenant_id, carrier_id\) DO UPDATE/);
    expect(sql).toMatch(/lower\(c\.name\) LIKE '%apex star%'/);
    expect(sql).not.toMatch(/0123_trident|0130_javy|0141_agency/);
    expect(source("drizzle/meta/_journal.json")).toMatch(/0142_apex_star_reciprocal/);
  });
});
