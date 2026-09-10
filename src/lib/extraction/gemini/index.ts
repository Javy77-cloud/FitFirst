export {
  GEMINI_CAPACITY_FALLBACKS,
  GEMINI_DEFAULT_MODEL,
  GEMINI_ENV_KEY,
  GEMINI_ENV_MODEL,
  GEMINI_RETIRED_MODEL_MAP,
  GEMINI_VAULT_PROVIDER,
  MISSING_GEMINI_KEY_MESSAGE,
  geminiKeyReady,
  loadGeminiApiKey,
  readGeminiApiKey,
  readGeminiModel,
  resolveGeminiModel,
} from "./key";
export { buildGeminiSystemPrompt, buildGeminiUserPrompt, GEMINI_EXTRACT_JSON_KEYS } from "./prompt";
export {
  fillableGeminiFields,
  mapGeminiJsonToFields,
  parseAddressParts,
  sheetKeysForGeminiKey,
  GEMINI_KEY_TO_SHEET,
} from "./map";
export { extractWithGeminiPdf, isGeminiDailyQuotaExhausted, parseGeminiResponseText, resolveGeminiInlineMime } from "./client";

/** Doc types that Fill from source routes through Gemini (not legacy synonym extract). */
export function docTypeUsesGemini(docType?: string | null): boolean {
  const t = (docType ?? "").trim().toLowerCase();
  if (!t) return true; // unknown source PDF/photo — try Gemini
  if (
    [
      "wind_mit",
      "four_point",
      "dec",
      "policy",
      "related",
      "related_insured",
      "photo",
      "inspection",
      "report",
    ].includes(t)
  ) {
    return true;
  }
  if (t.includes("wind") || t.includes("four") || t.includes("4pt") || t.includes("4-point")) {
    return true;
  }
  if (t.includes("dec") || t.includes("declar")) return true;
  if (t.includes("photo") || t.includes("inspect") || t.includes("report")) return true;
  return false;
}
