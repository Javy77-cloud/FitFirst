"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveRecordTags, updateModuleTagColor } from "@/app/actions/record-tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatTagLabel,
  normalizeTag,
  normalizeTags,
  type TagModule,
} from "@/lib/tags/module-tags";
import {
  DEFAULT_TAG_PICKER_COLOR,
  normalizeTagColor,
  serializeTagColors,
  tagChipStyle,
  type TagColorMap,
} from "@/lib/tags/tag-colors";
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
  const [draft, setDraft] = useState("");
  const [draftColor, setDraftColor] = useState(DEFAULT_TAG_PICKER_COLOR);
  const [colors, setColors] = useState<TagColorMap>(() => ({ ...initialColors }));
  const [, startTransition] = useTransition();
  const unused = suggestions.filter((tag) => !current.includes(tag));

  function add(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag || current.includes(tag)) return;
    const hex =
      normalizeTagColor(colors[tag]) ?? normalizeTagColor(draftColor) ?? DEFAULT_TAG_PICKER_COLOR;
    setCurrent((list) => [...list, tag]);
    setColors((map) => ({ ...map, [tag]: hex }));
    setDraft("");
  }

  function remove(tag: string) {
    setCurrent((list) => list.filter((item) => item !== tag));
  }

  function editColor(tag: string, raw: string) {
    const hex = normalizeTagColor(raw);
    if (!hex) return;
    setColors((map) => ({ ...map, [tag]: hex }));
    const form = new FormData();
    form.set("module", module);
    form.set("name", tag);
    form.set("color", hex);
    startTransition(() => {
      void updateModuleTagColor(form).then(() => flashAction("tag-color-saved"));
    });
  }

  return (
    <form action={saveRecordTags} className="space-y-2" data-ff-record-tags={module}>
      <input type="hidden" name="module" value={module} />
      <input type="hidden" name="recordId" value={recordId} />
      <input type="hidden" name="tags" value={current.join(",")} />
      <input type="hidden" name="tagColors" value={serializeTagColors(colors)} />
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</p>
      <div className="flex flex-wrap gap-1">
        {current.length === 0 ? (
          <span className="text-sm text-muted-foreground">No tags yet.</span>
        ) : (
          current.map((tag) => {
            const style = tagChipStyle(colors[tag]);
            return (
              <span
                key={tag}
                className={
                  style
                    ? "group relative inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-medium"
                    : "group relative inline-flex items-center rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-navy"
                }
                style={style}
                data-ff-tag-chip={tag}
                data-ff-tag-color={colors[tag] ?? ""}
              >
                {formatTagLabel(tag)}
                <label className="ml-1 hidden cursor-pointer group-hover:inline" data-ff-tag-color-edit={tag}>
                  <span className="sr-only">Edit {formatTagLabel(tag)} color</span>
                  <input
                    type="color"
                    value={colors[tag] ?? DEFAULT_TAG_PICKER_COLOR}
                    onChange={(event) => editColor(tag, event.target.value)}
                    className="h-3.5 w-3.5 cursor-pointer rounded-sm border border-black/10 bg-transparent p-0"
                    aria-label={`Edit color for ${formatTagLabel(tag)}`}
                  />
                </label>
                <button
                  type="button"
                  className="ml-1 hidden text-current/70 group-hover:inline hover:text-fit-red"
                  onClick={() => remove(tag)}
                  aria-label={`Remove ${formatTagLabel(tag)}`}
                  data-ff-tag-remove={tag}
                >
                  ×
                </button>
              </span>
            );
          })
        )}
      </div>
      {unused.length ? (
        <div className="flex flex-wrap gap-1">
          {unused.map((tag) => {
            const style = tagChipStyle(colors[tag]);
            return (
              <button
                key={tag}
                type="button"
                className={
                  style
                    ? "rounded-sm px-1.5 py-0.5 text-[11px] hover:opacity-90"
                    : "rounded-sm border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-navy"
                }
                style={style}
                onClick={() => add(tag)}
              >
                + {formatTagLabel(tag)}
              </button>
            );
          })}
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
        <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          Color
          <input
            type="color"
            value={draftColor}
            onChange={(event) => setDraftColor(event.target.value)}
            className="h-7 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
            aria-label="Tag color"
            data-ff-tag-color-picker=""
          />
        </label>
        <Button type="button" size="xs" variant="outline" onClick={() => add(draft)}>
          Add
        </Button>
        <Button type="submit" size="xs">
          Save tags
        </Button>
        <Link
          href={`/settings/tags?module=${module}`}
          className="inline-flex h-7 items-center rounded-[10px] border border-border px-2 text-xs font-medium text-navy hover:bg-muted"
          data-ff-manage-tags
        >
          Manage tags
        </Link>
      </div>
    </form>
  );
}
