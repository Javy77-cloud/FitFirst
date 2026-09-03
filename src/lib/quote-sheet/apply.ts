import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import type { ShopLine } from "@/lib/domain";
import { extractKeyToSheetKey, fieldsForLine } from "./catalog";

export type ExtractedInput = {
  fieldKey: string;
  normalizedValue: string;
};

export type ApplyFillResult = {
  values: Record<string, QuoteSheetFieldValue>;
  filledKeys: string[];
  skippedKeys: string[];
};

export function fieldIsBlank(field?: QuoteSheetFieldValue | null): boolean {
  if (!field) return true;
  return field.value.trim() === "" || field.status === "missing";
}

export function isJavyTestedCoverageA(field?: QuoteSheetFieldValue | null): boolean {
  return field?.source === "javy";
}

/** Javy-tested Cov A is confirmed seed — never CHECK, never overwritten. */
export function neverCheckCoverageA(fieldKey: string, existing?: QuoteSheetFieldValue | null): boolean {
  if (fieldKey !== "coverage_a") return false;
  return existing?.source === "javy";
}

/** Public-records gap-fill loses to a value read from the dec / photo. */
export function isPublicRecordsSource(field?: QuoteSheetFieldValue | null): boolean {
  return field?.source === "public" || field?.source === "public-records";
}

export type ApplyFillOptions = {
  source?: QuoteSheetFieldValue["source"];
};

export function applyExtractedToSheet(
  line: ShopLine,
  existing: Record<string, QuoteSheetFieldValue>,
  extracted: ExtractedInput[],
  options?: ApplyFillOptions,
): ApplyFillResult {
  const values: Record<string, QuoteSheetFieldValue> = { ...existing };
  const filledKeys: string[] = [];
  const skippedKeys: string[] = [];
  const source = options?.source ?? "extracted";

  for (const item of extracted) {
    const key = extractKeyToSheetKey(line, item.fieldKey);
    if (!key) continue;
    const current = values[key];
    if (neverCheckCoverageA(key, current)) {
      skippedKeys.push(key);
      continue;
    }
    if (!fieldIsBlank(current) && !isPublicRecordsSource(current)) {
      skippedKeys.push(key);
      continue;
    }
    const nextValue = String(item.normalizedValue ?? "").trim();
    if (!nextValue) continue;
    values[key] = {
      value: nextValue,
      status: "check",
      source,
    };
    filledKeys.push(key);
  }

  return { values, filledKeys, skippedKeys };
}

export type DealHeaderGlance = {
  coverageAmount: number | null;
  propertyOneliner: string | null;
  currentCarrier: string | null;
};

export function headerIsBlank(value: string | number | null | undefined): boolean {
  if (value == null) return true;
  if (typeof value === "number") return !Number.isFinite(value);
  return value.trim() === "";
}

export function propertyOnelinerFromSheet(
  values: Record<string, QuoteSheetFieldValue>,
): string | null {
  const rawStreet = values.address1?.value?.trim() ?? "";
  if (!rawStreet) return null;
  const city = values.city?.value?.trim() ?? "";
  const state = values.state?.value?.trim() ?? "";
  const zip = values.zip?.value?.trim() ?? "";
  const year = values.year_built?.value?.trim() ?? "";
  const construction = values.construction?.value?.trim() ?? "";
  const street =
    city && rawStreet.toLowerCase().includes(city.toLowerCase())
      ? rawStreet.split(",")[0].trim()
      : rawStreet;
  const locality = [city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const head = locality ? `${street}, ${locality}` : street;
  const tail = [year, construction].filter(Boolean).join(" ");
  return tail ? `${head} · ${tail}` : head;
}

export function coverageAmountFromSheet(
  values: Record<string, QuoteSheetFieldValue>,
): number | null {
  const raw = values.coverage_a?.value?.replace(/[, $]/g, "") ?? "";
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Copy matching glance fields onto deal header BLANKS only. */
export function fillDealHeaderBlanks(
  header: DealHeaderGlance,
  values: Record<string, QuoteSheetFieldValue>,
): DealHeaderGlance {
  const next: DealHeaderGlance = { ...header };
  const covA = coverageAmountFromSheet(values);
  if (headerIsBlank(header.coverageAmount) && covA != null) {
    next.coverageAmount = covA;
  }
  const oneliner = propertyOnelinerFromSheet(values);
  if (headerIsBlank(header.propertyOneliner) && oneliner) {
    next.propertyOneliner = oneliner;
  }
  const carrier = values.current_carrier?.value?.trim() ?? "";
  if (headerIsBlank(header.currentCarrier) && carrier) {
    next.currentCarrier = carrier;
  }
  return next;
}

export function mergeAgentEdits(
  existing: Record<string, QuoteSheetFieldValue>,
  submitted: Record<string, string>,
  line: ShopLine,
): Record<string, QuoteSheetFieldValue> {
  const next: Record<string, QuoteSheetFieldValue> = { ...existing };
  for (const field of fieldsForLine(line)) {
    if (!(field.key in submitted)) continue;
    const typed = submitted[field.key].trim();
    const current = next[field.key];
    if (neverCheckCoverageA(field.key, current) && typed === (current?.value ?? "")) {
      next[field.key] = {
        value: current?.value ?? typed,
        status: "confirmed",
        source: "javy",
      };
      continue;
    }
    if (typed === "") {
      next[field.key] = { value: "", status: "missing", source: "blank" };
      continue;
    }
    const unchangedCheck =
      current?.status === "check" &&
      current.value === typed &&
      (current.source === "extracted" || current.source === "photo-ocr");
    if (unchangedCheck) {
      next[field.key] = current;
      continue;
    }
    next[field.key] = { value: typed, status: "confirmed", source: "agent" };
  }
  return next;
}

export function confirmField(
  existing: Record<string, QuoteSheetFieldValue>,
  fieldKey: string,
): Record<string, QuoteSheetFieldValue> {
  const current = existing[fieldKey];
  if (!current || fieldIsBlank(current)) return existing;
  if (current.source === "javy") {
    return {
      ...existing,
      [fieldKey]: { ...current, status: "confirmed", source: "javy" },
    };
  }
  return {
    ...existing,
    [fieldKey]: {
      ...current,
      status: "confirmed",
      source:
        current.source === "extracted" || current.source === "photo-ocr"
          ? "agent"
          : current.source,
    },
  };
}

export function sheetCounts(values: Record<string, QuoteSheetFieldValue>): {
  missing: number;
  check: number;
  confirmed: number;
} {
  let missing = 0;
  let check = 0;
  let confirmed = 0;
  for (const field of Object.values(values)) {
    if (field.status === "check") check += 1;
    else if (field.status === "confirmed" && field.value.trim()) confirmed += 1;
    else missing += 1;
  }
  return { missing, check, confirmed };
}
