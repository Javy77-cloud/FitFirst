import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildOverviewWriteBackFromGemini,
  canFillCompareFromTermRoleDocs,
  docsForTermRole,
  mapGeminiRowsToTermFields,
  normalizeDeductibleDisplay,
  riskIdForExtractedFieldsCache,
  selectCompareTermRoleDocs,
} from "./fill-compare-from-decs";

describe("selectCompareTermRoleDocs", () => {
  const prior = {
    id: "prior-1",
    filename: "prior.pdf",
    tags: ["dec", "term_role:prior"],
    createdAt: "2025-01-01T12:00:00.000Z",
  };
  const current = {
    id: "current-1",
    filename: "current.pdf",
    tags: ["dec", "term_role:current"],
    createdAt: "2025-06-01T12:00:00.000Z",
  };
  const renewal = {
    id: "renewal-1",
    filename: "renewal.pdf",
    tags: ["dec", "term_role:renewal"],
    createdAt: "2026-09-01T12:00:00.000Z",
  };

  it("prefers current over prior for baseline when both exist", () => {
    const selected = selectCompareTermRoleDocs([prior, current, renewal]);
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    expect(selected.baselineSource).toBe("current");
    expect(selected.baseline.id).toBe("current-1");
    expect(selected.renewal.id).toBe("renewal-1");
  });

  it("uses prior as Compare baseline when no current is marked (AOR mid-year)", () => {
    const selected = selectCompareTermRoleDocs([prior, renewal]);
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    expect(selected.baselineSource).toBe("prior");
    expect(selected.baseline.id).toBe("prior-1");
    expect(selected.renewal.id).toBe("renewal-1");
  });

  it("fails loud when renewal is missing", () => {
    const selected = selectCompareTermRoleDocs([prior, current]);
    expect(selected).toEqual(
      expect.objectContaining({
        ok: false,
        reason: "need_renewal",
      }),
    );
  });

  it("fails loud when neither current nor prior is marked", () => {
    const selected = selectCompareTermRoleDocs([renewal]);
    expect(selected).toEqual(
      expect.objectContaining({
        ok: false,
        reason: "need_baseline",
      }),
    );
  });

  it("picks the newest doc per term role", () => {
    const olderRenewal = {
      ...renewal,
      id: "renewal-old",
      createdAt: "2026-01-01T12:00:00.000Z",
    };
    const selected = selectCompareTermRoleDocs([prior, olderRenewal, renewal]);
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    expect(selected.renewal.id).toBe("renewal-1");
    expect(docsForTermRole([olderRenewal, renewal], "renewal").map((d) => d.id)).toEqual([
      "renewal-1",
      "renewal-old",
    ]);
  });

  it("canFillCompareFromTermRoleDocs mirrors selection ok", () => {
    expect(canFillCompareFromTermRoleDocs([prior, renewal])).toBe(true);
    expect(canFillCompareFromTermRoleDocs([current])).toBe(false);
    expect(canFillCompareFromTermRoleDocs([renewal])).toBe(false);
  });
});

describe("mapGeminiRowsToTermFields", () => {
  it("maps premium, term dates, deductibles, and coverages when present", () => {
    const mapped = mapGeminiRowsToTermFields([
      { fieldKey: "current_premium", normalizedValue: "2547.00", rawValue: "$2,547", confidence: 0.9, flagged: false },
      { fieldKey: "effective_date", normalizedValue: "2026-10-01", rawValue: "10/01/2026", confidence: 0.9, flagged: false },
      { fieldKey: "expiration_date", normalizedValue: "2027-10-01", rawValue: "10/01/2027", confidence: 0.9, flagged: false },
      { fieldKey: "aop_deductible", normalizedValue: "2500", rawValue: "$2,500", confidence: 0.8, flagged: false },
      { fieldKey: "hurricane_deductible", normalizedValue: "2%", rawValue: "2%", confidence: 0.8, flagged: false },
      { fieldKey: "coverage_a", normalizedValue: "310000", rawValue: "$310,000", confidence: 0.9, flagged: false },
    ]);
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.fields.premium).toBe("2547.00");
    expect(mapped.fields.termEffective.toISOString().slice(0, 10)).toBe("2026-10-01");
    expect(mapped.fields.termExpiration.toISOString().slice(0, 10)).toBe("2027-10-01");
    expect(mapped.fields.aopDeductible).toBe("2500");
    expect(mapped.fields.hurricaneDeductible).toBe("2%");
    expect(mapped.fields.coverages).toEqual([
      { key: "coverage_a", label: "Coverage A", value: "310000" },
    ]);
    expect(mapped.fields.gaps).toEqual([]);
  });

  it("fails loud without inventing premium when missing", () => {
    const mapped = mapGeminiRowsToTermFields([
      { fieldKey: "effective_date", normalizedValue: "2026-10-01", rawValue: null, confidence: 0.9, flagged: false },
      { fieldKey: "expiration_date", normalizedValue: "2027-10-01", rawValue: null, confidence: 0.9, flagged: false },
    ]);
    expect(mapped.ok).toBe(false);
    if (mapped.ok) return;
    expect(mapped.gaps).toContain("premium");
    expect(mapped.message).toMatch(/missing premium/i);
  });

  it("fails loud when term dates are missing", () => {
    const mapped = mapGeminiRowsToTermFields([
      { fieldKey: "current_premium", normalizedValue: "2109", rawValue: null, confidence: 0.9, flagged: false },
    ]);
    expect(mapped.ok).toBe(false);
    if (mapped.ok) return;
    expect(mapped.gaps).toEqual(expect.arrayContaining(["effective_date", "expiration_date"]));
  });

  it("accepts full_term_premium alias and soft-gaps deductibles/coverages", () => {
    const mapped = mapGeminiRowsToTermFields([
      { fieldKey: "full_term_premium", normalizedValue: "2109.00", rawValue: null, confidence: 0.9, flagged: false },
      { fieldKey: "effective_date", normalizedValue: "September 21, 2026", rawValue: null, confidence: 0.9, flagged: false },
      { fieldKey: "expiration_date", normalizedValue: "March 21, 2027", rawValue: null, confidence: 0.9, flagged: false },
    ]);
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.fields.premium).toBe("2109.00");
    expect(mapped.fields.gaps).toEqual(expect.arrayContaining(["deductibles", "coverages"]));
  });
});

describe("riskIdForExtractedFieldsCache", () => {
  it("prefers document riskId over policy riskId", () => {
    expect(
      riskIdForExtractedFieldsCache("doc-risk", "policy-risk"),
    ).toBe("doc-risk");
  });

  it("falls back to policy.riskId when document has none", () => {
    expect(riskIdForExtractedFieldsCache(null, "policy-risk")).toBe("policy-risk");
    expect(riskIdForExtractedFieldsCache("", "policy-risk")).toBe("policy-risk");
    expect(riskIdForExtractedFieldsCache(undefined, "  policy-risk  ")).toBe("policy-risk");
  });

  it("returns null when neither document nor policy has a risk (skip cache)", () => {
    expect(riskIdForExtractedFieldsCache(null, null)).toBeNull();
    expect(riskIdForExtractedFieldsCache("", undefined)).toBeNull();
    expect(riskIdForExtractedFieldsCache("   ", "")).toBeNull();
  });
});

describe("fillCompare From DECs wiring", () => {
  it("exposes fillCompareFromTermRoleDocs action and Fill Compare button", () => {
    const action = readFileSync("src/app/actions/renewal.ts", "utf8");
    expect(action).toMatch(/export async function fillCompareFromTermRoleDocs/);
    expect(action).toMatch(/stampDocTermMeta/);
    expect(action).toMatch(/expiresAt/);
    expect(action).toMatch(/eventType: "dec_fill"/);
    expect(action).toMatch(/riskIdForExtractedFieldsCache/);
    expect(action).toMatch(/persistExtractRows\(id, rows, policy\.riskId\)/);
    expect(action).toMatch(/skip extracted_fields cache \(no risk_id\)/);
    expect(action).toMatch(/extracted_fields cache failed \(best-effort\)/);
    expect(action).toMatch(/buildOverviewWriteBackFromGemini/);
    expect(action).toMatch(/overviewWritten/);
    const button = readFileSync("src/components/policy/fill-compare-from-decs-button.tsx", "utf8");
    expect(button).toMatch(/data-ff-fill-compare-from-decs/);
    expect(button).toMatch(/Fill Compare from DECs/);
    const docs = readFileSync("src/components/policy/tabs/documents-tab.tsx", "utf8");
    expect(docs).toMatch(/FillCompareFromDecsButton/);
    expect(docs).toMatch(/Set term role/);
    expect(docs).toMatch(/Term role/);
    const compare = readFileSync("src/components/policy/compare-panel.tsx", "utf8");
    expect(compare).toMatch(/FillCompareFromDecsButton/);
  });
});

describe("normalizeDeductibleDisplay", () => {
  it("strips OCR junk before a hurricane percent", () => {
    expect(normalizeDeductibleDisplay("26 forward last 2%")).toBe("2%");
    expect(normalizeDeductibleDisplay("forward last 5 %")).toBe("5%");
    expect(normalizeDeductibleDisplay("2%")).toBe("2%");
  });

  it("normalizes dollar deductibles without inventing", () => {
    expect(normalizeDeductibleDisplay("$2,500")).toBe("2500");
    expect(normalizeDeductibleDisplay("1,000")).toBe("1000");
    expect(normalizeDeductibleDisplay("")).toBeNull();
    expect(normalizeDeductibleDisplay(null)).toBeNull();
    expect(normalizeDeductibleDisplay("   ")).toBeNull();
  });

  it("is applied when mapping Gemini term deductibles", () => {
    const mapped = mapGeminiRowsToTermFields([
      { fieldKey: "current_premium", normalizedValue: "2547.00", rawValue: null, confidence: 0.9, flagged: false },
      { fieldKey: "effective_date", normalizedValue: "2026-10-01", rawValue: null, confidence: 0.9, flagged: false },
      { fieldKey: "expiration_date", normalizedValue: "2027-10-01", rawValue: null, confidence: 0.9, flagged: false },
      {
        fieldKey: "hurricane_deductible",
        normalizedValue: "26 forward last 2%",
        rawValue: "26 forward last 2%",
        confidence: 0.7,
        flagged: false,
      },
    ]);
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.fields.hurricaneDeductible).toBe("2%");
  });
});

describe("buildOverviewWriteBackFromGemini", () => {
  const renewalRows = [
    { fieldKey: "renewal_date", normalizedValue: "2027-10-01", rawValue: null, confidence: 0.9, flagged: false },
    {
      fieldKey: "location_description",
      normalizedValue: "123 Palm Ave, Naples, FL 34102",
      rawValue: null,
      confidence: 0.9,
      flagged: false,
    },
    { fieldKey: "coverage_a", normalizedValue: "310000", rawValue: null, confidence: 0.9, flagged: false },
    { fieldKey: "year_built", normalizedValue: "1998", rawValue: null, confidence: 0.9, flagged: false },
    { fieldKey: "construction", normalizedValue: "masonry", rawValue: null, confidence: 0.9, flagged: false },
    { fieldKey: "roof_year", normalizedValue: "2016", rawValue: null, confidence: 0.9, flagged: false },
  ];

  it("writes blank policy/risk Overview gaps from Gemini values", () => {
    const patch = buildOverviewWriteBackFromGemini({
      policy: {
        renewalDate: null,
        premisesAddress: null,
        premisesCity: null,
        premisesState: null,
        premisesZip: null,
        coverageA: null,
      },
      risk: {
        yearBuilt: null,
        construction: null,
        roofYear: null,
        coverageA: null,
        address1: null,
        city: null,
        state: null,
        zip: null,
      },
      baselineRows: [],
      renewalRows,
    });
    expect(patch.policy.renewalDate?.toISOString().slice(0, 10)).toBe("2027-10-01");
    expect(patch.policy.premisesAddress).toMatch(/Palm/i);
    expect(patch.policy.premisesCity).toBe("Naples");
    expect(patch.policy.premisesState).toBe("FL");
    expect(patch.policy.premisesZip).toBe("34102");
    expect(patch.policy.coverageA).toBe(310000);
    expect(patch.risk.yearBuilt).toBe(1998);
    expect(patch.risk.construction).toBe("masonry");
    expect(patch.risk.roofYear).toBe(2016);
    expect(patch.written.length).toBeGreaterThan(0);
  });

  it("skips dwelling/premises write-back when Gemini only returned premium", () => {
    const patch = buildOverviewWriteBackFromGemini({
      policy: {
        renewalDate: null,
        premium: null,
        premisesAddress: null,
        premisesCity: null,
        premisesState: null,
        premisesZip: null,
        coverageA: null,
      },
      risk: {
        yearBuilt: null,
        construction: null,
        roofYear: null,
        coverageA: null,
        address1: null,
        city: null,
        state: null,
        zip: null,
      },
      baselineRows: [],
      renewalRows: [
        { fieldKey: "premium", normalizedValue: "2109", rawValue: null, confidence: 0.9, flagged: false },
      ],
    });
    expect(patch.policy).toEqual({ premium: "2109.00" });
    expect(patch.risk).toEqual({});
    expect(patch.written).toEqual(["premium"]);
  });

  it("writes nothing when Gemini rows are empty", () => {
    const patch = buildOverviewWriteBackFromGemini({
      policy: {
        renewalDate: null,
        premium: null,
        premisesAddress: null,
        premisesCity: null,
        premisesState: null,
        premisesZip: null,
        coverageA: null,
      },
      risk: {
        yearBuilt: null,
        construction: null,
        roofYear: null,
        coverageA: null,
        address1: null,
        city: null,
        state: null,
        zip: null,
      },
      baselineRows: [],
      renewalRows: [],
    });
    expect(patch.policy).toEqual({});
    expect(patch.risk).toEqual({});
    expect(patch.written).toEqual([]);
    expect(patch.carrierName ?? null).toBeNull();
  });

  it("fills blank premium, form, and coverage limit keys without inventing", () => {
    const patch = buildOverviewWriteBackFromGemini({
      policy: {
        renewalDate: null,
        premium: null,
        premisesAddress: "Kept",
        premisesCity: "Kept",
        premisesState: "FL",
        premisesZip: "34102",
        coverageA: 310000,
        coverageLimits: { coverage_a: "310000" },
        formType: null,
        insuranceType: null,
        sellingAgency: null,
        producer: null,
        billingFrequency: null,
        carrierId: null,
      },
      risk: null,
      baselineRows: [
        { fieldKey: "current_premium", normalizedValue: "3576.00", rawValue: null, confidence: 0.9, flagged: false },
        { fieldKey: "form", normalizedValue: "HO3", rawValue: null, confidence: 0.9, flagged: false },
        { fieldKey: "coverage_b", normalizedValue: "31000", rawValue: null, confidence: 0.9, flagged: false },
        { fieldKey: "coverage_a", normalizedValue: "310000", rawValue: null, confidence: 0.9, flagged: false },
        { fieldKey: "carrier_name", normalizedValue: "Citizens", rawValue: null, confidence: 0.9, flagged: false },
      ],
      renewalRows: [],
    });
    expect(patch.policy.premium).toBe("3576.00");
    expect(patch.policy.formType).toBe("HO3");
    expect(patch.policy.coverageLimits).toEqual({
      coverage_a: "310000",
      coverage_b: "31000",
    });
    expect(patch.carrierName).toBe("Citizens");
    expect(patch.written).toEqual(
      expect.arrayContaining(["premium", "formType", "coverageLimits.coverage_b", "carrierName"]),
    );
  });

  it("does not overwrite already-filled policy/risk fields", () => {
    const patch = buildOverviewWriteBackFromGemini({
      policy: {
        renewalDate: new Date("2026-01-01T12:00:00.000Z"),
        premium: "9999.00",
        premisesAddress: "Existing St",
        premisesCity: "Existing",
        premisesState: "FL",
        premisesZip: "33333",
        coverageA: 200000,
        coverageLimits: { coverage_a: "200000", coverage_b: "20000" },
        formType: "HO3",
        insuranceType: "Homeowners",
        sellingAgency: "FitFirst",
        producer: "Agent",
        billingFrequency: "annual",
        carrierId: "carrier-1",
      },
      risk: {
        yearBuilt: 1980,
        construction: "frame",
        roofYear: 2000,
        coverageA: 200000,
        address1: "Existing St",
        city: "Existing",
        state: "FL",
        zip: "33333",
      },
      baselineRows: [],
      renewalRows,
    });
    expect(patch.policy).toEqual({});
    expect(patch.risk).toEqual({});
    expect(patch.written).toEqual([]);
    expect(patch.carrierName ?? null).toBeNull();
  });
});
