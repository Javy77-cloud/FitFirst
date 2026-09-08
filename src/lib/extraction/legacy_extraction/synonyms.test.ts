/** LEGACY — not imported by Fill. */
import { describe, expect, it } from "vitest";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { extractFieldsFromText } from "./extract-text";
import {
  SOURCE_DOC_TAGS,
  inferSourceDocKind,
  isUnusableExtractValue,
  matchSynonymsOnLine,
  sourceDocumentTag,
  stripCheckboxMarkers,
  valueAfterDelimiter,
} from "./synonyms";

describe("synonym match", () => {
  it("maps printed aliases onto the target field", () => {
    const name = matchSynonymsOnLine("Applicant's Legal Name: Ana Unbound");
    expect(name).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldKey: "named_insured", value: "Ana Unbound", blank: false }),
      ]),
    );

    const phone = matchSynonymsOnLine("Primary Phone = 321-555-0100");
    expect(phone[0]).toMatchObject({ fieldKey: "phone", value: "321-555-0100" });

    const roof = matchSynonymsOnLine("Roof Surfacing Material: Architectural shingle");
    expect(roof[0]).toMatchObject({ fieldKey: "roof_covering", value: "Architectural shingle" });

    const covA = matchSynonymsOnLine("Coverage A – Dwelling: $321,000");
    expect(covA[0]).toMatchObject({ fieldKey: "coverage_a", value: "$321,000" });
  });
});

describe("value-after-delimiter", () => {
  it("takes everything after the first colon, dash, or equals — never the label", () => {
    expect(valueAfterDelimiter(": hip")).toEqual({ value: "hip", hasDelimiter: true });
    expect(valueAfterDelimiter(" - Jane Doe")).toEqual({ value: "Jane Doe", hasDelimiter: true });
    expect(valueAfterDelimiter("= owner")).toEqual({ value: "owner", hasDelimiter: true });
    expect(valueAfterDelimiter(" hip")).toEqual({ value: "", hasDelimiter: false });

    const hit = matchSynonymsOnLine("Roof Shape: hip");
    expect(hit[0]?.value).toBe("hip");
    expect(hit[0]?.value.toLowerCase()).not.toContain("roof shape");
  });

  it("strips checkbox markers from the value", () => {
    expect(stripCheckboxMarkers("☐ None")).toBe("None");
    expect(stripCheckboxMarkers("[ ] impact ☑")).toBe("impact");
    const hit = matchSynonymsOnLine("Opening Protection: ☐ None");
    expect(hit[0]).toMatchObject({ fieldKey: "opening_protection", value: "None", blank: false });
  });
});

describe("yellow blank", () => {
  it("leaves the cell blank when no value follows the label", () => {
    const empty = matchSynonymsOnLine("Roof Shape:");
    expect(empty[0]).toMatchObject({ fieldKey: "roof_shape", value: "", blank: true });

    const noDelim = matchSynonymsOnLine("What is the roof shape");
    expect(noDelim.some((hit) => hit.fieldKey === "roof_shape" && !hit.blank)).toBe(false);

    const question = matchSynonymsOnLine("Roof Shape: what is the roof shape");
    expect(question[0]).toMatchObject({ fieldKey: "roof_shape", value: "", blank: true });
    expect(isUnusableExtractValue("activities")).toBe(true);
    expect(isUnusableExtractValue("what is the roof shape")).toBe(true);

    const extracted = extractFieldsFromText(
      "HOMEOWNERS DECLARATIONS\nRoof Shape:\nActivities: backyard\n",
      "dec",
    );
    expect(extracted.fields.find((field) => field.fieldKey === "roof_shape")?.normalizedValue ?? "").toBe(
      "",
    );
    expect(extracted.fields.find((field) => field.fieldKey === "roof_shape")?.blankAfterMatch).toBe(true);
    expect(extracted.fields.some((field) => /activit/i.test(field.normalizedValue))).toBe(false);

    const applied = applyExtractedToSheet("home", emptySheetValues("home"), extracted.fields);
    expect(applied.values.roof_shape.value).toBe("");
    expect(applied.values.roof_shape.status).toBe("missing");
  });
});

describe("longer-synonym wins", () => {
  it("prefers the longer, more specific synonym when two match the same line", () => {
    const construction = matchSynonymsOnLine("Construction Type: Frame");
    expect(construction).toHaveLength(1);
    expect(construction[0]).toMatchObject({
      fieldKey: "construction",
      synonym: "Construction Type",
      value: "Frame",
    });

    const deck = matchSynonymsOnLine("Roof Deck Attachment: 8d @ 6\"");
    expect(deck).toHaveLength(1);
    expect(deck[0]?.synonym).toBe("Roof Deck Attachment");
    expect(deck[0]?.value).toBe("8d @ 6\"");
    expect(["roof_deck", "roof_deck_attachment"]).toContain(deck[0]?.fieldKey);

    const name = matchSynonymsOnLine("Named Insured: Elena Ruiz");
    expect(name).toHaveLength(1);
    expect(name[0]).toMatchObject({ fieldKey: "named_insured", synonym: "Named Insured", value: "Elena Ruiz" });
  });
});

describe("source tags", () => {
  it("tags 4pt inspection, dec page, wind mitigation, and related insured", () => {
    expect(sourceDocumentTag("four_point")).toBe("4pt inspection");
    expect(sourceDocumentTag("dec")).toBe("dec page");
    expect(sourceDocumentTag("wind_mit")).toBe("wind mitigation");
    expect(sourceDocumentTag("related_insured")).toBe("related insured");
    expect(SOURCE_DOC_TAGS.four_point).toBe("4pt inspection");

    expect(inferSourceDocKind("FOUR POINT INSPECTION\nYear Built: 2014")).toBe("four_point");
    expect(inferSourceDocKind("WIND MITIGATION\nOIR-B1-1802")).toBe("wind_mit");
    expect(inferSourceDocKind("HOMEOWNERS DECLARATIONS\nCoverage A: $1")).toBe("dec");
    expect(inferSourceDocKind("Applicant's Legal Name: Test")).toBe("related_insured");

    const dec = extractFieldsFromText("HOMEOWNERS DECLARATIONS\nCoverage A: $321,000\n", "dec");
    expect(dec.fields.find((field) => field.fieldKey === "coverage_a")?.sourceDocTag).toBe("dec page");

    const four = extractFieldsFromText("FOUR POINT INSPECTION\nYear Built: 2014\n", "four_point");
    expect(four.fields.find((field) => field.fieldKey === "year_built")?.sourceDocTag).toBe(
      "4pt inspection",
    );

    const wind = extractFieldsFromText("WIND MITIGATION\nOIR-B1-1802\nRoof Shape: hip\n", "wind_mit");
    expect(wind.fields.find((field) => field.fieldKey === "roof_shape")?.sourceDocTag).toBe(
      "wind mitigation",
    );

    const related = extractFieldsFromText(
      "Related insured packet\nApplicant's Legal Name: Jordan Lee\n",
      "related_insured",
    );
    expect(related.fields.find((field) => field.fieldKey === "named_insured")?.sourceDocTag).toBe(
      "related insured",
    );

    const applied = applyExtractedToSheet("home", emptySheetValues("home"), dec.fields);
    expect(applied.values.coverage_a.sourceLabel).toBe("dec page");
    expect(applied.values.coverage_a.value).toBe("321000");
  });
});
