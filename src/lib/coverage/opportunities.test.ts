import { describe, expect, it } from "vitest";
import {
  dependentsNearingAutoAge,
  generateContactOpportunities,
  linesForLifeEvent,
  occupationSuggestsProfessional,
} from "./opportunities";

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
    const lines = rows.filter((row) => row.reason === "gap").map((row) => row.line);
    expect(lines).toEqual(["FLOOD", "UMBRELLA"]);
    expect(rows.some((row) => row.line === "HO" || (row.line === "AUTO" && row.reason === "gap"))).toBe(
      false,
    );
    // Elsewhere auto surfaces as rewrite (bring in-house), not a missing-auto gap.
    expect(rows.some((row) => row.line === "AUTO" && row.reason === "rewrite")).toBe(true);
  });

  it("does not invent missing homeowners when HO is with another carrier", () => {
    const rows = generateContactOpportunities({
      policies: [policy({ id: "pa", lineOfBusiness: "AUTO" })],
      declaredCoverage: [{ line: "HO", carrierOfRecord: "other" }],
      partyName: "Rosa Castellanos",
    });
    expect(rows.filter((row) => row.reason === "gap").map((row) => row.line)).not.toContain("HO");
    expect(rows.filter((row) => row.reason === "gap").map((row) => row.line)).not.toContain("AUTO");
    expect(rows.filter((row) => row.reason === "gap").map((row) => row.line)).toEqual([
      "FLOOD",
      "UMBRELLA",
    ]);
  });

  it("adds life-event lines only when the household is not already covered", () => {
    const rows = generateContactOpportunities({
      policies: [policy({ id: "ho", lineOfBusiness: "HO3" })],
      declaredCoverage: [{ line: "AUTO", carrierOfRecord: "other" }],
      recentLifeEvents: "New Home Purchase,Marriage",
      partyName: "Rosa Castellanos",
    });
    expect(rows.map((row) => row.line)).toContain("LIFE");
    expect(rows.find((row) => row.line === "LIFE")?.reason).toBe("life_event");
    expect(rows.find((row) => row.line === "HO" && row.reason === "gap")).toBeUndefined();
  });

  it("does not treat a leftover us mark on the field as coverage with us", () => {
    const rows = generateContactOpportunities({
      policies: [],
      declaredCoverage: [{ line: "HO", carrierOfRecord: "us" }],
      partyName: "Shop only",
    });
    expect(rows.map((row) => row.line)).not.toContain("FLOOD");
    expect(rows.filter((row) => row.reason === "gap")).toEqual([]);
  });

  it("surfaces dependents nearing 16/18 as auto household opportunities", () => {
    expect(
      dependentsNearingAutoAge([
        { id: "1", name: "Maya", dobOrAge: "16", relation: "Child" },
        { id: "2", name: "Leo", dobOrAge: "10", relation: "Child" },
      ]),
    ).toEqual([{ name: "Maya", age: 16 }]);

    const rows = generateContactOpportunities({
      policies: [policy({ id: "ho", lineOfBusiness: "HO3" })],
      dependents: [{ id: "1", name: "Maya", dobOrAge: "16", relation: "Child" }],
      partyName: "Rosa Castellanos",
    });
    const auto = rows.find((row) => row.line === "AUTO" && row.reason === "household");
    expect(auto?.title).toMatch(/Maya/);
    expect(auto?.cta?.kind).toBe("start_deal");
  });

  it("suggests life when spouse is present without life coverage", () => {
    const rows = generateContactOpportunities({
      policies: [policy({ id: "ho", lineOfBusiness: "HO3" })],
      spouseName: "Carlos",
      partyName: "Rosa Castellanos",
    });
    expect(rows.find((row) => row.line === "LIFE" && row.reason === "household")?.detail).toMatch(
      /Carlos/,
    );
  });

  it("suggests professional liability from occupation when relevant", () => {
    expect(occupationSuggestsProfessional("Attorney")).toBe(true);
    const rows = generateContactOpportunities({
      policies: [policy({ id: "ho", lineOfBusiness: "HO3" })],
      occupation: "Attorney",
      partyName: "Rosa Castellanos",
    });
    expect(rows.some((row) => row.line === "GL" && row.reason === "household")).toBe(true);
  });

  it("chases elsewhere renewals inside ~90 days", () => {
    const asOf = new Date("2026-09-23T12:00:00");
    const rows = generateContactOpportunities({
      policies: [policy({ id: "ho", lineOfBusiness: "HO3" })],
      elsewhereCoverage: [
        {
          id: "e1",
          line: "AUTO",
          carrier: "Geico",
          renewalDate: "2026-10-15",
          roughPremium: "1600",
        },
      ],
      partyName: "Rosa Castellanos",
      asOf,
    });
    const renewal = rows.find((row) => row.reason === "renewal" && row.line === "AUTO");
    expect(renewal?.title).toMatch(/renews/i);
    expect(renewal?.detail).toMatch(/Geico/);
    expect(renewal?.cta?.kind).toBe("start_deal");
  });

  it("treats elsewhere JSONB rows as covered for gap rules", () => {
    const rows = generateContactOpportunities({
      policies: [policy({ id: "ho", lineOfBusiness: "HO3" })],
      elsewhereCoverage: [
        { id: "e1", line: "AUTO", carrier: "Geico", renewalDate: "", roughPremium: "" },
      ],
      partyName: "Rosa Castellanos",
    });
    expect(rows.filter((row) => row.reason === "gap").map((row) => row.line)).not.toContain("AUTO");
  });
});
