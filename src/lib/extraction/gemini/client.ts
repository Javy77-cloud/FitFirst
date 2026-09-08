import { readGeminiApiKey, readGeminiModel, resolveGeminiModel } from "./key";
import { buildGeminiSystemPrompt, buildGeminiUserPrompt } from "./prompt";
import { mapGeminiJsonToFields, type GeminiExtractJson } from "./map";
import type { ExtractionResult } from "@/lib/extraction/extract";

const GENERATIVE_BASE = "https://generativelanguage.googleapis.com/v1beta";
/** Default attempts for dec / 4pt. Wind mit PDFs are large and often 503 under load. */
const MAX_ATTEMPTS = 6;
const WIND_MIT_MAX_ATTEMPTS = 8;
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

function isWindMitDoc(docType?: string | null): boolean {
  const t = (docType ?? "").trim().toLowerCase();
  return t === "wind_mit" || t.includes("wind");
}

function maxAttemptsFor(docType?: string | null): number {
  return isWindMitDoc(docType) ? WIND_MIT_MAX_ATTEMPTS : MAX_ATTEMPTS;
}

/** Exponential backoff with jitter. Honors Retry-After seconds when present. */
function retryDelayMs(attempt: number, response: Response | null): number {
  const retryAfter = response?.headers?.get?.("retry-after");
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs) && secs >= 0) return Math.min(Math.ceil(secs * 1000), 20_000);
  }
  const base = Math.min(1000 * 2 ** (attempt - 1), 12_000);
  const jitter = Math.floor(Math.random() * 400);
  return base + jitter;
}

/**
 * Send PDF bytes to Gemini (Google AI Studio / generativelanguage REST).
 * Model from GEMINI_MODEL (default gemini-3.6-flash). Retries 429/503 with
 * exponential backoff; wind_mit gets extra attempts for large PDFs.
 * Sustained 503/429 also tries capacity fallback model ids.
 */
export async function extractWithGeminiPdf(
  pdfBytes: Buffer | Uint8Array,
  docType?: string | null,
  options?: {
    apiKey?: string;
    model?: string;
    fetchImpl?: typeof fetch;
  },
): Promise<GeminiClientResult> {
  const apiKey = (options?.apiKey ?? readGeminiApiKey()).trim();
  const primaryModel = resolveGeminiModel(options?.model ?? readGeminiModel());
  // Capacity fallbacks — raw ids (not remapped) so we can leave a saturated primary.
  const modelCandidates = Array.from(
    new Set(
      [primaryModel, "gemini-flash-latest", "gemini-2.0-flash-001"].filter(Boolean),
    ),
  );
  if (!apiKey) {
    return emptyFail(docType, "missing_gemini_key", ["missing_gemini_key"]);
  }

  const b64 = Buffer.from(pdfBytes).toString("base64");
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
              mimeType: "application/pdf",
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
  const maxAttempts = maxAttemptsFor(docType);
  let response: Response | null = null;
  let errText = "";
  let lastStatus = 0;
  outer: for (const model of modelCandidates) {
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

      if (response.ok) break outer;
      lastStatus = response.status;
      errText = await response.text().catch(() => "");
      if (RETRYABLE_STATUS.has(response.status) && attempt < maxAttempts) {
        await sleep(retryDelayMs(attempt, response));
        continue;
      }
      if (RETRYABLE_STATUS.has(response.status)) {
        continue outer;
      }
      // Retired / unknown model id on a fallback — try the next candidate.
      if (response.status === 404 && model !== primaryModel) {
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
