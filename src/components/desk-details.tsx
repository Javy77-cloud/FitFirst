import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Module sections that fold when the broker does not need them open. */
export function DeskDetails({
  title,
  summary,
  open = true,
  padded = true,
  meta,
  children,
}: {
  title: ReactNode;
  summary?: ReactNode;
  open?: boolean;
  padded?: boolean;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group ff-card overflow-hidden" open={open}>
      <summary
        className={cn(
          "flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/60",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-navy">{title}</h2>
          {summary ? <div className="mt-1 text-xs text-muted-foreground">{summary}</div> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {meta}
          <span className="text-xs text-muted-foreground">
            <span className="group-open:hidden">Expand</span>
            <span className="hidden group-open:inline">Collapse</span>
          </span>
        </div>
      </summary>
      <div className={cn("border-t border-border", padded && "px-4 py-4")}>{children}</div>
    </details>
  );
}
