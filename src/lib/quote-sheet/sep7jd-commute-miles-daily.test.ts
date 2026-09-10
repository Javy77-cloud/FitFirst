import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import {
  fieldsForUnit,
  isRepeatableSheetKey,
  repeatableFieldKey,
  type RepeatableKind,
} from "./repeatable-units";

describe("Auto commute_miles_daily on master sheet (sep7jd / Gaya standing)", () => {
  it("fieldsForLine(auto) includes ownership length, commute days, and daily miles", () => {
    const fields = fieldsForLine("auto");
    const keys = fields.map((f) => f.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "vehicle_ownership_length",
        "commute_days_week",
        "commute_miles_daily",
      ]),
    );

    const daily = fields.find((f) => f.key === "commute_miles_daily");
    expect(daily?.label).toBe("Miles driven daily");
    expect(daily?.group).toBe("Vehicle");
    expect(daily?.input).toBe("number");

    const commuteIdx = fields.findIndex((f) => f.key === "commute_days_week");
    const dailyIdx = fields.findIndex((f) => f.key === "commute_miles_daily");
    expect(dailyIdx).toBe(commuteIdx + 1);
  });

  it("repeatable vehicles map #1 keys and vehicle_N_* after", () => {
    expect(repeatableFieldKey("vehicle", 1, "commute_miles_daily")).toBe(
      "commute_miles_daily",
    );
    expect(repeatableFieldKey("vehicle", 2, "commute_miles_daily")).toBe(
      "vehicle_2_commute_miles_daily",
    );

    const slots = fieldsForUnit("vehicle" as RepeatableKind, 1);
    expect(slots.map((s) => s.key)).toEqual(
      expect.arrayContaining(["commute_miles_daily", "commute_days_week"]),
    );
    const daily = slots.find((s) => s.suffix === "commute_miles_daily");
    expect(daily?.label).toBe("Miles driven daily");
    expect(daily?.input).toBe("number");

    expect(isRepeatableSheetKey("commute_miles_daily")).toBe(true);
    expect(isRepeatableSheetKey("vehicle_2_commute_miles_daily")).toBe(true);
  });
});
