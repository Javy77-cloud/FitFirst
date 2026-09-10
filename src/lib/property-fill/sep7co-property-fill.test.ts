import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fieldsForLine } from "@/lib/quote-sheet/catalog";
import { mergePropertyFillFacts, toastForPropertyFill } from "./merge";
import { wiredCountyIds } from "./counties/registry";
import { factsFromLeeCountyPa } from "./counties/lee";
import { factsFromFemaNfhl } from "./fema";
import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { applyPropertyRecordsToSheet } from "@/lib/florida-property/apply";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7co Fill property records = GetParcel + County PA + FEMA", () => {
  it("keeps a single master Fill button and orchestrates free APIs", () => {
    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    expect(sheet).toMatch(/MasterSheetFillButton/);
    expect(sheet.match(/MasterSheetFillButton/g)?.length).toBeGreaterThanOrEqual(1);
    expect(sheet.match(/<MasterSheetFillButton/g)?.length).toBe(1);
    const action = source("src/app/actions/quote-sheet.ts");
    expect(action).toMatch(/orchestratePropertyFill/);
    expect(action).toMatch(/toastForPropertyFill/);
    expect(action).toMatch(/runFillFromPropertyRecords/);
    expect(action).not.toMatch(/Fill from FEMA/);
    expect(action).not.toMatch(/Fill from county/);
  });

  it("exposes catalog keys for widened parcel + FIRM fields", () => {
    const home = fieldsForLine("home", "homeowners");
    const keys = home.map((f) => f.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "acres",
        "living_units",
        "square_feet",
        "year_effective",
        "land_value",
        "improvement_value",
        "sale_price",
        "homestead",
        "zoning",
        "land_use",
        "assessment_year",
        "firm_panel",
        "firm_effective_date",
        "bfe",
        "flood_zone",
      ]),
    );
  });

  it("wires Lee / Hillsborough / Orange free PA adapters", () => {
    expect(wiredCountyIds()).toEqual(expect.arrayContaining(["lee", "hillsborough", "orange"]));
  });

  it("merges GetParcel → County PA → FloodZoneMap → FEMA empty-only (FZM wins flood_zone)", () => {
    const gpd: PropertyRecordsFact[] = [
      { fieldKey: "flood_zone", sheetKey: "flood_zone", value: "X", sourceLabel: "property records", kind: "county" },
      { fieldKey: "acres", sheetKey: "acres", value: "0.3", sourceLabel: "property records", kind: "county" },
    ];
    const county: PropertyRecordsFact[] = [
      { fieldKey: "beds", sheetKey: "beds", value: "3", sourceLabel: "county PA", kind: "county" },
      { fieldKey: "square_feet", sheetKey: "square_feet", value: "1224", sourceLabel: "county PA", kind: "county" },
    ];
    const fzm: PropertyRecordsFact[] = [
      { fieldKey: "flood_zone", sheetKey: "flood_zone", value: "AE", sourceLabel: "FloodZoneMap", kind: "fema" },
      { fieldKey: "bfe", sheetKey: "bfe", value: "6", sourceLabel: "FloodZoneMap", kind: "fema" },
    ];
    const fema: PropertyRecordsFact[] = [
      { fieldKey: "flood_zone", sheetKey: "flood_zone", value: "VE", sourceLabel: "FEMA", kind: "fema" },
      { fieldKey: "firm_panel", sheetKey: "firm_panel", value: "12071C0581F", sourceLabel: "FEMA", kind: "fema" },
    ];
    const { facts, sourcesUsed } = mergePropertyFillFacts({
      getParcel: gpd,
      countyPa: county,
      floodZoneMap: fzm,
      fema,
    });
    expect(sourcesUsed).toEqual(["property-records", "county-pa", "floodzonemap", "fema"]);
    expect(facts.find((f) => f.sheetKey === "flood_zone")?.value).toBe("AE");
    expect(facts.find((f) => f.sheetKey === "flood_zone")?.sourceLabel).toBe("FloodZoneMap");
    expect(facts.find((f) => f.sheetKey === "firm_panel")?.value).toBe("12071C0581F");
    expect(facts.find((f) => f.sheetKey === "firm_panel")?.sourceLabel).toBe("FEMA");
    expect(facts.find((f) => f.sheetKey === "beds")?.value).toBe("3");
    expect(facts.find((f) => f.sheetKey === "acres")?.value).toBe("0.3");
    expect(toastForPropertyFill({ filledCount: 5, sourcesUsed })).toMatch(/county PA/);
    expect(toastForPropertyFill({ filledCount: 5, sourcesUsed })).toMatch(/FloodZoneMap/);
    expect(toastForPropertyFill({ filledCount: 5, sourcesUsed })).toMatch(/FEMA/);
  });

  it("maps Lee PA Cypress Point house fields from ArcGIS attrs", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        features: [
          {
            attributes: {
              SITEADDR: "18025 CYPRESS POINT RD",
              STRAP: "17462514000020270",
              BEDROOMS: 3,
              BATHROOMS: 2,
              HEATEDAREA: 1224,
              MAXSTORIES: 1,
              GARAGE: "Y",
              POOL: null,
              GISACRES: 0.303,
              MAXBUILTY: 1978,
              JUST: 218997,
              LAND: 99426,
              BUILDING: 117171,
              LANDUSEDES: "SINGLE FAMILY RESIDENTIAL, GOLF COURSE",
              O_NAME: "CASTELLANOS ROSA L &",
              S_1AMOUNT: 325000,
              S_1DATE: 1646370000000,
            },
          },
        ],
      }),
    }));
    const facts = await factsFromLeeCountyPa(
      { address1: "18025 Cypress Point Rd", city: "Fort Myers", state: "FL", zip: "33967", county: "Lee" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(facts.find((f) => f.sheetKey === "beds")?.value).toBe("3");
    expect(facts.find((f) => f.sheetKey === "baths")?.value).toBe("2");
    expect(facts.find((f) => f.sheetKey === "square_feet")?.value).toBe("1224");
    expect(facts.find((f) => f.sheetKey === "stories")?.value).toBe("1");
    expect(facts.find((f) => f.sheetKey === "garage_type")?.value).toBe("garage");
    expect(facts.find((f) => f.sheetKey === "acres")?.value).toBe("0.303");
    expect(facts.find((f) => f.sheetKey === "improvement_value")?.value).toBe("117171");
    expect(facts.every((f) => f.sourceLabel === "county PA")).toBe(true);
    expect(facts.some((f) => f.sheetKey === "coverage_a")).toBe(false);
  });

  it("Lee OUT_FIELDS uses BUILDING not invalid BLDG", () => {
    const lee = source("src/lib/property-fill/counties/lee.ts");
    expect(lee).toMatch(/"BUILDING"/);
    expect(lee).not.toMatch(/"BLDG"/);
    expect(lee).toMatch(/attrString\(attrs, \["BUILDING"\]\)/);
  });

  it("queryArcgis soft-fails invalid outFields and retries with *", async () => {
    const { queryArcgis } = await import("./arcgis");
    let calls = 0;
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      calls += 1;
      const body = String(init?.body ?? "");
      if (calls === 1) {
        expect(body).toContain("outFields=BLDG");
        return {
          ok: true,
          status: 200,
          json: async () => ({ error: { code: 400, message: "Failed to execute query." } }),
        };
      }
      expect(body.includes("outFields=*") || body.includes("outFields=%2A")).toBe(true);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          features: [{ attributes: { BEDROOMS: 3, BATHROOMS: 2, HEATEDAREA: 1224 } }],
        }),
      };
    });
    const features = await queryArcgis(
      "https://example.test/query",
      { where: "1=1", outFields: "BLDG", f: "json" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(calls).toBe(2);
    expect(features[0]?.attributes.BEDROOMS).toBe(3);
  });

  it("live smoke: Lee PA Cypress Point returns beds/baths/sqft/stories/garage", async () => {
    const facts = await factsFromLeeCountyPa({
      address1: "18025 Cypress Point Rd",
      city: "Fort Myers",
      state: "FL",
      zip: "33967",
      county: "Lee",
    });
    expect(facts.find((f) => f.sheetKey === "beds")?.value).toBe("3");
    expect(facts.find((f) => f.sheetKey === "baths")?.value).toBe("2");
    expect(facts.find((f) => f.sheetKey === "square_feet")?.value).toBe("1224");
    expect(facts.find((f) => f.sheetKey === "stories")?.value).toBe("1");
    expect(facts.find((f) => f.sheetKey === "garage_type")?.value).toBe("garage");
    expect(facts.find((f) => f.sheetKey === "improvement_value")?.value).toBe("117171");
  }, 20000);

  it("maps FEMA NFHL zone + FIRM panel", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/28/query")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            features: [{ attributes: { FLD_ZONE: "AE", SFHA_TF: "T", STATIC_BFE: -9999 } }],
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          features: [{ attributes: { FIRM_PAN: "12071C0581F", EFF_DATE: 1219881600000 } }],
        }),
      };
    });
    const facts = await factsFromFemaNfhl(26.485, -81.807, fetchImpl as unknown as typeof fetch);
    expect(facts.find((f) => f.sheetKey === "flood_zone")?.value).toBe("AE");
    expect(facts.find((f) => f.sheetKey === "firm_panel")?.value).toBe("12071C0581F");
    expect(facts.find((f) => f.sheetKey === "firm_effective_date")?.value).toMatch(/^2008-/);
    expect(facts.find((f) => f.sheetKey === "bfe")).toBeUndefined();
    expect(facts.every((f) => f.sourceLabel === "FEMA")).toBe(true);
  });

  it("firm_panel can fill when flood_zone already set (empty-only per key)", () => {
    const existing = emptySheetValues("home");
    existing.flood_zone = { value: "X", status: "confirmed", source: "agent", sourceLabel: "agent" };
    const facts: PropertyRecordsFact[] = [
      { fieldKey: "flood_zone", sheetKey: "flood_zone", value: "AE", sourceLabel: "FEMA", kind: "fema" },
      { fieldKey: "firm_panel", sheetKey: "firm_panel", value: "12071C0581F", sourceLabel: "FEMA", kind: "fema" },
      { fieldKey: "firm_effective_date", sheetKey: "firm_effective_date", value: "2008-08-28", sourceLabel: "FEMA", kind: "fema" },
    ];
    const result = applyPropertyRecordsToSheet("home", existing, facts);
    expect(result.values.flood_zone.value).toBe("X");
    expect(result.skippedKeys).toContain("flood_zone");
    expect(result.values.firm_panel.value).toBe("12071C0581F");
    expect(result.values.firm_effective_date.value).toBe("2008-08-28");
    expect(result.filledKeys).toEqual(expect.arrayContaining(["firm_panel", "firm_effective_date"]));
  });
});
