import {
  SERVICE_TIMELINE_DISCLAIMER,
  isServiceTimelineEvent,
  serviceTimelineEventLabel,
} from "@/lib/domain-ams";

export type ServiceTimelineSource = {
  id: string;
  eventType: string;
  body: string;
  occurredAt: Date | string;
  policyId?: string | null;
  policyNumber?: string | null;
  partyName?: string | null;
  activityTitle?: string | null;
};

export type ServiceTimelineRow = ServiceTimelineSource & {
  label: string;
};

export function filterServiceTimeline<T extends { eventType: string }>(items: T[]): T[] {
  return items.filter((item) => isServiceTimelineEvent(item.eventType));
}

export function buildServiceTimelineRow(item: ServiceTimelineSource): ServiceTimelineRow {
  return {
    ...item,
    label: serviceTimelineEventLabel(item.eventType),
  };
}

export function sortServiceTimeline<T extends { occurredAt: Date | string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.occurredAt).getTime();
    const bTime = new Date(b.occurredAt).getTime();
    return bTime - aTime;
  });
}

export function validateServiceNote(body: string): { ok: true; body: string } | { ok: false; error: string } {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "A servicing note is required." };
  return { ok: true, body: trimmed };
}

export function serviceNoteTitle(policyNumber: string): string {
  return `Servicing note · ${policyNumber}`;
}

export function serviceTimelineFilesPolicy(): false {
  return false;
}

export { SERVICE_TIMELINE_DISCLAIMER };
