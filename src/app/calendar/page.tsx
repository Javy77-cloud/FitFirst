import { AppShell } from "@/components/app-shell";
import { DeskCalendar } from "@/components/calendar/desk-calendar";
import { listRelatedOptions } from "@/lib/db/activity-queries";
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
  const query = await searchParams;
  const view = parseCalendarView(typeof query.view === "string" ? query.view : undefined);
  const fallback = DESK_AS_OF;
  const anchor = parseDateParam(typeof query.date === "string" ? query.date : undefined, fallback);
  const kinds = parseKindsParam(query.kinds);
  const range = rangeForView(view, anchor);
  const [rows, options] = await Promise.all([
    listCalendarActivities(range.from, range.to),
    listRelatedOptions(),
  ]);
  const events = rows.map((row) => serializeCalendarActivity(row));

  return (
    <AppShell title="Calendar">
      <p className="mb-3 text-sm text-muted-foreground">
        Desk month, week, and day — hourly slots on week and day. Filter by type. Drag to
        reschedule. Edit writes the same durable log as Contact and Policy records. Google Calendar
        stays a stub.
      </p>
      <DeskCalendar
        events={events}
        options={options}
        initialView={view}
        initialDate={typeof query.date === "string" ? query.date : ""}
        initialKinds={kinds}
      />
    </AppShell>
  );
}
