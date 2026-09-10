import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import {
  factsFromFloodZoneMap,
  mapFloodZoneMapToFacts,
} from "./floodzonemap";
import { mergePropertyFillFacts, toastForPropertyFill } from "./merge";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7ji FloodZoneMap first then FEMA empty-only", () => {
  it("maps FloodZoneMap lookup zones → flood_zone / bfe / firm_panel", () => {
    const facts = mapFloodZoneMapToFacts({
      lat: 25.7617,
      lon: -80.1918,
      zone_count: 1,
      zones: [
        {
          zone: "AE",
          zone_subtype: "FLOODWAY",
          sfha: true,
          base_flood_elevation: "6",
          dfirm_id: "12086C",
          risk_level: "High Risk",
        },
      ],
    });
    expect(facts.find((f) => f.sheetKey === "flood_zone")?.value).toBe("AE");
    expect(facts.find((f) => f.sheetKey === "bfe")?.value).toBe("6");
    expect(facts.find((f) => f.sheetKey === "firm_panel")?.value).toBe("12086C");
    expect(facts.every((f) => f.sourceLabel === "FloodZoneMap")).toBe(true);
    expect(facts.some((f) => f.sheetKey === "sfha")).toBe(false);
  });

  it("maps flattened embed-style payload and drops invalid BFE sentinels", () => {
    const facts = mapFloodZoneMapToFacts({
      zone: "X",
      sfha: false,
      base_flood_elevation: -9999,
      dfirm_id: "12071C",
      matched_address: "18025 Cypress Point Rd, Fort Myers, FL",
    });
    expect(facts.find((f) => f.sheetKey === "flood_zone")?.value).toBe("X");
    expect(facts.find((f) => f.sheetKey === "firm_panel")?.value).toBe("12071C");
    expect(facts.find((f) => f.sheetKey === "bfe")).toBeUndefined();
  });

  it("factsFromFloodZoneMap prefers lat/lon lookup URL", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      expect(String(url)).toContain("/api/lookup?");
      expect(String(url)).toContain("lat=26.5");
      expect(String(url)).toContain("lon=-81.8");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          zones: [{ zone: "AE", base_flood_elevation: "8", dfirm_id: "12071C" }],
        }),
      };
    });
    const facts = await factsFromFloodZoneMap(
      { lat: 26.5, lng: -81.8, address: "should-not-embed" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(facts.find((f) => f.sheetKey === "flood_zone")?.value).toBe("AE");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("factsFromFloodZoneMap falls back to address embed when no coords", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      expect(String(url)).toContain("/api/embed?q=");
      return {
        ok: true,
        status: 200,
        json: async () => ({ zone: "VE", dfirm_id: "12086C", base_flood_elevation: "12" }),
      };
    });
    const facts = await factsFromFloodZoneMap(
      { address: "123 Main St, Miami, FL" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(facts.find((f) => f.sheetKey === "flood_zone")?.value).toBe("VE");
    expect(facts.find((f) => f.sheetKey === "bfe")?.value).toBe("12");
  });

  it("merge: FloodZoneMap before FEMA; FEMA never overwrites FZM flood_zone", () => {
    const fzm: PropertyRecordsFact[] = [
      { fieldKey: "flood_zone", sheetKey: "flood_zone", value: "AE", sourceLabel: "FloodZoneMap", kind: "fema" },
      { fieldKey: "bfe", sheetKey: "bfe", value: "6", sourceLabel: "FloodZoneMap", kind: "fema" },
    ];
    const fema: PropertyRecordsFact[] = [
      { fieldKey: "flood_zone", sheetKey: "flood_zone", value: "VE", sourceLabel: "FEMA", kind: "fema" },
      { fieldKey: "firm_panel", sheetKey: "firm_panel", value: "12071C0581F", sourceLabel: "FEMA", kind: "fema" },
      { fieldKey: "firm_effective_date", sheetKey: "firm_effective_date", value: "2008-08-28", sourceLabel: "FEMA", kind: "fema" },
    ];
    const { facts, sourcesUsed } = mergePropertyFillFacts({ floodZoneMap: fzm, fema });
    expect(sourcesUsed).toEqual(["floodzonemap", "fema"]);
    expect(facts.find((f) => f.sheetKey === "flood_zone")?.value).toBe("AE");
    expect(facts.find((f) => f.sheetKey === "flood_zone")?.sourceLabel).toBe("FloodZoneMap");
    expect(facts.find((f) => f.sheetKey === "bfe")?.value).toBe("6");
    expect(facts.find((f) => f.sheetKey === "firm_panel")?.value).toBe("12071C0581F");
    expect(facts.find((f) => f.sheetKey === "firm_effective_date")?.value).toBe("2008-08-28");
  });

  it("merge: FEMA alone still fills blanks when FloodZoneMap empty", () => {
    const fema: PropertyRecordsFact[] = [
      { fieldKey: "flood_zone", sheetKey: "flood_zone", value: "AE", sourceLabel: "FEMA", kind: "fema" },
    ];
    const { facts, sourcesUsed } = mergePropertyFillFacts({ floodZoneMap: [], fema });
    expect(sourcesUsed).toEqual(["fema"]);
    expect(facts.find((f) => f.sheetKey === "flood_zone")?.sourceLabel).toBe("FEMA");
  });

  it("toast mentions FloodZoneMap when used", () => {
    const toast = toastForPropertyFill({
      filledCount: 2,
      sourcesUsed: ["floodzonemap", "fema"],
    });
    expect(toast).toMatch(/FloodZoneMap/);
    expect(toast).toMatch(/FEMA/);
  });


  it("factsFromFloodZoneMap soft-fails on HTTP 522 and returns []", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 522,
      json: async () => ({}),
    }));
    const facts = await factsFromFloodZoneMap(
      { address: "5181 Tallwood Cir, West Melbourne, FL" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(facts).toEqual([]);
    expect(fetchImpl).toHaveBeenCalled();
  });

  it("orchestrate wires FloodZoneMap before FEMA empty-only", () => {
    const orch = source("src/lib/property-fill/orchestrate.ts");
    expect(orch).toMatch(/factsFromFloodZoneMap/);
    expect(orch).toMatch(/factsFromFemaNfhl/);
    expect(orch).toMatch(/floodZoneMap:/);
    const merge = source("src/lib/property-fill/merge.ts");
    expect(merge).toMatch(/applyOverwrite\(parts\.floodZoneMap/);
    expect(merge).toMatch(/applyEmptyOnly\(parts\.fema/);
    // FZM apply appears before FEMA empty-only in source order
    expect(merge.indexOf("applyOverwrite(parts.floodZoneMap")).toBeLessThan(
      merge.indexOf("applyEmptyOnly(parts.fema"),
    );
  });
});
