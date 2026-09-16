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
};

export const MINT_CONFIRM_FIELDS = [
  { key: "policy_number", label: "Policy number" },
  { key: "named_insured", label: "Named insured" },
  { key: "effective_date", label: "Effective" },
  { key: "expiration_date", label: "Expiration" },
  { key: "premium", label: "Premium" },
  { key: "coverage_a", label: "Coverage A" },
  { key: "form", label: "Form" },
  { key: "hurricane_deductible", label: "Hurricane deductible" },
  { key: "aop_deductible", label: "AOP deductible" },
  { key: "mailing_address", label: "Mailing / premises" },
] as const;

const SOLD_KEYS = new Set(["premium", "coverage_a", "hurricane_deductible", "aop_deductible"]);

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
  if (key.endsWith("_date")) {
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
  identity?: { namedInsured?: string | null; mailingAddress?: string | null } | null;
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
  const identityNamed = (input.identity?.namedInsured ?? "").trim();
  const identityMailing = (input.identity?.mailingAddress ?? "").trim();

  return MINT_CONFIRM_FIELDS.map((def) => {
    const gem = geminiCell(
      gemini,
      def.key,
      def.key === "named_insured" ? "current_policy_name_insured" : "",
      def.key === "named_insured" ? "applicant_name" : "",
      def.key === "mailing_address" ? "address" : "",
      def.key === "mailing_address" ? "address1" : "",
      def.key === "mailing_address" ? "property_address" : "",
    );
    const fromSheet = sheetCell(
      input.sheet,
      def.key,
      def.key === "named_insured" ? "applicant_name" : "",
      def.key === "named_insured" ? "current_policy_named_insured" : "",
      def.key === "mailing_address" ? "address1" : "",
      def.key === "mailing_address" ? "address" : "",
    );
    const soldValue = SOLD_KEYS.has(def.key)
      ? sold[def.key as keyof typeof sold] || ""
      : "";
    const sheetValue =
      fromSheet ||
      (def.key === "named_insured" ? identityNamed : "") ||
      (def.key === "mailing_address" ? identityMailing : "");
    const geminiValue = gem?.value ?? "";
    const geminiConfidence = gem?.confidence ?? 0;
    const lowGemini = Boolean(geminiValue) && geminiConfidence < threshold;

    let value = "";
    let source: MintFieldSource = "deal";
    if (SOLD_KEYS.has(def.key) && soldValue) {
      value = soldValue;
      source = "quote";
    } else if (geminiValue && !lowGemini) {
      value = geminiValue;
      source = "gemini";
    } else if (sheetValue) {
      value = sheetValue;
      source = "sheet";
    } else if (geminiValue) {
      value = geminiValue;
      source = "gemini";
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
