"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ConfigurePageFiltersButton } from "@/components/filters/configure-page-filters";
import { PageFilterChromeProvider } from "@/components/filters/page-filter-chrome-context";
import { LiveContainsInput } from "@/components/search/live-contains-input";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  filterStorageKey,
  parseSavedFilters,
  queryFromParams,
  sameFilterParams,
  type FilterField,
  type SavedNamedFilter,
} from "@/lib/saved-filters";
import { getLiveQuery, setLiveQuery } from "@/lib/search/live-query";
import { flashAction } from "@/lib/flash-client";
import { chipTabClass } from "@/lib/ui/chip-tabs";
import { titleCaseLabel } from "@/lib/ui/title-case";
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

const DEFAULT_PRESERVE = [
  "pipeline",
  "view",
  "book",
  "queue",
  "family",
  "pcSub",
  "lifeSub",
  "healthSub",
  "attention",
] as const;

export function PipelineFilterPopover({
  moduleId,
  fields: fieldsProp,
  searchPlaceholder = "Contains…",
  preserveParams = DEFAULT_PRESERVE,
  canConfigure = false,
  configureSlot,
  onConfigure,
  searchClassName = "min-w-40",
  searchInputClassName = "h-8 w-52 border-[#6b7280]",
}: {
  moduleId: string;
  fields: FilterField[];
  searchPlaceholder?: string;
  preserveParams?: readonly string[];
  canConfigure?: boolean;
  /** Footer slot (e.g. custom Configure control). */
  configureSlot?: ReactNode;
  /** Called when footer Configure filters… is clicked (closes panel first). */
  onConfigure?: () => void;
  searchClassName?: string;
  searchInputClassName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const fields = fieldsProp ?? [];
  const keys = useMemo(() => fields.map((field) => field.key), [fields]);
  const preserve = useMemo(() => [...preserveParams], [preserveParams]);

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

  const activeFilterCount = useMemo(
    () => keys.reduce((count, key) => count + (current[key] ? 1 : 0), 0),
    [keys, current],
  );

  const [saved, setSaved] = useState<SavedNamedFilter[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [configureOpen, setConfigureOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSaved(readSaved(moduleId));
  }, [moduleId]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function preservedFromUrl(): Record<string, string> {
    const next: Record<string, string> = {};
    for (const key of preserve) {
      const value = search.get(key);
      if (value) next[key] = value;
    }
    return next;
  }

  function go(filterParams: Record<string, string>) {
    const next: Record<string, string> = { ...preservedFromUrl() };
    for (const [key, value] of Object.entries(filterParams)) {
      if (preserve.includes(key)) continue;
      if (value) next[key] = value;
    }
    if ("q" in filterParams) {
      if (filterParams.q) next.q = filterParams.q;
      else delete next.q;
    } else {
      const live = getLiveQuery(moduleId).trim();
      if (live) next.q = live;
    }
    const query = queryFromParams(next);
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  /** Clear filter keys + q; keep preserveParams and any other non-filter URL params. */
  function clearFilters() {
    setLiveQuery(moduleId, "");
    const next: Record<string, string> = { ...preservedFromUrl() };
    search.forEach((value, key) => {
      if (key === "q") return;
      if (keys.includes(key)) return;
      next[key] = value;
    });
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
    for (const key of preserve) delete params[key];
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

  function openConfigure() {
    setOpen(false);
    if (onConfigure) {
      onConfigure();
      return;
    }
    setConfigureOpen(true);
  }

  const liveQ = getLiveQuery(moduleId).trim();
  const hasCurrent = Object.keys(current).length > 0 || Boolean(liveQ);
  const filterActive = activeFilterCount > 0;
  const showConfigure = Boolean(configureSlot || onConfigure || canConfigure);

  const bar = (
    <div
      className="mb-3 flex flex-wrap items-center gap-1.5 text-xs"
      data-ff-pipeline-filters={moduleId}
    >
      <LiveContainsInput
        moduleId={moduleId}
        initialQuery={current.q ?? ""}
        placeholder={searchPlaceholder}
        aria-label="Contains Search"
        className={searchClassName}
        inputClassName={searchInputClassName}
      />

      <div className="relative" ref={panelRef}>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          data-ff-pipeline-filter-button=""
          data-active={filterActive ? "true" : "false"}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            chipTabClass(filterActive),
            "inline-flex h-8 items-center gap-1 px-2.5",
          )}
        >
          Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          <ChevronDown className={cn("size-3.5 opacity-80", open && "rotate-180")} />
        </button>

        {open ? (
          <div
            role="dialog"
            aria-label="Column filters"
            data-ff-pipeline-filter-panel=""
            className="absolute left-0 top-[calc(100%+0.35rem)] z-40 min-w-[18rem] max-w-[22rem] rounded-lg border border-border bg-white p-3 shadow-md"
          >
            <ul className="space-y-2">
              {fields.map((field) => (
                <li key={field.key} className="flex items-center gap-2">
                  <label
                    className="flex min-w-0 flex-1 items-center gap-2"
                    data-ff-pipeline-filter-field={field.key}
                  >
                    <span className="w-24 shrink-0 text-[11px] font-medium text-navy/80">
                      {field.label}
                    </span>
                    <select
                      aria-label={field.label}
                      value={current[field.key] ?? ""}
                      onChange={(event) => setField(field.key, event.target.value)}
                      className="h-8 min-w-0 flex-1 rounded-md border border-[#6b7280] bg-card px-1.5 text-xs text-navy"
                    >
                      <option value="">None</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
            {showConfigure ? (
              <div
                className="mt-3 border-t border-border pt-2"
                data-ff-pipeline-filter-configure-footer=""
              >
                {configureSlot ?? (
                  <button
                    type="button"
                    data-ff-pipeline-filter-configure=""
                    onClick={openConfigure}
                    className="text-xs font-medium text-[#002868] hover:underline"
                  >
                    Configure filters…
                  </button>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 px-2 text-xs font-medium text-navy"
              data-ff-pipeline-saved-filters=""
            />
          }
        >
          Saved
          {saved.length ? (
            <span className="text-muted-foreground">({saved.length})</span>
          ) : null}
          <ChevronDown className="size-3.5 opacity-80" data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-64 p-1" data-ff-pipeline-saved-menu="">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Saved filters
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {saved.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">No saved filters yet.</p>
            ) : (
              (saved ?? []).map((row) => {
                const active = sameFilterParams(row.params, current);
                const renaming = renamingId === row.id;
                return (
                  <div
                    key={row.id}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-1 py-1",
                      active ? "bg-secondary" : "hover:bg-muted/60",
                    )}
                    data-ff-pipeline-saved-filter={row.id}
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
                        onClick={() => {
                          setLiveQuery(moduleId, row.params.q ?? "");
                          go(row.params);
                        }}
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
              })
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {naming ? (
        <span className="inline-flex items-center gap-1" data-ff-pipeline-filter-save-as="">
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
          data-ff-pipeline-filter-save-as=""
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
          data-ff-pipeline-filter-clear=""
          onClick={clearFilters}
          className="h-8 px-1 text-xs text-muted-foreground hover:underline"
        >
          Clear
        </button>
      ) : null}

      {canConfigure && !configureSlot ? (
        <ConfigurePageFiltersButton
          moduleId={moduleId}
          hideTrigger
          open={configureOpen}
          onOpenChange={setConfigureOpen}
        />
      ) : null}
    </div>
  );

  return (
    <PageFilterChromeProvider canConfigure={canConfigure} moduleId={moduleId}>
      {bar}
    </PageFilterChromeProvider>
  );
}
