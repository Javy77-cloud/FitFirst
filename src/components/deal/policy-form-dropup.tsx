"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** One-row policy field. The option list is always in the DOM and opens upward. */
export function PolicyFormDropup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0 w-full max-w-full" data-ff-policy-form-field="">
      <button
        type="button"
        className="flex h-8 w-full min-w-0 items-center gap-1 rounded-md border border-[var(--ff-row-line)] bg-white px-2 text-left text-[12px] font-medium text-[var(--ff-ink)] shadow-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        data-ff-policy-form-trigger=""
        title={label}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronDown
          className={cn("size-3.5 shrink-0 text-muted-foreground", open && "rotate-180")}
          aria-hidden
        />
      </button>
      <div
        id={listId}
        role="listbox"
        aria-label="Policy forms"
        data-ff-policy-form-menu=""
        data-ff-policy-form-dropup=""
        hidden={!open}
        className="absolute bottom-full left-0 z-30 mb-2 w-max min-w-[12rem] max-w-[22rem] rounded-md border border-[var(--ff-border)] bg-white shadow-md"
      >
        <span
          className="pointer-events-none absolute -bottom-1 left-4 size-2 rotate-45 border-b border-r border-[var(--ff-border)] bg-white"
          aria-hidden
        />
        <div className="max-h-64 overflow-y-auto px-3 py-2">{children}</div>
      </div>
    </div>
  );
}
