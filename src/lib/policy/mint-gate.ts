import { CONFIDENCE_THRESHOLD } from "@/lib/domain";
import {
  isLateProductStage,
  lateStageNeedsQuoteSelection,
  normalizeStageSlug,
} from "@/lib/deals/product-stages";

export const POLICY_ISSUED_STAGE = "policy_issued";

export type MintSurface = "quotes" | "header" | "chip";

export type MintGateReason =
  | "invalid"
  | "need_quote"
  | "need_bound"
  | "need_dec"
  | "quotes_only"
  | "creating";

export type DeclarationLike = {
  id: string;
  filename?: string | null;
  mimeType?: string | null;
  docType?: string | null;
  slot?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  storagePath?: string | null;
};

export type MintFieldSource = "gemini" | "sheet" | "quote" | "deal" | "agent";

export type MintField = {
  key: string;
  label: string;
  value: string;
  confidence: number;
  source: MintFieldSource;
  flagged: boolean;
  confirmed: boolean;
  soldValue?: string | null;
  sheetValue?: string | null;
  geminiValue?: string | null;
};

export type MintSoldBasis = {
  quoteId: string;
  carrierId?: string | null;
  premium?: string | null;
  coverageA?: number | null;
  hurricaneDeductible?: string | null;
  aopDeductible?: string | null;
};

export type MintPayload = {
  status: "creating" | "unpublished" | "published";
  soldBasis: MintSoldBasis;
  fields: MintField[];
  decDocumentId?: string | null;
  decFilename?: string | null;
  product?: string | null;
  mintedAt?: string | null;
  adminNotifiedAt?: string | null;
};

export const MINT_CONFIRM_FIELDS = [
  { key: "policy_number", label: "Policy number" },
  { key: "named_insured", label: "Named insured" },
  { key: "effective_date", label: "Effective" },
  { key: "expiration_date", label: "Expiration" },
  { key: "premium", label: "Premium" },
  { key: "coverage_a", label: "Coverage A / dwelling" },
  { key: "form", label: "Form" },
  { key: "insurance_type", label: "Insurance type" },
  { key: "hurricane_deductible", label: "Hurricane deductible" },
  { key: "aop_deductible", label: "AOP deductible" },
  { key: "mailing_address", label: "Location / property" },
  { key: "selling_agency", label: "Selling agency" },
  { key: "renewal_date", label: "Renewal date" },
  { key: "producer", label: "Producer" },
  { key: "roof_year", label: "Roof age" },
  { key: "mortgagee", label: "Mortgagee" },
  { key: "billing_frequency", label: "Billing frequency" },
  { key: "next_due", label: "Next due" },
  { key: "payment_method", label: "Payment method" },
] as const;

const SOLD_KEYS = new Set(["premium", "coverage_a", "hurricane_deductible", "aop_deductible"]);

/** Gemini / sheet keys that fill a mint confirm field. */
export const MINT_FIELD_ALIASES: Record<string, string[]> = {
  policy_number: ["policy_number"],
  named_insured: [
    "named_insured",
    "current_policy_name_insured",
    "current_policy_named_insured",
    "applicant_name",
  ],
  effective_date: ["effective_date"],
  expiration_date: ["expiration_date"],
  premium: ["premium", "current_premium"],
  coverage_a: ["coverage_a", "dwelling"],
  form: ["form", "policy_form", "quoting_form"],
  insurance_type: ["insurance_type", "insurance_family"],
  hurricane_deductible: ["hurricane_deductible"],
  aop_deductible: ["aop_deductible"],
  mailing_address: [
    "mailing_address",
    "property_address",
    "address",
    "address1",
    "applicant_address",
  ],
  selling_agency: ["selling_agency"],
  renewal_date: ["renewal_date"],
  producer: ["producer"],
  roof_year: ["roof_year", "roof_age"],
  mortgagee: ["mortgagee", "mortgagee_name"],
  billing_frequency: ["billing_frequency", "premium_frequency", "premium_mode"],
  next_due: ["next_due", "next_payment_due"],
  payment_method: ["payment_method", "pay_plan"],
};

const BOUND_READY = new Set(["bound", "closed_won", "pending_inspection", "policy_issued"]);

export function isPolicyIssuedStage(stage?: string | null): boolean {
  return normalizeStageSlug(stage) === POLICY_ISSUED_STAGE;
}

export function isBoundReadyForIssue(stage?: string | null): boolean {
  return BOUND_READY.has(normalizeStageSlug(stage));
}

/** Late moves (Quote sent → Policy issued) belong on Quotes, not Details/Markets. */
export function isQuotesOnlyLateStage(stage?: string | null): boolean {
  return isLateProductStage(stage);
}

export function quotesOnlyStageBlocked(
  stage?: string | null,
  surface?: MintSurface | string | null,
): boolean {
  if (!surface || surface === "quotes") return false;
  return isQuotesOnlyLateStage(stage);
}

export function isDeclarationPdf(doc: DeclarationLike): boolean {
  const type = (doc.docType ?? "").toLowerCase();
  const name = (doc.filename ?? "").toLowerCase();
  const mime = (doc.mimeType ?? "").toLowerCase();
  const looksPdf =
    !mime ||
    mime.includes("pdf") ||
    mime.includes("octet-stream") ||
    name.endsWith(".pdf");
  if (!looksPdf) return false;
  return (
    type === "dec" ||
    type === "declaration" ||
    type === "policy_dec" ||
    type === "current_policy" ||
    /\bdec(laration)?s?\b/.test(name) ||
    /declaration/.test(name)
  );
}

export function findDealDeclaration(docs: readonly DeclarationLike[]): DeclarationLike | null {
  const hits = docs.filter(isDeclarationPdf);
  if (!hits.length) return null;
  const scored = hits.map((doc, index) => {
    const type = (doc.docType ?? "").toLowerCase();
    let score = index;
    if (type === "dec") score += 40;
    else if (type === "policy_dec") score += 30;
    else if (type === "current_policy") score += 10;
    if ((doc.slot ?? "") === "source_doc") score += 5;
    return { doc, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.doc ?? null;
}

export function evaluateMintGate(input: {
  currentStage?: string | null;
  selectedQuoteIds?: readonly string[] | null;
  liveQuoteIds?: readonly string[] | null;
  docs?: readonly DeclarationLike[] | null;
  surface?: MintSurface | string | null;
  mintStatus?: string | null;
}): { ok: true; dec: DeclarationLike } | { ok: false; reason: MintGateReason } {
  if (quotesOnlyStageBlocked(POLICY_ISSUED_STAGE, input.surface)) {
    return { ok: false, reason: "quotes_only" };
  }
  if (!isBoundReadyForIssue(input.currentStage)) {
    return { ok: false, reason: "need_bound" };
  }
  if (
    lateStageNeedsQuoteSelection({
      stage: POLICY_ISSUED_STAGE,
      selectedQuoteIds: input.selectedQuoteIds,
      liveQuoteIds: input.liveQuoteIds,
    })
  ) {
    return { ok: false, reason: "need_quote" };
  }
  if (input.mintStatus === "creating") {
    return { ok: false, reason: "creating" };
  }
  const dec = findDealDeclaration(input.docs ?? []);
  if (!dec) return { ok: false, reason: "need_dec" };
  return { ok: true, dec };
}

export function normalizeMintValue(key: string, raw: string | number | null | undefined): string {
  const value = raw == null ? "" : String(raw).trim();
  if (!value) return "";
  if (key === "premium" || key === "coverage_a") {
    const n = Number(value.replace(/[$,]/g, ""));
    return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : value;
  }
  if (key === "billing_frequency") {
    const low = value.toLowerCase();
    if (/\bmonth/.test(low)) return "monthly";
    if (/\bquarter/.test(low)) return "quarterly";
    if (/\bsemi|6\s*month/.test(low)) return "semiannual";
    if (/\bescrow|mortgagee/.test(low)) return "escrow";
    if (/\bannual|year/.test(low)) return "annual";
    return value;
  }
  if (key.endsWith("_date") || key === "next_due") {
    const iso = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1]!;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return value;
}

export function valuesMismatch(key: string, left?: string | null, right?: string | null): boolean {
  const a = normalizeMintValue(key, left);
  const b = normalizeMintValue(key, right);
  if (!a || !b) return false;
  return a !== b;
}

function sheetCell(
  sheet: Record<string, { value?: string | null } | undefined> | null | undefined,
  ...keys: string[]
): string {
  if (!sheet) return "";
  for (const key of keys) {
    const hit = normalizeMintValue(key, sheet[key]?.value);
    if (hit) return hit;
  }
  return "";
}

function geminiCell(
  rows: readonly {
    fieldKey: string;
    normalizedValue?: string | null;
    rawValue?: string | null;
    confidence?: number | null;
    flagged?: boolean | null;
  }[],
  ...keys: string[]
) {
  for (const key of keys) {
    const row = rows.find((item) => item.fieldKey === key);
    if (!row) continue;
    const value = normalizeMintValue(key, row.normalizedValue || row.rawValue);
    if (!value) continue;
    return {
      value,
      confidence: Number(row.confidence ?? 0),
      flagged: Boolean(row.flagged),
    };
  }
  return null;
}

export type MintIdentity = {
  namedInsured?: string | null;
  mailingAddress?: string | null;
  propertyAddress?: string | null;
  sellingAgency?: string | null;
  producer?: string | null;
  insuranceType?: string | null;
  form?: string | null;
  renewalDate?: string | null;
  roofYear?: string | number | null;
  mortgagee?: string | null;
  billingFrequency?: string | null;
  nextDue?: string | null;
  paymentMethod?: string | null;
  coverageA?: string | number | null;
};

function identityCell(identity: MintIdentity | null | undefined, key: string): string {
  if (!identity) return "";
  if (key === "named_insured") return normalizeMintValue(key, identity.namedInsured);
  if (key === "mailing_address") {
    return (
      normalizeMintValue(key, identity.propertyAddress) ||
      normalizeMintValue(key, identity.mailingAddress)
    );
  }
  if (key === "selling_agency") return normalizeMintValue(key, identity.sellingAgency);
  if (key === "producer") return normalizeMintValue(key, identity.producer);
  if (key === "insurance_type") return normalizeMintValue(key, identity.insuranceType);
  if (key === "form") return normalizeMintValue(key, identity.form);
  if (key === "renewal_date") return normalizeMintValue(key, identity.renewalDate);
  if (key === "roof_year") return normalizeMintValue(key, identity.roofYear);
  if (key === "mortgagee") return normalizeMintValue(key, identity.mortgagee);
  if (key === "billing_frequency") return normalizeMintValue(key, identity.billingFrequency);
  if (key === "next_due") return normalizeMintValue(key, identity.nextDue);
  if (key === "payment_method") return normalizeMintValue(key, identity.paymentMethod);
  if (key === "coverage_a") return normalizeMintValue(key, identity.coverageA);
  return "";
}

export function buildMintFields(input: {
  gemini?: readonly {
    fieldKey: string;
    normalizedValue?: string | null;
    rawValue?: string | null;
    confidence?: number | null;
    flagged?: boolean | null;
  }[];
  sheet?: Record<string, { value?: string | null } | undefined> | null;
  sold?: {
    premium?: string | number | null;
    coverageA?: number | string | null;
    hurricaneDeductible?: string | null;
    aopDeductible?: string | null;
  } | null;
  identity?: MintIdentity | null;
  threshold?: number;
}): MintField[] {
  const threshold = input.threshold ?? CONFIDENCE_THRESHOLD;
  const gemini = input.gemini ?? [];
  const sold = {
    premium: normalizeMintValue("premium", input.sold?.premium),
    coverage_a: normalizeMintValue("coverage_a", input.sold?.coverageA),
    hurricane_deductible: normalizeMintValue(
      "hurricane_deductible",
      input.sold?.hurricaneDeductible,
    ),
    aop_deductible: normalizeMintValue("aop_deductible", input.sold?.aopDeductible),
  };

  return MINT_CONFIRM_FIELDS.map((def) => {
    const aliases = MINT_FIELD_ALIASES[def.key] ?? [def.key];
    const gem = geminiCell(gemini, ...aliases);
    const fromSheet = sheetCell(input.sheet, ...aliases);
    const soldValue = SOLD_KEYS.has(def.key)
      ? sold[def.key as keyof typeof sold] || ""
      : "";
    const sheetValue = fromSheet || identityCell(input.identity, def.key);
    const geminiValue = gem?.value ?? "";
    const geminiConfidence = gem?.confidence ?? 0;
    const lowGemini = Boolean(geminiValue) && geminiConfidence < threshold;

    // Issued policy: declaration (Gemini) wins. Deal/sheet next. Sold stub is fallback/hint only.
    let value = "";
    let source: MintFieldSource = "deal";
    if (geminiValue && !lowGemini) {
      value = geminiValue;
      source = "gemini";
    } else if (sheetValue) {
      value = sheetValue;
      source = "sheet";
    } else if (geminiValue) {
      value = geminiValue;
      source = "gemini";
    } else if (SOLD_KEYS.has(def.key) && soldValue) {
      value = soldValue;
      source = "quote";
    }

    const mismatch =
      valuesMismatch(def.key, geminiValue, soldValue) ||
      valuesMismatch(def.key, geminiValue, sheetValue);
    const missingRequired =
      (def.key === "policy_number" || def.key === "effective_date") && !value;
    const flagged = Boolean(lowGemini || mismatch || missingRequired || gem?.flagged);
    return {
      key: def.key,
      label: def.label,
      value,
      confidence: geminiValue ? geminiConfidence : value ? 1 : 0,
      source,
      flagged,
      confirmed: !flagged && Boolean(value),
      soldValue: soldValue || null,
      sheetValue: sheetValue || null,
      geminiValue: geminiValue || null,
    };
  });
}

/** Value the confirm card should offer — Gemini/deal, never a stub that overwrote the dec. */
export function mintProposedValue(field: Pick<MintField, "key" | "value" | "geminiValue" | "sheetValue" | "soldValue">): string {
  const gemini = normalizeMintValue(field.key, field.geminiValue);
  const sheet = normalizeMintValue(field.key, field.sheetValue);
  const current = normalizeMintValue(field.key, field.value);
  const sold = normalizeMintValue(field.key, field.soldValue);
  if (gemini) return gemini;
  if (sheet) return sheet;
  if (current && current !== sold) return current;
  return current;
}

export function mintFieldPolicyPatch(fields: readonly MintField[]): {
  policyNumber?: string;
  premium?: string | null;
  coverageA?: number | null;
  formType?: string | null;
  insuranceType?: string | null;
  premisesAddress?: string | null;
  sellingAgency?: string | null;
  producer?: string | null;
  billingFrequency?: string | null;
  renewalDate?: string | null;
  roofYear?: number | null;
  mortgagee?: string | null;
  nextDue?: string | null;
  paymentMethod?: string | null;
} {
  const get = (key: string) => fields.find((row) => row.key === key)?.value?.trim() || "";
  const coverageARaw = get("coverage_a");
  const coverageA = coverageARaw ? Number(coverageARaw.replace(/[$,]/g, "")) : NaN;
  const roofRaw = get("roof_year");
  const roofYear = roofRaw ? Number(roofRaw.replace(/[^\d]/g, "").slice(0, 4)) : NaN;
  return {
    policyNumber: get("policy_number") || undefined,
    premium: get("premium") || null,
    coverageA: Number.isFinite(coverageA) ? coverageA : null,
    formType: get("form") || null,
    insuranceType: get("insurance_type") || null,
    premisesAddress: get("mailing_address") || null,
    sellingAgency: get("selling_agency") || null,
    producer: get("producer") || null,
    billingFrequency: get("billing_frequency") || null,
    renewalDate: get("renewal_date") || null,
    roofYear: Number.isFinite(roofYear) && roofYear > 1900 ? roofYear : null,
    mortgagee: get("mortgagee") || null,
    nextDue: get("next_due") || null,
    paymentMethod: get("payment_method") || null,
  };
}

export function mintConfirmQueue(fields: readonly MintField[]): MintField[] {
  return fields.filter((field) => !field.confirmed);
}

export function mintNeedsConfirm(payload: MintPayload | null | undefined): boolean {
  if (!payload || payload.status === "published") return false;
  return mintConfirmQueue(payload.fields).length > 0;
}

export function canPublishMint(payload: MintPayload | null | undefined): boolean {
  if (!payload || payload.status === "published") return false;
  return mintConfirmQueue(payload.fields).length === 0;
}

export function confirmMintField(
  fields: readonly MintField[],
  key: string,
  value: string,
): MintField[] {
  return fields.map((field) =>
    field.key === key
      ? {
          ...field,
          value: normalizeMintValue(key, value) || field.value,
          confirmed: true,
          flagged: false,
          source: "agent",
        }
      : field,
  );
}

export function parseMintPayload(raw: unknown): MintPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Partial<MintPayload>;
  if (!row.soldBasis || typeof row.soldBasis !== "object") return null;
  const status =
    row.status === "creating" || row.status === "unpublished" || row.status === "published"
      ? row.status
      : "unpublished";
  const fields = Array.isArray(row.fields)
    ? row.fields
        .filter((field): field is MintField => Boolean(field && typeof field === "object" && field.key))
        .map((field) => ({
          key: String(field.key),
          label: String(field.label || field.key),
          value: String(field.value ?? ""),
          confidence: Number(field.confidence ?? 0),
          source: (field.source ?? "deal") as MintFieldSource,
          flagged: Boolean(field.flagged),
          confirmed: Boolean(field.confirmed),
          soldValue: field.soldValue ?? null,
          sheetValue: field.sheetValue ?? null,
          geminiValue: field.geminiValue ?? null,
        }))
    : [];
  return {
    status,
    soldBasis: {
      quoteId: String(row.soldBasis.quoteId ?? ""),
      carrierId: row.soldBasis.carrierId ?? null,
      premium: row.soldBasis.premium ?? null,
      coverageA: row.soldBasis.coverageA ?? null,
      hurricaneDeductible: row.soldBasis.hurricaneDeductible ?? null,
      aopDeductible: row.soldBasis.aopDeductible ?? null,
    },
    fields,
    decDocumentId: row.decDocumentId ?? null,
    decFilename: row.decFilename ?? null,
    product: row.product ?? null,
    mintedAt: typeof row.mintedAt === "string" ? row.mintedAt : null,
    adminNotifiedAt: typeof row.adminNotifiedAt === "string" ? row.adminNotifiedAt : null,
  };
}

export function policyMintUnpublished(policy: {
  publishedAt?: Date | string | null;
  status?: string | null;
  mintPayload?: unknown;
}): boolean {
  if (policy.publishedAt) return false;
  if ((policy.status ?? "").toLowerCase() === "unpublished") return true;
  const payload = parseMintPayload(policy.mintPayload);
  return Boolean(payload && payload.status !== "published");
}

export function policyNeedsMintConfirm(policy: {
  publishedAt?: Date | string | null;
  status?: string | null;
  mintPayload?: unknown;
}): boolean {
  if (!policyMintUnpublished(policy)) return false;
  return mintNeedsConfirm(parseMintPayload(policy.mintPayload));
}

/** Unpublished or already-minted book — agent can force a fresh Gemini pass on the linked dec. */
export function policyCanRereadMint(policy: {
  mintPayload?: unknown;
  sourceDocumentId?: string | null;
  sourceProduct?: string | null;
  status?: string | null;
}): boolean {
  if (parseMintPayload(policy.mintPayload)) return true;
  if (policy.sourceDocumentId || policy.sourceProduct) return true;
  return (policy.status ?? "").toLowerCase() === "unpublished";
}

/** Cached extract is only a fallback when it actually has dec fields. */
export function mintExtractUseful(
  rows: readonly {
    fieldKey: string;
    normalizedValue?: string | null;
    rawValue?: string | null;
  }[],
): boolean {
  const useful = new Set([
    "premium",
    "current_premium",
    "policy_number",
    "coverage_a",
    "named_insured",
  ]);
  return rows.some(
    (row) => useful.has(row.fieldKey) && String(row.normalizedValue || row.rawValue || "").trim(),
  );
}

/** Published mint that never got a Gemini pass — empty confirmed boxes or stub premium. */
export function mintPayloadLooksFrozen(payload: MintPayload | null | undefined): boolean {
  if (!payload) return false;
  const confirmedEmpty = payload.fields.some(
    (field) =>
      field.confirmed &&
      !String(field.value ?? "").trim() &&
      !field.geminiValue &&
      !field.sheetValue,
  );
  if (confirmedEmpty) return true;
  const premium = payload.fields.find((field) => field.key === "premium");
  return Boolean(premium && premium.source === "quote" && !premium.geminiValue);
}

/** Null, stub-only, or no Gemini values — wipe and fully re-extract instead of patching. */
export function mintLooksThin(payload: MintPayload | null | undefined): boolean {
  if (!payload) return true;
  if (mintPayloadLooksFrozen(payload)) return true;
  return !payload.fields.some((field) => String(field.geminiValue ?? "").trim());
}

export function mintPayloadAfterReread(input: {
  soldBasis: MintSoldBasis;
  fields: MintField[];
  decDocumentId?: string | null;
  decFilename?: string | null;
  product?: string | null;
  mintedAt?: string;
}): MintPayload {
  return {
    status: "unpublished",
    soldBasis: input.soldBasis,
    fields: input.fields,
    decDocumentId: input.decDocumentId ?? null,
    decFilename: input.decFilename ?? null,
    product: input.product ?? null,
    mintedAt: input.mintedAt ?? new Date().toISOString(),
    adminNotifiedAt: null,
  };
}

export function policyForProduct<
  T extends {
    id: string;
    sourceProduct?: string | null;
    lineOfBusiness?: string | null;
    mintPayload?: unknown;
  },
>(policies: readonly T[], product: string, lob?: string | null): T | null {
  const exact = policies.find((row) => row.sourceProduct === product);
  if (exact) return exact;
  const fromPayload = policies.find((row) => parseMintPayload(row.mintPayload)?.product === product);
  if (fromPayload) return fromPayload;
  if (!lob) return null;
  const byLob = policies.filter((row) => row.lineOfBusiness === lob && !row.sourceProduct);
  return byLob.length === 1 ? byLob[0]! : null;
}
