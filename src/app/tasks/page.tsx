import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { listDeskTaskRows } from "@/lib/db/queries";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { TASKS_LIST_COLUMNS } from "@/lib/list-columns";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { firstParam, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";
import { haystack } from "@/lib/search/live-query";
import { filterDeskTaskRows, mergeDeskTaskRows } from "@/lib/tasks/desk-list";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = pickFilterParams(params, ["status", "kind"]);
  const q = firstParam(params.q) ?? "";
  const { review, activities } = await listDeskTaskRows();
  const tasks = filterDeskTaskRows(mergeDeskTaskRows({ review, activities }), filter);
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
        searchPlaceholder="Contains task title…"
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
        <ModuleListActions
          module="tasks"
          recordIds={tasks.map((task) => task.id)}
          records={tasks.map((task) => ({
            id: task.id,
            label: task.title,
            taskSource: task.source,
          }))}
        >
        <DeskColumnTable
          moduleId="tasks"
          initialQuery={q}
          columns={TASKS_LIST_COLUMNS}
          empty="No open tasks."
          rows={tasks.map((task) => ({
            key: task.id,
            hay: haystack([task.title, task.status, task.kind]),
            cells: {
              pick: <SelectRowCheckbox id={task.id} />,
              task: (
                <Link href={`/tasks/${task.id}`} className="font-medium text-primary hover:underline">
                  {task.title}
                </Link>
              ),
              due: task.due.toISOString().slice(0, 10),
              status: task.status,
            },
          }))}
        />
        </ModuleListActions>
      </section>
    </AppShell>
  );
}
