import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { applyVinFactsToSheet } from "./apply";
import { mapVinDecodeToFacts, parseDecodeVinValuesRow } from "./map";
import { isDecodableVin, normalizeVin, titleCaseMake } from "./normalize";
import { toastForVinDecode } from "./toast";
import { collectSheetVehicleVins } from "./vehicles";
import {
  DECODE_VIN_LABEL,
  NHTSA_VPIC_LABEL,
  NHTSA_VPIC_SETTINGS_NOTE,
} from "./types";
import {
  MASTER_FILL_SKIP_AUTO_PROPERTY,
  MASTER_FILL_STEP_VIN,
  masterFillStepsForLine,
} from "@/lib/quote-sheet/master-fill";
import { fieldsForLine } from "@/lib/quote-sheet/catalog";
import { repeatableFieldKey } from "@/lib/quote-sheet/repeatable-units";

const HEATHER_VIN = "5J8TC2H40SL034711";

function cell(
  value: string,
  status: QuoteSheetFieldValue["status"] = "missing",
  source: QuoteSheetFieldValue["source"] = "blank",
  sourceLabel?: string,
): QuoteSheetFieldValue {
  return { value, status, source, sourceLabel };
}

describe("Auto NHTSA vPIC VIN decode (sep7jh)", () => {
  it("normalizes and accepts Heather VIN", () => {
    expect(normalizeVin(" 5j8tc2h40sl034711 ")).toBe(HEATHER_VIN);
    expect(isDecodableVin(HEATHER_VIN)).toBe(true);
    expect(isDecodableVin("SHORT")).toBe(false);
    expect(titleCaseMake("ACURA")).toBe("Acura");
  });

  it("maps DecodeVinValues Make/Model/Year/Fuel/Body/Engine onto sheet keys", () => {
    const decoded = parseDecodeVinValuesRow({
      Make: "ACURA",
      Model: "RDX",
      ModelYear: "2025",
      Trim: "RDX",
      Series: "",
      BodyClass: "Sport Utility Vehicle [SUV]/Multipurpose Vehicle [MPV]",
      VehicleType: "MULTIPURPOSE PASSENGER VEHICLE (MPV)",
      FuelTypePrimary: "Gasoline",
      DisplacementL: "2.0",
      EngineCylinders: "4",
      EngineHP: "272",
      ABS: "Standard",
      AirBagLocFront: "1st Row (Driver and Passenger)",
      ErrorCode: "0",
      ErrorText: "0 - VIN decoded clean.",
    });
    const facts = mapVinDecodeToFacts(decoded, {
      year: "vehicle_year",
      make: "vehicle_make",
      model: "vehicle_model",
      fuel: "vehicle_fuel_type",
      bodyClass: "vehicle_body_class",
      engine: "vehicle_engine",
      safety: "vehicle_safety", // no catalog home yet — still maps when key given
    });
    expect(facts).toEqual(
      expect.arrayContaining([
        { sheetKey: "vehicle_year", value: "2025", sourceLabel: NHTSA_VPIC_LABEL },
        { sheetKey: "vehicle_make", value: "Acura", sourceLabel: NHTSA_VPIC_LABEL },
        { sheetKey: "vehicle_model", value: "RDX", sourceLabel: NHTSA_VPIC_LABEL },
        { sheetKey: "vehicle_fuel_type", value: "Gasoline", sourceLabel: NHTSA_VPIC_LABEL },
        {
          sheetKey: "vehicle_body_class",
          value: "Sport Utility Vehicle [SUV]/Multipurpose Vehicle [MPV]",
          sourceLabel: NHTSA_VPIC_LABEL,
        },
        { sheetKey: "vehicle_engine", value: "2.0L · 4 cyl · 272 hp", sourceLabel: NHTSA_VPIC_LABEL },
        {
          sheetKey: "vehicle_safety",
          value: "ABS: Standard · Front airbag: 1st Row (Driver and Passenger)",
          sourceLabel: NHTSA_VPIC_LABEL,
        },
      ]),
    );
  });

  it("catalog exposes fuel / body / engine on Auto Vehicle; safety left for next tip", () => {
    const fields = fieldsForLine("auto");
    expect(fields.find((f) => f.key === "vehicle_fuel_type")?.group).toBe("Vehicle");
    expect(fields.find((f) => f.key === "vehicle_body_class")?.group).toBe("Vehicle");
    expect(fields.find((f) => f.key === "vehicle_engine")?.group).toBe("Vehicle");
    expect(fields.find((f) => f.key === "vehicle_safety")).toBeUndefined();
    expect(repeatableFieldKey("vehicle", 1, "fuel_type")).toBe("vehicle_fuel_type");
    expect(repeatableFieldKey("vehicle", 2, "engine")).toBe("vehicle_2_engine");
  });

  it("empty-only: fills blanks as CHECK · NHTSA vPIC, never overwrites dec/agent/confirmed", () => {
    const existing: Record<string, QuoteSheetFieldValue> = {
      vin: cell(HEATHER_VIN, "check", "extracted", "dec page"),
      vehicle_year: cell("2025", "check", "extracted", "dec page"),
      vehicle_make: cell("ACURA", "confirmed", "agent"),
      vehicle_model: cell("", "missing", "blank"),
      vehicle_fuel_type: cell("", "missing", "blank"),
    };
    const facts = mapVinDecodeToFacts(
      {
        make: "ACURA",
        model: "RDX",
        modelYear: "2025",
        trim: "",
        series: "",
        bodyClass: "SUV",
        vehicleType: "",
        fuelTypePrimary: "Gasoline",
        engine: "",
        displacementL: "2.0",
        engineCylinders: "4",
        engineHP: "",
        abs: "",
        airBagLocFront: "",
        errorCode: "0",
        errorText: "",
      },
      {
        year: "vehicle_year",
        make: "vehicle_make",
        model: "vehicle_model",
        fuel: "vehicle_fuel_type",
        bodyClass: "vehicle_body_class",
        engine: "vehicle_engine",
      },
    );
    const applied = applyVinFactsToSheet(existing, facts);
    expect(applied.filledKeys.sort()).toEqual(
      ["vehicle_body_class", "vehicle_engine", "vehicle_fuel_type", "vehicle_model"].sort(),
    );
    expect(applied.skippedKeys.sort()).toEqual(["vehicle_make", "vehicle_year"]);
    expect(applied.values.vehicle_model?.sourceLabel).toBe(NHTSA_VPIC_LABEL);
    expect(applied.values.vehicle_year).toEqual(existing.vehicle_year);
    expect(applied.values.vehicle_make).toEqual(existing.vehicle_make);
  });

  it("collects multi-VIN units with per-vehicle key bags", () => {
    const values: Record<string, QuoteSheetFieldValue> = {
      vin: cell(HEATHER_VIN, "check", "extracted", "dec page"),
      vehicle_2_vin: cell("1HGCM82633A004352", "missing", "blank"),
    };
    const list = collectSheetVehicleVins(values);
    expect(list.map((v) => v.vin)).toEqual([HEATHER_VIN, "1HGCM82633A004352"]);
    expect(list[0].keys.year).toBe("vehicle_year");
    expect(list[0].keys.fuel).toBe("vehicle_fuel_type");
    expect(list[1].keys.make).toBe("vehicle_2_make");
    expect(list[1].keys.engine).toBe("vehicle_2_engine");
  });

  it("Auto Fill steps are Deal → Docs → VIN; Home keeps Property; Auto skips property/FEMA", () => {
    expect(masterFillStepsForLine("auto").map((s) => s.id)).toEqual(["deal", "docs", "vin"]);
    expect(masterFillStepsForLine("home").map((s) => s.id)).toEqual([
      "deal",
      "property",
      "docs",
    ]);
    expect(MASTER_FILL_STEP_VIN).toMatch(/NHTSA vPIC/);
    expect(MASTER_FILL_SKIP_AUTO_PROPERTY).toMatch(/skips property/i);

    const root = join(process.cwd(), "src");
    const action = readFileSync(join(root, "app/actions/quote-sheet.ts"), "utf8");
    const fillBtn = readFileSync(join(root, "components/deal/master-sheet-fill-button.tsx"), "utf8");
    const decodeBtn = readFileSync(join(root, "components/deal/decode-vin-button.tsx"), "utf8");
    const units = readFileSync(join(root, "components/deal/repeatable-unit-blocks.tsx"), "utf8");

    expect(action).toMatch(/runFillFromVinDecode/);
    expect(action).toMatch(/step === "vin"/);
    expect(action).toMatch(/MASTER_FILL_SKIP_AUTO_PROPERTY/);
    expect(action).toMatch(/Never property\/FEMA on Auto|never Home property/);
    expect(fillBtn).toMatch(/masterFillStepsForLine/);
    expect(decodeBtn).toMatch(/DECODE_VIN_LABEL/);
    expect(units).toMatch(/DecodeVinButton/);
    expect(DECODE_VIN_LABEL).toBe("Decode VIN");
    expect(NHTSA_VPIC_SETTINGS_NOTE).toMatch(/no api key/i);
    expect(toastForVinDecode({ filledCount: 3, skippedCount: 0 })).toMatch(/NHTSA vPIC/);
  });

  it("aborts a hung NHTSA fetch instead of hanging", async () => {
    const { clearVinDecodeCache, decodeVinValues, NHTSA_TIMEOUT_MESSAGE } = await import("./client");
    clearVinDecodeCache();
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) =>
      await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    const result = await decodeVinValues(HEATHER_VIN, fetchImpl as typeof fetch, {
      timeoutMs: 20,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe(NHTSA_TIMEOUT_MESSAGE);
  }, 10_000);
});
