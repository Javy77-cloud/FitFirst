import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appointmentLine } from "@/lib/domain";
import {
  NATIONWIDE_CARRIER_ID,
  OLYMPUS_CARRIER_ID,
  SOUTHERN_OAK_CARRIER_ID,
  STAND_CARRIER_ID,
  UNIVERSAL_PC_CARRIER_ID,
} from "@/lib/fixtures/ids";
import { DEFAULT_FL_HO_ORDER, STAND_SLUG, UNIVERSAL_PC_SLUG } from "./gate/fl-ho-order";
import { runQuoteGate } from "./gate/gate";
import { slugFromCarrierName } from "./gate/identity";
import { lineMatchesOffered } from "./gate/lines";
import {
  APPETITE_FL_SPECIALTY_CSV,
  APPETITE_NATIONALS_CSV,
  parseAppetiteCsv,
} from "./gate/parse";
import { emptySnapshot } from "./gate/snapshot";
import {
  NATIONWIDE_NOTES_FOR_AGENT,
  NATIONWIDE_POWERSPORTS_NOTES,
  OLYMPUS_HO_APPETITE,
  OLYMPUS_HO_NOTES,
  STAND_HO_APPETITE,
  STAND_HO_NOTES,
  UNIVERSAL_PC_HO_APPETITE,
  UNIVERSAL_PC_HO_NOTES,
  publishedHoBySlug,
} from "./published-appetite";

function loadCsv(rel: string) {
  return parseAppetiteCsv(readFileSync(path.resolve(process.cwd(), rel), "utf8"));
}

describe("Javy 2026-09-16 bulletins (Stand / UPCIC / Nationwide / Olympus)", () => {
  it("publishes Stand contacts without inventing UW mins and without matching Standard", () => {
    expect(publishedHoBySlug("stand")?.csPhone).toBe("1-888-319-1332");
    expect(STAND_HO_APPETITE.notesForAgent).toBe(STAND_HO_NOTES);
    expect(STAND_HO_APPETITE.minCovA).toBeNull();
    expect(STAND_HO_APPETITE.maxCovA).toBeNull();
    expect(STAND_HO_APPETITE.hardDeclines).toEqual(["state!=FL", "mobile_home"]);
    expect(STAND_HO_NOTES).toMatch(/833-667-8263/);
    expect(STAND_HO_NOTES).toMatch(/Office@nexteraclaims.com/);
    expect(STAND_HO_NOTES).toMatch(/mike@standinsurance.com/);
    expect(STAND_HO_NOTES).toMatch(/maggieg@standinsurance.com/);
    expect(STAND_HO_NOTES).toMatch(/PO Box 459000/);
    expect(slugFromCarrierName("Stand")).toBe(STAND_SLUG);
    expect(slugFromCarrierName("STAND")).toBe(STAND_SLUG);
    expect(slugFromCarrierName("Stand Insurance")).toBe(STAND_SLUG);
    expect(slugFromCarrierName("GetStandFL")).toBe(STAND_SLUG);
    expect(slugFromCarrierName("Standard")).toBeNull();
    expect(slugFromCarrierName("Outstanding")).toBeNull();
    expect(DEFAULT_FL_HO_ORDER).toContain("stand");
    expect(DEFAULT_FL_HO_ORDER.indexOf("stand")).toBe(DEFAULT_FL_HO_ORDER.indexOf("olympus") + 1);
  });

  it("enriches Universal P&C binding guidelines without merging UICNA", () => {
    const upc = publishedHoBySlug("universal_pc");
    expect(upc?.notesForAgent).toBe(UNIVERSAL_PC_HO_NOTES);
    expect(upc?.minCovA).toBe(100_000);
    expect(upc?.maxCovA).toBe(1_500_000);
    expect(upc?.hardDeclines).toEqual([
      "mobile_home",
      "manufactured",
      "min_cov_a:100000",
      "max_cov_a:1500000",
    ]);
    expect(UNIVERSAL_PC_HO_NOTES).toMatch(/05\/26\/2026/);
    expect(UNIVERSAL_PC_HO_NOTES).toMatch(/\$250,000-\$1,000,000/);
    expect(UNIVERSAL_PC_HO_NOTES).toMatch(/1950-1975/);
    expect(UNIVERSAL_PC_HO_NOTES).toMatch(/Panhandle/);
    expect(UNIVERSAL_PC_HO_NOTES).toMatch(/HO8/);
    expect(UNIVERSAL_PC_HO_NOTES).toMatch(/DP2\/DP3/);
    expect(slugFromCarrierName("Universal P&C")).toBe(UNIVERSAL_PC_SLUG);
    expect(slugFromCarrierName("Universal Insurance Company of North America")).toBe("uicna");
  });

  it("keeps Nationwide powersports as appetite notes + BOAT/MCY/RV tags, not a boat rater", () => {
    expect(NATIONWIDE_POWERSPORTS_NOTES).toMatch(/NPC-0577FL 02\/22/);
    expect(NATIONWIDE_POWERSPORTS_NOTES).toMatch(/35 feet/);
    expect(NATIONWIDE_POWERSPORTS_NOTES).toMatch(/PWC/);
    expect(NATIONWIDE_POWERSPORTS_NOTES).toMatch(/\$80,000/);
    expect(NATIONWIDE_POWERSPORTS_NOTES).toMatch(/1-877-877-7907/);
    expect(NATIONWIDE_POWERSPORTS_NOTES).toMatch(/not a boat rater/);
    expect(NATIONWIDE_NOTES_FOR_AGENT.startsWith("Multi-line.")).toBe(true);
    expect(lineMatchesOffered("BOAT", ["PAP", "HO3", "BOAT", "MCY", "RV"])).toBe(true);
    expect(lineMatchesOffered("PWC", ["BOAT"])).toBe(true);
    expect(lineMatchesOffered("MCY", ["MCY"])).toBe(true);
    expect(appointmentLine("BOAT")).toBe("BOAT");
    expect(appointmentLine("MCY")).toBe("AUTO");
  });

  it("enriches Olympus from the 06/15/2026 companion scan without a hard $500k min", () => {
    expect(publishedHoBySlug("olympus")?.notesForAgent).toBe(OLYMPUS_HO_NOTES);
    expect(OLYMPUS_HO_APPETITE.maxCovA).toBe(5_000_000);
    expect(OLYMPUS_HO_APPETITE.minCovA).toBeNull();
    expect(OLYMPUS_HO_APPETITE.hardDeclines).not.toContain("min_cov_a:500000");
    expect(OLYMPUS_HO_APPETITE.hardDeclines).toContain("max_cov_a:5000000");
    expect(OLYMPUS_HO_NOTES).toMatch(/V0426/);
    expect(OLYMPUS_HO_NOTES).toMatch(/June 15, 2026/);
    expect(OLYMPUS_HO_NOTES).toMatch(/\$500,000 rest of state/);
    expect(OLYMPUS_HO_NOTES).toMatch(/not applied as a hard quote-gate min/);
    expect(slugFromCarrierName("Olympus")).toBe("olympus");
  });

  it("keeps CSV notes in sync with published constants and leaves Southern Oak alone", () => {
    const specialty = loadCsv(APPETITE_FL_SPECIALTY_CSV);
    const nationals = loadCsv(APPETITE_NATIONALS_CSV);
    expect(specialty).toHaveLength(30);
    expect(specialty.map((c) => c.carrierId)).toContain("stand");
    expect(specialty.map((c) => c.carrierId)).toContain("southern_oak");

    const stand = specialty.find((c) => c.carrierId === "stand")!;
    expect(stand.notesForAgent).toBe(STAND_HO_NOTES);
    expect(stand.csPhone).toBe("1-888-319-1332");
    expect(stand.linesOffered).toEqual(["HO3"]);
    expect(stand.flHoOrder).toBe(DEFAULT_FL_HO_ORDER.indexOf("stand"));

    const upc = specialty.find((c) => c.carrierId === "universal_pc")!;
    expect(upc.notesForAgent).toBe(UNIVERSAL_PC_HO_NOTES);
    expect(upc.linesOffered).toEqual(expect.arrayContaining(["HO3", "HO8", "DP1", "DP2", "DP3", "HO4", "HO6"]));
    expect(upc.hardDeclines).toEqual(UNIVERSAL_PC_HO_APPETITE.hardDeclines);

    const oly = specialty.find((c) => c.carrierId === "olympus")!;
    expect(oly.notesForAgent).toBe(OLYMPUS_HO_NOTES);
    expect(oly.hardDeclines).toEqual(OLYMPUS_HO_APPETITE.hardDeclines);
    expect(oly.hardDeclines).not.toContain("min_cov_a:500000");

    const oak = specialty.find((c) => c.carrierId === "southern_oak")!;
    expect(oak.notesForAgent).toMatch(/7\/15\/2026/);
    expect(oak.hardDeclines).toEqual(["mobile_home", "max_cov_a:7500000", "min_year_built:1950"]);

    const nw = nationals.find((c) => c.carrierId === "nationwide")!;
    expect(nw.linesOffered).toEqual(expect.arrayContaining(["BOAT", "MCY", "RV", "PAP", "HO3"]));
    expect(nw.notesForAgent).toContain(NATIONWIDE_POWERSPORTS_NOTES);
    expect(nw.needsStateConfirm).toBe(true);
  });

  it("quote-gates UPCIC Cov A and leaves Stand/Olympus open on a normal FL HO3", () => {
    const catalog = loadCsv(APPETITE_FL_SPECIALTY_CSV);
    const snap = emptySnapshot({
      state: "FL",
      line: "HO3",
      coverageA: 180_000,
      yearBuilt: 2010,
      roofAgeYears: 5,
      roofCertified: true,
      occupancy: "Owner",
      isMobile: false,
      isManufactured: false,
    });
    const result = runQuoteGate(snap, catalog);
    expect(result.decisions.find((d) => d.carrierId === "universal_pc")?.status).toBe("Quote");
    expect(result.decisions.find((d) => d.carrierId === "stand")?.status).toBe("Quote");
    expect(result.decisions.find((d) => d.carrierId === "olympus")?.status).toBe("Quote");

    const low = runQuoteGate(emptySnapshot({ ...snap, coverageA: 80_000 }), catalog);
    expect(low.decisions.find((d) => d.carrierId === "universal_pc")?.status).toBe("Skip-Decline");
    expect(low.decisions.find((d) => d.carrierId === "universal_pc")?.matchingRule).toBe("min_cov_a:100000");

    const high = runQuoteGate(emptySnapshot({ ...snap, coverageA: 1_600_000 }), catalog);
    expect(high.decisions.find((d) => d.carrierId === "universal_pc")?.matchingRule).toBe("max_cov_a:1500000");
  });

  it("applies 0130 without a Southern Oak rewrite and reuses live UUIDs", () => {
    const sql = readFileSync("drizzle/0130_javy_bulletins_20260916.sql", "utf8");
    expect(sql).toContain(STAND_CARRIER_ID);
    expect(sql).toContain(UNIVERSAL_PC_CARRIER_ID);
    expect(sql).toContain(NATIONWIDE_CARRIER_ID);
    expect(sql).toContain(OLYMPUS_CARRIER_ID);
    expect(sql).toContain("1-888-319-1332");
    expect(sql).toContain("833-667-8263");
    expect(sql).toContain("05/26/2026");
    expect(sql).toContain("min_cov_a:100000");
    expect(sql).toContain("NPC-0577FL 02/22");
    expect(sql).toContain("1-877-877-7907");
    expect(sql).toContain("V0426");
    expect(sql).toContain("June 15, 2026");
    expect(sql).not.toContain("min_cov_a:500000");
    expect(sql).not.toContain("southern_oak");
    expect(sql).not.toContain(SOUTHERN_OAK_CARRIER_ID);
    expect(sql).not.toMatch(/UPDATE carriers[\s\S]*southern oak/i);
    expect(sql).toMatch(/ON CONFLICT \(tenant_id, carrier_id\) DO UPDATE/);
  });
});
