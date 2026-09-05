import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  COMMISSION_STATUS_TAB_LABEL,
  COMMISSION_STATUS_TABS,
  commissionsHref,
  type CommissionStatusTab,
} from "@/lib/commissions/filters";
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
    <div className="mb-4 flex flex-wrap gap-1" role="tablist" aria-label="Commission status">
      {COMMISSION_STATUS_TABS.map((value) => (
        <Link
          key={value}
          href={commissionsHref({ status: value, family, sub, range })}
          className={cn(buttonVariants({ size: "sm", variant: status === value ? "default" : "outline" }))}
          aria-current={status === value ? "page" : undefined}
        >
          {value === "all" ? allLabel : COMMISSION_STATUS_TAB_LABEL[value]}
          <span className="ml-1 text-[11px] opacity-80">{counts[value]}</span>
        </Link>
      ))}
    </div>
  );
}
