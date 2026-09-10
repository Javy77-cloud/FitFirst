import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { fieldIsBlank, type ApplyFillResult } from "@/lib/quote-sheet/apply";
import type { VinDecodeFact } from "./types";
import { NHTSA_VPIC_LABEL } from "./types";

/**
 * Empty-only merge from NHTSA vPIC facts.
 * Never overwrites confirmed / agent / dec / any non-blank cell.
 */
export function applyVinFactsToSheet(
  existing: Record<string, QuoteSheetFieldValue>,
  facts: VinDecodeFact[],
): ApplyFillResult {
  const values: Record<string, QuoteSheetFieldValue> = { ...existing };
  const filledKeys: string[] = [];
  const skippedKeys: string[] = [];

  for (const fact of facts) {
    const key = fact.sheetKey;
    if (!key) continue;
    const nextValue = String(fact.value ?? "").trim();
    if (!nextValue) continue;
    const current = values[key];
    if (!fieldIsBlank(current)) {
      skippedKeys.push(key);
      continue;
    }
    values[key] = {
      value: nextValue,
      status: "check",
      source: "public",
      sourceLabel: (fact.sourceLabel || NHTSA_VPIC_LABEL).trim() || NHTSA_VPIC_LABEL,
    };
    filledKeys.push(key);
  }

  return { values, filledKeys, skippedKeys };
}
