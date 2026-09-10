import { describe, expect, it } from "vitest";
import { blankSheetWithDefaults, fieldsForLine } from "./catalog";
import {
  FLOOD_SHEET_EMPTY_DEFAULTS,
  YES_NO_OPTIONS,
  floodEffectiveDateDefault,
  formatFloodSheetDate,
  emptyDefaultsForLine,
} from "./sheet-defaults";

describe("sep7jo Flood prior_flood_losses + quote reason + effective date", () => {
  it("fieldsForLine(flood) includes prior_flood_losses Yes/No in Loss history", () => {
    const fields = fieldsForLine("flood");
    const prior = fields.find((f) => f.key === "prior_flood_losses");
    expect(prior).toBeTruthy();
    expect(prior?.label).toMatch(/prior flood losses/i);
    expect(prior?.group).toBe("Loss history");
    expect(prior?.input).toBe("select");
    expect(prior?.options).toEqual([...YES_NO_OPTIONS]);
  
  it("fieldsForLine(flood) includes purchase/prior-owner NFIP Yes/No", () => {
    const fields = fieldsForLine("flood");
    const buy = fields.find((f) => f.key === "purchased_within_last_year");
    const prior = fields.find((f) => f.key === "prior_owner_nfip_at_closing");
    expect(buy?.group).toBe("Loss history");
    expect(prior?.group).toBe("Loss history");
    expect(buy?.options).toEqual([...YES_NO_OPTIONS]);
    expect(prior?.options).toEqual([...YES_NO_OPTIONS]);
  });
});

  it("fieldsForLine(flood) includes flood_quote_reason picklist", () => {
    const fields = fieldsForLine("flood");
    const reason = fields.find((f) => f.key === "flood_quote_reason");
    expect(reason).toBeTruthy();
    expect(reason?.group).toBe("Current policy");
    expect(reason?.options).toEqual([
      "Shopping / comparison",
      "New purchase",
      "No current flood — shopping",
      "Other",
    ]);
  });

  it("fieldsForLine(flood) includes effective_date and effective_date_type", () => {
    const fields = fieldsForLine("flood");
    expect(fields.find((f) => f.key === "effective_date")?.label).toMatch(/30 days/);
    const typ = fields.find((f) => f.key === "effective_date_type");
    expect(typ?.options).toEqual(["New business", "Renewal", "Rewrite", "Other"]);
  });

  it("does not static-default prior_flood_losses / flood_quote_reason on FLOOD_SHEET_EMPTY_DEFAULTS", () => {
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.prior_flood_losses).toBeUndefined();
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.flood_quote_reason).toBeUndefined();
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.effective_date).toBeUndefined();
  });

  it("floodEffectiveDateDefault is application + 30 days; skips new house / under construction", () => {
    const app = new Date(2026, 8, 11); // Sep 11, 2026 local
    const normal = floodEffectiveDateDefault({ applicationDay: app });
    expect(normal.effective_date).toBe("10/11/2026");
    expect(normal.effective_date_type).toBe("New business");
    expect(floodEffectiveDateDefault({ applicationDay: app, underConstruction: "yes" })).toEqual({});
    expect(floodEffectiveDateDefault({ applicationDay: app, isNewHouse: true })).toEqual({});
  });

  it("emptyDefaultsForLine(flood) includes computed effective_date when under_construction default is no", () => {
    const d = emptyDefaultsForLine("flood");
    expect(d.under_construction).toBe("no");
    expect(d.effective_date).toBeTruthy();
    expect(d.effective_date_type).toBe("New business");
    const blank = blankSheetWithDefaults("flood");
    expect(blank.effective_date.value).toBe(d.effective_date);
  });

  it("fieldsForLine(flood) includes purchase/prior-owner NFIP Yes/No", () => {
    const fields = fieldsForLine("flood");
    const buy = fields.find((f) => f.key === "purchased_within_last_year");
    const prior = fields.find((f) => f.key === "prior_owner_nfip_at_closing");
    expect(buy?.group).toBe("Loss history");
    expect(prior?.group).toBe("Loss history");
    expect(buy?.options).toEqual([...YES_NO_OPTIONS]);
    expect(prior?.options).toEqual([...YES_NO_OPTIONS]);
  });
});
