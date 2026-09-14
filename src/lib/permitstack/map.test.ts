import { describe, expect, it } from "vitest";
import { applyPropertyRecordsToSheet } from "@/lib/florida-property/apply";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { factsFromPermitHistory, yearFromPermitDate } from "./map";

describe("PermitStack history mapping", () => {
  it("maps roofing / HVAC signals and water-heater plumbing to CHECK years", () => {
    const facts = factsFromPermitHistory({
      found: true,
      total_matches: 4,
      summary: {
        signals: {
          has_roofing: true,
          last_roofing_date: "2021-06-15",
          has_hvac: true,
          last_hvac_date: "2019-03-02",
          has_plumbing: true,
        },
      },
      permits: [
        {
          category: "PLUMBING",
          description_raw: "Replace 50-gal water heater",
          date_issued: "2018-11-04",
        },
      ],
    });
    expect(facts.find((f) => f.sheetKey === "roof_year")).toMatchObject({
      value: "2021",
      sourceLabel: "PermitStack",
      kind: "permit",
    });
    expect(facts.find((f) => f.sheetKey === "hvac_year")?.value).toBe("2019");
    expect(facts.find((f) => f.sheetKey === "water_heater_year")?.value).toBe("2018");
  });

  it("skips ambiguous plumbing / mechanical and cancelled roofing", () => {
    const facts = factsFromPermitHistory({
      found: true,
      summary: { signals: { has_plumbing: true, has_roofing: false, has_hvac: false } },
      permits: [
        {
          category: "PLUMBING",
          description_raw: "Repair kitchen sink drain",
          date_issued: "2020-01-01",
        },
        {
          category: "MECHANICAL",
          description_raw: "Elevator modernization",
          date_issued: "2022-05-01",
        },
        {
          category: "ROOFING",
          status: "Cancelled",
          date_issued: "2023-08-01",
        },
      ],
    });
    expect(facts).toEqual([]);
  });

  it("uses HVAC category and mechanical+HVAC description when signals are absent", () => {
    const facts = factsFromPermitHistory({
      found: true,
      permits: [
        { category: "HVAC", date_completed: "2016-04-20" },
        {
          category: "MECHANICAL",
          description_raw: "Install new heat pump condenser",
          date_issued: "2014-09-12",
        },
        { category: "ROOFING", date_filed: "2017-01-30" },
      ],
    });
    expect(facts.find((f) => f.sheetKey === "hvac_year")?.value).toBe("2016");
    expect(facts.find((f) => f.sheetKey === "roof_year")?.value).toBe("2017");
  });

  it("returns nothing when found is false or payload is empty", () => {
    expect(factsFromPermitHistory({ found: false, permits: [{ category: "ROOFING", date_issued: "2020-01-01" }] })).toEqual(
      [],
    );
    expect(factsFromPermitHistory(null)).toEqual([]);
    expect(factsFromPermitHistory({})).toEqual([]);
  });

  it("applies years as CHECK empty-only and never overwrites confirmed", () => {
    const facts = factsFromPermitHistory({
      found: true,
      summary: { signals: { has_roofing: true, last_roofing_date: "2021-06-15", has_hvac: true, last_hvac_date: "2019-03-02" } },
      permits: [{ category: "PLUMBING", description_raw: "water heater", date_issued: "2018-01-01" }],
    });
    const existing = emptySheetValues("home");
    existing.roof_year = { value: "2010", status: "confirmed", source: "agent" };
    const result = applyPropertyRecordsToSheet("home", existing, facts);
    expect(result.values.roof_year.value).toBe("2010");
    expect(result.skippedKeys).toContain("roof_year");
    expect(result.values.hvac_year.value).toBe("2019");
    expect(result.values.hvac_year.status).toBe("check");
    expect(result.values.hvac_year.sourceLabel).toBe("PermitStack");
    expect(result.values.water_heater_year.value).toBe("2018");
    expect(result.values.water_heater_year.status).toBe("check");
  });

  it("extracts a valid year and rejects out-of-range dates", () => {
    expect(yearFromPermitDate("2020-11-04T00:00:00Z")).toBe("2020");
    expect(yearFromPermitDate(1578009600000)).toBe("2020");
    expect(yearFromPermitDate("1840-01-01")).toBe("");
    expect(yearFromPermitDate("not-a-date")).toBe("");
  });
});
