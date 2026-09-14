"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LiveContainsInput } from "@/components/search/live-contains-input";
import { PageFilterChromeProvider } from "@/components/filters/page-filter-chrome-context";
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
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

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
    const params = { ...current };
    const live = getLiveQuery(moduleId).trim();
    if (live) params.q = live;
    if (!label || Object.keys(params).length === 0) return;
    const next = [
      ...saved.filter((row) => !sameFilterParams(row.params, params)),
      { id: crypto.randomUUID(), name: label, params },
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
    if (renamingId === id) {
      setRenamingId(null);
      setRenameDraft("");
    }
  }

  function commitRename(id: string) {
    const label = renameDraft.trim();
    if (!label) {
      setRenamingId(null);
      setRenameDraft("");
      return;
    }
    const next = saved.map((row) => (row.id === id ? { ...row, name: label } : row));
    setSaved(next);
    writeSaved(moduleId, next);
    setRenamingId(null);
    setRenameDraft("");
    flashAction("filter-saved");
  }

  const liveQ = getLiveQuery(moduleId).trim();
  const hasCurrent = Object.keys(current).length > 0 || Boolean(liveQ);

  return (
    <PageFilterChromeProvider canConfigure={canConfigure} moduleId={moduleId}>
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
          <label
            key={field.id}
            className="inline-flex items-center gap-1.5 text-muted-foreground"
            data-ff-page-filter={field.fieldKey}
          >
            <span className="shrink-0 text-[11px] font-medium text-navy/80">
              {field.label}
            </span>
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

      {saved.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1 px-2 text-xs font-medium text-navy"
                data-ff-saved-filters=""
              />
            }
          >
            Saved filters
            {saved.some((row) => sameFilterParams(row.params, current)) ? (
              <span className="text-muted-foreground">
                · {titleCaseLabel(saved.find((row) => sameFilterParams(row.params, current))!.name)}
              </span>
            ) : (
              <span className="text-muted-foreground">({saved.length})</span>
            )}
            <ChevronDown className="size-3.5 opacity-80" data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-64 p-1" data-ff-saved-filters-menu="">
            <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Saved filters
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {saved.map((row) => {
              const active = sameFilterParams(row.params, current);
              const renaming = renamingId === row.id;
              return (
                <div
                  key={row.id}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-1 py-1",
                    active ? "bg-secondary" : "hover:bg-muted/60",
                  )}
                  data-ff-saved-filter={row.id}
                >
                  {renaming ? (
                    <input
                      value={renameDraft}
                      onChange={(event) => setRenameDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitRename(row.id);
                        }
                        if (event.key === "Escape") {
                          setRenamingId(null);
                          setRenameDraft("");
                        }
                      }}
                      onClick={(event) => event.stopPropagation()}
                      className="h-7 min-w-0 flex-1 rounded-md border border-[#6b7280] bg-card px-1.5 text-xs text-navy"
                      autoFocus
                      aria-label={`Rename ${row.name}`}
                    />
                  ) : (
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate px-1.5 py-1 text-left text-xs font-medium text-navy"
                      onClick={() => go(row.params)}
                    >
                      {titleCaseLabel(row.name)}
                    </button>
                  )}
                  {renaming ? (
                    <button
                      type="button"
                      className="shrink-0 px-1 text-[11px] font-medium text-[#002868] hover:underline"
                      onClick={() => commitRename(row.id)}
                    >
                      Done
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="shrink-0 px-1 text-[11px] text-muted-foreground hover:text-navy hover:underline"
                      onClick={(event) => {
                        event.stopPropagation();
                        setRenamingId(row.id);
                        setRenameDraft(row.name);
                      }}
                    >
                      Rename
                    </button>
                  )}
                  <FileDeleteIcon
                    type="button"
                    label={`Delete ${row.name}`}
                    className="size-7 shrink-0 p-1.5"
                    onClick={(event) => {
                      event.stopPropagation();
                      remove(row.id);
                    }}
                  />
                </div>
              );
            })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {naming ? (
        <span className="inline-flex items-center gap-1" data-ff-page-filter-save-as="">
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
          <button
            type="button"
            onClick={saveCurrent}
            disabled={!hasCurrent || !name.trim()}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-40"
          >
            Save
          </button>
          <button type="button" onClick={() => setNaming(false)} className="text-xs text-muted-foreground">
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          data-ff-page-filter-save-as=""
          onClick={() => setNaming(true)}
          disabled={!hasCurrent}
          title={hasCurrent ? "Save current filters" : "Set a filter or search first"}
          className="h-8 rounded-md border border-border bg-card px-2 text-xs font-medium text-navy hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save As…
        </button>
      )}

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

    </div>
    </PageFilterChromeProvider>
  );
}
