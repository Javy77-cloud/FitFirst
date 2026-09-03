import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ActivityForm } from "@/components/activities/activity-form";
import { buttonVariants } from "@/components/ui/button";
import { listActivities, listRelatedOptions } from "@/lib/db/activity-queries";
import { addDays, startOfLocalDay, whenForActivity } from "@/lib/activities/rules";
import { formatWhen, kindClass } from "@/lib/activities/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function monthCells(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfLocalDay(addDays(first, -first.getDay()));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const date = params.date ? new Date(String(params.date)) : new Date();
  const creating = params.new === "1";
  const [items, related] = await Promise.all([listActivities(), listRelatedOptions()]);
  const cells = monthCells(date);
  const monthLabel = date.toLocaleString("en-US", { month: "long", year: "numeric" });
  const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const toParam = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

  return (
    <AppShell
      title="Calendar"
      actions={
        <div className="flex gap-2">
          <Link href={`/calendar?date=${toParam(prev)}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Prev
          </Link>
          <Link href={`/calendar?date=${toParam(next)}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Next
          </Link>
          <Link href="/calendar?new=1" className={cn(buttonVariants({ size: "sm" }))}>
            New
          </Link>
        </div>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Desk work lives on this calendar. External Google/Zoho sync stays a stub on other slices.
      </p>
      {creating ? (
        <section className="mb-4 ff-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-navy">Schedule</h2>
          <ActivityForm
            related={related}
            returnTo="/calendar"
            defaults={{ kind: typeof params.kind === "string" ? params.kind : "meeting" }}
          />
        </section>
      ) : null}
      <div className="mb-2 text-sm font-semibold text-navy">{monthLabel}</div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-border bg-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-card px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((day) => {
          const dayStart = startOfLocalDay(day);
          const dayEnd = addDays(dayStart, 1);
          const onDay = items.filter((row) => {
            const when = whenForActivity(row.activity);
            return when && when >= dayStart && when < dayEnd;
          });
          const inMonth = day.getMonth() === date.getMonth();
          return (
            <div
              key={day.toISOString()}
              className={`min-h-24 bg-card p-1.5 ${inMonth ? "" : "opacity-50"}`}
            >
              <div className="text-[11px] text-muted-foreground">{day.getDate()}</div>
              <ul className="mt-1 space-y-1">
                {onDay.map(({ activity }) => (
                  <li key={activity.id}>
                    <Link
                      href={`/tasks/${activity.id}`}
                      className={`block truncate rounded px-1 py-0.5 text-[10px] font-medium ${kindClass(activity.kind)}`}
                    >
                      {activity.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <section className="mt-4 ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">Upcoming</div>
        <table className="ff-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th>Subject</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 12).map(({ activity }) => (
              <tr key={activity.id}>
                <td className="text-xs">{formatWhen(whenForActivity(activity))}</td>
                <td className="capitalize">{activity.kind}</td>
                <td>
                  <Link href={`/tasks/${activity.id}`} className="text-primary hover:underline">
                    {activity.title}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
