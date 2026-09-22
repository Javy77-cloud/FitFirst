"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Tag } from "lucide-react";
import { createPortal } from "react-dom";
import { saveRecordTags } from "@/app/actions/record-tags";
import { Button } from "@/components/ui/button";
import { TagChips } from "@/components/tags/tag-chips";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { flashAction } from "@/lib/flash-client";
import { formatTagLabel, normalizeTags, type TagModule } from "@/lib/tags/module-tags";
import { tagChipStyle, type TagColorMap } from "@/lib/tags/tag-colors";

export type TagCatalogRow = { name: string; color: string | null };

function colorsFromCatalog(catalog: TagCatalogRow[]): TagColorMap {
  const out: TagColorMap = {};
  for (const row of catalog) {
    if (row.color) out[row.name] = row.color;
  }
  return out;
}

export function AssignRecordTags({
  module,
  recordId,
  tags,
  catalog,
  compact = true,
  appearance = "chips",
  emptyPlaceholder = "dash",
}: {
  module: TagModule;
  recordId: string;
  tags: string[] | null | undefined;
  catalog: TagCatalogRow[];
  compact?: boolean;
  /** chips = default chip row; addLink = Zoho-style Tag icon + Add Tags under a name */
  appearance?: "chips" | "addLink";
  /** dash = lone em dash when there are no tags. none = render nothing (Contacts Stack). */
  emptyPlaceholder?: "dash" | "none";
}) {
  const mounted = useClientMounted();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(() => normalizeTags(tags));
  const [draft, setDraft] = useState(() => normalizeTags(tags));
  const [, startTransition] = useTransition();
  const [panel, setPanel] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const colors = colorsFromCatalog(catalog);

  useEffect(() => {
    const next = normalizeTags(tags);
    setCurrent(next);
    if (!open) setDraft(next);
  }, [tags, open]);

  useEffect(() => {
    if (!open) return;
    function place() {
      const box = buttonRef.current?.getBoundingClientRect();
      if (!box) return;
      const width = 260;
      const left = Math.min(Math.max(8, box.left), window.innerWidth - width - 8);
      const top = Math.min(box.bottom + 4, window.innerHeight - 12);
      setPanel({ top, left });
    }
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    place();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  if (emptyPlaceholder === "none" && current.length === 0) return null;

  function toggle(name: string) {
    setDraft((list) => (list.includes(name) ? list.filter((item) => item !== name) : [...list, name]));
  }

  function save(next: string[]) {
    const form = new FormData();
    form.set("module", module);
    form.set("recordId", recordId);
    form.set("tags", next.join(","));
    setCurrent(next);
    setOpen(false);
    startTransition(() => {
      void saveRecordTags(form).then(() => flashAction("tags-saved"));
    });
  }

  return (
    <div className="relative min-w-0 max-w-full" data-ff-assign-tags={module}>
      <button
        ref={buttonRef}
        type="button"
        className={
          appearance === "addLink"
            ? "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-sm text-left text-sm text-muted-foreground hover:text-[#002868]"
            : "min-w-0 max-w-full rounded-sm text-left hover:bg-muted/60"
        }
        onClick={() => {
          setDraft(current);
          setOpen((value) => !value);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={current.length ? "Edit Tags" : "Add Tags"}
        data-ff-assign-tags-trigger=""
        data-ff-assign-tags-appearance={appearance}
      >
        {appearance === "addLink" ? (
          <>
            <Tag className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {current.length ? (
              <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
                <TagChips tags={current} colors={colors} />
                <span className="text-sm font-normal text-muted-foreground">Edit Tags</span>
              </span>
            ) : (
              <span className="text-sm font-normal">Add Tags</span>
            )}
          </>
        ) : (
          <TagChips tags={current} colors={colors} />
        )}
      </button>
      {mounted && open && panel && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label={`Assign ${module} tags`}
              className="fixed z-[90] w-[260px] rounded-md border border-border bg-card p-2 shadow-lg"
              style={{ top: panel.top, left: panel.left }}
              data-ff-assign-tags-popup={module}
            >
              <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {compact ? "Assign tags" : "Pick tags for this record"}
              </p>
              {catalog.length === 0 ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  No catalog tags yet. Create them from Manage tags.
                </p>
              ) : (
                <ul className="max-h-56 space-y-0.5 overflow-auto">
                  {catalog.map((row) => {
                    const checked = draft.includes(row.name);
                    const style = tagChipStyle(row.color);
                    return (
                      <li key={row.name}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm text-navy hover:bg-muted">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(row.name)}
                            className="size-3.5 accent-primary"
                            data-ff-assign-tag={row.name}
                          />
                          <span
                            className={
                              style
                                ? "rounded-sm px-1.5 py-0.5 text-[11px] font-medium"
                                : "rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-navy"
                            }
                            style={style}
                          >
                            {formatTagLabel(row.name)}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                <Button type="button" size="xs" variant="ghost" onClick={() => save([])}>
                  None
                </Button>
                <Button type="button" size="xs" onClick={() => save(draft)}>
                  Save
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
