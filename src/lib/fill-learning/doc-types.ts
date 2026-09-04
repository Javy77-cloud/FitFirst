import { DOC_TYPE_LABELS, SOURCE_DOC_TYPES, type DocType } from "@/lib/domain";

export const FILL_LEARNING_DOC_TYPES = [
  ...SOURCE_DOC_TYPES,
  "other",
] as const satisfies readonly DocType[];

export type FillLearningDocType = (typeof FILL_LEARNING_DOC_TYPES)[number];

export function isFillLearningDocType(value: string): value is FillLearningDocType {
  return (FILL_LEARNING_DOC_TYPES as readonly string[]).includes(value);
}

export function fillLearningDocTypeLabel(docType: string): string {
  if (docType in DOC_TYPE_LABELS) return DOC_TYPE_LABELS[docType as DocType];
  return docType.replaceAll("_", " ");
}
