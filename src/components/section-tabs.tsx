"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type SectionTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export function SectionTabs({
  tabs,
  defaultValue,
  activeId,
  hrefFor,
}: {
  tabs: SectionTab[];
  defaultValue: string;
  /** When set (URL tab), clicks are links and survive Fill / refresh. */
  activeId?: string;
  hrefFor?: (id: string) => string;
}) {
  const [local, setLocal] = useState(defaultValue);
  const active = activeId ?? local;
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <div>
      <div
        role="tablist"
        className="inline-flex flex-wrap gap-1 rounded-md bg-muted p-1"
      >
        {tabs.map((tab) => {
          const selected = tab.id === current.id;
          const className = cn(
            "rounded-sm px-2.5 py-1 text-sm font-medium",
            selected
              ? "bg-card text-navy shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          );
          if (hrefFor) {
            return (
              <Link
                key={tab.id}
                href={hrefFor(tab.id)}
                role="tab"
                aria-selected={selected}
                scroll={false}
                className={className}
              >
                {tab.label}
              </Link>
            );
          }
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setLocal(tab.id)}
              className={className}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {hrefFor ? (
        <div role="tabpanel" className="mt-4">
          {current.content}
        </div>
      ) : (
        tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            hidden={tab.id !== current.id}
            className={cn("mt-4", tab.id !== current.id && "hidden")}
          >
            {tab.content}
          </div>
        ))
      )}
    </div>
  );
}
