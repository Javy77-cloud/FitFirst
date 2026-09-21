import { liveAccessToken } from "../oauth-exchange";
import { loadByoConnection } from "../oauth-store";
import { isByoBusyConnection } from "../calendar-sync";
import {
  mapOutlookEventItem,
  outlookEventWriteBody,
  OUTLOOK_FITFIRST_PROP_ID,
  PRIMARY_CALENDAR_ID,
  type CalendarEventDraft,
  type OutlookEventItem,
  type ProviderCalendarEvent,
} from "../calendar-event-map";
import type { CalendarProvider } from "../calendar-event-map";

const VIEW_URL = "https://graph.microsoft.com/v1.0/me/calendarView";
const EVENTS_URL = "https://graph.microsoft.com/v1.0/me/events";

async function outlookToken() {
  const token = await liveAccessToken("outlook_calendar");
  if (!token) throw new Error("Outlook Calendar is not connected.");
  return token;
}

function outlookError(data: { error?: { message?: string } }, status: number) {
  return data.error?.message || `Outlook calendar failed (${status}).`;
}

export const outlookCalendarEventsProvider: CalendarProvider = {
  id: "outlook_calendar",
  label: "Outlook",
  defaultCalendarId: PRIMARY_CALENDAR_ID,

  async isConnected() {
    const row = await loadByoConnection("outlook_calendar");
    return isByoBusyConnection(row);
  },

  async listEvents(range) {
    const token = await outlookToken();
    const out: ProviderCalendarEvent[] = [];
    const first = new URL(VIEW_URL);
    first.searchParams.set("startDateTime", range.from.toISOString());
    first.searchParams.set("endDateTime", range.to.toISOString());
    first.searchParams.set(
      "$select",
      "id,subject,isCancelled,isAllDay,showAs,sensitivity,webLink,start,end",
    );
    first.searchParams.set(
      "$expand",
      `singleValueExtendedProperties($filter=id eq '${OUTLOOK_FITFIRST_PROP_ID}')`,
    );
    first.searchParams.set("$top", "100");
    let next: string | null = first.toString();
    for (let page = 0; page < 8 && next; page += 1) {
      const res = await fetch(next, {
        headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' },
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await res.json()) as {
        error?: { message?: string };
        value?: OutlookEventItem[];
        "@odata.nextLink"?: string;
      };
      if (!res.ok) throw new Error(outlookError(data, res.status));
      for (const item of data.value ?? []) {
        const mapped = mapOutlookEventItem(item, PRIMARY_CALENDAR_ID);
        if (mapped) out.push(mapped);
      }
      next = data["@odata.nextLink"] ?? null;
    }
    return out;
  },

  async createEvent(draft: CalendarEventDraft) {
    const token = await outlookToken();
    const res = await fetch(EVENTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: 'outlook.timezone="UTC"',
      },
      body: JSON.stringify(outlookEventWriteBody(draft)),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!res.ok) throw new Error(outlookError(data, res.status));
    if (!data.id) throw new Error("Outlook created the event but did not return an id.");
    return { externalId: data.id };
  },

  async updateEvent(externalId, draft) {
    const token = await outlookToken();
    const res = await fetch(`${EVENTS_URL}/${encodeURIComponent(externalId)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: 'outlook.timezone="UTC"',
      },
      body: JSON.stringify(outlookEventWriteBody(draft)),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404) throw new Error("OUTLOOK_EVENT_GONE");
    const data = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) throw new Error(outlookError(data, res.status));
  },

  async deleteEvent(externalId) {
    const token = await outlookToken();
    const res = await fetch(`${EVENTS_URL}/${encodeURIComponent(externalId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404 || res.status === 410) return;
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(outlookError(data, res.status));
    }
  },
};
