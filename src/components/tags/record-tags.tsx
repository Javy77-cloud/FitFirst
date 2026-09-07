"use client";

import { useState, useTransition } from "react";
import { saveRecordTags } from "@/app/actions/record-tags";
import { ManageTagsDialog } from "@/components/tags/manage-tags-dialog";
import { Button } from "@/components/ui/button";
import {
  formatTagLabel,
  normalizeTags,
  type TagModule,
} from "@/lib/tags/module-tags";
import { tagChipStyle, type TagColorMap } from "@/lib/tags/tag-colors";
import { flashAction } from "@/lib/flash-client";

export function RecordTags({
  module,
  recordId,
  tags,
  suggestions,
  colors: initialColors = {},
}: {
  module: TagModule;
  recordId: string;
  tags: string[] | null | undefined;
  suggestions: string[];
  colors?: TagColorMap;
}) {
  const [current, setCurrent] = useState(() => normalizeTags(tags));
  const [manageOpen, setManageOpen] = useState(false);
  const [, startTransition] = useTransition();
  const catalog = Array.from(
    new Set([...(Array.isArray(suggestions) ? suggestions : []), ...current]),
  );

  function persist(next: string[]) {
    setCurrent(next);
    const form = new FormData();
    form.set("module", module);
    form.set("recordId", recordId);
    form.set("tags", next.join(","));
    startTransition(() => {
      void saveRecordTags(form).then(() => flashAction("tags-saved"));
    });
  }

  function toggle(tag: string) {
    persist(current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  }

  return (
    <div className="space-y-2" data-ff-record-tags={module}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</p>
      <div className="flex flex-wrap gap-1">
        {catalog.length === 0 ? (
          <span className="text-sm text-muted-foreground">No catalog tags yet.</span>
        ) : (
          catalog.map((tag) => {
            const selected = current.includes(tag);
            const style = selected ? tagChipStyle(initialColors[tag]) : undefined;
            return (
              <button
                key={tag}
                type="button"
                className={
                  style
                    ? "rounded-sm px-1.5 py-0.5 text-[11px] font-medium"
                    : selected
                      ? "rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-navy"
                      : "rounded-sm border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-navy"
                }
                style={style}
                onClick={() => toggle(tag)}
                data-ff-tag-chip={tag}
                data-ff-tag-color={selected ? (initialColors[tag] ?? "") : ""}
                aria-pressed={selected}
              >
                {selected ? formatTagLabel(tag) : `+ ${formatTagLabel(tag)}`}
              </button>
            );
          })
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="xs" onClick={() => persist(current)}>
          Save tags
        </Button>
        <button
          type="button"
          className="inline-flex h-7 items-center rounded-[10px] border border-border px-2 text-xs font-medium text-navy hover:bg-muted"
          data-ff-manage-tags
          onClick={() => setManageOpen(true)}
        >
          Manage tags
        </button>
      </div>
      <ManageTagsDialog module={module} open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  );
}
