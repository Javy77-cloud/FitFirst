"use client";

import { ActivityTimeline } from "@/components/activity-timeline";
import type { TimelineItem } from "@/lib/db/queries";

/**
 * Timeline body for the contact detail accordion.
 * Outer id / collapse chrome lives on CollapsibleSection (id="timeline").
 */
export function ContactTimelineSection({
  items,
  contactId,
  policyId,
  dealId,
  accountId,
}: {
  items: TimelineItem[];
  contactId: string;
  policyId?: string | null;
  dealId?: string | null;
  accountId?: string | null;
}) {
  return (
    <div data-ff-contact-timeline="">
      <ActivityTimeline
        items={items}
        contactId={contactId}
        policyId={policyId}
        dealId={dealId}
        accountId={accountId}
      />
    </div>
  );
}
