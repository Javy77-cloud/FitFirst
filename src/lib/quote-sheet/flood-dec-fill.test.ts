import { describe, expect, it } from "vitest";
import { applyExtractedToSheet, markFloodHasNfipFromExtract } from "@/lib/quote-sheet/apply";
import { blankSheetWithDefaults, emptySheetValues, extractKeyToSheetKey } from "@/lib/quote-sheet/catalog";
import { fillSheetFromDealDetails } from "@/lib/quote-sheet/fill-from-deal";
import {
  inferShopLine,
  looksLikeFloodPolicyDoc,
  trustSheetLineForFill,
} from "@/lib/ingest/identity";

/** Rosa Castellanos Flood DEC — values from Neon extracted_fields on the home-tagged copy. */
const ROSA_FLOOD_DEC_EXTRACT = [
  { fieldKey: "current_carrier", normalizedValue: "National Flood Insurance Program" },
  { fieldKey: "policy_number", normalizedValue: "SF00102905" },
  { fieldKey: "current_premium", normalizedValue: "1892" },
  { fieldKey: "effective_date", normalizedValue: "11/02/2025" },
  { fieldKey: "expiration_date", normalizedValue: "11/02/2026" },
  { fieldKey: "coverage_a", normalizedValue: "250000" },
];

describe("Flood DEC → Risk Profile Fill", () => {
  it("infers Flood for Flood-named DEC even when body prints Coverage A", () => {
    const text = `NATIONAL FLOOD INSURANCE PROGRAM
DECLARATIONS
Coverage A Building $250,000
Coverage C Contents $100,000
Policy Number SF00102905
Premium $1,892
Effective 11/02/2025 Expiration 11/02/2026`;
    expect(looksLikeFloodPolicyDoc("Flood policy 2025-2026SF00102905.PDF", text)).toBe(true);
    expect(inferShopLine(text, "Flood policy 2025-2026SF00102905.PDF", "dec")).toBe("flood");
    // Pre-fix: Coverage A made inferShopLine return home and Fill skipped the DEC.
    expect(inferShopLine(text, "Flood policy 2025-2026SF00102905.PDF", "dec")).not.toBe("home");
  });

  it("trusts Flood sheet for product-window / line:flood tagged DEC", () => {
    expect(
      trustSheetLineForFill({
        sheetLine: "flood",
        inferred: "home",
        docType: "dec",
        mimeType: "application/pdf",
        text: "Coverage A Building 250000 homeowners choice nearby OCR noise",
        filename: "Flood policy 2025-2026SF00102905.PDF",
        productWindowMatch: true,
      }),
    ).toBe(true);
    expect(
      trustSheetLineForFill({
        sheetLine: "flood",
        inferred: "home",
        docType: "dec",
        filename: "scan.pdf",
        text: "Coverage A 250000",
        tags: ["line:flood", "form:FLOOD"],
      }),
    ).toBe(true);
  });

  it("maps Gemini policy_number onto Flood nfip_policy", () => {
    expect(extractKeyToSheetKey("flood", "policy_number")).toBe("nfip_policy");
    expect(extractKeyToSheetKey("home", "policy_number")).toBe("policy_number");
  });

  it("fills has_nfip, nfip_policy, premium, expiration, flood carrier from Flood DEC extract", () => {
    const existing = blankSheetWithDefaults("flood");
    expect(existing.has_nfip.value).toBe("no");

    const applied = applyExtractedToSheet("flood", existing, ROSA_FLOOD_DEC_EXTRACT, {
      source: "extracted",
    });

    expect(applied.values.has_nfip.value).toBe("yes");
    expect(applied.values.nfip_policy.value).toBe("SF00102905");
    expect(applied.values.current_premium.value).toBe("1892");
    expect(applied.values.expiration_date.value).toBe("11/02/2026");
    // effective_date may keep the New-business default (empty-only fill) — DEC still fills the rest.
    expect(applied.values.current_carrier.value).toBe("National Flood Insurance Program");
    expect(applied.filledKeys).toEqual(
      expect.arrayContaining([
        "has_nfip",
        "nfip_policy",
        "current_premium",
        "expiration_date",
        "current_carrier",
      ]),
    );
  });

  it("markFloodHasNfipFromExtract flips default no → yes", () => {
    const values = blankSheetWithDefaults("flood");
    const filled: string[] = ["nfip_policy"];
    values.nfip_policy = {
      value: "SF00102905",
      status: "check",
      source: "extracted",
      sourceLabel: "dec page",
    };
    markFloodHasNfipFromExtract(values, filled, [
      { fieldKey: "policy_number", normalizedValue: "SF00102905" },
    ]);
    expect(values.has_nfip.value).toBe("yes");
    expect(filled).toContain("has_nfip");
  });

  it("does not copy HO deal carrier or Coverage A onto Flood sheet", () => {
    const result = fillSheetFromDealDetails(
      {
        primaryNamedInsured: "Rosa Castellanos",
        currentCarrier: "Homeowners Choice Property & Casualty Insurance Company, Inc.",
        coverageAmount: 525000,
        quotingLine: "flood",
      },
      emptySheetValues("flood"),
    );
    expect(result.values.current_carrier?.value ?? "").toBe("");
    expect(result.values.coverage_a?.value ?? "").toBe("");
    expect(result.filledKeys).not.toContain("current_carrier");
    expect(result.filledKeys).not.toContain("coverage_a");
  });

  it("still copies deal carrier onto Home sheet", () => {
    const result = fillSheetFromDealDetails(
      {
        primaryNamedInsured: "Rosa Castellanos",
        currentCarrier: "Homeowners Choice Property & Casualty Insurance Company, Inc.",
        coverageAmount: 525000,
        quotingLine: "home",
      },
      emptySheetValues("home"),
    );
    expect(result.values.current_carrier.value).toBe(
      "Homeowners Choice Property & Casualty Insurance Company, Inc.",
    );
    expect(result.values.coverage_a.value).toBe("525000");
  });
});
