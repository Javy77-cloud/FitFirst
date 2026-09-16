"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PendingLink } from "@/components/desk/pending-link";
import { currentDeskPath } from "@/lib/desk/interaction-pending";
import { chipTabClass, dealTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
import { cn } from "@/lib/utils";

export type PendingTabMark = "bindable" | "none_bindable";

export type PendingTab = {
  id: string;
  label: string;
  href: string;
  mark?: PendingTabMark | null;
};

export function PendingTabList({
  tabs,
  currentId,
  size = "default",
  "aria-label": ariaLabel,
}: {
  tabs: PendingTab[];
  currentId: string;
  size?: "default" | "deal";
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
            className={cn(size === "deal" ? dealTabClass(selected) : chipTabClass(selected))}
            onClick={() => setOptimistic({ from: navKey, id: tab.id })}
          >
            <span className="inline-flex items-center gap-1">
              {tab.label}
              {tab.mark === "bindable" ? (
                <span
                  className="text-[13px] leading-none text-[var(--ff-green)]"
                  aria-label="Bindable quotes ready"
                  data-ff-quotes-tab-mark="bindable"
                >
                  ✓
                </span>
              ) : tab.mark === "none_bindable" ? (
                <span
                  className="text-[13px] leading-none text-fit-flag"
                  aria-label="Quotes requested, none bindable"
                  data-ff-quotes-tab-mark="none_bindable"
                >
                  ✓
                </span>
              ) : null}
            </span>
          </PendingLink>
        );
      })}
    </div>
  );
}
