import Link from "next/link";
import {
  COMMISSION_STATUS_TAB_LABEL,
  COMMISSION_STATUS_TABS,
  commissionsHref,
  type CommissionStatusTab,
} from "@/lib/commissions/filters";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
import { cn } from "@/lib/utils";

export function CommissionStatusTabs({
  status,
  family,
  sub,
  range,
  counts,
  allLabel = "My commissions",
}: {
  status: CommissionStatusTab;
  family?: string;
  sub?: string;
  range?: string;
  counts: Record<CommissionStatusTab, number>;
  allLabel?: string;
}) {
  return (
    <div className={cn("mb-4", FF_CHIP_TAB_GROUP)} role="tablist" aria-label="Commission status">
      {COMMISSION_STATUS_TABS.map((value) => {
        const selected = status === value;
        return (
          <Link
            key={value}
            href={commissionsHref({ status: value, family, sub, range })}
            className={chipTabClass(selected)}
            role="tab"
            aria-selected={selected}
            aria-current={selected ? "page" : undefined}
            data-active={selected ? "true" : "false"}
          >
            {value === "all" ? allLabel : COMMISSION_STATUS_TAB_LABEL[value]}
            <span className="ml-1 text-[11px] opacity-80">{counts[value]}</span>
          </Link>
        );
      })}
    </div>
  );
}
