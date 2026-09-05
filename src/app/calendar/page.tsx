import { requireSignedIn } from "@/lib/auth/guards";
import { AppShell } from "@/components/app-shell";
import { DeskCalendar } from "@/components/calendar/desk-calendar";
import { listRelatedOptions } from "@/lib/db/activity-queries";
import { listOfficeStubs, listTerritoryStubs } from "@/lib/db/office-queries";
import { listCalendarActivities } from "@/lib/db/queries";
import { DESK_AS_OF } from "@/lib/home/as-of";
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
  const fallback = DESK_AS_OF;
  const anchor = parseDateParam(typeof query.date === "string" ? query.date : undefined, fallback);
  const kinds = parseKindsParam(query.kinds);
  const range = rangeForView(view, anchor);
  const [rows, options, offices, territories] = await Promise.all([
    listCalendarActivities(range.from, range.to),
    listRelatedOptions(),
    listOfficeStubs(),
    listTerritoryStubs(),
  ]);
  const events = rows.map((row) => serializeCalendarActivity(row));
  const openEventId = typeof query.event === "string" ? query.event : null;

  return (
    <AppShell title="Calendar">
      <p className="mb-3 text-sm text-muted-foreground">
        {session.isAgent
          ? "Your tasks, calls, personal meetings, and company / training invites. Open a company event to join the video. Google Calendar connect is Admin."
          : "Desk month, week, and day. Admins add Company meeting or Training with a video link and invite Whole agency, Office, Territory, or Management. Personal Video / In-Home / In-Office meetings stay. Connect Google Calendar from Settings when the agency is ready."}
      </p>
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
      />
    </AppShell>
  );
}
