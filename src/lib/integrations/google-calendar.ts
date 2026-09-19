import { liveAccessToken } from "./oauth-exchange";
import { loadByoConnection } from "./oauth-store";
import { serializeBusyBlock, syncGoogleBusy, type SerializedBusyBlock } from "./calendar-busy";

export type GoogleCalendarSyncResult = {
  status: "ok" | "skipped" | "later";
  count: number;
  message: string;
};

/** Real Connect lives on Settings → Integrations (BYO OAuth). This is the desk deep-link. */
export function startGoogleOAuth(): { status: "use_byo"; href: string; message: string } {
  return {
    status: "use_byo",
    href: "/settings/integrations#google_calendar",
    message: "Connect Google Calendar with one-click Google OAuth under Settings → Integrations.",
  };
}

export function completeGoogleOAuthStub(displayEmail?: string): {
  connected: false;
  displayEmail: string;
  oauth: ReturnType<typeof startGoogleOAuth>;
} {
  return {
    connected: false,
    displayEmail: displayEmail?.trim() || "",
    oauth: startGoogleOAuth(),
  };
}

export async function googleCalendarIsReady(): Promise<boolean> {
  const row = await loadByoConnection("google_calendar");
  return Boolean(row?.connected && row.connectMode === "byo");
}

export async function syncGoogleCalendarIn(): Promise<GoogleCalendarSyncResult> {
  const ready = await googleCalendarIsReady();
  if (!ready) {
    return { status: "skipped", count: 0, message: "Google Calendar is not connected." };
  }
  const count = await syncGoogleBusy();
  return {
    status: "ok",
    count,
    message: `Synced ${count} Google busy block${count === 1 ? "" : "s"}.`,
  };
}

export function syncGoogleCalendarOut(): GoogleCalendarSyncResult {
  return {
    status: "later",
    count: 0,
    message: "Two-way event push is not in this wave. Busy pull is live on the desk calendar.",
  };
}

export async function listUpcomingGoogleEvents(days = 14): Promise<SerializedBusyBlock[]> {
  const token = await liveAccessToken("google_calendar");
  if (!token) return [];
  const timeMin = new Date();
  const timeMax = new Date(Date.now() + Math.max(1, days) * 24 * 60 * 60 * 1000);
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMin.toISOString());
  url.searchParams.set("timeMax", timeMax.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "50");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json()) as {
    error?: { message?: string };
    items?: {
      id?: string;
      summary?: string;
      status?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      transparency?: string;
    }[];
  };
  if (!res.ok) throw new Error(data.error?.message || `Google events failed (${res.status}).`);
  return (data.items ?? [])
    .filter((row) => row.status !== "cancelled" && row.transparency !== "transparent")
    .map((row, index) => {
      const startRaw = row.start?.dateTime || (row.start?.date ? `${row.start.date}T09:00:00` : "");
      const endRaw = row.end?.dateTime || (row.end?.date ? `${row.end.date}T10:00:00` : "");
      const start = startRaw ? new Date(startRaw) : null;
      const end = endRaw ? new Date(endRaw) : null;
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      return serializeBusyBlock({
        id: row.id || `gcal-event-${start.getTime()}-${index}`,
        provider: "google_event",
        startAt: start,
        endAt: end,
        title: (row.summary ?? "").trim() || "Google event",
      });
    })
    .filter((row): row is SerializedBusyBlock => Boolean(row));
}
