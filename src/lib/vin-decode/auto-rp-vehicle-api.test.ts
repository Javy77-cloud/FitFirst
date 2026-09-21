import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { applyVinFactsToSheet } from "./apply";
import { coerceVinDecodeValues, mapVinDecodeToFacts, parseDecodeVinValuesRow } from "./map";
import { orchestrateVinDecodeFill } from "./orchestrate";
import { clearVinDecodeCache, isNhtsaTransportFailure } from "./client";
import { valueToPaint } from "./paint";
import {
  NHTSA_RP_VEHICLE_GAPS,
  NHTSA_VPIC_LABEL,
  NHTSA_WIRED_RP_VEHICLE_KEYS,
} from "./types";
import {
  blankVinCoreFacts,
  decodableVinsChanged,
  isVehicleVinSheetKey,
  shouldRunVinDecode,
} from "./vehicles";

const HEATHER_VIN = "5J8TC2H40SL034711";

function cell(
  value: string,
  status: QuoteSheetFieldValue["status"] = "missing",
  source: QuoteSheetFieldValue["source"] = "blank",
): QuoteSheetFieldValue {
  return { value, status, source };
}

function heatherRow(extra: Record<string, string> = {}) {
  return {
    Make: "ACURA",
    Model: "RDX",
    ModelYear: "2025",
    BodyClass: "Sport Utility Vehicle [SUV]/Multipurpose Vehicle [MPV]",
    FuelTypePrimary: "Gasoline",
    DisplacementL: "2",
    EngineCylinders: "4",
    EngineHP: "272",
    EngineModel: "K20C4",
    BasePrice: "",
    ErrorCode: "0",
    ErrorText: "0 - VIN decoded clean.",
    ...extra,
  };
}

describe("Auto RP vehicle fields from NHTSA vPIC", () => {
  it("wires year, make, model, body, fuel, and engine; records fields vPIC cannot supply", () => {
    expect([...NHTSA_WIRED_RP_VEHICLE_KEYS]).toEqual([
      "vehicle_year",
      "vehicle_make",
      "vehicle_model",
      "vehicle_body_class",
      "vehicle_fuel_type",
      "vehicle_engine",
    ]);
    expect(NHTSA_RP_VEHICLE_GAPS.map((gap) => gap.sheetKey)).toEqual([
      "vehicle_usage",
      "vehicle_ownership",
      "vehicle_ownership_length",
      "vehicle_lienholder",
      "purchased_new",
      "original_cost_new",
      "annual_miles",
    ]);
  });

  it("builds engine from displacement, cylinders, HP, and engine model", () => {
    const decoded = parseDecodeVinValuesRow(heatherRow());
    const facts = mapVinDecodeToFacts(decoded, {
      year: "vehicle_year",
      make: "vehicle_make",
      model: "vehicle_model",
      fuel: "vehicle_fuel_type",
      bodyClass: "vehicle_body_class",
      engine: "vehicle_engine",
    });
    expect(facts.find((fact) => fact.sheetKey === "vehicle_engine")).toEqual({
      sheetKey: "vehicle_engine",
      value: "2L · 4 cyl · 272 hp · K20C4",
      sourceLabel: NHTSA_VPIC_LABEL,
    });
    expect(facts.find((fact) => fact.sheetKey === "vehicle_year")?.value).toBe("2025");
    expect(facts.find((fact) => fact.sheetKey === "vehicle_make")?.value).toBe("Acura");
    expect(facts.find((fact) => fact.sheetKey === "vehicle_model")?.value).toBe("RDX");
    expect(facts.find((fact) => fact.sheetKey === "vehicle_fuel_type")?.value).toBe("Gasoline");
    expect(facts.find((fact) => fact.sheetKey === "vehicle_body_class")?.value).toMatch(/SUV/);
    const keys = facts.map((fact) => fact.sheetKey);
    for (const gap of NHTSA_RP_VEHICLE_GAPS) {
      expect(keys).not.toContain(gap.sheetKey);
    }
  });

  it("does not overwrite an agent-typed engine when the VIN decode runs again", () => {
    const decoded = parseDecodeVinValuesRow(heatherRow());
    const facts = mapVinDecodeToFacts(decoded, {
      year: "vehicle_year",
      make: "vehicle_make",
      model: "vehicle_model",
      engine: "vehicle_engine",
    });
    const existing: Record<string, QuoteSheetFieldValue> = {
      vehicle_engine: cell("2.0 turbo", "confirmed", "agent"),
      vehicle_year: cell("", "missing", "blank"),
    };
    const applied = applyVinFactsToSheet(existing, facts);
    expect(applied.values.vehicle_engine).toEqual(existing.vehicle_engine);
    expect(applied.skippedKeys).toContain("vehicle_engine");
    expect(applied.filledKeys).toContain("vehicle_year");
  });

  it("treats a new or edited decodable VIN as a decode trigger", () => {
    const blank = {};
    const set = { vin: cell(HEATHER_VIN, "confirmed", "agent") };
    expect(decodableVinsChanged(blank, set)).toEqual(["vin"]);
    expect(decodableVinsChanged(set, set)).toEqual([]);
    expect(
      decodableVinsChanged(set, {
        vin: cell(" 5j8tc2h40sl034711 ", "confirmed", "agent"),
      }),
    ).toEqual([]);
    expect(
      decodableVinsChanged(set, {
        vin: cell(HEATHER_VIN, "confirmed", "agent"),
        vehicle_2_vin: cell("1HGCM82633A004352", "confirmed", "agent"),
      }),
    ).toEqual(["vehicle_2_vin"]);
    expect(decodableVinsChanged(set, { vin: cell("", "missing", "blank") })).toEqual([]);
    expect(isVehicleVinSheetKey("vin")).toBe(true);
    expect(isVehicleVinSheetKey("vehicle_3_vin")).toBe(true);
    expect(isVehicleVinSheetKey("vehicle_engine")).toBe(false);
  });

  it("merges a live-shaped DecodeVinValues payload into blank year/model/body/fuel/engine", async () => {
    clearVinDecodeCache();
    const fetchImpl = async () =>
      new Response(JSON.stringify({ Results: [heatherRow()] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    const existing: Record<string, QuoteSheetFieldValue> = {
      vin: cell(HEATHER_VIN, "check", "extracted"),
      vehicle_make: cell("Acura", "check", "extracted"),
      vehicle_usage: cell("Commute", "confirmed", "agent"),
      vehicle_engine: cell("", "missing", "blank"),
      annual_miles: cell("", "missing", "blank"),
      original_cost_new: cell("", "missing", "blank"),
      vehicle_lienholder: cell("", "missing", "blank"),
    };
    const result = await orchestrateVinDecodeFill({
      values: existing,
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(result.status).toBe("ok");
    expect(result.values.vehicle_engine?.value).toBe("2L · 4 cyl · 272 hp · K20C4");
    expect(result.values.vehicle_engine?.source).toBe("public");
    expect(result.values.vehicle_engine?.status).toBe("check");
    expect(result.values.vehicle_make).toEqual(existing.vehicle_make);
    expect(result.values.vehicle_usage?.value).toBe("Commute");
    expect(result.values.annual_miles?.value ?? "").toBe("");
    expect(result.values.original_cost_new?.value ?? "").toBe("");
    expect(result.values.vehicle_lienholder?.value ?? "").toBe("");
    expect(result.values.vehicle_year?.value).toBe("2025");
    expect(result.values.vehicle_model?.value).toBe("RDX");
    expect(result.values.vehicle_fuel_type?.value).toBe("Gasoline");
    expect(result.values.vehicle_body_class?.value).toMatch(/SUV/);
    expect(result.filledKeys).toEqual(
      expect.arrayContaining([
        "vehicle_year",
        "vehicle_model",
        "vehicle_body_class",
        "vehicle_fuel_type",
        "vehicle_engine",
      ]),
    );
    expect(result.filledKeys).not.toContain("vehicle_make");
    for (const gap of NHTSA_RP_VEHICLE_GAPS) {
      expect(result.filledKeys).not.toContain(gap.sheetKey);
    }
  });

  it("runs vPIC after an Auto VIN save and after Gemini lands a VIN", () => {
    const action = readFileSync("src/app/actions/quote-sheet.ts", "utf8");
    const persist = action.slice(
      action.indexOf("export async function persistQuoteSheetValues"),
      action.indexOf("export async function applySavedSheetToDeal"),
    );
    expect(persist).toMatch(/shouldRunVinDecode/);
    expect(persist).toMatch(/runFillFromVinDecode/);
    expect(persist).toMatch(/vinDecode/);
    expect(persist).toMatch(/line === "auto"/);

    const fill = action.slice(
      action.indexOf("export async function runFillQuoteSheet"),
      action.indexOf("async function syncNamedInsuredFromExtract"),
    );
    expect(fill).toMatch(/isVehicleVinSheetKey/);
    expect(fill).toMatch(/runFillFromVinDecode/);

    const prompt = readFileSync("src/lib/extraction/gemini/prompt.ts", "utf8");
    expect(prompt).toMatch(/"vehicle_usage"/);
    expect(prompt).toMatch(/"annual_miles"/);
    expect(prompt).toMatch(/"vin"/);

    const decodeBtn = readFileSync("src/components/deal/decode-vin-button.tsx", "utf8");
    expect(decodeBtn).toMatch(/data-ff-decode-vin-error/);
    expect(decodeBtn).toMatch(/recoverVinDecodeFromBrowser/);
    const fillBtn = readFileSync("src/components/deal/master-sheet-fill-button.tsx", "utf8");
    expect(fillBtn).toMatch(/recoverVinDecodeFromBrowser/);
  });

  it("retries decode when the VIN is unchanged but core facts are still blank", () => {
    const saved = { vin: cell(HEATHER_VIN, "confirmed", "agent") };
    expect(decodableVinsChanged(saved, saved)).toEqual([]);
    expect(blankVinCoreFacts(saved)).toEqual(
      expect.arrayContaining([
        "vehicle_year",
        "vehicle_make",
        "vehicle_model",
        "vehicle_body_class",
        "vehicle_fuel_type",
        "vehicle_engine",
      ]),
    );
    expect(shouldRunVinDecode(saved, saved)).toBe(true);
    const filled = {
      ...saved,
      vehicle_year: cell("2025", "check", "public"),
      vehicle_make: cell("Acura", "check", "public"),
      vehicle_model: cell("RDX", "check", "public"),
      vehicle_body_class: cell("SUV", "check", "public"),
      vehicle_fuel_type: cell("Gasoline", "check", "public"),
      vehicle_engine: cell("2L", "check", "public"),
    };
    expect(shouldRunVinDecode(filled, filled)).toBe(false);
  });

  it("does not wipe a non-empty cell just because its status is missing", () => {
    const existing: Record<string, QuoteSheetFieldValue> = {
      vehicle_year: cell("2024", "missing", "extracted"),
      vehicle_make: cell("", "missing", "blank"),
    };
    const applied = applyVinFactsToSheet(existing, [
      { sheetKey: "vehicle_year", value: "2025", sourceLabel: NHTSA_VPIC_LABEL },
      { sheetKey: "vehicle_make", value: "Acura", sourceLabel: NHTSA_VPIC_LABEL },
    ]);
    expect(applied.values.vehicle_year).toEqual(existing.vehicle_year);
    expect(applied.skippedKeys).toContain("vehicle_year");
    expect(applied.filledKeys).toEqual(["vehicle_make"]);
  });

  it("uses a browser-fetched decode without calling vPIC again", async () => {
    clearVinDecodeCache();
    const decoded = coerceVinDecodeValues(parseDecodeVinValuesRow(heatherRow()));
    expect(decoded?.modelYear).toBe("2025");
    const fetchImpl = async () => {
      throw new Error("server must not call vPIC when a decode is already in hand");
    };
    const result = await orchestrateVinDecodeFill({
      values: { vin: cell(HEATHER_VIN, "confirmed", "agent") },
      fetchImpl: fetchImpl as typeof fetch,
      prefetched: decoded ? [{ vin: HEATHER_VIN, values: decoded }] : [],
    });
    expect(result.status).toBe("ok");
    expect(result.values.vehicle_year?.value).toBe("2025");
    expect(result.values.vehicle_make?.value).toBe("Acura");
    expect(result.values.vehicle_model?.value).toBe("RDX");
    expect(result.values.vehicle_engine?.value).toMatch(/272 hp/);
  });

  it("paints server fills into empty inputs and names transport failures", () => {
    expect(valueToPaint("", "2025")).toBe("2025");
    expect(valueToPaint("2019", "2025")).toBeNull();
    expect(valueToPaint("  ", "Acura")).toBe("Acura");
    expect(isNhtsaTransportFailure("NHTSA vPIC timed out. Try again.")).toBe(true);
    expect(isNhtsaTransportFailure("NHTSA vPIC HTTP 503")).toBe(true);
    expect(isNhtsaTransportFailure("NHTSA vPIC could not decode that VIN.")).toBe(false);
    expect(isNhtsaTransportFailure("Add a 17-character VIN on the Auto sheet first.")).toBe(false);
  });
});
