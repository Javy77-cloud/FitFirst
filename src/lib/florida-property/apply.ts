import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import type { ShopLine } from "@/lib/domain";
import { extractKeyToSheetKey } from "@/lib/quote-sheet/catalog";
import { fieldIsBlank, neverCheckCoverageA, type ApplyFillResult } from "@/lib/quote-sheet/apply";
import {
  appendRecordsCheck,
  fieldLabelFor,
  mismatchLine,
  sheetSourcePhrase,
  valuesDiffer,
} from "@/lib/quote-sheet/records-check";
import { PROPERTY_RECORDS_LABEL, PROPERTY_RECORDS_SOURCE, type PropertyRecordsFact } from "./map";

const DOC_SOURCE_LABEL = /\b(dec|four[-\s]?point|4[-\s]?point|4pt|wind\s*mit)/i;

export function isDocumentSourced(field?: QuoteSheetFieldValue | null): boolean {
  if (!field || fieldIsBlank(field)) return false;
  if (field.source === "extracted" || field.source === "photo-ocr") return true;
  return DOC_SOURCE_LABEL.test(field.sourceLabel ?? "");
}

export { mismatchLine, valuesDiffer, sheetSourcePhrase };

/** Empty-only fill from Florida Property API. Doc-sourced cells stay. Mismatches go to Records check. */
export function applyPropertyRecordsToSheet(
  line: ShopLine,
  existing: Record<string, QuoteSheetFieldValue>,
  facts: PropertyRecordsFact[],
): ApplyFillResult {
  const values: Record<string, QuoteSheetFieldValue> = { ...existing };
  const filledKeys: string[] = [];
  const skippedKeys: string[] = [];

  for (const fact of facts) {
    const key = extractKeyToSheetKey(line, fact.sheetKey || fact.fieldKey) ?? fact.sheetKey ?? fact.fieldKey;
    if (!key) continue;
    if (key === "coverage_a" || fact.kind === "zestimate" || fact.kind === "list_price") {
      skippedKeys.push(key);
      continue;
    }
    const nextValue = String(fact.value ?? "").trim();
    if (!nextValue) continue;
    const current = values[key];
    if (neverCheckCoverageA(key, current)) {
      skippedKeys.push(key);
      continue;
    }
    if (fieldIsBlank(current)) {
      const label = (fact.sourceLabel || PROPERTY_RECORDS_LABEL).trim() || PROPERTY_RECORDS_LABEL;
      values[key] = {
        value: nextValue,
        status: "check",
        source: PROPERTY_RECORDS_SOURCE,
        sourceLabel: label,
      };
      filledKeys.push(key);
      continue;
    }
    skippedKeys.push(key);
    if (isDocumentSourced(current) || valuesDiffer(nextValue, current.value)) {
      if (valuesDiffer(nextValue, current.value)) {
        appendRecordsCheck(
          values,
          mismatchLine(fieldLabelFor(key), nextValue, current.value, sheetSourcePhrase(current)),
          { source: PROPERTY_RECORDS_SOURCE, sourceLabel: PROPERTY_RECORDS_LABEL },
        );
      }
    }
  }

  return { values, filledKeys, skippedKeys };
}
