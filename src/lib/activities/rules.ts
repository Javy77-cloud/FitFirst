import {
  ACTIVITY_STATUS_ALIASES,
  ACTIVITY_STATUSES,
  CALL_OUTCOMES,
  type ActivityStatus,
  type CallOutcome,
  type TaskPipelineStage,
} from "@/lib/domain";
import { deskDateKey } from "@/lib/desk/desk-timezone";
import { AUTO_REMIND_LEAD_MS, parseDeskDateTimeLocal } from "@/lib/tasks/due-at";

export type RelatedIds = {
  contactId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  businessId?: string | null;
};

/** Calendar / leftover ops statuses plus desk ACTIVITY_STATUSES. */
export type OpsActivityStatus = ActivityStatus | "incomplete" | "canceled" | "rescheduled" | "in_progress";

export function normalizeStatus(status: string | null | undefined): OpsActivityStatus {
  const raw = (status ?? "incomplete").trim().toLowerCase();
  if (raw === "open") return "incomplete";
  if (raw === "cancelled") return "canceled";
  const aliased = ACTIVITY_STATUS_ALIASES[raw] ?? raw;
  if ((ACTIVITY_STATUSES as readonly string[]).includes(aliased)) {
    return aliased as ActivityStatus;
  }
  return aliased as OpsActivityStatus;
}

export function assertContactOrPolicy(related: RelatedIds): void {
  const contact = related.contactId?.trim();
  const policy = related.policyId?.trim();
  if (!contact && !policy) {
    throw new Error("Assign this work to a contact and/or a policy.");
  }
}

export function canDeleteActivity(): false {
  return false;
}

export function cancelInsteadOfDelete(): { status: OpsActivityStatus } {
  return { status: "canceled" };
}

export type RescheduleRecord = {
  previousDueAt: Date | null;
  dueAt: Date;
  status: OpsActivityStatus;
  actorId: string | null;
  actorName: string | null;
};

export function rescheduleFields(input: {
  oldDueAt: Date | null;
  newDueAt: Date;
  actorId?: string | null;
  actorName?: string | null;
}): RescheduleRecord {
  return {
    previousDueAt: input.oldDueAt,
    dueAt: input.newDueAt,
    status: "rescheduled",
    actorId: input.actorId ?? null,
    actorName: input.actorName ?? null,
  };
}

export function rescheduleEventBody(record: RescheduleRecord): string {
  const oldLabel = record.previousDueAt
    ? record.previousDueAt.toISOString()
    : "unscheduled";
  const who = record.actorName ?? "Desk";
  return `${who} moved due from ${oldLabel} to ${record.dueAt.toISOString()}.`;
}

export function completionFields(input: {
  createdAt: Date;
  startAt?: Date | null;
  completedAt?: Date;
  completedBy: string;
  notes?: string | null;
}) {
  const completedAt = input.completedAt ?? new Date();
  const from = input.startAt ?? input.createdAt;
  const durationSeconds = Math.max(
    0,
    Math.round((completedAt.getTime() - from.getTime()) / 1000),
  );
  return {
    status: "completed" as const,
    pipelineStage: "done" as TaskPipelineStage,
    completedAt,
    completedBy: input.completedBy,
    durationSeconds,
    notes: input.notes ?? null,
  };
}

export function canCloseCall(input: {
  outcome?: string | null;
  notes?: string | null;
}): { ok: true } | { ok: false; reason: string } {
  const outcome = (input.outcome ?? "").trim();
  const notes = (input.notes ?? "").trim();
  if (!(CALL_OUTCOMES as readonly string[]).includes(outcome)) {
    return { ok: false, reason: "Pick a call outcome before the log can close." };
  }
  if (!notes) {
    return { ok: false, reason: "Add notes before the call log can close." };
  }
  return { ok: true };
}

export function isClosedStatus(status: string): boolean {
  const mapped = normalizeStatus(status);
  return mapped === "completed" || mapped === "canceled" || mapped === "cancelled";
}

export function whenForActivity(row: {
  kind: string;
  dueAt?: Date | null;
  startAt?: Date | null;
  scheduledAt?: Date | null;
}): Date | null {
  if (row.kind === "call") return row.scheduledAt ?? row.dueAt ?? row.startAt ?? null;
  if (row.kind === "meeting") return row.startAt ?? row.dueAt ?? null;
  return row.dueAt ?? row.startAt ?? row.scheduledAt ?? null;
}

/** Start of the desk calendar day (America/New_York), not process-local/UTC. */
export function startOfLocalDay(value: Date): Date {
  const key = deskDateKey(value);
  return parseDeskDateTimeLocal(`${key}T00:00`) ?? new Date(value);
}

export function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

export function isOverdue(when: Date | null, now = new Date(), status?: string): boolean {
  if (!when || isClosedStatus(status ?? "incomplete")) return false;
  return when.getTime() < now.getTime();
}

/** Open work whose when falls on the same America/New_York calendar day as `now`. */
export function isDueToday(when: Date | null, now = new Date(), status?: string): boolean {
  if (!when || isClosedStatus(status ?? "incomplete")) return false;
  return deskDateKey(when) === deskDateKey(now);
}

export function isDueSoon(
  when: Date | null,
  now = new Date(),
  status?: string,
  hours = AUTO_REMIND_LEAD_MS / 3_600_000,
): boolean {
  if (!when || isClosedStatus(status ?? "incomplete")) return false;
  const delta = when.getTime() - now.getTime();
  return delta >= 0 && delta <= hours * 60 * 60 * 1000;
}

export function reminderHasFired(input: {
  when: Date | null;
  reminderMinutes?: number | null;
  now?: Date;
  status?: string;
}): boolean {
  if (!input.when || isClosedStatus(input.status ?? "incomplete")) return false;
  const minutes = input.reminderMinutes ?? 0;
  const fireAt = input.when.getTime() - minutes * 60 * 1000;
  return (input.now ?? new Date()).getTime() >= fireAt;
}

export function shouldNotifyCall(input: {
  kind: string;
  when: Date | null;
  reminderMinutes?: number | null;
  now?: Date;
  status?: string;
  outcome?: string | null;
}): boolean {
  if (input.kind !== "call") return false;
  if (input.outcome) return false;
  if (isClosedStatus(input.status ?? "incomplete")) return false;
  const now = input.now ?? new Date();
  return (
    isOverdue(input.when, now, input.status) ||
    isDueSoon(input.when, now, input.status) ||
    reminderHasFired({
      when: input.when,
      reminderMinutes: input.reminderMinutes,
      now,
      status: input.status,
    })
  );
}

export function isCallOutcome(value: string): value is CallOutcome {
  return (CALL_OUTCOMES as readonly string[]).includes(value);
}
