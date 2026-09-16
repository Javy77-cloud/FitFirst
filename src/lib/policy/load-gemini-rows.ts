import { MISSING_GEMINI_KEY_MESSAGE } from "@/lib/extraction/gemini/key";
import { evaluateMintExtract } from "@/lib/policy/mint-gate";

export const DEC_FILE_MISSING_MESSAGE =
  "Could not read the declaration PDF from storage. Re-upload the file — local disk uploads do not survive Vercel deploys.";

export const DEC_EXTRACT_FAILED_MESSAGE = "Could not extract fields from the declaration PDF.";

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
};

export type GeminiExtractFn = (
  buffer: Buffer,
  docType: string,
  options: { apiKey: string; mimeType: string; filename: string },
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
      return { ok: true, rows: cached, cached: true };
    }
  }

  const bytes = await readDecPdfBytes(input.storagePath, deps.readStoredFile, log);
  if (!bytes.ok) {
    return { ok: false, reason: "need_dec_file", message: bytes.message };
  }

  const key = ((await deps.loadGeminiApiKey?.()) ?? "").trim();
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
    const gemini = await deps.extractWithGeminiPdf(bytes.buffer, "dec", {
      apiKey: key,
      mimeType: input.mimeType ?? "application/pdf",
      filename: input.filename ?? "declaration.pdf",
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
    await deps.persistRows?.(input.docId, rows);
    return { ok: true, rows, cached: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : DEC_EXTRACT_FAILED_MESSAGE;
    log("dec extract: Gemini threw", { documentId: input.docId, message });
    return { ok: false, reason: "extract_failed", message };
  }
}
