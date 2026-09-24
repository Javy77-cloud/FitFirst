import { after } from "next/server";
import { coverageGapNotificationsEnabled } from "./notification-flag";
import { syncContactCoverageNoticesSafe } from "./sync-notices";

/**
 * Sole scheduler for coverage-gap / opportunity notification writes.
 * Page renders must not call this — a view is not a reason to ping the agent.
 * No-ops while COVERAGE_GAP_NOTIFICATIONS_ENABLED is off, including jobs and actions.
 */
export function scheduleContactCoverageNotices(contactId: string | null | undefined) {
  if (!coverageGapNotificationsEnabled()) return;
  const id = contactId?.trim();
  if (!id) return;
  after(() => {
    void syncContactCoverageNoticesSafe(id);
  });
}
