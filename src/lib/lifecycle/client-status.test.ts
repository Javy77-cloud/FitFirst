import { describe, expect, it } from "vitest";
import { clientStatusFromCounts, countPolicies, isInForcePolicyStatus } from "./client-status";
import { buildQuoteResultsNote, sortQuotesCheapestFirst } from "./quote-results";
import { emptySheetValues, fillSheetBlanks } from "./quote-sheet";

describe("client status", () => {
  it("is Client when any related policy is Active, Bound, or Pending", () => {
    expect(clientStatusFromCounts(2, 1)).toBe("client");
    expect(isInForcePolicyStatus("bound")).toBe(true);
    expect(isInForcePolicyStatus("pending")).toBe(true);
    expect(isInForcePolicyStatus("active")).toBe(true);
  });

  it("is Former Client only after they once had a policy and now have zero in-force", () => {
    expect(clientStatusFromCounts(1, 0)).toBe("former_client");
    expect(countPolicies(["cancelled", "expired"]).status).toBe("former_client");
  });

  it("is not a client when they never had a policy (Ana shop)", () => {
    expect(clientStatusFromCounts(0, 0)).toBe("not_a_client");
    expect(countPolicies([]).status).toBe("not_a_client");
  });

  it("never treats a quote-only status as in-force", () => {
    expect(isInForcePolicyStatus("quote")).toBe(false);
    expect(isInForcePolicyStatus("quoted")).toBe(false);
  });
});

describe("quote results note", () => {
  it("ranks cheapest first and says quotes are not policies", () => {
    const note = buildQuoteResultsNote([
      { carrierName: "Tailrow", premium: "3120", bindable: true },
      { carrierName: "American Integrity", premium: "2840", bindable: true },
    ]);
    expect(note.startsWith("1. American Integrity")).toBe(false);
    expect(note).toContain("1. American Integrity · $2,840 · bindable");
    expect(note).toContain("2. Tailrow · $3,120 · bindable");
    expect(note).toContain("none of them is a policy");
  });

  it("sorts missing premiums last", () => {
    const ranked = sortQuotesCheapestFirst([
      { carrierName: "Unknown", premium: null, bindable: false },
      { carrierName: "Cheap", premium: 100, bindable: true },
    ]);
    expect(ranked[0].carrierName).toBe("Cheap");
  });
});

describe("quote sheet blanks-only fill", () => {
  it("fills missing keys and never overwrites javy / agent values", () => {
    const current = emptySheetValues();
    current.coverage_a = { value: "321000", status: "confirmed", source: "javy" };
    current.city = { value: "Palm Bay", status: "confirmed", source: "agent" };
    const result = fillSheetBlanks(current, [
      { fieldKey: "coverage_a", normalizedValue: "999999", confidence: 0.99, flagged: false },
      { fieldKey: "city", normalizedValue: "Melbourne", confidence: 0.99, flagged: false },
      { fieldKey: "year_built", normalizedValue: "2014", confidence: 0.94, flagged: false },
      { fieldKey: "roof_covering", normalizedValue: "shingle", confidence: 0.5, flagged: true },
    ]);
    expect(result.values.coverage_a.value).toBe("321000");
    expect(result.values.city.value).toBe("Palm Bay");
    expect(result.values.year_built).toEqual({
      value: "2014",
      status: "confirmed",
      source: "extracted",
    });
    expect(result.values.roof_covering.status).toBe("check");
    expect(result.skippedKeys).toEqual(expect.arrayContaining(["coverage_a", "city"]));
  });
});
