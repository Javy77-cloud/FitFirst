"use client";

import { useState, type ReactNode } from "react";

export function SettingsSection({
  id,
  title,
  summary,
  badge,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  summary?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="ff-card overflow-hidden" data-section={id}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/60"
        aria-expanded={open}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-navy">{title}</h2>
            {badge ? (
              <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                {badge}
              </span>
            ) : null}
          </div>
          {summary ? <p className="text-xs text-muted-foreground">{summary}</p> : null}
        </div>
        <span className="text-xs text-muted-foreground">{open ? "Minimize" : "Expand"}</span>
      </button>
      {open ? <div className="border-t border-border px-4 py-4">{children}</div> : null}
    </section>
  );
}
