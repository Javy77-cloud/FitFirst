import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ActivityForm } from "@/components/ops/activity-form";
import { buttonVariants } from "@/components/ui/button";
import { listActivities, listRelatedOptions } from "@/lib/db/ops-queries";
import { formatWhen, kindClass } from "@/lib/ops/calendar";
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

  return (
    <AppShell
      title="Tasks"
      actions={
        <Link href="/calendar?new=1&kind=task" className={cn(buttonVariants({ size: "sm" }))}>
          Open in calendar
        </Link>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Tasks, meetings, and calls are first-class records. Calendar is the home view; this list
        is for the desk queue.
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
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="ff-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-navy">Create</h2>
          <ActivityForm related={related} returnTo="/tasks" submitLabel="Save to calendar" />
        </section>
        <section className="ff-card overflow-hidden">
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nothing scheduled. Create a task or meeting — both land on the calendar.
            </p>
          ) : (
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>When</th>
                  <th>Assignee</th>
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
                    <td className="text-xs">{formatWhen(row)}</td>
                    <td>{row.assignee ?? "—"}</td>
                    <td className="capitalize">{row.status}</td>
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
