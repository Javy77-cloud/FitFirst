import type { ReactNode } from "react";
import { Suspense } from "react";
import { PendingTabList, type PendingTabMark } from "@/components/desk/pending-tab-list";
import { chipTabClass, dealTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
import { cn } from "@/lib/utils";

export type SectionTab = {
  id: string;
  label: string;
  content: React.ReactNode;
  href?: string;
  mark?: PendingTabMark | null;
  complete?: boolean;
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
  tabSize = "default",
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
  tabSize?: "default" | "deal";
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

  const pendingTabs = tabs.map((tab) => ({
    id: tab.id,
    label: tab.label,
    href: tab.href ?? hrefFor(tab.id),
    mark: tab.mark,
    complete: tab.complete,
  }));
  const tabFallback = (
    <div role="tablist" className={FF_CHIP_TAB_GROUP}>
      {pendingTabs.map((tab) => (
        <span
          key={tab.id}
          className={(tabSize === "deal" ? dealTabClass : chipTabClass)(tab.id === current?.id)}
          data-ff-tab-complete={tab.complete ? "true" : "false"}
        >
          {tab.label}
          {tab.complete ? (
            <span
              className="pointer-events-none absolute right-0 bottom-0 inline-flex size-3 translate-x-1/4 translate-y-1/4 items-center justify-center rounded-full text-[8px] font-bold leading-none"
              data-ff-tab-complete=""
            >
              ✓
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
  const tabList = (
    <div className="flex flex-wrap items-center justify-between gap-2" data-ff-deal-tab-row="">
      <Suspense fallback={tabFallback}>
        <PendingTabList
          currentId={current?.id ?? defaultValue}
          tabs={pendingTabs}
          size={tabSize}
        />
      </Suspense>
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
          gridTemplateColumns: "minmax(0, 1fr) 420px",
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
          data-ff-deal-rail-lock="420"
          style={{ gridColumn: 2, gridRow: 2, paddingTop: 50, width: 420 }}
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
