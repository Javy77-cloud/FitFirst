"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type SectionTab = {
  id: string;
  label: string;
  content: React.ReactNode;
  href?: string;
};

export function SectionTabs({
  tabs,
  defaultValue,
  activeId,
}: {
  tabs: SectionTab[];
  defaultValue: string;
  /** When set (URL `?tab=`), selection is server-driven and does not rely on client state. */
  activeId?: string;
}) {
  const [active, setActive] = useState(defaultValue);
  const currentId = activeId ?? active;
  const current = tabs.find((tab) => tab.id === currentId) ?? tabs[0];

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
          if (tab.href) {
            return (
              <Link
                key={tab.id}
                href={tab.href}
                role="tab"
                aria-selected={selected}
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
              onClick={() => setActive(tab.id)}
              className={className}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          hidden={tab.id !== current.id}
          className={cn("mt-4", tab.id !== current.id && "hidden")}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
