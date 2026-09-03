import Link from "next/link";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  syncGoogleCalendar,
} from "@/app/actions/connectors";
import { AppShell } from "@/components/app-shell";
import { ActivityForm } from "@/components/ops/activity-form";
import {
  ActivityLogList,
  ActivityStatusActions,
  AssignmentLinks,
  LogCallForm,
  MoveDayForm,
  PhoneButton,
} from "@/components/ops/activity-extras";
import { Notice, StubBanner } from "@/components/ops/stub-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  getActivity,
  getGoogleCalendarConnection,
  listActivities,
  listActivityLogs,
  listRelatedOptions,
} from "@/lib/db/ops-queries";
import { statusLabel } from "@/lib/ops/activity";
import { CalendarLegend, QuickAddLinks } from "@/components/ops/quick-add";
import { ACTIVITY_KIND_LABELS, type ActivityKind } from "@/lib/domain";
import { isActivityKind } from "@/lib/ops/calendar";
import { cn } from "@/lib/utils";
import {
  activitiesOnDay,
  addDays,
  dayHours,
  formatTime,
  formatWhen,
  kindClass,
  monthCells,
  parseDateParam,
  startOfDay,
  toDateParam,
  weekDays,
} from "@/lib/ops/calendar";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = String(params.view ?? "month");
  const date = parseDateParam(typeof params.date === "string" ? params.date : undefined);
  const dateParam = toDateParam(date);
  const activityId = typeof params.activity === "string" ? params.activity : "";
  const creating = params.new === "1" || params.new === "true";
  const kindParam = typeof params.kind === "string" ? params.kind : "";
  const newKind: ActivityKind = isActivityKind(kindParam) ? kindParam : "task";
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  const [items, related, connection, selected] = await Promise.all([
    listActivities(),
    listRelatedOptions(),
    getGoogleCalendarConnection(),
    activityId ? getActivity(activityId) : Promise.resolve(null),
  ]);
  const selectedLogs = selected ? await listActivityLogs(selected.id) : [];
  const selectedContact = selected?.contactId
    ? related.contacts.find((c) => c.id === selected.contactId)
    : undefined;
  const selectedPolicy = selected?.policyId
    ? related.policies.find((p) => p.id === selected.policyId)
    : undefined;

  const href = (next: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    q.set("view", next.view ?? view);
    q.set("date", next.date ?? dateParam);
    if (next.activity) q.set("activity", next.activity);
    if (next.new) q.set("new", next.new);
    if (next.kind) q.set("kind", next.kind);
    return `/calendar?${q.toString()}`;
  };

  const prev =
    view === "day" ? addDays(date, -1) : view === "week" ? addDays(date, -7) : new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const next =
    view === "day" ? addDays(date, 1) : view === "week" ? addDays(date, 7) : new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const label =
    view === "day"
      ? date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
      : view === "week"
        ? `Week of ${weekDays(date)[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const connected = Boolean(connection?.connected);
  const slot = `${dateParam}T09:00`;

  return (
    <AppShell
      title="Calendar"
      actions={
        <QuickAddLinks hrefFor={(kind) => href({ new: "1", kind })} />
      }
    >
      <Notice code={notice} />
      <div className="mb-3 ff-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-navy">Google Calendar</div>
          <p className="text-xs text-muted-foreground">
            {connected
              ? `Connected (stub) · ${connection?.displayEmail ?? "agency@calendar.stub"}`
              : "Not connected"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {connected ? (
            <>
              <form action={syncGoogleCalendar}>
                <input type="hidden" name="direction" value="in" />
                <Button type="submit" size="sm" variant="outline">
                  Sync in
                </Button>
              </form>
              <form action={syncGoogleCalendar}>
                <input type="hidden" name="direction" value="out" />
                <Button type="submit" size="sm" variant="outline">
                  Sync out
                </Button>
              </form>
              <form action={disconnectGoogleCalendar}>
                <Button type="submit" size="sm" variant="ghost">
                  Disconnect
                </Button>
              </form>
            </>
          ) : (
            <form action={connectGoogleCalendar} className="flex items-center gap-2">
              <Button type="submit" size="sm">
                Connect Google Calendar
              </Button>
            </form>
          )}
        </div>
      </div>
      {connected ? (
        <StubBanner>
          Stub-connected only. Sync in/out return not_implemented. FitFirst tasks, calls, meetings,
          SMS, and email still show on this calendar.
        </StubBanner>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href={href({ date: toDateParam(prev) })} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Prev
          </Link>
          <div className="min-w-40 text-sm font-semibold text-navy">{label}</div>
          <Link href={href({ date: toDateParam(next) })} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Next
          </Link>
          <Link href={href({ date: toDateParam(new Date()) })} className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}>
            Today
          </Link>
        </div>
        <div className="flex gap-1">
          {(["month", "week", "day"] as const).map((v) => (
            <Link
              key={v}
              href={href({ view: v })}
              className={cn(buttonVariants({ size: "sm", variant: view === v ? "default" : "outline" }))}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="ff-card overflow-hidden">
          {view === "month" ? (
            <MonthGrid date={date} items={items} href={href} />
          ) : view === "week" ? (
            <WeekGrid date={date} items={items} href={href} />
          ) : (
            <DayGrid date={date} items={items} href={href} />
          )}
        </section>
        <aside className="ff-card p-4">
          {selected ? (
            <div>
              <div className={`mb-2 inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${kindClass(selected.kind)}`}>
                {selected.kind}
              </div>
              <h2 className="text-sm font-semibold text-navy">{selected.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{formatWhen(selected)}</p>
              <p className="mt-1 text-xs">Assignee: {selected.assignee ?? "—"}</p>
              <p className="mt-1 text-xs">Status: {statusLabel(selected.status)}</p>
              <div className="mt-2">
                <AssignmentLinks
                  contactId={selected.contactId}
                  contactName={
                    selectedContact
                      ? `${selectedContact.lastName}, ${selectedContact.firstName}`
                      : null
                  }
                  policyId={selected.policyId}
                  policyNumber={selectedPolicy?.policyNumber}
                  dealId={selected.dealId}
                />
              </div>
              {selected.kind === "call" ? (
                <div className="mt-2">
                  <PhoneButton phone={selectedContact?.phone} />
                </div>
              ) : null}
              {selected.kind === "sms" || selected.kind === "email" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Logged comms only — would send. No{" "}
                  {selected.kind === "sms" ? "Twilio" : "SMTP"}. Same <code>activity_logs</code>{" "}
                  table as the record-page comms logger.
                </p>
              ) : null}
              {selected.notes ? <p className="mt-2 text-sm">{selected.notes}</p> : null}
              <div className="mt-3 space-y-2">
                <ActivityStatusActions activity={selected} returnTo={href({ activity: selected.id })} />
                <MoveDayForm activityId={selected.id} returnTo={href({ activity: selected.id })} />
                {selected.kind === "call" ? (
                  <LogCallForm activityId={selected.id} returnTo={href({ activity: selected.id })} />
                ) : null}
                <Link href={href({})} className="text-xs text-primary hover:underline">
                  Close
                </Link>
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <div className="mb-1 text-xs font-semibold text-navy">Durable log</div>
                <ActivityLogList logs={selectedLogs} />
              </div>
              <div className="mt-4 border-t border-border pt-3">
                <ActivityForm
                  activity={selected}
                  related={related}
                  returnTo={href({ activity: selected.id })}
                  submitLabel="Update"
                />
              </div>
            </div>
          ) : creating ? (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-navy">
                New {ACTIVITY_KIND_LABELS[newKind]}
              </h2>
              <ActivityForm
                related={related}
                defaults={{
                  kind: newKind,
                  startAt: newKind === "meeting" || newKind === "call" ? slot : "",
                  dueAt: newKind === "meeting" || newKind === "call" ? "" : slot,
                }}
                returnTo={href({ date: dateParam })}
                submitLabel={`Create ${ACTIVITY_KIND_LABELS[newKind]}`}
              />
            </div>
          ) : (
            <div>
              <h2 className="text-sm font-semibold text-navy">Desk calendar</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tasks, meetings, calls, SMS, and email are first-class records on contacts and
                policies. This calendar is one surface over the same <code>activities</code> table.
              </p>
              <div className="mt-3">
                <CalendarLegend />
              </div>
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

function MonthGrid({
  date,
  items,
  href,
}: {
  date: Date;
  items: Awaited<ReturnType<typeof listActivities>>;
  href: (next: Record<string, string | undefined>) => string;
}) {
  const cells = monthCells(date);
  const today = startOfDay(new Date());
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border bg-[#f7f9fb] text-[11px] font-semibold text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map(({ date: cell, inMonth }) => {
          const dayItems = activitiesOnDay(items, cell);
          const isToday = toDateParam(cell) === toDateParam(today);
          return (
            <div
              key={toDateParam(cell)}
              className={`min-h-24 border-b border-r border-border p-1 ${inMonth ? "bg-card" : "bg-muted/40"}`}
            >
              <Link
                href={href({ view: "day", date: toDateParam(cell), new: "1", kind: "task" })}
                className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-[11px] ${
                  isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {cell.getDate()}
              </Link>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href={href({ activity: item.id, date: toDateParam(cell) })}
                    className={`block truncate rounded px-1 py-0.5 text-[10px] leading-4 ${kindClass(item.kind)}`}
                  >
                    {item.title}
                  </Link>
                ))}
                {dayItems.length > 3 ? (
                  <div className="px-1 text-[10px] text-muted-foreground">+{dayItems.length - 3} more</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  date,
  items,
  href,
}: {
  date: Date;
  items: Awaited<ReturnType<typeof listActivities>>;
  href: (next: Record<string, string | undefined>) => string;
}) {
  const days = weekDays(date);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-7">
      {days.map((day) => {
        const dayItems = activitiesOnDay(items, day);
        return (
          <div key={toDateParam(day)} className="min-h-48 border-b border-r border-border p-2">
            <Link
              href={href({ view: "day", date: toDateParam(day) })}
              className="mb-2 block text-xs font-semibold text-navy"
            >
              {day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </Link>
            <div className="space-y-1">
              {dayItems.length === 0 ? (
                <Link
                  href={href({ view: "day", date: toDateParam(day), new: "1", kind: "meeting" })}
                  className="text-[11px] text-muted-foreground hover:text-primary"
                >
                  Add…
                </Link>
              ) : (
                dayItems.map((item) => (
                  <Link
                    key={item.id}
                    href={href({ activity: item.id, date: toDateParam(day) })}
                    className={`block rounded px-1.5 py-1 text-[11px] ${kindClass(item.kind)}`}
                  >
                    <div className="font-medium">{item.title}</div>
                    <div className="opacity-80">{formatTime(item.startAt ?? item.dueAt) || item.kind}</div>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayGrid({
  date,
  items,
  href,
}: {
  date: Date;
  items: Awaited<ReturnType<typeof listActivities>>;
  href: (next: Record<string, string | undefined>) => string;
}) {
  const dayItems = activitiesOnDay(items, date);
  const hours = dayHours();
  return (
    <div>
      <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
        {dayItems.length} item{dayItems.length === 1 ? "" : "s"} · click a row to schedule
      </div>
      {hours.map((hour) => {
        const atHour = dayItems.filter((item) => {
          const d = item.startAt ?? item.dueAt;
          return d ? new Date(d).getHours() === hour : false;
        });
        return (
          <div key={hour} className="grid grid-cols-[56px_minmax(0,1fr)] border-b border-border">
            <Link
              href={href({ new: "1", kind: "meeting", date: toDateParam(date) })}
              className="px-2 py-3 text-[11px] text-muted-foreground"
            >
              {hour % 12 === 0 ? 12 : hour % 12}
              {hour < 12 ? "a" : "p"}
            </Link>
            <div className="space-y-1 p-1">
              {atHour.map((item) => (
                <Link
                  key={item.id}
                  href={href({ activity: item.id })}
                  className={`block rounded px-2 py-1 text-xs ${kindClass(item.kind)}`}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
