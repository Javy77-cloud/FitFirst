import { CONFIDENCE_THRESHOLD } from "@/lib/domain";
import { describeMintExtractFailure, type MintExtractFailureContext } from "@/lib/policy/mint-extract-failure";
import { parseAgentConfirm, type AgentConfirmAudit } from "@/lib/policy/agent-confirm";
import {
  isLateProductStage,
  lateStageNeedsQuoteSelection,
  normalizeStageSlug,
} from "@/lib/deals/product-stages";
import { quoteFolderKind, quoteFoldersByQuoteId } from "@/lib/deals/quote-docs";
import { splitPremisesAddress } from "@/lib/policy/premises";

export const POLICY_ISSUED_STAGE = "policy_issued";

export type MintSurface = "quotes" | "header" | "chip";

export type MintGateReason =
  | "invalid"
  | "need_quote"
  | "need_bound"
  | "need_dec"
  | "quotes_only"
  | "creating"
  | "need_dec_file"
  | "need_gemini"
  | "extract_failed"
  | "need_dec_fields";

export const NEED_DEC_FIELDS_MESSAGE =
  "Could not extract the policy number, premium, or effective date from the policy file. The file stays in the folder.";

export function mintFailureToast(reason: string): { key: string; kind: "error" | "success" } {
  switch (reason) {
    case "need_quote":
      return { key: "need-quote", kind: "error" };
    case "need_gemini":
      return { key: "gemini-needs-key", kind: "error" };
    case "need_dec_file":
      return { key: "need-dec-file", kind: "error" };
    case "extract_failed":
      return { key: "dec-extract-failed", kind: "error" };
    case "need_dec_fields":
      return { key: "need-dec-fields", kind: "error" };
    case "need_dec":
      return { key: "need-dec", kind: "error" };
    case "missing":
      return { key: "mint-policy-missing", kind: "error" };
    case "invalid":
      return { key: "mint-confirm-invalid", kind: "error" };
    case "need_confirm":
      return { key: "need-confirm", kind: "error" };
    default:
      return { key: "deal-updated", kind: "success" };
  }
}

export type DeclarationLike = {
  id: string;
  filename?: string | null;
  mimeType?: string | null;
  docType?: string | null;
  slot?: string | null;
  tags?: readonly string[] | null;
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
  /** Set when the agent marks Policy looks good. Unpublished until then. */
  agentConfirm?: AgentConfirmAudit | null;
};

export const MINT_CONFIRM_FIELDS = [
  { key: "policy_number", label: "Policy number" },
  { key: "named_insured", label: "Named insured" },
  { key: "effective_date", label: "Effective date" },
  { key: "expiration_date", label: "Expiration date" },
  { key: "premium", label: "Premium" },
  { key: "coverage_a", label: "Coverage A / dwelling" },
  { key: "form", label: "Form" },
  { key: "insurance_type", label: "Insurance type" },
  { key: "hurricane_deductible", label: "Hurricane deductible" },
  { key: "aop_deductible", label: "AOP deductible" },
  { key: "mailing_address", label: "Insured location" },
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

/** Risk / premises keys — never Insured/mailing when both exist and differ. */
export const MINT_PROPERTY_ADDRESS_ALIASES = [
  "property_address",
  "location_description",
  "property_information",
  "insured_property",
  "residence_premises",
  "location",
  "address",
  "address1",
  "applicant_address",
] as const;

/** Where they live — last-resort only for the Location / property confirm field. */
export const MINT_MAILING_ADDRESS_ALIASES = ["mailing_address", "contact_mailing_address"] as const;

export const MINT_NO_MORTGAGE = "No mortgage";
export const MINT_PAYMENT_MORTGAGEE = "billed through mortgagee";
export const MINT_PAYMENT_DIRECT = "client direct payment";

const HO_MINT_PRODUCTS = new Set(["homeowners", "homeowner", "home", "ho", "ho3", "landlord", "renters"]);

/** Homeowners-family mint — annual / next-due / mortgagee defaults. Not Auto or Flood. */
export function isHomeownersMintProduct(product?: string | null): boolean {
  const p = (product ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return HO_MINT_PRODUCTS.has(p);
}

export function isNoMortgageValue(raw?: string | null): boolean {
  const value = (raw ?? "").trim();
  if (!value) return true;
  return /^(n\/?a|none|no|no mortgagee?|no additional interest|not applicable|-|—)$/i.test(value);
}

export function mortgageePresent(raw?: string | null): boolean {
  const value = (raw ?? "").trim();
  if (!value) return false;
  if (isNoMortgageValue(value)) return false;
  return normalizeMintValue("mortgagee", value) !== MINT_NO_MORTGAGE;
}

/** Gemini / sheet keys that fill a mint confirm field. */
export const MINT_FIELD_ALIASES: Record<string, string[]> = {
  policy_number: [
    "policy_number",
    "policy_no",
    "policy_num",
    "pol_number",
    "pol_no",
    "pol_num",
    "policy_id",
    "policy_number_id",
  ],
  named_insured: [
    "named_insured",
    "current_policy_name_insured",
    "current_policy_named_insured",
    "applicant_name",
  ],
  effective_date: [
    "effective_date",
    "eff_date",
    "policy_effective_date",
    "inception_date",
    "policy_period_start",
    "from_date",
  ],
  expiration_date: [
    "expiration_date",
    "exp_date",
    "policy_expiration_date",
    "policy_period_end",
    "to_date",
  ],
  premium: [
    "premium",
    "current_premium",
    "total_premium",
    "annual_premium",
    "total_annual_premium",
    "policy_premium",
    "written_premium",
    "term_premium",
    "yearly_premium",
    "full_term_premium",
    "total_policy_premium",
    "premium_due",
    "total_premium_due",
    "six_month_premium",
    "six_month_total_premium",
    "6_month_premium",
    "6_mo_premium",
    "6_month_total_premium",
    "total_6_month_premium",
    "total_six_month_premium",
    "semi_annual_premium",
    "semiannual_premium",
    "premium_for_the_policy_period",
    "total_premium_for_the_policy_period",
    "total_full_term_premium",
    "full_term_premium_charges",
  ],
  coverage_a: ["coverage_a", "dwelling"],
  form: ["form", "policy_form", "quoting_form"],
  insurance_type: ["insurance_type", "insurance_family"],
  hurricane_deductible: ["hurricane_deductible"],
  aop_deductible: ["aop_deductible"],
  mailing_address: [...MINT_PROPERTY_ADDRESS_ALIASES, ...MINT_MAILING_ADDRESS_ALIASES],
  selling_agency: ["selling_agency"],
  renewal_date: [
    "renewal_date",
    "expiration_date",
    "exp_date",
    "policy_expiration_date",
    "policy_period_end",
  ],
  producer: ["producer"],
  roof_year: ["roof_year", "roof_age", "year_roof"],
  mortgagee: ["mortgagee", "mortgagee_name", "additional_interest"],
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

/** Phone photo / HEIC of an issued policy. Not a declarations PDF. */
export function isPolicyImage(doc: DeclarationLike): boolean {
  const mime = (doc.mimeType ?? "").toLowerCase();
  const name = (doc.filename ?? "").toLowerCase();
  return mime.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/.test(name);
}

/** Popup upload Gemini should read: a declarations PDF or a photo of that page. */
export function isIssuedPolicyDocument(doc: DeclarationLike): boolean {
  return isDeclarationPdf(doc) || isPolicyImage(doc);
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

function docTagSet(doc: DeclarationLike): Set<string> {
  return new Set((doc.tags ?? []).map((tag) => tag.trim().toLowerCase()));
}

function lineTagOf(doc: DeclarationLike): string | null {
  for (const tag of doc.tags ?? []) {
    const raw = tag.trim().toLowerCase();
    if (raw.startsWith("line:") && raw.length > "line:".length) return raw.slice("line:".length);
  }
  return null;
}

/**
 * Any file already in that quote's Manual or carrier folder.
 * Membership is `quoteFolderKind` — the same check as the folder badge.
 * A Manual upload stored as `agency_quote` without dec/mint tags still counts.
 * A shopping PDF on Documents (`source_doc`) does not.
 */
export function isFolderPolicyOrDeclaration(doc: DeclarationLike): boolean {
  return quoteFolderKind(doc) != null;
}

function scoreFolderPolicy(doc: DeclarationLike, index: number, line: string): number {
  const type = (doc.docType ?? "").toLowerCase();
  let score = index;
  if (type === "dec" || type === "declaration" || type === "policy_dec") score += 40;
  else if (type === "current_policy") score += 20;
  else if (isDeclarationPdf(doc) || isPolicyImage(doc)) score += 15;
  if (docTagSet(doc).has("mint") || docTagSet(doc).has("dec")) score += 10;
  if (line) {
    const tagged = lineTagOf(doc);
    if (!tagged || tagged === line) score += 1;
  }
  return score;
}

/**
 * Issued-policy file for this quote.
 * Looks only at files `quoteFoldersByQuoteId` would show in Manual or carrier.
 * A line tag is a preference when several files are in the folder. It does not
 * hide a file the badge already counts. Shopping docs outside those folders are ignored.
 */
export function findQuoteFolderPolicy(input: {
  docs?: readonly DeclarationLike[] | null;
  quoteIds?: readonly string[] | null;
  shopLine?: string | null;
}): DeclarationLike | null {
  const wanted = new Set((input.quoteIds ?? []).map((id) => id.trim()).filter(Boolean));
  if (!wanted.size) return null;
  const grouped = quoteFoldersByQuoteId(input.docs ?? []);
  const hits: { doc: DeclarationLike; index: number }[] = [];
  for (const quoteId of wanted) {
    const bucket = grouped[quoteId];
    if (!bucket) continue;
    for (const doc of [...bucket.manual, ...bucket.carrier]) {
      hits.push({ doc, index: hits.length });
    }
  }
  if (!hits.length) return null;
  const line = (input.shopLine ?? "").trim().toLowerCase();
  hits.sort((a, b) => scoreFolderPolicy(b.doc, b.index, line) - scoreFolderPolicy(a.doc, a.index, line));
  return hits[0]?.doc ?? null;
}

/** Quote ids whose Manual or carrier badge is already non-zero. Same folders as the gate. */
export function quoteIdsWithFolderPolicy(
  docs?: readonly DeclarationLike[] | null,
  shopLine?: string | null,
): string[] {
  const grouped = quoteFoldersByQuoteId(docs ?? []);
  const ids: string[] = [];
  for (const quoteId of Object.keys(grouped)) {
    const bucket = grouped[quoteId];
    if (!bucket || (bucket.manual.length === 0 && bucket.carrier.length === 0)) continue;
    if (
      !findQuoteFolderPolicy({
        docs: [...bucket.manual, ...bucket.carrier],
        quoteIds: [quoteId],
        shopLine,
      })
    ) {
      continue;
    }
    ids.push(quoteId);
  }
  return ids;
}

export function evaluateMintGate(input: {
  currentStage?: string | null;
  selectedQuoteIds?: readonly string[] | null;
  liveQuoteIds?: readonly string[] | null;
  docs?: readonly DeclarationLike[] | null;
  surface?: MintSurface | string | null;
  mintStatus?: string | null;
  /** Popup upload. Wins over an older dec so Gemini reads the file the agent just saved. */
  preferredDocumentId?: string | null;
  /** home / auto. Prefer a same-line folder file when several are already in Manual or carrier. */
  shopLine?: string | null;
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
  const preferredId = (input.preferredDocumentId ?? "").trim();
  const preferred = preferredId
    ? (input.docs ?? []).find((doc) => doc.id === preferredId)
    : null;
  // Explicit upload / Create policy pick. Stage changes do not pass this, so an
  // empty Manual + carrier folder returns need_dec before Gemini.
  if (preferred && isIssuedPolicyDocument(preferred)) return { ok: true, dec: preferred };
  const dec = findQuoteFolderPolicy({
    docs: input.docs,
    quoteIds: input.selectedQuoteIds,
    shopLine: input.shopLine,
  });
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
    if (/\bsemi|6\s*month/.test(low)) return "semiannual";
    if (/\bmonth/.test(low)) return "monthly";
    if (/\bquarter/.test(low)) return "quarterly";
    if (/\bescrow|mortgagee/.test(low)) return "escrow";
    if (/\bannual|year/.test(low)) return "annual";
    return value;
  }
  if (key === "mortgagee" && isNoMortgageValue(value)) return MINT_NO_MORTGAGE;
  if (key === "payment_method") {
    const low = value.toLowerCase();
    if (/\bescrow|mortgagee|impound|bill(ed)?\s*through/.test(low)) return MINT_PAYMENT_MORTGAGEE;
    if (/\bdirect|insured\s*pay|client/.test(low)) return MINT_PAYMENT_DIRECT;
    return value;
  }
  if (key.endsWith("_date") || key === "next_due") {
    const stripped = value
      .replace(/\d{1,2}:\d{2}\s*(?:a\.?\s*m\.?|p\.?\s*m\.?)/gi, " ")
      .replace(/\bstandard time\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const iso = stripped.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1]!;
    const parsed = new Date(stripped);
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

export function normalizeMintFieldKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[%$#]+/g, "")
    .replace(/[\s\-./]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export type MintGeminiRow = {
  fieldKey: string;
  normalizedValue?: string | null;
  rawValue?: string | null;
  confidence?: number | null;
  flagged?: boolean | null;
};

function geminiCell(rows: readonly MintGeminiRow[], ...keys: string[]) {
  for (const key of keys) {
    const wanted = normalizeMintFieldKey(key);
    for (const row of rows) {
      if (normalizeMintFieldKey(row.fieldKey) !== wanted) continue;
      const value = normalizeMintValue(keys[0] ?? row.fieldKey, row.normalizedValue || row.rawValue);
      if (!value) continue;
      return {
        value,
        confidence: Number(row.confidence ?? 0),
        flagged: Boolean(row.flagged),
      };
    }
  }
  return null;
}

/** Gemini value for a mint confirm key, including Florida Peninsula aliases. */
export function mintGeminiValue(rows: readonly MintGeminiRow[] | undefined, key: string): string {
  const aliases = MINT_FIELD_ALIASES[key] ?? [key];
  return geminiCell(rows ?? [], ...aliases)?.value ?? "";
}

export type MintExtractGateOk = {
  ok: true;
  policyNumber: string;
  premium: string;
  effectiveDate: string;
};

export type MintExtractGateErr = {
  ok: false;
  reason: "need_dec_fields";
  message: string;
  missing: string[];
};

/** Prefer the specific mint message (missing fields, wind mit, ID card) over the static flash key. */
export function mintFailureFlashText(result: { reason?: string | null; message?: string | null }): string {
  const reason = (result.reason ?? "").trim();
  const message = (result.message ?? "").trim();
  if (reason === "need_dec_fields" && message) return message;
  return mintFailureToast(reason).key;
}

export type MintExtractFallbacks = {
  /** Risk Profile / sheet Current Policy number when Gemini skipped it. */
  policyNumber?: string | null;
};

function fallbackText(raw?: string | null): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (/^(?:—|–|-|n\/a|na|none|unknown|tbd|pending)$/i.test(value)) return "";
  return value;
}

/** Hard gate: refuse hollow mint unless policy number, premium, and effective date are known. */
export function evaluateMintExtract(
  rows: readonly MintGeminiRow[] | undefined,
  context?: MintExtractFailureContext,
  fallbacks?: MintExtractFallbacks,
): MintExtractGateOk | MintExtractGateErr {
  let policyNumber = mintGeminiValue(rows, "policy_number");
  const premium = mintGeminiValue(rows, "premium");
  const effectiveDate = mintGeminiValue(rows, "effective_date");
  // Travelers (and similar) sometimes return premium + dates but omit policy_number.
  // Prefer a printed Current Policy number already on the Risk Profile over failing the mint.
  if (!policyNumber && premium && effectiveDate) {
    policyNumber = fallbackText(fallbacks?.policyNumber);
  }
  if (!policyNumber || !premium || !effectiveDate) {
    const failure = describeMintExtractFailure(rows ?? [], context ?? {}, (list, key) =>
      mintGeminiValue(list, key),
    );
    const missing = failure.missing;
    if (
      missing.length === 1 &&
      missing[0] === "policy number" &&
      premium &&
      effectiveDate
    ) {
      const fileLabel = (context?.filename ?? "").replace(/\s+/g, " ").trim();
      const fileBit = fileLabel ? ` File: ${fileLabel}.` : "";
      return {
        ok: false,
        reason: "need_dec_fields",
        missing,
        message:
          `Gemini read the premium and dates but not the policy number.${fileBit} ` +
          "Put the policy number on Risk Profile → Current Policy, then Issue again. The file stays in the folder.",
      };
    }
    return { ok: false, reason: "need_dec_fields", message: failure.message, missing };
  }
  return { ok: true, policyNumber, premium, effectiveDate };
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
  return "";
}

function pickMintPremises(input: {
  gemini: readonly MintGeminiRow[];
  sheet?: Record<string, { value?: string | null } | undefined> | null;
  identity?: MintIdentity | null;
  threshold: number;
}): {
  value: string;
  source: MintFieldSource;
  geminiValue: string;
  sheetValue: string;
  confidence: number;
  flagged: boolean;
} {
  const gemProp = geminiCell(input.gemini, ...MINT_PROPERTY_ADDRESS_ALIASES);
  const gemMail = geminiCell(input.gemini, ...MINT_MAILING_ADDRESS_ALIASES);
  const sheetProp =
    sheetCell(input.sheet, ...MINT_PROPERTY_ADDRESS_ALIASES) ||
    normalizeMintValue("mailing_address", input.identity?.propertyAddress);
  const sheetMail =
    sheetCell(input.sheet, ...MINT_MAILING_ADDRESS_ALIASES) ||
    normalizeMintValue("mailing_address", input.identity?.mailingAddress);

  if (gemProp?.value && gemProp.confidence >= input.threshold) {
    return {
      value: gemProp.value,
      source: "gemini",
      geminiValue: gemProp.value,
      sheetValue: sheetProp || sheetMail,
      confidence: gemProp.confidence,
      flagged: Boolean(gemProp.flagged) || valuesMismatch("mailing_address", gemProp.value, sheetProp),
    };
  }
  // Deal/sheet property beats Gemini mailing (Rosa: Cypress Point over SW 85th).
  if (sheetProp) {
    return {
      value: sheetProp,
      source: "sheet",
      geminiValue: gemProp?.value ?? "",
      sheetValue: sheetProp,
      confidence: gemProp?.value ? gemProp.confidence : 1,
      flagged: Boolean(gemProp?.flagged) || valuesMismatch("mailing_address", gemProp?.value, sheetProp),
    };
  }
  if (gemProp?.value) {
    return {
      value: gemProp.value,
      source: "gemini",
      geminiValue: gemProp.value,
      sheetValue: sheetMail,
      confidence: gemProp.confidence,
      flagged: true,
    };
  }
  if (gemMail?.value && gemMail.confidence >= input.threshold) {
    return {
      value: gemMail.value,
      source: "gemini",
      geminiValue: gemMail.value,
      sheetValue: sheetMail,
      confidence: gemMail.confidence,
      flagged: Boolean(gemMail.flagged) || valuesMismatch("mailing_address", gemMail.value, sheetMail),
    };
  }
  if (sheetMail) {
    return {
      value: sheetMail,
      source: "sheet",
      geminiValue: gemMail?.value ?? "",
      sheetValue: sheetMail,
      confidence: gemMail?.value ? gemMail.confidence : 1,
      flagged: Boolean(gemMail?.flagged) || valuesMismatch("mailing_address", gemMail?.value, sheetMail),
    };
  }
  if (gemMail?.value) {
    return {
      value: gemMail.value,
      source: "gemini",
      geminiValue: gemMail.value,
      sheetValue: "",
      confidence: gemMail.confidence,
      flagged: true,
    };
  }
  return { value: "", source: "deal", geminiValue: "", sheetValue: "", confidence: 0, flagged: false };
}

function fillDeskDefault(field: MintField, value: string): MintField {
  return {
    ...field,
    value,
    source: field.geminiValue ? field.source : "deal",
    confidence: field.confidence || 1,
    flagged: false,
    confirmed: true,
    sheetValue: field.sheetValue || value,
  };
}

/** Renewal = expiration on every line. HO-only: annual, next due, No mortgage, payment branch. */
export function applyMintDeskDefaults(
  fields: readonly MintField[],
  product?: string | null,
): MintField[] {
  const expiration =
    fields.find((row) => row.key === "expiration_date")?.value?.trim() ||
    fields.find((row) => row.key === "renewal_date")?.value?.trim() ||
    "";
  const ho = isHomeownersMintProduct(product);
  const mortgageeValue = fields.find((row) => row.key === "mortgagee")?.value ?? "";
  const resolvedMortgagee = ho && !mortgageeValue ? MINT_NO_MORTGAGE : mortgageeValue;
  const billingValue = fields.find((row) => row.key === "billing_frequency")?.value ?? "";
  const resolvedBilling = ho && !billingValue ? "annual" : billingValue;
  const annualHo = ho && normalizeMintValue("billing_frequency", resolvedBilling) === "annual";

  return fields.map((field) => {
    if (field.key === "renewal_date" && !field.value && expiration) {
      return fillDeskDefault(field, expiration);
    }
    if (!ho) return field;
    if (field.key === "mortgagee" && !field.value) {
      return fillDeskDefault(field, MINT_NO_MORTGAGE);
    }
    if (field.key === "billing_frequency" && !field.value) {
      return fillDeskDefault(field, "annual");
    }
    if (field.key === "next_due" && !field.value && annualHo && expiration) {
      return fillDeskDefault(field, expiration);
    }
    if (field.key === "payment_method" && !field.value) {
      return fillDeskDefault(
        field,
        mortgageePresent(resolvedMortgagee) ? MINT_PAYMENT_MORTGAGEE : MINT_PAYMENT_DIRECT,
      );
    }
    return field;
  });
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
  product?: string | null;
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

  const fields = MINT_CONFIRM_FIELDS.map((def) => {
    const aliases = MINT_FIELD_ALIASES[def.key] ?? [def.key];
    const soldValue = SOLD_KEYS.has(def.key)
      ? sold[def.key as keyof typeof sold] || ""
      : "";
    const premiumKey = def.key === "premium";

    if (def.key === "mailing_address") {
      const picked = pickMintPremises({
        gemini,
        sheet: input.sheet,
        identity: input.identity,
        threshold,
      });
      const missingRequired = false;
      const flagged = Boolean(picked.flagged || missingRequired);
      return {
        key: def.key,
        label: def.label,
        value: picked.value,
        confidence: picked.confidence,
        source: picked.source,
        flagged,
        confirmed: !flagged && Boolean(picked.value),
        soldValue: soldValue || null,
        sheetValue: picked.sheetValue || null,
        geminiValue: picked.geminiValue || null,
      };
    }

    const gem = geminiCell(gemini, ...aliases);
    const fromSheet = sheetCell(input.sheet, ...aliases);
    const sheetValue = fromSheet || identityCell(input.identity, def.key);
    const geminiValue = gem?.value ?? "";
    const geminiConfidence = gem?.confidence ?? 0;
    const lowGemini = Boolean(geminiValue) && geminiConfidence < threshold;

    // Issued policy: declaration (Gemini) wins. Deal/sheet next.
    // Sold quote is never booked for premium — hint only (soldValue).
    let value = "";
    let source: MintFieldSource = "deal";
    if (geminiValue && !lowGemini) {
      value = geminiValue;
      source = "gemini";
    } else if (sheetValue && !premiumKey) {
      value = sheetValue;
      source = "sheet";
    } else if (geminiValue) {
      value = geminiValue;
      source = "gemini";
    } else if (!premiumKey && SOLD_KEYS.has(def.key) && soldValue) {
      value = soldValue;
      source = "quote";
    }

    const mismatch =
      valuesMismatch(def.key, geminiValue, soldValue) ||
      valuesMismatch(def.key, geminiValue, sheetValue);
    const missingRequired =
      (def.key === "policy_number" || def.key === "effective_date" || premiumKey) && !geminiValue;
    const flagged = Boolean(lowGemini || mismatch || missingRequired || gem?.flagged);
    return {
      key: def.key,
      label: def.label,
      value,
      confidence: geminiValue ? geminiConfidence : value ? 1 : 0,
      source,
      flagged,
      confirmed: !flagged && Boolean(value) && (!premiumKey || Boolean(geminiValue)),
      soldValue: soldValue || null,
      sheetValue: sheetValue || null,
      geminiValue: geminiValue || null,
    };
  });

  return applyMintDeskDefaults(fields, input.product);
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
  premisesCity?: string | null;
  premisesState?: string | null;
  premisesZip?: string | null;
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
  const premises = splitPremisesAddress(get("mailing_address"));
  return {
    policyNumber: get("policy_number") || undefined,
    premium: get("premium") || null,
    coverageA: Number.isFinite(coverageA) ? coverageA : null,
    formType: get("form") || null,
    insuranceType: get("insurance_type") || null,
    premisesAddress: premises.street || null,
    premisesCity: premises.city,
    premisesState: premises.state,
    premisesZip: premises.zip,
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
  return fields.map((field) => {
    if (field.key !== key) return field;
    const normalized = normalizeMintValue(key, value);
    return {
      ...field,
      value: normalized || field.value || value.trim(),
      confirmed: true,
      flagged: false,
      source: "agent" as const,
    };
  });
}

/** Prefer the server field list after confirm; otherwise keep a local remaining filter. */
export function applyConfirmedMintFields(
  local: readonly MintField[],
  key: string,
  value: string,
  serverFields?: readonly MintField[] | null,
): MintField[] {
  if (Array.isArray(serverFields)) return serverFields.slice();
  return confirmMintField(local, key, value);
}

/** Ignore a stale refresh that would resurrect already-confirmed queue rows. */
export function adoptMintFields(
  local: readonly MintField[],
  incoming: readonly MintField[],
): MintField[] {
  const localRemaining = mintConfirmQueue(local).length;
  const incomingRemaining = mintConfirmQueue(incoming).length;
  if (local.length > 0 && localRemaining < incomingRemaining) return local.slice();
  return incoming.slice();
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
    agentConfirm: parseAgentConfirm(row.agentConfirm),
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
  const payload = parseMintPayload(policy.mintPayload);
  if (payload?.agentConfirm?.confirmedAt) return false;
  if (payload?.status === "published") return false;
  return true;
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
