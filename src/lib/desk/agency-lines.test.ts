import { describe, expect, it } from "vitest";
import {
  DEFAULT_AGENCY_LINES,
  agencyLineFamilyCounts,
  agencyLineSelectOptions,
  canonicalizeLineCode,
  findAgencyLineOrphans,
  isKnownAgencyLine,
  parseAgencyLineFamily,
  requireAgencyLineCode,
  resolveAgencyLine,
  slugifyLineCode,
  visibleAgencyLines,
} from "./agency-lines";

describe("agency master LOB list", () => {
  it("seeds the same codes the desk already stores on deals and policies", () => {
    expect(DEFAULT_AGENCY_LINES.map((row) => row.code)).toEqual([
      "HO",
      "AUTO",
      "FLOOD",
      "UMBRELLA",
      "RV",
      "GL",
      "BOP",
      "WC",
      "LIFE",
      "HEALTH",
    ]);
  });

  it("maps form codes, products, and free-text onto the master list", () => {
    expect(resolveAgencyLine("HO3", DEFAULT_AGENCY_LINES)?.code).toBe("HO");
    expect(resolveAgencyLine("DP", DEFAULT_AGENCY_LINES)?.code).toBe("HO");
    expect(resolveAgencyLine("Landlord", DEFAULT_AGENCY_LINES)?.code).toBe("HO");
    expect(resolveAgencyLine("PA", DEFAULT_AGENCY_LINES)?.code).toBe("AUTO");
    expect(resolveAgencyLine("Commercial Auto", DEFAULT_AGENCY_LINES)?.code).toBe("AUTO");
    expect(resolveAgencyLine("Boat/Watercraft", DEFAULT_AGENCY_LINES)?.code).toBe("RV");
    expect(resolveAgencyLine("Workers' Comp", DEFAULT_AGENCY_LINES)?.code).toBe("WC");
    expect(resolveAgencyLine("Term Life", DEFAULT_AGENCY_LINES)?.code).toBe("LIFE");
    expect(resolveAgencyLine("Marketplace", DEFAULT_AGENCY_LINES)?.code).toBe("HEALTH");
    expect(canonicalizeLineCode("homeowners", DEFAULT_AGENCY_LINES)).toBe("HO");
  });

  it("keeps unknown values so migrate does not drop data", () => {
    expect(canonicalizeLineCode("Cyber", DEFAULT_AGENCY_LINES)).toBe("Cyber");
    expect(isKnownAgencyLine("Cyber", DEFAULT_AGENCY_LINES)).toBe(false);
    expect(requireAgencyLineCode("Cyber", DEFAULT_AGENCY_LINES)).toBe("HO");
    expect(requireAgencyLineCode("AUTO", DEFAULT_AGENCY_LINES)).toBe("AUTO");
  });

  it("hides Life / Health when the agency does not write those books", () => {
    const hidden = visibleAgencyLines(DEFAULT_AGENCY_LINES, { writeLife: false, writeHealth: false });
    expect(hidden.map((row) => row.code)).not.toContain("LIFE");
    expect(hidden.map((row) => row.code)).not.toContain("HEALTH");
    expect(hidden.map((row) => row.code)).toContain("HO");
  });

  it("flags orphans on the select and groups leftover free-text", () => {
    const options = agencyLineSelectOptions(DEFAULT_AGENCY_LINES, null, "Cyber");
    expect(options[0]).toMatchObject({ value: "Cyber", orphan: true });
    expect(findAgencyLineOrphans(["HO", "DP", "Cyber", "cyber", "PA"], DEFAULT_AGENCY_LINES)).toEqual(
      expect.arrayContaining([
        { raw: "Cyber", count: 1 },
        { raw: "cyber", count: 1 },
      ]),
    );
    expect(agencyLineFamilyCounts(DEFAULT_AGENCY_LINES)).toEqual({
      pc: 8,
      life: 1,
      health: 1,
      inactive: 0,
    });
    expect(slugifyLineCode("Inland Marine")).toBe("INLAND_MARINE");
    expect(parseAgencyLineFamily("life")).toBe("life");
    expect(parseAgencyLineFamily("nope")).toBe("pc");
  });
});
