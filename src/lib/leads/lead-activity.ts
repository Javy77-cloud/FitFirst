import { ACTIVITY_KIND_LABEL, ACTIVITY_KINDS, type ActivityKind } from "@/lib/domain";

/** Main-column Activity headings — same five kinds as Quick Comms / contacts / deals. */
export const LEAD_ACTIVITY_SECTION_TITLE: Record<ActivityKind, string> = {
  task: "Tasks",
  meeting: "Meetings",
  call: "Calls",
  email: "Emails",
  sms: "SMS",
};

export const LEAD_ACTIVITY_SECTION_EMPTY: Record<ActivityKind, string> = {
  task: "No tasks yet. Use Quick Comms to add a task.",
  meeting: "No meetings yet. Schedule from Quick Comms.",
  call: "No calls yet. Use Quick Comms to log a call.",
  email: "No emails yet. Use Quick Comms to log an email.",
  sms: "No SMS yet. Use Quick Comms to send a text.",
};

/** Queue Activity menu — full set, not the 3-kind Call/SMS/Email device row. */
export const LEAD_ACTIVITY_MENU_ITEMS = ACTIVITY_KINDS.map((kind) => ({
  kind,
  label: LEAD_ACTIVITY_SECTION_TITLE[kind],
}));

export type LeadActivityListItem = {
  id: string;
  title: string;
  when: Date | string | null;
  meta: string | null;
};

export type LeadTimelineLike = {
  id: string;
  kind: string;
  subject?: string | null;
  activityTitle?: string | null;
  body?: string | null;
  occurredAt: Date | string;
  direction?: string | null;
  eventType?: string | null;
};

export function timelineItemsForKind(
  timeline: LeadTimelineLike[],
  kind: ActivityKind,
): LeadActivityListItem[] {
  return timeline
    .filter((item) => (item.kind ?? "").toLowerCase() === kind)
    .map((item) => ({
      id: item.id,
      title: item.subject || item.activityTitle || item.body || ACTIVITY_KIND_LABEL[kind],
      when: item.occurredAt,
      meta: item.direction ?? item.eventType ?? null,
    }));
}

export function leadActivityByKind(
  timeline: LeadTimelineLike[],
): Record<ActivityKind, LeadActivityListItem[]> {
  return Object.fromEntries(
    ACTIVITY_KINDS.map((kind) => [kind, timelineItemsForKind(timeline, kind)]),
  ) as Record<ActivityKind, LeadActivityListItem[]>;
}
