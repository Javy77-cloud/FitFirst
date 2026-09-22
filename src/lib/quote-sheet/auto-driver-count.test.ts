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
import { mapGeminiJsonToFields, type GeminiExtractJson } from "@/lib/extraction/gemini/map";
import { applyExtractedToSheet, mergeAgentEdits } from "@/lib/quote-sheet/apply";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { fillSheetFromDealDetails } from "@/lib/quote-sheet/fill-from-deal";
import { mapHouseholdIntoDrivers } from "@/lib/quote-sheet/household-to-drivers";
import {
  AUTO_DRIVER_COUNT_KEY,
  initialRepeatableCount,
  readStoredDriverCount,
  repeatableBlockServerCount,
  repeatableRemovalWrites,
  visibleUnitCount,
} from "@/lib/quote-sheet/repeatable-units";

function cell(value: string, source: QuoteSheetFieldValue["source"] = "agent"): QuoteSheetFieldValue {
  return { value, status: source === "agent" ? "confirmed" : "check", source };
}

function domenicSheet(): Record<string, QuoteSheetFieldValue> {
  return {
    ...emptySheetValues("auto"),
    vin: cell("11111111111111111"),
    vehicle_2_vin: cell("22222222222222222"),
    vehicle_3_vin: cell("33333333333333333"),
    vehicle_4_vin: cell("44444444444444444"),
    driver_1_name: cell("Domenic Iori"),
    driver_1_dob: cell("04/02/1984"),
    driver_2_name: cell("James Iori"),
    driver_2_dob: cell("04/22/1959"),
    [AUTO_DRIVER_COUNT_KEY]: cell("2"),
  };
}

describe("Auto driver count stays independent of vehicles", () => {
  it("keeps 2 drivers when 4 vehicles and a longer Gemini list are applied", () => {
    const saved = domenicSheet();
    const filled = applyExtractedToSheet("auto", saved, [
      { fieldKey: "liability_bi", normalizedValue: "100/300" },
      { fieldKey: "vehicle_4_make", normalizedValue: "TOYOTA" },
      { fieldKey: "driver_3_name", normalizedValue: "Maria Iori" },
      { fieldKey: "driver_3_dob", normalizedValue: "07/07/1992" },
      { fieldKey: "driver_4_name", normalizedValue: "" },
      { fieldKey: "driver_4_license", normalizedValue: "I400-000-00-000" },
      { fieldKey: "driver_2_license", normalizedValue: "I400-222-33-444" },
    ]);

    expect(filled.values.liability_bi.value).toBe("100/300");
    expect(filled.values.vehicle_4_make.value).toBe("TOYOTA");
    expect(filled.values.driver_1_name.value).toBe("Domenic Iori");
    expect(filled.values.driver_2_name.value).toBe("James Iori");
    expect(filled.values.driver_2_license.value).toBe("I400-222-33-444");
    expect(filled.values.driver_3_name?.value ?? "").toBe("");
    expect(filled.values.driver_4_name?.value ?? "").toBe("");
    expect(filled.values.driver_4_license?.value ?? "").toBe("");
    expect(visibleUnitCount(filled.values, "driver")).toBe(2);
    expect(visibleUnitCount(filled.values, "vehicle")).toBe(4);
    expect(readStoredDriverCount(filled.values)).toBe(2);
    expect(filled.filledKeys).not.toContain("driver_3_name");
    expect(filled.filledKeys).not.toContain("driver_4_license");
  });

  it("does not reopen removed drivers 3 and 4 on fill, household sync, or save", () => {
    const duplicated: Record<string, QuoteSheetFieldValue> = {
      ...domenicSheet(),
      driver_3_name: cell("Maria Iori"),
      driver_3_dob: cell("07/07/1992"),
      driver_4_name: cell("Alex Iori"),
      driver_4_dob: cell("01/01/2001"),
      household_4_name: cell("Alex Iori"),
      [AUTO_DRIVER_COUNT_KEY]: cell("4"),
    };
    const drop4 = repeatableRemovalWrites("driver", 4, 4, [
      undefined,
      { name: "Domenic Iori", dob: "04/02/1984" },
      { name: "James Iori", dob: "04/22/1959" },
      { name: "Maria Iori", dob: "07/07/1992" },
      { name: "Alex Iori", dob: "01/01/2001" },
    ]);
    const after4 = mergeAgentEdits(
      duplicated,
      { ...(drop4 ?? {}), [AUTO_DRIVER_COUNT_KEY]: "3" },
      "auto",
    );
    const drop3 = repeatableRemovalWrites("driver", 3, 3, [
      undefined,
      { name: "Domenic Iori", dob: "04/02/1984" },
      { name: "James Iori", dob: "04/22/1959" },
      { name: "", dob: "" },
    ]);
    const saved = mergeAgentEdits(
      after4,
      { ...(drop3 ?? {}), [AUTO_DRIVER_COUNT_KEY]: "2" },
      "auto",
    );
    expect(visibleUnitCount(saved, "driver")).toBe(2);
    expect(visibleUnitCount(saved, "vehicle")).toBe(4);
    expect(saved.driver_3_name?.value ?? "").toBe("");
    expect(saved.driver_4_name?.value ?? "").toBe("");

    const filled = applyExtractedToSheet("auto", saved, [
      { fieldKey: "driver_3_name", normalizedValue: "Maria Iori" },
      { fieldKey: "driver_3_dob", normalizedValue: "07/07/1992" },
      { fieldKey: "driver_4_name", normalizedValue: "Alex Iori" },
      { fieldKey: "driver_4_dob", normalizedValue: "01/01/2001" },
    ]);
    expect(visibleUnitCount(filled.values, "driver")).toBe(2);
    expect(filled.values.driver_3_name?.value ?? "").toBe("");
    expect(filled.values.driver_4_name?.value ?? "").toBe("");

    const fromDetails = fillSheetFromDealDetails(
      {
        primaryNamedInsured: "Domenic Iori",
        quotingLine: "auto",
        stored: {
          co_applicant_name: "Maria Iori",
          co_applicant_dob: "1992-07-07",
          co_applicant_relationship_to_insured: "Spouse",
        },
      },
      { ...filled.values, household_4_name: cell("Alex Iori") },
    );
    expect(fromDetails.values.driver_2_name.value).toBe("James Iori");
    expect(fromDetails.values.driver_3_name?.value ?? "").toBe("");
    expect(fromDetails.values.driver_4_name?.value ?? "").toBe("");
    expect(visibleUnitCount(fromDetails.values, "driver")).toBe(2);
    expect(readStoredDriverCount(fromDetails.values)).toBe(2);

    const household = mapHouseholdIntoDrivers({
      ...saved,
      household_3_name: cell("Maria Iori"),
      household_4_name: cell("Alex Iori"),
    });
    expect(household.values.driver_3_name?.value ?? "").toBe("");
    expect(household.values.driver_4_name?.value ?? "").toBe("");
  });

  it("does not add a driver when a vehicle is added or saved", () => {
    const saved = domenicSheet();
    const withVehicle = applyExtractedToSheet("auto", saved, [
      { fieldKey: "vehicle_4_model", normalizedValue: "CAMRY" },
    ]);
    expect(visibleUnitCount(withVehicle.values, "vehicle")).toBe(4);
    expect(visibleUnitCount(withVehicle.values, "driver")).toBe(2);
    expect(readStoredDriverCount(withVehicle.values)).toBe(2);

    const added = mergeAgentEdits(
      saved,
      {
        vin: "11111111111111111",
        vehicle_2_vin: "22222222222222222",
        vehicle_3_vin: "33333333333333333",
        vehicle_4_vin: "55555555555555555",
        driver_1_name: "Domenic Iori",
        driver_1_dob: "04/02/1984",
        driver_2_name: "James Iori",
        driver_2_dob: "04/22/1959",
        driver_3_name: "Phantom Driver",
        [AUTO_DRIVER_COUNT_KEY]: "2",
      },
      "auto",
    );
    expect(added.vehicle_4_vin.value).toBe("55555555555555555");
    expect(added.driver_3_name?.value ?? "").toBe("");
    expect(visibleUnitCount(added, "driver")).toBe(2);
    expect(visibleUnitCount(added, "vehicle")).toBe(4);
    expect(initialRepeatableCount(added, "driver")).toBe(2);
    expect(initialRepeatableCount(added, "vehicle")).toBe(4);
  });

  it("lets an explicit Add raise the count so the next fill can use that slot", () => {
    const opened = mergeAgentEdits(
      domenicSheet(),
      {
        driver_1_name: "Domenic Iori",
        driver_2_name: "James Iori",
        [AUTO_DRIVER_COUNT_KEY]: "3",
      },
      "auto",
    );
    expect(initialRepeatableCount(opened, "driver")).toBe(3);
    expect(visibleUnitCount(opened, "vehicle")).toBe(4);

    const filled = applyExtractedToSheet("auto", opened, [
      { fieldKey: "driver_3_name", normalizedValue: "Maria Iori" },
      { fieldKey: "driver_3_dob", normalizedValue: "07/07/1992" },
      { fieldKey: "driver_4_name", normalizedValue: "Alex Iori" },
    ]);
    expect(filled.values.driver_3_name.value).toBe("Maria Iori");
    expect(filled.values.driver_4_name?.value ?? "").toBe("");
    expect(visibleUnitCount(filled.values, "driver")).toBe(3);
    expect(readStoredDriverCount(filled.values)).toBe(3);
  });

  it("places named drivers on an empty sheet and ignores blank rows and vehicle-nested drivers", () => {
    const mapped = mapGeminiJsonToFields(
      {
        vehicles: [
          { vin: "11111111111111111", drivers: [{ name: "Phantom One" }] },
          { vin: "22222222222222222", driver: { name: "Phantom Two" } },
          { vin: "33333333333333333", drivers: [{}] },
          { vin: "44444444444444444" },
        ],
        drivers: [
          { name: "Domenic Iori", dob: "04/02/1984" },
          { name: "" },
          { name: "James Iori", dob: "04/22/1959" },
          {},
        ],
      } as unknown as GeminiExtractJson,
      "photo",
      "auto",
    );
    const applied = applyExtractedToSheet(
      "auto",
      emptySheetValues("auto"),
      mapped.fields.map((field) => ({
        fieldKey: field.fieldKey,
        normalizedValue: field.normalizedValue,
      })),
    );
    expect(applied.values.driver_1_name.value).toBe("Domenic Iori");
    expect(applied.values.driver_2_name.value).toBe("James Iori");
    expect(applied.values.driver_3_name?.value ?? "").toBe("");
    expect(applied.values.driver_4_name?.value ?? "").toBe("");
    expect(visibleUnitCount(applied.values, "driver")).toBe(2);
    expect(visibleUnitCount(applied.values, "vehicle")).toBe(4);
    expect(readStoredDriverCount(applied.values)).toBe(2);
    expect(mapped.fields.some((field) => field.normalizedValue === "Phantom One")).toBe(false);
    expect(mapped.fields.some((field) => field.normalizedValue === "Phantom Two")).toBe(false);
  });

  it("shows 2 driver cards and 4 vehicle cards when a leaked driver 4 is stored", () => {
    const values = {
      ...domenicSheet(),
      driver_4_name: cell("Phantom Driver"),
    };
    expect(initialRepeatableCount(values, "driver")).toBe(2);
    expect(initialRepeatableCount(values, "vehicle")).toBe(4);
    expect(repeatableBlockServerCount(values, "driver", "auto", true)).toBe(2);
    expect(repeatableBlockServerCount(values, "vehicle", "auto", true)).toBe(4);

    const drivers = renderToString(
      createElement(RepeatableUnitBlocks, {
        kind: "driver",
        product: "auto",
        values,
        extractedByKey: new Map(),
      }),
    );
    expect(drivers).toContain('data-ff-unit-block="driver-1"');
    expect(drivers).toContain('data-ff-unit-block="driver-2"');
    expect(drivers).not.toContain('data-ff-unit-block="driver-3"');
    expect(drivers).not.toContain('data-ff-unit-block="driver-4"');
    expect(drivers).toContain('name="auto_driver_count"');
    expect(drivers).toContain('value="2"');

    const vehicles = renderToString(
      createElement(RepeatableUnitBlocks, {
        kind: "vehicle",
        product: "auto",
        values,
        extractedByKey: new Map(),
        dealId: "deal-1",
        line: "auto",
      }),
    );
    expect(vehicles).toContain('data-ff-unit-block="vehicle-4"');
    expect(vehicles).not.toContain('name="auto_driver_count"');
  });
});
