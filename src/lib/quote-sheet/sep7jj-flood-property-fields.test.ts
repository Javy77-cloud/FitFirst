import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import { addressFromSheet } from "@/lib/public-records/facts";
import { isZoneXNoBfe, toastForPropertyFill } from "@/lib/property-fill/merge";
import { mapFloodZoneMapToFacts } from "@/lib/property-fill/floodzonemap";
import type { PropertyRecordsFact } from "@/lib/getparceldata/map";

describe("sep7jj Flood master sheet property fields + FZM", () => {
  it("fieldsForLine(flood) includes city/state/zip/parcel_id/bfe (+ street parcel vals)", () => {
    const fields = fieldsForLine("flood");
    const keys = new Set(fields.map((f) => f.key));
    for (const key of [
      "address1",
      "city",
      "state",
      "zip",
      "mailing_address",
      "county",
      "parcel_id",
      "acres",
      "assessed_value",
      "land_value",
      "improvement_value",
      "miles_to_coast",
      "bfe",
      "flood_zone",
      "firm_panel",
      "mobile_home",
      "coverage_a",
      "building_limit",
      "applicant_gender",
      "applicant_marital_status",
      "applicant_occupation",
      "entity_type",
    ]) {
      expect(keys.has(key), `missing ${key}`).toBe(true);
    }
    expect(fields.find((f) => f.key === "city")?.group).toBe("Property");
    expect(fields.find((f) => f.key === "bfe")?.group).toBe("Foundation / elevation");
  });

  it("addressFromSheet falls back to property_address when address1 blank", () => {
    const q = addressFromSheet({
      property_address: { value: "5181 Tallwood Cir, West Melbourne, FL 32904" },
      city: { value: "" },
      state: { value: "" },
      zip: { value: "" },
    });
    expect(q.address1).toMatch(/5181 Tallwood/);
  });

  it("addressFromSheet prefers structured address1 over property_address", () => {
    const q = addressFromSheet({
      address1: { value: "5181 Tallwood Cir" },
      city: { value: "West Melbourne" },
      state: { value: "FL" },
      zip: { value: "32904" },
      property_address: { value: "should-not-win" },
    });
    expect(q.address1).toBe("5181 Tallwood Cir");
    expect(q.city).toBe("West Melbourne");
  });

  it("FZM mapper: zone X drops invalid BFE sentinel", () => {
    const facts = mapFloodZoneMapToFacts({
      zone: "X",
      base_flood_elevation: -9999,
      dfirm_id: "12009C",
    });
    expect(facts.find((f) => f.sheetKey === "flood_zone")?.value).toBe("X");
    expect(facts.find((f) => f.sheetKey === "bfe")).toBeUndefined();
    expect(facts.find((f) => f.sheetKey === "firm_panel")?.sourceLabel).toBe("FloodZoneMap");
    expect(isZoneXNoBfe(facts)).toBe(true);
  });

  it("toast notes Zone X — no BFE", () => {
    const facts: PropertyRecordsFact[] = [
      { fieldKey: "flood_zone", sheetKey: "flood_zone", value: "X", sourceLabel: "FloodZoneMap", kind: "fema" },
    ];
    expect(isZoneXNoBfe(facts)).toBe(true);
    expect(
      toastForPropertyFill({ filledCount: 0, sourcesUsed: ["floodzonemap"], zoneXNoBfe: true }),
    ).toBe("Zone X — no BFE");
    expect(
      toastForPropertyFill({
        filledCount: 2,
        sourcesUsed: ["floodzonemap"],
        zoneXNoBfe: true,
      }),
    ).toMatch(/Zone X — no BFE/);
  });
});
