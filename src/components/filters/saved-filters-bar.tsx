"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  filterStorageKey,
  parseSavedFilters,
  queryFromParams,
  sameFilterParams,
  type FilterField,
  type SavedNamedFilter,
} from "@/lib/saved-filters";
import { cn } from "@/lib/utils";

function readSaved(moduleId: string): SavedNamedFilter[] {
  try {
    const raw = window.localStorage.getItem(filterStorageKey(moduleId));
    return parseSavedFilters(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

function writeSaved(moduleId: string, rows: SavedNamedFilter[]) {
  try {
    window.localStorage.setItem(filterStorageKey(moduleId), JSON.stringify(rows));
  } catch {
    /* ignore quota / private mode */
  }
}

export function SavedFiltersBar({
  moduleId,
  fields,
}: {
  moduleId: string;
  fields: FilterField[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const keys = fields.map((field) => field.key);
  const current = useMemo(() => {
    const params: Record<string, string> = {};
    for (const key of keys) {
      const value = search.get(key);
      if (value) params[key] = value;
    }
    return params;
  }, [keys, search]);
  const [saved, setSaved] = useState<SavedNamedFilter[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    setSaved(readSaved(moduleId));
  }, [moduleId]);

  function go(params: Record<string, string>) {
    const query = queryFromParams(params);
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function setField(key: string, value: string) {
    const next = { ...current };
    if (value) next[key] = value;
    else delete next[key];
    go(next);
  }

  function saveCurrent() {
    const label = name.trim();
    if (!label || Object.keys(current).length === 0) return;
    const next = [
      ...saved.filter((row) => !sameFilterParams(row.params, current)),
      { id: crypto.randomUUID(), name: label, params: current },
    ];
    setSaved(next);
    writeSaved(moduleId, next);
    setName("");
    setNaming(false);
  }

  function remove(id: string) {
    const next = saved.filter((row) => row.id !== id);
    setSaved(next);
    writeSaved(moduleId, next);
  }

  const hasCurrent = Object.keys(current).length > 0;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
      {fields.map((field) => (
        <label key={field.key} className="inline-flex items-center gap-1 text-muted-foreground">
          <span className="sr-only">{field.label}</span>
          <select
            aria-label={field.label}
            value={current[field.key] ?? ""}
            onChange={(event) => setField(field.key, event.target.value)}
            className="h-7 max-w-[9.5rem] rounded-md border border-border bg-card px-1.5 text-xs text-navy"
          >
            <option value="">{field.label}</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      {saved.map((row) => {
        const active = sameFilterParams(row.params, current);
        return (
          <span key={row.id} className="inline-flex items-center">
            <button
              type="button"
              onClick={() => go(row.params)}
              className={cn(
                "h-7 rounded-md border px-2 font-medium",
                active
                  ? "border-primary/40 bg-secondary text-navy"
                  : "border-border bg-card text-muted-foreground hover:text-navy",
              )}
            >
              {row.name}
            </button>
            <button
              type="button"
              onClick={() => remove(row.id)}
              aria-label={`Remove ${row.name}`}
              className="ml-0.5 size-5 rounded-sm text-muted-foreground hover:bg-muted hover:text-navy"
            >
              ×
            </button>
          </span>
        );
      })}

      {hasCurrent ? (
        naming ? (
          <span className="inline-flex items-center gap-1">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveCurrent();
                if (event.key === "Escape") setNaming(false);
              }}
              placeholder="Name"
              className="h-7 w-28 rounded-md border border-border bg-card px-2 text-xs"
              autoFocus
            />
            <button type="button" onClick={saveCurrent} className="text-xs font-medium text-primary hover:underline">
              Save
            </button>
            <button type="button" onClick={() => setNaming(false)} className="text-xs text-muted-foreground">
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="h-7 rounded-md border border-border bg-card px-2 text-xs font-medium text-navy hover:bg-secondary"
          >
            Save as…
          </button>
        )
      ) : null}

      {hasCurrent ? (
        <button type="button" onClick={() => go({})} className="h-7 px-1 text-xs text-muted-foreground hover:underline">
          Clear
        </button>
      ) : null}
    </div>
  );
}
