import { AppShell } from "@/components/app-shell";
import { DeskCalendar } from "@/components/calendar/desk-calendar";
import { listCalendarActivities, listCalendarRelatedOptions } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [items, related] = await Promise.all([
    listCalendarActivities(),
    listCalendarRelatedOptions(),
  ]);

  return (
    <AppShell title="Calendar" eyebrow="Desk">
      <p className="mb-3 text-base text-muted-foreground">
        In-desk calendar. Month, week, and day on the first row; task through SMS on the second.
        Drag an event onto another day. Nothing syncs off this computer.
      </p>
      <DeskCalendar items={items} deals={related.deals} leads={related.leads} />
    </AppShell>
  );
}
