import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { searchGetParcelDataRecords } from "./client";
import { MISSING_KEY_MESSAGE, readGetParcelDataApiKey, getParcelDataKeyReady } from "./key";
import { GETPARCELDATA_POINT_URL } from "./key";
import { factsFromGetParcel } from "./map";

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
    expect(result.facts.some((f) => f.sheetKey === "parcel_id")).toBe(true);
    expect(result.facts.some((f) => f.sheetKey === "coverage_a")).toBe(false);
  });

  it("maps parcel fields without inventing Cov A", () => {
    const facts = factsFromGetParcel({
      year_built: "1999",
      assessed_value: "500000",
      sale_price: "600000",
    });
    expect(facts.some((f) => f.sheetKey === "year_built")).toBe(true);
    expect(facts.some((f) => f.sheetKey === "assessed_value")).toBe(true);
    expect(facts.some((f) => f.sheetKey === "coverage_a")).toBe(false);
  });

  it("never logs the agency key", () => {
    const source =
      readFileSync("src/lib/getparceldata/client.ts", "utf8") +
      readFileSync("src/lib/getparceldata/key.ts", "utf8");
    expect(source).not.toMatch(/console\.log/);
  });
});
