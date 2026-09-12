import {
  ACCOUNTS_LIST_COLUMNS,
  CARRIERS_LIST_COLUMNS,
  CONTACTS_LIST_COLUMNS,
  POLICIES_LIST_COLUMNS,
  type ListColumn,
} from "@/lib/list-columns";
import { titleCaseLabel } from "@/lib/ui/title-case";
import { defaultPageFilters } from "./defaults";
import type { PageFilterField, PageFilterModule } from "./types";

const EXTRA_FIELDS: Record<PageFilterModule, PageFilterField[]> = {
  contacts: [{ key: "source", label: "Source" }],
  businesses: [{ key: "source", label: "Source" }],
  policies: [
    { key: "line", label: "Policy Type" },
    { key: "written", label: "Written" },
    { key: "renewal", label: "Renewal" },
    { key: "attention", label: "Attention" },
  ],
  carriers: [
    { key: "line", label: "LOB" },
    { key: "business", label: "Book" },
  ],
};

const MODULE_COLUMNS: Record<PageFilterModule, ListColumn[]> = {
  contacts: CONTACTS_LIST_COLUMNS,
  businesses: ACCOUNTS_LIST_COLUMNS,
  policies: POLICIES_LIST_COLUMNS,
  carriers: CARRIERS_LIST_COLUMNS,
};

function pushField(out: PageFilterField[], seen: Set<string>, key: string, label: string) {
  const id = key.trim();
  if (!id || seen.has(id)) return;
  seen.add(id);
  out.push({ key: id, label: titleCaseLabel(label.trim() || id) });
}

/** Sheet / list columns plus today’s special filter keys. Admin remaps a chip onto any of these. */
export function pageFilterFields(
  module: PageFilterModule,
  columns?: Array<{ id: string; label: string }>,
): PageFilterField[] {
  const seen = new Set<string>();
  const out: PageFilterField[] = [];
  for (const row of defaultPageFilters(module)) {
    pushField(out, seen, row.fieldKey, row.label);
  }
  for (const extra of EXTRA_FIELDS[module]) {
    pushField(out, seen, extra.key, extra.label);
  }
  const cols = columns ?? MODULE_COLUMNS[module];
  for (const column of cols) {
    if (!column.label.trim() || column.id === "pick") continue;
    pushField(out, seen, column.id, column.label);
  }
  return out;
}
