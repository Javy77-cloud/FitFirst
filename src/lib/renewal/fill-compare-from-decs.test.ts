import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canFillCompareFromTermRoleDocs,
  docsForTermRole,
  mapGeminiRowsToTermFields,
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
