import type {
  DocumentPipelineExtractField,
  DocumentPipelineExtractPayload,
  DocumentPipelineReviewRow,
} from "./types";

export function buildLetterReviewRows(
  fields: DocumentPipelineExtractField[] | DocumentPipelineExtractPayload | null | undefined,
  confirmed: Record<string, string> | null | undefined = {},
): DocumentPipelineReviewRow[] {
  const list = Array.isArray(fields) ? fields : fields?.fields ?? [];
  return list.map((field) => {
    const extracted = (field.extracted ?? "").trim();
    const confirmedValue = (confirmed?.[field.key] ?? extracted).trim();
    return {
      key: field.key,
      label: field.label,
      group: field.group,
      extracted,
      confirmed: confirmedValue,
      changed: confirmedValue !== extracted,
      source: field.source,
    };
  });
}

export function collectConfirmedFields(
  edits: Record<string, string | null | undefined>,
  fields: Array<DocumentPipelineExtractField | string> = [],
): Record<string, string> {
  const out: Record<string, string> = {};
  const keys = fields.length
    ? fields.map((field) => (typeof field === "string" ? field : field.key))
    : Object.keys(edits);
  for (const key of keys) {
    const value = (edits[key] ?? "").trim();
    if (value) out[key] = value;
  }
  return out;
}

export function confirmedFieldCount(confirmed: Record<string, string> | null | undefined): number {
  return Object.values(confirmed ?? {}).filter((value) => value.trim()).length;
}

export function letterNeedsAgentConfirm(input: {
  confirmedAt?: Date | string | null;
  confirmedFields?: Record<string, string> | null;
}): boolean {
  if (input.confirmedAt) return false;
  return confirmedFieldCount(input.confirmedFields) === 0;
}
