import {
  LOB_TO_SHOP_LINE,
  QUOTING_FORMS,
  SHOP_LINES,
  SHOP_LINE_LABELS,
  isShopLine,
  type QuotingFormId,
  type ShopLine,
} from "@/lib/domain";
import { shopLinesForConvert } from "@/lib/crm/convert";
import { coerceQuotingFormId, isQuotingFormId, quotingFormById } from "@/lib/quoting/forms";

export const LINE_TAG_PREFIX = "line:";
export const FORM_TAG_PREFIX = "form:";

/** Extra lead-doc cards not in QUOTING_FORMS (still useful on the lead desk). */
export const EXTRA_LEAD_DOC_FORMS = [
  { id: "REC_RV", label: "Rec / RV", shopLine: "rec_rv" as ShopLine, lob: "RV" },
  { id: "UMBRELLA", label: "Umbrella", shopLine: "umbrella" as ShopLine, lob: "UMBRELLA" },
  { id: "LIFE", label: "Life", shopLine: "life" as ShopLine, lob: "LIFE" },
  { id: "HEALTH", label: "Health", shopLine: "health" as ShopLine, lob: "HEALTH" },
] as const;

export type LeadDocFormOption = {
  id: string;
  label: string;
  shopLine: ShopLine;
  lob: string;
};

/** Add-line catalog: policy subtypes first, then Rec/Umbrella/Life/Health extras. */
export const LEAD_DOC_FORMS: readonly LeadDocFormOption[] = [
  ...QUOTING_FORMS.map((form) => ({
    id: form.id,
    label: form.label,
    shopLine: form.shopLine,
    lob: form.lob,
  })),
  ...EXTRA_LEAD_DOC_FORMS.map((form) => ({
    id: form.id,
    label: form.label,
    shopLine: form.shopLine,
    lob: form.lob,
  })),
];

const LEAD_DOC_FORM_BY_ID = new Map(LEAD_DOC_FORMS.map((form) => [form.id, form]));

/** Legacy personal-lines set. Lead cards no longer pre-render these. */
export const DEFAULT_LEAD_DOC_LINES: readonly ShopLine[] = ["home", "auto", "flood"];

export function lineTag(line: ShopLine): string {
  return `${LINE_TAG_PREFIX}${line}`;
}

export function formTag(formId: string): string {
  return `${FORM_TAG_PREFIX}${formId}`;
}

export function leadDocFormById(id: string | null | undefined): LeadDocFormOption | null {
  const raw = (id ?? "").trim();
  if (!raw) return null;
  return LEAD_DOC_FORM_BY_ID.get(raw) ?? null;
}

export function lineFromTags(tags: string[] | null | undefined): ShopLine | null {
  const raw = (tags ?? []).find((tag) => tag.startsWith(LINE_TAG_PREFIX))?.slice(LINE_TAG_PREFIX.length);
  return isShopLine(raw) ? raw : null;
}

export function formFromTags(tags: string[] | null | undefined): string | null {
  const raw = (tags ?? [])
    .find((tag) => tag.startsWith(FORM_TAG_PREFIX))
    ?.slice(FORM_TAG_PREFIX.length)
    ?.trim();
  if (!raw) return null;
  if (LEAD_DOC_FORM_BY_ID.has(raw)) return raw;
  if (isQuotingFormId(raw)) return raw;
  return coerceQuotingFormId(raw);
}

/** Stable card / group key: prefer form:HO3 over line:home so HO3+DP1 do not collapse. */
export function docCardKeyFromTags(tags: string[] | null | undefined): string | null {
  const formId = formFromTags(tags);
  if (formId) return `${FORM_TAG_PREFIX}${formId}`;
  const line = lineFromTags(tags);
  if (line) return `${LINE_TAG_PREFIX}${line}`;
  return null;
}

export function labelForDocCardKey(key: string): string {
  if (key.startsWith(FORM_TAG_PREFIX)) {
    const id = key.slice(FORM_TAG_PREFIX.length);
    return leadDocFormById(id)?.label ?? quotingFormById(id)?.label ?? id;
  }
  if (key.startsWith(LINE_TAG_PREFIX)) {
    const line = key.slice(LINE_TAG_PREFIX.length);
    return isShopLine(line) ? SHOP_LINE_LABELS[line] : line;
  }
  return key;
}

export function shopLineForDocCardKey(key: string): ShopLine | null {
  if (key.startsWith(FORM_TAG_PREFIX)) {
    const id = key.slice(FORM_TAG_PREFIX.length);
    return leadDocFormById(id)?.shopLine ?? quotingFormById(id)?.shopLine ?? null;
  }
  if (key.startsWith(LINE_TAG_PREFIX)) {
    const line = key.slice(LINE_TAG_PREFIX.length);
    return isShopLine(line) ? line : null;
  }
  return null;
}

export function desiredShopLine(insuranceTypeDesired?: string | null): ShopLine {
  return LOB_TO_SHOP_LINE[insuranceTypeDesired ?? ""] ?? "home";
}

export function desiredDocFormId(insuranceTypeDesired?: string | null): string | null {
  const coerced = coerceQuotingFormId(insuranceTypeDesired);
  if (coerced) return coerced;
  const shop = desiredShopLine(insuranceTypeDesired);
  const fromShop = LEAD_DOC_FORMS.find((form) => form.shopLine === shop);
  return fromShop?.id ?? null;
}

export function documentLinesFromDocs(docs: Array<{ tags?: string[] | null }>): ShopLine[] {
  const found = new Set<ShopLine>();
  for (const doc of docs) {
    const formId = formFromTags(doc.tags);
    if (formId) {
      const shop = leadDocFormById(formId)?.shopLine ?? quotingFormById(formId)?.shopLine;
      if (shop) found.add(shop);
    }
    const line = lineFromTags(doc.tags);
    if (line) found.add(line);
  }
  return SHOP_LINES.filter((line) => found.has(line));
}

export function documentFormKeysFromDocs(docs: Array<{ tags?: string[] | null }>): string[] {
  const found = new Set<string>();
  for (const doc of docs) {
    const key = docCardKeyFromTags(doc.tags);
    if (key) found.add(key);
  }
  return Array.from(found);
}

/** Cards the agent added, plus any form/line that already has a file. Nothing is pre-rendered. */
export function leadDocumentCardLines({
  documentLines,
  extraLines,
}: {
  insuranceTypeDesired?: string | null;
  documentLines?: readonly ShopLine[];
  extraLines?: readonly ShopLine[];
}): ShopLine[] {
  const selected = new Set<ShopLine>();
  for (const line of documentLines ?? []) selected.add(line);
  for (const line of extraLines ?? []) selected.add(line);
  return SHOP_LINES.filter((line) => selected.has(line));
}

/** Card keys (form:HO3 / line:home) shown on the lead Documents-by-line panel. */
export function leadDocumentCardKeys({
  documentKeys,
  extraKeys,
}: {
  insuranceTypeDesired?: string | null;
  documentKeys?: readonly string[];
  extraKeys?: readonly string[];
}): string[] {
  const selected = new Set<string>();
  for (const key of documentKeys ?? []) selected.add(key);
  for (const key of extraKeys ?? []) selected.add(key);
  const ordered: string[] = [];
  for (const form of LEAD_DOC_FORMS) {
    const key = `${FORM_TAG_PREFIX}${form.id}`;
    if (selected.has(key)) ordered.push(key);
  }
  for (const line of SHOP_LINES) {
    const key = `${LINE_TAG_PREFIX}${line}`;
    if (selected.has(key)) ordered.push(key);
  }
  for (const key of selected) {
    if (!ordered.includes(key)) ordered.push(key);
  }
  return ordered;
}

export function remainingShopLines(shown: readonly ShopLine[]): ShopLine[] {
  const have = new Set(shown);
  return SHOP_LINES.filter((line) => !have.has(line));
}

export function remainingLeadDocFormKeys(shownKeys: readonly string[]): string[] {
  const have = new Set(shownKeys);
  return LEAD_DOC_FORMS.map((form) => `${FORM_TAG_PREFIX}${form.id}`).filter((key) => !have.has(key));
}

export function parseSelectedShopLines(raw: string | null | undefined): ShopLine[] {
  const found = new Set<ShopLine>();
  for (const part of (raw ?? "").split(/[,\s]+/)) {
    if (isShopLine(part)) found.add(part);
    const form = leadDocFormById(part) ?? quotingFormById(part);
    if (form) found.add(form.shopLine);
    if (part.startsWith(FORM_TAG_PREFIX)) {
      const id = part.slice(FORM_TAG_PREFIX.length);
      const fromKey = leadDocFormById(id)?.shopLine ?? quotingFormById(id)?.shopLine;
      if (fromKey) found.add(fromKey);
    }
  }
  return SHOP_LINES.filter((line) => found.has(line));
}

export function shopLinesForConvertWithDocs(
  primaryLine: string,
  documentLines: readonly ShopLine[] = [],
  selectedLines: readonly ShopLine[] = [],
): ShopLine[] {
  const selected = new Set<ShopLine>(shopLinesForConvert(primaryLine));
  for (const line of documentLines) selected.add(line);
  for (const line of selectedLines) selected.add(line);
  return SHOP_LINES.filter((line) => selected.has(line));
}

export function groupDocsByLine<T extends { tags?: string[] | null }>(
  docs: T[],
): Array<{ line: string; label: string; shopLine: ShopLine | null; docs: T[] }> {
  const buckets = new Map<string, T[]>();
  for (const doc of docs) {
    const key = docCardKeyFromTags(doc.tags);
    if (!key) continue;
    const list = buckets.get(key) ?? [];
    list.push(doc);
    buckets.set(key, list);
  }
  const ordered = leadDocumentCardKeys({ documentKeys: Array.from(buckets.keys()) });
  return ordered
    .filter((key) => buckets.has(key))
    .map((key) => ({
      line: key.startsWith(FORM_TAG_PREFIX)
        ? key.slice(FORM_TAG_PREFIX.length)
        : key.startsWith(LINE_TAG_PREFIX)
          ? key.slice(LINE_TAG_PREFIX.length)
          : key,
      label: labelForDocCardKey(key),
      shopLine: shopLineForDocCardKey(key),
      docs: buckets.get(key) ?? [],
    }));
}

export function isImageDoc(doc: { filename: string; mimeType?: string | null }): boolean {
  if (doc.mimeType?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(doc.filename);
}

export type { QuotingFormId };
