"use client";

import { useState, type ReactNode } from "react";

export function RecordSection({
  id,
  title,
  summary,
  defaultOpen = true,
  children,
}: {
  id: string;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="ff-card mb-4 overflow-hidden" data-section={id}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/60"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-base font-semibold text-navy">{title}</h2>
          {summary ? <p className="text-xs text-muted-foreground">{summary}</p> : null}
        </div>
        <span className="text-sm text-muted-foreground">{open ? "Minimize" : "Expand"}</span>
      </button>
      {open ? <div className="border-t border-border px-4 py-4">{children}</div> : null}
    </section>
  );
}
