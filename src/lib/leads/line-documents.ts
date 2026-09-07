import {
  LOB_TO_SHOP_LINE,
  SHOP_LINES,
  SHOP_LINE_LABELS,
  isShopLine,
  type ShopLine,
} from "@/lib/domain";
import { shopLinesForConvert } from "@/lib/crm/convert";

export const LINE_TAG_PREFIX = "line:";

/** Legacy personal-lines set. Lead cards no longer pre-render these. */
export const DEFAULT_LEAD_DOC_LINES: readonly ShopLine[] = ["home", "auto", "flood"];

export function lineTag(line: ShopLine): string {
  return `${LINE_TAG_PREFIX}${line}`;
}

export function lineFromTags(tags: string[] | null | undefined): ShopLine | null {
  const raw = (tags ?? []).find((tag) => tag.startsWith(LINE_TAG_PREFIX))?.slice(LINE_TAG_PREFIX.length);
  return isShopLine(raw) ? raw : null;
}

export function desiredShopLine(insuranceTypeDesired?: string | null): ShopLine {
  return LOB_TO_SHOP_LINE[insuranceTypeDesired ?? ""] ?? "home";
}

export function documentLinesFromDocs(docs: Array<{ tags?: string[] | null }>): ShopLine[] {
  const found = new Set<ShopLine>();
  for (const doc of docs) {
    const line = lineFromTags(doc.tags);
    if (line) found.add(line);
  }
  return SHOP_LINES.filter((line) => found.has(line));
}

/** Cards the agent added, plus any line that already has a file. Nothing is pre-rendered. */
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

export function remainingShopLines(shown: readonly ShopLine[]): ShopLine[] {
  const have = new Set(shown);
  return SHOP_LINES.filter((line) => !have.has(line));
}

export function parseSelectedShopLines(raw: string | null | undefined): ShopLine[] {
  const found = new Set<ShopLine>();
  for (const part of (raw ?? "").split(/[,\s]+/)) {
    if (isShopLine(part)) found.add(part);
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
): Array<{ line: ShopLine; label: string; docs: T[] }> {
  const buckets = new Map<ShopLine, T[]>();
  for (const doc of docs) {
    const line = lineFromTags(doc.tags);
    if (!line) continue;
    const list = buckets.get(line) ?? [];
    list.push(doc);
    buckets.set(line, list);
  }
  return SHOP_LINES.filter((line) => buckets.has(line)).map((line) => ({
    line,
    label: SHOP_LINE_LABELS[line],
    docs: buckets.get(line) ?? [],
  }));
}

export function isImageDoc(doc: { filename: string; mimeType?: string | null }): boolean {
  if (doc.mimeType?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(doc.filename);
}
