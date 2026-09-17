import { describe, expect, it } from "vitest";
import { generateContactOpportunities, linesForLifeEvent } from "./opportunities";

function policy(partial: { id: string; status?: string; lineOfBusiness?: string }) {
  return {
    id: partial.id,
    status: partial.status ?? "active",
    lineOfBusiness: partial.lineOfBusiness ?? "HO",
    policyNumber: partial.id.toUpperCase(),
  };
}

describe("generateContactOpportunities", () => {
  it("maps life events onto review lines", () => {
    expect(linesForLifeEvent("New Home Purchase")).toEqual(["HO", "FLOOD", "UMBRELLA"]);
    expect(linesForLifeEvent("Marriage")).toEqual(["UMBRELLA", "LIFE"]);
  });

  it("shows flood and umbrella when home is with us and auto is with another carrier", () => {
    const rows = generateContactOpportunities({
      policies: [policy({ id: "ho", lineOfBusiness: "HO3" })],
      declaredCoverage: [{ line: "AUTO", carrierOfRecord: "other" }],
      partyName: "Rosa Castellanos",
    });
    expect(rows.map((row) => row.line)).toEqual(["FLOOD", "UMBRELLA"]);
    expect(rows.every((row) => row.reason === "gap")).toBe(true);
    expect(rows.some((row) => row.line === "HO" || row.line === "AUTO")).toBe(false);
  });

  it("does not invent missing homeowners when HO is with another carrier", () => {
    const rows = generateContactOpportunities({
      policies: [policy({ id: "pa", lineOfBusiness: "AUTO" })],
      declaredCoverage: [{ line: "HO", carrierOfRecord: "other" }],
      partyName: "Rosa Castellanos",
    });
    expect(rows.map((row) => row.line)).not.toContain("HO");
    expect(rows.map((row) => row.line)).not.toContain("AUTO");
    expect(rows.map((row) => row.line)).toEqual(["FLOOD", "UMBRELLA"]);
  });

  it("adds life-event lines only when the household is not already covered", () => {
    const rows = generateContactOpportunities({
      policies: [policy({ id: "ho", lineOfBusiness: "HO3" })],
      declaredCoverage: [{ line: "AUTO", carrierOfRecord: "other" }],
      recentLifeEvents: "New Home Purchase,Marriage",
      partyName: "Rosa Castellanos",
    });
    expect(rows.map((row) => row.line)).toEqual(["FLOOD", "UMBRELLA", "LIFE"]);
    expect(rows.find((row) => row.line === "LIFE")?.reason).toBe("life_event");
    expect(rows.find((row) => row.line === "HO")).toBeUndefined();
  });

  it("does not treat a leftover us mark on the field as coverage with us", () => {
    const rows = generateContactOpportunities({
      policies: [],
      declaredCoverage: [{ line: "HO", carrierOfRecord: "us" }],
      partyName: "Shop only",
    });
    expect(rows.map((row) => row.line)).not.toContain("FLOOD");
    expect(rows).toEqual([]);
  });
});
