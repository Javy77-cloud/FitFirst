"use client";

import Link from "next/link";
import type { Commitment, SerializedCommitment } from "@/lib/notifications/commitments";
import { formatEtWeekdayMonthDay } from "@/lib/time/et";
import { cn } from "@/lib/utils";

export function PromiseChips({
  commitments,
}: {
  commitments: Array<Commitment | SerializedCommitment>;
}) {
  if (commitments.length === 0) return null;
  return (
    <div className="ff-promise-chips" data-ff-promise-chips="">
      {commitments.map((row) => {
        const due = row.dueAt instanceof Date ? row.dueAt : new Date(row.dueAt);
        return (
          <Link
            key={`${row.source}:${row.id}`}
            href={row.href}
            className={cn("ff-promise-chip", `ff-promise-chip-${row.heat}`)}
            title={row.title}
            data-ff-promise-heat={row.heat}
          >
            <span className="ff-promise-chip-title">{row.title}</span>
            <span className="ff-promise-chip-when">
              {formatEtWeekdayMonthDay(due)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
