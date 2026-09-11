"use client";

import { ActivityTimeline } from "@/components/activity-timeline";
import type { TimelineItem } from "@/lib/db/queries";

/**
 * Timeline body for the business detail accordion.
 * Outer id / collapse chrome lives on CollapsibleSection (id="timeline").
 */
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
