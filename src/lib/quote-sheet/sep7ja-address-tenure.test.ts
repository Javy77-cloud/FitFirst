import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import { MASTER_SHEET_EMPTY_DEFAULTS, YES_NO_OPTIONS } from "./sheet-defaults";

describe("Auto address tenure (sep7ja / Gaya standing)", () => {
  it("catalog exposes years_at_address, address_same_6_months, prior_address on Residence", () => {
    const fields = fieldsForLine("auto");
    const years = fields.find((f) => f.key === "years_at_address");
    expect(years?.group).toBe("Residence");
    expect(years?.input).toBe("number");

    const same = fields.find((f) => f.key === "address_same_6_months");
    expect(same?.group).toBe("Residence");
    expect(same?.input).toBe("select");
    expect(same?.options).toEqual(["yes", "no"]);
    expect([...YES_NO_OPTIONS]).toEqual(["yes", "no"]);

    const prior = fields.find((f) => f.key === "prior_address");
    expect(prior?.group).toBe("Residence");
    expect(prior?.input ?? "text").toBe("text");
    expect(prior?.options).toBeUndefined();
  });

  it("no empty defaults (set per deal; Heather Tallwood ~1yr + same=yes)", () => {
    expect(MASTER_SHEET_EMPTY_DEFAULTS.years_at_address).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.address_same_6_months).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.prior_address).toBeUndefined();
  });

  it("does not add SSN / social fields", () => {
    const keys = fieldsForLine("auto").map((f) => f.key);
    expect(keys.some((k) => /ssn|social/i.test(k))).toBe(false);
  });

  it("home sheet does not get Auto residence tenure keys", () => {
    const home = fieldsForLine("home", "homeowners");
    expect(home.find((f) => f.key === "years_at_address")).toBeUndefined();
    expect(home.find((f) => f.key === "address_same_6_months")).toBeUndefined();
    expect(home.find((f) => f.key === "prior_address")).toBeUndefined();
  });
});
