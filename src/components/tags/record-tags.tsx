"use client";

import { AssignRecordTags, type TagCatalogRow } from "@/components/tags/assign-record-tags";
import { type TagModule } from "@/lib/tags/module-tags";
import { type TagColorMap } from "@/lib/tags/tag-colors";

function catalogFromSuggestions(suggestions: string[], colors: TagColorMap): TagCatalogRow[] {
  const seen = new Set<string>();
  const rows: TagCatalogRow[] = [];
  for (const name of suggestions) {
    if (!name || seen.has(name)) continue;
    seen.add(name);
    rows.push({ name, color: colors[name] ?? null });
  }
  return rows;
}

/** Record / rail Tags: assign from the module catalog only. CRUD lives on list ⋯. */
export function RecordTags({
  module,
  recordId,
  tags,
  catalog,
  suggestions = [],
  colors = {},
}: {
  module: TagModule;
  recordId: string;
  tags: string[] | null | undefined;
  catalog?: TagCatalogRow[];
  suggestions?: string[];
  colors?: TagColorMap;
}) {
  const rows = catalog ?? catalogFromSuggestions(suggestions, colors);
  return (
    <div className="min-w-0 w-full max-w-full space-y-1.5" data-ff-record-tags={module}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</p>
      <AssignRecordTags module={module} recordId={recordId} tags={tags} catalog={rows} />
    </div>
  );
}
