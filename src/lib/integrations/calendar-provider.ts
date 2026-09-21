import type { CalendarProvider, CalendarProviderId } from "./calendar-event-map";
import { googleCalendarEventsProvider } from "./calendar-providers/google";
import { outlookCalendarEventsProvider } from "./calendar-providers/outlook";

export type {
  CalendarEventDraft,
  CalendarProvider,
  CalendarProviderId,
  ProviderCalendarEvent,
} from "./calendar-event-map";

const PROVIDERS: Record<CalendarProviderId, CalendarProvider> = {
  google_calendar: googleCalendarEventsProvider,
  outlook_calendar: outlookCalendarEventsProvider,
};

export function getCalendarProvider(id: CalendarProviderId): CalendarProvider {
  return PROVIDERS[id];
}

export function listCalendarProviders(): CalendarProvider[] {
  return [PROVIDERS.google_calendar, PROVIDERS.outlook_calendar];
}

export async function listConnectedCalendarProviders(): Promise<CalendarProvider[]> {
  const rows = await Promise.all(
    listCalendarProviders().map(async (provider) => ({
      provider,
      connected: await provider.isConnected(),
    })),
  );
  return rows.filter((row) => row.connected).map((row) => row.provider);
}
