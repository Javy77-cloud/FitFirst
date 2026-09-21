import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { applyVinFactsToSheet } from "./apply";
import { mapVinDecodeToFacts, parseDecodeVinValuesRow } from "./map";
import { orchestrateVinDecodeFill } from "./orchestrate";
import { clearVinDecodeCache } from "./client";
import {
  NHTSA_RP_VEHICLE_GAPS,
  NHTSA_VPIC_LABEL,
  NHTSA_WIRED_RP_VEHICLE_KEYS,
} from "./types";
import { decodableVinsChanged, isVehicleVinSheetKey } from "./vehicles";

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
  it("wires engine and records the seven fields vPIC cannot supply", () => {
    expect([...NHTSA_WIRED_RP_VEHICLE_KEYS]).toEqual(["vehicle_engine"]);
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

  it("merges a live-shaped DecodeVinValues payload into blank engine only", async () => {
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
    expect(result.filledKeys).toContain("vehicle_engine");
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
    expect(persist).toMatch(/decodableVinsChanged/);
    expect(persist).toMatch(/runFillFromVinDecode/);
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
  });
});
