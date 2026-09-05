"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function ExpandCollapseControl({
  expanded,
  onExpand,
  onCollapse,
  expandLabel,
  collapseLabel,
  testId,
}: {
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  expandLabel: string;
  collapseLabel: string;
  testId?: string;
}) {
  return (
    <div
      className="inline-flex overflow-hidden rounded-md border border-border bg-card"
      data-testid={testId}
      data-state={expanded ? "expanded" : "collapsed"}
      role="group"
      aria-label={`${expandLabel} or ${collapseLabel}`}
    >
      <button
        type="button"
        aria-label={expandLabel}
        aria-pressed={expanded}
        data-active={expanded ? "true" : "false"}
        onClick={onExpand}
        className={cn(
          "inline-flex size-7 items-center justify-center transition-colors",
          expanded
            ? "bg-primary text-primary-foreground"
            : "bg-transparent text-muted-foreground hover:bg-muted hover:text-navy",
        )}
      >
        <ArrowDown className="size-3.5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label={collapseLabel}
        aria-pressed={!expanded}
        data-active={!expanded ? "true" : "false"}
        onClick={onCollapse}
        className={cn(
          "inline-flex size-7 items-center justify-center border-l border-border transition-colors",
          !expanded
            ? "bg-primary text-primary-foreground"
            : "bg-transparent text-muted-foreground hover:bg-muted hover:text-navy",
        )}
      >
        <ArrowUp className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
