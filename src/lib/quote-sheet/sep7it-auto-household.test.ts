import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import {
  AUTO_HOUSEHOLD_RELATIONSHIP_OPTIONS,
  AUTO_HOUSEHOLD_STATUS_OPTIONS,
} from "./sheet-defaults";
import {
  fieldsForUnit,
  visibleUnitCount,
  type RepeatableKind,
} from "./repeatable-units";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";

describe("Auto household / related persons (sep7it)", () => {
  it("catalog exposes Household group with FL relationship picklist", () => {
    const fields = fieldsForLine("auto");
    expect(fields.some((f) => f.group === "Household" && f.key === "household_1_name")).toBe(true);
    const rel = fields.find((f) => f.key === "household_1_relationship");
    expect(rel?.options).toEqual([...AUTO_HOUSEHOLD_RELATIONSHIP_OPTIONS]);
    expect(AUTO_HOUSEHOLD_RELATIONSHIP_OPTIONS).toContain("Spouse");
    expect(AUTO_HOUSEHOLD_RELATIONSHIP_OPTIONS).toContain("Listed non-driver");
    expect(AUTO_HOUSEHOLD_STATUS_OPTIONS).toContain("Excluded driver");
  });

  it("repeatable household slots use name/dob/relationship/status", () => {
    const slots = fieldsForUnit("household" as RepeatableKind, 1);
    expect(slots.map((s) => s.suffix)).toEqual([
      "name",
      "dob",
      "relationship",
      "status",
      "exclude_reason",
      "separate_auto_policy",
      "separate_policy_status",
      "age_first_licensed",
      "suspension_5yr",
    ]);
    expect(slots.find((s) => s.suffix === "relationship")?.options).toContain("Child");
  });

  it("visible count expands when names are seeded", () => {
    const cell = (value: string): QuoteSheetFieldValue => ({
      value,
      status: "check",
      source: "agent",
    });
    const values = {
      household_1_name: cell("Breeah Nicole Camirand"),
      household_2_name: cell("Brooke Carolee Camirand"),
      household_3_name: cell("Christopher John Camirand"),
    };
    expect(visibleUnitCount(values, "household")).toBe(3);
  });
});
