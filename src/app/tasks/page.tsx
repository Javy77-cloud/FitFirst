import type { ReactNode } from "react";
import Link from "next/link";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { currentDeskSession } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
import { listDeskTaskRows, listUsers } from "@/lib/db/queries";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { tasksListColumnsFromLayout } from "@/lib/list-columns";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { PipelineFilterPopover } from "@/components/filters/pipeline-filter-popover";
import { firstParam, pickFilterParams } from "@/lib/saved-filters";
import { haystack } from "@/lib/search/live-query";
import {
  groupDeskTaskRows,
  mergeDeskTaskRows,
  recordTypeLabel,
  taskTypeLabel,
} from "@/lib/tasks/desk-list";
import { loadTaskLinkedNames } from "@/lib/tasks/linked-names";
import { DESK_TASK_TYPE_LABELS, taskDueBucket } from "@/lib/tasks/task-types";
import { TasksGroupBySelect } from "@/components/tasks/group-by-select";
import { formatDay } from "@/lib/domain";
import { listFieldDefs, loadLayoutForModule, loadRecordValuesForIds } from "@/lib/custom-fields/store";
import { defaultFieldsForModule, defaultLayoutForModule } from "@/lib/custom-fields/modules";
import {
  enabledPageFilters,
  filterFieldsFromPageFilters,
  PAGE_FILTER_SEARCH_CLASS,
  PAGE_FILTER_SEARCH_INPUT_CLASS,
  mergeLiveOptions,
  matchesPageFilters,
  pageFilterParamKeys,
} from "@/lib/page-filters";
import { loadPageFilterPrefs } from "@/lib/page-filters/store";
import { listModuleTags } from "@/app/actions/record-tags";
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { ManageTagsButton } from "@/components/tags/manage-tags-button";
import { normalizeTags, tagSortText } from "@/lib/tags/module-tags";

export const dynamic = "force-dynamic";

/**
 * Sitewide CRM list chrome: ONE Actions bar for the whole page (not one per group),
 * Manage tags (when TagModule) + New record on the toolbar row.
 */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q) ?? "";
  const groupBy = firstParam(params.groupBy) ?? "policy";
  const openNewTask = firstParam(params.newTask) === "1";
  const [taskLayout, taskFields, session, pageFilters, tagCatalog, users] = await Promise.all([
    loadLayoutForModule("tasks").catch(() => defaultLayoutForModule("tasks")),
    listFieldDefs("tasks").catch(() => defaultFieldsForModule("tasks")),
    currentDeskSession(),
    loadPageFilterPrefs("tasks"),
    listModuleTags("tasks").catch(() => []),
    listUsers().catch(() => []),
  ]);
  const taskColumns = tasksListColumnsFromLayout(taskLayout, taskFields);
  const { review, activities } = await listDeskTaskRows();

  const names = await loadTaskLinkedNames({
    contactIds: [
      ...review.map((row) => row.contactId ?? ""),
      ...activities.map((row) => row.contactId ?? ""),
    ],
    accountIds: [
      ...review.map((row) => row.accountId ?? ""),
      ...activities.map((row) => row.accountId ?? ""),
    ],
    policyIds: [
      ...review.map((row) => row.policyId ?? ""),
      ...activities.map((row) => row.policyId ?? ""),
    ],
    dealIds: [
      ...review.map((row) => row.dealId ?? ""),
      ...activities.map((row) => row.dealId ?? ""),
    ],
    leadIds: [...review.map((row) => row.leadId ?? ""), ...activities.map((row) => row.leadId ?? "")],
  });

  const allTasks = mergeDeskTaskRows({ review, activities, names });
  const customById = await loadRecordValuesForIds(
    allTasks.map((row) => row.id),
    "tasks",
  ).catch(() => new Map<string, Record<string, string>>());

  const userNameById = new Map(users.map((user) => [user.id, user.name]));

  const visibleFilters = mergeLiveOptions(enabledPageFilters(pageFilters), {
    status: allTasks.map((task) => task.status),
    kind: allTasks.map((task) => task.kind),
    due: allTasks.map((task) => taskDueBucket(task.due)),
    assignee: allTasks.map((task) => task.assigneeId ?? ""),
    priority: allTasks.map((task) => customById.get(task.id)?.priority ?? ""),
    tags: allTasks.flatMap((task) => normalizeTags(task.tags)),
  });
  // Prefer labeled task-type + assignee options when we know them.
  for (const filter of visibleFilters) {
    if (filter.fieldKey === "kind") {
      filter.options = Object.entries(DESK_TASK_TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
        color: null,
      }));
    }
    if (filter.fieldKey === "assignee") {
      const ids = [...new Set(allTasks.map((task) => task.assigneeId).filter(Boolean))] as string[];
      filter.options = ids.map((id) => ({
        value: id,
        label: userNameById.get(id) ?? id,
        color: null,
      }));
    }
    if (filter.fieldKey === "tags" && tagCatalog.length) {
      filter.options = tagCatalog.map((row) => ({
        value: row.name,
        label: row.name,
        color: row.color,
      }));
    }
  }

  const filter = pickFilterParams(params, pageFilterParamKeys(visibleFilters));
  const tasks = allTasks.filter((task) => {
    const custom = customById.get(task.id) ?? {};
    return matchesPageFilters(
      {
        status: task.status,
        kind: task.kind,
        due: taskDueBucket(task.due),
        assignee: task.assigneeId ?? "",
        priority: custom.priority ?? "",
        tags: normalizeTags(task.tags),
        taskType: task.kind,
        recordType: task.recordType ?? "",
        ...custom,
      },
      filter,
    );
  });
  const sections = groupDeskTaskRows(tasks, groupBy);
  const allRecordIds = tasks.map((task) => task.id);
  const allRecords = tasks.map((task) => ({
    id: task.id,
    label: task.title,
    taskSource: task.source,
  }));

  function recordHref(task: (typeof tasks)[number]): string | null {
    if (task.policyId) return `/policies/${task.policyId}`;
    if (task.dealId) return `/deals/${task.dealId}`;
    if (task.contactId) return `/contacts/${task.contactId}`;
    if (task.accountId) return `/businesses/${task.accountId}`;
    if (task.leadId) return `/leads/${task.leadId}`;
    return null;
  }

  return (
    <AppShell title="Tasks">
      <p className="mb-3 text-base text-muted-foreground">
        Desk tasks linked to contacts, deals, policies, businesses, and leads. Group by policy,
        task type, or due date.
      </p>
      <PipelineFilterPopover
        moduleId="tasks"
        fields={filterFieldsFromPageFilters(visibleFilters)}
        searchPlaceholder="Contains task title…"
        preserveParams={["groupBy"]}
        canConfigure={session.isAdmin}
        searchClassName={PAGE_FILTER_SEARCH_CLASS}
        searchInputClassName={PAGE_FILTER_SEARCH_INPUT_CLASS}
      />

      <div
        className="mb-3 flex flex-wrap items-center justify-between gap-2"
        data-ff-tasks-toolbar=""
      >
        <TasksGroupBySelect value={groupBy} />
      </div>

      <section className="ff-card overflow-hidden" data-ff-tasks-list="">
        <div
          className="flex items-center justify-between gap-2 border-b border-border px-3 py-2"
          data-ff-tasks-list-actions=""
        >
          <ManageTagsButton module="tasks" />
          <CreateTaskDialog
            defaultOpen={openNewTask}
            layout={taskLayout}
            fields={taskFields}
            currentUserId={session.userId}
            defaults={{ assigneeId: session.userId ?? undefined }}
          />
        </div>

        {/* ONE Actions bar + ONE DeskColumnTable — group headers share column widths. */}
        <ModuleListActions module="tasks" recordIds={allRecordIds} records={allRecords}>
          {sections.length === 0 ? (
            <p className="px-3 py-8 text-sm text-muted-foreground">No open tasks.</p>
          ) : (
            <DeskColumnTable
              moduleId="tasks"
              initialQuery={q}
              columns={taskColumns}
              empty="No open tasks."
              rows={sections.flatMap((section) => {
                const header = {
                  key: `group:${section.key}`,
                  groupHeader: `${section.label} · ${section.rows.length}`,
                  cells: {} as Record<string, ReactNode>,
                };
                const dataRows = section.rows.map((task) => {
                  const href = recordHref(task);
                  const custom = customById.get(task.id) ?? {};
                  const tags = normalizeTags(task.tags);
                  const layoutCells: Record<string, ReactNode> = {};
                  for (const column of taskColumns) {
                    if (
                      column.id === "pick" ||
                      column.id === "task" ||
                      column.id === "record" ||
                      column.id === "recordType" ||
                      column.id === "taskType" ||
                      column.id === "due" ||
                      column.id === "status" ||
                      column.id === "tags"
                    ) {
                      continue;
                    }
                    if (column.id === "priority") {
                      layoutCells.priority = custom.priority || "—";
                      continue;
                    }
                    if (column.id === "assignee") {
                      layoutCells.assignee = task.assigneeId
                        ? userNameById.get(task.assigneeId) ?? task.assigneeId
                        : "—";
                      continue;
                    }
                    const raw = custom[column.id];
                    layoutCells[column.id] = raw?.trim() ? raw : "—";
                  }
                  return {
                    key: task.id,
                    id: task.id,
                    hay: haystack([
                      task.title,
                      task.status,
                      task.kind,
                      task.recordName,
                      task.recordNumber,
                      task.recordType,
                      custom.priority,
                      ...tags,
                    ]),
                    sort: {
                      tags: tagSortText(tags),
                      priority: custom.priority ?? "",
                      task: task.title,
                      record: task.recordName ?? "",
                      recordType: recordTypeLabel(task.recordType),
                      taskType: taskTypeLabel(task.kind),
                      due: task.due.getTime(),
                      status: task.status,
                    },
                    cells: {
                      pick: <SelectRowCheckbox id={task.id} />,
                      task: (
                        <div className="min-w-0">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {task.title}
                          </Link>
                          {task.recordType === "policy" && task.recordNumber ? (
                            <div className="truncate text-xs text-muted-foreground tabular-nums">
                              {task.recordNumber}
                            </div>
                          ) : null}
                        </div>
                      ),
                      record: href ? (
                        <Link href={href} className="text-primary hover:underline">
                          {task.recordName || "Open record"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{task.recordName || "—"}</span>
                      ),
                      recordType: recordTypeLabel(task.recordType),
                      taskType: taskTypeLabel(task.kind),
                      due: formatDay(task.due),
                      status: task.status,
                      tags: (
                        <AssignRecordTags
                          module="tasks"
                          recordId={task.id}
                          tags={tags}
                          catalog={tagCatalog}
                        />
                      ),
                      ...layoutCells,
                    },
                  };
                });
                return [header, ...dataRows];
              })}
            />
          )}
        </ModuleListActions>
      </section>
    </AppShell>
  );
}
