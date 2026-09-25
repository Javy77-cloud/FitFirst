"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchPageFilterPrefs, resetAgencyPageFilters, saveAgencyPageFilters } from "@/app/actions/page-filters";
import { Button } from "@/components/ui/button";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { flashAction } from "@/lib/flash-client";
import {
  PAGE_FILTER_COLOR_PRESETS,
  defaultPageFilters,
  normalizePageFilterModule,
  pageFilterFields,
  seedPageFilter,
  type PageFilter,
  type PageFilterModule,
  type PageFilterOption,
} from "@/lib/page-filters";
import { titleCaseLabel } from "@/lib/ui/title-case";
import { cn } from "@/lib/utils";

const triggerClass = cn(
  "inline-flex h-7 items-center rounded-md border border-border bg-card px-2 text-xs font-medium text-navy",
  "hover:bg-muted",
);

export function ConfigurePageFiltersButton({
  moduleId,
  columns,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: {
  moduleId: string;
  columns?: Array<{ id: string; label: string }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const module = normalizePageFilterModule(moduleId);
  const mounted = useClientMounted();
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? Boolean(openProp) : uncontrolledOpen;
  function setOpen(next: boolean) {
    if (!controlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }
  const [draft, setDraft] = useState<PageFilter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fields = useMemo(
    () => (module ? pageFilterFields(module, columns) : []),
    [columns, module],
  );

  useEffect(() => {
    if (!open || !module) return;
    startTransition(() => {
      void fetchPageFilterPrefs(module).then((rows) => setDraft(rows));
    });
  }, [module, open]);

  if (!module || !mounted) return null;
  const active = module;

  function patch(id: string, next: Partial<PageFilter>) {
    setDraft((current) => current.map((row) => (row.id === id ? { ...row, ...next } : row)));
  }

  function patchOption(filterId: string, index: number, next: Partial<PageFilterOption>) {
    setDraft((current) =>
      current.map((row) => {
        if (row.id !== filterId) return row;
        const options = (row.options ?? []).map((option, i) => (i === index ? { ...option, ...next } : option));
        return { ...row, options };
      }),
    );
  }

  function addOption(filterId: string) {
    setDraft((current) =>
      current.map((row) =>
        row.id === filterId
          ? { ...row, options: [...(row.options ?? []), { value: "", label: "", color: null }] }
          : row,
      ),
    );
  }

  function removeOption(filterId: string, index: number) {
    setDraft((current) =>
      current.map((row) =>
        row.id === filterId
          ? { ...row, options: (row.options ?? []).filter((_, i) => i !== index) }
          : row,
      ),
    );
  }

  function addFilter() {
    const used = new Set(draft.map((row) => row.fieldKey));
    const field = fields.find((row) => !used.has(row.key)) ?? fields[0];
    if (!field) return;
    setDraft((current) => [...current, seedPageFilter(active, field.key)]);
  }

  function save() {
    const cleaned = draft
      .map((row) => ({
        ...row,
        label: titleCaseLabel(row.label),
        options: (row.options ?? [])
          .map((option) => ({
            ...option,
            value: option.value.trim(),
            label: titleCaseLabel(option.label.trim() || option.value),
          }))
          .filter((option) => option.value),
      }))
      .filter((row) => row.fieldKey.trim());
    startTransition(() => {
      void saveAgencyPageFilters(active, cleaned)
        .then((rows) => {
          setDraft(rows);
          setError(null);
          flashAction("settings-saved");
          setOpen(false);
          router.refresh();
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Could not save.");
        });
    });
  }

  function resetDefaults() {
    startTransition(() => {
      void resetAgencyPageFilters(active)
        .then((rows) => {
          setDraft(rows);
          setError(null);
          flashAction("settings-saved");
          router.refresh();
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Could not reset.");
        });
    });
  }

  return (
    <>
      {hideTrigger ? null : (
        <button
          type="button"
          data-ff-configure-page-filters={module}
          aria-label="Configure Page Filters"
          title="Configure Page Filters"
          className={triggerClass}
          onClick={() => setOpen(true)}
        >
          Configure Page Filters
        </button>
      )}
      {open && typeof document !== "undefined"
        ? createPortal(
            <ConfigureDialog
              module={module}
              fields={fields}
              draft={draft}
              error={error}
              pending={pending}
              onClose={() => setOpen(false)}
              onAdd={addFilter}
              onDelete={(id) => setDraft((current) => current.filter((row) => row.id !== id))}
              onClear={() => setDraft([])}
              onReset={resetDefaults}
              onPatch={patch}
              onPatchOption={patchOption}
              onAddOption={addOption}
              onRemoveOption={removeOption}
              onSave={save}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function ConfigureDialog({
  module,
  fields,
  draft,
  error,
  pending,
  onClose,
  onAdd,
  onDelete,
  onClear,
  onReset,
  onPatch,
  onPatchOption,
  onAddOption,
  onRemoveOption,
  onSave,
}: {
  module: PageFilterModule;
  fields: { key: string; label: string }[];
  draft: PageFilter[];
  error: string | null;
  pending: boolean;
  onClose: () => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onReset: () => void;
  onPatch: (id: string, next: Partial<PageFilter>) => void;
  onPatchOption: (filterId: string, index: number, next: Partial<PageFilterOption>) => void;
  onAddOption: (filterId: string) => void;
  onRemoveOption: (filterId: string, index: number) => void;
  onSave: () => void;
}) {
  // All filter cards start collapsed; expand one or more as needed.
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  /** null = not seeded yet. Seed on first non-empty draft (prefs load) without expanding. */
  const knownIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const ids = draft.map((row) => row.id);
    // Ignore the empty initial draft so the async prefs load does not look like "all new".
    if (ids.length === 0) return;
    if (knownIdsRef.current === null) {
      knownIdsRef.current = new Set(ids);
      setExpandedIds([]); // hard guarantee: open collapsed
      return;
    }
    const known = knownIdsRef.current;
    const fresh = ids.filter((id) => !known.has(id));
    knownIdsRef.current = new Set(ids);
    if (fresh.length) {
      setExpandedIds((current) => [...new Set([...current, ...fresh])]);
    }
  }, [draft]);

  function toggleExpanded(id: string) {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className="fixed inset-0 z-[100]" data-ff-configure-page-filters-dialog={module}>
      <button type="button" className="absolute inset-0 bg-black/20" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ff-page-filters-title"
        className="absolute top-1/2 left-1/2 flex max-h-[min(90vh,44rem)] w-[min(44rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 id="ff-page-filters-title" className="text-base font-semibold text-[#002868]">
              Configure Page Filters
            </h2>

          </div>
          <Button type="button" size="xs" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="flex-1 space-y-3 overflow-auto px-4 py-3">
          {draft.length === 0 ? (
            <p className="text-sm text-muted-foreground">No filters.</p>
          ) : null}
          {(draft ?? []).map((row) => {
            const expanded = expandedIds.includes(row.id);
            return (
            <section key={row.id} className="rounded-lg border border-border p-3" data-ff-page-filter-card={row.id} data-expanded={expanded ? "true" : "false"}>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={expanded ? `Collapse ${row.label || row.fieldKey}` : `Expand ${row.label || row.fieldKey}`}
                  onClick={() => toggleExpanded(row.id)}
                  className="inline-flex size-7 items-center justify-center rounded-md text-navy hover:bg-muted"
                >
                  {expanded ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
                </button>
                <label className="flex items-center gap-1.5 text-xs text-navy" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(event) => onPatch(row.id, { enabled: event.target.checked })}
                    className="size-3.5 accent-[#002868]"
                  />
                  Enable
                </label>
                <button
                  type="button"
                  onClick={() => toggleExpanded(row.id)}
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium text-navy"
                >
                  {row.label || titleCaseLabel(row.fieldKey)}
                  <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                    {row.fieldKey}
                    {row.options.length ? ` · ${row.options.length} options` : ""}
                  </span>
                </button>
                <FileDeleteIcon
                  type="button"
                  label={`Delete filter ${row.label || row.fieldKey}`}
                  className="size-7 p-1.5"
                  onClick={() => onDelete(row.id)}
                />
              </div>
              {expanded ? (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={row.label}
                      onChange={(event) => onPatch(row.id, { label: event.target.value })}
                      aria-label="Filter Label"
                      className="h-8 min-w-32 flex-1 rounded-md border border-[#6b7280] bg-card px-2 text-sm text-navy"
                    />
                    <select
                      aria-label="Filter Field"
                      value={row.fieldKey}
                      onChange={(event) => {
                        const fieldKey = event.target.value;
                        const field = fields.find((item) => item.key === fieldKey);
                        const next: Partial<PageFilter> = { fieldKey };
                        if (field && row.label === titleCaseLabel(row.fieldKey.replaceAll("_", " "))) {
                          next.label = field.label;
                        }
                        const seeded = defaultPageFilters(module).find((item) => item.fieldKey === fieldKey);
                        if (seeded && row.options.length === 0) next.options = seeded.options.map((option) => ({ ...option }));
                        onPatch(row.id, next);
                      }}
                      className="h-8 max-w-[14rem] rounded-md border border-[#6b7280] bg-card px-1.5 text-sm text-navy"
                    >
                      {fields.map((field) => (
                        <option key={field.key} value={field.key}>
                          {field.label}
                        </option>
                      ))}
                      {fields.some((field) => field.key === row.fieldKey) ? null : (
                        <option value={row.fieldKey}>{titleCaseLabel(row.fieldKey)}</option>
                      )}
                    </select>
                  </div>
                  <ul className="space-y-1.5">
                    {(row.options ?? []).map((option, index) => (
                      <li key={`${row.id}-opt-${index}`} className="flex flex-wrap items-center gap-1.5">
                        <input
                          value={option.value}
                          onChange={(event) => onPatchOption(row.id, index, { value: event.target.value })}
                          placeholder="Value"
                          aria-label="Option Value"
                          className="h-7 w-28 rounded-md border border-[#6b7280] bg-card px-1.5 text-xs"
                        />
                        <input
                          value={option.label}
                          onChange={(event) => onPatchOption(row.id, index, { label: event.target.value })}
                          placeholder="Label"
                          aria-label="Option Label"
                          className="h-7 min-w-28 flex-1 rounded-md border border-[#6b7280] bg-card px-1.5 text-xs"
                        />
                        <input
                          type="color"
                          value={option.color && /^#[0-9A-Fa-f]{6}$/.test(option.color) ? option.color : "#64748B"}
                          onChange={(event) => onPatchOption(row.id, index, { color: event.target.value.toUpperCase() })}
                          aria-label="Option Color"
                          className="h-7 w-8 cursor-pointer rounded border border-[#6b7280] bg-card p-0.5"
                        />
                        <div className="flex items-center gap-0.5">
                          {PAGE_FILTER_COLOR_PRESETS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              aria-label={`Color ${color}`}
                              onClick={() => onPatchOption(row.id, index, { color })}
                              className="size-4 rounded-sm border border-black/10"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          <button
                            type="button"
                            className="text-[10px] text-muted-foreground hover:underline"
                            onClick={() => onPatchOption(row.id, index, { color: null })}
                          >
                            Clear
                          </button>
                        </div>
                        <FileDeleteIcon
                          type="button"
                          label={`Remove option ${option.label || option.value || index + 1}`}
                          className="size-7 p-1.5"
                          onClick={() => onRemoveOption(row.id, index)}
                        />
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => onAddOption(row.id)}
                    className="text-xs font-medium text-[#002868] hover:underline"
                  >
                    Add Option
                  </button>
                </div>
              ) : null}
            </section>
            );
          })}
        </div>
        {error ? <p className="px-4 text-sm text-[#BF0A30]">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/40 px-4 py-3">
          <button
            type="button"
            onClick={onAdd}
            className="h-8 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-navy hover:bg-muted"
          >
            Add Filter
          </button>
          <button
            type="button"
            onClick={onClear}
            className="h-8 px-1 text-xs text-muted-foreground hover:underline"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={pending}
            className="h-8 px-1 text-xs text-[#002868] hover:underline"
          >
            Reset To Defaults
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" size="xs" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="xs"
              onClick={onSave}
              disabled={pending}
              className="bg-[#002868] text-white hover:bg-[#002868]/90"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
