import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { listReviewTasks } from "@/lib/db/queries";
import { ColumnTable } from "@/components/lists/column-table";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { pickFilterParams, uniqueOptions } from "@/lib/saved-filters";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filter = pickFilterParams(await searchParams, ["status", "kind"]);
  const tasks = await listReviewTasks(filter);
  return (
    <AppShell
      title="Tasks"
      actions={
        <Link href="/tasks/new" className="text-sm font-medium text-primary hover:underline">
          New task
        </Link>
      }
    >
      <p className="mb-3 text-base text-muted-foreground">
        Desk 30/60/90 and review tasks. Activity timeline on Contact and Policy still owns
        task/call logs assigned to those records.
      </p>
      <SavedFiltersBar
        moduleId="tasks"
        fields={[
          {
            key: "status",
            label: "Status",
            options: uniqueOptions(
              tasks.map((task) => task.status),
              [
                { value: "open", label: "open" },
                { value: "done", label: "done" },
                { value: "completed", label: "completed" },
              ],
            ),
          },
          {
            key: "kind",
            label: "Kind",
            options: uniqueOptions(tasks.map((task) => task.kind)),
          },
        ]}
      />
      <section className="ff-card overflow-hidden">
        <ModuleListActions module="tasks" recordIds={tasks.map((task) => task.id)}>
        <ColumnTable
          moduleId="tasks"
          columns={[
            { id: "pick", label: "", locked: true },
            { id: "task", label: "Task", locked: true },
            { id: "due", label: "Due" },
            { id: "status", label: "Status" },
          ]}
          empty="No open review tasks."
          rows={tasks.map((task) => ({
            key: task.id,
            cells: {
              pick: <SelectRowCheckbox id={task.id} />,
              task: (
                <Link href={`/tasks/${task.id}`} className="font-medium text-primary hover:underline">
                  {task.title}
                </Link>
              ),
              due: task.dueDate.toISOString().slice(0, 10),
              status: task.status,
            },
          }))}
        />
        </ModuleListActions>
      </section>
    </AppShell>
  );
}
