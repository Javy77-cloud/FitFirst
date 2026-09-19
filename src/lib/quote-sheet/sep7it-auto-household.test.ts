import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import {
  AUTO_HOUSEHOLD_STATUS_OPTIONS,
  AUTO_HOUSEHOLD_EXCLUDE_REASON_OPTIONS,
} from "./sheet-defaults";
import {
  fieldsForUnit,
  visibleUnitCount,
  type RepeatableKind,
} from "./repeatable-units";
import {
  HOUSEHOLD_DROPPED_SUFFIXES,
  HOUSEHOLD_TO_DRIVER_MOVED,
  mapHouseholdIntoDrivers,
} from "./household-to-drivers";
import { emptySheetValues } from "./catalog";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";

describe("Auto household folded into drivers (sep7it)", () => {
  it("catalog has no Auto Household block", () => {
    const fields = fieldsForLine("auto");
    expect(fields.some((f) => f.group === "Household")).toBe(false);
    expect(fields.some((f) => f.key.startsWith("household_"))).toBe(false);
    expect(fields.some((f) => f.key === "household_1_name")).toBe(false);
  });

  it("Home and Health keep household_size / household_income", () => {
    expect(fieldsForLine("home", "homeowners").some((f) => f.key === "household_size")).toBe(false);
    const health = Object.fromEntries(fieldsForLine("health").map((f) => [f.key, f]));
    expect(health.household_size).toBeTruthy();
    expect(health.household_income).toBeTruthy();
  });

  it("moved household facts live on the driver record", () => {
    const fields = fieldsForLine("auto");
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    expect(byKey.driver_1_household_status?.options).toEqual([...AUTO_HOUSEHOLD_STATUS_OPTIONS]);
    expect(byKey.driver_1_exclude_reason?.options).toEqual([...AUTO_HOUSEHOLD_EXCLUDE_REASON_OPTIONS]);
    expect(byKey.driver_1_age_first_licensed).toBeTruthy();
    expect(byKey.driver_1_suspension_5yr?.options).toEqual(["yes", "no"]);
    expect(byKey.driver_1_name).toBeTruthy();
    expect(byKey.driver_1_dob).toBeTruthy();
  });

  it("repeatable drivers expose moved suffixes and hide D1 relationship", () => {
    const d1 = fieldsForUnit("driver" as RepeatableKind, 1);
    expect(d1.map((s) => s.suffix)).toEqual(
      expect.arrayContaining([
        "household_status",
        "exclude_reason",
        "age_first_licensed",
        "suspension_5yr",
      ]),
    );
    expect(d1.map((s) => s.suffix)).not.toContain("relationship");
    expect(d1.map((s) => s.suffix)).not.toContain("employment");
    expect(d1.map((s) => s.suffix)).not.toContain("separate_auto_policy");

    const d2 = fieldsForUnit("driver" as RepeatableKind, 2);
    expect(d2.map((s) => s.suffix)).toContain("relationship");
    expect(HOUSEHOLD_TO_DRIVER_MOVED.map((row) => row.from)).toEqual(
      expect.arrayContaining(["status", "exclude_reason", "age_first_licensed", "suspension_5yr"]),
    );
    expect(HOUSEHOLD_DROPPED_SUFFIXES).toEqual(["separate_auto_policy", "separate_policy_status"]);
  });

  it("maps old household_N_* into empty driver_N_* and drops separate-policy keys", () => {
    const cell = (value: string): QuoteSheetFieldValue => ({
      value,
      status: "check",
      source: "agent",
    });
    const existing = emptySheetValues("auto");
    existing.household_1_status = cell("Resident");
    existing.household_1_exclude_reason = cell("Never licensed");
    existing.household_1_age_first_licensed = cell("16");
    existing.household_1_suspension_5yr = cell("no");
    existing.household_1_separate_auto_policy = cell("yes");
    existing.household_2_name = cell("Breeah Nicole Camirand");
    existing.household_2_relationship = cell("Child");
    existing.household_2_status = cell("Occasional");

    const mapped = mapHouseholdIntoDrivers(existing);
    expect(mapped.values.driver_1_household_status.value).toBe("Resident");
    expect(mapped.values.driver_1_exclude_reason.value).toBe("Never licensed");
    expect(mapped.values.driver_1_age_first_licensed.value).toBe("16");
    expect(mapped.values.driver_1_suspension_5yr.value).toBe("no");
    expect(mapped.values.driver_1_relationship?.value ?? "").toBe("");
    expect(mapped.values.driver_2_name.value).toBe("Breeah Nicole Camirand");
    expect(mapped.values.driver_2_relationship.value).toBe("Child");
    expect(mapped.values.driver_2_household_status.value).toBe("Occasional");
    expect(mapped.filledKeys).not.toContain("driver_1_separate_auto_policy");
    expect(visibleUnitCount(mapped.values, "driver")).toBe(2);
  });
});
