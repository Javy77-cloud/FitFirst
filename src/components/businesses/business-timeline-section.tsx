"use client";

import { useState } from "react";
import { ActivityTimeline } from "@/components/activity-timeline";
import { formatDay } from "@/lib/domain";
import type { TimelineItem } from "@/lib/db/queries";

/** Expand/collapse Timeline card — mirrors ContactTimelineSection. */
export function BusinessTimelineSection({
  items,
  accountId,
  contactId,
  policyId,
  dealId,
}: {
  items: TimelineItem[];
  accountId: string;
  contactId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = items.slice(0, 3);

  if (expanded) {
    return (
      <div data-ff-business-timeline="">
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            className="text-xs font-semibold text-[#002868] hover:underline"
            onClick={() => setExpanded(false)}
          >
            Collapse
          </button>
        </div>
        <ActivityTimeline
          items={items}
          accountId={accountId}
          contactId={contactId ?? undefined}
          policyId={policyId ?? undefined}
          dealId={dealId ?? undefined}
        />
      </div>
    );
  }

  return (
    <section className="ff-card p-4" data-ff-business-timeline="">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[#002868]">Timeline</h2>
        <button
          type="button"
          className="text-xs font-semibold text-[#002868] hover:underline"
          onClick={() => setExpanded(true)}
          data-ff-timeline-expand=""
        >
          Expand
        </button>
      </div>
      {preview.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No Activity Yet.</p>
      ) : (
        <ol className="mt-2 space-y-2">
          {preview.map((item) => (
            <li key={item.id} className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase">
                  {item.kind}
                </span>
                <span className="text-xs text-muted-foreground">{formatDay(item.occurredAt)}</span>
              </div>
              {item.activityTitle || item.subject || item.body ? (
                <p className="mt-1 text-sm text-[#002868]">
                  {item.activityTitle || item.subject || item.body}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
