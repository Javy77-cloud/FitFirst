import {
  ACTIVITY_STATUS_ALIASES,
  ACTIVITY_STATUSES,
  CALL_OUTCOMES,
  type ActivityStatus,
  type CallOutcome,
  type TaskPipelineStage,
} from "@/lib/domain";

export type RelatedIds = {
  contactId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  businessId?: string | null;
};

export function normalizeStatus(status: string | null | undefined): ActivityStatus {
  const raw = (status ?? "incomplete").trim().toLowerCase();
  const aliased = ACTIVITY_STATUS_ALIASES[raw] ?? raw;
  if ((ACTIVITY_STATUSES as readonly string[]).includes(aliased)) {
    return aliased as ActivityStatus;
  }
  return "open";
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

export function cancelInsteadOfDelete(): { status: ActivityStatus } {
  return { status: "cancelled" };
}

export type RescheduleRecord = {
  previousDueAt: Date | null;
  dueAt: Date;
  status: ActivityStatus;
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
    status: "open",
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
  return mapped === "completed" || mapped === "canceled";
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

export function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
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

export function isDueToday(when: Date | null, now = new Date(), status?: string): boolean {
  if (!when || isClosedStatus(status ?? "incomplete")) return false;
  const start = startOfLocalDay(now);
  const end = addDays(start, 1);
  return when.getTime() >= start.getTime() && when.getTime() < end.getTime();
}

export function isDueSoon(
  when: Date | null,
  now = new Date(),
  status?: string,
  hours = 36,
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
    isDueToday(input.when, now, input.status) ||
    isDueSoon(input.when, now, input.status, 36) ||
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
