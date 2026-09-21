/** Form meta keys that must never be stored as sheet cells. */
export const SHEET_FORM_META_KEYS = new Set([
  "dealId",
  "line",
  "sheet_product",
  "fieldKey",
  "formId",
  "reviewed",
  "sure",
  "requestQuotes",
  "unitKind",
  "unitIndex",
]);

export function isSheetFormMetaKey(key: string): boolean {
  return SHEET_FORM_META_KEYS.has(key) || key.startsWith("$ACTION") || key.startsWith("$ACTION_");
}

/** Every named input on the Risk Profile, excluding action chrome. */
export function submittedSheetValues(formData: FormData): Record<string, string> {
  const submitted: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (isSheetFormMetaKey(key)) continue;
    const next = String(value);
    if (Object.prototype.hasOwnProperty.call(submitted, key)) {
      const parts = [submitted[key], next].map((part) => part.trim()).filter(Boolean);
      submitted[key] = parts.join(", ");
    } else {
      submitted[key] = next;
    }
  }
  return submitted;
}
