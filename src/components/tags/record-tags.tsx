"use client";

import { useState } from "react";
import { saveRecordTags } from "@/app/actions/record-tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatTagLabel,
  normalizeTag,
  normalizeTags,
  type TagModule,
} from "@/lib/tags/module-tags";

export function RecordTags({
  module,
  recordId,
  tags,
  suggestions,
}: {
  module: TagModule;
  recordId: string;
  tags: string[] | null | undefined;
  suggestions: string[];
}) {
  const [current, setCurrent] = useState(() => normalizeTags(tags));
  const [draft, setDraft] = useState("");
  const unused = suggestions.filter((tag) => !current.includes(tag));

  function add(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag || current.includes(tag)) return;
    setCurrent((list) => [...list, tag]);
    setDraft("");
  }

  function remove(tag: string) {
    setCurrent((list) => list.filter((item) => item !== tag));
  }

  return (
    <form action={saveRecordTags} className="space-y-2" data-ff-record-tags={module}>
      <input type="hidden" name="module" value={module} />
      <input type="hidden" name="recordId" value={recordId} />
      <input type="hidden" name="tags" value={current.join(",")} />
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</p>
      <div className="flex flex-wrap gap-1">
        {current.length === 0 ? (
          <span className="text-sm text-muted-foreground">No tags yet.</span>
        ) : (
          current.map((tag) => (
            <button
              key={tag}
              type="button"
              className="rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-navy hover:bg-fit-yellow-bg"
              onClick={() => remove(tag)}
              aria-label={`Remove ${formatTagLabel(tag)}`}
            >
              {formatTagLabel(tag)} ×
            </button>
          ))
        )}
      </div>
      {unused.length ? (
        <div className="flex flex-wrap gap-1">
          {unused.map((tag) => (
            <button
              key={tag}
              type="button"
              className="rounded-sm border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-navy"
              onClick={() => add(tag)}
            >
              + {formatTagLabel(tag)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(draft);
            }
          }}
          placeholder="Add a tag"
          className="h-8 w-40"
          aria-label="Add a tag"
        />
        <Button type="button" size="xs" variant="outline" onClick={() => add(draft)}>
          Add
        </Button>
        <Button type="submit" size="xs">
          Save tags
        </Button>
      </div>
    </form>
  );
}
