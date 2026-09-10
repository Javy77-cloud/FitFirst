import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import { FLOOD_SHEET_EMPTY_DEFAULTS, YES_NO_OPTIONS } from "./sheet-defaults";

describe("sep7jo Flood prior_flood_losses + quote reason + effective date", () => {
  it("fieldsForLine(flood) includes prior_flood_losses Yes/No in Loss history", () => {
    const fields = fieldsForLine("flood");
    const prior = fields.find((f) => f.key === "prior_flood_losses");
    expect(prior).toBeTruthy();
    expect(prior?.label).toMatch(/prior flood losses/i);
    expect(prior?.group).toBe("Loss history");
    expect(prior?.input).toBe("select");
    expect(prior?.options).toEqual([...YES_NO_OPTIONS]);
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
    expect(fields.find((f) => f.key === "effective_date")?.group).toBe("Current policy");
    const typ = fields.find((f) => f.key === "effective_date_type");
    expect(typ?.options).toEqual(["New business", "Renewal", "Rewrite", "Other"]);
  });

  it("does not default prior_flood_losses / flood_quote_reason / effective_date", () => {
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.prior_flood_losses).toBeUndefined();
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.flood_quote_reason).toBeUndefined();
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.effective_date).toBeUndefined();
  });
});
