import { describe, expect, it } from "vitest";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { extractFieldsFromText, type ExtractedField } from "@/lib/extraction/extract";
import { nextCandidateTimesSeen, isCoverageALocked } from "@/lib/extraction/audit-helpers";
import { applyLearningToExtracted } from "@/lib/fill-learning/lookup";
import { DEAL_ID } from "@/lib/fixtures/ids";

describe("sep7cg blankAfterMatch pass-through", () => {
  it("keeps blankAfterMatch when mapping ExtractedField into applyExtractedToSheet", () => {
    const extracted: ExtractedField[] = [
      {
        fieldKey: "roof_shape",
        label: "Roof shape",
        rawValue: "",
        normalizedValue: "",
        confidence: 0.4,
        flagged: true,
        source: "uncertain",
        sourceDocTag: "dec page",
        blankAfterMatch: true,
        matchPath: "synonym",
        matchedSynonym: "Roof Shape",
        sourceLine: "Roof Shape:",
        sourceLineNo: 2,
        missReason: "no_delimiter",
      },
    ];
    // Simulate the runFill mapping that previously dropped blankAfterMatch
    const mapped = extracted.map((field) => ({
      fieldKey: field.fieldKey,
      normalizedValue: field.normalizedValue,
      sourceLabel: field.sourceDocTag,
      sourceDocTag: field.sourceDocTag,
      blankAfterMatch: field.blankAfterMatch,
      matchPath: field.matchPath,
      matchedSynonym: field.matchedSynonym,
      sourceLine: field.sourceLine,
      sourceLineNo: field.sourceLineNo,
      missReason: field.missReason,
    }));
    expect(mapped[0]?.blankAfterMatch).toBe(true);
    const applied = applyExtractedToSheet("home", emptySheetValues("home"), mapped);
    expect(applied.values.roof_shape.value).toBe("");
    expect(applied.values.roof_shape.status).toBe("missing");
    expect(applied.values.roof_shape.source).toBe("blank");
  });
});

describe("sep7cg synonym fields persist on ExtractedField", () => {
  it("carries matchedSynonym, sourceLine, and sourceLineNo from synonym path", () => {
    const extracted = extractFieldsFromText(
      "HOMEOWNERS DECLARATIONS\nNamed Insured: Elena Ruiz\nRoof Shape:\n",
      "dec",
    );
    const named = extracted.fields.find((f) => f.fieldKey === "named_insured");
    expect(named?.matchPath).toBe("synonym");
    expect(named?.matchedSynonym).toMatch(/Named Insured/i);
    expect(named?.sourceLine).toMatch(/Named Insured:\s*Elena Ruiz/i);
    expect(named?.sourceLineNo).toBeGreaterThan(0);
    expect(named?.normalizedValue).toMatch(/Elena/i);

    const roof = extracted.fields.find((f) => f.fieldKey === "roof_shape");
    expect(roof?.blankAfterMatch).toBe(true);
    expect(roof?.matchedSynonym).toBeTruthy();
    expect(roof?.missReason).toBe("no_delimiter");
  });
});

describe("sep7cg synonym candidate times_seen", () => {
  it("bumps times_seen on duplicate proposed_synonym + field_key", () => {
    const rows = [{ fieldKey: "roof_shape", proposedSynonym: "Roof Geometry", timesSeen: 1 }];
    expect(nextCandidateTimesSeen(rows, "roof_shape", "Roof Geometry")).toBe(2);
    expect(nextCandidateTimesSeen(rows, "roof_shape", "Other")).toBe(1);
  });
});

describe("sep7cg locked Cov A", () => {
  it("locks Ana Dib and javy Coverage A so learning never applies", () => {
    expect(isCoverageALocked(DEAL_ID, "coverage_a")).toBe(true);
    expect(isCoverageALocked("other-deal", "coverage_a", "javy")).toBe(true);
    expect(isCoverageALocked("other-deal", "coverage_a", "extracted")).toBe(false);
    expect(isCoverageALocked(DEAL_ID, "year_built")).toBe(false);

    const learned = applyLearningToExtracted(
      [{ fieldKey: "coverage_a", normalizedValue: "999000" }],
      [
        {
          docType: "dec",
          fieldKey: "coverage_a",
          extractedValue: "999000",
          correctedValue: "400000",
          locked: true,
        },
      ],
      { docType: "dec", dealId: DEAL_ID },
    );
    expect(learned[0]?.normalizedValue).toBe("999000");
  });
});
