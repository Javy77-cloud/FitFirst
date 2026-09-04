import { LIST_COLUMN_CATALOG } from "@/lib/domain";

export function ColumnLayoutFields({
  prefix,
  layout,
  note,
}: {
  prefix: string;
  layout: Record<string, string[]>;
  note: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{note}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(LIST_COLUMN_CATALOG).map(([listKey, cols]) => {
          const selected = new Set(layout[listKey] ?? cols.map((c) => c.key));
          return (
            <fieldset key={listKey} className="rounded-md border border-border p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-navy">
                {listKey}
              </legend>
              <div className="space-y-1.5">
                {cols.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`${prefix}${listKey}`}
                      value={col.key}
                      defaultChecked={selected.has(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

export function visibleColumns(listKey: string, layout?: Record<string, string[]> | null) {
  const catalog = LIST_COLUMN_CATALOG[listKey] ?? [];
  const keys = (layout?.[listKey] ?? []).filter((key) => catalog.some((c) => c.key === key));
  const order = keys.length > 0 ? keys : catalog.map((c) => c.key);
  return order
    .map((key) => catalog.find((c) => c.key === key))
    .filter((col): col is { key: string; label: string } => Boolean(col));
}
