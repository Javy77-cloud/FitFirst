import { describe, expect, it } from "vitest";
import { extractKeyToSheetKey, fieldsForLine } from "./catalog";
import { MASTER_SHEET_EMPTY_DEFAULTS } from "./sheet-defaults";
import {
  fieldsForUnit,
  isRepeatableSheetKey,
  repeatableFieldKey,
  type RepeatableKind,
} from "./repeatable-units";

describe("Auto original_cost_new (OCN) on master sheet (sep7jg / Gaya standing)", () => {
  it("fieldsForLine(auto) includes original_cost_new near purchase date / purchased_new", () => {
    const fields = fieldsForLine("auto");
    const field = fields.find((f) => f.key === "original_cost_new");
    expect(field).toBeDefined();
    expect(field?.label).toBe("Original cost new (OCN)");
    expect(field?.group).toBe("Vehicle");
    expect(field?.input).toBe("number");

    const purchaseIdx = fields.findIndex((f) => f.key === "vehicle_purchase_date");
    const purchasedNewIdx = fields.findIndex((f) => f.key === "purchased_new");
    const ocnIdx = fields.findIndex((f) => f.key === "original_cost_new");
    expect(purchaseIdx).toBeGreaterThanOrEqual(0);
    expect(purchasedNewIdx).toBe(purchaseIdx + 1);
    expect(ocnIdx).toBe(purchasedNewIdx + 1);
  });

  it("extract aliases map OCN / cost new to original_cost_new", () => {
    expect(extractKeyToSheetKey("auto", "original_cost_new")).toBe("original_cost_new");
    expect(extractKeyToSheetKey("auto", "ocn")).toBe("original_cost_new");
    expect(extractKeyToSheetKey("auto", "cost_new")).toBe("original_cost_new");
    expect(extractKeyToSheetKey("auto", "original_cost")).toBe("original_cost_new");
  });

  it("repeatable vehicles map #1 original_cost_new and vehicle_N_original_cost_new after", () => {
    expect(repeatableFieldKey("vehicle", 1, "original_cost_new")).toBe(
      "original_cost_new",
    );
    expect(repeatableFieldKey("vehicle", 2, "original_cost_new")).toBe(
      "vehicle_2_original_cost_new",
    );

    const slots = fieldsForUnit("vehicle" as RepeatableKind, 1);
    expect(slots.map((s) => s.key)).toEqual(
      expect.arrayContaining(["original_cost_new"]),
    );
    const slot = slots.find((s) => s.suffix === "original_cost_new");
    expect(slot?.label).toBe("Original cost new (OCN)");
    expect(slot?.input).toBe("number");

    expect(isRepeatableSheetKey("original_cost_new")).toBe(true);
    expect(isRepeatableSheetKey("vehicle_2_original_cost_new")).toBe(true);
  });

  it("no empty defaults (leave Heather blank until Javy answers)", () => {
    expect(MASTER_SHEET_EMPTY_DEFAULTS.original_cost_new).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.vehicle_original_cost_new).toBeUndefined();
    expect(MASTER_SHEET_EMPTY_DEFAULTS.vehicle_2_original_cost_new).toBeUndefined();
  });
});
