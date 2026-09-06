/** Source-document types on the Deal worksheet upload form only. */
export const DEAL_WORKSHEET_SOURCE_DOC_TYPES = [
  { value: "dec", label: "Declaration page", shortLabel: "Dec page" },
  { value: "photo", label: "Photos", shortLabel: "Photos" },
  { value: "inspection", label: "Inspections", shortLabel: "Inspections" },
  { value: "wind_mit", label: "Wind mitigation", shortLabel: "Wind mit" },
  { value: "report", label: "Reports", shortLabel: "Reports" },
  { value: "four_point", label: "4-point", shortLabel: "4-point" },
  { value: "other", label: "Other", shortLabel: "Other" },
] as const;

export type DealWorksheetSourceDocType = (typeof DEAL_WORKSHEET_SOURCE_DOC_TYPES)[number]["value"];

export const SOURCE_DOC_ACCEPT =
  ".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif,image/*";

export function worksheetDocTypeLabel(docType: string, short = false): string {
  const row = DEAL_WORKSHEET_SOURCE_DOC_TYPES.find((item) => item.value === docType);
  if (!row) return docType.replaceAll("_", " ");
  return short ? row.shortLabel : row.label;
}
