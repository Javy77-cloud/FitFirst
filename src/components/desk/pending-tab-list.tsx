"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PendingLink } from "@/components/desk/pending-link";
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
  const [optimisticId, setOptimisticId] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticId(null);
  }, [pathname, search]);

  const activeId = optimisticId ?? currentId;

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
            onClick={() => setOptimisticId(tab.id)}
          >
            {tab.label}
          </PendingLink>
        );
      })}
    </div>
  );
}
