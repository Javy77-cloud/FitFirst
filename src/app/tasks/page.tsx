import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ActivityForm } from "@/components/ops/activity-form";
import {
  ActivityStatusActions,
  AssignmentLinks,
  MoveDayForm,
} from "@/components/ops/activity-extras";
import { buttonVariants } from "@/components/ui/button";
import { listActivities, listRelatedOptions } from "@/lib/db/ops-queries";
import { TASK_PIPELINE, ACTIVITY_STATUS_LABELS } from "@/lib/domain";
import { formatWhen, kindClass } from "@/lib/ops/calendar";
import { normalizeActivityStatus } from "@/lib/ops/activity";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const kind = typeof params.kind === "string" ? params.kind : "";
  const [rows, related] = await Promise.all([listActivities(kind || undefined), listRelatedOptions()]);
  const tasks = rows.filter((r) => r.kind === "task");

  return (
    <AppShell
      title="Tasks"
      actions={
        <Link href="/calendar?new=1&kind=task" className={cn(buttonVariants({ size: "sm" }))}>
          Calendar view
        </Link>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        First-class <code>activities</code> records — not calendar-only. Assign each item to a
        contact and a policy. Same table the softphone agent should use. No second task model.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {[
          ["", "All"],
          ["task", "Tasks"],
          ["meeting", "Meetings"],
          ["call", "Calls"],
        ].map(([value, label]) => (
          <Link
            key={label}
            href={value ? `/tasks?kind=${value}` : "/tasks"}
            className={cn(buttonVariants({ size: "sm", variant: kind === value ? "default" : "outline" }))}
          >
            {label}
          </Link>
        ))}
      </div>

      {kind === "" || kind === "task" ? (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-navy">Task pipeline</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {TASK_PIPELINE.map((column) => {
              const cards = tasks.filter((t) => normalizeActivityStatus(t.status) === column);
              return (
                <div key={column} className="ff-card p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {ACTIVITY_STATUS_LABELS[column]} · {cards.length}
                  </div>
                  {cards.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Empty</p>
                  ) : (
                    <ul className="space-y-2">
                      {cards.map((task) => (
                        <li key={task.id} className="rounded-md border border-border p-2">
                          <Link href={`/calendar?activity=${task.id}`} className="text-sm font-medium text-navy hover:underline">
                            {task.title}
                          </Link>
                          <div className="mt-1 text-[11px] text-muted-foreground">{formatWhen(task)}</div>
                          <div className="mt-2">
                            <ActivityStatusActions activity={task} returnTo="/tasks" />
                          </div>
                          {column !== "moved" ? (
                            <div className="mt-2">
                              <MoveDayForm activityId={task.id} returnTo="/tasks" />
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="ff-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-navy">Create</h2>
          <ActivityForm related={related} returnTo="/tasks" submitLabel="Save activity" />
        </section>
        <section className="ff-card overflow-hidden">
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nothing yet. Create a task, meeting, or call — it lands on the contact, policy, and
              calendar.
            </p>
          ) : (
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Assigned</th>
                  <th>When</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${kindClass(row.kind)}`}>
                        {row.kind}
                      </span>
                    </td>
                    <td>
                      <Link href={`/calendar?activity=${row.id}`} className="font-medium text-primary hover:underline">
                        {row.title}
                      </Link>
                    </td>
                    <td>
                      <AssignmentLinks
                        contactId={row.contactId}
                        policyId={row.policyId}
                        dealId={row.dealId}
                      />
                    </td>
                    <td className="text-xs">{formatWhen(row)}</td>
                    <td>{ACTIVITY_STATUS_LABELS[normalizeActivityStatus(row.status)]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AppShell>
  );
}
