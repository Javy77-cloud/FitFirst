import { after } from "next/server";
import { syncContactCoverageNoticesSafe } from "./sync-notices";

/** Fire after the response so bind / save is not blocked. Uses the existing notification board. */
export function scheduleContactCoverageNotices(contactId: string | null | undefined) {
  const id = contactId?.trim();
  if (!id) return;
  after(() => {
    void syncContactCoverageNoticesSafe(id);
  });
}
