import { describe, expect, it } from "vitest";
import { applyExtractedToSheet } from "./apply";
import { emptySheetValues } from "./catalog";
import { mismatchLine } from "./records-check";
import { toastForFillCounts } from "./fill-toast";

describe("sep7cr Fill improvements", () => {
  it("toast wording reports filled vs skipped", () => {
    expect(toastForFillCounts({ filledCount: 8, skippedCount: 9 })).toMatch(
      /Filled 8, skipped 9 already on sheet/,
    );
  });

  it("mismatch on agent cell appends records_check without overwrite", () => {
    const existing = emptySheetValues("home");
    existing.roof_year = { value: "04-21-16", status: "confirmed", source: "agent" };
    const result = applyExtractedToSheet(
      "home",
      existing,
      [{ fieldKey: "roof_year", normalizedValue: "2016", sourceLabel: "4pt inspection" }],
      { source: "extracted", recordMismatches: true, mismatchIncomingLabel: "4pt" },
    );
    expect(result.values.roof_year.value).toBe("04-21-16");
    expect(result.values.roof_year.source).toBe("agent");
    expect(result.skippedKeys).toContain("roof_year");
    expect(result.filledKeys).not.toContain("roof_year");
    expect(result.values.records_check?.value).toBe(
      mismatchLine("Roof year", "2016", "04-21-16", "agent", "4pt"),
    );
    expect(result.values.records_check?.value).toMatch(/4pt says 2016/);
    expect(result.values.records_check?.value).toMatch(/sheet says 04-21-16 \(from agent\)/);
  });

  it("four_point overwriteWeakCheck replaces extracted CHECK but not agent", () => {
    const existing = emptySheetValues("home");
    existing.stories = {
      value: "1",
      status: "check",
      source: "extracted",
      sourceLabel: "dec page",
    };
    existing.roof_year = { value: "2010", status: "confirmed", source: "agent" };
    existing.water_heater_year = {
      value: "2005",
      status: "check",
      source: "property-records",
      sourceLabel: "property records",
    };

    const result = applyExtractedToSheet(
      "home",
      existing,
      [
        { fieldKey: "stories", normalizedValue: "2", sourceLabel: "4pt inspection" },
        { fieldKey: "roof_year", normalizedValue: "2016", sourceLabel: "4pt inspection" },
        { fieldKey: "water_heater_year", normalizedValue: "2018", sourceLabel: "4pt inspection" },
        { fieldKey: "electrical_updated", normalizedValue: "2015", sourceLabel: "4pt inspection" },
      ],
      {
        source: "extracted",
        overwriteWeakCheck: true,
        recordMismatches: true,
        mismatchIncomingLabel: "4pt",
      },
    );

    expect(result.values.stories.value).toBe("2");
    expect(result.values.stories.status).toBe("check");
    expect(result.values.stories.source).toBe("extracted");
    expect(result.filledKeys).toContain("stories");
    expect(result.filledKeys).toContain("water_heater_year");
    expect(result.values.water_heater_year.value).toBe("2018");

    expect(result.values.roof_year.value).toBe("2010");
    expect(result.values.roof_year.source).toBe("agent");
    expect(result.skippedKeys).toContain("roof_year");
    expect(result.values.records_check?.value).toMatch(/Roof year: 4pt says 2016/);

    expect(result.values.electrical_updated.value).toBe("2015");
    expect(result.filledKeys).toContain("electrical_updated");
  });

  it("without overwriteWeakCheck, extracted CHECK stays and mismatch is flagged", () => {
    const existing = emptySheetValues("home");
    existing.stories = {
      value: "1",
      status: "check",
      source: "extracted",
      sourceLabel: "dec page",
    };
    const result = applyExtractedToSheet(
      "home",
      existing,
      [{ fieldKey: "stories", normalizedValue: "2", sourceLabel: "dec page" }],
      { source: "extracted", recordMismatches: true, mismatchIncomingLabel: "Gemini" },
    );
    expect(result.values.stories.value).toBe("1");
    expect(result.skippedKeys).toContain("stories");
    expect(result.values.records_check?.value).toMatch(/Gemini says 2/);
  });
});
