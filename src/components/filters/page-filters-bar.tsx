"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LiveContainsInput } from "@/components/search/live-contains-input";
import { ConfigurePageFiltersButton } from "@/components/filters/configure-page-filters";
import {
  filterStorageKey,
  parseSavedFilters,
  queryFromParams,
  sameFilterParams,
  type SavedNamedFilter,
} from "@/lib/saved-filters";
import { getLiveQuery, setLiveQuery } from "@/lib/search/live-query";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";
import {
  PAGE_FILTER_SEARCH_CLASS,
  PAGE_FILTER_SEARCH_INPUT_CLASS,
  enabledPageFilters,
  type PageFilter,
} from "@/lib/page-filters";
import { titleCaseLabel } from "@/lib/ui/title-case";

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

export function PageFiltersBar({
  moduleId,
  filters,
  searchPlaceholder = "Contains Name, Phone, Number…",
  canConfigure = false,
}: {
  moduleId: string;
  filters: PageFilter[];
  searchPlaceholder?: string;
  canConfigure?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const visible = useMemo(() => enabledPageFilters(filters), [filters]);
  const keys = visible.map((field) => field.fieldKey);
  const current = useMemo(() => {
    const params: Record<string, string> = {};
    for (const key of keys) {
      const value = search.get(key);
      if (value) params[key] = value;
    }
    const q = search.get("q");
    if (q) params.q = q;
    return params;
  }, [keys, search]);
  const [saved, setSaved] = useState<SavedNamedFilter[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    setSaved(readSaved(moduleId));
  }, [moduleId]);

  function go(params: Record<string, string>) {
    const next = { ...params };
    const live = getLiveQuery(moduleId).trim();
    if (live) next.q = live;
    const query = queryFromParams(next);
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
    flashAction("filter-saved");
  }

  function remove(id: string) {
    const next = saved.filter((row) => row.id !== id);
    setSaved(next);
    writeSaved(moduleId, next);
  }

  const hasCurrent = Object.keys(current).length > 0;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs" data-ff-page-filters={moduleId}>
      <LiveContainsInput
        moduleId={moduleId}
        initialQuery={current.q ?? ""}
        placeholder={searchPlaceholder}
        aria-label="Contains Search"
        className={PAGE_FILTER_SEARCH_CLASS}
        inputClassName={PAGE_FILTER_SEARCH_INPUT_CLASS}
      />
      {visible.map((field) => {
        const selected = current[field.fieldKey] ?? "";
        const picked = field.options.find((option) => option.value === selected);
        const color = picked?.color ?? null;
        return (
          <label key={field.id} className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="sr-only">{field.label}</span>
            {color ? (
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: color }}
              />
            ) : null}
            <select
              aria-label={field.label}
              value={selected}
              onChange={(event) => setField(field.fieldKey, event.target.value)}
              className="h-8 max-w-[10rem] rounded-md border bg-card px-1.5 text-xs text-navy"
              style={
                color
                  ? { borderColor: color, backgroundColor: `${color}22` }
                  : { borderColor: "#6b7280" }
              }
            >
              <option value="">None</option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        );
      })}

      {saved.map((row) => {
        const active = sameFilterParams(row.params, current);
        return (
          <span key={row.id} className="inline-flex items-center">
            <button
              type="button"
              onClick={() => go(row.params)}
              className={cn(
                "h-8 rounded-md border px-2 font-medium",
                active
                  ? "border-primary/40 bg-secondary text-navy"
                  : "border-border bg-card text-muted-foreground hover:text-navy",
              )}
            >
              {titleCaseLabel(row.name)}
            </button>
            <button
              type="button"
              onClick={() => remove(row.id)}
              aria-label={`Remove ${row.name}`}
              className="ml-0.5 size-5 rounded-sm text-muted-foreground hover:bg-muted hover:text-[#BF0A30]"
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
              className="h-8 w-28 rounded-md border border-[#6b7280] bg-card px-2 text-xs"
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
            className="h-8 rounded-md border border-border bg-card px-2 text-xs font-medium text-navy hover:bg-secondary"
          >
            Save As…
          </button>
        )
      ) : null}

      {hasCurrent ? (
        <button
          type="button"
          onClick={() => {
            setLiveQuery(moduleId, "");
            go({});
          }}
          className="h-8 px-1 text-xs text-muted-foreground hover:underline"
        >
          Clear
        </button>
      ) : null}

      {canConfigure ? <ConfigurePageFiltersSlot moduleId={moduleId} /> : null}
    </div>
  );
}

function ConfigurePageFiltersSlot({ moduleId }: { moduleId: string }) {
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    function find() {
      setHost(document.querySelector("[data-ff-list-chrome]"));
    }
    find();
    const tick = window.setInterval(find, 120);
    const stop = window.setTimeout(() => window.clearInterval(tick), 2500);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(stop);
    };
  }, []);

  const button = <ConfigurePageFiltersButton moduleId={moduleId} />;
  if (host) return createPortal(button, host);
  return button;
}
