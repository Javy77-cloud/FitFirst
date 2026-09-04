export const USER_ROLES = ["admin", "agent"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Desk work — independent of Bound / Active / Lapse on the Policy. */
export const WORK_STATUSES = [
  "waiting_on_insured",
  "waiting_on_carrier",
  "waiting_on_docs",
  "uw_question",
  "endorsement_pending",
  "ready",
] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

export const WORK_FLAGS = [
  "need_more_docs",
  "carrier_requested_info",
  "endorsement_required",
  "lapse_warning",
] as const;
export type WorkFlag = (typeof WORK_FLAGS)[number];

export const WORK_REMINDER_KIND = "work_reminder";
export const WORK_PING_KIND = "work_ping";
export const PORTAL_REQUEST_KIND = "portal_request";
export const PORTAL_PING_KIND = "portal_ping";

const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  waiting_on_insured: "Waiting on insured",
  waiting_on_carrier: "Waiting on carrier",
  waiting_on_docs: "Waiting on docs",
  uw_question: "UW question",
  endorsement_pending: "Endorsement pending",
  ready: "Ready",
};

const WORK_FLAG_LABELS: Record<WorkFlag, string> = {
  need_more_docs: "Need more docs",
  carrier_requested_info: "Carrier needs docs",
  endorsement_required: "Endorsement required",
  lapse_warning: "Lapse warning",
};

export function isWorkStatus(value: string): value is WorkStatus {
  return (WORK_STATUSES as readonly string[]).includes(value);
}

export function isWorkFlag(value: string): value is WorkFlag {
  return (WORK_FLAGS as readonly string[]).includes(value);
}

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

export function workStatusLabel(status: string): string {
  return isWorkStatus(status) ? WORK_STATUS_LABELS[status] : status.replaceAll("_", " ");
}

export function workFlagLabel(flag: string): string {
  return isWorkFlag(flag) ? WORK_FLAG_LABELS[flag] : flag.replaceAll("_", " ");
}

export function defaultReminderDue(from = new Date()): Date {
  const due = new Date(from);
  due.setUTCDate(due.getUTCDate() + 3);
  due.setUTCHours(16, 0, 0, 0);
  return due;
}
