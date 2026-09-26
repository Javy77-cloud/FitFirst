import { MISSING_GEMINI_KEY_MESSAGE } from "@/lib/extraction/gemini/key";
import { evaluateMintExtract, normalizeMintFieldKey } from "@/lib/policy/mint-gate";

export const DEC_FILE_MISSING_MESSAGE =
  "Could not read the declaration PDF from storage. Re-upload the file — local disk uploads do not survive Vercel deploys.";

export const DEC_EXTRACT_FAILED_MESSAGE =
  "Could not extract the required fields from the policy file. The file stays in the folder.";

export type GeminiMintRow = {
  fieldKey: string;
  normalizedValue: string | null;
  rawValue: string | null;
  confidence: number;
  flagged: boolean;
};

export type LoadGeminiRowsReason = "need_dec_file" | "need_gemini" | "extract_failed";

export type LoadGeminiRowsOk = {
  ok: true;
  rows: GeminiMintRow[];
  cached: boolean;
  documentKind?: string | null;
  geminiPreview?: string | null;
};

export type LoadGeminiRowsErr = {
  ok: false;
  reason: LoadGeminiRowsReason;
  message: string;
};

export type LoadGeminiRowsResult = LoadGeminiRowsOk | LoadGeminiRowsErr;

export type ReadDocumentBytes = (storagePath: string) => Promise<Buffer | null>;

export type LoadGeminiRowsInput = {
  docId: string;
  storagePath?: string | null;
  mimeType?: string | null;
  filename?: string | null;
  force?: boolean;
  /** home / auto — Auto issued policies must use the current-policy prompt. */
  shopLine?: string | null;
  /** dec or current_policy. Defaults to dec for homeowners. */
  docType?: string | null;
  /** Fill from declaration — cap retries so a long PDF cannot outlive the function. */
  extractPurpose?: "fill" | "extract";
};

export type GeminiExtractFn = (
  buffer: Buffer,
  docType: string,
  options: {
    apiKey: string;
    mimeType: string;
    filename: string;
    shopLine?: string | null;
    purpose?: "fill" | "extract";
  },
) => Promise<{
  ok: boolean;
  message?: string;
  result: {
    fields: Array<{
      fieldKey: string;
      normalizedValue?: string | null;
      rawValue?: string | null;
      confidence?: number | null;
      flagged?: boolean | null;
    }>;
    documentKind?: string | null;
    geminiPreview?: string | null;
  };
}>;

export type LoadGeminiRowsDeps = {
  readStoredFile: ReadDocumentBytes;
  loadCachedRows?: (docId: string) => Promise<GeminiMintRow[]>;
  loadGeminiApiKey?: () => Promise<string | null | undefined>;
  extractWithGeminiPdf?: GeminiExtractFn;
  persistRows?: (docId: string, rows: GeminiMintRow[]) => Promise<void>;
  log?: (message: string, extra?: Record<string, unknown>) => void;
};

function defaultLog(message: string, extra?: Record<string, unknown>) {
  if (extra) console.error(message, extra);
  else console.error(message);
}

function hasExtractedValue(row: GeminiMintRow): boolean {
  return Boolean(row.normalizedValue?.trim() || row.rawValue?.trim());
}

function toMintRow(field: {
  fieldKey: string;
  normalizedValue?: string | null;
  rawValue?: string | null;
  confidence?: number | null;
  flagged?: boolean | null;
}): GeminiMintRow {
  return {
    fieldKey: field.fieldKey,
    normalizedValue: field.normalizedValue ?? null,
    rawValue: field.rawValue ?? null,
    confidence: Number(field.confidence ?? 0),
    flagged: Boolean(field.flagged),
  };
}

/** Same document store as Documents view/download — Blob when configured, else UPLOAD_DIR. */
export async function readDecPdfBytes(
  storagePath: string | null | undefined,
  readStoredFile: ReadDocumentBytes,
  log: (message: string, extra?: Record<string, unknown>) => void = defaultLog,
): Promise<{ ok: true; buffer: Buffer } | { ok: false; message: string }> {
  const key = (storagePath ?? "").trim();
  if (!key) {
    log("dec extract: missing storage_path");
    return { ok: false, message: DEC_FILE_MISSING_MESSAGE };
  }
  const buffer = await readStoredFile(key);
  if (!buffer?.length) {
    log("dec extract: could not read storage_path", { storagePath: key });
    return { ok: false, message: DEC_FILE_MISSING_MESSAGE };
  }
  return { ok: true, buffer };
}

/** Policy-level premium is on old caches. Coverage deductibles and line premiums are not. */
const POLICY_LEVEL_PREMIUM_KEYS = new Set(["premium", "current_premium"]);

const HOME_COVERAGE_LINE_PREMIUM_KEYS = new Set([
  "coverage_a_premium",
  "coverage_b_premium",
  "coverage_c_premium",
  "coverage_d_premium",
  "coverage_e_premium",
  "coverage_f_premium",
]);

const HOME_DWELLING_COVERAGE_KEYS = new Set([
  "coverage_a",
  "coverage_b",
  "coverage_c",
  "coverage_d",
  "dwelling",
]);

const HOME_YEAR_KEYS = new Set([
  "year_built",
  "year_of_construction",
  "year_constructed",
  "construction_year",
  "yr_of_construction",
  "yr_built",
]);

const HOME_CONSTRUCTION_KEYS = new Set([
  "construction",
  "construction_type",
  "type_of_construction",
  "const_type",
  "exterior_construction",
  "building_construction",
]);

/** Unit-owners endorsement pages. A cache from before ground-cover collapse must be read again. */
const UNIT_OWNER_ENDORSEMENT_KEYS = new Set([
  "loss_assessment",
  "limited_fungi",
  "unit_owners_coverage_a",
  "unit_owners_coverage_a_premium",
  "property_liability_package_premium",
  "property_and_liability_coverages_premium",
]);

const GROUND_COVER_COLLAPSE_KEYS = new Set([
  "catastrophic_ground_cover_collapse",
  "catastrophic_ground_cover_collapse_premium",
]);

/**
 * A dwelling cache is reusable only when it already has coverage-row premiums,
 * a year of construction, and a construction type. A cache that filled Coverage
 * A–F and dropped Year of Construction / Masonry must be read again.
 * Liability-only caches with no dwelling limit are left alone.
 * A unit-owners endorsement cache that predates Catastrophic Ground Cover Collapse is read again.
 */
export function homeDecCacheSupportsFill(rows: readonly GeminiMintRow[]): boolean {
  let sawDwellingCoverage = false;
  let sawLinePremium = false;
  let sawYear = false;
  let sawConstruction = false;
  let sawUnitOwnerEndorsement = false;
  let sawGroundCoverCollapse = false;
  for (const row of rows) {
    const value = (row.normalizedValue ?? row.rawValue ?? "").trim();
    if (!value) continue;
    const key = normalizeMintFieldKey(row.fieldKey);
    if (HOME_DWELLING_COVERAGE_KEYS.has(key)) sawDwellingCoverage = true;
    if (HOME_COVERAGE_LINE_PREMIUM_KEYS.has(key)) sawLinePremium = true;
    if (HOME_YEAR_KEYS.has(key)) sawYear = true;
    if (HOME_CONSTRUCTION_KEYS.has(key)) sawConstruction = true;
    if (UNIT_OWNER_ENDORSEMENT_KEYS.has(key)) sawUnitOwnerEndorsement = true;
    if (GROUND_COVER_COLLAPSE_KEYS.has(key)) sawGroundCoverCollapse = true;
  }
  if (sawUnitOwnerEndorsement && !sawGroundCoverCollapse) return false;
  if (!sawDwellingCoverage) return true;
  return sawLinePremium && sawYear && sawConstruction;
}

/** A cached auto extract from before the PAP map has mint fields but no deductibles or line premiums. */
export function autoDecCacheSupportsFill(rows: readonly GeminiMintRow[]): boolean {
  return rows.some((row) => {
    const value = (row.normalizedValue ?? row.rawValue ?? "").trim();
    if (!value) return false;
    const key = row.fieldKey.trim().toLowerCase();
    if (!key || POLICY_LEVEL_PREMIUM_KEYS.has(key)) return false;
    return key.includes("deductible") || key.endsWith("_premium");
  });
}

/** Preview may re-read a hollow auto cache. Confirm must not call Gemini again when that read just landed. */
export const AUTO_FILL_CACHE_FRESH_MS = 15 * 60 * 1000;

export function shouldForceAutoDecReread(input: {
  manualAuto: boolean;
  rows: readonly GeminiMintRow[];
  newestAt: Date | null;
  now: Date;
  reuseFresh: boolean;
}): boolean {
  if (!input.manualAuto) return false;
  if (!evaluateMintExtract(input.rows).ok) return true;
  if (autoDecCacheSupportsFill(input.rows)) return false;
  if (
    input.reuseFresh &&
    input.newestAt &&
    input.now.getTime() - input.newestAt.getTime() < AUTO_FILL_CACHE_FRESH_MS &&
    input.now.getTime() >= input.newestAt.getTime()
  ) {
    return false;
  }
  return true;
}

const FLOOD_RATING_CACHE_KEYS = new Set([
  "building_occupancy",
  "flood_building_occupancy",
  "number_of_units",
  "primary_residence",
  "property_description",
  "prior_nfip_claims",
  "date_of_construction",
  "flood_zone",
  "first_floor_height",
  "ffh_method",
  "most_favorable_ffh_method",
  "building_description_detail",
  "building_limit",
  "flood_building",
]);

/**
 * A flood cache from the homeowners prompt has Coverage A/C and no rating block.
 * Manual Flood Fill reads the declaration again until a rating fact is present.
 */
export function floodDecCacheSupportsFill(rows: readonly GeminiMintRow[]): boolean {
  return rows.some((row) => {
    const value = (row.normalizedValue ?? row.rawValue ?? "").trim();
    if (!value) return false;
    return FLOOD_RATING_CACHE_KEYS.has(normalizeMintFieldKey(row.fieldKey));
  });
}

/** Manual flood Fill re-reads a cache that never captured the NFIP rating block. */
export function shouldForceFloodDecReread(input: {
  manualFlood: boolean;
  rows: readonly GeminiMintRow[];
  newestAt: Date | null;
  now: Date;
  reuseFresh: boolean;
}): boolean {
  if (!input.manualFlood) return false;
  if (!evaluateMintExtract(input.rows).ok) return true;
  if (floodDecCacheSupportsFill(input.rows)) return false;
  if (
    input.reuseFresh &&
    input.newestAt &&
    input.now.getTime() - input.newestAt.getTime() < AUTO_FILL_CACHE_FRESH_MS &&
    input.now.getTime() >= input.newestAt.getTime()
  ) {
    return false;
  }
  return true;
}

/** Manual home Fill re-reads a dwelling cache missing premiums, year built, or construction. */
export function shouldForceHomeDecReread(input: {
  manualHome: boolean;
  rows: readonly GeminiMintRow[];
  newestAt: Date | null;
  now: Date;
  reuseFresh: boolean;
}): boolean {
  if (!input.manualHome) return false;
  if (!evaluateMintExtract(input.rows).ok) return true;
  if (homeDecCacheSupportsFill(input.rows)) return false;
  if (
    input.reuseFresh &&
    input.newestAt &&
    input.now.getTime() - input.newestAt.getTime() < AUTO_FILL_CACHE_FRESH_MS &&
    input.now.getTime() >= input.newestAt.getTime()
  ) {
    return false;
  }
  return true;
}

/**
 * Load Gemini rows for policy mint. Uses the shared document store (Blob or disk).
 * Missing file / missing key / failed extract return a loud error — never [].
 */
export async function loadGeminiRows(
  input: LoadGeminiRowsInput,
  deps: LoadGeminiRowsDeps,
): Promise<LoadGeminiRowsResult> {
  const log = deps.log ?? defaultLog;

  if (!input.force && deps.loadCachedRows) {
    const cached = await deps.loadCachedRows(input.docId);
    // Partial/empty cache must not skip Gemini — that is how hollow mints get result.ok.
    if (evaluateMintExtract(cached).ok) {
      return { ok: true, rows: cached, cached: true, documentKind: null, geminiPreview: null };
    }
  }

  // Blob download and the API key lookup do not depend on each other.
  const [bytesResult, keyResult] = await Promise.allSettled([
    readDecPdfBytes(input.storagePath, deps.readStoredFile, log),
    deps.loadGeminiApiKey ? deps.loadGeminiApiKey() : Promise.resolve(null),
  ]);
  if (bytesResult.status === "rejected") throw bytesResult.reason;
  const bytes = bytesResult.value;
  if (!bytes.ok) {
    return { ok: false, reason: "need_dec_file", message: bytes.message };
  }
  if (keyResult.status === "rejected") throw keyResult.reason;

  const key = (keyResult.value ?? "").trim();
  if (!key) {
    log("dec extract: GEMINI_API_KEY is not configured — refusing extract", {
      documentId: input.docId,
      reason: "need_gemini",
    });
    return { ok: false, reason: "need_gemini", message: MISSING_GEMINI_KEY_MESSAGE };
  }

  if (!deps.extractWithGeminiPdf) {
    log("dec extract: Gemini extractor is not configured", { documentId: input.docId });
    return { ok: false, reason: "extract_failed", message: DEC_EXTRACT_FAILED_MESSAGE };
  }

  try {
    const gemini = await deps.extractWithGeminiPdf(bytes.buffer, input.docType?.trim() || "dec", {
      apiKey: key,
      mimeType: input.mimeType ?? "application/pdf",
      filename: input.filename ?? "declaration.pdf",
      shopLine: input.shopLine ?? null,
      purpose: input.extractPurpose,
    });
    if (!gemini.ok) {
      log("dec extract: Gemini failed", { documentId: input.docId, message: gemini.message });
      return {
        ok: false,
        reason: "extract_failed",
        message: gemini.message || DEC_EXTRACT_FAILED_MESSAGE,
      };
    }
    const rows = gemini.result.fields.map(toMintRow);
    if (!rows.some(hasExtractedValue)) {
      log("dec extract: Gemini returned no fields", { documentId: input.docId });
      return { ok: false, reason: "extract_failed", message: DEC_EXTRACT_FAILED_MESSAGE };
    }
    try {
      await deps.persistRows?.(input.docId, rows);
    } catch (error) {
      // Field cache is best-effort — callers (Fill Compare, mint) still need rows.
      log("dec extract: persist cache failed (best-effort)", {
        documentId: input.docId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return {
      ok: true,
      rows,
      cached: false,
      documentKind: gemini.result.documentKind ?? null,
      geminiPreview: gemini.result.geminiPreview ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : DEC_EXTRACT_FAILED_MESSAGE;
    log("dec extract: Gemini threw", { documentId: input.docId, message });
    return { ok: false, reason: "extract_failed", message };
  }
}
