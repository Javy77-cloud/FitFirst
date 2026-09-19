import { requireSignedIn } from "@/lib/auth/guards";
import { AppShell } from "@/components/app-shell";
import { CalendarSyncBar } from "@/components/calendar/calendar-sync-bar";
import { DeskCalendar } from "@/components/calendar/desk-calendar";
import { listRelatedOptions } from "@/lib/db/activity-queries";
import { listOfficeStubs, listTerritoryStubs } from "@/lib/db/office-queries";
import { listCalendarActivities } from "@/lib/db/queries";
import { deskNow } from "@/lib/home/as-of";
import { canConnectByoIntegration } from "@/lib/integrations/connect-policy";
import { shouldAutoSyncBusy } from "@/lib/integrations/calendar-sync";
import {
  listBusyWindows,
  meetHelperAvailable,
  serializeBusyBlock,
  syncConnectedBusy,
} from "@/lib/integrations/calendar-busy";
import { listUpcomingGoogleEvents } from "@/lib/integrations/google-calendar";
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
  const [googleRow, outlookRow] = await Promise.all([
    loadByoConnection("google_calendar").catch(() => null),
    loadByoConnection("outlook_calendar").catch(() => null),
  ]);
  const googleConnected = Boolean(googleRow?.connected && googleRow.connectMode === "byo");
  const outlookConnected = Boolean(outlookRow?.connected && outlookRow.connectMode === "byo");
  let lastSyncedAt = [googleRow?.lastBusySyncAt, outlookRow?.lastBusySyncAt]
    .filter((at): at is Date => Boolean(at))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  if ((googleConnected || outlookConnected) && shouldAutoSyncBusy(lastSyncedAt)) {
    const synced = await syncConnectedBusy().catch(() => null);
    if (synced) lastSyncedAt = new Date();
  }
  const [rows, options, offices, territories, calendarPrefs, busyRows, meetHelper, googleEvents] = await Promise.all([
    listCalendarActivities(range.from, range.to),
    listRelatedOptions(),
    listOfficeStubs(),
    listTerritoryStubs(),
    getCalendarAgencyPrefs(),
    listBusyWindows(range.from, range.to).catch(() => []),
    meetHelperAvailable().catch(() => false),
    googleConnected ? listUpcomingGoogleEvents(14).catch(() => []) : Promise.resolve([]),
  ]);
  const events = rows.map((row) => serializeCalendarActivity(row));
  const busyBlocks = [
    ...busyRows.map(serializeBusyBlock),
    ...googleEvents.filter((event) => !busyRows.some((busy) => busy.id === event.id)),
  ];
  const openEventId = typeof query.event === "string" ? query.event : null;
  const notice = typeof query.notice === "string" ? query.notice : null;

  return (
    <AppShell title="Calendar">
      <div data-ff-calendar-page="">
      <CalendarSyncBar
        googleConnected={googleConnected}
        outlookConnected={outlookConnected}
        lastSyncedAt={lastSyncedAt}
        canConnect={canConnectByoIntegration(session)}
        googleEmail={googleRow?.tokenAccountEmail ?? null}
        overlayCount={googleEvents.length}
        notice={notice}
      />
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
      />
      </div>
    </AppShell>
  );
}
