import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type SectionTab = {
  id: string;
  label: string;
  content: React.ReactNode;
  href?: string;
};

/**
 * Server-rendered tabs. Switching is a real navigation (`?tab=`), so Quote Sheet
 * and Quotes stay reachable even when client hydration / HMR is down.
 */
export function SectionTabs({
  tabs,
  defaultValue,
  active,
  param = "tab",
  extraQuery,
  panelClassName,
  toolbar,
  banner,
}: {
  tabs: SectionTab[];
  defaultValue: string;
  active?: string | null;
  param?: string;
  extraQuery?: Record<string, string | undefined>;
  panelClassName?: string;
  toolbar?: ReactNode;
  banner?: ReactNode;
}) {
  const current = tabs.find((tab) => tab.id === active) ?? tabs.find((tab) => tab.id === defaultValue) ?? tabs[0];

  function hrefFor(id: string) {
    const query = new URLSearchParams();
    if (extraQuery) {
      for (const [key, value] of Object.entries(extraQuery)) {
        if (value) query.set(key, value);
      }
    }
    query.set(param, id);
    return `?${query.toString()}`;
  }

  function tabClass(selected: boolean) {
    return cn(
      "rounded-sm px-3 py-1.5 text-sm font-medium border",
      selected
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-white text-black border-black hover:bg-gray-50",
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
      <div role="tablist" className="inline-flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const selected = tab.id === current.id;
          const className = tabClass(selected);
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
            <Link
              key={tab.id}
              href={hrefFor(tab.id)}
              scroll={false}
              role="tab"
              aria-selected={selected}
              className={className}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {toolbar}
      </div>
      {banner}
      <div role="tabpanel" className={panelClassName ?? "mt-4"}>
        {current?.content}
      </div>
    </div>
  );
}
