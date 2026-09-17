"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { LIST_PREVIEW_COUNT } from "@/lib/settings/list-editor";
import { cn } from "@/lib/utils";

export function CollapsibleListCard({
  cardId,
  header,
  actions,
  items,
  footer,
  previewCount = LIST_PREVIEW_COUNT,
}: {
  cardId: string;
  header: ReactNode;
  actions?: ReactNode;
  items: ReactNode[];
  footer?: ReactNode;
  previewCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = items.length > previewCount;
  const hiddenCount = canCollapse && !expanded ? items.length - previewCount : 0;

  return (
    <section className="ff-card space-y-3 p-4" data-ff-list-card={cardId} data-ff-list-expanded={expanded ? "1" : "0"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">{header}</div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="space-y-1" data-ff-list-preview={canCollapse && !expanded ? String(previewCount) : "all"}>
        {items.map((item, index) => {
          const collapsedAway = canCollapse && !expanded && index >= previewCount;
          return (
            <div key={index} hidden={collapsedAway} className={collapsedAway ? "hidden" : undefined}>
              {item}
            </div>
          );
        })}
      </div>
      {canCollapse ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          data-ff-list-collapse=""
          aria-expanded={expanded}
        >
          <ChevronDown className={cn("size-3.5 transition", expanded && "rotate-180")} />
          {expanded ? `Show first ${previewCount}` : `Show all ${items.length} values`}
          {hiddenCount > 0 ? (
            <span className="font-normal text-muted-foreground">(+{hiddenCount} more)</span>
          ) : null}
        </button>
      ) : null}
      {footer}
    </section>
  );
}
