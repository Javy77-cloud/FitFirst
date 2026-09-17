import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LifeAppetiteHelper } from "@/components/deal/life-appetite-helper";
import { parseLifeUwMatrixCsv, predictLifeAppetite } from "./appetite";
import {
  filterLifeProductsByRequestedType,
  lifeCatalogProductTypes,
  resolveDealLifeProductType,
} from "./product-type";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Life Markets product-type filter", () => {
  const matrix = parseLifeUwMatrixCsv(readFileSync("data/appetite/fitfirst-life-uw-matrix.csv", "utf8"));

  it("classifies MATRIX catalog names, including mixed Term + UL/IUL sleeves", () => {
    expect(lifeCatalogProductTypes("Strong Foundation Term", "strong_foundation")).toEqual(["Term"]);
    expect(lifeCatalogProductTypes("Term Life Express", "term_life_express")).toEqual(["Term"]);
    expect(lifeCatalogProductTypes("Living Promise WL", "living_promise")).toEqual(["Whole Life"]);
    expect(lifeCatalogProductTypes("Eagle Select WL", "eagle_select")).toEqual(["Whole Life"]);
    expect(lifeCatalogProductTypes("GIWL", "giwl")).toEqual(["Whole Life"]);
    expect(lifeCatalogProductTypes("SimplyNow Legacy/Max SIWL", "simplynow")).toEqual(["Whole Life"]);
    expect(lifeCatalogProductTypes("Ensured Legacy Final Expense", "ensured_legacy")).toEqual([
      "Final Expense",
    ]);
    expect(lifeCatalogProductTypes("Sure Legacy", "sure_legacy")).toEqual([]);
    expect(lifeCatalogProductTypes("Final Expense Express", "final_expense_express")).toEqual([
      "Final Expense",
    ]);
    expect(lifeCatalogProductTypes("Pathsetter IUL", "pathsetter")).toEqual(["Indexed Universal Life"]);
    expect(lifeCatalogProductTypes("Home Certainty Term & Express UL/IUL", "home_certainty")).toEqual([
      "Term",
      "Universal Life",
      "Indexed Universal Life",
    ]);
    expect(lifeCatalogProductTypes("HMS 100/125/CBO Term / IUL", "hms_term_iul")).toEqual([
      "Term",
      "Indexed Universal Life",
    ]);
    expect(lifeCatalogProductTypes("Smart UL/IUL", "smart_ul")).toEqual([
      "Universal Life",
      "Indexed Universal Life",
    ]);
    expect(lifeCatalogProductTypes("Critical Advantage", "critical_advantage")).toEqual([]);
  });

  it("resolves Tyler-style Term Life deals from pipeline / policy form, not a sheet default", () => {
    expect(
      resolveDealLifeProductType({
        productId: "life_term",
        quotingForm: "Term Life",
        policySubType: "Term Life",
        sheetProductType: "Term",
      }),
    ).toBe("Term");
    expect(
      resolveDealLifeProductType({
        productId: "life_whole",
        quotingForm: "Whole Life",
        policySubType: "Whole Life",
        sheetProductType: "Term",
      }),
    ).toBe("Whole Life");
    expect(
      resolveDealLifeProductType({
        productId: "life_final",
        quotingForm: "Final Expense",
        sheetProductType: "Term",
      }),
    ).toBe("Final Expense");
    expect(
      resolveDealLifeProductType({
        productId: "life_iul",
        quotingForm: "IUL",
      }),
    ).toBe("Indexed Universal Life");
    expect(
      resolveDealLifeProductType({
        productId: "life_term",
        quotingForm: "Term Life",
        lifeProductType: "Whole Life",
      }),
    ).toBe("Whole Life");
    expect(resolveDealLifeProductType({ sheetProductType: "final expense" })).toBe("Final Expense");
    expect(resolveDealLifeProductType({ productId: "homeowners", quotingForm: "HO3" })).toBe("");
  });

  it("keeps Term Markets on term products and drops WL / final expense", () => {
    const names = filterLifeProductsByRequestedType(matrix.products, "Term").map((row) => row.productName);
    expect(names).toEqual(
      expect.arrayContaining([
        "Strong Foundation Term",
        "Term Life Express",
        "Home Certainty Term & Express UL/IUL",
        "EasyTrack Digital Term",
      ]),
    );
    expect(names).not.toEqual(expect.arrayContaining(["Living Promise WL"]));
    expect(names).not.toEqual(expect.arrayContaining(["Eagle Select WL"]));
    expect(names).not.toEqual(expect.arrayContaining(["Ensured Legacy Final Expense"]));
    expect(names).not.toEqual(expect.arrayContaining(["Final Expense Express"]));
    expect(names).not.toEqual(expect.arrayContaining(["Sure Legacy"]));
    expect(names.some((name) => /whole life|\bwl\b|giwl|siwl|final expense/i.test(name))).toBe(false);

    const predicted = predictLifeAppetite({
      medicalConditions: "Asthma",
      tobaccoStatus: "Never",
      productId: "life_term",
      quotingForm: "Term Life",
      policySubType: "Term Life",
      productType: "Term",
      matrix,
    });
    expect(predicted.requestedProductType).toBe("Term");
    const slugs = predicted.predictions.map((row) => row.productSlug);
    expect(slugs).toEqual(expect.arrayContaining(["strong_foundation", "term_life_express", "home_certainty"]));
    expect(slugs).not.toContain("living_promise");
    expect(slugs).not.toContain("ensured_legacy");
    expect(slugs).not.toContain("final_expense_express");
    expect(slugs).not.toContain("eagle_select");
    expect(slugs).not.toContain("giwl");

    const html = renderToString(
      createElement(LifeAppetiteHelper, {
        selectedLabels: predicted.selectedLabels,
        tobaccoStatus: "Never",
        predictions: predicted.predictions,
        coverageNote: predicted.coverageNote,
        requestedProductType: predicted.requestedProductType,
      }),
    );
    expect(html).toContain("Showing Term products only");
    expect(html).toContain("Strong Foundation Term");
    expect(html).toContain("Term Life Express");
    expect(html).not.toContain("Living Promise");
    expect(html).not.toContain("Ensured Legacy");
    expect(html).not.toContain("Sure Legacy");
    expect(html).toContain('data-ff-life-appetite-product-type="Term"');
  });

  it("filters Whole Life and Final Expense requests the same way", () => {
    const whole = predictLifeAppetite({
      dateOfBirth: "1970-01-01",
      productId: "life_whole",
      quotingForm: "Whole Life",
      matrix,
    });
    expect(whole.requestedProductType).toBe("Whole Life");
    const wholeNames = whole.predictions.map((row) => row.productName);
    expect(wholeNames).toEqual(expect.arrayContaining(["Living Promise WL", "Eagle Select WL", "GIWL"]));
    expect(wholeNames.some((name) => /term/i.test(name))).toBe(false);
    expect(wholeNames).not.toContain("Ensured Legacy Final Expense");
    expect(wholeNames).not.toContain("Term Life Express");

    const finalExpense = predictLifeAppetite({
      dateOfBirth: "1970-01-01",
      productId: "life_final",
      quotingForm: "Final Expense",
      matrix,
    });
    expect(finalExpense.predictions.map((row) => row.productSlug).sort()).toEqual([
      "ensured_legacy",
      "final_expense_express",
    ]);
    expect(finalExpense.predictions.some((row) => row.productName.includes("WL"))).toBe(false);

    const iul = predictLifeAppetite({
      dateOfBirth: "1970-01-01",
      productId: "life_iul",
      quotingForm: "IUL",
      matrix,
    });
    expect(iul.predictions.map((row) => row.productSlug)).toEqual(
      expect.arrayContaining(["pathsetter", "quantum", "home_certainty", "smart_ul", "hms_term_iul"]),
    );
    expect(iul.predictions.map((row) => row.productSlug)).not.toContain("living_promise");
    expect(iul.predictions.map((row) => row.productSlug)).not.toContain("strong_foundation");
  });

  it("wires the deal workspace Markets tab to the resolved Life product type", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/resolveDealLifeProductType/);
    expect(page).toMatch(/requestedLifeProductType/);
    expect(page).toMatch(/productType: requestedLifeProductType/);
    expect(page).toMatch(/requestedProductType=\{lifeAppetite\.requestedProductType\}/);
    expect(page).toMatch(/lifeProductType: dealValues\.life_product_type/);
  });
});
