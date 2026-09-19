"use client";

import { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { TodayActivityStrip } from "@/components/deals/today-activity-strip";
import type { DealTodayActivityType } from "@/lib/deals/pipeline-desk";

export function TodayActivityCorner({
  counts,
  active,
  basePath = "/renewals",
}: {
  counts: Record<DealTodayActivityType, number>;
  active?: DealTodayActivityType | null;
  basePath?: "/deals" | "/renewals";
}) {
  const [open, setOpen] = useState(false);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <div
      className="ff-today-activity-corner"
      data-ff-today-activity-corner=""
      data-open={open ? "true" : "false"}
    >
      {open ? (
        <div className="ff-today-activity-corner-panel" data-ff-today-activity-panel="">
          <div className="ff-today-activity-corner-panel-head">
            <p>Today Activity</p>
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
        <span>Today</span>
        <strong>{total}</strong>
      </button>
    </div>
  );
}
