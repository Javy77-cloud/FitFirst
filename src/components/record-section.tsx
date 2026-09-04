"use client";

import { useState, type ReactNode } from "react";

export function RecordSection({
  id,
  title,
  summary,
  defaultOpen = true,
  collapsible = true,
  children,
}: {
  id: string;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const show = !collapsible || open;
  return (
    <section id={id} className="ff-card mb-4 scroll-mt-20 overflow-hidden" data-section={id}>
      {collapsible ? (
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
          <span className="text-sm text-muted-foreground">{open ? "Collapse" : "Expand"}</span>
        </button>
      ) : (
        <div className="px-4 py-3">
          <h2 className="text-base font-semibold text-navy">{title}</h2>
          {summary ? <p className="text-xs text-muted-foreground">{summary}</p> : null}
        </div>
      )}
      {show ? <div className="border-t border-border px-4 py-4">{children}</div> : null}
    </section>
  );
}
