import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import { FLOOD_SHEET_EMPTY_DEFAULTS, YES_NO_OPTIONS } from "./sheet-defaults";

describe("sep7jo Flood prior_flood_losses + quote reason", () => {
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

  it("does not default prior_flood_losses or flood_quote_reason on blank flood sheets", () => {
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.prior_flood_losses).toBeUndefined();
    expect(FLOOD_SHEET_EMPTY_DEFAULTS.flood_quote_reason).toBeUndefined();
  });
});
