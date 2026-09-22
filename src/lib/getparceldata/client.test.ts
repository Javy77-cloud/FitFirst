import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { searchGetParcelDataRecords } from "./client";
import { MISSING_KEY_MESSAGE, readGetParcelDataApiKey, getParcelDataKeyReady } from "./key";
import { GETPARCELDATA_POINT_URL } from "./key";
import { factsFromGetParcel, formatAcres, summarizeGetParcelFill } from "./map";

const PREV = process.env.GETPARCELDATA_API_KEY;

afterEach(() => {
  if (PREV == null) delete process.env.GETPARCELDATA_API_KEY;
  else process.env.GETPARCELDATA_API_KEY = PREV;
});

describe("GetParcelData client", () => {
  it("does not call the vendor when the key is missing", async () => {
    delete process.env.GETPARCELDATA_API_KEY;
    expect(readGetParcelDataApiKey({})).toBe("");
    expect(getParcelDataKeyReady("")).toBe(false);
    const fetchImpl = vi.fn();
    const result = await searchGetParcelDataRecords(
      { address1: "18025 Cypress Point Rd", city: "Fort Myers", state: "FL", zip: "33967" },
      "",
      fetchImpl,
    );
    expect(result.status).toBe("needs_key");
    expect(result.called).toBe(false);
    expect(result.facts).toEqual([]);
    expect(result.message).toBe(MISSING_KEY_MESSAGE);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("geocodes then calls parcels/point with Bearer auth", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: { headers?: Record<string, string> }) => {
      const u = String(url);
      if (u.includes("geocode.arcgis.com")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{ location: { x: -81.807, y: 26.485 }, score: 100 }],
          }),
        };
      }
      expect(u).toContain(GETPARCELDATA_POINT_URL);
      expect(u).toContain("lat=26.485");
      expect(u).toContain("lng=-81.807");
      expect(init?.headers?.Authorization).toBe("Bearer gpd_test_demo");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          total_count: 1,
          returned_count: 1,
          offset: 0,
          parcels: [
            {
              parcel_id: "12-3456",
              year_built: "2001",
              building_area: "2100",
              bedrooms: "3",
              bathrooms: "2",
              stories: "1",
              owner_name: "CYPRESS OWNER",
              assessed_value: "350000",
              flood_zone: "X",
              acreage: "0.3030",
              land_value: "99426",
              improvement_value: "119571",
              year_effective: "1990",
              homestead: "Y",
              land_use: "SINGLE FAMILY",
              zoning: "RS-1",
              sale_price: "325000",
              sale_date: "2022-03-04",
              assessment_year: "2025",
            },
          ],
        }),
      };
    });
    const result = await searchGetParcelDataRecords(
      { address1: "18025 Cypress Point Rd", city: "Fort Myers", state: "FL", zip: "33967" },
      "gpd_test_demo",
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.status).toBe("ok");
    expect(result.called).toBe(true);
    expect(result.facts.some((f) => f.sheetKey === "year_built" && f.value === "2001")).toBe(true);
    expect(result.facts.some((f) => f.sheetKey === "square_feet" && f.value === "2100")).toBe(true);
    expect(result.facts.some((f) => f.sheetKey === "beds" && f.value === "3")).toBe(true);
    expect(result.facts.some((f) => f.sheetKey === "acres" && f.value === "0.303")).toBe(true);
    expect(result.facts.some((f) => f.sheetKey === "land_value")).toBe(true);
    expect(result.facts.some((f) => f.sheetKey === "year_effective" && f.value === "1990")).toBe(true);
    expect(result.facts.some((f) => f.sheetKey === "year_purchased" && f.value === "2022")).toBe(true);
    expect(result.facts.some((f) => f.sheetKey === "parcel_id")).toBe(true);
    expect(result.facts.some((f) => f.sheetKey === "coverage_a")).toBe(false);
  });

  it("maps parcel fields without inventing Cov A", () => {
    const facts = factsFromGetParcel({
      year_built: "1999",
      assessed_value: "500000",
      sale_price: "600000",
      acreage: 1.25,
    });
    expect(facts.some((f) => f.sheetKey === "year_built")).toBe(true);
    expect(facts.some((f) => f.sheetKey === "assessed_value")).toBe(true);
    expect(facts.some((f) => f.sheetKey === "sale_price" && f.value === "600000")).toBe(true);
    expect(facts.some((f) => f.sheetKey === "acres" && f.value === "1.25")).toBe(true);
    expect(facts.some((f) => f.sheetKey === "coverage_a")).toBe(false);
    expect(facts.some((f) => f.sheetKey === "hydrant")).toBe(false);
    expect(facts.some((f) => f.sheetKey === "miles_to_fire_station")).toBe(false);
    expect(facts.some((f) => f.sheetKey === "within_city_limits")).toBe(false);
    expect(facts.some((f) => f.sheetKey === "elevation")).toBe(false);
  });

  it("maps optional parcel keys when the vendor sends them and skips a bare garage yes", () => {
    const facts = factsFromGetParcel({
      year_built: "1978",
      structure_type: "Single Family",
      basement: "Full",
      garage_type: "2 car attached",
      within_city_limits: "yes",
      usage: "Primary",
      months_occupied: "12",
      distance_to_hydrant: "500",
      distance_to_fire_station: "2",
      elevation: "12.4",
      foundation: "Slab",
      exterior: "Stucco",
    });
    expect(facts.find((f) => f.sheetKey === "structure_type")?.value).toBe("Single Family");
    expect(facts.find((f) => f.sheetKey === "basement")?.value).toBe("yes");
    expect(facts.find((f) => f.sheetKey === "garage_type")?.value).toBe("Attached");
    expect(facts.find((f) => f.sheetKey === "garage_spaces")?.value).toBe("2");
    expect(facts.find((f) => f.sheetKey === "within_city_limits")?.value).toBe("yes");
    expect(facts.find((f) => f.sheetKey === "usage")?.value).toBe("Primary");
    expect(facts.find((f) => f.sheetKey === "hydrant")?.value).toBe("500");
    expect(facts.find((f) => f.sheetKey === "miles_to_fire_station")?.value).toBe("2");
    expect(facts.find((f) => f.sheetKey === "elevation")?.value).toBe("12.4");
    expect(facts.find((f) => f.sheetKey === "foundation")?.value).toBe("Slab");
    expect(facts.find((f) => f.sheetKey === "exterior")?.value).toBe("Stucco");
    const bare = factsFromGetParcel({ garage: "Y" });
    expect(bare.some((f) => f.sheetKey === "garage_type" || f.sheetKey === "garage_spaces")).toBe(false);
  });

  it("formats acres and notes null dwelling feed", () => {
    expect(formatAcres("0.3030")).toBe("0.303");
    expect(formatAcres(1.2)).toBe("1.2");
    const hit = {
      parcel_id: "1",
      acreage: "0.3",
      bedrooms: null,
      bathrooms: null,
      building_area: null,
      stories: null,
      assessment_year: "2025",
    };
    const facts = factsFromGetParcel(hit);
    expect(facts.some((f) => f.sheetKey === "acres")).toBe(true);
    expect(facts.some((f) => f.sheetKey === "beds")).toBe(false);
    expect(summarizeGetParcelFill(hit, facts.length)).toMatch(/beds\/baths\/sqft(?:\/stories)? not in county feed/);
    expect(summarizeGetParcelFill(hit, facts.length)).toMatch(/2025/);
  });

  it("never logs the agency key and has no stub fallback when the key is present", () => {
    const source =
      readFileSync("src/lib/getparceldata/client.ts", "utf8") +
      readFileSync("src/lib/getparceldata/key.ts", "utf8");
    expect(source).not.toMatch(/console\.log/);
    expect(source).not.toMatch(/stubPropertyFor|USE_STUB|fixtureParcel/);
    expect(source).toMatch(/Never stubbed/);
  });
});
