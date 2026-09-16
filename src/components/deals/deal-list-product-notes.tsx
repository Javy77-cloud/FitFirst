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
  showLabel,
}: {
  dealId: string;
  columnId: string;
  product: string;
  label: string;
  value: string;
  showLabel: boolean;
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
    <label className="block min-w-[8rem]" data-ff-deal-list-product-note={product}>
      {showLabel ? (
        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : (
        <span className="sr-only">{label} notes</span>
      )}
      <textarea
        aria-label={`${label} notes`}
        data-ff-pipe-edit={columnId}
        data-ff-notes-expanded={expanded ? "1" : "0"}
        className={cn(
          "w-full min-w-[8rem] rounded-sm border border-border bg-background px-1.5 text-xs text-navy resize-none",
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
  const showLabel = notes.length > 1;
  return (
    <div
      className={cn("min-w-[8rem]", showLabel ? "space-y-1" : undefined)}
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
          showLabel={showLabel}
        />
      ))}
    </div>
  );
}
