"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  deleteDeskActivity,
  logDeskActivity,
  rescheduleDeskActivity,
  updateDeskActivity,
} from "@/app/actions/activities-desk";
import { confirmHardDelete } from "@/lib/desk/confirm-hard-delete";
import {
  CompanyMeetingForm,
  type InviteCatalogOption,
} from "@/components/calendar/company-meeting-form";
import { RelatedRecordFields, type RelatedOptions } from "@/components/desk/related-fields";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVITY_COLORS } from "@/lib/desk/comms";
import { cn } from "@/lib/utils";
import { CALL_OUTCOMES } from "@/lib/domain";
import { isCompanyEventType, videoHrefFromEvent, type CompanyEventType } from "@/lib/meetings/company";
import {
  activitiesOnDay,
  activitiesOnView,
  activityAnchor,
  CALENDAR_ADMIN_ADD,
  CALENDAR_TOOLBAR_ROWS,
  CALENDAR_VIEWS,
  dayHours,
  eventHeightPx,
  eventToneColor,
  formatCalendarTitle,
  formatTime,
  kindClass,
  monthCells,
  rescheduleWindow,
  serializeCalendarActivity,
  shiftCalendarAnchor,
  slotStart,
  addMinutesToDateTimeLocal,
  calendarKindNeedsEndRange,
  ensureEndAfterStart,
  toDate,
  toDateParam,
  toDateTimeLocal,
  weekDays,
  type CalendarActivity,
  type CalendarView,
} from "@/lib/ops/calendar";
import { etWallClockParts } from "@/lib/time/et";
import {
  holidayOnDay,
  usFederalHolidaysInRange,
  type UsFederalHoliday,
} from "@/lib/ops/us-federal-holidays";
import type { SerializedBusyBlock } from "@/lib/integrations/calendar-busy";

const KINDS = ["task", "meeting", "call", "email", "sms"] as const;
const KIND_LABELS: Record<(typeof KINDS)[number], string> = {
  task: "Task",
  meeting: "Meeting",
  call: "Call",
  email: "Email",
  sms: "SMS",
};
const HOURS = dayHours(7, 19);
const HOUR_H = 48;

export type CalendarEvent = ReturnType<typeof serializeCalendarActivity>;

function hrefFor(view: CalendarView, date: Date) {
  const params = new URLSearchParams();
  params.set("view", view);
  params.set("date", toDateParam(date));
  return `/calendar?${params.toString()}`;
}

export function DeskCalendar({
  events,
  options,
  initialView,
  initialDate,
  initialKinds = [],
  isAdmin = false,
  offices = [],
  territories = [],
  openEventId = null,
  markSundayNonWorking = true,
  showUsFederalHolidays = true,
  busyBlocks = [],
  meetHelper = false,
  syncControl = null,
}: {
  events: CalendarEvent[];
  options: RelatedOptions;
  initialView: CalendarView;
  initialDate: string;
  initialKinds: string[];
  isAdmin?: boolean;
  offices?: InviteCatalogOption[];
  territories?: InviteCatalogOption[];
  openEventId?: string | null;
  markSundayNonWorking?: boolean;
  showUsFederalHolidays?: boolean;
  busyBlocks?: SerializedBusyBlock[];
  meetHelper?: boolean;
  syncControl?: ReactNode;
}) {
  const router = useRouter();
  void initialKinds; // kinds URL param unused — UI shows all types
  const [view, setView] = useState<CalendarView>(initialView);
  const [anchor, setAnchor] = useState(() => {
    const d = initialDate ? new Date(`${initialDate}T12:00:00`) : new Date();
    return Number.isNaN(d.getTime()) ? new Date() : d;
  });
  const [editing, setEditing] = useState<CalendarEvent | "new" | "company" | "training" | null>(null);
  const [draftKind, setDraftKind] = useState<(typeof KINDS)[number]>("task");
  const [draftStart, setDraftStart] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Always show all kinds — legend is static, no kind filter in the UI.
  const rows = events;

  const onThisView = useMemo(
    () => activitiesOnView(rows, view, anchor),
    [rows, view, anchor],
  );

  const federalHolidays = useMemo(() => {
    if (!showUsFederalHolidays) return [] as UsFederalHoliday[];
    const cells = monthCells(anchor);
    return usFederalHolidaysInRange(cells[0].date, cells[cells.length - 1].date);
  }, [anchor, showUsFederalHolidays]);

  useEffect(() => {
    if (!openEventId) return;
    const match = events.find((row) => row.id === openEventId);
    if (match) setEditing(match);
  }, [openEventId, events]);

  function go(nextView: CalendarView, nextDate: Date) {
    setView(nextView);
    setAnchor(nextDate);
    router.replace(hrefFor(nextView, nextDate), { scroll: false });
  }

  async function dropOn(eventId: string, nextStart: Date) {
    const event = events.find((row) => row.id === eventId);
    if (!event || event.origin === "external") return;
    const window = rescheduleWindow(event, nextStart);
    const form = new FormData();
    form.set("activityId", eventId);
    form.set("startAt", toDateTimeLocal(window.startAt));
    form.set("endAt", toDateTimeLocal(window.endAt));
    setError(null);
    try {
      const result = await rescheduleDeskActivity(form);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setSelectedId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reschedule.");
    }
  }

  function openEvent(event: CalendarEvent) {
    setSelectedId(event.id);
    setEditing(event);
  }

  async function placeOn(day: Date, hour?: number) {
    const next =
      hour == null
        ? (() => {
            const event = events.find((row) => row.id === selectedId);
            const prev = event ? toDate(event.startAt) ?? toDate(event.dueAt) : null;
            const wall = prev ? etWallClockParts(prev) : { hour: 9, minute: 0 };
            return new Date(day.getFullYear(), day.getMonth(), day.getDate(), wall.hour, wall.minute);
          })()
        : slotStart(day, hour);
    if (selectedId) {
      await dropOn(selectedId, next);
      return;
    }
    openNew(next);
  }

  function openNew(start?: Date, kind: (typeof KINDS)[number] = "task") {
    setDraftStart(start ? toDateTimeLocal(start) : "");
    setDraftKind(kind);
    setEditing("new");
  }

  const week = weekDays(anchor);
  const title = formatCalendarTitle(view, anchor);

  const addEventMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            className="h-9 gap-1.5 bg-navy !px-5 text-sm font-semibold text-white hover:bg-navy/90 hover:text-white"
          />
        }
      >
        {CALENDAR_TOOLBAR_ROWS[1][0]}
        <ChevronDown className="size-4 opacity-90" data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {KINDS.map((kind, index) => (
          <DropdownMenuItem
            key={kind}
            onClick={() => openNew(undefined, kind)}
          >
            <span
              className="mr-1.5 inline-block size-2.5 rounded-sm"
              style={{ background: ACTIVITY_COLORS[kind] }}
              aria-hidden
            />
            {CALENDAR_TOOLBAR_ROWS[1][index + 1]}
          </DropdownMenuItem>
        ))}
        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setDraftStart("");
                setEditing("company");
              }}
            >
              {CALENDAR_ADMIN_ADD[0]}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setDraftStart("");
                setEditing("training");
              }}
            >
              {CALENDAR_ADMIN_ADD[1]}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-1" data-ff-calendar-toolbar-wrap="">
      <nav
        aria-label="Calendar toolbar"
        className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
        data-ff-calendar-toolbar-offset=""
      >
        <div className="flex flex-wrap items-center gap-1" data-calendar-toolbar="view">
          {CALENDAR_VIEWS.map((v, index) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={view === v ? "default" : "outline"}
              onClick={() => go(v, anchor)}
            >
              {CALENDAR_TOOLBAR_ROWS[0][index]}
            </Button>
          ))}
        </div>
        <div
          className="flex flex-wrap items-center justify-center gap-0.5"
          data-calendar-toolbar="date"
        >
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="size-8 px-0"
            aria-label={view === "month" ? "Previous month" : view === "week" ? "Previous week" : "Previous day"}
            onClick={() => go(view, shiftCalendarAnchor(view, anchor, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="min-w-[9rem] px-1 text-center text-lg font-semibold tracking-tight text-navy sm:min-w-[12rem] sm:text-xl">
            {title}
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="size-8 px-0"
            aria-label={view === "month" ? "Next month" : view === "week" ? "Next week" : "Next day"}
            onClick={() => go(view, shiftCalendarAnchor(view, anchor, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            type="button"
            className="ml-1.5 h-10 rounded-full bg-navy px-5 text-base font-semibold text-white shadow-sm hover:bg-navy/90 hover:text-white"
            onClick={() => go(view, new Date())}
          >
            Today
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1" data-calendar-toolbar="sync">
          {syncControl}
        </div>
      </nav>

      <WeekAheadStrip
        anchor={anchor}
        rows={rows}
        activeDay={view === "day" ? anchor : null}
        onPickDay={(day) => go("day", day)}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {selectedId ? (
        <button type="button" className="text-xs text-navy underline" onClick={() => setSelectedId(null)}>
          clear
        </button>
      ) : null}

      <div className="-mt-0.5 mb-0 flex flex-wrap items-end justify-between gap-1 py-0.5">
        <div className="flex flex-wrap items-center gap-2" aria-label="Color legend">
          <span className="text-xs font-semibold text-muted-foreground">Color legend.</span>
          {KINDS.map((kind) => (
            <span key={kind} className="inline-flex items-center gap-1.5 text-xs text-navy">
              <span
                className="inline-block size-2.5 rounded-sm"
                style={{ background: ACTIVITY_COLORS[kind] }}
                aria-hidden
              />
              {KIND_LABELS[kind]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-xs text-navy">
            <span className="inline-block size-2.5 rounded-sm" style={{ background: "#0f766e" }} aria-hidden />
            Google
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-navy">
            <span className="inline-block size-2.5 rounded-sm" style={{ background: "#0f4c81" }} aria-hidden />
            Outlook
          </span>
        </div>
        <div
          className="-mt-3 mb-0.5 flex items-center gap-1 self-start"
          data-calendar-toolbar="add-above-grid"
        >
          {addEventMenu}
        </div>
      </div>

      {view === "month" ? (
        <MonthGrid
          anchor={anchor}
          rows={rows}
          dragging={dragging}
          onDragStart={setDragging}
          onDropDay={(id, day) => {
            const event = events.find((row) => row.id === id);
            const prev = event ? toDate(event.startAt) ?? toDate(event.dueAt) : null;
            const wall = prev ? etWallClockParts(prev) : { hour: 9, minute: 0 };
            const next = new Date(
              day.getFullYear(),
              day.getMonth(),
              day.getDate(),
              wall.hour,
              wall.minute,
            );
            void dropOn(id, next);
            setDragging(null);
          }}
          selectedId={selectedId}
          onSelect={openEvent}
          onEmpty={(day) => void placeOn(day)}
          markSundayNonWorking={markSundayNonWorking}
          holidays={federalHolidays}
          busyBlocks={busyBlocks}
        />
      ) : (
        <TimeGrid
          days={view === "day" ? [anchor] : week}
          rows={rows}
          dragging={dragging}
          selectedId={selectedId}
          onDragStart={setDragging}
          onDropSlot={(id, day, hour) => {
            void dropOn(id, slotStart(day, hour));
            setDragging(null);
          }}
          onSelect={openEvent}
          onEmpty={(day, hour) => void placeOn(day, hour)}
          busyBlocks={busyBlocks}
        />
      )}

      {view !== "month" ? (
        <section className="ff-card overflow-x-auto">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
            On this view
          </div>
          {onThisView.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Nothing on this {view}.</p>
          ) : (
            <ul className="divide-y divide-border">
              {onThisView.slice(0, 12).map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <span
                    className="rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white"
                    style={{ background: eventToneColor(row) }}
                  >
                    {isCompanyEventType(row.meetingType) ? row.meetingType : row.kind}
                  </span>
                  <span className="font-medium text-navy">{row.title}</span>
                  <span className="text-xs text-muted-foreground">{formatTime(row.startAt ?? row.dueAt)}</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => openEvent(serializeCalendarActivity(row))}>
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {editing === "company" || editing === "training" || (editing && editing !== "new" && isCompanyEventType(editing.meetingType)) ? (
        <CompanyMeetingForm
          event={editing === "company" || editing === "training" ? null : editing}
          isAdmin={isAdmin}
          defaultType={(editing === "training" || (typeof editing === "object" && editing.meetingType === "training")
            ? "training"
            : "company") as CompanyEventType}
          defaultStart={draftStart}
          offices={offices}
          territories={territories}
          meetHelper={meetHelper}
          onClose={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : editing ? (
        <CalendarEditor
          event={editing === "new" ? null : editing}
          options={options}
          defaultStart={draftStart}
          defaultKind={draftKind}
          meetHelper={meetHelper}
          returnTo={hrefFor(view, anchor)}
          onClose={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function WeekAheadStrip({
  anchor,
  rows,
  activeDay,
  onPickDay,
}: {
  anchor: Date;
  rows: CalendarActivity[];
  activeDay: Date | null;
  onPickDay: (day: Date) => void;
}) {
  const days = weekDays(anchor);
  return (
    <div
      className="mt-0 mb-0 flex flex-col items-center gap-0.5 overflow-visible"
      aria-label="This week"
      data-ff-calendar-week-tiles=""
      style={{ overflow: "visible" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-navy/70">This week</p>
      <div
        className="inline-flex flex-wrap items-end justify-center gap-4 overflow-visible pb-1 sm:gap-[1.15rem]"
        style={{ overflow: "visible" }}
      >
        {days.map((day) => {
          const items = activitiesOnDay(rows, day);
          const count = items.length;
          const isActive =
            activeDay != null &&
            day.getFullYear() === activeDay.getFullYear() &&
            day.getMonth() === activeDay.getMonth() &&
            day.getDate() === activeDay.getDate();
          const hasEvents = count > 0;
          return (
            <button
              key={toDateParam(day)}
              type="button"
              onClick={() => onPickDay(day)}
              className="group flex w-[5.5rem] flex-col items-center gap-1 overflow-visible text-center"
              style={{ overflow: "visible" }}
              title={`Open ${day.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`}
              data-ff-week-tile={toDateParam(day)}
              data-ff-week-count={count}
            >
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-wide",
                  isActive ? "text-navy" : "text-muted-foreground",
                )}
              >
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span
                className="relative inline-flex overflow-visible"
                style={{ overflow: "visible", width: 72, height: 72 }}
              >
                <span
                  data-ff-week-square=""
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    border: isActive
                      ? "2.5px solid #002868"
                      : hasEvents
                        ? "2.5px solid rgba(0,40,104,0.55)"
                        : "2.5px solid rgba(0,40,104,0.28)",
                    background: isActive
                      ? "#002868"
                      : hasEvents
                        ? "#ffffff"
                        : "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
                    color: isActive ? "#ffffff" : "#002868",
                    boxShadow: isActive
                      ? "0 6px 14px rgba(0,40,104,0.4), 0 2px 4px rgba(0,0,0,0.2)"
                      : "0 5px 12px rgba(0,40,104,0.2), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.95)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 600,
                    position: "absolute",
                    left: 0,
                    top: 0,
                    transition: "transform 150ms ease-out, box-shadow 150ms ease-out, background 150ms ease-out, border-color 150ms ease-out",
                  }}
                  className="group-hover:-translate-y-1 group-hover:scale-[1.08]"
                >
                  {day.getDate()}
                </span>
                {hasEvents ? (
                  <span
                    style={{
                      minWidth: 24,
                      height: 24,
                      borderRadius: 8,
                      right: 0,
                      bottom: 0,
                      background: "#BF0A30",
                      boxShadow: "0 3px 8px rgba(191,10,48,0.5), 0 1px 2px rgba(0,0,0,0.25)",
                    }}
                    className="absolute z-20 inline-flex items-center justify-center border-2 border-white px-1 text-xs font-bold tabular-nums leading-none text-white"
                    aria-label={`${count} events`}
                    data-ff-week-counter=""
                  >
                    {count}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({
  anchor,
  rows,
  dragging,
  selectedId,
  onDragStart,
  onDropDay,
  onSelect,
  onEmpty,
  markSundayNonWorking = true,
  holidays = [],
  busyBlocks = [],
}: {
  anchor: Date;
  rows: CalendarActivity[];
  dragging: string | null;
  selectedId: string | null;
  onDragStart: (id: string) => void;
  onDropDay: (id: string, day: Date) => void;
  onSelect: (event: CalendarEvent) => void;
  onEmpty: (day: Date) => void;
  markSundayNonWorking?: boolean;
  holidays?: UsFederalHoliday[];
  busyBlocks?: SerializedBusyBlock[];
}) {
  const cells = monthCells(anchor);
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border text-center text-[11px] font-semibold uppercase">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, index) => {
          const weekend = index === 0 || index === 6;
          return (
            <div
              key={d}
              className="px-1 py-1.5"
              style={
                weekend
                  ? { background: "#fce8ec", color: "#9f1239" }
                  : { background: "#e8f6ee", color: "#166534" }
              }
            >
              {d}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const items = activitiesOnDay(rows, cell.date);
          const dayBusy = busyBlocks.filter((block) => {
            const start = new Date(block.startAt);
            return (
              start.getFullYear() === cell.date.getFullYear() &&
              start.getMonth() === cell.date.getMonth() &&
              start.getDate() === cell.date.getDate()
            );
          });
          const isSunday = cell.date.getDay() === 0;
          const sundayTint = markSundayNonWorking && isSunday;
          const holiday = holidayOnDay(holidays, cell.date);
          const now = new Date();
          const isToday =
            cell.date.getFullYear() === now.getFullYear() &&
            cell.date.getMonth() === now.getMonth() &&
            cell.date.getDate() === now.getDate();
          return (
            <div
              key={toDateParam(cell.date)}
              data-calendar-sunday={sundayTint ? "1" : undefined}
              data-calendar-today={isToday ? "1" : undefined}
              className={cn(
                "relative min-h-40 border-b border-r border-border p-1",
                holiday
                  ? "bg-[linear-gradient(135deg,rgba(0,40,104,0.10)_0%,rgba(255,255,255,0.9)_45%,rgba(191,10,48,0.10)_100%)]"
                  : cell.inMonth
                    ? sundayTint
                      ? "bg-muted/55"
                      : "bg-card"
                    : sundayTint
                      ? "bg-muted/40"
                      : "bg-secondary/40",
                isToday && "z-[1] ring-2 ring-inset ring-navy/45",
                dragging && "outline-dashed outline-1 outline-primary/40",
              )}
              style={
                isToday
                  ? {
                      boxShadow: "inset 0 0 0 2px rgba(0, 40, 104, 0.42)",
                    }
                  : undefined
              }
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/activity-id");
                if (id) onDropDay(id, cell.date);
              }}
              onDoubleClick={() => onEmpty(cell.date)}
            >
              <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <span
                  className={cn(
                    cell.inMonth && "text-navy",
                    isToday &&
                      "inline-flex size-6 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white shadow-sm",
                  )}
                >
                  {cell.date.getDate()}
                </span>
                {isToday ? (
                  <span className="rounded-sm bg-navy/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-navy">
                    Today
                  </span>
                ) : null}
              </div>
              {holiday ? (
                <div
                  className="mb-0.5 truncate rounded-sm px-1 py-0.5 text-left text-[10px] font-semibold leading-tight"
                  style={{
                    background: "linear-gradient(90deg, #002868 0%, #002868 55%, #BF0A30 100%)",
                    color: "#ffffff",
                    textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                  }}
                  title={holiday.name}
                  data-ff-calendar-holiday={holiday.name}
                >
                  ★ {holiday.name.replace(" (Observed)", "")} ★
                </div>
              ) : null}
              <div className="space-y-0.5">
                {dayBusy.slice(0, 2).map((block) => (
                  <div
                    key={block.id}
                    className="truncate rounded-sm bg-muted px-1 py-0.5 text-left text-[10px] font-medium text-muted-foreground"
                    title={`${block.title} · ${block.provider}`}
                    data-ff-calendar-busy={block.provider}
                  >
                    {block.title || "Busy"}
                  </div>
                ))}
                {items.slice(0, 4).map((item) => (
                  <EventChip
                    key={item.id}
                    event={item}
                    selected={selectedId === item.id}
                    onDragStart={onDragStart}
                    onSelect={onSelect}
                  />
                ))}
                {items.length > 4 ? (
                  <div className="text-[10px] text-muted-foreground">+{items.length - 4} more</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeGrid({
  days,
  rows,
  dragging,
  selectedId,
  onDragStart,
  onDropSlot,
  onSelect,
  onEmpty,
  busyBlocks = [],
}: {
  days: Date[];
  rows: CalendarActivity[];
  dragging: string | null;
  selectedId: string | null;
  onDragStart: (id: string) => void;
  onDropSlot: (id: string, day: Date, hour: number) => void;
  onSelect: (event: CalendarEvent) => void;
  onEmpty: (day: Date, hour: number) => void;
  busyBlocks?: SerializedBusyBlock[];
}) {
  const singleDay = days.length === 1;
  const gridStart = HOURS[0];
  const totalH = HOURS.length * HOUR_H;

  return (
    <div
      className="overflow-x-auto rounded-md border border-border bg-card"
            aria-label={singleDay ? "Day time grid" : "Week time grid"}
    >
      <div
        className={cn("grid", singleDay ? "min-w-[320px]" : "min-w-[720px]")}
        style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div className="border-b border-r border-border" />
        {days.map((day) => (
          <div key={toDateParam(day)} className="border-b border-r border-border px-2 py-1.5 text-center">
            <div className="text-[11px] uppercase text-muted-foreground">
              {day.toLocaleDateString("en-US", { weekday: "short" })}
            </div>
            <div className="text-sm font-semibold text-navy">{day.getDate()}</div>
          </div>
        ))}

        <div className="relative border-r border-border">
          {HOURS.map((hour) => {
            const label = new Date(2026, 0, 1, hour).toLocaleTimeString("en-US", {
              hour: "numeric",
            });
            return (
              <div
                key={hour}
                className="border-b border-border px-1 text-right text-[11px] text-muted-foreground"
                style={{ height: HOUR_H }}
              >
                <span className="-mt-2 inline-block">{label}</span>
              </div>
            );
          })}
        </div>

        {days.map((day) => {
          const dayItems = activitiesOnDay(rows, day).filter((item) => {
            const start = activityAnchor(item);
            if (!start) return false;
            const h = etWallClockParts(start).hour;
            return h >= gridStart && h <= HOURS[HOURS.length - 1];
          });
          return (
            <div
              key={`col-${toDateParam(day)}`}
              className={cn("relative border-r border-border", dragging ? "bg-primary/5" : "")}
              style={{ height: totalH }}
            >
              {HOURS.map((hour) => (
                <div
                  key={`${toDateParam(day)}-${hour}`}
                  className="absolute inset-x-0 border-b border-border"
                  style={{ top: (hour - gridStart) * HOUR_H, height: HOUR_H }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/activity-id");
                    if (id) onDropSlot(id, day, hour);
                  }}
                  onDoubleClick={() => onEmpty(day, hour)}
                />
              ))}
              {busyBlocks
                .filter((block) => {
                  const start = new Date(block.startAt);
                  return (
                    start.getFullYear() === day.getFullYear() &&
                    start.getMonth() === day.getMonth() &&
                    start.getDate() === day.getDate()
                  );
                })
                .map((block) => {
                  const start = new Date(block.startAt);
                  const end = new Date(block.endAt);
                  const top =
                    (etWallClockParts(start).hour - gridStart) * HOUR_H + (etWallClockParts(start).minute / 60) * HOUR_H;
                  const minutes = Math.max(15, (end.getTime() - start.getTime()) / 60000);
                  return (
                    <div
                      key={block.id}
                      className="pointer-events-none absolute inset-x-1 z-[5] overflow-hidden rounded-sm bg-muted/80 px-1 py-0.5 text-left text-[10px] font-medium text-muted-foreground"
                      style={{ top, height: Math.max((minutes / 60) * HOUR_H, 16) }}
                      data-ff-calendar-busy={block.provider}
                    >
                      {block.title || "Busy"}
                    </div>
                  );
                })}
                {dayItems.map((item) => {
                const start = activityAnchor(item);
                if (!start) return null;
                const top =
                  (etWallClockParts(start).hour - gridStart) * HOUR_H +
                  (etWallClockParts(start).minute / 60) * HOUR_H;
                const height = Math.min(eventHeightPx(item, HOUR_H), HOUR_H * 4);
                const external = item.origin === "external";
                return (
                  <button
                    key={item.id}
                    type="button"
                    draggable={!external}
                    onDragStart={(e) => {
                      if (external) return;
                      e.dataTransfer.setData("text/activity-id", item.id);
                      e.dataTransfer.effectAllowed = "move";
                      onDragStart(item.id);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(serializeCalendarActivity(item));
                    }}
                    className={cn(
                      "absolute inset-x-1 z-10 overflow-hidden rounded-sm px-1 py-0.5 text-left text-[11px] font-medium text-white",
                      kindClass(item.kind, item.meetingType),
                      external && "ring-1 ring-white/70",
                      selectedId === item.id && "ring-2 ring-white",
                    )}
                    style={{
                      top,
                      height: Math.max(height, 18),
                      background: eventToneColor(item),
                    }}
                    title={`${item.title} · ${formatTime(item.startAt ?? item.dueAt)}${external ? " · External" : ""}`}
                    data-ff-calendar-origin={item.origin ?? "fitfirst"}
                    data-ff-calendar-provider={item.calendarProvider ?? undefined}
                  >
                    <span className="block truncate">
                      {external ? `${item.calendarProvider === "outlook_calendar" ? "O" : "G"} · ` : ""}
                      {item.title}
                    </span>
                    <span className="block text-[10px] opacity-80">
                      {formatTime(item.startAt ?? item.dueAt)}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventChip({
  event,
  selected,
  onDragStart,
  onSelect,
}: {
  event: CalendarActivity;
  selected?: boolean;
  onDragStart: (id: string) => void;
  onSelect: (event: CalendarEvent) => void;
}) {
  const external = event.origin === "external";
  return (
    <button
      type="button"
      draggable={!external}
      onDragStart={(e) => {
        if (external) return;
        e.dataTransfer.setData("text/activity-id", event.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(event.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(serializeCalendarActivity(event));
      }}
      className={`block w-full truncate rounded-sm px-1 py-0.5 text-left text-[10px] font-medium text-white ${selected ? "ring-2 ring-navy" : ""}`}
      style={{ background: eventToneColor(event) }}
      data-ff-calendar-origin={event.origin ?? "fitfirst"}
      data-ff-calendar-provider={event.calendarProvider ?? undefined}
    >
      {external ? `${event.calendarProvider === "outlook_calendar" ? "O" : "G"} · ` : ""}
      {formatTime(event.startAt ?? event.dueAt)} {event.title}
    </button>
  );
}

function CalendarEditor({
  event,
  options,
  defaultStart,
  defaultKind = "task",
  meetHelper = false,
  returnTo = "/calendar",
  onClose,
}: {
  event: CalendarEvent | null;
  options: RelatedOptions;
  defaultStart: string;
  defaultKind?: (typeof KINDS)[number];
  meetHelper?: boolean;
  returnTo?: string;
  onClose: () => void;
}) {
  const isNew = !event;
  const external = event?.origin === "external";
  const [error, setError] = useState<string | null>(null);
  const initialStart = toDateTimeLocal(event?.startAt ?? event?.dueAt) || defaultStart;
  const initialEnd =
    toDateTimeLocal(event?.endAt) ||
    (initialStart ? addMinutesToDateTimeLocal(initialStart, 30) : "");
  const [kind, setKind] = useState<(typeof KINDS)[number]>(
    (event?.kind as (typeof KINDS)[number] | undefined) ?? defaultKind,
  );
  const [startAt, setStartAt] = useState(initialStart);
  const [endAt, setEndAt] = useState(initialEnd);
  const showEnd = calendarKindNeedsEndRange(kind);
  const providerLabel = event?.calendarProvider === "outlook_calendar" ? "Outlook" : "Google";

  function onStartChange(next: string) {
    setStartAt(next);
    setEndAt((prev) => ensureEndAfterStart(next, prev));
  }

  function onKindChange(next: (typeof KINDS)[number]) {
    setKind(next);
    if (calendarKindNeedsEndRange(next)) {
      setEndAt((prev) => ensureEndAfterStart(startAt, prev));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy">
            {isNew ? "New on calendar" : external ? `${providerLabel} event` : "Edit activity"}
          </h3>
          <Button type="button" size="xs" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        {external && event ? (
          <div className="grid gap-2" data-ff-calendar-external-detail="">
            <p className="text-sm font-medium text-navy">{event.title}</p>
            <p className="text-sm text-muted-foreground">
              {formatTime(event.startAt)} – {formatTime(event.endAt)} · {providerLabel}
              {event.calendarVisibility === "private" || event.calendarVisibility === "confidential"
                ? " · Private"
                : ""}
            </p>

            {event.calendarHtmlLink ? (
              <a
                href={event.calendarHtmlLink}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                Open in {providerLabel} Calendar
              </a>
            ) : null}
            <div className="flex justify-end">
              <Button type="button" size="sm" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
        <form
          action={async (formData) => {
            setError(null);
            const contactId = String(formData.get("contactId") ?? "").trim();
            const accountId = String(formData.get("accountId") ?? "").trim();
            const policyId = String(formData.get("policyId") ?? "").trim();
            const leadId = String(formData.get("leadId") ?? "").trim();
            const dealId = String(formData.get("dealId") ?? "").trim();
            if (!contactId && !accountId && !policyId && !leadId && !dealId) {
              setError(
                "Task, meeting, and call must assign to a Deal, Contact, Policy, Business, and/or Lead.",
              );
              return;
            }
            const startValue = String(formData.get("startAt") ?? "").trim() || startAt;
            const endValue = ensureEndAfterStart(
              startValue,
              String(formData.get("endAt") ?? "").trim() || endAt,
            );
            if (startValue) formData.set("startAt", startValue);
            if (endValue) formData.set("endAt", endValue);
            // Tasks/email/sms hang on dueAt; keep calendar Start as the due time.
            if (!calendarKindNeedsEndRange(String(formData.get("kind") ?? kind)) && startValue) {
              formData.set("dueAt", startValue);
            }
            try {
              if (isNew) {
                const result = await logDeskActivity(formData);
                if (result && typeof result === "object" && "error" in result && result.error) {
                  setError(String(result.error));
                  return;
                }
              } else {
                const result = await updateDeskActivity(formData);
                if (result && typeof result === "object" && "error" in result && result.error) {
                  setError(String(result.error));
                  return;
                }
              }
              onClose();
            } catch (err) {
              // updateDeskActivity may flashAction → redirect(); never swallow it.
              const digest =
                err && typeof err === "object" && "digest" in err
                  ? String((err as { digest?: unknown }).digest ?? "")
                  : "";
              if (digest.startsWith("NEXT_REDIRECT")) throw err;
              const message = err instanceof Error ? err.message : "Could not save that event.";
              setError(
                /Minified React error #441|Server Components render/i.test(message)
                  ? "Task, meeting, and call must assign to a Deal, Contact, Policy, Business, and/or Lead."
                  : message,
              );
            }
          }}
          className="grid gap-2 sm:grid-cols-2"
        >
          {event ? <input type="hidden" name="activityId" value={event.id} /> : null}
          <input type="hidden" name="returnTo" value={returnTo} />
          <div>
            <Label className="text-xs">Type</Label>
            <select
              name="kind"
              value={kind}
              onChange={(e) => onKindChange(e.target.value as (typeof KINDS)[number])}
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k[0].toUpperCase() + k.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Title</Label>
            <Input name="title" required defaultValue={event?.title ?? ""} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Start</Label>
            <Input
              name="startAt"
              type="datetime-local"
              value={startAt}
              onChange={(e) => onStartChange(e.target.value)}
              className="mt-1 h-8"
            />
          </div>
          {showEnd ? (
            <div>
              <Label className="text-xs">End</Label>
              <Input
                name="endAt"
                type="datetime-local"
                value={endAt}
                min={startAt || undefined}
                onChange={(e) => setEndAt(ensureEndAfterStart(startAt, e.target.value))}
                className="mt-1 h-8"
              />
            </div>
          ) : (
            <input type="hidden" name="endAt" value={ensureEndAfterStart(startAt, endAt)} />
          )}
          <div>
            <Label className="text-xs">Status</Label>
            <select
              name="status"
              defaultValue={event?.status ?? "open"}
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            >
              <option value="open">Open</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Duration (min, calls)</Label>
            <Input
              name="durationMinutes"
              type="number"
              min="1"
              defaultValue={event?.durationSeconds ? String(Math.round(event.durationSeconds / 60)) : ""}
              className="mt-1 h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Call outcome</Label>
            <select
              name="outcome"
              defaultValue={event?.outcome ?? ""}
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            >
              <option value="">None</option>
              {CALL_OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {o.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <RelatedRecordFields
            options={options}
            defaults={{
              contactId: event?.contactId,
              accountId: event?.accountId,
              policyId: event?.policyId,
              dealId: event?.dealId,
              leadId: event?.leadId,
              assignee: event?.assignee,
            }}
          />
          <div className="sm:col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea name="notes" defaultValue={event?.notes ?? ""} className="mt-1 min-h-16" />
          </div>
          {meetHelper && isNew ? (
            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-navy">
              <input type="checkbox" name="addGoogleMeet" value="1" className="size-4" />
              Add Google Meet link
            </label>
          ) : null}
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="ignoreBusy" value="1" className="size-4" />
            Book over external busy
          </label>
          {error ? <p className="sm:col-span-2 text-sm text-destructive">{error}</p> : null}
          {event && videoHrefFromEvent(event) ? (
            <div className="sm:col-span-2">
              <a
                href={videoHrefFromEvent(event)!}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                Open video
              </a>
            </div>
          ) : null}
          <div className="sm:col-span-2 flex flex-wrap justify-end gap-2">
            {!isNew ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mr-auto text-destructive"
                onClick={async () => {
                  if (!confirmHardDelete("this event")) return;
                  const form = new FormData();
                  form.set("activityId", event.id);
                  await deleteDeskActivity(form);
                  onClose();
                }}
              >
                Delete event
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {isNew ? "Add to desk" : "Save"}
            </Button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
