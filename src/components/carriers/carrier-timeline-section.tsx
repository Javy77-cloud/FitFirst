"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type CarrierTimelineRow = {
  id: string;
  kind: string;
  title: string;
  actorName: string | null;
  occurredAt: Date | string;
  /** One-line context (field update detail or failure reason). */
  reason?: string | null;
  /** When true, reason renders as a red failure line. */
  failed?: boolean;
};

type Group = {
  key: string;
  kind: string;
  title: string;
  items: CarrierTimelineRow[];
  latest: Date;
};

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function groupTimeline(rows: CarrierTimelineRow[]): Group[] {
  const map = new Map<string, Group>();
  for (const row of rows) {
    const when = new Date(row.occurredAt);
    const key = `${row.kind}|${dayKey(when)}|${row.title.toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.items.push(row);
      if (when > existing.latest) existing.latest = when;
    } else {
      map.set(key, {
        key,
        kind: row.kind,
        title: row.title,
        items: [row],
        latest: when,
      });
    }
  }
  return [...map.values()].sort((a, b) => +b.latest - +a.latest);
}

function failureReason(row: CarrierTimelineRow): string | null {
  if (!row.failed) {
    // Infer failure for older rows that predate the failed flag.
    if (row.kind === "credential" && /fail|unreachable|missing/i.test(row.title)) {
      return row.reason?.trim() || row.title;
    }
    if (/readiness_check_fail|unreachable|fail/i.test(row.title)) {
      return row.reason?.trim() || "Portal URL unreachable or returned an error.";
    }
    return null;
  }
  if (row.reason?.trim()) return row.reason.trim();
  if (/readiness_check_fail|unreachable|fail/i.test(row.title)) {
    return "Portal URL unreachable or returned an error.";
  }
  return row.title.trim() || "Failed.";
}

function contextLine(row: CarrierTimelineRow): string | null {
  if (failureReason(row)) return null;
  const detail = row.reason?.trim();
  return detail || null;
}

export function CarrierTimelineSection({
  rows,
}: {
  rows: CarrierTimelineRow[];
}) {
  const groups = useMemo(() => groupTimeline(rows), [rows]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-ff-carrier-timeline-empty="">No carrier activity yet.</p>
    );
  }

  return (
    <ul className="space-y-2 text-sm" data-ff-carrier-timeline="">
      {groups.map((group) => {
        const expanded = Boolean(open[group.key]);
        const primary = group.items[0];
        const fail = group.items.map(failureReason).find(Boolean) ?? null;
        const note = fail ? null : group.items.map(contextLine).find(Boolean) ?? null;
        const multi = group.items.length > 1;
        return (
          <li
            key={group.key}
            className="rounded-md border border-border/70 px-3 py-2"
            data-ff-carrier-timeline-group={group.kind}
          >
            <button
              type="button"
              className={cn(
                "flex w-full items-start justify-between gap-2 text-left",
                multi ? "cursor-pointer" : "cursor-default",
              )}
              onClick={() => {
                if (!multi) return;
                setOpen((prev) => ({ ...prev, [group.key]: !expanded }));
              }}
              aria-expanded={multi ? expanded : undefined}
            >
              <div className="min-w-0">
                <div className="font-medium text-[#002868]">
                  {group.title}
                  {multi ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      · {group.items.length} related
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {primary.actorName ? `${primary.actorName} · ` : ""}
                  {new Date(group.latest).toLocaleString()}
                </div>
                {fail ? (
                  <div className="mt-1 text-xs text-[#BF0A30]" data-ff-carrier-timeline-fail="">
                    {fail}
                  </div>
                ) : note ? (
                  <div className="mt-1 text-xs text-muted-foreground" data-ff-carrier-timeline-note="">
                    {note}
                  </div>
                ) : null}
              </div>
              {multi ? (
                <span className="shrink-0 text-xs text-muted-foreground">{expanded ? "Hide" : "Show"}</span>
              ) : null}
            </button>
            {multi && expanded ? (
              <ul className="mt-2 space-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                {group.items.map((item) => {
                  const itemFail = failureReason(item);
                  const itemNote = contextLine(item);
                  return (
                    <li key={item.id}>
                      {item.title}
                      {item.actorName ? ` · ${item.actorName}` : ""}
                      {" · "}
                      {new Date(item.occurredAt).toLocaleString()}
                      {itemFail ? (
                        <span className="block text-[#BF0A30]">{itemFail}</span>
                      ) : itemNote ? (
                        <span className="block">{itemNote}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
