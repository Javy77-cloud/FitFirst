"use client";

import { ActivityTimeline } from "@/components/activity-timeline";
import { formatDay } from "@/lib/domain";
import type { TimelineItem } from "@/lib/db/queries";

/** Content for the Timeline collapsible — parent supplies the card chrome. */
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
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-ff-business-timeline="">
        No Activity Yet — Log A Call, Email, Or Task From Quick Actions.
      </p>
    );
  }

  // Full chronological list (most recent first — listActivityTimeline order).
  if (items.length <= 5) {
    return (
      <ol className="space-y-2" data-ff-business-timeline="">
        {items.map((item) => (
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
    );
  }

  return (
    <div data-ff-business-timeline="">
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
