"use client";

import { useEffect, useMemo, useState } from "react";
import { createDeskTask } from "@/app/actions/alerts";
import {
  listDeskAssignees,
  searchTaskRecords,
  type TaskRecordHit,
} from "@/app/actions/task-records";
import { FieldControl } from "@/components/custom-fields/field-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  defaultFieldsForModule,
  defaultLayoutForModule,
} from "@/lib/custom-fields/modules";
import { resolveLayoutFields } from "@/lib/custom-fields/resolve-layout";
import {
  allLayoutFieldKeys,
  parseLayout,
  type CustomFieldDef,
  type FieldLayout,
} from "@/lib/custom-fields/types";
import {
  DESK_TASK_TYPES,
  DESK_TASK_TYPE_LABELS,
  TASK_RECORD_TYPES,
  TASK_RECORD_TYPE_LABELS,
  composeDeskTaskTitle,
  deskTaskTypeTitle,
  type DeskTaskType,
  type TaskRecordType,
} from "@/lib/tasks/task-types";
import { etTodayDateKey } from "@/lib/time/et";

/** Layout keys with locked special UX — never FieldControl. */
const SPECIAL_LAYOUT_KEYS = new Set([
  "record_type",
  "linked_record",
  "task_type",
  "title",
]);

export type CreateTaskFormDefaults = {
  recordType?: TaskRecordType;
  recordId?: string;
  recordName?: string;
  contactId?: string | null;
  accountId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  leadId?: string | null;
  taskType?: DeskTaskType;
  dueDate?: string;
  dueTime?: string;
  assigneeId?: string;
  returnTo?: string;
  /** When set, title is this notice label instead of the task-type label. */
  fixedTitle?: string;
  noticeType?: string;
  noticeProduct?: string;
  /** Family type labels to persist when this notice task is the first create. */
  noticeTypeLabels?: readonly string[];
  noticeFamily?: "pc" | "life" | "health";
  noticePicklistId?: string | null;
};

function ensureTaskFieldOptions(fields: readonly CustomFieldDef[]): CustomFieldDef[] {
  return fields.map((field) => {
    if (field.key !== "status") return field;
    if (field.options && field.options.length > 0) return field;
    return { ...field, options: ["open", "done"] };
  });
}

/** Sitewide Create Task — layout-driven.
 * Locked specials: Record type → Linked record → Task type → Title (title immediately under type).
 * lockRecord: Task type → Title → remaining layout fields.
 * Remaining layout keys (due_date, status, priority, assignee, tags, notes, customs) use
 * special mappings for due/assignee; everything else FieldControl — new layout fields appear automatically.
 */
export function CreateTaskForm({
  users: usersProp,
  defaults,
  submitLabel = "Save task",
  compact = false,
  lockRecord = false,
  layout: layoutProp,
  fields: fieldsProp,
  currentUserId,
}: {
  users?: { id: string; name: string }[];
  defaults?: CreateTaskFormDefaults;
  submitLabel?: string;
  compact?: boolean;
  /** When true (Quick Comms / record page), hide record type + search — record already linked. */
  lockRecord?: boolean;
  /** Tasks Edit Layout — source of truth for which fields appear. */
  layout?: FieldLayout;
  fields?: CustomFieldDef[];
  /** Signed-in agent — default assignee when defaults.assigneeId is unset. */
  currentUserId?: string | null;
}) {
  const layout = useMemo(
    () => parseLayout(layoutProp ?? defaultLayoutForModule("tasks")),
    [layoutProp],
  );
  const fieldList = useMemo(() => {
    const base = ensureTaskFieldOptions(
      fieldsProp ?? defaultFieldsForModule("tasks"),
    );
    return ensureTaskFieldOptions(resolveLayoutFields(layout, base));
  }, [fieldsProp, layout]);
  const byKey = useMemo(
    () => Object.fromEntries(fieldList.map((field) => [field.key, field])),
    [fieldList],
  );
  /** Layout order minus specials already rendered above. */
  const remainingKeys = useMemo(
    () => allLayoutFieldKeys(layout).filter((key) => !SPECIAL_LAYOUT_KEYS.has(key)),
    [layout],
  );

  const [recordType, setRecordType] = useState<TaskRecordType>(
    defaults?.recordType ?? "contact",
  );
  const [query, setQuery] = useState(defaults?.recordName ?? "");
  const [hits, setHits] = useState<TaskRecordHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<TaskRecordHit | null>(
    defaults?.recordId
      ? {
          recordType: defaults.recordType ?? "contact",
          id: defaults.recordId,
          name: defaults.recordName ?? "Selected record",
          contactId: defaults.contactId ?? null,
          accountId: defaults.accountId ?? null,
          dealId: defaults.dealId ?? null,
          policyId: defaults.policyId ?? null,
          leadId: defaults.leadId ?? null,
        }
      : null,
  );
  const [users, setUsers] = useState<{ id: string; name: string }[]>(usersProp ?? []);
  const [sessionUserId, setSessionUserId] = useState<string | null>(currentUserId ?? null);
  const [taskType, setTaskType] = useState<DeskTaskType>(defaults?.taskType ?? "work_reminder");
  const [notes, setNotes] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const titleLeft = useMemo(
    () => defaults?.fixedTitle ?? deskTaskTypeTitle(taskType),
    [defaults?.fixedTitle, taskType],
  );
  const composed = useMemo(() => {
    if (defaults?.fixedTitle) {
      const extra = notes.trim();
      return extra ? `${defaults.fixedTitle} — ${extra}` : defaults.fixedTitle;
    }
    return composeDeskTaskTitle(taskType, notes);
  }, [defaults?.fixedTitle, taskType, notes]);

  // Default to *today* Eastern — never tomorrow, never toISOString().slice (UTC off-by-one).
  const defaultDue = defaults?.dueDate ?? etTodayDateKey();
  const defaultDueTime = defaults?.dueTime ?? "";

  useEffect(() => {
    if (currentUserId) setSessionUserId(currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    if (usersProp && usersProp.length > 0) {
      setUsers(usersProp);
      return;
    }
    void listDeskAssignees().then((result) => {
      setUsers(result.users);
      if (result.currentUserId) setSessionUserId(result.currentUserId);
    });
  }, [usersProp]);

  useEffect(() => {
    if (picked || lockRecord) return;
    const q = query.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setBusy(true);
      void searchTaskRecords(recordType, q)
        .then((rows) => setHits(rows))
        .finally(() => setBusy(false));
    }, 160);
    return () => window.clearTimeout(handle);
  }, [query, recordType, picked, lockRecord]);

  function clearPick() {
    setPicked(null);
    setQuery("");
    setHits([]);
  }

  function renderRemainingField(key: string) {
    const field = byKey[key] ?? {
      key,
      label: key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      type: "single_line" as const,
    };

    if (key === "due_date") {
      return (
        <div key={key} data-ff-task-layout-field={key} className="space-y-2">
          <div>
            <Label htmlFor="ff-task-due" className="text-xs">
              {field.label || "Due date"}
            </Label>
            <Input
              id="ff-task-due"
              name="dueDate"
              type="date"
              required
              className="mt-1 h-8"
              defaultValue={defaultDue}
            />
          </div>
          <div>
            <Label htmlFor="ff-task-due-time" className="text-xs">
              Due time
            </Label>
            <Input
              id="ff-task-due-time"
              name="dueTime"
              type="time"
              className="mt-1 h-8"
              defaultValue={defaultDueTime}
            />
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              America/New_York. Blank time = 11:59 PM Eastern.
            </p>
          </div>
        </div>
      );
    }

    if (key === "assignee") {
      return (
        <div key={key} data-ff-task-layout-field={key}>
          <Label htmlFor="ff-task-assignee" className="text-xs">
            {field.label || "Assignee"}
          </Label>
          <select
            id="ff-task-assignee"
            name="assigneeId"
            required
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue={defaults?.assigneeId ?? currentUserId ?? sessionUserId ?? users[0]?.id ?? ""}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div key={key} className="space-y-1" data-ff-task-layout-field={key}>
        <Label htmlFor={`field_${key}`} className="text-xs">
          {field.label}
        </Label>
        <FieldControl
          field={field}
          value={fieldValues[key] ?? ""}
          values={fieldValues}
          name={`field_${key}`}
          onMultiSelectChange={(joined) =>
            setFieldValues((prev) => ({ ...prev, [key]: joined }))
          }
        />
      </div>
    );
  }

  return (
    <form
      action={createDeskTask}
      className={compact ? "space-y-3" : "ff-card max-w-xl space-y-3 p-4"}
      data-ff-create-task-form=""
      data-ff-task-layout-driven="1"
    >
      <input type="hidden" name="title" value={composed} />
      <input type="hidden" name="kind" value={taskType} />
      <input type="hidden" name="titleNotes" value={notes} />
      <input type="hidden" name="recordType" value={recordType} />
      <input type="hidden" name="recordId" value={picked?.id ?? ""} />
      <input type="hidden" name="contactId" value={picked?.contactId ?? ""} />
      <input type="hidden" name="accountId" value={picked?.accountId ?? ""} />
      <input type="hidden" name="dealId" value={picked?.dealId ?? ""} />
      <input type="hidden" name="policyId" value={picked?.policyId ?? ""} />
      <input type="hidden" name="leadId" value={picked?.leadId ?? ""} />
      {defaults?.returnTo ? <input type="hidden" name="returnTo" value={defaults.returnTo} /> : null}
      {defaults?.noticeType ? <input type="hidden" name="noticeType" value={defaults.noticeType} /> : null}
      {defaults?.noticeProduct ? (
        <input type="hidden" name="noticeProduct" value={defaults.noticeProduct} />
      ) : null}
      {defaults?.noticeFamily ? <input type="hidden" name="noticeFamily" value={defaults.noticeFamily} /> : null}
      {defaults?.noticePicklistId ? (
        <input type="hidden" name="noticePicklistId" value={defaults.noticePicklistId} />
      ) : null}
      {defaults?.noticeTypeLabels?.map((label) => (
        <input key={label} type="hidden" name="noticeTypeLabels" value={label} />
      ))}

      {/* HARD LOCK order: Record type → Linked → Task type → Title (title right under type). */}
      {!lockRecord ? (
        <>
          <div data-ff-task-special="record_type">
            <Label htmlFor="ff-task-record-type" className="text-xs">
              Record type
            </Label>
            <select
              id="ff-task-record-type"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              value={recordType}
              onChange={(e) => {
                setRecordType(e.target.value as TaskRecordType);
                clearPick();
              }}
              data-ff-task-record-type=""
            >
              {TASK_RECORD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TASK_RECORD_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div data-ff-task-special="linked_record">
            <Label htmlFor="ff-task-record-search" className="text-xs">
              Linked record
            </Label>
            {picked ? (
              <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy">
                  {picked.name}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-xs text-primary hover:underline"
                  onClick={clearPick}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <Input
                  id="ff-task-record-search"
                  className="mt-1 h-8"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${TASK_RECORD_TYPE_LABELS[recordType].toLowerCase()}s…`}
                  autoComplete="off"
                  data-ff-task-record-search=""
                />
                {busy ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">Searching…</p>
                ) : null}
                {hits.length > 0 ? (
                  <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto rounded-md border border-border bg-card p-1">
                    {hits.map((hit) => (
                      <li key={`${hit.recordType}-${hit.id}`}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted"
                          onClick={() => {
                            setPicked(hit);
                            setQuery(hit.name);
                            setHits([]);
                          }}
                        >
                          <span className="font-medium text-navy">{hit.name}</span>
                          <span className="shrink-0 uppercase text-[10px] text-muted-foreground">
                            {TASK_RECORD_TYPE_LABELS[hit.recordType]}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : query.trim().length >= 1 && !busy ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">No match.</p>
                ) : null}
              </>
            )}
          </div>
        </>
      ) : picked ? (
        <p className="text-xs text-muted-foreground">
          Linked: <span className="font-medium text-navy">{picked.name}</span>
        </p>
      ) : null}

      {/* Task type FIRST among type/title; Title IMMEDIATELY underneath — no fields between. */}
      <div data-ff-task-special="task_type">
        <Label htmlFor="ff-task-type" className="text-xs">
          Task type
        </Label>
        <select
          id="ff-task-type"
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          value={taskType}
          onChange={(e) => setTaskType(e.target.value as DeskTaskType)}
          data-ff-task-type=""
        >
          {DESK_TASK_TYPES.map((type) => (
            <option key={type} value={type}>
              {DESK_TASK_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div data-ff-task-special="title">
        <Label className="text-xs">Title</Label>
        <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            readOnly
            value={titleLeft}
            className="h-8 bg-muted/50"
            aria-label="Title from task type"
            data-ff-task-title-type=""
          />
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-8"
            placeholder="Optional notes"
            aria-label="Optional title notes"
            data-ff-task-title-notes=""
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {defaults?.fixedTitle
            ? "Titled from the notice. Add optional notes on the right. Day, time, and snooze are this task reminder."
            : "Fills from Task type. Add optional notes on the right."}
        </p>
      </div>

      {/* Remaining layout fields in Edit Layout order (due, status, priority, assignee, tags, notes, customs). */}
      <div className="space-y-3" data-ff-task-layout-remaining="">
        {remainingKeys.map((key) => renderRemainingField(key))}
      </div>

      <Button
        type="submit"
        size="sm"
        className="bg-[#002868] text-white hover:bg-[#BF0A30] hover:text-white"
        style={{ backgroundColor: "#002868", color: "#ffffff" }}
        disabled={!picked}
        data-ff-task-save=""
      >
        {submitLabel}
      </Button>
      {!picked ? (
        <p className="text-[11px] text-muted-foreground">Pick a linked record to save.</p>
      ) : null}
    </form>
  );
}
