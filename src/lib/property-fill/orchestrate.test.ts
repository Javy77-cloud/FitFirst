import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { GETPARCELDATA_POINT_URL } from "@/lib/getparceldata/key";
import { PERMITSTACK_HISTORY_URL } from "@/lib/permitstack/key";
import { orchestratePropertyFill } from "./orchestrate";

function jsonOk(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

describe("orchestratePropertyFill paid live paths", () => {
  it("hits live GetParcelData + PermitStack when keys are present (no stubs)", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: { headers?: Record<string, string> }) => {
      const u = String(url);
      if (u.includes("geocode.arcgis.com")) {
        return jsonOk({ candidates: [{ location: { x: -81.807, y: 26.485 }, score: 100 }] });
      }
      if (u.includes(GETPARCELDATA_POINT_URL)) {
        expect(init?.headers?.Authorization).toBe("Bearer gpd_live_test");
        return jsonOk({
          total_count: 1,
          returned_count: 1,
          offset: 0,
          parcels: [{ parcel_id: "12-3456", year_built: "1978", acreage: "0.3" }],
        });
      }
      if (u.includes(PERMITSTACK_HISTORY_URL)) {
        expect(init?.headers?.["X-API-Key"]).toBe("pk_live_test");
        return jsonOk({
          found: true,
          summary: { signals: { has_roofing: true, last_roofing_date: "2021-06-15" } },
          permits: [],
        });
      }
      if (u.includes("floodzonemap.org") || u.includes("hazards.fema.gov") || u.includes("arcgis")) {
        return jsonOk({ features: [], zones: [] });
      }
      return jsonOk({});
    });

    const bundle = await orchestratePropertyFill({
      address: {
        address1: "18025 Cypress Point Rd",
        city: "Fort Myers",
        state: "FL",
        zip: "33967",
        county: "Lee",
      },
      apiKey: "gpd_live_test",
      permitStackKey: "pk_live_test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(bundle.status).toBe("ok");
    expect(bundle.sourcesUsed).toEqual(expect.arrayContaining(["property-records", "permitstack"]));
    expect(bundle.facts.some((f) => f.sheetKey === "year_built" && f.value === "1978")).toBe(true);
    expect(bundle.facts.some((f) => f.sheetKey === "roof_year" && f.value === "2021")).toBe(true);
    expect(bundle.lookup.called).toBe(true);
    const urls = fetchImpl.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes(GETPARCELDATA_POINT_URL))).toBe(true);
    expect(urls.some((u) => u.includes(PERMITSTACK_HISTORY_URL))).toBe(true);
  });

  it("does not call paid vendors without keys and still uses free sources", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      const u = String(url);
      expect(u).not.toContain("api.getparceldata.com");
      expect(u).not.toContain("api.permit-stack.com");
      if (u.includes("geocode.arcgis.com")) {
        return jsonOk({ candidates: [{ location: { x: -81.807, y: 26.485 }, score: 100 }] });
      }
      if (u.includes("floodzonemap.org")) {
        return jsonOk({ zones: [{ zone: "AE", base_flood_elevation: "6", dfirm_id: "12071C" }] });
      }
      return jsonOk({ features: [] });
    });

    const bundle = await orchestratePropertyFill({
      address: {
        address1: "18025 Cypress Point Rd",
        city: "Fort Myers",
        state: "FL",
        zip: "33967",
        county: "Brevard",
      },
      apiKey: "",
      permitStackKey: "",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(bundle.status).toBe("ok");
    expect(bundle.sourcesUsed).toContain("floodzonemap");
    expect(bundle.sourcesUsed).not.toContain("property-records");
    expect(bundle.sourcesUsed).not.toContain("permitstack");
    expect(bundle.lookup.called).toBe(false);
  });

  it("continues when PermitStack errors (fail soft)", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("geocode.arcgis.com")) {
        return jsonOk({ candidates: [{ location: { x: -81.807, y: 26.485 }, score: 100 }] });
      }
      if (u.includes(PERMITSTACK_HISTORY_URL)) {
        return { ok: false, status: 503, json: async () => ({}) };
      }
      if (u.includes("floodzonemap.org")) {
        return jsonOk({ zones: [{ zone: "X", dfirm_id: "12071C" }] });
      }
      return jsonOk({ features: [] });
    });

    const bundle = await orchestratePropertyFill({
      address: { address1: "1 Main St", city: "Miami", state: "FL", zip: "33101" },
      apiKey: "",
      permitStackKey: "pk_bad",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(bundle.status).toBe("ok");
    expect(bundle.facts.some((f) => f.sheetKey === "flood_zone")).toBe(true);
    expect(bundle.facts.some((f) => f.sheetKey === "roof_year")).toBe(false);
    expect(bundle.sourcesUsed).not.toContain("permitstack");
  });

  it("GetParcelData client is live HTTP — no stub/fixture fallback", () => {
    const client = readFileSync("src/lib/getparceldata/client.ts", "utf8");
    expect(client).toMatch(/Authorization: `Bearer/);
    expect(client).toMatch(/GETPARCELDATA_POINT_URL/);
    expect(client).not.toMatch(/stubPropertyFor|USE_STUB|fixture/);
    expect(client).not.toMatch(/if \(process\.env\.NODE_ENV/);
  });
});
