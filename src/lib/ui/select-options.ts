/** Sitewide: every select/dropdown includes a None/empty choice (Javy 2026-09-12). */

export type SelectOption = { value: string; label: string; title?: string };

export const NONE_SELECT_OPTION: SelectOption = { value: "", label: "None" };

/** Prepend None unless an empty value is already first. */
export function withNoneOption(options: readonly SelectOption[]): SelectOption[] {
  const list = options.map((row) => ({ value: row.value, label: row.label, title: row.title }));
  if (list.some((row) => row.value === "")) {
    return list.map((row) => (row.value === "" ? { ...row, label: row.label || "None" } : row));
  }
  return [NONE_SELECT_OPTION, ...list];
}

/** For raw string option lists (picklists). */
export function withNoneStringOption(options: readonly string[], noneLabel = "None"): string[] {
  const list = [...options];
  if (list.includes("")) return list;
  return ["", ...list];
}
