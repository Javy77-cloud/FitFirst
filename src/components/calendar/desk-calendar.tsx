"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteDeskActivity,
  logDeskActivity,
  rescheduleDeskActivity,
  updateDeskActivity,
} from "@/app/actions/activities-desk";
import {
  CompanyMeetingForm,
  type InviteCatalogOption,
} from "@/components/calendar/company-meeting-form";
import { RelatedRecordFields, type RelatedOptions } from "@/components/desk/related-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVITY_COLORS } from "@/lib/desk/comms";
import { CALL_OUTCOMES } from "@/lib/domain";
import { isCompanyEventType, videoHrefFromEvent, type CompanyEventType } from "@/lib/meetings/company";
import {
  activitiesOnDay,
  addDays,
  addMonths,
  dayHours,
  eventHeightPx,
  eventToneColor,
  filterCalendarActivities,
  formatTime,
  kindClass,
  monthCells,
  rescheduleWindow,
  serializeCalendarActivity,
  slotStart,
  startOfWeek,
  toDate,
  toDateParam,
  toDateTimeLocal,
  weekDays,
  type CalendarActivity,
  type CalendarView,
} from "@/lib/ops/calendar";

const KINDS = ["task", "meeting", "call", "email", "sms"] as const;
const HOURS = dayHours(7, 19);
const HOUR_H = 48;

export type CalendarEvent = ReturnType<typeof serializeCalendarActivity>;

function hrefFor(view: CalendarView, date: Date, kinds: string[]) {
  const params = new URLSearchParams();
  params.set("view", view);
  params.set("date", toDateParam(date));
  if (kinds.length && kinds.length < KINDS.length) params.set("kinds", kinds.join(","));
  return `/calendar?${params.toString()}`;
}

export function DeskCalendar({
  events,
  options,
  initialView,
  initialDate,
  initialKinds,
  isAdmin = false,
  offices = [],
  territories = [],
  openEventId = null,
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
}) {
  const router = useRouter();
  const [view, setView] = useState<CalendarView>(initialView);
  const [anchor, setAnchor] = useState(() => {
    const d = initialDate ? new Date(`${initialDate}T12:00:00`) : new Date();
    return Number.isNaN(d.getTime()) ? new Date() : d;
  });
  const [kinds, setKinds] = useState<string[]>(initialKinds.length ? initialKinds : [...KINDS]);
  const [editing, setEditing] = useState<CalendarEvent | "new" | "company" | "training" | null>(null);
  const [draftKind, setDraftKind] = useState<(typeof KINDS)[number]>("task");
  const [draftStart, setDraftStart] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(
    () => filterCalendarActivities(events, { kinds }),
    [events, kinds],
  );

  useEffect(() => {
    if (!openEventId) return;
    const match = events.find((row) => row.id === openEventId);
    if (match) setEditing(match);
  }, [openEventId, events]);

  function go(nextView: CalendarView, nextDate: Date, nextKinds = kinds) {
    setView(nextView);
    setAnchor(nextDate);
    router.replace(hrefFor(nextView, nextDate, nextKinds), { scroll: false });
  }

  function toggleKind(kind: string) {
    const next = kinds.includes(kind) ? kinds.filter((k) => k !== kind) : [...kinds, kind];
    const resolved = next.length ? next : [...KINDS];
    setKinds(resolved);
    router.replace(hrefFor(view, anchor, resolved), { scroll: false });
  }

  async function dropOn(eventId: string, nextStart: Date) {
    const event = events.find((row) => row.id === eventId);
    if (!event) return;
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
            return new Date(day.getFullYear(), day.getMonth(), day.getDate(), prev?.getHours() ?? 9, prev?.getMinutes() ?? 0);
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
  const title =
    view === "day"
      ? anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
      : view === "week"
        ? `${week[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${week[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              go(view, view === "month" ? addMonths(anchor, -1) : addDays(anchor, view === "day" ? -1 : -7))
            }
          >
            {view === "month" ? "Previous month" : view === "week" ? "Previous week" : "Previous day"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => go(view, new Date())}>
            Today
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              go(view, view === "month" ? addMonths(anchor, 1) : addDays(anchor, view === "day" ? 1 : 7))
            }
          >
            {view === "month" ? "Next month" : view === "week" ? "Next week" : "Next day"}
          </Button>
          <h2 className="ml-2 text-sm font-semibold text-navy">{title}</h2>
        </div>
        <div className="flex flex-wrap gap-1">
          {(["month", "week", "day"] as const).map((v) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={view === v ? "default" : "outline"}
              onClick={() => go(v, anchor)}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </Button>
          ))}
          <Button type="button" size="sm" onClick={() => openNew()}>
            + Add event
          </Button>
          {isAdmin ? (
            <>
              <Button
                type="button"
                size="sm"
                className="bg-fit-flag text-white hover:bg-fit-flag/90"
                onClick={() => {
                  setDraftStart("");
                  setEditing("company");
                }}
              >
                + Company meeting
              </Button>
              <Button type="button" size="sm" onClick={() => {
                setDraftStart("");
                setEditing("training");
              }}>
                + Training
              </Button>
            </>
          ) : null}
          {KINDS.map((kind) => (
            <Button
              key={kind}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => openNew(undefined, kind)}
            >
              + {kind[0].toUpperCase() + kind.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {KINDS.map((kind) => (
          <label key={kind} className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={kinds.includes(kind)}
              onChange={() => toggleKind(kind)}
            />
            <span
              className="rounded-sm px-1.5 py-0.5 font-semibold uppercase text-white"
              style={{ background: ACTIVITY_COLORS[kind] }}
            >
              {kind}
            </span>
          </label>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <p className="text-xs text-muted-foreground">
        Click a chip to edit. Drag it, or select it and click an empty day/hour to reschedule. Color
        is by type — same log as Contact and Policy 360.
      </p>
      {selectedId ? (
        <p className="text-xs text-navy">
          Selected — click an empty slot to move it, or{" "}
          <button type="button" className="underline" onClick={() => setSelectedId(null)}>
            clear
          </button>
          .
        </p>
      ) : null}

      {view === "month" ? (
        <MonthGrid
          anchor={anchor}
          rows={rows}
          dragging={dragging}
          onDragStart={setDragging}
          onDropDay={(id, day) => {
            const event = events.find((row) => row.id === id);
            const prev = event ? toDate(event.startAt) ?? toDate(event.dueAt) : null;
            const next = new Date(
              day.getFullYear(),
              day.getMonth(),
              day.getDate(),
              prev?.getHours() ?? 9,
              prev?.getMinutes() ?? 0,
            );
            void dropOn(id, next);
            setDragging(null);
          }}
          selectedId={selectedId}
          onSelect={openEvent}
          onEmpty={(day) => void placeOn(day)}
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
        />
      )}

      <section className="ff-card overflow-x-auto">
        <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
          On this view
        </div>
        {rows.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Nothing in this filter.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.slice(0, 12).map((row) => (
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
          onClose={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
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
}: {
  anchor: Date;
  rows: CalendarActivity[];
  dragging: string | null;
  selectedId: string | null;
  onDragStart: (id: string) => void;
  onDropDay: (id: string, day: Date) => void;
  onSelect: (event: CalendarEvent) => void;
  onEmpty: (day: Date) => void;
}) {
  const cells = monthCells(anchor);
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border text-center text-[11px] font-semibold uppercase text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-1 py-1.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const items = activitiesOnDay(rows, cell.date);
          return (
            <div
              key={toDateParam(cell.date)}
              className={`min-h-28 border-b border-r border-border p-1 ${cell.inMonth ? "bg-card" : "bg-secondary/40"} ${dragging ? "outline-dashed outline-1 outline-primary/40" : ""}`}
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
              <div className="mb-1 text-[11px] text-muted-foreground">{cell.date.getDate()}</div>
              <div className="space-y-0.5">
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
}: {
  days: Date[];
  rows: CalendarActivity[];
  dragging: string | null;
  selectedId: string | null;
  onDragStart: (id: string) => void;
  onDropSlot: (id: string, day: Date, hour: number) => void;
  onSelect: (event: CalendarEvent) => void;
  onEmpty: (day: Date, hour: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <div
        className="grid min-w-[720px]"
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
        {HOURS.map((hour) => (
          <HourRow
            key={hour}
            hour={hour}
            days={days}
            rows={rows}
            dragging={dragging}
            selectedId={selectedId}
            onDragStart={onDragStart}
            onDropSlot={onDropSlot}
            onSelect={onSelect}
            onEmpty={onEmpty}
          />
        ))}
      </div>
    </div>
  );
}

function HourRow({
  hour,
  days,
  rows,
  dragging,
  selectedId,
  onDragStart,
  onDropSlot,
  onSelect,
  onEmpty,
}: {
  hour: number;
  days: Date[];
  rows: CalendarActivity[];
  dragging: string | null;
  selectedId: string | null;
  onDragStart: (id: string) => void;
  onDropSlot: (id: string, day: Date, hour: number) => void;
  onSelect: (event: CalendarEvent) => void;
  onEmpty: (day: Date, hour: number) => void;
}) {
  const label = new Date(2026, 0, 1, hour).toLocaleTimeString("en-US", {
    hour: "numeric",
  });
  return (
    <>
      <div className="border-b border-r border-border px-1 py-1 text-right text-[11px] text-muted-foreground">
        {label}
      </div>
      {days.map((day) => {
        const items = activitiesOnDay(rows, day).filter((item) => {
          const start = toDate(item.startAt) ?? toDate(item.dueAt);
          return start ? start.getHours() === hour : false;
        });
        return (
          <div
            key={`${toDateParam(day)}-${hour}`}
            className={`relative border-b border-r border-border ${dragging ? "bg-primary/5" : ""}`}
            style={{ minHeight: HOUR_H }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/activity-id");
              if (id) onDropSlot(id, day, hour);
            }}
            onDoubleClick={() => onEmpty(day, hour)}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/activity-id", item.id);
                  e.dataTransfer.effectAllowed = "move";
                  onDragStart(item.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(serializeCalendarActivity(item));
                }}
                className={`absolute inset-x-1 top-0 z-10 overflow-hidden rounded-sm px-1 py-0.5 text-left text-[11px] font-medium text-white ${kindClass(item.kind, item.meetingType)} ${selectedId === item.id ? "ring-2 ring-white" : ""}`}
                style={{
                  height: Math.min(eventHeightPx(item, HOUR_H), HOUR_H * 4),
                  background: eventToneColor(item),
                }}
              >
                <span className="block truncate">{item.title}</span>
                <span className="block text-[10px] opacity-80">{formatTime(item.startAt ?? item.dueAt)}</span>
              </button>
            ))}
          </div>
        );
      })}
    </>
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
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
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
    >
      {formatTime(event.startAt ?? event.dueAt)} {event.title}
    </button>
  );
}

function CalendarEditor({
  event,
  options,
  defaultStart,
  defaultKind = "task",
  onClose,
}: {
  event: CalendarEvent | null;
  options: RelatedOptions;
  defaultStart: string;
  defaultKind?: (typeof KINDS)[number];
  onClose: () => void;
}) {
  const isNew = !event;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy">{isNew ? "New on calendar" : "Edit activity"}</h3>
          <Button type="button" size="xs" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <form
          action={async (formData) => {
            if (isNew) await logDeskActivity(formData);
            else await updateDeskActivity(formData);
            onClose();
          }}
          className="grid gap-2 sm:grid-cols-2"
        >
          {event ? <input type="hidden" name="activityId" value={event.id} /> : null}
          <div>
            <Label className="text-xs">Type</Label>
            <select
              name="kind"
              defaultValue={event?.kind ?? defaultKind}
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
              defaultValue={toDateTimeLocal(event?.startAt ?? event?.dueAt) || defaultStart}
              className="mt-1 h-8"
            />
          </div>
          <div>
            <Label className="text-xs">End</Label>
            <Input name="endAt" type="datetime-local" defaultValue={toDateTimeLocal(event?.endAt)} className="mt-1 h-8" />
          </div>
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
              <option value="">—</option>
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
      </div>
    </div>
  );
}

