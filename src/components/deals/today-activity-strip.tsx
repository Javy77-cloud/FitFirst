import Link from "next/link";
import {
  DEAL_TODAY_ACTIVITY_CHIPS,
  todayActivityWorkHref,
  type DealTodayActivityType,
} from "@/lib/deals/pipeline-desk";

export function TodayActivityStrip({
  counts,
  active,
}: {
  counts: Record<DealTodayActivityType, number>;
  active?: DealTodayActivityType | null;
}) {
  return (
    <aside
      className="flex min-h-[5.5rem] flex-col justify-center rounded-md border border-border bg-card px-3 py-2"
      data-testid="deal-today-activity"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Today&apos;s activity
      </p>
      <div className="mt-2 flex flex-nowrap items-center gap-1 overflow-x-auto">
        {DEAL_TODAY_ACTIVITY_CHIPS.map((chip) => {
          const on = active === chip.id;
          return (
            <Link
              key={chip.id}
              href={todayActivityWorkHref(chip.id)}
              className={
                on
                  ? "inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground"
                  : "inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-navy hover:border-primary"
              }
              data-testid={`deal-today-${chip.id}`}
            >
              <span>{chip.label}</span>
              <span className="tabular-nums">{counts[chip.id]}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
