// @ts-nocheck — leftover ops task board. Desk /tasks reads review_tasks.
import Link from "next/link";
import { setPipelineStage } from "@/app/actions/activities";
import { Button } from "@/components/ui/button";
import { kindClass, formatWhen } from "@/lib/activities/format";
import { TASK_PIPELINE_STAGES, pipelineLabel } from "@/lib/domain";
import type { Activity } from "@/lib/db/schema";

const NEXT: Record<string, string | null> = {
  todo: "doing",
  doing: "waiting",
  waiting: "done",
  done: null,
};
const PREV: Record<string, string | null> = {
  todo: null,
  doing: "todo",
  waiting: "doing",
  done: "waiting",
};

export function TaskBoard({
  tasks,
  returnTo = "/tasks?view=board",
}: {
  tasks: { activity: Activity; contact: { firstName: string; lastName: string } | null }[];
  returnTo?: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {TASK_PIPELINE_STAGES.map((stage) => {
        const col = tasks.filter((row) => (row.activity.pipelineStage || "todo") === stage);
        return (
          <section key={stage} className="ff-card min-h-48 overflow-hidden">
            <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-navy">
              {pipelineLabel(stage)} · {col.length}
            </div>
            <ul className="space-y-2 p-2">
              {col.length === 0 ? (
                <li className="px-2 py-6 text-base text-muted-foreground">Empty.</li>
              ) : (
                col.map(({ activity, contact }) => (
                  <li key={activity.id} className="rounded-md border border-border bg-background p-2">
                    <Link href={`/tasks/${activity.id}`} className="text-sm font-medium text-primary hover:underline">
                      {activity.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                      <span className={`rounded px-1.5 py-0.5 font-semibold ${kindClass(activity.kind)}`}>
                        {activity.kind}
                      </span>
                      <span className="text-muted-foreground">{formatWhen(activity.dueAt)}</span>
                    </div>
                    <div className="mt-1 text-base text-muted-foreground">
                      {contact ? `${contact.lastName}, ${contact.firstName}` : "Policy-only"}
                    </div>
                    <div className="mt-2 flex gap-1">
                      {PREV[stage] ? (
                        <form action={setPipelineStage}>
                          <input type="hidden" name="id" value={activity.id} />
                          <input type="hidden" name="pipelineStage" value={PREV[stage] ?? ""} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <Button type="submit" size="xs" variant="outline">
                            Back
                          </Button>
                        </form>
                      ) : null}
                      {NEXT[stage] ? (
                        <form action={setPipelineStage}>
                          <input type="hidden" name="id" value={activity.id} />
                          <input type="hidden" name="pipelineStage" value={NEXT[stage] ?? ""} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <Button type="submit" size="xs">
                            {NEXT[stage] === "done" ? "Complete" : "Advance"}
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
