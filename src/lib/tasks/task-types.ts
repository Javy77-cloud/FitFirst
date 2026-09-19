/** Desk Create Task — Task type options (stored in review_tasks.kind). */

export const TASK_RECORD_TYPES = [
  "contact",
  "deal",
  "policy",
  "business",
  "lead",
] as const;

export type TaskRecordType = (typeof TASK_RECORD_TYPES)[number];

export const TASK_RECORD_TYPE_LABELS: Record<TaskRecordType, string> = {
  contact: "Contact",
  deal: "Deal",
  policy: "Policy",
  business: "Account",
  lead: "Lead",
};

export const DESK_TASK_TYPES = [
  "30_day",
  "60_day",
  "90_day",
  "work_reminder",
  "renewal_followup",
  "document_collection",
  "inspection_scheduling",
  "endorsement_request",
  "claim_followup",
  "policy_review",
] as const;

export type DeskTaskType = (typeof DESK_TASK_TYPES)[number];

export const DESK_TASK_TYPE_LABELS: Record<DeskTaskType, string> = {
  "30_day": "30-day notice",
  "60_day": "60-day notice",
  "90_day": "90-day notice",
  work_reminder: "Work reminder",
  renewal_followup: "Renewal follow-up",
  document_collection: "Document collection",
  inspection_scheduling: "Inspection scheduling",
  endorsement_request: "Endorsement request",
  claim_followup: "Claim follow-up",
  policy_review: "Policy review",
};

export function isDeskTaskType(value: string | null | undefined): value is DeskTaskType {
  return Boolean(value && (DESK_TASK_TYPES as readonly string[]).includes(value));
}

export function isTaskRecordType(value: string | null | undefined): value is TaskRecordType {
  return Boolean(value && (TASK_RECORD_TYPES as readonly string[]).includes(value));
}

/** Left half of the title field — auto from Task type, read-only. */
export function deskTaskTypeTitle(kind: string): string {
  if (isDeskTaskType(kind)) return DESK_TASK_TYPE_LABELS[kind];
  return kind.replaceAll("_", " ");
}

/** Full title saved on the task. */
export function composeDeskTaskTitle(kind: string, notes: string): string {
  const base = deskTaskTypeTitle(kind);
  const extra = notes.trim();
  return extra ? `${base} — ${extra}` : base;
}

export const TASK_GROUP_BY = ["policy", "task_type", "due"] as const;
export type TaskGroupBy = (typeof TASK_GROUP_BY)[number];

export function isTaskGroupBy(value: string | null | undefined): value is TaskGroupBy {
  return Boolean(value && (TASK_GROUP_BY as readonly string[]).includes(value));
}

export type TaskDueBucket = "overdue" | "today" | "this_week" | "later";

export function taskDueBucket(due: Date, now = new Date()): TaskDueBucket {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const endToday = new Date(start);
  endToday.setDate(endToday.getDate() + 1);
  const endWeek = new Date(start);
  endWeek.setDate(endWeek.getDate() + 7);
  const t = due.getTime();
  if (t < start.getTime()) return "overdue";
  if (t < endToday.getTime()) return "today";
  if (t < endWeek.getTime()) return "this_week";
  return "later";
}

export const TASK_DUE_BUCKET_LABELS: Record<TaskDueBucket, string> = {
  overdue: "Overdue",
  today: "Today",
  this_week: "This week",
  later: "Later",
};
