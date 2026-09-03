// @ts-nocheck — leftover ops timeline. Desk 360 uses components/activity-timeline.tsx.
import Link from "next/link";
import { formatWhen, kindClass, statusLabel } from "@/lib/activities/format";
import type { Activity, ClientHistory, Policy } from "@/lib/db/schema";

export function ActivityTimeline({
  rows,
  empty = "No activity on this record yet.",
}: {
  rows: { history: ClientHistory; activity: Activity | null; policy: Policy | null }[];
  empty?: string;
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ol className="divide-y divide-border">
      {rows.map(({ history, activity, policy }) => (
        <li key={history.id} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${kindClass(history.eventType)}`}>
              {history.eventType}
            </span>
            {activity ? (
              <Link href={`/tasks/${activity.id}`} className="text-sm font-medium text-primary hover:underline">
                {activity.title}
              </Link>
            ) : (
              <span className="text-sm font-medium">{history.body.slice(0, 80)}</span>
            )}
            {activity ? (
              <span className="text-[11px] capitalize text-muted-foreground">
                {statusLabel(activity.status)}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-foreground/90">{history.body}</p>
          <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span>{formatWhen(history.occurredAt)}</span>
            {policy ? (
              <Link href={`/policies/${policy.id}`} className="hover:underline">
                {policy.policyNumber}
              </Link>
            ) : null}
            {activity?.durationSeconds != null ? <span>{activity.durationSeconds}s logged</span> : null}
            {activity?.outcome ? <span className="capitalize">{activity.outcome.replaceAll("_", " ")}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function TimelineFilters({
  action,
  policies,
}: {
  action: string;
  policies: { id: string; policyNumber: string }[];
}) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-2 px-4 py-3">
      <select name="type" className="h-8 rounded-md border border-input bg-card px-2 text-xs">
        <option value="">All types</option>
        <option value="task">Task</option>
        <option value="meeting">Meeting</option>
        <option value="call">Call</option>
        <option value="note">Note</option>
      </select>
      <select name="status" className="h-8 rounded-md border border-input bg-card px-2 text-xs">
        <option value="">All statuses</option>
        <option value="incomplete">Incomplete</option>
        <option value="in_progress">In progress</option>
        <option value="completed">Completed</option>
        <option value="canceled">Canceled</option>
      </select>
      <input type="date" name="from" className="h-8 rounded-md border border-input bg-card px-2 text-xs" />
      <input type="date" name="to" className="h-8 rounded-md border border-input bg-card px-2 text-xs" />
      <select name="policyId" className="h-8 rounded-md border border-input bg-card px-2 text-xs">
        <option value="">Any policy</option>
        {policies.map((p) => (
          <option key={p.id} value={p.id}>
            {p.policyNumber}
          </option>
        ))}
      </select>
      <button type="submit" className="h-8 rounded-md bg-primary px-2.5 text-xs text-primary-foreground">
        Filter
      </button>
    </form>
  );
}
