import {
  emptyExtractFields,
  extrasToFieldMap,
  LETTER_FIELD_ALIASES,
  letterFieldDefs,
} from "./fields";
import type {
  DocumentPipelineDealExtras,
  DocumentPipelineExtractField,
  DocumentPipelineExtractPayload,
  DocumentPipelineFieldSource,
  DocumentPipelineJobType,
} from "./types";

export type GeminiLikeField = {
  fieldKey: string;
  normalizedValue?: string | null;
  rawValue?: string | null;
  confidence?: number | null;
};

function firstAliasValue(
  aliases: string[],
  byKey: Map<string, GeminiLikeField>,
): GeminiLikeField | null {
  for (const alias of aliases) {
    const row = byKey.get(alias);
    const value = (row?.normalizedValue ?? row?.rawValue ?? "").trim();
    if (row && value) return row;
  }
  return null;
}

export function mapGeminiFieldsToLetter(
  type: DocumentPipelineJobType,
  geminiFields: GeminiLikeField[],
  extras: DocumentPipelineDealExtras = {},
): DocumentPipelineExtractField[] {
  const byKey = new Map(geminiFields.map((field) => [field.fieldKey, field]));
  const fallback = extrasToFieldMap(extras);
  return letterFieldDefs(type).map((field) => {
    const aliases = LETTER_FIELD_ALIASES[field.key] ?? [field.key];
    const hit = firstAliasValue(aliases, byKey);
    const extracted = (hit?.normalizedValue ?? hit?.rawValue ?? fallback[field.key] ?? "").trim();
    const source: DocumentPipelineFieldSource = hit
      ? "gemini"
      : fallback[field.key]
        ? "deal"
        : "blank";
    return {
      key: field.key,
      label: field.label,
      group: field.group,
      extracted,
      confidence: hit ? Number(hit.confidence ?? 0.5) : extracted ? 0.4 : 0,
      source,
    };
  });
}

export function letterExtractPayload(
  type: DocumentPipelineJobType,
  geminiFields: GeminiLikeField[] = [],
  extras: DocumentPipelineDealExtras = {},
  rawText?: string,
): DocumentPipelineExtractPayload {
  const fields =
    geminiFields.length > 0
      ? mapGeminiFieldsToLetter(type, geminiFields, extras)
      : emptyExtractFields(type, extras);
  return {
    fields,
    engine: "gemini",
    rawText,
  };
}
