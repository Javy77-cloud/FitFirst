import {
  normalizeActivityStatus,
  type ActivityStatus,
  ACTIVITY_STATUS_LABELS,
} from "@/lib/domain";

export { normalizeActivityStatus, ACTIVITY_STATUS_LABELS };

export function assignmentLabel(input: {
  contactName?: string | null;
  policyNumber?: string | null;
  dealTitle?: string | null;
}): string {
  const parts = [
    input.contactName ? `Contact ${input.contactName}` : null,
    input.policyNumber ? `Policy ${input.policyNumber}` : null,
    input.dealTitle ? `Deal ${input.dealTitle}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Unassigned";
}

export function statusLabel(status: string): string {
  return ACTIVITY_STATUS_LABELS[normalizeActivityStatus(status)];
}

export function callDurationLabel(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function isDueCall(input: {
  kind: string;
  status: string;
  dueAt: Date | string | null;
  startAt: Date | string | null;
  now?: Date;
}): boolean {
  if (input.kind !== "call") return false;
  if (normalizeActivityStatus(input.status) === "completed") return false;
  const when = input.startAt ?? input.dueAt;
  if (!when) return false;
  const t = when instanceof Date ? when : new Date(when);
  return t.getTime() <= (input.now ?? new Date()).getTime();
}

export function pipelineColumn(status: string): ActivityStatus {
  return normalizeActivityStatus(status);
}
