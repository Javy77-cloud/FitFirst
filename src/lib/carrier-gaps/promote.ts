import {
  parseGapSurface,
  productLineLabel,
  type GapSurface,
} from "@/lib/carrier-gaps/types";

const DETAILS_HINT =
  /\b(name|first name|last name|email|e-mail|phone|mobile|mailing|address|street|city|state|zip|insured|contact|co-?applicant)\b/i;
const RISK_HINT =
  /\b(roof|year built|claims?|loss|occupancy|height|weight|bmi|tobacco|condition|coverage a|cov a|sq ?ft|square feet|stories|construction|wind mit|4-?point|inspection|foundation|flood zone|vin|driver|payroll|employees|class code|naics)\b/i;

/** Operational quote-row stamps — not missing-field asks. */
export function isOperationalQuoteNote(body: string): boolean {
  const text = body.trim();
  if (!text) return true;
  return (
    /re-?quote queued/i.test(text) ||
    /accepted cov a floor/i.test(text) ||
    /^agent accepted /i.test(text)
  );
}

export function looksLikeCarrierNeed(body: string): boolean {
  if (isOperationalQuoteNote(body)) return false;
  return (
    /\bneed(?:s|ed)?\b/i.test(body) ||
    /\bask(?:s|ed)?\s+for\b/i.test(body) ||
    /\bmissing\s+(field|question|data|info)\b/i.test(body) ||
    /\bno (?:field|question) for\b/i.test(body) ||
    /\bnot on (?:the )?(?:risk|details|sheet|profile)\b/i.test(body) ||
    /\bdoesn'?t have\b/i.test(body)
  );
}

export function guessGapSurface(note: string): GapSurface {
  if (DETAILS_HINT.test(note) && !RISK_HINT.test(note)) return "details";
  if (RISK_HINT.test(note)) return "risk_profile";
  return "risk_profile";
}

export type GapDraft = {
  note: string;
  productLine: string;
  carrier: string | null;
  suggestedSurface: GapSurface;
};

/** Turn a quote-row “carrier needs X” note into a gap-list draft. */
export function draftGapFromQuoteNeed(input: {
  body: string;
  carrier?: string | null;
  productLine?: string | null;
  suggestedSurface?: string | null;
}): GapDraft | null {
  const note = input.body.trim();
  if (!note || isOperationalQuoteNote(note)) return null;
  return {
    note,
    productLine: productLineLabel(input.productLine),
    carrier: input.carrier?.trim() || null,
    suggestedSurface: input.suggestedSurface
      ? parseGapSurface(input.suggestedSurface)
      : guessGapSurface(note),
  };
}
