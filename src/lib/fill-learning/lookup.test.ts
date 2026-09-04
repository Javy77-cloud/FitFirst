import { describe, expect, it } from "vitest";
import { DEAL_ID } from "@/lib/fixtures/ids";
import {
  applyLearningToExtracted,
  isSafeAgencyCorrection,
  normalizeFillValue,
  pickLatestSafeCorrection,
  type FillLearningHint,
} from "./lookup";

const cbs: FillLearningHint = {
  docType: "dec",
  fieldKey: "construction",
  extractedValue: "CBS",
  correctedValue: "masonry",
  loggedAt: "2026-08-01T12:00:00.000Z",
};

const roof: FillLearningHint = {
  docType: "wind_mit",
  fieldKey: "roof_year",
  extractedValue: "2014",
  correctedValue: "2019",
  loggedAt: "2026-08-02T12:00:00.000Z",
};

const laterCbs: FillLearningHint = {
  docType: "dec",
  fieldKey: "construction",
  extractedValue: "CBS",
  correctedValue: "masonry veneer",
  loggedAt: "2026-09-01T12:00:00.000Z",
};

describe("fill learning lookup", () => {
  it("normalizes spacing and case for matching", () => {
    expect(normalizeFillValue("  Comp   Shingle ")).toBe("comp shingle");
  });

  it("treats matching extracted strings as a safe agency-wide remap", () => {
    expect(isSafeAgencyCorrection(cbs, "cbs")).toBe(true);
    expect(isSafeAgencyCorrection(cbs, "frame")).toBe(false);
    expect(isSafeAgencyCorrection({ ...cbs, correctedValue: "CBS" }, "CBS")).toBe(false);
  });

  it("prefers the latest same doc_type + field_key correction", () => {
    const hit = pickLatestSafeCorrection([cbs, laterCbs], {
      docType: "dec",
      fieldKey: "construction",
      extractedValue: "CBS",
    });
    expect(hit?.correctedValue).toBe("masonry veneer");
  });

  it("does not apply a roof-year remap to a different extracted year", () => {
    const hit = pickLatestSafeCorrection([roof], {
      docType: "wind_mit",
      fieldKey: "roof_year",
      extractedValue: "1995",
    });
    expect(hit).toBeNull();
  });

  it("never remaps Ana Coverage A", () => {
    const hit = pickLatestSafeCorrection(
      [
        {
          docType: "dec",
          fieldKey: "coverage_a",
          extractedValue: "999000",
          correctedValue: "400000",
          loggedAt: "2026-09-01T12:00:00.000Z",
        },
      ],
      {
        docType: "dec",
        fieldKey: "coverage_a",
        extractedValue: "999000",
        dealId: DEAL_ID,
      },
    );
    expect(hit).toBeNull();
  });

  it("rewrites extracted values before the heuristic is applied", () => {
    const next = applyLearningToExtracted(
      [
        { fieldKey: "construction", normalizedValue: "CBS" },
        { fieldKey: "roof_year", normalizedValue: "2014" },
        { fieldKey: "year_built", normalizedValue: "2014" },
      ],
      [cbs, roof],
      { docType: "dec" },
    );
    expect(next[0]?.normalizedValue).toBe("masonry");
    expect(next[0]?.sourceLabel).toBe("Fill learning · dec");
    expect(next[1]?.normalizedValue).toBe("2014");
    expect(next[2]?.normalizedValue).toBe("2014");
  });

  it("applies wind-mit roof year when the extracted year matches", () => {
    const next = applyLearningToExtracted(
      [{ fieldKey: "roof_year", normalizedValue: "2014" }],
      [roof],
      { docType: "wind_mit" },
    );
    expect(next[0]?.normalizedValue).toBe("2019");
  });
});
