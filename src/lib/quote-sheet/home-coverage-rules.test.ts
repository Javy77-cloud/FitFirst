import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/deals/deal-1",
}));

import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { sheetProductForQuotingForm } from "@/lib/deals/deal-line";
import { applyExtractedToSheet, mergeAgentEdits } from "./apply";
import { emptySheetValues, fieldsForLine } from "./catalog";
import {
  COVERAGE_A_RCE_LABEL,
  liveValuesAfterManualCoverageA,
  HOME_COVERAGE_DEFAULTS,
} from "./home-coverage-rules";
import {
  AOP_DEDUCTIBLE_OPTIONS,
  COVERAGE_B_OPTIONS,
  COVERAGE_C_OPTIONS,
  COVERAGE_D_OPTIONS,
  COVERAGE_E_OPTIONS,
  COVERAGE_F_OPTIONS,
  HURRICANE_DEDUCTIBLE_OPTIONS,
  ORDINANCE_OR_LAW_OPTIONS,
  WIND_HAIL_DEDUCTIBLE_OPTIONS,
} from "./sheet-defaults";

function cell(value: string, source: QuoteSheetFieldValue["source"] = "extracted"): QuoteSheetFieldValue {
  return { value, status: source === "agent" ? "confirmed" : "check", source, sourceLabel: "dec page" };
}

describe("home coverage dropdowns", () => {
  it("uses the exact option sets on HO3, HO5, DP, and MHO sheets", () => {
    expect(sheetProductForQuotingForm("HO3")).toBe("homeowners");
    expect(sheetProductForQuotingForm("HO5")).toBe("homeowners");
    expect(sheetProductForQuotingForm("MHO")).toBe("homeowners");
    expect(sheetProductForQuotingForm("DP3")).toBe("landlord");
    expect(sheetProductForQuotingForm("DP1")).toBe("landlord");

    for (const product of ["homeowners", "landlord"] as const) {
      const byKey = Object.fromEntries(fieldsForLine("home", product).map((field) => [field.key, field]));
      expect(byKey.coverage_b.options).toEqual([...COVERAGE_B_OPTIONS]);
      expect(byKey.coverage_c.options).toEqual([...COVERAGE_C_OPTIONS]);
      expect(byKey.coverage_d.options).toEqual([...COVERAGE_D_OPTIONS]);
      expect(byKey.coverage_e.options).toEqual([...COVERAGE_E_OPTIONS]);
      expect(byKey.coverage_f.options).toEqual([...COVERAGE_F_OPTIONS]);
      expect(byKey.ordinance_or_law.options).toEqual([...ORDINANCE_OR_LAW_OPTIONS]);
      expect(byKey.hurricane_deductible.options).toEqual([...HURRICANE_DEDUCTIBLE_OPTIONS]);
      expect(byKey.aop_deductible.options).toEqual([...AOP_DEDUCTIBLE_OPTIONS]);
      expect(byKey.wind_hail_deductible.options).toEqual([...WIND_HAIL_DEDUCTIBLE_OPTIONS]);
      expect(byKey.sinkhole_deductible.input).toBeUndefined();
      expect(byKey.sinkhole_deductible.options).toBeUndefined();
      expect(byKey.coverage_a.input).toBe("number");
    }

    const renters = Object.fromEntries(fieldsForLine("home", "renters").map((field) => [field.key, field]));
    expect(renters.coverage_a).toBeUndefined();
    expect(renters.coverage_b).toBeUndefined();
  });
});

describe("declaration coverage copy vs defaults", () => {
  it("copies a complete declaration and does not let defaults override", () => {
    const applied = applyExtractedToSheet(
      "home",
      emptySheetValues("home", "homeowners"),
      [
        { fieldKey: "coverage_a", normalizedValue: "$280,000" },
        { fieldKey: "coverage_b", normalizedValue: "28000" },
        { fieldKey: "coverage_c", normalizedValue: "50%" },
        { fieldKey: "coverage_d", normalizedValue: "56000" },
        { fieldKey: "coverage_e", normalizedValue: "300000" },
        { fieldKey: "coverage_f", normalizedValue: "$2,000" },
        { fieldKey: "ordinance_or_law", normalizedValue: "10%" },
        { fieldKey: "hurricane_deductible", normalizedValue: "5%" },
        { fieldKey: "aop_deductible", normalizedValue: "2500" },
        { fieldKey: "wind_hail_deductible", normalizedValue: "5%" },
        { fieldKey: "sinkhole_deductible", normalizedValue: "No" },
        { fieldKey: "water_backup", normalizedValue: "10000" },
      ],
      { docType: "dec" },
    );

    expect(applied.values.coverage_a.value).toBe("280000");
    expect(applied.values.coverage_a.source).toBe("extracted");
    expect(applied.values.coverage_b.value).toBe("10%");
    expect(applied.values.coverage_c.value).toBe("50%");
    expect(applied.values.coverage_d.value).toBe("20%");
    expect(applied.values.coverage_e.value).toBe("$300k");
    expect(applied.values.coverage_f.value).toBe("$2k");
    expect(applied.values.ordinance_or_law.value).toBe("10%");
    expect(applied.values.hurricane_deductible.value).toBe("5%");
    expect(applied.values.aop_deductible.value).toBe("2500");
    expect(applied.values.wind_hail_deductible.value).toBe("5%");
    expect(applied.values.sinkhole_deductible.value).toBe("No");
    expect(applied.values.water_backup.value).toBe("$10,000");
    expect(applied.values.coverage_b.sourceLabel).not.toBe("default");
    expect(applied.values.ordinance_or_law.value).not.toBe(HOME_COVERAGE_DEFAULTS.ordinance_or_law);
    expect(applied.values.sinkhole_deductible.value).not.toBe("10%");
  });

  it("keeps an off-list declaration amount instead of substituting the default", () => {
    const applied = applyExtractedToSheet(
      "home",
      emptySheetValues("home", "homeowners"),
      [
        { fieldKey: "coverage_a", normalizedValue: "285000" },
        { fieldKey: "coverage_b", normalizedValue: "12%" },
        { fieldKey: "coverage_e", normalizedValue: "250000" },
      ],
      { docType: "dec" },
    );
    expect(applied.values.coverage_b.value).toBe("12%");
    expect(applied.values.coverage_e.value).toBe("250000");
    expect(applied.values.coverage_c.value).toBe("25%");
    expect(applied.values.coverage_c.sourceLabel).toBe("default");
  });

  it("requires manual Coverage A when the declaration omits it and defaults the other coverages", () => {
    const applied = applyExtractedToSheet(
      "home",
      emptySheetValues("home", "landlord"),
      [
        { fieldKey: "named_insured", normalizedValue: "Rosa Castellanos" },
        { fieldKey: "hurricane_deductible", normalizedValue: "2%" },
        { fieldKey: "aop_deductible", normalizedValue: "$1,000" },
      ],
      { docType: "policy" },
    );
    expect(applied.values.coverage_a.value).toBe("");
    expect(applied.values.coverage_a.value).not.toMatch(/\d/);
    expect(applied.values.coverage_b.value).toBe("2%");
    expect(applied.values.coverage_c.value).toBe("25%");
    expect(applied.values.coverage_d.value).toBe("10%");
    expect(applied.values.coverage_e.value).toBe("$300k");
    expect(applied.values.coverage_f.value).toBe("$1k");
    expect(applied.values.ordinance_or_law.value).toBe("25%");
    expect(applied.values.water_backup.value).toBe("$5,000");
    expect(applied.values.sinkhole_deductible.value).toBe("10%");
    expect(applied.values.hurricane_deductible.value).toBe("2%");
    expect(applied.values.aop_deductible.value).toBe("$1,000");
    expect(applied.values.wind_hail_deductible.value).toBe("1000");
    expect(applied.values.wind_hail_deductible.sourceLabel).toMatch(/AOP/);
  });

  it("does not invent Coverage A on a liability-only MHO extract", () => {
    const applied = applyExtractedToSheet("home", emptySheetValues("home", "homeowners"), [
      { fieldKey: "named_insured", normalizedValue: "Catherine Garcia" },
      { fieldKey: "coverage_e", normalizedValue: "100000" },
      { fieldKey: "coverage_f", normalizedValue: "5000" },
      { fieldKey: "year_built", normalizedValue: "" },
    ]);
    expect(applied.values.coverage_a.value).toBe("");
    expect(applied.values.year_built.value).toBe("");
    expect(applied.values.coverage_e.value).toBe("$100k");
    expect(applied.values.coverage_e.source).toBe("extracted");
    expect(applied.values.coverage_f.value).toBe("$5k");
    expect(applied.values.coverage_b.value).toBe("2%");
    expect(applied.values.coverage_b.sourceLabel).toBe("default");
  });

  it("does not default coverages from a wind-mit upload", () => {
    const applied = applyExtractedToSheet(
      "home",
      emptySheetValues("home", "homeowners"),
      [{ fieldKey: "roof_year", normalizedValue: "2018" }],
      { docType: "wind_mit" },
    );
    expect(applied.values.roof_year.value).toBe("2018");
    expect(applied.values.coverage_a.value).toBe("");
    expect(applied.values.coverage_b.value).toBe("");
    expect(applied.values.coverage_e.value).toBe("");
    expect(applied.values.sinkhole_deductible.value).toBe("");
    expect(applied.values.hurricane_deductible.value).toBe("");
  });

  it("re-applies defaults when Coverage A is entered or changed and leaves hurricane and AOP", () => {
    const existing = emptySheetValues("home", "homeowners");
    existing.coverage_a = cell("280000");
    existing.coverage_b = cell("10%");
    existing.coverage_e = cell("$500k");
    existing.hurricane_deductible = cell("5%");
    existing.aop_deductible = cell("2500");
    existing.wind_hail_deductible = cell("2%");
    existing.water_backup = cell("$10,000");

    const changed = mergeAgentEdits(
      existing,
      {
        coverage_a: "321000",
        coverage_b: "10%",
        coverage_e: "$500k",
        hurricane_deductible: "5%",
        aop_deductible: "2500",
        wind_hail_deductible: "2%",
        water_backup: "$10,000",
      },
      "home",
      "homeowners",
    );
    expect(changed.coverage_a.value).toBe("321000");
    expect(changed.coverage_b.value).toBe("2%");
    expect(changed.coverage_c.value).toBe("25%");
    expect(changed.coverage_d.value).toBe("10%");
    expect(changed.coverage_e.value).toBe("$300k");
    expect(changed.coverage_f.value).toBe("$1k");
    expect(changed.ordinance_or_law.value).toBe("25%");
    expect(changed.water_backup.value).toBe("$5,000");
    expect(changed.sinkhole_deductible.value).toBe("10%");
    expect(changed.hurricane_deductible.value).toBe("5%");
    expect(changed.aop_deductible.value).toBe("2500");
    expect(changed.wind_hail_deductible.value).toBe("2%");

    const blankWind = mergeAgentEdits(
      { ...existing, wind_hail_deductible: { value: "", status: "missing", source: "blank" } },
      {
        coverage_a: "300000",
        hurricane_deductible: "5%",
        aop_deductible: "2500",
        wind_hail_deductible: "",
      },
      "home",
      "homeowners",
    );
    expect(blankWind.wind_hail_deductible.value).toBe("2500");
    expect(blankWind.hurricane_deductible.value).toBe("5%");

    const untouched = mergeAgentEdits(
      existing,
      { coverage_a: "280000", coverage_b: "10%", hurricane_deductible: "5%" },
      "home",
      "homeowners",
    );
    expect(untouched.coverage_b.value).toBe("10%");
    expect(untouched.hurricane_deductible.value).toBe("5%");
  });

  it("lets a later declaration replace a default without touching a confirmed cell", () => {
    const first = applyExtractedToSheet(
      "home",
      emptySheetValues("home", "homeowners"),
      [{ fieldKey: "coverage_a", normalizedValue: "280000" }],
      { docType: "dec" },
    );
    expect(first.values.coverage_b.value).toBe("2%");
    const confirmed = {
      ...first.values,
      coverage_e: { value: "$500k", status: "confirmed" as const, source: "agent" as const },
    };
    const second = applyExtractedToSheet("home", confirmed, [
      { fieldKey: "coverage_b", normalizedValue: "15%" },
      { fieldKey: "coverage_e", normalizedValue: "100000" },
    ]);
    expect(second.values.coverage_b.value).toBe("15%");
    expect(second.values.coverage_b.source).toBe("extracted");
    expect(second.values.coverage_e.value).toBe("$500k");
  });
});

describe("Coverage A required hint", () => {
  it("shows the replacement-cost note on HO and DP when Coverage A is blank", () => {
    for (const product of ["homeowners", "landlord"] as const) {
      const html = renderToString(
        createElement(MasterSheetCompare, {
          dealId: `deal-${product}`,
          line: "home",
          fields: [],
          values: emptySheetValues("home", product),
          product,
        }),
      );
      expect(html, product).toContain('data-ff-coverage-a-rce=""');
      expect(html, product).toContain(COVERAGE_A_RCE_LABEL);
      expect(html, product).toContain('data-ff-sheet-picklist="coverage_b"');
      expect(html, product).toContain(">2%<");
      expect(html, product).toContain(">$300k<");
      expect(html, product).toContain('name="sinkhole_deductible"');
      expect(html, product).not.toContain('data-ff-sheet-picklist="sinkhole_deductible"');
    }

    const filled = emptySheetValues("home", "homeowners");
    filled.coverage_a = { value: "321000", status: "confirmed", source: "agent" };
    const withA = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-filled",
        line: "home",
        fields: [],
        values: filled,
        product: "homeowners",
      }),
    );
    expect(withA).not.toContain("data-ff-coverage-a-rce");

    const renters = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-renters",
        line: "home",
        fields: [],
        values: emptySheetValues("home", "renters"),
        product: "renters",
      }),
    );
    expect(renters).not.toContain("data-ff-coverage-a-rce");
    expect(renters).not.toContain('name="coverage_a"');
  });
});


describe("liveValuesAfterManualCoverageA", () => {
  it("reapplies B–F and ordinance defaults when Coverage A amount changes", () => {
    const stored = emptySheetValues("home", "homeowners");
    stored.coverage_a = cell("400000", "extracted");
    stored.coverage_b = cell("5%", "extracted");
    stored.coverage_c = cell("50%", "extracted");
    stored.coverage_d = cell("20%", "extracted");
    stored.coverage_e = cell("$500k", "extracted");
    stored.coverage_f = cell("$5k", "extracted");
    stored.ordinance_or_law = cell("50%", "extracted");

    const prevLive = Object.fromEntries(
      Object.entries(stored).map(([key, value]) => [key, value.value]),
    );

    const typing = liveValuesAfterManualCoverageA(prevLive, "605000", stored, "homeowners", {
      reapply: false,
    });
    expect(typing.coverage_a).toBe("605000");
    expect(typing.coverage_b).toBe("5%");
    expect(typing.coverage_e).toBe("$500k");

    const committed = liveValuesAfterManualCoverageA(prevLive, "605000", stored, "homeowners", {
      reapply: true,
    });
    expect(committed.coverage_a).toBe("605000");
    expect(committed.coverage_b).toBe(HOME_COVERAGE_DEFAULTS.coverage_b);
    expect(committed.coverage_c).toBe(HOME_COVERAGE_DEFAULTS.coverage_c);
    expect(committed.coverage_d).toBe(HOME_COVERAGE_DEFAULTS.coverage_d);
    expect(committed.coverage_e).toBe("$300k");
    expect(committed.coverage_f).toBe("$1k");
    expect(committed.ordinance_or_law).toBe(HOME_COVERAGE_DEFAULTS.ordinance_or_law);
  });


  it("still reapplies after onChange already wrote the new Coverage A into live state", () => {
    const stored = emptySheetValues("home", "homeowners");
    stored.coverage_a = cell("400000", "extracted");
    stored.coverage_b = cell("5%", "extracted");
    stored.coverage_c = cell("50%", "extracted");
    stored.coverage_d = cell("20%", "extracted");
    stored.coverage_e = cell("$500k", "extracted");
    stored.coverage_f = cell("$5k", "extracted");
    stored.ordinance_or_law = cell("50%", "extracted");

    // Mimic production: onChange already updated live Coverage A before blur.
    const prevLive = Object.fromEntries(
      Object.entries(stored).map(([key, value]) => [key, value.value]),
    );
    prevLive.coverage_a = "605000";

    const committed = liveValuesAfterManualCoverageA(prevLive, "605000", stored, "homeowners", {
      reapply: true,
    });
    expect(committed.coverage_a).toBe("605000");
    expect(committed.coverage_b).toBe(HOME_COVERAGE_DEFAULTS.coverage_b);
    expect(committed.coverage_c).toBe(HOME_COVERAGE_DEFAULTS.coverage_c);
    expect(committed.coverage_d).toBe(HOME_COVERAGE_DEFAULTS.coverage_d);
    expect(committed.coverage_e).toBe("$300k");
    expect(committed.coverage_f).toBe("$1k");
    expect(committed.ordinance_or_law).toBe(HOME_COVERAGE_DEFAULTS.ordinance_or_law);
  });

  it("does not reapply when the normalized Coverage A amount is unchanged", () => {
    const stored = emptySheetValues("home", "homeowners");
    stored.coverage_a = cell("605000", "agent");
    stored.coverage_b = cell("5%", "agent");
    const prevLive = Object.fromEntries(
      Object.entries(stored).map(([key, value]) => [key, value.value]),
    );
    const next = liveValuesAfterManualCoverageA(prevLive, "$605,000", stored, "homeowners");
    expect(next.coverage_a).toBe("$605,000");
    expect(next.coverage_b).toBe("5%");
  });
});
