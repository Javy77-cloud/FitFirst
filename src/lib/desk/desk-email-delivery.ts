/** Quick Comms / desk email delivery. Live send uses Inbox Gmail; no second queue. */

export const DESK_EMAIL_INTENTS = ["now", "schedule", "remind"] as const;
export type DeskEmailIntent = (typeof DESK_EMAIL_INTENTS)[number];
export type DeskEmailDelivery = "send" | "queue" | "remind";

export const GMAIL_NOT_CONNECTED_MESSAGE =
  "Gmail is not connected. Connect the agency mailbox under Settings → Integrations or Inbox → Connect Gmail, then try Send now again.";

export function parseDeskEmailIntent(raw: string | null | undefined): DeskEmailIntent | null {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "now" || value === "send" || value === "send_now") return "now";
  if (value === "schedule") return "schedule";
  if (value === "remind" || value === "reminder") return "remind";
  return null;
}

export function isDueNowOrPast(dueAt: Date | null | undefined, now = new Date()): boolean {
  if (!dueAt || Number.isNaN(dueAt.getTime())) return true;
  return dueAt.getTime() <= now.getTime();
}

/**
 * Send now and schedule-due-now go through Gmail immediately.
 * Remind never sends. Future schedule stays on the existing outbound stub
 * (no worker exists — only Send now is live).
 *
 * Callers without an intent (renewal chase, Queue email) stay queued so we
 * do not silently start mailing from every stub compose.
 */
export function decideDeskEmailDelivery(input: {
  intent?: string | null;
  dueAt?: Date | null;
  now?: Date;
}): DeskEmailDelivery {
  const intent = parseDeskEmailIntent(input.intent);
  if (intent === "remind") return "remind";
  const now = input.now ?? new Date();
  const dueNow = isDueNowOrPast(input.dueAt, now);
  if (intent === "now") return "send";
  if (intent === "schedule") return dueNow ? "send" : "queue";
  return "queue";
}
