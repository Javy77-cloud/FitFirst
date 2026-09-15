import { Suspense } from "react";
import { PendingTabList } from "@/components/desk/pending-tab-list";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
import {
  AGENT_DEAL_TAB_LABELS,
  AGENT_DEAL_TABS,
  parseAgentDealTab,
  type AgentDealTab,
} from "@/lib/deals/tabs";

export type DealTabId = AgentDealTab;

export function parseDealTab(value: string | undefined): DealTabId {
  return parseAgentDealTab(value);
}

export function DealTabs({
  dealId,
  active,
  panels,
}: {
  dealId: string;
  active: DealTabId;
  panels: Record<DealTabId, React.ReactNode>;
}) {
  const tabs = AGENT_DEAL_TABS.map((tab) => ({
    id: tab,
    label: AGENT_DEAL_TAB_LABELS[tab],
    href: `/deals/${dealId}?tab=${tab}`,
  }));
  return (
    <div>
      <Suspense
        fallback={
          <div role="tablist" aria-label="Deal sections" className={FF_CHIP_TAB_GROUP}>
            {tabs.map((tab) => (
              <span key={tab.id} className={chipTabClass(tab.id === active)}>
                {tab.label}
              </span>
            ))}
          </div>
        }
      >
        <PendingTabList aria-label="Deal sections" currentId={active} tabs={tabs} />
      </Suspense>
      <div className="mt-4">{panels[active]}</div>
    </div>
  );
}
