"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PendingLink } from "@/components/desk/pending-link";
import { currentDeskPath } from "@/lib/desk/interaction-pending";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
import { cn } from "@/lib/utils";

export type PendingTab = {
  id: string;
  label: string;
  href: string;
};

export function PendingTabList({
  tabs,
  currentId,
  "aria-label": ariaLabel,
}: {
  tabs: PendingTab[];
  currentId: string;
  "aria-label"?: string;
}) {
  const pathname = usePathname() ?? "";
  const search = useSearchParams();
  const navKey = currentDeskPath({
    pathname,
    search: search.toString() ? `?${search.toString()}` : "",
  });
  const [optimistic, setOptimistic] = useState<{ from: string; id: string } | null>(null);
  const activeId = optimistic?.from === navKey ? optimistic.id : currentId;

  return (
    <div role="tablist" aria-label={ariaLabel} className={FF_CHIP_TAB_GROUP}>
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <PendingLink
            key={tab.id}
            href={tab.href}
            scroll={false}
            prefetch
            role="tab"
            aria-selected={selected}
            className={cn(chipTabClass(selected))}
            onClick={() => setOptimistic({ from: navKey, id: tab.id })}
          >
            {tab.label}
          </PendingLink>
        );
      })}
    </div>
  );
}
