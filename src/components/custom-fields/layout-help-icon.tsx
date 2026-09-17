"use client";

import { useState, type ReactNode } from "react";
import { CircleHelp } from "lucide-react";

export function LayoutHelpIcon({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex" data-ff-layout-help="">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-navy"
        data-ff-layout-help-btn=""
        onClick={() => setOpen((current) => !current)}
      >
        <CircleHelp className="size-3.5" />
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 rounded-md border border-border bg-background px-2 py-1.5 text-left text-[11px] leading-snug text-navy shadow-md"
          data-ff-layout-help-tip=""
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
