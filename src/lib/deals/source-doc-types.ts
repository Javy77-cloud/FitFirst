import { DOC_TYPE_LABELS, type DocType } from "@/lib/domain";

/** Source-document types on the Deal worksheet upload form only. Most-used first; Other last. */
export const DEAL_WORKSHEET_SOURCE_DOC_TYPES = [
  { value: "dec", label: "Declaration page", shortLabel: "Dec page" },
  { value: "wind_mit", label: "Wind mitigation", shortLabel: "Wind mit" },
  { value: "four_point", label: "Four-Point", shortLabel: "Four-Point" },
  { value: "photo", label: "Photos", shortLabel: "Photos" },
  { value: "inspection", label: "Inspections", shortLabel: "Inspections" },
  { value: "report", label: "Reports", shortLabel: "Reports" },
  { value: "other", label: "Other", shortLabel: "Other" },
] as const;

export type DealWorksheetSourceDocType = (typeof DEAL_WORKSHEET_SOURCE_DOC_TYPES)[number]["value"];

export const SOURCE_DOC_ACCEPT =
  ".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif,image/*";

export function worksheetDocTypeLabel(docType: string, short = false): string {
  const row = DEAL_WORKSHEET_SOURCE_DOC_TYPES.find((item) => item.value === docType);
  if (row) return short ? row.shortLabel : row.label;
  // floor_plan and other stored types stay readable even when they are not offered in the picker.
  if (docType in DOC_TYPE_LABELS) return DOC_TYPE_LABELS[docType as DocType];
  return docType.replaceAll("_", " ");
}
