import Link from "next/link";
import {
  AGENT_DEAL_TAB_LABELS,
  AGENT_DEAL_TABS,
  parseAgentDealTab,
  type AgentDealTab,
} from "@/lib/deals/tabs";
import { cn } from "@/lib/utils";

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
        className="inline-flex flex-wrap gap-1.5"
      >
        {AGENT_DEAL_TABS.map((tab) => {
          const selected = tab === active;
          return (
            <Link
              key={tab}
              href={`/deals/${dealId}?tab=${tab}`}
              scroll={false}
              prefetch
              className={cn(
                "rounded-sm px-3 py-1.5 text-sm font-medium border",
                selected
                  ? "bg-white text-black border-black"
                  : "bg-[#1d6fb8] text-white border-white hover:bg-[#185c99]",
              )}
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
