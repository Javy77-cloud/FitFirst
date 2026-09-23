/**
 * Manual renewal compare: pick Prior/Current + Renewal term-role DECs,
 * map Gemini extract → policy_terms current/proposed. Pure helpers + tests.
 */
import { termRoleFromTags, type DocumentTermRole } from "@/lib/documents/document-labels";
import type { PolicyCoverageLine } from "@/lib/db/schema";
import {
  mintGeminiValue,
  normalizeMintValue,
  type MintGeminiRow,
} from "@/lib/policy/mint-gate";
import { parseMoney } from "@/lib/renewal/compare";

export type TermRoleDocLike = {
  id: string;
  filename?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  docType?: string | null;
  tags?: string[] | null;
  createdAt?: Date | string | null;
};

export type SelectedCompareDocs = {
  ok: true;
  baseline: TermRoleDocLike;
  baselineSource: "current" | "prior";
  renewal: TermRoleDocLike;
};

export type SelectCompareDocsErr = {
  ok: false;
  reason: "need_baseline" | "need_renewal";
  message: string;
};

export type MappedTermFields = {
  premium: string;
  termEffective: Date;
  termExpiration: Date;
  aopDeductible: string | null;
  hurricaneDeductible: string | null;
  comprehensiveDeductible: string | null;
  collisionDeductible: string | null;
  coverages: PolicyCoverageLine[];
  /** Honest gaps for Gemini teaching — never invent these. */
  gaps: string[];
};

export type MapTermFieldsResult =
  | { ok: true; fields: MappedTermFields }
  | { ok: false; message: string; gaps: string[] };

const COVERAGE_FIELD_DEFS: Array<{ key: string; aliases: string[]; label: string }> = [
  { key: "coverage_a", aliases: ["coverage_a", "dwelling"], label: "Coverage A" },
  { key: "coverage_b", aliases: ["coverage_b"], label: "Coverage B" },
  { key: "coverage_c", aliases: ["coverage_c"], label: "Coverage C" },
  { key: "coverage_d", aliases: ["coverage_d"], label: "Coverage D" },
  { key: "coverage_e", aliases: ["coverage_e"], label: "Coverage E" },
  { key: "coverage_f", aliases: ["coverage_f"], label: "Coverage F" },
  { key: "liability_bi", aliases: ["liability_bi"], label: "Bodily injury" },
  { key: "liability_pd", aliases: ["liability_pd"], label: "Property damage" },
  { key: "um_uim", aliases: ["um_uim"], label: "UM/UIM" },
  { key: "pip", aliases: ["pip"], label: "PIP" },
];

function createdAtMs(doc: TermRoleDocLike): number {
  if (!doc.createdAt) return 0;
  const t = new Date(doc.createdAt).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Newest first among docs tagged with the given term_role. */
export function docsForTermRole(
  docs: readonly TermRoleDocLike[],
  role: DocumentTermRole,
): TermRoleDocLike[] {
  return docs
    .filter((doc) => termRoleFromTags(doc.tags) === role)
    .sort((a, b) => createdAtMs(b) - createdAtMs(a) || a.id.localeCompare(b.id));
}

/**
 * Prefer current over prior for Compare baseline (honest when AOR is missing mid-year
 * and only a prior DEC is tagged). Renewal/upcoming is required.
 */
export function selectCompareTermRoleDocs(
  docs: readonly TermRoleDocLike[],
): SelectedCompareDocs | SelectCompareDocsErr {
  const current = docsForTermRole(docs, "current")[0];
  const prior = docsForTermRole(docs, "prior")[0];
  const renewal = docsForTermRole(docs, "renewal")[0];

  if (!renewal) {
    return {
      ok: false,
      reason: "need_renewal",
      message:
        "Mark a Renewal / upcoming term DEC on Documents (⋯ → Term role) before filling Compare.",
    };
  }

  if (current) {
    return { ok: true, baseline: current, baselineSource: "current", renewal };
  }
  if (prior) {
    return { ok: true, baseline: prior, baselineSource: "prior", renewal };
  }

  return {
    ok: false,
    reason: "need_baseline",
    message:
      "Mark a Current term or Prior term DEC on Documents (⋯ → Term role) as the Compare baseline.",
  };
}

/** True when Documents has (current|prior) + renewal so the Fill button can show. */
export function canFillCompareFromTermRoleDocs(docs: readonly TermRoleDocLike[]): boolean {
  return selectCompareTermRoleDocs(docs).ok;
}

function isoToNoonUtc(iso: string): Date | null {
  const day = iso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const d = new Date(`${day}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function geminiText(rows: readonly MintGeminiRow[], key: string): string {
  return normalizeMintValue(key, mintGeminiValue(rows, key)).trim();
}

function deductibleText(rows: readonly MintGeminiRow[], ...keys: string[]): string | null {
  for (const key of keys) {
    const value = geminiText(rows, key);
    if (value) return value;
  }
  return null;
}

function coverageLinesFromRows(rows: readonly MintGeminiRow[]): PolicyCoverageLine[] {
  const lines: PolicyCoverageLine[] = [];
  for (const def of COVERAGE_FIELD_DEFS) {
    let value = "";
    for (const alias of def.aliases) {
      value = geminiText(rows, alias);
      if (value) break;
    }
    if (!value) continue;
    lines.push({ key: def.key, label: def.label, value });
  }
  return lines;
}

/**
 * Map Gemini DEC rows → policy_terms fields. Requires premium + both term dates.
 * Does not invent premiums or dates — returns loud gaps for teaching.
 */
export function mapGeminiRowsToTermFields(
  rows: readonly MintGeminiRow[],
): MapTermFieldsResult {
  const gaps: string[] = [];
  const premiumRaw = geminiText(rows, "premium");
  const premiumN = parseMoney(premiumRaw);
  if (premiumN == null) gaps.push("premium");

  const effectiveIso = geminiText(rows, "effective_date");
  const expirationIso = geminiText(rows, "expiration_date");
  const termEffective = effectiveIso ? isoToNoonUtc(effectiveIso) : null;
  const termExpiration = expirationIso ? isoToNoonUtc(expirationIso) : null;
  if (!termEffective) gaps.push("effective_date");
  if (!termExpiration) gaps.push("expiration_date");

  if (premiumN == null || !termEffective || !termExpiration) {
    return {
      ok: false,
      message: `DEC extract is missing ${gaps.join(", ")}. Re-check the PDF or teach Gemini those home/auto DEC fields — FitFirst will not invent them.`,
      gaps,
    };
  }

  const softGaps: string[] = [];
  const aop = deductibleText(rows, "aop_deductible");
  const hurricane = deductibleText(rows, "hurricane_deductible");
  const comprehensive = deductibleText(
    rows,
    "comprehensive_deductible",
    "comp_deductible",
    "comprehensive",
  );
  const collision = deductibleText(rows, "collision_deductible");
  if (!aop && !hurricane && !comprehensive && !collision) {
    softGaps.push("deductibles");
  }
  const coverages = coverageLinesFromRows(rows);
  if (coverages.length === 0) softGaps.push("coverages");

  return {
    ok: true,
    fields: {
      premium: premiumN.toFixed(2),
      termEffective,
      termExpiration,
      aopDeductible: aop,
      hurricaneDeductible: hurricane,
      comprehensiveDeductible: comprehensive,
      collisionDeductible: collision,
      coverages,
      gaps: softGaps,
    },
  };
}

/**
 * extracted_fields.risk_id is NOT NULL in Postgres. Prefer the document's risk,
 * then the policy's. When neither exists, callers must skip the cache write —
 * Fill Compare maps premiums into policy_terms without depending on the cache.
 */
export function riskIdForExtractedFieldsCache(
  docRiskId: string | null | undefined,
  policyRiskId: string | null | undefined,
): string | null {
  const fromDoc = (docRiskId ?? "").trim();
  if (fromDoc) return fromDoc;
  const fromPolicy = (policyRiskId ?? "").trim();
  if (fromPolicy) return fromPolicy;
  return null;
}
