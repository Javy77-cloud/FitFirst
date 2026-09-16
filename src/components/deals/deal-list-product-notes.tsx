"use client";

import { useEffect, useState, useTransition } from "react";
import { saveDealProductListNote } from "@/app/actions/product-stage";
import type { ListProductNote } from "@/lib/deals/product-stages";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";

function ProductNoteField({
  dealId,
  columnId,
  product,
  label,
  value,
}: {
  dealId: string;
  columnId: string;
  product: string;
  label: string;
  value: string;
}) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(value);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function persist() {
    if (draft === value) return;
    startTransition(async () => {
      const result = await saveDealProductListNote({
        dealId,
        product,
        note: draft,
        columnId,
      });
      if (result.ok) {
        flashAction("deal-updated");
        return;
      }
      setDraft(value);
      flashAction(result.error || "Could not save", "error");
    });
  }

  return (
    <label
      className="flex min-w-0 items-center gap-1"
      data-ff-deal-list-product-note={product}
    >
      <span
        className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
        data-ff-deal-list-product-note-label=""
      >
        {label}
      </span>
      <textarea
        aria-label={`${label} notes`}
        data-ff-pipe-edit={columnId}
        data-ff-notes-expanded={expanded ? "1" : "0"}
        className={cn(
          "min-w-0 flex-1 rounded-sm border border-border bg-background px-1.5 text-xs text-navy resize-none",
          expanded
            ? "min-h-[2.75rem] py-1 whitespace-pre-wrap"
            : "h-7 min-h-7 overflow-hidden whitespace-nowrap text-ellipsis py-1 leading-tight",
        )}
        value={draft}
        disabled={pending}
        rows={expanded ? 2 : 1}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => setExpanded(true)}
        onBlur={() => {
          setExpanded(false);
          persist();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        title={expanded ? undefined : draft || undefined}
      />
    </label>
  );
}

export function DealListProductNotes({
  dealId,
  columnId,
  notes,
}: {
  dealId: string;
  columnId: string;
  notes: readonly ListProductNote[];
}) {
  if (!notes.length) return null;
  return (
    <div
      className="min-w-0 space-y-1"
      data-ff-deal-list-product-notes=""
      data-ff-deal-list-product-note-count={notes.length}
    >
      {notes.map((row) => (
        <ProductNoteField
          key={row.product}
          dealId={dealId}
          columnId={columnId}
          product={row.product}
          label={row.label}
          value={row.note}
        />
      ))}
    </div>
  );
}
