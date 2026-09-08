import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import type { ShopLine } from "@/lib/domain";
import { extractKeyToSheetKey } from "@/lib/quote-sheet/catalog";
import { fieldIsBlank, neverCheckCoverageA, type ApplyFillResult } from "@/lib/quote-sheet/apply";
import { PROPERTY_RECORDS_LABEL, PROPERTY_RECORDS_SOURCE, type PropertyRecordsFact } from "./map";

const DOC_SOURCE_LABEL = /\b(dec|four[-\s]?point|4[-\s]?point|4pt|wind\s*mit)/i;

export function isDocumentSourced(field?: QuoteSheetFieldValue | null): boolean {
  if (!field || fieldIsBlank(field)) return false;
  if (field.source === "extracted" || field.source === "photo-ocr") return true;
  return DOC_SOURCE_LABEL.test(field.sourceLabel ?? "");
}

export function sheetSourcePhrase(field?: QuoteSheetFieldValue | null): string {
  const label = (field?.sourceLabel ?? "").toLowerCase();
  if (/\b(four[-\s]?point|4[-\s]?point|4pt)\b/.test(label)) return "4pt";
  if (/wind\s*mit/.test(label)) return "wind mit";
  if (/\bdec\b/.test(label) || field?.source === "extracted") return "dec";
  if (field?.source === "photo-ocr") return "photo";
  if (field?.source === "javy") return "Javy-tested";
  if (field?.source === "agent") return "agent";
  if (field?.source === "public" || field?.source === "public-records") return "public";
  if (field?.source === PROPERTY_RECORDS_SOURCE) return PROPERTY_RECORDS_LABEL;
  return field?.sourceLabel?.trim() || field?.source || "sheet";
}

export function valuesDiffer(left: string, right: string): boolean {
  const a = left.trim().replace(/[, $]/g, "").toLowerCase();
  const b = right.trim().replace(/[, $]/g, "").toLowerCase();
  return Boolean(a) && Boolean(b) && a !== b;
}

export function mismatchLine(fieldLabel: string, apiValue: string, sheetValue: string, from: string): string {
  const prefix = fieldLabel ? `${fieldLabel}: ` : "";
  return `${prefix}API says ${apiValue}, sheet says ${sheetValue} (from ${from}).`;
}

function fieldLabelFor(key: string): string {
  const labels: Record<string, string> = {
    year_built: "Year built",
    construction: "Construction",
    square_feet: "Square footage",
    roof_covering: "Roof covering",
    stories: "Stories",
    county: "County",
    parcel_id: "Parcel ID",
    assessed_value: "Assessed value",
    applicant_name: "Applicant name",
    named_insured: "Named insured",
  };
  return labels[key] ?? key;
}

function appendRecordsCheck(
  values: Record<string, QuoteSheetFieldValue>,
  line: string,
): void {
  const prev = values.records_check?.value?.trim() ?? "";
  const next = prev ? `${prev} ${line}` : line;
  values.records_check = {
    value: next,
    status: "confirmed",
    source: PROPERTY_RECORDS_SOURCE,
    sourceLabel: PROPERTY_RECORDS_LABEL,
  };
}

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
      values[key] = {
        value: nextValue,
        status: "check",
        source: PROPERTY_RECORDS_SOURCE,
        sourceLabel: PROPERTY_RECORDS_LABEL,
      };
      filledKeys.push(key);
      continue;
    }
    skippedKeys.push(key);
    if (isDocumentSourced(current) || valuesDiffer(nextValue, current.value)) {
      if (valuesDiffer(nextValue, current.value)) {
        appendRecordsCheck(values, mismatchLine(fieldLabelFor(key), nextValue, current.value, sheetSourcePhrase(current)));
      }
    }
  }

  return { values, filledKeys, skippedKeys };
}
