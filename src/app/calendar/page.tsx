import Link from "next/link";
import { logDeskActivity } from "@/app/actions/activities-desk";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVITY_COLORS } from "@/lib/desk/comms";
import { formatDay } from "@/lib/domain";
import { listCalendarActivities } from "@/lib/db/queries";
import { listRelatedOptions } from "@/lib/db/activity-queries";
import { DESK_AS_OF, addUtcDays } from "@/lib/home/as-of";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const from = DESK_AS_OF;
  const to = addUtcDays(from, 14);
  const [rows, options] = await Promise.all([listCalendarActivities(from, to), listRelatedOptions()]);
  const items = rows.filter((row) => {
    const when = row.startAt ?? row.dueAt;
    if (!when) return row.status === "open";
    return when >= addUtcDays(from, -7) && when <= to;
  });

  return (
    <AppShell title="Calendar">
      <p className="mb-3 text-sm text-muted-foreground">
        Desk activities only — Google Calendar stays a stub. Color is by type. Quick-add writes
        the same durable log as Contact and Policy records.
      </p>
      <form action={logDeskActivity} className="mb-4 grid gap-2 rounded-md border border-border bg-card p-3 sm:grid-cols-4">
        <div>
          <Label className="text-xs">Type</Label>
          <select name="kind" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm" defaultValue="task">
            <option value="task">Task</option>
            <option value="meeting">Meeting</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Title</Label>
          <Input name="title" required className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">When</Label>
          <Input name="startAt" type="datetime-local" className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Contact</Label>
          <select name="contactId" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
            <option value="">—</option>
            {options.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lastName}, {c.firstName}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm">
          Quick add
        </Button>
      </form>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing scheduled this desk window.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm">
              <span
                className="rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase text-white"
                style={{ background: ACTIVITY_COLORS[row.kind] ?? "#5c6b7a" }}
              >
                {row.kind}
              </span>
              <span className="font-medium text-navy">{row.title}</span>
              <span className="text-xs text-muted-foreground">
                {formatDay(row.startAt ?? row.dueAt)} · {row.status}
              </span>
              {row.contactId ? (
                <Link href={`/contacts/${row.contactId}`} className="text-xs text-primary hover:underline">
                  Contact
                </Link>
              ) : null}
              {row.policyId ? (
                <Link href={`/policies/${row.policyId}`} className="text-xs text-primary hover:underline">
                  Policy
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </AppShell>
  );
}
