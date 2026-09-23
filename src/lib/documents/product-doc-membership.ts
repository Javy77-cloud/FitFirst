import { isShopLine, type ShopLine } from "@/lib/domain";
import {
  FORM_TAG_PREFIX,
  LINE_TAG_PREFIX,
  formTag,
  lineTag,
} from "@/lib/documents/doc-line-tags";
import { isDocumentsSourceDoc } from "@/lib/deals/quote-docs";

/** Tags that carry product-window membership (multi-membership allowed). */
export function membershipLineTags(tags: readonly string[] | null | undefined): string[] {
  return (tags ?? []).filter((tag) => tag.startsWith(LINE_TAG_PREFIX));
}

export function membershipFormTags(tags: readonly string[] | null | undefined): string[] {
  return (tags ?? []).filter((tag) => tag.startsWith(FORM_TAG_PREFIX));
}

/** Every shop line this file is linked to (order preserved, unique). */
export function shopLinesFromDocTags(tags: readonly string[] | null | undefined): ShopLine[] {
  const found: ShopLine[] = [];
  const seen = new Set<string>();
  for (const tag of membershipLineTags(tags)) {
    const line = tag.slice(LINE_TAG_PREFIX.length).trim();
    if (!isShopLine(line) || seen.has(line)) continue;
    seen.add(line);
    found.push(line);
  }
  return found;
}

export function formIdsFromDocTags(tags: readonly string[] | null | undefined): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const tag of membershipFormTags(tags)) {
    const id = tag.slice(FORM_TAG_PREFIX.length).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    found.push(id);
  }
  return found;
}

export type ProductDocWindow = {
  shopLine: string | null | undefined;
  /** When set, prefer form membership; line-only legacy docs still match the shop line. */
  quotingForm?: string | null;
};

/**
 * True when the file belongs in this product's Documents window.
 * Membership is additive `line:` / `form:` tags — a file can be on HO3 and Flood.
 * Untagged source docs are deal-library only (not auto-shown on a product window).
 */
export function docBelongsToProductWindow(
  doc: { tags?: readonly string[] | null },
  window: ProductDocWindow,
): boolean {
  const wantedLine = String(window.shopLine ?? "").trim().toLowerCase();
  const wantedForm = String(window.quotingForm ?? "").trim();
  const lines = shopLinesFromDocTags(doc.tags);
  const forms = formIdsFromDocTags(doc.tags);

  if (wantedForm && forms.some((id) => id.toUpperCase() === wantedForm.toUpperCase())) {
    return true;
  }
  if (wantedLine && lines.some((line) => line === wantedLine)) {
    return true;
  }
  return false;
}

/** Tags to stamp on upload into a product window (idempotent). */
export function membershipTagsForUpload(input: {
  shopLine?: string | null;
  quotingForm?: string | null;
}): string[] {
  const tags: string[] = [];
  const line = String(input.shopLine ?? "").trim();
  if (isShopLine(line)) tags.push(lineTag(line));
  const form = String(input.quotingForm ?? "").trim();
  if (form) tags.push(formTag(form));
  return tags;
}

/** Add product membership without removing other products' tags. */
export function linkDocToProductTags(
  tags: readonly string[] | null | undefined,
  input: { shopLine?: string | null; quotingForm?: string | null },
): string[] {
  const next = [...(tags ?? [])];
  for (const tag of membershipTagsForUpload(input)) {
    if (!next.includes(tag)) next.push(tag);
  }
  return next;
}

/**
 * Remove this product's membership only. File stays on the deal and on other products.
 * Drops matching `line:` and, when quotingForm is set, that `form:` tag.
 */
export function unlinkDocFromProductTags(
  tags: readonly string[] | null | undefined,
  input: { shopLine?: string | null; quotingForm?: string | null },
): string[] {
  const line = String(input.shopLine ?? "").trim();
  const form = String(input.quotingForm ?? "").trim();
  const dropLine = isShopLine(line) ? lineTag(line) : null;
  const dropForm = form ? formTag(form) : null;
  return (tags ?? []).filter((tag) => {
    if (dropLine && tag === dropLine) return false;
    if (dropForm && tag === dropForm) return false;
    if (dropForm && tag.toLowerCase() === dropForm.toLowerCase()) return false;
    return true;
  });
}

export function filterDocsForProductWindow<T extends { tags?: readonly string[] | null }>(
  docs: readonly T[] | null | undefined,
  window: ProductDocWindow,
): T[] {
  const list = docs ?? [];
  if (!String(window.shopLine ?? "").trim() && !String(window.quotingForm ?? "").trim()) {
    return [...list];
  }
  return list.filter((doc) => docBelongsToProductWindow(doc, window));
}

/** Deal-library candidates not yet linked to this product window. */
export function libraryDocsNotInProductWindow<T extends { tags?: readonly string[] | null }>(
  docs: readonly T[] | null | undefined,
  window: ProductDocWindow,
): T[] {
  return (docs ?? []).filter((doc) => !docBelongsToProductWindow(doc, window));
}

export function multiProductMembershipWarning(tags: readonly string[] | null | undefined): string | null {
  const lines = shopLinesFromDocTags(tags);
  if (lines.length < 2) return null;
  const labels = lines.join(", ");
  return `This file is linked to multiple products (${labels}). Delete removes it from the deal entirely. Use “Remove from this product” to unlink only.`;
}

export function isSourceDocForMembership(doc: {
  slot?: string | null;
  docType?: string | null;
  tags?: readonly string[] | null;
}): boolean {
  return isDocumentsSourceDoc(doc);
}
