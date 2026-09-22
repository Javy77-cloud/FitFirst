import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/deals/deal-1",
}));

import { RepeatableUnitBlocks } from "@/components/deal/repeatable-unit-blocks";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { applyExtractedToSheet, mergeAgentEdits } from "@/lib/quote-sheet/apply";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { repeatableRemovalWrites, shownRepeatableCount, visibleUnitCount } from "@/lib/quote-sheet/repeatable-units";

function cell(value: string, source: QuoteSheetFieldValue["source"] = "extracted"): QuoteSheetFieldValue {
  return { value, status: source === "agent" ? "confirmed" : "check", source };
}

function james(slot: number, extra: Record<string, string> = {}) {
  return [
    { fieldKey: `driver_${slot}_name`, normalizedValue: "James Iori" },
    { fieldKey: `driver_${slot}_dob`, normalizedValue: extra.dob ?? "04/22/1959" },
    ...Object.entries(extra)
      .filter(([key]) => key !== "dob")
      .map(([key, value]) => ({ fieldKey: `driver_${slot}_${key}`, normalizedValue: value })),
  ];
}

describe("multi-photo Auto driver dedupe", () => {
  it("collapses three extracts of James Iori 04/22/1959 into one driver slot", () => {
    let values = emptySheetValues("auto");
    const photos = [
      james(1, { gender: "Male" }),
      james(2, { dob: "4/22/59", license: "I400-222-33-444" }),
      james(3, { dob: "April 22, 1959" }),
    ];
    for (const extracted of photos) {
      values = applyExtractedToSheet("auto", values, extracted).values;
    }
    expect(values.driver_1_name.value).toBe("James Iori");
    expect(values.driver_1_dob.value).toBe("04/22/1959");
    expect(values.driver_1_gender.value).toBe("Male");
    expect(values.driver_1_license.value).toBe("I400-222-33-444");
    expect(values.driver_2_name?.value ?? "").toBe("");
    expect(values.driver_3_name?.value ?? "").toBe("");
    expect(values.driver_4_name?.value ?? "").toBe("");
    expect(visibleUnitCount(values, "driver")).toBe(1);
  });

  it("keeps the fuller James row and does not open a new card for a later photo's extra person", () => {
    let values = emptySheetValues("auto");
    values = applyExtractedToSheet("auto", values, [
      { fieldKey: "driver_1_name", normalizedValue: "Domenic Iori" },
      { fieldKey: "driver_1_dob", normalizedValue: "04/02/1984" },
      { fieldKey: "driver_2_name", normalizedValue: "James Iori" },
      { fieldKey: "driver_2_dob", normalizedValue: "04/22/1959" },
      { fieldKey: "vin", normalizedValue: "11111111111111111" },
      { fieldKey: "vehicle_2_vin", normalizedValue: "22222222222222222" },
      { fieldKey: "vehicle_3_vin", normalizedValue: "33333333333333333" },
      { fieldKey: "vehicle_4_vin", normalizedValue: "44444444444444444" },
    ]).values;
    values = applyExtractedToSheet("auto", values, [
      { fieldKey: "driver_1_name", normalizedValue: "Domenic Iori" },
      { fieldKey: "driver_1_dob", normalizedValue: "04/02/1984" },
      { fieldKey: "driver_2_name", normalizedValue: "Maria Iori" },
      { fieldKey: "driver_2_dob", normalizedValue: "07/07/1992" },
      { fieldKey: "driver_3_name", normalizedValue: "James Iori" },
      { fieldKey: "driver_3_dob", normalizedValue: "04/22/1959" },
      { fieldKey: "driver_3_license", normalizedValue: "I400-222-33-444" },
      { fieldKey: "driver_3_gender", normalizedValue: "Male" },
      { fieldKey: "driver_4_name", normalizedValue: "James Iori" },
      { fieldKey: "driver_4_dob", normalizedValue: "04/22/1959" },
    ]).values;

    expect(values.driver_1_name.value).toBe("Domenic Iori");
    expect(values.driver_2_name.value).toBe("James Iori");
    expect(values.driver_2_dob.value).toBe("04/22/1959");
    expect(values.driver_2_license.value).toBe("I400-222-33-444");
    expect(values.driver_2_gender.value).toBe("Male");
    expect(values.driver_3_name?.value ?? "").toBe("");
    expect(values.driver_4_name?.value ?? "").toBe("");
    expect(visibleUnitCount(values, "driver")).toBe(2);
    expect(visibleUnitCount(values, "vehicle")).toBe(4);
  });

  it("does not collapse the same name when a date of birth is missing", () => {
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), [
      { fieldKey: "driver_1_name", normalizedValue: "James Iori" },
      { fieldKey: "driver_1_dob", normalizedValue: "04/22/1959" },
      { fieldKey: "driver_2_name", normalizedValue: "James Iori" },
    ]);
    expect(applied.values.driver_1_dob.value).toBe("04/22/1959");
    expect(applied.values.driver_2_name.value).toBe("James Iori");
    expect(visibleUnitCount(applied.values, "driver")).toBe(2);
  });

  it("keeps two James Ioris with different dates of birth", () => {
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), [
      { fieldKey: "driver_1_name", normalizedValue: "James Iori" },
      { fieldKey: "driver_1_dob", normalizedValue: "06/01/1962" },
      { fieldKey: "driver_2_name", normalizedValue: "James Iori" },
      { fieldKey: "driver_2_dob", normalizedValue: "04/22/1959" },
    ]);
    expect(applied.values.driver_1_dob.value).toBe("06/01/1962");
    expect(applied.values.driver_2_name.value).toBe("James Iori");
    expect(applied.values.driver_2_dob.value).toBe("04/22/1959");
    expect(visibleUnitCount(applied.values, "driver")).toBe(2);
  });

  it("leaves 4 vehicles and 2 drivers at 2 drivers after save and fill", () => {
    const existing: Record<string, QuoteSheetFieldValue> = {
      ...emptySheetValues("auto"),
      vin: cell("11111111111111111"),
      vehicle_2_vin: cell("22222222222222222"),
      vehicle_3_vin: cell("33333333333333333"),
      vehicle_4_vin: cell("44444444444444444"),
      driver_1_name: cell("Domenic Iori", "agent"),
      driver_1_dob: cell("04/02/1984", "agent"),
      driver_2_name: cell("James Iori", "agent"),
      driver_2_dob: cell("04/22/1959", "agent"),
    };
    const submitted = {
      vin: "11111111111111111",
      vehicle_2_vin: "22222222222222222",
      vehicle_3_vin: "33333333333333333",
      vehicle_4_vin: "44444444444444444",
      driver_1_name: "Domenic Iori",
      driver_1_dob: "04/02/1984",
      driver_2_name: "James Iori",
      driver_2_dob: "04/22/1959",
    };
    const saved = mergeAgentEdits(existing, submitted, "auto");
    expect(visibleUnitCount(saved, "vehicle")).toBe(4);
    expect(visibleUnitCount(saved, "driver")).toBe(2);

    const filled = applyExtractedToSheet("auto", saved, [
      { fieldKey: "liability_bi", normalizedValue: "100/300" },
      { fieldKey: "driver_3_name", normalizedValue: "James Iori" },
      { fieldKey: "driver_3_dob", normalizedValue: "04/22/1959" },
      { fieldKey: "driver_4_name", normalizedValue: "James Iori" },
      { fieldKey: "driver_4_dob", normalizedValue: "04/22/1959" },
      { fieldKey: "driver_4_license", normalizedValue: "I400-222-33-444" },
    ]);
    expect(filled.values.liability_bi.value).toBe("100/300");
    expect(filled.values.driver_1_name.value).toBe("Domenic Iori");
    expect(filled.values.driver_2_name.value).toBe("James Iori");
    expect(filled.values.driver_2_license.value).toBe("I400-222-33-444");
    expect(filled.values.driver_3_name?.value ?? "").toBe("");
    expect(filled.values.driver_4_name?.value ?? "").toBe("");
    expect(visibleUnitCount(filled.values, "vehicle")).toBe(4);
    expect(visibleUnitCount(filled.values, "driver")).toBe(2);
  });

  it("does not resurrect removed driver 3 and 4 on save, fill, or refresh", () => {
    const duplicated: Record<string, QuoteSheetFieldValue> = {
      ...emptySheetValues("auto"),
      vin: cell("11111111111111111"),
      vehicle_2_vin: cell("22222222222222222"),
      vehicle_3_vin: cell("33333333333333333"),
      vehicle_4_vin: cell("44444444444444444"),
      driver_1_name: cell("Domenic Iori", "agent"),
      driver_1_dob: cell("04/02/1984", "agent"),
      driver_2_name: cell("James Iori", "agent"),
      driver_2_dob: cell("04/22/1959", "agent"),
      driver_3_name: cell("James Iori"),
      driver_3_dob: cell("04/22/1959"),
      driver_4_name: cell("James Iori"),
      driver_4_dob: cell("04/22/1959"),
    };
    expect(visibleUnitCount(duplicated, "driver")).toBe(4);

    const snapshots = [
      undefined,
      { name: "Domenic Iori", dob: "04/02/1984" },
      { name: "James Iori", dob: "04/22/1959" },
      { name: "James Iori", dob: "04/22/1959" },
      { name: "James Iori", dob: "04/22/1959" },
    ];
    const drop4 = repeatableRemovalWrites("driver", 4, 4, snapshots);
    const after4 = mergeAgentEdits(duplicated, drop4 ?? {}, "auto");
    const drop3 = repeatableRemovalWrites("driver", 3, 3, [
      undefined,
      { name: "Domenic Iori", dob: "04/02/1984" },
      { name: "James Iori", dob: "04/22/1959" },
      { name: "", dob: "" },
    ]);
    const saved = mergeAgentEdits(after4, drop3 ?? {}, "auto");
    expect(saved.driver_1_name.value).toBe("Domenic Iori");
    expect(saved.driver_2_name.value).toBe("James Iori");
    expect(saved.driver_3_name?.value ?? "").toBe("");
    expect(saved.driver_4_name?.value ?? "").toBe("");
    expect(visibleUnitCount(saved, "vehicle")).toBe(4);
    expect(visibleUnitCount(saved, "driver")).toBe(2);

    const filled = applyExtractedToSheet("auto", saved, [
      ...james(3),
      ...james(4, { license: "I400-222-33-444" }),
    ]);
    expect(filled.values.driver_2_license.value).toBe("I400-222-33-444");
    expect(visibleUnitCount(filled.values, "driver")).toBe(2);
    expect(visibleUnitCount(filled.values, "vehicle")).toBe(4);
    expect(shownRepeatableCount(4, visibleUnitCount(filled.values, "driver"), true)).toBe(2);

    const html = renderToString(
      createElement(RepeatableUnitBlocks, {
        kind: "driver",
        product: "auto",
        values: filled.values,
        extractedByKey: new Map(),
      }),
    );
    expect(html).toContain('data-ff-unit-block="driver-1"');
    expect(html).toContain('data-ff-unit-block="driver-2"');
    expect(html).not.toContain('data-ff-unit-block="driver-3"');
    expect(html).not.toContain('data-ff-unit-block="driver-4"');
  });
});
