import {
  canonicalizeProductStage,
  productChipBound,
  type DealProductStageState,
  type DealProductStages,
} from "@/lib/deals/product-stages";
import type { DealProductId } from "@/lib/deals/deal-products";

/**
 * Rosa Castellanos forcing case — dec uploaded as an agency quote file.
 * Rosa's deal was archived by hand; new last-product publishes auto-archive.
 */
export const ROSA_DEC_DEAL_ID = "5d4a4c04-a477-4691-8cc7-32d5ccf70351";
export const ROSA_DEC_DOCUMENT_ID = "cbd6719e-4d8e-4ed8-820e-0b3f1c07aa5f";
export const ROSA_DEC_FILENAME = "Rosa Castellanos Florida Peninsula HO3 Dec Page.pdf";

/** Domenic Iori Travelers mint DEC — retag current_policy → policy_dec when still needed. */
export const DOMENIC_IORI_DEC_DOCUMENT_ID = "cf3a14da-70f0-4042-b8cb-0e6e2692025a";
export const DOMENIC_IORI_POLICY_ID = "779ad733-1bc2-4729-8ed1-80208f600121";

export const MINT_CONFIRM_TASK_KIND = "mint_confirm";
export const MINT_ADMIN_NOTIFY_KIND = "mint_unpublished_72h";
export const MINT_ADMIN_NOTIFY_MS = 72 * 60 * 60 * 1000;

export const DECLARATION_DOC_TYPES = ["dec", "declaration", "policy_dec"] as const;

const DEC_SIGNAL_KEYS = [
  "policy_number",
  "named_insured",
  "current_policy_name_insured",
  "effective_date",
  "coverage_a",
  "form",
  "premium",
  "current_premium",
];

const REJECT_DEC_RE =
  /doesn['’]?t look like a dec|not[_ ]a[_ ]declaration|not a declarations? page|quote packet|wind mit|four[- ]point|4-?point inspection/i;

export type PendingDecPrompt = {
  documentId: string;
  carrierName: string;
  product?: string | null;
  createdAt: string;
};

export type GeminiDecLookInput = {
  documentKind?: string | null;
  fields?: readonly { fieldKey: string; normalizedValue?: string | null; rawValue?: string | null }[];
  notes?: readonly string[] | null;
  rawText?: string | null;
  ran?: boolean;
};

export function isDeclarationDocType(docType?: string | null): boolean {
  const type = (docType ?? "").trim().toLowerCase();
  if (!type || type === "aor") return false;
  return (
    type === "dec" ||
    type === "declaration" ||
    type === "policy_dec" ||
    type === "current_policy" ||
    type.includes("declar")
  );
}

export function coerceDeclarationDocType(value: string): string {
  const raw = value.trim().toLowerCase();
  if (raw === "declaration" || raw === "declarations" || raw === "dec_page") return "dec";
  return raw;
}

export function parseDocumentKind(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) return raw.trim().toLowerCase();
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const value = (raw as { value?: unknown }).value;
    if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
  }
  return null;
}

export function documentKindFromGeminiJson(json: unknown): string | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  return parseDocumentKind((json as { document_kind?: unknown }).document_kind);
}

/** Gemini reject wins. Typed Declaration + no Gemini still prompts. */
export function looksLikeDeclarationFromGemini(input: GeminiDecLookInput): boolean | "unknown" {
  const kind = (input.documentKind ?? "").trim().toLowerCase();
  if (kind === "not_declaration" || kind === "not-declaration") return false;
  const blob = [`${input.notes?.join(" ") ?? ""}`, input.rawText ?? ""].join(" ");
  if (REJECT_DEC_RE.test(blob)) return false;
  if (kind === "declaration" || kind === "dec") return true;
  const hits = (input.fields ?? []).filter((row) => {
    if (!DEC_SIGNAL_KEYS.includes(row.fieldKey)) return false;
    return Boolean((row.normalizedValue || row.rawValue || "").trim());
  });
  if (hits.length >= 2) return true;
  if (input.ran && hits.length === 0) return false;
  return "unknown";
}

export function shouldPromptCreatePolicy(input: {
  docType?: string | null;
  looksLikeDec?: boolean | "unknown" | null;
}): boolean {
  if (!isDeclarationDocType(input.docType)) return false;
  if (input.looksLikeDec === false) return false;
  return true;
}

/**
 * Create policy is the Bound → Policy issued mint. A current-policy dec used
 * to fill an open shop must not queue that prompt.
 */
export function allowCreatePolicyPrompt(input: {
  stage?: string | null;
  force?: boolean;
}): boolean {
  if (input.force) return true;
  return productChipBound(input.stage);
}

export function parsePendingDecPrompt(raw: unknown): PendingDecPrompt | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Partial<PendingDecPrompt>;
  const documentId = typeof row.documentId === "string" ? row.documentId.trim() : "";
  if (!documentId) return null;
  return {
    documentId,
    carrierName: typeof row.carrierName === "string" && row.carrierName.trim() ? row.carrierName.trim() : "the carrier",
    product: typeof row.product === "string" && row.product.trim() ? row.product.trim() : null,
    createdAt: typeof row.createdAt === "string" && row.createdAt.trim() ? row.createdAt : new Date().toISOString(),
  };
}

export function createPolicyPromptCopy(carrierName?: string | null): string {
  const carrier = (carrierName ?? "").trim() || "the carrier";
  return `Declaration received from ${carrier}. Create the policy now?`;
}

/** In-modal hold while Gemini reads the dec (~10s). Warm, obvious WaitHold. */
export const CREATE_POLICY_BUSY_TITLE = "Hold on — we’re processing your policy";
export const CREATE_POLICY_BUSY_COPY = "Reading the declaration and building the draft…";
export const CREATE_POLICY_SUCCESS_TITLE = "Congratulations — a new policy was created";
export const CREATE_POLICY_SUCCESS_COPY = "Taking you to the policy so you can confirm the declaration."

export function isProductIssuedDone(state?: DealProductStageState | null): boolean {
  if (!state) return false;
  if (state.issuedDone) return true;
  return canonicalizeProductStage(state.stage) === "closed_won" && state.mintStatus === "published";
}

export function isProductClosedForDealWon(state?: DealProductStageState | null): boolean {
  if (!state) return false;
  const stage = canonicalizeProductStage(state.stage);
  if (stage === "closed_lost") return true;
  return isProductIssuedDone(state) || stage === "closed_won";
}

export function markProductIssuedDone(
  stages: DealProductStages | null | undefined,
  product: string,
  patch?: Partial<DealProductStageState>,
): DealProductStages {
  const current = (stages ?? {})[product];
  return {
    ...(stages ?? {}),
    [product]: {
      stage: "closed_won",
      selectedQuoteIds: patch?.selectedQuoteIds ?? current?.selectedQuoteIds ?? [],
      lostReason: null,
      policyId: patch?.policyId === undefined ? current?.policyId ?? null : patch.policyId,
      mintStatus: "published",
      issuedDone: true,
      inspectionStatus: current?.inspectionStatus ?? current?.noticeType ?? "none",
      noticeType: current?.noticeType ?? current?.inspectionStatus ?? "none",
      noticeTaskId: current?.noticeTaskId ?? null,
      escrowNote: current?.escrowNote ?? null,
      noticeNote: current?.noticeNote ?? null,
    },
  };
}

export function activeShoppingProducts(
  products: readonly DealProductId[],
  stages: DealProductStages | null | undefined,
): DealProductId[] {
  return products.filter((product) => !isProductClosedForDealWon(stages?.[product] ?? null));
}

/** Only the minted line is won. Siblings stay open until they publish too. */
export function allProductsClosedForDealWon(
  products: readonly string[],
  stages: DealProductStages | null | undefined,
): boolean {
  if (!products.length) return false;
  return products.every((product) => isProductClosedForDealWon(stages?.[product] ?? null));
}

export function mintAdminNotifyDue(input: {
  status?: string | null;
  mintedAt?: string | Date | null;
  adminNotifiedAt?: string | Date | null;
  now?: Date;
}): boolean {
  if ((input.status ?? "").toLowerCase() === "published") return false;
  if (input.adminNotifiedAt) return false;
  if (!input.mintedAt) return false;
  const minted = input.mintedAt instanceof Date ? input.mintedAt : new Date(input.mintedAt);
  if (Number.isNaN(minted.getTime())) return false;
  const now = input.now ?? new Date();
  return now.getTime() - minted.getTime() >= MINT_ADMIN_NOTIFY_MS;
}

export function tagsAfterDeclarationRetag(tags?: readonly string[] | null): string[] {
  const next = (tags ?? []).filter((tag) => {
    const raw = tag.trim().toLowerCase();
    if (raw.startsWith("quote:")) return false;
    if (raw === "source:agency" || raw === "source:carrier") return false;
    return true;
  });
  if (!next.includes("dec")) next.push("dec");
  if (!next.includes("mint")) next.push("mint");
  return next;
}

export function declarationRetagPatch(filename?: string | null) {
  return {
    docType: "dec" as const,
    slot: "source_doc" as const,
    filename: filename || ROSA_DEC_FILENAME,
  };
}
