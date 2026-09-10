import {
  GEMINI_CAPACITY_FALLBACKS,
  GEMINI_DEFAULT_MODEL,
  readGeminiApiKey,
  readGeminiModel,
  resolveGeminiModel,
} from "./key";
import { buildGeminiSystemPrompt, buildGeminiUserPrompt } from "./prompt";
import { mapGeminiJsonToFields, type GeminiExtractJson } from "./map";
import type { ExtractionResult } from "@/lib/extraction/extract";

const GENERATIVE_BASE = "https://generativelanguage.googleapis.com/v1beta";
/** Default attempts for dec / 4pt. Wind mit PDFs are large and often 503 under load. */
const MAX_ATTEMPTS = 6;
const WIND_MIT_MAX_ATTEMPTS = 8;
/** Fewer attempts once we leave primary — fallbacks are for quota/capacity, not long 503 storms. */
const FALLBACK_MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([429, 503]);

export type GeminiClientResult = {
  ok: boolean;
  result: ExtractionResult;
  message: string;
  rawText?: string;
};

function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return (fenced ? fenced[1] : trimmed).trim();
}

export function parseGeminiResponseText(text: string): GeminiExtractJson | null {
  const cleaned = stripFences(text);
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as GeminiExtractJson;
  } catch {
    // Try first {...} block
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as GeminiExtractJson;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function emptyFail(
  docType: string | null | undefined,
  message: string,
  notes: string[],
  rawText?: string,
): GeminiClientResult {
  return {
    ok: false,
    message,
    rawText,
    result: {
      fields: [],
      documentQuality: "messy",
      qualityNotes: notes,
      glanceRequired: true,
      unmappedLabels: [],
      fieldMapDocType: docType ?? null,
    },
  };
}

function apiErrorSnippet(errText: string): string {
  try {
    const parsed = JSON.parse(errText) as { error?: { message?: string; status?: string } };
    const msg = parsed.error?.message?.trim();
    if (msg) return msg.slice(0, 180);
  } catch {
    /* ignore */
  }
  return errText.replace(/\s+/g, " ").trim().slice(0, 180);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True when Google reports per-model free-tier / daily generateContent quota exhausted. */
export function isGeminiDailyQuotaExhausted(errText: string): boolean {
  return /GenerateRequestsPerDayPerProjectPerModel|generate_content_free_tier_requests|free_tier_requests/i.test(
    errText,
  );
}

/** Prefer RetryInfo.retryDelay / "Please retry in Ns" from Gemini error JSON. */
function retryDelayFromErrorBody(errText: string): number | null {
  if (!errText) return null;
  try {
    const parsed = JSON.parse(errText) as {
      error?: { message?: string; details?: Array<{ retryDelay?: string }> };
    };
    for (const detail of parsed.error?.details ?? []) {
      const raw = detail.retryDelay;
      if (!raw) continue;
      const m = String(raw).match(/([\d.]+)/);
      if (m) {
        const secs = Number(m[1]);
        if (Number.isFinite(secs) && secs >= 0) return Math.min(Math.ceil(secs * 1000), 60_000);
      }
    }
    const msg = parsed.error?.message ?? "";
    const m2 = msg.match(/retry in\s+([\d.]+)\s*s/i);
    if (m2) {
      const secs = Number(m2[1]);
      if (Number.isFinite(secs) && secs >= 0) return Math.min(Math.ceil(secs * 1000), 60_000);
    }
  } catch {
    /* ignore */
  }
  const m3 = errText.match(/retry in\s+([\d.]+)\s*s/i);
  if (m3) {
    const secs = Number(m3[1]);
    if (Number.isFinite(secs) && secs >= 0) return Math.min(Math.ceil(secs * 1000), 60_000);
  }
  return null;
}

function isWindMitDoc(docType?: string | null): boolean {
  const t = (docType ?? "").trim().toLowerCase();
  return t === "wind_mit" || t.includes("wind");
}

function maxAttemptsFor(docType?: string | null, isPrimary = true): number {
  if (!isPrimary) return FALLBACK_MAX_ATTEMPTS;
  return isWindMitDoc(docType) ? WIND_MIT_MAX_ATTEMPTS : MAX_ATTEMPTS;
}

/** Exponential backoff with jitter. Honors Retry-After / body retryDelay. Cap 60s. */
function retryDelayMs(attempt: number, response: Response | null, errText = ""): number {
  const fromBody = retryDelayFromErrorBody(errText);
  if (fromBody != null) return fromBody;
  const retryAfter = response?.headers?.get?.("retry-after");
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs) && secs >= 0) return Math.min(Math.ceil(secs * 1000), 60_000);
  }
  const base = Math.min(1000 * 2 ** (attempt - 1), 12_000);
  const jitter = Math.floor(Math.random() * 400);
  return base + jitter;
}

/**
 * Send PDF bytes to Gemini (Google AI Studio / generativelanguage REST).
 * Primary model hard-pinned to gemini-3.6-flash (stale GEMINI_MODEL remapped).
 * Retries transient 429/503 with backoff; wind_mit gets extra attempts.
 * Daily free-tier exhaustion on primary immediately tries GEMINI_CAPACITY_FALLBACKS
 * (sibling flash ids with separate per-model daily caps — NOT remapped to 3.6).
 */

/** Gemini inlineData MIME for PDFs and phone photos (jpeg/png/webp/heic). */
export function resolveGeminiInlineMime(
  mimeType?: string | null,
  filename?: string | null,
): string {
  const mime = (mimeType ?? "").trim().toLowerCase();
  const name = (filename ?? "").trim().toLowerCase();
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "application/pdf";
  if (mime === "image/jpeg" || mime === "image/jpg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (mime === "image/png" || name.endsWith(".png")) return "image/png";
  if (mime === "image/webp" || name.endsWith(".webp")) return "image/webp";
  if (mime === "image/heic" || name.endsWith(".heic")) return "image/heic";
  if (mime === "image/heif" || name.endsWith(".heif")) return "image/heif";
  if (mime === "image/gif" || name.endsWith(".gif")) return "image/gif";
  if (mime.startsWith("image/")) return mime;
  // Default PDF for legacy callers that only pass buffers of known PDFs.
  return "application/pdf";
}

export async function extractWithGeminiPdf(
  pdfBytes: Buffer | Uint8Array,
  docType?: string | null,
  options?: {
    apiKey?: string;
    model?: string;
    fetchImpl?: typeof fetch;
    /** Real file MIME (image/jpeg, application/pdf, …). Defaults from filename when set. */
    mimeType?: string | null;
    filename?: string | null;
  },
): Promise<GeminiClientResult> {
  const apiKey = (options?.apiKey ?? readGeminiApiKey()).trim();
  // Hard-pin primary only. Fallbacks keep their own ids (separate free-tier quotas).
  const primaryModel = resolveGeminiModel(options?.model ?? readGeminiModel() ?? GEMINI_DEFAULT_MODEL);
  const modelCandidates = Array.from(
    new Set([primaryModel, ...GEMINI_CAPACITY_FALLBACKS].filter(Boolean)),
  );
  if (!apiKey) {
    return emptyFail(docType, "missing_gemini_key", ["missing_gemini_key"]);
  }

  const b64 = Buffer.from(pdfBytes).toString("base64");
  const inlineMime = resolveGeminiInlineMime(options?.mimeType, options?.filename);
  const body = {
    systemInstruction: {
      parts: [{ text: buildGeminiSystemPrompt(docType) }],
    },
    contents: [
      {
        role: "user",
        parts: [
          { text: buildGeminiUserPrompt(docType) },
          {
            inlineData: {
              mimeType: inlineMime,
              data: b64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  };

  const fetchImpl = options?.fetchImpl ?? fetch;
  let response: Response | null = null;
  let errText = "";
  let lastStatus = 0;
  outer: for (const model of modelCandidates) {
    const isPrimary = model === primaryModel;
    const maxAttempts = maxAttemptsFor(docType, isPrimary);
    const url = `${GENERATIVE_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        response = await fetchImpl(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "gemini_network_error";
        if (attempt < maxAttempts) {
          await sleep(retryDelayMs(attempt, null));
          continue;
        }
        errText = message;
        continue outer;
      }

      if (response.ok) {
        if (!isPrimary) {
          console.info("[extractWithGeminiPdf] capacity fallback ok", { model, primaryModel, docType });
        }
        break outer;
      }
      lastStatus = response.status;
      errText = await response.text().catch(() => "");
      // Daily / free-tier per-model cap: do not burn remaining retries on a dead model.
      if (response.status === 429 && isGeminiDailyQuotaExhausted(errText)) {
        console.warn("[extractWithGeminiPdf] daily quota — next model", {
          model,
          docType,
          snippet: apiErrorSnippet(errText),
        });
        continue outer;
      }
      if (RETRYABLE_STATUS.has(response.status) && attempt < maxAttempts) {
        await sleep(retryDelayMs(attempt, response, errText));
        continue;
      }
      if (RETRYABLE_STATUS.has(response.status)) {
        continue outer;
      }
      // Retired / unknown model id — try next candidate (including primary 404).
      if (response.status === 404) {
        continue outer;
      }
      const snippet = apiErrorSnippet(errText);
      return emptyFail(
        docType,
        snippet ? `gemini_http_${response.status}: ${snippet}` : `gemini_http_${response.status}`,
        [`gemini_http_${response.status}`],
        errText.slice(0, 500),
      );
    }
  }

  if (!response || !response.ok) {
    const snippet = apiErrorSnippet(errText);
    return emptyFail(
      docType,
      snippet
        ? `gemini_http_${lastStatus || "error"}: ${snippet}`
        : lastStatus
          ? `gemini_http_${lastStatus}`
          : "gemini_http_error",
      [lastStatus ? `gemini_http_${lastStatus}` : "gemini_http_error"],
      errText.slice(0, 500),
    );
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const json = parseGeminiResponseText(text);
  if (!json) {
    return emptyFail(docType, "gemini_parse_error", ["gemini_parse_error"], text.slice(0, 500));
  }

  return {
    ok: true,
    message: "ok",
    rawText: text.slice(0, 2000),
    result: mapGeminiJsonToFields(json, docType),
  };
}
