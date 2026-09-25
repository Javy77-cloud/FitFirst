import { describe, expect, it } from "vitest";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { fillSheetFromDealDetails } from "@/lib/quote-sheet/fill-from-deal";
import { applyExtractedToSheet, applyPublicToSheet } from "@/lib/quote-sheet/apply";
import {
  clearCrossProductDealFacts,
  hideCrossProductDealFacts,
} from "@/lib/quote-sheet/product-fact-scope";
import { readFileSync } from "node:fs";

const dealDetails = {
  value: "309000",
  status: "check" as const,
  source: "agent" as const,
  sourceLabel: "deal details",
};

describe("product-scoped coverage and risk", () => {
  it("does not copy another product's Coverage A onto a multi-product sheet", () => {
    const result = fillSheetFromDealDetails(
      {
        isolateProductFacts: true,
        skipSharedPropertyAddress: true,
        primaryNamedInsured: "Gloria Martinez",
        secondaryNamedInsured: "Alex Martinez",
        currentCarrier: "Sibling Carrier",
        coverageAmount: 309000,
        propertyOneliner: "10358 NW 30th TER · Doral, FL 33172",
        quotingLine: "home",
        stored: {
          mailing_address: "10358 NW 30th TER",
          city: "Doral",
          state: "FL",
          zip: "33172",
          year_built: "2006",
          animals: "no",
          phone: "7863030316",
          co_applicant_first_name: "Alex",
          co_applicant_last_name: "Martinez",
        },
      },
      emptySheetValues("home"),
    );

    expect(result.values.named_insured.value).toBe("Gloria Martinez");
    expect(result.values.secondary_named_insured.value).toBe("Alex Martinez");
    expect(result.values.coverage_a?.value ?? "").toBe("");
    expect(result.filledKeys).not.toContain("coverage_a");
    expect(result.values.address1?.value ?? "").toBe("");
    expect(result.values.year_built?.value ?? "").toBe("");
    expect(result.values.animals?.value ?? "").toBe("");
    expect(result.values.current_carrier?.value ?? "").toBe("");
  });

  it("keeps the first product's address and still blocks the shared Coverage A", () => {
    const result = fillSheetFromDealDetails(
      {
        isolateProductFacts: true,
        primaryNamedInsured: "Gloria Martinez",
        coverageAmount: 309000,
        quotingLine: "home",
        stored: {
          mailing_address: "8944 Adriatico LN",
          city: "Kissimmee",
          state: "FL",
          zip: "34747",
        },
      },
      emptySheetValues("home"),
    );
    expect(result.values.coverage_a?.value ?? "").toBe("");
    expect(result.values.address1.value).toBe("8944 Adriatico LN");
    expect(result.values.named_insured.value).toBe("Gloria Martinez");
  });

  it("still copies Coverage A from Deal Details on a single-product sheet", () => {
    const result = fillSheetFromDealDetails(
      {
        primaryNamedInsured: "Rosa Castellanos",
        coverageAmount: 525000,
        quotingLine: "home",
      },
      emptySheetValues("home"),
    );
    expect(result.values.coverage_a.value).toBe("525000");
  });

  it("lets this product's declaration replace a deal-stamped Coverage A", () => {
    const existing = emptySheetValues("home");
    existing.coverage_a = dealDetails;
    existing.named_insured = {
      value: "Gloria Martinez",
      status: "check",
      source: "agent",
      sourceLabel: "deal details",
    };
    const result = applyExtractedToSheet("home", existing, [
      { fieldKey: "coverage_a", normalizedValue: "533000", sourceLabel: "dec page" },
      { fieldKey: "named_insured", normalizedValue: "SOMEONE ELSE", sourceLabel: "dec page" },
    ]);
    expect(result.values.coverage_a.value.replace(/[^0-9]/g, "")).toBe("533000");
    expect(result.values.coverage_a.source).toBe("extracted");
    expect(result.filledKeys).toContain("coverage_a");
    expect(result.values.named_insured.value).toBe("Gloria Martinez");
  });

  it("does not replace a Javy-tested Coverage A", () => {
    const existing = emptySheetValues("home");
    existing.coverage_a = { value: "321000", status: "confirmed", source: "javy" };
    const result = applyExtractedToSheet("home", existing, [
      { fieldKey: "coverage_a", normalizedValue: "533000", sourceLabel: "dec page" },
    ]);
    expect(result.values.coverage_a.value).toBe("321000");
    expect(result.values.coverage_a.source).toBe("javy");
  });

  it("lets property records replace a deal-stamped year built", () => {
    const existing = emptySheetValues("home");
    existing.year_built = { ...dealDetails, value: "2006" };
    const result = applyPublicToSheet("home", existing, [
      { fieldKey: "year_built", value: "1998", sourceLabel: "county" },
    ]);
    expect(result.values.year_built.value).toBe("1998");
    expect(result.values.year_built.source).toBe("public");
  });

  it("hides a sibling Coverage A on open and keeps this product's extracted amount", () => {
    const sibling = emptySheetValues("home");
    sibling.coverage_a = dealDetails;
    sibling.named_insured = {
      value: "Gloria Martinez",
      status: "check",
      source: "agent",
      sourceLabel: "deal details",
    };
    const hidden = hideCrossProductDealFacts(sibling, true);
    expect(hidden.coverage_a.value).toBe("");
    expect(hidden.named_insured.value).toBe("Gloria Martinez");

    const own = emptySheetValues("home");
    own.coverage_a = {
      value: "533000",
      status: "check",
      source: "extracted",
      sourceLabel: "dec page",
    };
    const kept = hideCrossProductDealFacts(own, true);
    expect(kept.coverage_a.value).toBe("533000");
    expect(hideCrossProductDealFacts(sibling, false).coverage_a.value).toBe("309000");
  });

  it("clears only deal-stamped risk facts before a product fill", () => {
    const sheet = emptySheetValues("home");
    sheet.coverage_a = dealDetails;
    sheet.year_built = {
      value: "1988",
      status: "check",
      source: "extracted",
      sourceLabel: "dec page",
    };
    const cleared = clearCrossProductDealFacts(sheet);
    expect(cleared.clearedKeys).toContain("coverage_a");
    expect(cleared.values.coverage_a.value).toBe("");
    expect(cleared.values.year_built.value).toBe("1988");
  });

  it("wires multi-product Field Risk to isolate facts and stay on the product", () => {
    const action = readFileSync("src/app/actions/quote-sheet.ts", "utf8");
    const page = readFileSync("src/app/deals/[id]/page.tsx", "utf8");
    const button = readFileSync("src/components/deal/master-sheet-fill-button.tsx", "utf8");
    expect(action).toMatch(/input\.isolateProductFacts = true/);
    expect(action).toMatch(/clearCrossProductDealFacts/);
    expect(button).toMatch(/fillStayHref\(\{ dealId, line: fillLine, product \}\)/);
    expect(page).toMatch(/hideCrossProductDealFacts/);
  });
});
