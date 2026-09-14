import Link from "next/link";
import {
  AGENT_POLICY_TAB_LABELS,
  type AgentPolicyTab,
} from "@/lib/policy/tabs";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
import { cn } from "@/lib/utils";

export function PolicyTabsNav({
  policyId,
  active,
  tabs,
}: {
  policyId: string;
  active: AgentPolicyTab;
  tabs: AgentPolicyTab[];
}) {
  return (
    <nav
      aria-label="Policy sections"
      className={cn(FF_CHIP_TAB_GROUP, "flex-nowrap overflow-x-auto pb-0.5")}
      data-ff-policy-chip-tabs=""
    >
      {tabs.map((tab) => {
        const selected = tab === active;
        return (
          <Link
            key={tab}
            href={`/policies/${policyId}?tab=${tab}`}
            scroll={false}
            prefetch
            role="tab"
            aria-selected={selected}
            data-active={selected ? "true" : "false"}
            className={chipTabClass(selected, "shrink-0 whitespace-nowrap")}
          >
            {AGENT_POLICY_TAB_LABELS[tab]}
          </Link>
        );
      })}
    </nav>
  );
}
