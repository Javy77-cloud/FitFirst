import type { ReactNode } from "react";
import { Suspense } from "react";
import { PendingTabList, type PendingTabMark } from "@/components/desk/pending-tab-list";
import { chipTabClass, dealTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
import { ACTIVITY_RAIL_ASIDE_CLASS, ACTIVITY_RAIL_COLUMNS, ACTIVITY_RAIL_LOCK, ACTIVITY_RAIL_PX } from "@/lib/desk/activity-rail";
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
 *   [ name / producer / phone / addresses ] [ momentum ]
 *   [ tabs + section under them           ] [ side panel ]
 *   The tab row and the panel share one surface, separated from the name block.
 *   Side panel keeps the 50px top; a negative margin cancels the extra tab gap
 *   so Quick Communication does not move.
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
  subnav,
  tabRowField,
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
  /** Products row — grouped with module tabs, below pipeline chrome. */
  subnav?: ReactNode;
  /** Active-product address field, on the same row as the module tabs. */
  tabRowField?: ReactNode;
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
                className="pointer-events-none absolute right-0 bottom-0 inline-flex size-[18px] translate-x-1/4 translate-y-1/4 items-center justify-center rounded-full text-[12px] font-bold leading-none"
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
    <div
      className={
        tabRowField
          ? "flex items-start gap-3"
          : "flex flex-wrap items-center justify-between gap-2"
      }
      data-ff-deal-tab-row=""
    >
      <Suspense fallback={tabFallback}>
        <PendingTabList
          currentId={current?.id ?? defaultValue}
          tabs={pendingTabs}
          size={tabSize}
        />
      </Suspense>
      {tabRowField ? (
        <div className="min-w-0 flex-1" data-ff-deal-tab-row-field="">
          {tabRowField}
        </div>
      ) : null}
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
          gridTemplateColumns: ACTIVITY_RAIL_COLUMNS,
          columnGap: "1.25rem",
          rowGap: "0",
        }}
      >
        {/* Name + tabs share left cell so the tall quotes chip cannot push tabs down. */}
        <div className="min-w-0" style={{ gridColumn: 1, gridRow: 1 }} data-ff-deal-heading="">
          {heading}
          <div
            className="mt-5 space-y-2"
            data-ff-deal-tab-row-wrap=""
            data-ff-deal-products-tabs-group=""
          >
            {subnav ? <div data-ff-deal-products-row="">{subnav}</div> : null}
            {tabList}
            {banner}
          </div>
        </div>
        <div
          className="flex items-start justify-end gap-2"
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
          className={ACTIVITY_RAIL_ASIDE_CLASS}
          data-ff-deal-right-rail=""
          data-ff-deal-rail-lock={ACTIVITY_RAIL_LOCK}
          style={{
            gridColumn: 2,
            gridRow: 2,
            paddingTop: 50,
            width: ACTIVITY_RAIL_PX,
            overflow: "visible",
          }}
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
