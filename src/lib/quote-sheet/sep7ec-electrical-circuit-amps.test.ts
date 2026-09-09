import { describe, expect, it } from "vitest";
import { applyExtractedToSheet } from "./apply";
import { emptySheetValues, fieldsForLine } from "./catalog";
import { extractFieldsFromText } from "@/lib/extraction/legacy_extraction/extract-text";
import { matchSynonymsOnLine } from "@/lib/extraction/legacy_extraction/synonyms";
import { mapGeminiJsonToFields, sheetKeysForGeminiKey } from "@/lib/extraction/gemini/map";
import { HOME_SHEET_FIELDS } from "@/lib/lifecycle/quote-sheet";

describe("sep7ec Electrical Circuit Amps", () => {
  it("catalog exposes electrical_circuit_amps on home HO/LL 4-point group", () => {
    const field = fieldsForLine("home", "homeowners").find((f) => f.key === "electrical_circuit_amps");
    expect(field).toMatchObject({
      key: "electrical_circuit_amps",
      label: "Electrical Circuit Amps",
      group: "4-point",
      input: "number",
      extractKey: "electrical_circuit_amps",
    });
    expect(field?.products).toEqual(expect.arrayContaining(["homeowners", "landlord"]));
  });

  it("synonym total amps = 200 amps fills sheet with 200", () => {
    const hit = matchSynonymsOnLine("total amps = 200 amps", "four_point");
    expect(hit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldKey: "electrical_circuit_amps", value: "200 amps", blank: false }),
      ]),
    );

    const extracted = extractFieldsFromText(
      "FOUR-POINT INSPECTION\nElectrical\ntotal amps = 200 amps\n",
      "four_point",
    );
    const amps = extracted.fields.find((f) => f.fieldKey === "electrical_circuit_amps");
    expect(amps?.normalizedValue).toBe("200");

    const applied = applyExtractedToSheet("home", emptySheetValues("home"), extracted.fields);
    expect(applied.values.electrical_circuit_amps.value).toBe("200");
    expect(applied.filledKeys).toContain("electrical_circuit_amps");
  });

  it("Gemini maps electrical_circuit_amps onto the sheet key", () => {
    expect(sheetKeysForGeminiKey("electrical_circuit_amps")).toEqual(["electrical_circuit_amps"]);
    const result = mapGeminiJsonToFields(
      { electrical_circuit_amps: { value: "200", confidence: 0.95 } },
      "four_point",
    );
    const byKey = Object.fromEntries(result.fields.map((f) => [f.fieldKey, f]));
    expect(byKey.electrical_circuit_amps.normalizedValue).toBe("200");
  });

  it("home super-copy / Gaya HOME_SHEET_FIELDS includes the key", () => {
    expect(HOME_SHEET_FIELDS.some((f) => f.key === "electrical_circuit_amps")).toBe(true);
  });
});
