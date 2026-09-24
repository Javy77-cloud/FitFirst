import { isShopLine, type ShopLine } from "@/lib/domain";
import {
  FORM_TAG_PREFIX,
  INSTANCE_TAG_PREFIX,
  LINE_TAG_PREFIX,
  formTag,
  instanceTag,
  lineTag,
} from "@/lib/documents/doc-line-tags";
import { parseStorageLine } from "@/lib/deals/product-instances";
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
  /**
   * Product tab this window is showing (`homeowners`, `landlord`, `homeowners~88uvyj`).
   * When omitted, membership stays line/form scoped (existing single-product windows).
   */
  instanceKey?: string | null;
  /**
   * Untagged `line:` / `form:` files stay on the first product of that shop line.
   * A later product (landlord beside homeowners) sets this false.
   */
  legacyLineOwner?: boolean;
};

export function instanceKeysFromDocTags(tags: readonly string[] | null | undefined): string[] {
  const found: string[] = [];
  for (const tag of tags ?? []) {
    if (!tag.startsWith(INSTANCE_TAG_PREFIX)) continue;
    const key = tag.slice(INSTANCE_TAG_PREFIX.length).trim();
    if (key && !found.includes(key)) found.push(key);
  }
  return found;
}

/**
 * True when the file belongs in this product's Documents window.
 * Membership is additive. A file can be on HO3 and on a second HO3 copy.
 * An `instance:` tag adds that form. It does not remove line/form membership
 * from the original tabs (that hid Gloria's DP3 DEC after Link on the copy).
 * A `~` copy does not inherit line/form files until Link stamps its instance tag.
 * Files with no line, form, or instance tag stay in the deal library.
 */
function matchesLineOrForm(
  doc: { tags?: readonly string[] | null },
  wantedLine: string,
  wantedForm: string,
): boolean {
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

export function docBelongsToProductWindow(
  doc: { tags?: readonly string[] | null },
  window: ProductDocWindow,
): boolean {
  const opened = parseStorageLine(window.shopLine);
  const wantedLine = (opened?.shopLine ?? String(window.shopLine ?? "").trim().toLowerCase());
  const wantedForm = String(window.quotingForm ?? "").trim();
  const wantedInstance = (window.instanceKey ?? opened?.instanceKey ?? "").trim();
  if (wantedInstance && instanceKeysFromDocTags(doc.tags).includes(wantedInstance)) return true;
  // Second copy: explicit instance tag only. Do not list every line:home file.
  if (wantedInstance.includes("~")) return false;
  // Original tabs keep line/form matches. Another form's instance tag is not a veto.
  return matchesLineOrForm(doc, wantedLine, wantedForm);
}

/** Tags to stamp on upload into a product window (idempotent). */
export function membershipTagsForUpload(input: {
  shopLine?: string | null;
  quotingForm?: string | null;
  instanceKey?: string | null;
}): string[] {
  const tags: string[] = [];
  const opened = parseStorageLine(input.shopLine);
  const line = opened?.shopLine ?? (isShopLine(input.shopLine) ? input.shopLine : "");
  if (isShopLine(line)) tags.push(lineTag(line));
  const form = String(input.quotingForm ?? "").trim();
  if (form) tags.push(formTag(form));
  const instanceKey = (input.instanceKey ?? opened?.instanceKey ?? "").trim();
  if (instanceKey) tags.push(instanceTag(instanceKey));
  return tags;
}

/** Add product membership without removing other products' tags. */
export function linkDocToProductTags(
  tags: readonly string[] | null | undefined,
  input: { shopLine?: string | null; quotingForm?: string | null; instanceKey?: string | null },
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
  input: { shopLine?: string | null; quotingForm?: string | null; instanceKey?: string | null },
): string[] {
  const opened = parseStorageLine(input.shopLine);
  const line = opened?.shopLine ?? String(input.shopLine ?? "").trim();
  const form = String(input.quotingForm ?? "").trim();
  const instanceKey = (input.instanceKey ?? opened?.instanceKey ?? "").trim();
  const dropInstance = instanceKey ? instanceTag(instanceKey) : null;
  // Copy tab: remove only this copy's instance tag. Original line/form tags stay.
  if (instanceKey.includes("~")) {
    return (tags ?? []).filter((tag) => tag !== dropInstance);
  }
  const dropLine = isShopLine(line) ? lineTag(line) : null;
  const dropForm = form ? formTag(form) : null;
  return (tags ?? []).filter((tag) => {
    if (dropLine && tag === dropLine) return false;
    if (dropForm && tag === dropForm) return false;
    if (dropForm && tag.toLowerCase() === dropForm.toLowerCase()) return false;
    if (dropInstance && tag === dropInstance) return false;
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
