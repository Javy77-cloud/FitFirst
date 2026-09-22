import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import { PRIMARY_HEAT_OPTIONS, PRIMARY_PLUMBING_OPTIONS } from "./sheet-defaults";

describe("sep7hl primary heat + plumbing picklists", () => {
  it("exposes Primary heat and Primary plumbing type on the home Four-Point Inspection block", () => {
    const fields = fieldsForLine("home", "homeowners");
    const heat = fields.find((f) => f.key === "primary_heat");
    const plumbing = fields.find((f) => f.key === "primary_plumbing_type");
    expect(heat).toMatchObject({
      label: "Primary heat",
      group: "Four-Point Inspection",
      input: "select",
    });
    expect(heat?.options).toEqual([...PRIMARY_HEAT_OPTIONS]);
    expect(PRIMARY_HEAT_OPTIONS).toEqual(
      expect.arrayContaining(["Electric", "Heat pump", "Natural gas", "Propane"]),
    );
    expect(plumbing).toMatchObject({
      label: "Primary plumbing type",
      group: "Four-Point Inspection",
      input: "select",
    });
    expect(plumbing?.options).toEqual([...PRIMARY_PLUMBING_OPTIONS]);
    expect(PRIMARY_PLUMBING_OPTIONS).toContain("Copper");
  });

  it("keeps hydrant next to other Protection picklists", () => {
    const catalog = readFileSync("src/lib/quote-sheet/catalog.ts", "utf8");
    expect(catalog).toMatch(/key: "primary_heat"/);
    expect(catalog).toMatch(/key: "primary_plumbing_type"/);
  });
});
