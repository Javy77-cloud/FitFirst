import { describe, expect, it } from "vitest";
import { blankSheetWithDefaults, fieldsForLine, groupFields } from "./catalog";
import {
  applyMasterSheetDefaults,
  emptyDefaultsForLine,
  FLOOD_SHEET_EMPTY_DEFAULTS,
  MASTER_SHEET_EMPTY_DEFAULTS,
  YES_NO_OPTIONS,
} from "./sheet-defaults";

describe("sep7jn Flood coverage defaults + paired Coverages layout", () => {
  it("FLOOD_SHEET_EMPTY_DEFAULTS: construction flags, enclosure, limits, deductibles, has_nfip", () => {
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.under_construction).toBe("no");
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.over_water).toBe("no");
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.substantially_improved).toBe("no");
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.enclosure_present).toBe("no");
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.building_limit).toBe("250000");
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.contents_limit).toBe("100000");
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.building_deductible).toBe("1000");
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.contents_deductible).toBe("1000");
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.has_nfip).toBe("no");
    // Shared master defaults must not own flood coverage limits (BOP/home pollution).
    expect(MASTER_SHEET_EMPTY_DEFAULTS.building_limit).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.contents_limit).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.has_nfip).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.enclosure_present).toBeUndefined();
  });

  it("emptyDefaultsForLine(flood) returns flood map; other lines empty", () => {
    const flood = emptyDefaultsForLine("flood");
    expect(flood).toMatchObject(FLOOD_SHEET_EMPTY_DEFAULTS);
    expect(flood.effective_date).toBeTruthy();
    expect(flood.effective_date_type).toBe("New business");
    expect(emptyDefaultsForLine("home")).toEqual({});
    expect(emptyDefaultsForLine("auto")).toEqual({});
  });

  it("blank flood sheet gets flood defaults; leaves nfip_policy/current_carrier blank", () => {
    const values = blankSheetWithDefaults("flood");
    expect(values.under_construction.value).toBe("no");
    expect(values.over_water.value).toBe("no");
    expect(values.substantially_improved.value).toBe("no");
    expect(values.enclosure_present.value).toBe("no");
    expect(values.building_limit.value).toBe("250000");
    expect(values.contents_limit.value).toBe("100000");
    expect(values.building_deductible.value).toBe("1000");
    expect(values.contents_deductible.value).toBe("1000");
    expect(values.has_nfip.value).toBe("no");
    expect(values.has_nfip.sourceLabel).toBe("default");
    expect(values.nfip_policy.value).toBe("");
    expect(values.current_carrier.value).toBe("");
  });

  it("flood defaults are empty-only (do not wipe seeded building_limit)", () => {
    const applied = applyMasterSheetDefaults(
      {
        building_limit: {
          value: "310097",
          status: "check",
          source: "agent",
          sourceLabel: "home-seed",
        },
        contents_limit: { value: "", status: "missing", source: "blank" },
        enclosure_present: { value: "", status: "missing", source: "blank" },
      },
      emptyDefaultsForLine("flood"),
    );
    expect(applied.values.building_limit.value).toBe("310097");
    expect(applied.values.contents_limit.value).toBe("100000");
    expect(applied.values.enclosure_present.value).toBe("no");
    expect(applied.filledKeys).not.toContain("building_limit");
    expect(applied.filledKeys).toEqual(
      expect.arrayContaining(["contents_limit", "enclosure_present"]),
    );
  });

  it("Coverages group order pairs limits then deductibles (2-col grid)", () => {
    const fields = fieldsForLine("flood");
    const coverages = fields.filter((f) => f.group === "Coverages").map((f) => f.key);
    expect(coverages.slice(0, 4)).toEqual([
      "building_limit",
      "contents_limit",
      "building_deductible",
      "contents_deductible",
    ]);
    expect(coverages).toContain("coverage_a");
    expect(fields.find((f) => f.key === "building_limit")?.label).toBe("Building coverage");
    expect(fields.find((f) => f.key === "contents_limit")?.label).toBe("Contents coverage");
    expect(fields.find((f) => f.key === "building_deductible")?.input).toBe("select");
    expect(fields.find((f) => f.key === "contents_deductible")?.input).toBe("select");
    expect(fields.find((f) => f.key === "building_deductible")?.options).toContain("1000");
    expect(fields.find((f) => f.key === "has_nfip")?.group).toBe("Current policy");
    expect(fields.find((f) => f.key === "has_nfip")?.options).toEqual([...YES_NO_OPTIONS]);

    const groups = groupFields("flood");
    const covGroup = groups.find((g) => g.group === "Coverages");
    expect(covGroup?.fields.map((f) => f.key).slice(0, 4)).toEqual([
      "building_limit",
      "contents_limit",
      "building_deductible",
      "contents_deductible",
    ]);
  });

  it("home blank sheet does not pick up flood coverage defaults", () => {
    const home = blankSheetWithDefaults("home");
    expect(home.building_limit).toBeUndefined();
    expect(home.has_nfip).toBeUndefined();
    expect(home.enclosure_present).toBeUndefined();
  });
});
