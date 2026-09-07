import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { MELBOURNE_DEC_TEXT } from "@/lib/fixtures/sample-melbourne-dec";
import { PHOTO_DEC_TEXT } from "@/lib/fixtures/sample-photo-dec";
import { extractFieldsFromText } from "@/lib/extraction/extract";
import { anaHomeSheetValues } from "./ana-home";
import {
  applyExtractedToSheet,
  applyPublicToSheet,
  fillContactBlanksFromSheet,
  fillDealHeaderBlanks,
  fillPolicyBlanksFromSheet,
  mergeAgentEdits,
  neverCheckCoverageA,
} from "./apply";
import { GARCIA_DEC_TEXT } from "@/lib/fixtures/sample-garcia-dec";
import { emptySheetValues } from "./catalog";
import { applyLearningToExtracted } from "@/lib/fill-learning/lookup";
import { DEAL_ID } from "@/lib/fixtures/ids";

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

  it("does not let fill-learning remap Ana Coverage A before apply", () => {
    const existing = anaHomeSheetValues(fixture.risk);
    const learned = applyLearningToExtracted(
      [{ fieldKey: "coverage_a", normalizedValue: "999000" }],
      [
        {
          docType: "dec",
          fieldKey: "coverage_a",
          extractedValue: "999000",
          correctedValue: "400000",
        },
      ],
      { docType: "dec", dealId: DEAL_ID },
    );
    expect(learned[0]?.normalizedValue).toBe("999000");
    const result = applyExtractedToSheet("home", existing, learned);
    expect(result.values.coverage_a.value).toBe("321000");
    expect(result.values.coverage_a.source).toBe("javy");
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

  it("maps 30+ Garcia HO3 fields onto a blank Home sheet as CHECK", () => {
    const extracted = extractFieldsFromText(GARCIA_DEC_TEXT);
    const result = applyExtractedToSheet("home", emptySheetValues("home"), extracted.fields);
    expect(result.filledKeys.length).toBeGreaterThanOrEqual(30);
    expect(result.values.coverage_a.source).toBe("extracted");
    expect(result.values.coverage_a.sourceLabel).toBe("dec page");
    expect(result.values.coverage_b.value).toBe("28500");
  });

  it("gap-fills public facts only on blanks and never uses Zestimate as Cov A", () => {
    const existing = emptySheetValues("home");
    existing.coverage_a = { value: "285000", status: "check", source: "extracted", sourceLabel: "Uploaded dec" };
    existing.year_built = { value: "1996", status: "check", source: "extracted", sourceLabel: "Uploaded dec" };
    const result = applyPublicToSheet("home", existing, [
      { fieldKey: "square_feet", value: "1840", sourceLabel: "Listing facts", kind: "listing" },
      { fieldKey: "coverage_a", value: "294000", sourceLabel: "Zillow Zestimate", kind: "zestimate" },
      { fieldKey: "year_built", value: "1980", sourceLabel: "Brevard PA", kind: "county" },
    ]);
    expect(result.values.square_feet.value).toBe("1840");
    expect(result.values.square_feet.source).toBe("public");
    expect(result.values.coverage_a.value).toBe("285000");
    expect(result.values.year_built.value).toBe("1996");
  });

  it("copies named insured onto a blank deal header and leaves typed names alone", () => {
    const extracted = extractFieldsFromText(GARCIA_DEC_TEXT);
    const { values } = applyExtractedToSheet("home", emptySheetValues("home"), extracted.fields);
    const filled = fillDealHeaderBlanks(
      {
        coverageAmount: null,
        propertyOneliner: null,
        currentCarrier: null,
        primaryNamedInsured: null,
      },
      values,
    );
    expect(filled.primaryNamedInsured).toMatch(/Francisco Javier Garcia/i);
    const kept = fillDealHeaderBlanks(
      {
        coverageAmount: null,
        propertyOneliner: null,
        currentCarrier: null,
        primaryNamedInsured: "Javy typed this",
      },
      values,
    );
    expect(kept.primaryNamedInsured).toBe("Javy typed this");
  });

  it("copies Contact and Policy blanks on bind without overwriting typed values or inventing SSN", () => {
    const extracted = extractFieldsFromText(GARCIA_DEC_TEXT);
    const { values } = applyExtractedToSheet("home", emptySheetValues("home"), extracted.fields);
    const contact = fillContactBlanksFromSheet(
      {
        firstName: "Bound",
        lastName: "Client",
        mailingAddress: null,
        city: null,
        state: "FL",
        zip: null,
      },
      values,
    );
    expect(contact.firstName).toMatch(/Francisco/i);
    expect(contact.lastName).toMatch(/Garcia/i);
    expect(contact.mailingAddress).toBe("100 Sample Dec Ln");
    expect(contact.zip).toBe("32909");

    const existing = fillContactBlanksFromSheet(
      {
        firstName: "Ana",
        lastName: "Dib",
        mailingAddress: "1098 Adige Ct SE",
        city: "Palm Bay",
        state: "FL",
        zip: "32909",
      },
      values,
    );
    expect(existing.firstName).toBe("Ana");
    expect(existing.mailingAddress).toBe("1098 Adige Ct SE");

    const policy = fillPolicyBlanksFromSheet(
      { policyNumber: null, coverageA: null, premium: null, effectiveDate: null, expirationDate: null },
      values,
    );
    expect(policy.policyNumber).toMatch(/CIT-HO3/);
    expect(policy.coverageA).toBe(285000);
    expect(policy.premium).toBe(4860);

    const typed = fillPolicyBlanksFromSheet(
      {
        policyNumber: "AGENT-1",
        coverageA: 321000,
        premium: 99,
        effectiveDate: null,
        expirationDate: null,
      },
      values,
    );
    expect(typed.policyNumber).toBe("AGENT-1");
    expect(typed.coverageA).toBe(321000);
    expect(typed.premium).toBe(99);
  });

  it("keeps Javy Cov A confirmed when the agent saves the same number", () => {
    const existing = anaHomeSheetValues(fixture.risk);
    const next = mergeAgentEdits(existing, { coverage_a: "321000" }, "home");
    expect(next.coverage_a.source).toBe("javy");
    expect(next.coverage_a.status).toBe("confirmed");
  });

  it("round-trips every submitted sheet field so reload can return the saved values", () => {
    const existing = emptySheetValues("home", "homeowners");
    const submitted = {
      applicant_name: "Jordan Lee",
      city: "Melbourne",
      occupancy: "Owner",
      notes: "Call after 5",
    };
    const saved = mergeAgentEdits(existing, submitted, "home", "homeowners");
    expect(saved.applicant_name).toEqual({ value: "Jordan Lee", status: "confirmed", source: "agent" });
    expect(saved.city.value).toBe("Melbourne");
    expect(saved.occupancy.value).toBe("Owner");
    expect(saved.notes.value).toBe("Call after 5");
    const reloaded = mergeAgentEdits(saved, submitted, "home", "homeowners");
    expect(reloaded.applicant_name.value).toBe("Jordan Lee");
    expect(reloaded.city.value).toBe("Melbourne");
  });
});
