import { readGeminiApiKey, readGeminiModel } from "./key";
import { buildGeminiSystemPrompt, buildGeminiUserPrompt } from "./prompt";
import { mapGeminiJsonToFields, type GeminiExtractJson } from "./map";
import type { ExtractionResult } from "@/lib/extraction/extract";

const GENERATIVE_BASE = "https://generativelanguage.googleapis.com/v1beta";

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

/**
 * Send PDF bytes to Gemini (Google AI Studio / generativelanguage REST).
 * Model from GEMINI_MODEL (default gemini-2.5-flash).
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
  const model = (options?.model ?? readGeminiModel()).trim();
  if (!apiKey) {
    return {
      ok: false,
      message: "missing_gemini_key",
      result: {
        fields: [],
        documentQuality: "messy",
        qualityNotes: ["missing_gemini_key"],
        glanceRequired: true,
        unmappedLabels: [],
        fieldMapDocType: docType ?? null,
      },
    };
  }

  const b64 = Buffer.from(pdfBytes).toString("base64");
  const url = `${GENERATIVE_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
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
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "gemini_network_error";
    return {
      ok: false,
      message,
      result: {
        fields: [],
        documentQuality: "messy",
        qualityNotes: ["gemini_network_error"],
        glanceRequired: true,
        unmappedLabels: [],
        fieldMapDocType: docType ?? null,
      },
    };
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    return {
      ok: false,
      message: `gemini_http_${response.status}`,
      rawText: errText.slice(0, 500),
      result: {
        fields: [],
        documentQuality: "messy",
        qualityNotes: [`gemini_http_${response.status}`],
        glanceRequired: true,
        unmappedLabels: [],
        fieldMapDocType: docType ?? null,
      },
    };
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const json = parseGeminiResponseText(text);
  if (!json) {
    return {
      ok: false,
      message: "gemini_parse_error",
      rawText: text.slice(0, 500),
      result: {
        fields: [],
        documentQuality: "messy",
        qualityNotes: ["gemini_parse_error"],
        glanceRequired: true,
        unmappedLabels: [],
        fieldMapDocType: docType ?? null,
      },
    };
  }

  return {
    ok: true,
    message: "ok",
    rawText: text.slice(0, 2000),
    result: mapGeminiJsonToFields(json, docType),
  };
}
