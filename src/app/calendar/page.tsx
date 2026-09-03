import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <AppShell title="Calendar">
      <p className="mb-3 text-sm text-muted-foreground">
        Calendar UI belongs to agency-ops. This desk logs tasks, meetings, and calls on Contact
        and Policy 360 — it does not run a calendar sync.
      </p>
      <p className="text-sm">
        Open the{" "}
        <Link href="/tasks" className="text-primary hover:underline">
          Tasks
        </Link>{" "}
        list or log a call from a Contact or Policy timeline.
      </p>
    </AppShell>
  );
}
