/** Closed Won / Closed Lost → archive now or snooze in-app reminder (sep7fx). */

import { isClosedLostStage, isClosedWonStage } from "@/lib/wire/pipeline";

export const DEAL_ARCHIVE_REMINDER_KIND = "deal_archive_reminder";

export const CLOSED_DEAL_ARCHIVE_COPY =
  "Archive this deal now, or snooze a reminder to archive?";

export const CLOSED_DEAL_ARCHIVE_TITLE = "Archive this deal?";

export function isClosedOutcomeStage(slug: string | null | undefined): boolean {
  return isClosedWonStage(slug) || isClosedLostStage(slug);
}

export function isDealArchiveReminderKind(kind: string | null | undefined): boolean {
  return kind === DEAL_ARCHIVE_REMINDER_KIND;
}

export function dealArchiveReminderTitle(dealTitle: string): string {
  const name = dealTitle.trim() || "Deal";
  return `Archive reminder · ${name}`;
}

export function dealArchiveReminderBody(dealTitle: string): string {
  const name = dealTitle.trim() || "this deal";
  return `Time to archive ${name}. Archive now, or snooze again.`;
}
