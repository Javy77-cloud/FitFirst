"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, X } from "lucide-react";
import { TodayActivityStrip } from "@/components/deals/today-activity-strip";
import {
  formatTodayActivityDate,
  todayActivityCalendarHref,
  type DealTodayActivityType,
} from "@/lib/deals/pipeline-desk";

export function TodayActivityCorner({
  counts,
  active,
  now,
  basePath = "/renewals",
}: {
  counts: Record<DealTodayActivityType, number>;
  active?: DealTodayActivityType | null;
  now?: Date;
  basePath?: "/deals" | "/renewals";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const dated = formatTodayActivityDate(now);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="ff-today-activity-corner"
      data-ff-today-activity-corner=""
      data-open={open ? "true" : "false"}
    >
      {open ? (
        <div className="ff-today-activity-corner-panel" data-ff-today-activity-panel="">
          <div className="ff-today-activity-corner-panel-head">
            <Link
              href={todayActivityCalendarHref()}
              className="ff-today-activity-corner-calendar"
              title="Open calendar"
              aria-label="Open calendar"
              data-testid="deal-today-calendar"
            >
              <CalendarDays className="size-3.5" aria-hidden />
              <span data-testid="deal-today-date">{dated}</span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Collapse Today Activity"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
          <TodayActivityStrip counts={counts} active={active} basePath={basePath} />
        </div>
      ) : null}
      <button
        type="button"
        className="ff-today-activity-corner-toggle"
        aria-expanded={open}
        aria-label={open ? "Collapse Today Activity" : "Open Today Activity"}
        data-ff-today-activity-toggle=""
        onClick={() => setOpen((current) => !current)}
      >
        <CalendarDays className="size-4" aria-hidden />
        <strong>{total}</strong>
      </button>
    </div>
  );
}
