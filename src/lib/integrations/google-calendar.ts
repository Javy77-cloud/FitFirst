import { liveAccessToken } from "./oauth-exchange";
import { loadByoConnection } from "./oauth-store";
import { serializeBusyBlock, type SerializedBusyBlock } from "./calendar-busy";
import { eventSyncWindow } from "./calendar-event-map";
import { googleCalendarEventsProvider } from "./calendar-providers/google";
import { syncConnectedCalendars, syncConnectedCalendarsBothWays } from "./calendar-event-sync";
import { googleCalendarHttpError } from "./calendar-sync";

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
  const result = await syncConnectedCalendars();
  return {
    status: "ok",
    count: result.imported,
    message: `Synced ${result.imported} Google event${result.imported === 1 ? "" : "s"}.`,
  };
}

export async function syncGoogleCalendarOut(): Promise<GoogleCalendarSyncResult> {
  const ready = await googleCalendarIsReady();
  if (!ready) {
    return { status: "skipped", count: 0, message: "Google Calendar is not connected." };
  }
  const result = await syncConnectedCalendarsBothWays();
  return {
    status: "ok",
    count: result.pushed,
    message: `Pushed ${result.pushed} FitFirst event${result.pushed === 1 ? "" : "s"} to Google.`,
  };
}

export async function listUpcomingGoogleEvents(days = 14): Promise<SerializedBusyBlock[]> {
  const token = await liveAccessToken("google_calendar");
  if (!token) return [];
  const now = new Date();
  const range = eventSyncWindow(now, new Date(now.getTime() + Math.max(1, days) * 24 * 60 * 60 * 1000), now);
  const events = await googleCalendarEventsProvider.listEvents(range);
  return events
    .filter((event) => event.busy)
    .map((event) =>
      serializeBusyBlock({
        id: event.externalId,
        provider: "google_event",
        startAt: event.startAt,
        endAt: event.endAt,
        title: event.title,
      }),
    );
}

export { googleCalendarHttpError };
