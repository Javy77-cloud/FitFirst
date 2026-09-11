"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function CollapsibleSection({
  title,
  badge,
  defaultOpen = false,
  children,
  className,
  "data-ff": dataFf,
}: {
  title: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  "data-ff"?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn("ff-card overflow-hidden", className)} data-ff={dataFf}>
      <button
        type="button"
        className="flex w-full items-center gap-2 border-b border-border px-4 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
        data-ff-collapse-toggle=""
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-base font-semibold text-navy">{title}</span>
        {badge ? <span className="ml-auto text-xs text-muted-foreground">{badge}</span> : null}
      </button>
      {open ? <div className="p-4">{children}</div> : null}
    </section>
  );
}
