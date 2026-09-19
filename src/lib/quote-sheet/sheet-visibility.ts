import type { QuoteFieldDef, QuoteFieldVisibleWhen } from "./applicant-core";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import {
  isIndustryCascadeParent,
  occupationIndustryParentKey,
} from "@/lib/custom-fields/industry-occupation";

export type SheetValueBag = Record<
  string,
  string | QuoteSheetFieldValue | { value?: string } | null | undefined
>;

/** Comma-separated multi-select / chip values stored on the sheet. */
export function parseChipList(raw: string | null | undefined): string[] {
  return String(raw ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function joinChipList(values: readonly string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join(",");
}

export function sheetCellText(values: SheetValueBag, key: string): string {
  const cell = values[key];
  if (cell == null) return "";
  if (typeof cell === "string") return cell.trim();
  return String(cell.value ?? "").trim();
}

export function fieldMatchesVisibleWhen(
  rule: QuoteFieldVisibleWhen,
  values: SheetValueBag,
): boolean {
  const text = sheetCellText(values, rule.field);
  if (rule.includes) {
    const wanted = rule.includes.toLowerCase();
    return parseChipList(text).some((item) => item.toLowerCase() === wanted);
  }
  if (rule.equals != null) {
    const wanted = (Array.isArray(rule.equals) ? rule.equals : [rule.equals]).map((item) =>
      String(item).toLowerCase(),
    );
    return wanted.includes(text.toLowerCase());
  }
  return Boolean(text);
}

/** Life/Health showWhen + Commercial visibleWhen. Missing rule → always shown. */
export function fieldIsVisible(field: QuoteFieldDef, values: SheetValueBag): boolean {
  if (field.visibleWhen && !fieldMatchesVisibleWhen(field.visibleWhen, values)) return false;
  if (field.showWhen) {
    const text = sheetCellText(values, field.showWhen.key).toLowerCase();
    const wanted = field.showWhen.values.map((item) => String(item).toLowerCase());
    if (!wanted.includes(text)) return false;
  }
  return true;
}

export function visibleQuoteFields(
  fields: readonly QuoteFieldDef[],
  values: SheetValueBag,
): QuoteFieldDef[] {
  return fields.filter((field) => fieldIsVisible(field, values));
}

export function cascadeParentKeys(fields: readonly QuoteFieldDef[]): string[] {
  const keys = new Set<string>();
  for (const field of fields) {
    if (field.visibleWhen?.field) keys.add(field.visibleWhen.field);
    if (field.showWhen?.key) keys.add(field.showWhen.key);
    if (isIndustryCascadeParent(field.key)) keys.add(field.key);
    const industryParent = occupationIndustryParentKey(field.key);
    if (industryParent) keys.add(industryParent);
  }
  return [...keys];
}
