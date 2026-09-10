import Link from "next/link";
import {
  AGENT_DEAL_TAB_LABELS,
  AGENT_DEAL_TABS,
  parseAgentDealTab,
  type AgentDealTab,
} from "@/lib/deals/tabs";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";

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
  return (
    <div>
      <nav
        aria-label="Deal sections"
        className={FF_CHIP_TAB_GROUP}
      >
        {AGENT_DEAL_TABS.map((tab) => {
          const selected = tab === active;
          return (
            <Link
              key={tab}
              href={`/deals/${dealId}?tab=${tab}`}
              scroll={false}
              prefetch
              className={chipTabClass(selected)}
            >
              {AGENT_DEAL_TAB_LABELS[tab]}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4">{panels[active]}</div>
    </div>
  );
}
