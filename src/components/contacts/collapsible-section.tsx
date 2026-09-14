"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function CollapsibleSection({
  id,
  title,
  badge,
  actions,
  defaultOpen = false,
  open: openControlled,
  onOpenChange,
  children,
  className,
  "data-ff": dataFf,
}: {
  id?: string;
  title: string;
  badge?: ReactNode;
  /** Extra controls on the header row (Save, etc). Clicks do not toggle open. */
  actions?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  "data-ff"?: string;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const controlled = openControlled !== undefined;
  const open = controlled ? openControlled : uncontrolledOpen;

  function setOpen(next: boolean) {
    if (!controlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  return (
    <section
      id={id}
      className={cn("ff-card overflow-hidden scroll-mt-4", className)}
      data-ff={dataFf}
    >
      <div className="border-b border-border px-4 py-2">
        <div className="flex w-full min-w-0 items-center gap-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={() => setOpen(!open)}
            data-ff-collapse-toggle=""
            aria-expanded={open}
          >
            {open ? (
              <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate text-base font-semibold text-navy">{title}</span>
            {badge ? <span className="shrink-0 text-xs text-muted-foreground">{badge}</span> : null}
          </button>
        </div>
        {actions ? (
          <div
            className="mt-2 flex flex-wrap items-center gap-2"
            data-ff-collapse-actions=""
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        ) : null}
      </div>
      {open ? <div className="p-4">{children}</div> : null}
    </section>
  );
}
