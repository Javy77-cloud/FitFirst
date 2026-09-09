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
 * Server-rendered tabs.
 *
 * Deal layout (heading + corner + sidePanel):
 *   [ heading     ] [ corner chip ]
 *   [ tabs        ] [             ]
 *   [ content     ] [ side panel  ]  ← same top (50px under tabs)
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
  sidePanel,
  heading,
  corner,
}: {
  tabs: SectionTab[];
  defaultValue: string;
  active?: string | null;
  param?: string;
  extraQuery?: Record<string, string | undefined>;
  panelClassName?: string;
  toolbar?: ReactNode;
  banner?: ReactNode;
  sidePanel?: ReactNode;
  /** Deal name / actions — always above tabs, left column. */
  heading?: ReactNode;
  /** Quotes-pulled chip — always top-right, never under tabs. */
  corner?: ReactNode;
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

  const tabList = (
    <div className="flex flex-wrap items-center justify-between gap-2" data-ff-deal-tab-row="">
      <div role="tablist" className="inline-flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const selected = tab.id === current.id;
          const className = tabClass(selected);
          if (tab.href) {
            return (
              <Link key={tab.id} href={tab.href} role="tab" aria-selected={selected} className={className}>
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
  );

  // Deal workspace: one grid owns title, chip, tabs, content, rail.
  if (heading != null || corner != null || sidePanel != null) {
    return (
      <div
        data-ff-section-tabs=""
        data-ff-deal-workspace=""
        className="grid w-full items-start"
        style={{
          gridTemplateColumns: "minmax(0, 1fr) 400px",
          columnGap: "1.25rem",
          rowGap: "0",
        }}
      >
        {/* Name + tabs share left cell so the tall quotes chip cannot push tabs down. */}
        <div className="min-w-0" style={{ gridColumn: 1, gridRow: 1 }} data-ff-deal-heading="">
          {heading}
          <div className="mt-2.5" data-ff-deal-tab-row-wrap="">
            {tabList}
            {banner}
          </div>
        </div>
        <div
          className="flex items-end justify-end gap-2"
          style={{ gridColumn: 2, gridRow: 1 }}
          data-ff-deal-quotes-corner=""
        >
          {corner}
        </div>
        <div
          role="tabpanel"
          data-ff-deal-tab-panel=""
          className={cn("min-w-0", panelClassName)}
          style={{ gridColumn: 1, gridRow: 2, paddingTop: 50 }}
        >
          {current?.content}
        </div>
        <aside
          className="min-w-0 space-y-3 overflow-x-hidden"
          data-ff-deal-right-rail=""
          data-ff-deal-rail-lock="400"
          style={{ gridColumn: 2, gridRow: 2, paddingTop: 50, width: 400 }}
        >
          {sidePanel}
        </aside>
      </div>
    );
  }

  return (
    <div data-ff-section-tabs="">
      {tabList}
      {banner}
      <div role="tabpanel" data-ff-deal-tab-panel="" className={cn(panelClassName)} style={{ paddingTop: 50 }}>
        {current?.content}
      </div>
    </div>
  );
}
