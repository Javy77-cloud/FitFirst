import Link from "next/link";
import { DEAL_TODAY_ACTIVITY_CHIPS, type DealActivityTouch, type DealTodayActivityType } from "@/lib/deals/pipeline-desk";
import { whenForActivity } from "@/lib/activities/rules";

export function DealWorkQueuePanel({
  type,
  items,
}: {
  type: DealTodayActivityType;
  items: DealActivityTouch[];
}) {
  const chip = DEAL_TODAY_ACTIVITY_CHIPS.find((row) => row.id === type);
  return (
    <section className="mb-4 rounded-md border border-border bg-card p-3" data-testid="deal-work-queue">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-navy">Work queue · {chip?.label ?? type}</h2>
        <Link href="/deals" className="text-xs text-primary hover:underline">
          Close queue
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing of this type is due today.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((item) => {
            const when = whenForActivity(item);
            return (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-navy">{item.title}</span>
                <span className="text-xs text-muted-foreground">
                  {when ? when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Due today"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
