import { compareSummary, type PremiumChange } from "@/lib/renewal/compare";
import { fallbackDiffSummary, type TonedCompareRow } from "@/lib/renewal/compare-tone";
import {
  GEMINI_DEFAULT_MODEL,
  geminiKeyReady,
  readGeminiApiKey,
  readGeminiModel,
} from "@/lib/extraction/gemini/key";
import { parseGeminiResponseText } from "@/lib/extraction/gemini/client";

export type GeminiDiffNote = {
  source: "gemini" | "fallback";
  text: string;
  lossRisk: string | null;
  bothSides: boolean;
};

const GENERATIVE_BASE = "https://generativelanguage.googleapis.com/v1beta";

export function buildFallbackDiffNote(input: {
  bothSides: boolean;
  change: PremiumChange | null;
  rows: TonedCompareRow[];
}): GeminiDiffNote {
  const changedCount = input.rows.filter((row) => row.tone === "amber").length;
  const missingCount = input.rows.filter((row) => row.tone === "red").length;
  const premiumText = input.change ? compareSummary(input.change) : null;
  const premiumTone =
    input.change == null
      ? null
      : input.change.direction === "up" && (input.change.pct ?? 0) >= 0.08
        ? "red"
        : input.change.direction === "flat"
          ? "green"
          : "amber";
  const text = fallbackDiffSummary({
    bothSides: input.bothSides,
    premiumTone,
    premiumText,
    changedCount,
    missingCount,
  });
  return {
    source: "fallback",
    text,
    lossRisk: input.bothSides
      ? premiumTone === "red"
        ? "Loss risk: price shock. Shop or explain the increase before the 30-day band."
        : missingCount > 0
          ? "Loss risk: a coverage line dropped off one side. Confirm before you quote the client."
          : "Loss risk is low on the lines we have — still walk the delta with the client."
      : null,
    bothSides: input.bothSides,
  };
}

export async function summarizeRenewalDiff(input: {
  bothSides: boolean;
  change: PremiumChange | null;
  rows: TonedCompareRow[];
  clientName: string;
  lineOfBusiness: string;
  fetchImpl?: typeof fetch;
}): Promise<GeminiDiffNote> {
  const fallback = buildFallbackDiffNote(input);
  if (!input.bothSides) return fallback;
  const apiKey = readGeminiApiKey();
  if (!geminiKeyReady(apiKey)) return fallback;

  const model = readGeminiModel() || GEMINI_DEFAULT_MODEL;
  const fetchImpl = input.fetchImpl ?? fetch;
  const prompt = {
    clientName: input.clientName,
    lineOfBusiness: input.lineOfBusiness,
    premium: input.change,
    lines: input.rows.map((row) => ({
      label: row.label,
      current: row.currentValue,
      proposed: row.proposedValue,
      tone: row.tone,
    })),
  };

  try {
    const url = `${GENERATIVE_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You compare an insurance renewal current term vs proposed term. Return JSON only: {"summary":"one or two sentences","lossRisk":"one sentence"}. No advice to invent coverages. Facts only from this payload:\n${JSON.stringify(prompt)}`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return fallback;
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    const parsed = parseGeminiResponseText(text) as { summary?: string; lossRisk?: string } | null;
    const summary = parsed?.summary?.trim();
    if (!summary) return fallback;
    return {
      source: "gemini",
      text: summary,
      lossRisk: parsed?.lossRisk?.trim() || fallback.lossRisk,
      bothSides: true,
    };
  } catch {
    return fallback;
  }
}
