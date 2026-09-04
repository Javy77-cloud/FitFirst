export type FillCorrection = {
  docType: string;
  fieldKey: string;
  wrongValue: string;
  correctedValue: string;
};

export function normalizeFillValue(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Rule/log lookup — not ML. Newest matching (doc type + field + wrong value) wins.
 * Used on the next ingest so a repeated bad extract is replaced with the desk correction.
 */
export function preferCorrection(
  logs: FillCorrection[],
  input: { docType: string; fieldKey: string; value: string },
): string | null {
  const value = normalizeFillValue(input.value);
  if (!value) return null;
  for (const log of logs) {
    if (log.fieldKey !== input.fieldKey) continue;
    if (log.docType && log.docType !== "any" && log.docType !== input.docType) continue;
    if (normalizeFillValue(log.wrongValue) !== value) continue;
    const next = log.correctedValue.trim();
    if (!next || normalizeFillValue(next) === value) continue;
    return log.correctedValue.trim();
  }
  return null;
}

export function applyLoggedCorrections<T extends { fieldKey: string; normalizedValue: string }>(
  fields: T[],
  docType: string,
  logs: FillCorrection[],
): { fields: T[]; appliedKeys: string[] } {
  const appliedKeys: string[] = [];
  const next = fields.map((field) => {
    const corrected = preferCorrection(logs, {
      docType,
      fieldKey: field.fieldKey,
      value: field.normalizedValue,
    });
    if (!corrected) return field;
    appliedKeys.push(field.fieldKey);
    return { ...field, normalizedValue: corrected };
  });
  return { fields: next, appliedKeys };
}
