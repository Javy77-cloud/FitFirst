import type { ShopLine } from "@/lib/domain";

/**
 * Leaf tag helpers for document product membership.
 * Kept free of CRM/convert imports so shop-flow → membership cannot cycle
 * through line-documents → convert → deal-title → package-lines.
 */
export const LINE_TAG_PREFIX = "line:";
export const FORM_TAG_PREFIX = "form:";

export function lineTag(line: ShopLine): string {
  return `${LINE_TAG_PREFIX}${line}`;
}

export function formTag(formId: string): string {
  return `${FORM_TAG_PREFIX}${formId}`;
}
