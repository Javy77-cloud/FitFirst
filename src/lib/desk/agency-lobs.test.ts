import { describe, expect, it } from "vitest";
import { DEAL_PRODUCT_DEFS } from "@/lib/deals/deal-products";
import {
  DEFAULT_AGENCY_LOBS,
  agencyLobFamilyCounts,
  canonicalizeLobCode,
  familyHiddenByWriteToggles,
  findAgencyLobOrphans,
  labelForLobCode,
  resolveAgencyLobCode,
  slugifyAgencyLob,
  uniqueLobCodes,
  visibleAgencyLobs,
  visibleDealProductIds,
  withBuiltInErrorsOmissions,
} from "./agency-lobs";

describe("agency master Lines of Business", () => {
  it("seeds one catalog row per deal product", () => {
    expect(DEFAULT_AGENCY_LOBS).toHaveLength(DEAL_PRODUCT_DEFS.length);
    expect(DEFAULT_AGENCY_LOBS.map((row) => row.productId)).toEqual(
      DEAL_PRODUCT_DEFS.map((row) => row.id),
    );
    expect(DEFAULT_AGENCY_LOBS.every((row) => row.active && row.builtIn)).toBe(true);
    const withoutEo = DEFAULT_AGENCY_LOBS.filter((row) => row.productId !== "eo");
    const merged = withBuiltInErrorsOmissions(withoutEo);
    expect(merged.filter((row) => row.productId === "eo")).toHaveLength(1);
    expect(merged.find((row) => row.productId === "eo")).toMatchObject({
      label: "E&O",
      lobCode: "GL",
      quotingForm: "Errors & Omissions",
    });
    expect(withBuiltInErrorsOmissions(merged)).toHaveLength(merged.length);
    expect(withoutEo.map((row) => row.productId)).toEqual(
      merged.filter((row) => row.productId !== "eo").map((row) => row.productId),
    );
  });

  it("hides Life / Health families when the agency does not write them", () => {
    const hidden = { writeLife: false, writeHealth: false };
    expect(familyHiddenByWriteToggles("life", hidden)).toBe(true);
    expect(familyHiddenByWriteToggles("health", hidden)).toBe(true);
    expect(familyHiddenByWriteToggles("personal", hidden)).toBe(false);
    const visible = visibleAgencyLobs(DEFAULT_AGENCY_LOBS, hidden);
    expect(visible.some((row) => row.family === "life" || row.family === "health")).toBe(false);
    expect(visibleDealProductIds(DEFAULT_AGENCY_LOBS, hidden)).toEqual(
      expect.arrayContaining(["homeowners", "auto", "flood", "gl"]),
    );
    expect(visibleDealProductIds(DEFAULT_AGENCY_LOBS, hidden)).not.toContain("life_term");
  });

  it("drops inactive rows unless includeInactive is set", () => {
    const rows = DEFAULT_AGENCY_LOBS.map((row) =>
      row.productId === "boat" ? { ...row, active: false } : row,
    );
    const settings = { writeLife: true, writeHealth: true };
    expect(visibleAgencyLobs(rows, settings).some((row) => row.productId === "boat")).toBe(false);
    expect(
      visibleAgencyLobs(rows, settings, { includeInactive: true }).some((row) => row.productId === "boat"),
    ).toBe(true);
  });

  it("dedupes policy/form LOB codes and keeps the first label", () => {
    expect(uniqueLobCodes(DEFAULT_AGENCY_LOBS)).toEqual(
      expect.arrayContaining(["HO", "AUTO", "FLOOD", "LIFE", "HEALTH", "GL", "WC"]),
    );
    expect(labelForLobCode(DEFAULT_AGENCY_LOBS, "HO")).toBe("Home (HO)");
    expect(labelForLobCode(DEFAULT_AGENCY_LOBS, "AUTO")).toBe("Auto");
  });

  it("slugifies custom labels for product ids", () => {
    expect(slugifyAgencyLob("Inland Marine")).toBe("inland_marine");
    expect(slugifyAgencyLob("  ")).toBe("line");
  });

  it("maps form codes and free-text onto the master catalog without dropping unknowns", () => {
    expect(resolveAgencyLobCode("HO3", DEFAULT_AGENCY_LOBS)).toBe("HO");
    expect(resolveAgencyLobCode("DP", DEFAULT_AGENCY_LOBS)).toBe("HO");
    expect(resolveAgencyLobCode("PA", DEFAULT_AGENCY_LOBS)).toBe("AUTO");
    expect(resolveAgencyLobCode("landlord", DEFAULT_AGENCY_LOBS)).toBe("HO");
    expect(canonicalizeLobCode("Cyber", DEFAULT_AGENCY_LOBS)).toBe("Cyber");
    expect(findAgencyLobOrphans(["HO", "DP", "Cyber", "PA"], DEFAULT_AGENCY_LOBS)).toEqual([
      { raw: "Cyber", count: 1 },
    ]);
  });

  it("counts active families for the settings chips", () => {
    const counts = agencyLobFamilyCounts(DEFAULT_AGENCY_LOBS);
    expect(counts.personal).toBeGreaterThan(0);
    expect(counts.commercial).toBeGreaterThan(0);
    expect(counts.life).toBeGreaterThan(0);
    expect(counts.health).toBeGreaterThan(0);
    expect(counts.hidden).toBe(0);
  });
});
