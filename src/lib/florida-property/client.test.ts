import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { searchFloridaPropertyRecords } from "./client";
import { MISSING_KEY_MESSAGE, readFloridaPropertyApiKey, floridaPropertyKeyReady } from "./key";
import { FLORIDA_PROPERTY_SEARCH_URL } from "./key";

const PREV = process.env.FLORIDA_PROPERTY_API_KEY;

afterEach(() => {
  if (PREV == null) delete process.env.FLORIDA_PROPERTY_API_KEY;
  else process.env.FLORIDA_PROPERTY_API_KEY = PREV;
});

describe("Florida Property API client", () => {
  it("does not call the vendor when the key is missing", async () => {
    delete process.env.FLORIDA_PROPERTY_API_KEY;
    expect(readFloridaPropertyApiKey({})).toBe("");
    expect(floridaPropertyKeyReady("")).toBe(false);
    const fetchImpl = vi.fn();
    const result = await searchFloridaPropertyRecords(
      { address1: "412 Harbor Isle Dr", city: "Melbourne", state: "FL", county: "Brevard" },
      "",
      fetchImpl,
    );
    expect(result.status).toBe("needs_key");
    expect(result.called).toBe(false);
    expect(result.facts).toEqual([]);
    expect(result.message).toBe(MISSING_KEY_MESSAGE);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("searches with Bearer auth, address, and county — no fake parcel", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: { headers?: Record<string, string> }) => {
      expect(String(url)).toContain(FLORIDA_PROPERTY_SEARCH_URL);
      expect(String(url)).toContain("address=");
      expect(String(url)).toContain("query=");
      expect(String(url)).toContain("county=brevard");
      expect(init?.headers?.Authorization).toBe("Bearer fpapi_test_demo");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              parcel_id: "30-3122-001-0010",
              year_built: 2014,
              owner_name: "HARBOR OWNER",
              assessed_value: 321000,
              county_name: "Brevard",
            },
          ],
        }),
      };
    });
    const result = await searchFloridaPropertyRecords(
      { address1: "412 Harbor Isle Dr", city: "Melbourne", state: "FL", zip: "32935", county: "Brevard" },
      "fpapi_test_demo",
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.status).toBe("ok");
    expect(result.called).toBe(true);
    expect(result.facts.some((fact) => fact.sheetKey === "year_built" && fact.value === "2014")).toBe(true);
    expect(result.facts.some((fact) => fact.sheetKey === "parcel_id")).toBe(true);
  });

  it("never logs the agency key", () => {
    const source = readFileSync("src/lib/florida-property/client.ts", "utf8") + readFileSync("src/lib/florida-property/key.ts", "utf8");
    expect(source).not.toMatch(/console\.log/);
  });
});
