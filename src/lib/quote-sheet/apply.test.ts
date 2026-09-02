import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { MELBOURNE_DEC_TEXT } from "@/lib/fixtures/sample-melbourne-dec";
import { extractFieldsFromText } from "@/lib/extraction/extract";
import { anaHomeSheetValues } from "./ana-home";
import {
  applyExtractedToSheet,
  fillDealHeaderBlanks,
  mergeAgentEdits,
  neverCheckCoverageA,
} from "./apply";
import { emptySheetValues } from "./catalog";

describe("quote sheet fill — blanks only", () => {
  it("seeds Ana Home with a Javy-tested Cov A that is confirmed, never CHECK", () => {
    const values = anaHomeSheetValues(fixture.risk);
    expect(values.coverage_a.value).toBe("321000");
    expect(values.coverage_a.status).toBe("confirmed");
    expect(values.coverage_a.source).toBe("javy");
    expect(neverCheckCoverageA("coverage_a", values.coverage_a)).toBe(true);
    expect(values.address1.value).toBe("1098 Adige Ct SE");
    expect(values.year_built.value).toBe("1989");
    expect(values.year_built.status).toBe("confirmed");
  });

  it("never overwrites Ana Cov A or other filled fields when a dec is filled", () => {
    const existing = anaHomeSheetValues(fixture.risk);
    const extracted = extractFieldsFromText(
      `Location: 999 Fake St\nYear Built: 1970\nCoverage A Dwelling: $999,000\nCity: Orlando`,
    );
    const result = applyExtractedToSheet("home", existing, extracted.fields);
    expect(result.values.coverage_a.value).toBe("321000");
    expect(result.values.coverage_a.status).toBe("confirmed");
    expect(result.values.coverage_a.source).toBe("javy");
    expect(result.values.address1.value).toBe("1098 Adige Ct SE");
    expect(result.values.year_built.value).toBe("1989");
    expect(result.skippedKeys).toContain("coverage_a");
    expect(result.skippedKeys).toContain("address1");
  });

  it("fills year, address, and Cov A on a blank Home sheet from a sample text dec", () => {
    const extracted = extractFieldsFromText(MELBOURNE_DEC_TEXT);
    const result = applyExtractedToSheet("home", emptySheetValues("home"), extracted.fields);
    expect(result.values.year_built.value).toBe("2004");
    expect(result.values.year_built.status).toBe("check");
    expect(result.values.address1.value).toBe("412 Harbor Isle Dr");
    expect(result.values.address1.status).toBe("check");
    expect(result.values.coverage_a.value).toBe("275000");
    expect(result.values.coverage_a.status).toBe("check");
    expect(result.values.coverage_a.source).toBe("extracted");
    expect(result.values.current_carrier.value).toBe("Citizens");
    expect(result.values.state.value).toBe("FL");
    expect(result.values.zip.value).toBe("32935");
    expect(result.filledKeys).toEqual(
      expect.arrayContaining(["year_built", "address1", "coverage_a"]),
    );
  });

  it("never overwrites a value the agent already typed", () => {
    const existing = emptySheetValues("home");
    existing.year_built = { value: "1999", status: "confirmed", source: "agent" };
    const extracted = extractFieldsFromText(MELBOURNE_DEC_TEXT);
    const result = applyExtractedToSheet("home", existing, extracted.fields);
    expect(result.values.year_built.value).toBe("1999");
    expect(result.values.year_built.source).toBe("agent");
    expect(result.skippedKeys).toContain("year_built");
    expect(result.values.coverage_a.value).toBe("275000");
  });

  it("copies glance fields onto deal header BLANKS only", () => {
    const extracted = extractFieldsFromText(MELBOURNE_DEC_TEXT);
    const { values } = applyExtractedToSheet("home", emptySheetValues("home"), extracted.fields);
    values.state = { value: "FL", status: "check", source: "extracted" };
    values.zip = { value: "32935", status: "check", source: "extracted" };

    const filled = fillDealHeaderBlanks(
      { coverageAmount: null, propertyOneliner: null, currentCarrier: null },
      values,
    );
    expect(filled.coverageAmount).toBe(275000);
    expect(filled.propertyOneliner).toContain("412 Harbor Isle");
    expect(filled.currentCarrier).toBe("Citizens");

    const skipped = fillDealHeaderBlanks(
      {
        coverageAmount: 321000,
        propertyOneliner: "already set",
        currentCarrier: "American Integrity",
      },
      values,
    );
    expect(skipped.coverageAmount).toBe(321000);
    expect(skipped.propertyOneliner).toBe("already set");
    expect(skipped.currentCarrier).toBe("American Integrity");
  });

  it("keeps Javy Cov A confirmed when the agent saves the same number", () => {
    const existing = anaHomeSheetValues(fixture.risk);
    const next = mergeAgentEdits(existing, { coverage_a: "321000" }, "home");
    expect(next.coverage_a.source).toBe("javy");
    expect(next.coverage_a.status).toBe("confirmed");
  });
});
