"use client";

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
}: {
  tabs: SectionTab[];
  defaultValue: string;
}) {
  const [active, setActive] = useState(defaultValue);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <div>
      <div
        role="tablist"
        className="inline-flex flex-wrap gap-1 rounded-md bg-muted p-1"
      >
        {tabs.map((tab) => {
          const selected = tab.id === current.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(tab.id)}
              className={cn(
                "rounded-sm px-2.5 py-1 text-sm font-medium",
                selected
                  ? "bg-card text-navy shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
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
