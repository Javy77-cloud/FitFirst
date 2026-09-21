import { liveAccessToken } from "../oauth-exchange";
import { loadByoConnection } from "../oauth-store";
import { googleCalendarHttpError, isByoBusyConnection } from "../calendar-sync";
import {
  googleEventWriteBody,
  mapGoogleEventItem,
  PRIMARY_CALENDAR_ID,
  type CalendarEventDraft,
  type GoogleEventItem,
  type ProviderCalendarEvent,
} from "../calendar-event-map";
import type { CalendarProvider } from "../calendar-event-map";

const EVENTS_URL = `https://www.googleapis.com/calendar/v3/calendars/${PRIMARY_CALENDAR_ID}/events`;

async function googleToken() {
  const token = await liveAccessToken("google_calendar");
  if (!token) throw new Error("Google Calendar is not connected.");
  return token;
}

export const googleCalendarEventsProvider: CalendarProvider = {
  id: "google_calendar",
  label: "Google",
  defaultCalendarId: PRIMARY_CALENDAR_ID,

  async isConnected() {
    const row = await loadByoConnection("google_calendar");
    return isByoBusyConnection(row);
  },

  async listEvents(range) {
    const token = await googleToken();
    const out: ProviderCalendarEvent[] = [];
    let pageToken = "";
    for (let page = 0; page < 8; page += 1) {
      const url = new URL(EVENTS_URL);
      url.searchParams.set("timeMin", range.from.toISOString());
      url.searchParams.set("timeMax", range.to.toISOString());
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("maxResults", "250");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await res.json()) as {
        error?: { message?: string; status?: string; errors?: { reason?: string; message?: string }[] };
        items?: GoogleEventItem[];
        nextPageToken?: string;
      };
      if (!res.ok) throw new Error(googleCalendarHttpError(data, res.status, "events"));
      for (const item of data.items ?? []) {
        const mapped = mapGoogleEventItem(item, PRIMARY_CALENDAR_ID);
        if (mapped) out.push(mapped);
      }
      pageToken = data.nextPageToken ?? "";
      if (!pageToken) break;
    }
    return out;
  },

  async createEvent(draft: CalendarEventDraft) {
    const token = await googleToken();
    const res = await fetch(EVENTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(googleEventWriteBody(draft)),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!res.ok) throw new Error(googleCalendarHttpError(data, res.status, "events"));
    if (!data.id) throw new Error("Google created the event but did not return an id.");
    return { externalId: data.id };
  },

  async updateEvent(externalId, draft) {
    const token = await googleToken();
    const res = await fetch(`${EVENTS_URL}/${encodeURIComponent(externalId)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(googleEventWriteBody(draft)),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404) throw new Error("GOOGLE_EVENT_GONE");
    const data = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) throw new Error(googleCalendarHttpError(data, res.status, "events"));
  },

  async deleteEvent(externalId) {
    const token = await googleToken();
    const res = await fetch(`${EVENTS_URL}/${encodeURIComponent(externalId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404 || res.status === 410) return;
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(googleCalendarHttpError(data, res.status, "events"));
    }
  },
};
