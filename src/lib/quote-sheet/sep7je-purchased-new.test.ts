import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import { MASTER_SHEET_EMPTY_DEFAULTS, YES_NO_OPTIONS } from "./sheet-defaults";
import {
  fieldsForUnit,
  isRepeatableSheetKey,
  repeatableFieldKey,
  type RepeatableKind,
} from "./repeatable-units";

describe("Auto purchased_new Yes/No on master sheet (sep7je / Gaya standing)", () => {
  it("fieldsForLine(auto) includes purchased_new near purchase date / ownership", () => {
    const fields = fieldsForLine("auto");
    const field = fields.find((f) => f.key === "purchased_new");
    expect(field).toBeDefined();
    expect(field?.label).toBe("Purchased new?");
    expect(field?.group).toBe("Vehicle");
    expect(field?.input).toBe("select");
    expect(field?.options).toEqual([...YES_NO_OPTIONS]);

    const purchaseIdx = fields.findIndex((f) => f.key === "vehicle_purchase_date");
    const purchasedNewIdx = fields.findIndex((f) => f.key === "purchased_new");
    expect(purchaseIdx).toBeGreaterThanOrEqual(0);
    expect(purchasedNewIdx).toBe(purchaseIdx + 1);
  });

  it("repeatable vehicles map #1 purchased_new and vehicle_N_purchased_new after", () => {
    expect(repeatableFieldKey("vehicle", 1, "purchased_new")).toBe("purchased_new");
    expect(repeatableFieldKey("vehicle", 2, "purchased_new")).toBe(
      "vehicle_2_purchased_new",
    );

    const slots = fieldsForUnit("vehicle" as RepeatableKind, 1);
    expect(slots.map((s) => s.key)).toEqual(expect.arrayContaining(["purchased_new"]));
    const slot = slots.find((s) => s.suffix === "purchased_new");
    expect(slot?.label).toBe("Purchased new?");
    expect(slot?.input).toBe("select");
    expect(slot?.options).toEqual([...YES_NO_OPTIONS]);

    expect(isRepeatableSheetKey("purchased_new")).toBe(true);
    expect(isRepeatableSheetKey("vehicle_2_purchased_new")).toBe(true);
  });

  it("no empty defaults (leave Heather blank until Javy answers)", () => {
    expect(MASTER_SHEET_EMPTY_DEFAULTS.purchased_new).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.vehicle_purchased_new).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.vehicle_2_purchased_new).toBeUndefined();
  });
});
