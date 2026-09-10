import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import { MASTER_SHEET_EMPTY_DEFAULTS, OWN_RENT_OPTIONS } from "./sheet-defaults";

describe("Auto own_rent picklist (sep7iw)", () => {
  it("catalog exposes Own / Rent on Residence group", () => {
    const fields = fieldsForLine("auto");
    const field = fields.find((f) => f.key === "own_rent");
    expect(field?.group).toBe("Residence");
    expect(field?.input).toBe("select");
    expect(field?.options).toEqual(["Own", "Rent"]);
    expect([...OWN_RENT_OPTIONS]).toEqual(["Own", "Rent"]);
  });

  it("no empty default for own_rent (Heather set Own on deal sheet)", () => {
    expect(MASTER_SHEET_EMPTY_DEFAULTS.own_rent).toBeUndefined();
  });

  it("home occupancy stays Owner/Tenant — own_rent is Auto-only", () => {
    const home = fieldsForLine("home", "homeowners");
    expect(home.find((f) => f.key === "own_rent")).toBeUndefined();
    expect(home.find((f) => f.key === "occupancy")?.options).toEqual(["Owner", "Tenant"]);
  });
});
