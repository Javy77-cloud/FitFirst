import { DEAL_ID } from "@/lib/fixtures/ids";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";

export type FillLearningHint = {
  docType: string;
  fieldKey: string;
  extractedValue: string;
  correctedValue: string;
  dealId?: string | null;
  loggedAt?: Date | string;
  /** extraction_corrections.locked — never apply Ana / javy Cov A. */
  locked?: boolean | null;
  applyOnNextFill?: boolean | null;
};

export type ExtractedLike = {
  fieldKey: string;
  normalizedValue: string;
  sourceLabel?: string;
  sourceDocTag?: string;
  blankAfterMatch?: boolean;
  matchPath?: string;
  matchedSynonym?: string;
  sourceLine?: string;
  sourceLineNo?: number;
  missReason?: string;
};

export function normalizeFillValue(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Agency-wide remap is safe only when the extracted string matches a prior miss. */
export function isSafeAgencyCorrection(
  hint: FillLearningHint,
  extractedValue: string,
  existing?: QuoteSheetFieldValue | null,
): boolean {
  if (hint.locked) return false;
  if (hint.applyOnNextFill === false) return false;
  if (!hint.correctedValue.trim()) return false;
  if (normalizeFillValue(hint.extractedValue) !== normalizeFillValue(extractedValue)) {
    return false;
  }
  if (normalizeFillValue(hint.correctedValue) === normalizeFillValue(extractedValue)) {
    return false;
  }
  if (hint.fieldKey === "coverage_a" && existing?.source === "javy") return false;
  return true;
}

export function pickLatestSafeCorrection(
  logs: FillLearningHint[],
  query: {
    docType: string;
    fieldKey: string;
    extractedValue: string;
    dealId?: string;
    existing?: QuoteSheetFieldValue | null;
  },
): FillLearningHint | null {
  if (query.dealId === DEAL_ID && query.fieldKey === "coverage_a") return null;
  if (query.existing?.source === "javy" && query.fieldKey === "coverage_a") return null;

  const sameField = logs.filter((row) => row.fieldKey === query.fieldKey);
  const pool = query.docType
    ? sameField.filter((row) => row.docType === query.docType)
    : sameField;
  const safe = pool.filter((row) =>
    isSafeAgencyCorrection(row, query.extractedValue, query.existing),
  );
  if (safe.length === 0) return null;

  const sorted = [...safe].sort((a, b) => {
    const aTime = a.loggedAt ? new Date(a.loggedAt).getTime() : 0;
    const bTime = b.loggedAt ? new Date(b.loggedAt).getTime() : 0;
    return bTime - aTime;
  });
  return sorted[0] ?? null;
}

export function applyLearningToExtracted<T extends ExtractedLike>(
  extracted: T[],
  logs: FillLearningHint[],
  ctx: { docType: string; dealId?: string },
): T[] {
  return extracted.map((item) => {
    const hit = pickLatestSafeCorrection(logs, {
      docType: ctx.docType,
      fieldKey: item.fieldKey,
      extractedValue: item.normalizedValue,
      dealId: ctx.dealId,
    });
    if (!hit) return item;
    return {
      ...item,
      normalizedValue: hit.correctedValue,
      sourceLabel: `Fill learning · ${ctx.docType}`,
    };
  });
}

/** Merge fill_learning_logs + extraction_corrections for applyLearning. */
export function mergeLearningHints(
  fillLogs: FillLearningHint[],
  extractionLogs: FillLearningHint[],
): FillLearningHint[] {
  return [...fillLogs, ...extractionLogs];
}
