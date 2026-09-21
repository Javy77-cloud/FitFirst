import Link from "next/link";
import { LEADS_VIEW_OPTIONS, leadsDeskHref, type LeadsViewId } from "@/lib/leads/lead-desk";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";

export function LeadsViewSwitch({
  view,
  searchParams,
}: {
  view: LeadsViewId;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <span className={FF_CHIP_TAB_GROUP} data-ff-leads-views="" aria-label="Stack Queue List">
      {LEADS_VIEW_OPTIONS.map(([id, label]) => (
        <Link
          key={id}
          href={leadsDeskHref(id, searchParams)}
          className={chipTabClass(view === id)}
          data-active={view === id ? "true" : "false"}
        >
          {label}
        </Link>
      ))}
    </span>
  );
}
