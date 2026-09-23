/** Provider-agnostic mapping for calendar event import/push. Google is first; Outlook uses the same shapes. */

export const PRIMARY_CALENDAR_ID = "primary";
export const FITFIRST_ACTIVITY_PROP = "fitfirstActivityId";
export const OUTLOOK_FITFIRST_PROP_ID =
  "String {66f5a389-5a4c-4c2a-9b7e-8c1d2e3f4a5b} Name FitFirstActivityId";
export const EVENT_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;
export const EVENT_LOOKAHEAD_MS = 60 * 24 * 60 * 60 * 1000;

export type CalendarProviderId = "google_calendar" | "outlook_calendar";

export type CalendarVisibility = "default" | "public" | "private" | "confidential";

export type ProviderCalendarEvent = {
  provider: CalendarProviderId;
  calendarId: string;
  externalId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  visibility: CalendarVisibility;
  busy: boolean;
  htmlLink: string | null;
  etag: string | null;
  fitfirstActivityId: string | null;
};

export type CalendarEventDraft = {
  activityId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  notes?: string | null;
  location?: string | null;
};

/** Shared import/push contract. Google is live; Outlook plugs the same methods. */
export type CalendarProvider = {
  id: CalendarProviderId;
  label: string;
  /** Primary calendar only this wave. Additional calendars stay deferred. */
  defaultCalendarId: string;
  isConnected(): Promise<boolean>;
  listEvents(range: { from: Date; to: Date }): Promise<ProviderCalendarEvent[]>;
  createEvent(draft: CalendarEventDraft): Promise<{ externalId: string }>;
  updateEvent(externalId: string, draft: CalendarEventDraft): Promise<void>;
  deleteEvent(externalId: string): Promise<void>;
};

export type GoogleEventItem = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  etag?: string;
  visibility?: string;
  transparency?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
};

export type OutlookEventItem = {
  id?: string;
  subject?: string;
  isCancelled?: boolean;
  isAllDay?: boolean;
  showAs?: string;
  sensitivity?: string;
  webLink?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  singleValueExtendedProperties?: { id?: string; value?: string }[];
};

export function privacySafeTitle(input: {
  summary?: string | null;
  visibility?: string | null;
  busy?: boolean;
}): string {
  const raw = (input.summary ?? "").trim();
  const vis = (input.visibility ?? "").toLowerCase();
  const privateLike = vis === "private" || vis === "confidential" || vis === "personal";
  if (raw && !/^busy$/i.test(raw)) return raw;
  if (privateLike) return "Private event";
  if (!raw) return input.busy === false ? "Calendar event" : "Busy";
  return "Busy";
}

export function normalizeVisibility(value: string | null | undefined): CalendarVisibility {
  const vis = (value ?? "").toLowerCase();
  if (vis === "public") return "public";
  if (vis === "private" || vis === "personal") return "private";
  if (vis === "confidential") return "confidential";
  return "default";
}

export function parseGoogleEventBounds(
  start?: { dateTime?: string; date?: string },
  end?: { dateTime?: string; date?: string },
): { startAt: Date; endAt: Date; allDay: boolean } | null {
  if (start?.date && end?.date) {
    const startAt = new Date(`${start.date}T00:00:00`);
    const endExclusive = new Date(`${end.date}T00:00:00`);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endExclusive.getTime())) return null;
    const endAt = new Date(Math.max(startAt.getTime() + 60 * 60 * 1000, endExclusive.getTime() - 1));
    return { startAt, endAt, allDay: true };
  }
  const startRaw = start?.dateTime || (start?.date ? `${start.date}T09:00:00` : "");
  const endRaw = end?.dateTime || (end?.date ? `${end.date}T10:00:00` : "");
  const startAt = startRaw ? new Date(startRaw) : null;
  const endAt = endRaw ? new Date(endRaw) : null;
  if (!startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return null;
  return { startAt, endAt, allDay: Boolean(start?.date && !start.dateTime) };
}

export function mapGoogleEventItem(
  item: GoogleEventItem,
  calendarId = PRIMARY_CALENDAR_ID,
): ProviderCalendarEvent | null {
  if (!item.id || item.status === "cancelled") return null;
  const bounds = parseGoogleEventBounds(item.start, item.end);
  if (!bounds) return null;
  const visibility = normalizeVisibility(item.visibility);
  const busy = item.transparency !== "transparent";
  return {
    provider: "google_calendar",
    calendarId,
    externalId: item.id,
    title: privacySafeTitle({ summary: item.summary, visibility, busy }),
    startAt: bounds.startAt,
    endAt: bounds.endAt,
    allDay: bounds.allDay,
    visibility,
    busy,
    htmlLink: item.htmlLink?.trim() || null,
    etag: item.etag ?? null,
    fitfirstActivityId: item.extendedProperties?.private?.[FITFIRST_ACTIVITY_PROP]?.trim() || null,
  };
}

function parseOutlookDateTime(value?: { dateTime?: string; timeZone?: string }): Date | null {
  const raw = value?.dateTime?.trim();
  if (!raw) return null;
  const hasZone = /Z|[+-]\d{2}:\d{2}$/.test(raw);
  const at = new Date(hasZone ? raw : `${raw}Z`.replace(/ZZ$/, "Z"));
  return Number.isNaN(at.getTime()) ? null : at;
}

export function mapOutlookEventItem(
  item: OutlookEventItem,
  calendarId = PRIMARY_CALENDAR_ID,
): ProviderCalendarEvent | null {
  if (!item.id || item.isCancelled) return null;
  const startAt = parseOutlookDateTime(item.start);
  const endAt = parseOutlookDateTime(item.end);
  if (!startAt || !endAt) return null;
  const showAs = (item.showAs ?? "").toLowerCase();
  const busy = !["free", "workingelsewhere"].includes(showAs) && showAs !== "";
  const visibility = normalizeVisibility(item.sensitivity);
  const fitfirst =
    item.singleValueExtendedProperties?.find((row) => row.id === OUTLOOK_FITFIRST_PROP_ID)?.value?.trim() ||
    null;
  return {
    provider: "outlook_calendar",
    calendarId,
    externalId: item.id,
    title: privacySafeTitle({ summary: item.subject, visibility, busy: busy || showAs === "busy" }),
    startAt,
    endAt,
    allDay: Boolean(item.isAllDay),
    visibility,
    busy: showAs ? busy : true,
    htmlLink: item.webLink?.trim() || null,
    etag: null,
    fitfirstActivityId: fitfirst,
  };
}

export function shouldImportAsOverlay(
  event: ProviderCalendarEvent,
  linkedExternalIds: Set<string>,
): boolean {
  if (event.fitfirstActivityId) return false;
  if (linkedExternalIds.has(event.externalId)) return false;
  return true;
}

export function eventSyncWindow(
  viewFrom: Date,
  viewTo: Date,
  asOf = new Date(),
): { from: Date; to: Date } {
  const lookback = new Date(asOf.getTime() - EVENT_LOOKBACK_MS);
  const lookahead = new Date(asOf.getTime() + EVENT_LOOKAHEAD_MS);
  return {
    from: new Date(Math.min(viewFrom.getTime(), lookback.getTime())),
    to: new Date(Math.max(viewTo.getTime(), lookahead.getTime())),
  };
}

export function shouldPushDeskActivity(activity: {
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  kind?: string | null;
  status?: string | null;
}): boolean {
  const kind = (activity.kind ?? "").toLowerCase();
  const status = (activity.status ?? "").toLowerCase();
  const completed = status === "completed" || status === "done";
  // Logged completed email/SMS/call stay on Activity — never push to Google/Outlook.
  if (completed && (kind === "email" || kind === "sms" || kind === "call")) return false;
  const start = activity.startAt ? new Date(activity.startAt) : null;
  const end = activity.endAt ? new Date(activity.endAt) : null;
  return Boolean(start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()));
}

export function googleEventWriteBody(draft: CalendarEventDraft) {
  return {
    summary: draft.title,
    description: draft.notes || undefined,
    location: draft.location || undefined,
    start: { dateTime: draft.startAt.toISOString() },
    end: { dateTime: draft.endAt.toISOString() },
    extendedProperties: {
      private: { [FITFIRST_ACTIVITY_PROP]: draft.activityId },
    },
  };
}

export function outlookEventWriteBody(draft: CalendarEventDraft) {
  return {
    subject: draft.title,
    body: draft.notes ? { contentType: "Text", content: draft.notes } : undefined,
    location: draft.location ? { displayName: draft.location } : undefined,
    start: { dateTime: draft.startAt.toISOString().replace(/Z$/, ""), timeZone: "UTC" },
    end: { dateTime: draft.endAt.toISOString().replace(/Z$/, ""), timeZone: "UTC" },
    singleValueExtendedProperties: [
      { id: OUTLOOK_FITFIRST_PROP_ID, value: draft.activityId },
    ],
  };
}

export function calendarProviderLabel(provider: string | null | undefined): string {
  if (provider === "outlook_calendar") return "Outlook";
  return "Google";
}

export function rangesOverlapMs(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

export function busyCoveredByTitledEvent(
  busy: { provider: string; startAt: Date | string; endAt: Date | string },
  events: { origin?: string; calendarProvider?: string | null; startAt?: Date | string | null; endAt?: Date | string | null }[],
): boolean {
  const bStart = new Date(busy.startAt);
  const bEnd = new Date(busy.endAt);
  return events.some((event) => {
    if (event.origin !== "external") return false;
    if (event.calendarProvider && event.calendarProvider !== busy.provider) return false;
    if (!event.startAt || !event.endAt) return false;
    return rangesOverlapMs(bStart, bEnd, new Date(event.startAt), new Date(event.endAt));
  });
}
