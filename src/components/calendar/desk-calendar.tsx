"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { moveActivityDay } from "@/app/actions/activities";
import { logDeskActivity } from "@/app/actions/activities-desk";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVITY_KIND_LABEL, ACTIVITY_KINDS, type ActivityKind } from "@/lib/domain";
import type { SerializedActivity } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

type View = "month" | "week" | "day";

const KIND_TONE: Record<ActivityKind, string> = {
  task: "bg-[#dbeafe] text-[#1d4e89] border-[#93c5fd]",
  meeting: "bg-[#fff4d1] text-[#8a6500] border-[#f4d06a]",
  call: "bg-[#e4f5ec] text-[#1f7a4d] border-[#86d4ad]",
  email: "bg-[#e0f2fe] text-[#0369a1] border-[#7dd3fc]",
  sms: "bg-[#ffedd5] text-[#c2410c] border-[#fdba74]",
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function monthGrid(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function weekDays(anchor: Date) {
  const start = addDays(startOfDay(anchor), -anchor.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function activityDay(item: SerializedActivity) {
  const raw = item.startAt ?? item.dueAt;
  if (!raw) return null;
  return dayKey(new Date(raw));
}

function toDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`;
}

export function DeskCalendar({
  items,
  deals,
  leads,
}: {
  items: SerializedActivity[];
  deals: { id: string; title: string }[];
  leads: { id: string; title: string }[];
}) {
  const [view, setView] = useState<View>("month");
  const [kind, setKind] = useState<ActivityKind | "all">("all");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [open, setOpen] = useState(false);
  const [draftDay, setDraftDay] = useState<Date | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const visible = items.filter((item) => kind === "all" || item.kind === kind);
  const days =
    view === "month" ? monthGrid(cursor) : view === "week" ? weekDays(cursor) : [startOfDay(cursor)];

  const byDay = useMemo(() => {
    const map = new Map<string, SerializedActivity[]>();
    for (const item of visible) {
      const key = activityDay(item);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [visible]);

  function openAdd(day?: Date) {
    setDraftDay(day ?? cursor);
    setOpen(true);
  }

  function shift(delta: number) {
    setCursor((current) => {
      if (view === "month") return new Date(current.getFullYear(), current.getMonth() + delta, 1);
      return addDays(current, view === "week" ? delta * 7 : delta);
    });
  }

  const heading =
    view === "day"
      ? cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
      : cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div>
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] grid-rows-2 items-stretch gap-x-3 gap-y-1">
        <div className="flex flex-wrap items-center gap-1">
          {(["month", "week", "day"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={cn(
                "h-8 rounded-md px-3 text-xs font-medium capitalize",
                view === value ? "bg-navy text-white" : "border border-border bg-card text-navy",
              )}
            >
              {value}
            </button>
          ))}
          <button type="button" onClick={() => shift(-1)} className="h-8 px-2 text-sm text-navy">
            ‹
          </button>
          <button type="button" onClick={() => setCursor(startOfDay(new Date()))} className="h-8 text-xs text-primary">
            Today
          </button>
          <button type="button" onClick={() => shift(1)} className="h-8 px-2 text-sm text-navy">
            ›
          </button>
          <span className="ml-1 text-sm font-semibold text-navy">{heading}</span>
        </div>
        <button
          type="button"
          onClick={() => openAdd()}
          className="row-span-2 min-h-[4.5rem] rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/80"
        >
          Add event
        </button>
        <div className="flex flex-wrap items-center gap-1">
          {ACTIVITY_KINDS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind((current) => (current === value ? "all" : value))}
              className={cn(
                "h-8 rounded-md px-2.5 text-xs font-medium",
                kind === value ? KIND_TONE[value] : "border border-border bg-card text-muted-foreground",
              )}
            >
              {ACTIVITY_KIND_LABEL[value]}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-px overflow-hidden rounded-md border border-border bg-border",
          view === "day" ? "grid-cols-1" : "grid-cols-7",
        )}
      >
        {(view === "day" ? [cursor] : weekDays(cursor)).slice(0, view === "day" ? 1 : 7).map((day) => (
          <div key={`head-${dayKey(day)}`} className="bg-muted px-2 py-1 text-[11px] font-semibold uppercase text-muted-foreground">
            {day.toLocaleDateString(undefined, { weekday: "short" })}
          </div>
        ))}
        {days.map((day) => {
          const key = dayKey(day);
          const inMonth = day.getMonth() === cursor.getMonth();
          const todays = byDay.get(key) ?? [];
          return (
            <div
              key={key}
              onDragOver={(event) => event.preventDefault()}
              onDrop={async (event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/activity-id");
                if (!id) return;
                const fd = new FormData();
                fd.set("activityId", id);
                fd.set("dueAt", day.toISOString());
                await moveActivityDay(fd);
              }}
              className={cn(
                "min-h-28 bg-card p-1.5",
                view === "day" && "min-h-80",
                !inMonth && view === "month" && "bg-muted/50 text-muted-foreground",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold">{day.getDate()}</span>
                <button
                  type="button"
                  onClick={() => openAdd(day)}
                  className="inline-flex size-6 items-center justify-center rounded-sm border border-border bg-muted text-sm font-semibold text-navy hover:bg-primary hover:text-primary-foreground"
                  aria-label={`Add event on ${key}`}
                >
                  +
                </button>
              </div>
              <div className="space-y-1">
                {todays.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/activity-id", item.id);
                      event.dataTransfer.effectAllowed = "move";
                      const ghost = document.createElement("div");
                      ghost.className =
                        "rounded-md border-2 px-3 py-2 text-sm font-semibold shadow-lg";
                      ghost.textContent = `${ACTIVITY_KIND_LABEL[(item.kind as ActivityKind) ?? "task"]} · ${item.title}`;
                      ghost.style.position = "absolute";
                      ghost.style.top = "-200px";
                      ghost.style.left = "0";
                      ghost.style.width = "220px";
                      ghost.style.background = "#fffcf7";
                      ghost.style.borderColor = "#1d6fb8";
                      ghost.style.color = "#0c2340";
                      document.body.appendChild(ghost);
                      ghostRef.current = ghost;
                      event.dataTransfer.setDragImage(ghost, 20, 16);
                    }}
                    onDragEnd={() => {
                      ghostRef.current?.remove();
                      ghostRef.current = null;
                    }}
                    className={cn(
                      "cursor-grab rounded-sm border px-1.5 py-1 text-[11px] leading-tight",
                      KIND_TONE[(item.kind as ActivityKind) ?? "task"],
                    )}
                  >
                    <Link
                      href={
                        item.kind === "meeting" ? `/meetings/${item.id}` : `/tasks/${item.id}`
                      }
                      className="font-semibold hover:underline"
                    >
                      {item.title}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add event</DialogTitle>
            <DialogDescription>
              Lands on the in-desk calendar. Attach a deal or lead when you have one.
            </DialogDescription>
          </DialogHeader>
          <form
            action={async (formData) => {
              await logDeskActivity(formData);
              setOpen(false);
            }}
            className="space-y-2"
          >
            <input type="hidden" name="allowOrphan" value="1" />
            <div>
              <Label className="text-xs">Kind</Label>
              <select
                name="kind"
                defaultValue={kind === "all" ? "task" : kind}
                className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              >
                {ACTIVITY_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {ACTIVITY_KIND_LABEL[value]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input name="title" required className="mt-1 h-8" placeholder="Follow-up" />
            </div>
            <div>
              <Label className="text-xs">When</Label>
              <Input
                name="dueAt"
                type="datetime-local"
                className="mt-1 h-8"
                defaultValue={toDateTimeLocal(draftDay ?? cursor)}
              />
            </div>
            <div>
              <Label className="text-xs">Deal (optional)</Label>
              <select name="dealId" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
                <option value="">None</option>
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Lead (optional)</Label>
              <select name="leadId" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
                <option value="">None</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.title}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">
              Save event
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
