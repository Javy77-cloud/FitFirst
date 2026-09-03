import {
  LIST_COLUMN_CATALOG,
  defaultColumnLayout,
  resolveColumnKeys,
  type ColumnLayout,
} from "@/lib/domain";

/** Known list keys the CRM picker and settings checkboxes share. */
export const LIST_KEYS = Object.keys(LIST_COLUMN_CATALOG);

export function sanitizeListKeys(listKey: string, keys: string[]): string[] {
  return resolveColumnKeys(listKey, { [listKey]: keys });
}

/** Replace one list in a layout. Unknown keys drop; empty falls back to the catalog. */
export function mergeOneList(
  existing: ColumnLayout | null | undefined,
  listKey: string,
  keys: string[],
): ColumnLayout {
  if (!LIST_COLUMN_CATALOG[listKey]) return { ...(existing ?? {}) };
  return {
    ...defaultColumnLayout(),
    ...(existing ?? {}),
    [listKey]: sanitizeListKeys(listKey, keys),
  };
}

export function layoutFromChecked(
  existing: ColumnLayout | null | undefined,
  checked: Record<string, string[]>,
): ColumnLayout {
  let next = { ...defaultColumnLayout(), ...(existing ?? {}) };
  for (const listKey of LIST_KEYS) {
    if (checked[listKey]) {
      next = mergeOneList(next, listKey, checked[listKey]);
    }
  }
  return next;
}
