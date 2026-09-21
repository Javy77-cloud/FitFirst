import { requireSignedIn } from "@/lib/auth/guards";
import { AppShell } from "@/components/app-shell";
import { CalendarSyncBar } from "@/components/calendar/calendar-sync-bar";
import { DeskCalendar } from "@/components/calendar/desk-calendar";
import { listRelatedOptions } from "@/lib/db/activity-queries";
import { ensureCalendarEventSyncTables } from "@/lib/db/ensure-calendar-event-sync";
import { listOfficeStubs, listTerritoryStubs } from "@/lib/db/office-queries";
import { listCalendarActivities } from "@/lib/db/queries";
import { deskNow } from "@/lib/home/as-of";
import { canConnectByoIntegration } from "@/lib/integrations/connect-policy";
import { busyCoveredByTitledEvent, eventSyncWindow } from "@/lib/integrations/calendar-event-map";
import {
  importConnectedEvents,
  syncedEventToDeskActivity,
} from "@/lib/integrations/calendar-event-sync";
import { hasSyncedEvents, listSyncedEvents } from "@/lib/integrations/calendar-event-store";
import {
  displayBusySyncError,
  isByoBusyConnection,
  shouldAutoSyncBusy,
  shouldAutoSyncEvents,
} from "@/lib/integrations/calendar-sync";
import {
  listBusyWindows,
  meetHelperAvailable,
  serializeBusyBlock,
  syncConnectedBusy,
} from "@/lib/integrations/calendar-busy";
import { loadByoConnection } from "@/lib/integrations/oauth-store";
import { getCalendarAgencyPrefs } from "@/lib/ops/calendar-agency-prefs";
import {
  parseCalendarView,
  parseDateParam,
  parseKindsParam,
  rangeForView,
  serializeCalendarActivity,
} from "@/lib/ops/calendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSignedIn();
  const query = await searchParams;
  const view = parseCalendarView(typeof query.view === "string" ? query.view : undefined);
  const fallback = deskNow();
  const anchor = parseDateParam(typeof query.date === "string" ? query.date : undefined, fallback);
  const kinds = parseKindsParam(query.kinds);
  const range = rangeForView(view, anchor);
  const syncRange = eventSyncWindow(range.from, range.to);
  await ensureCalendarEventSyncTables().catch(() => false);
  const [googleRow, outlookRow] = await Promise.all([
    loadByoConnection("google_calendar").catch(() => null),
    loadByoConnection("outlook_calendar").catch(() => null),
  ]);
  const googleConnected = isByoBusyConnection(googleRow);
  const outlookConnected = isByoBusyConnection(outlookRow);
  const lastBusyStamp = [googleRow?.lastBusySyncAt, outlookRow?.lastBusySyncAt]
    .filter((at): at is Date => Boolean(at))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  let lastSyncedAt = lastBusyStamp;
  let syncError = displayBusySyncError(googleRow?.lastOauthError ?? outlookRow?.lastOauthError);
  if (googleConnected || outlookConnected) {
    const importedBefore = await hasSyncedEvents().catch(() => false);
    if (shouldAutoSyncEvents(lastBusyStamp, importedBefore)) {
      try {
        await importConnectedEvents(syncRange);
        lastSyncedAt = new Date();
        syncError = null;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Calendar event sync failed.";
        syncError = displayBusySyncError(message);
        const { recordByoOauthError } = await import("@/lib/integrations/oauth-store");
        if (syncError) {
          await recordByoOauthError("google_calendar", syncError).catch(() => undefined);
        }
      }
    }
    if (shouldAutoSyncBusy(lastBusyStamp)) {
      try {
        await syncConnectedBusy();
        lastSyncedAt = new Date();
        if (!syncError) syncError = null;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Busy sync failed.";
        syncError = displayBusySyncError(message) ?? syncError;
        const { recordByoOauthError } = await import("@/lib/integrations/oauth-store");
        if (syncError) {
          await recordByoOauthError("google_calendar", syncError).catch(() => undefined);
        }
      }
    }
  }
  const [rows, options, offices, territories, calendarPrefs, busyRows, meetHelper, syncedRows] = await Promise.all([
    listCalendarActivities(range.from, range.to),
    listRelatedOptions(),
    listOfficeStubs(),
    listTerritoryStubs(),
    getCalendarAgencyPrefs(),
    listBusyWindows(range.from, range.to).catch(() => []),
    meetHelperAvailable().catch(() => false),
    listSyncedEvents(range.from, range.to).catch(() => []),
  ]);
  const deskEvents = rows.map((row) => serializeCalendarActivity({ ...row, origin: "fitfirst" }));
  const externalEvents = syncedRows.map((row) => serializeCalendarActivity(syncedEventToDeskActivity(row)));
  const events = [...deskEvents, ...externalEvents];
  const busyBlocks = busyRows
    .filter((block) => !busyCoveredByTitledEvent(block, externalEvents))
    .map(serializeBusyBlock);
  const openEventId = typeof query.event === "string" ? query.event : null;
  const notice = typeof query.notice === "string" ? query.notice : null;

  return (
    <AppShell title="Calendar">
      <div data-ff-calendar-page="">
      <DeskCalendar
        events={events}
        options={options}
        initialView={view}
        initialDate={typeof query.date === "string" ? query.date : ""}
        initialKinds={kinds}
        isAdmin={session.isAdmin}
        offices={offices}
        territories={territories}
        openEventId={openEventId}
        markSundayNonWorking={calendarPrefs.calendarMarkSundayNonWorking}
        showUsFederalHolidays={calendarPrefs.calendarShowUsFederalHolidays}
        busyBlocks={busyBlocks}
        meetHelper={meetHelper}
        syncControl={
          <CalendarSyncBar
            googleConnected={googleConnected}
            outlookConnected={outlookConnected}
            lastSyncedAt={lastSyncedAt ? lastSyncedAt.toISOString() : null}
            canConnect={canConnectByoIntegration(session)}
            googleEmail={googleRow?.tokenAccountEmail ?? null}
            overlayCount={externalEvents.length}
            notice={notice}
            syncError={syncError}
            lastOauthError={googleRow?.lastOauthError ?? outlookRow?.lastOauthError ?? null}
          />
        }
      />
      </div>
    </AppShell>
  );
}
