/**
 * Manual renewal compare: pick Prior/Current + Renewal term-role DECs,
 * map Gemini extract → policy_terms current/proposed. Pure helpers + tests.
 */
import { termRoleFromTags, type DocumentTermRole } from "@/lib/documents/document-labels";
import type { PolicyCoverageLine } from "@/lib/db/schema";
import {
  mintGeminiValue,
  normalizeMintValue,
  MINT_PROPERTY_ADDRESS_ALIASES,
  type MintGeminiRow,
} from "@/lib/policy/mint-gate";
import { splitPremisesAddress } from "@/lib/policy/premises";
import { parsePropertyYear } from "@/lib/policy/dwelling-facts";
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
    const value = normalizeDeductibleDisplay(geminiText(rows, key));
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

/**
 * Strip OCR junk from deductible strings. Never invent — returns null when empty.
 * Example: "26 forward last 2%" → "2%"; "$2,500" → "2500".
 */
export function normalizeDeductibleDisplay(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).replace(/\s+/g, " ").trim();
  if (!trimmed) return null;

  const pctMatches = [...trimmed.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];
  if (pctMatches.length > 0) {
    const last = pctMatches[pctMatches.length - 1]!;
    return `${last[1]}%`;
  }

  const money = trimmed.match(/\$?\s*([\d,]+(?:\.\d+)?)/);
  if (money) {
    const n = Number(money[1]!.replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 0) {
      return Number.isInteger(n) ? String(n) : n.toFixed(2);
    }
  }

  // Keep a short clean token; drop long OCR noise.
  if (trimmed.length <= 24 && !/forward|last\s+\d/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function firstGeminiText(rows: readonly MintGeminiRow[], ...keys: string[]): string {
  for (const key of keys) {
    const value = geminiText(rows, key);
    if (value) return value;
  }
  return "";
}

function geminiYear(rows: readonly MintGeminiRow[], ...keys: string[]): number | null {
  for (const key of keys) {
    const value = geminiText(rows, key);
    if (!value) continue;
    const year = parsePropertyYear(value);
    if (year != null) return year;
  }
  return null;
}

function geminiCoverageA(rows: readonly MintGeminiRow[]): number | null {
  const raw = firstGeminiText(rows, "coverage_a", "dwelling");
  if (!raw) return null;
  const n = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function geminiPremises(rows: readonly MintGeminiRow[]) {
  const raw = firstGeminiText(rows, ...MINT_PROPERTY_ADDRESS_ALIASES);
  if (!raw) return null;
  const parts = splitPremisesAddress(raw);
  if (!parts.street && !parts.city && !parts.zip) return null;
  return parts;
}

function isBlankText(value: string | null | undefined): boolean {
  return !String(value ?? "").trim();
}

function isBlankNum(value: number | null | undefined): boolean {
  return value == null || !Number.isFinite(value);
}

export type OverviewWriteBackPolicySnap = {
  renewalDate?: Date | string | null;
  premium?: string | number | null;
  premisesAddress?: string | null;
  premisesCity?: string | null;
  premisesState?: string | null;
  premisesZip?: string | null;
  coverageA?: number | null;
  coverageLimits?: Record<string, string> | null;
  formType?: string | null;
  insuranceType?: string | null;
  sellingAgency?: string | null;
  producer?: string | null;
  billingFrequency?: string | null;
  carrierId?: string | null;
};

export type OverviewWriteBackRiskSnap = {
  yearBuilt?: number | null;
  construction?: string | null;
  roofYear?: number | null;
  coverageA?: number | null;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
} | null;

export type OverviewWriteBackPatch = {
  policy: {
    renewalDate?: Date;
    premium?: string;
    premisesAddress?: string;
    premisesCity?: string;
    premisesState?: string;
    premisesZip?: string;
    coverageA?: number;
    coverageLimits?: Record<string, string>;
    formType?: string;
    insuranceType?: string;
    sellingAgency?: string;
    producer?: string;
    billingFrequency?: string;
  };
  risk: {
    yearBuilt?: number;
    construction?: string;
    roofYear?: number;
    coverageA?: number;
    address1?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  /** Exact carrier name from Gemini when policy.carrierId is blank — caller resolves safely. */
  carrierName?: string | null;
  /** Field keys actually filled — empty when Gemini had nothing usable or policy already set. */
  written: string[];
};

/**
 * Map Gemini Prior/Current + Renewal DEC rows into blank policy/risk Overview gaps only.
 * Never invents premiums or dwelling facts; skips when Gemini returned empty.
 * renewalDate prefers renewal/proposed X-date; premises/dwelling prefer baseline then renewal.
 */
export function buildOverviewWriteBackFromGemini(input: {
  policy: OverviewWriteBackPolicySnap;
  risk?: OverviewWriteBackRiskSnap;
  baselineRows: readonly MintGeminiRow[];
  renewalRows: readonly MintGeminiRow[];
}): OverviewWriteBackPatch {
  const written: string[] = [];
  const policyPatch: OverviewWriteBackPatch["policy"] = {};
  const riskPatch: OverviewWriteBackPatch["risk"] = {};
  const risk = input.risk ?? null;

  // Renewal date / X-date from renewal DEC (fallback: baseline expiration).
  if (!input.policy.renewalDate) {
    const renewalIso =
      firstGeminiText(input.renewalRows, "renewal_date", "expiration_date", "exp_date") ||
      firstGeminiText(input.baselineRows, "renewal_date", "expiration_date", "exp_date");
    const d = renewalIso ? isoToNoonUtc(renewalIso) : null;
    if (d) {
      policyPatch.renewalDate = d;
      written.push("renewalDate");
    }
  }

  // Premises — only when policy street/city/state/zip empty.
  const premises =
    geminiPremises(input.baselineRows) ?? geminiPremises(input.renewalRows);
  if (premises) {
    if (isBlankText(input.policy.premisesAddress) && premises.street) {
      policyPatch.premisesAddress = premises.street;
      written.push("premisesAddress");
      if (risk && isBlankText(risk.address1)) {
        riskPatch.address1 = premises.street;
        written.push("risk.address1");
      }
    }
    if (isBlankText(input.policy.premisesCity) && premises.city) {
      policyPatch.premisesCity = premises.city;
      written.push("premisesCity");
      if (risk && isBlankText(risk.city)) {
        riskPatch.city = premises.city;
        written.push("risk.city");
      }
    }
    if (isBlankText(input.policy.premisesState) && premises.state) {
      policyPatch.premisesState = premises.state;
      written.push("premisesState");
      if (risk && isBlankText(risk.state)) {
        riskPatch.state = premises.state;
        written.push("risk.state");
      }
    }
    if (isBlankText(input.policy.premisesZip) && premises.zip) {
      policyPatch.premisesZip = premises.zip;
      written.push("premisesZip");
      if (risk && isBlankText(risk.zip)) {
        riskPatch.zip = premises.zip;
        written.push("risk.zip");
      }
    }
  }

  const coverageA =
    geminiCoverageA(input.baselineRows) ?? geminiCoverageA(input.renewalRows);
  if (coverageA != null && isBlankNum(input.policy.coverageA)) {
    policyPatch.coverageA = coverageA;
    written.push("coverageA");
  }
  if (coverageA != null && risk && isBlankNum(risk.coverageA)) {
    riskPatch.coverageA = coverageA;
    written.push("risk.coverageA");
  }

  const yearBuilt =
    geminiYear(input.baselineRows, "year_built") ??
    geminiYear(input.renewalRows, "year_built");
  if (yearBuilt != null && risk && isBlankNum(risk.yearBuilt)) {
    riskPatch.yearBuilt = yearBuilt;
    written.push("risk.yearBuilt");
  }

  const roofYear =
    geminiYear(input.baselineRows, "roof_year", "roof_age", "year_roof") ??
    geminiYear(input.renewalRows, "roof_year", "roof_age", "year_roof");
  if (roofYear != null && risk && isBlankNum(risk.roofYear)) {
    riskPatch.roofYear = roofYear;
    written.push("risk.roofYear");
  }

  const construction =
    firstGeminiText(input.baselineRows, "construction", "construction_type") ||
    firstGeminiText(input.renewalRows, "construction", "construction_type");
  if (construction && risk && isBlankText(risk.construction)) {
    riskPatch.construction = construction;
    written.push("risk.construction");
  }

  // Current premium onto policy when blank (baseline preferred — in-force term).
  if (isBlankText(input.policy.premium == null ? "" : String(input.policy.premium))) {
    const premiumRaw =
      firstGeminiText(input.baselineRows, "premium") ||
      firstGeminiText(input.renewalRows, "premium");
    const premiumN = parseMoney(premiumRaw);
    if (premiumN != null) {
      policyPatch.premium = premiumN.toFixed(2);
      written.push("premium");
    }
  }

  const formType =
    firstGeminiText(input.baselineRows, "form", "policy_form") ||
    firstGeminiText(input.renewalRows, "form", "policy_form");
  if (formType && isBlankText(input.policy.formType)) {
    policyPatch.formType = formType;
    written.push("formType");
  }

  const insuranceType =
    firstGeminiText(input.baselineRows, "insurance_type") ||
    firstGeminiText(input.renewalRows, "insurance_type");
  if (insuranceType && isBlankText(input.policy.insuranceType)) {
    policyPatch.insuranceType = insuranceType;
    written.push("insuranceType");
  }

  const sellingAgency =
    firstGeminiText(input.baselineRows, "selling_agency") ||
    firstGeminiText(input.renewalRows, "selling_agency");
  if (sellingAgency && isBlankText(input.policy.sellingAgency)) {
    policyPatch.sellingAgency = sellingAgency;
    written.push("sellingAgency");
  }

  const producer =
    firstGeminiText(input.baselineRows, "producer") ||
    firstGeminiText(input.renewalRows, "producer");
  if (producer && isBlankText(input.policy.producer)) {
    policyPatch.producer = producer;
    written.push("producer");
  }

  const billingFrequency =
    firstGeminiText(input.baselineRows, "billing_frequency") ||
    firstGeminiText(input.renewalRows, "billing_frequency");
  if (billingFrequency && isBlankText(input.policy.billingFrequency)) {
    policyPatch.billingFrequency = billingFrequency;
    written.push("billingFrequency");
  }

  // Coverage A–F / liability into coverageLimits — fill blank keys only.
  const limitRows =
    coverageLinesFromRows(input.baselineRows).length > 0
      ? coverageLinesFromRows(input.baselineRows)
      : coverageLinesFromRows(input.renewalRows);
  if (limitRows.length > 0) {
    const existing = { ...(input.policy.coverageLimits ?? {}) };
    let limitsChanged = false;
    for (const line of limitRows) {
      if (isBlankText(existing[line.key]) && line.value) {
        existing[line.key] = line.value;
        limitsChanged = true;
        written.push(`coverageLimits.${line.key}`);
      }
    }
    if (limitsChanged) {
      policyPatch.coverageLimits = existing;
    }
  }

  let carrierName: string | null = null;
  if (isBlankText(input.policy.carrierId)) {
    const name =
      firstGeminiText(input.baselineRows, "carrier_name", "company_name", "current_carrier") ||
      firstGeminiText(input.renewalRows, "carrier_name", "company_name", "current_carrier");
    if (name) {
      carrierName = name;
      written.push("carrierName");
    }
  }

  return { policy: policyPatch, risk: riskPatch, carrierName, written };
}
