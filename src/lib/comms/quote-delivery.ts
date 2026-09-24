import { hasProviderMessageId, isClientFacingLateStage } from "@/lib/deals/client-send-gate";

export const OPEN_TRACKING_NOTE =
  "Quote emails include a tiny open pixel. Some clients block images, so a missing open is not proof the quote was unread.";

export type DeliveryKind = "sent" | "delivered" | "bounce" | "complaint" | "open";

export type MailProviderEvent = {
  messageId: string;
  kind: Exclude<DeliveryKind, "sent">;
};

const KIND_ALIASES: Record<string, MailProviderEvent["kind"]> = {
  delivered: "delivered",
  delivery: "delivered",
  bounce: "bounce",
  bounced: "bounce",
  dropped: "bounce",
  complaint: "complaint",
  spamreport: "complaint",
  spam: "complaint",
  open: "open",
  opened: "open",
};

function asKind(value: unknown): MailProviderEvent["kind"] | null {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  return KIND_ALIASES[key] ?? null;
}

function messageIdOf(row: Record<string, unknown>): string {
  const raw =
    row.messageId ??
    row.message_id ??
    row.sg_message_id ??
    row["smtp-id"] ??
    "";
  return String(raw).split(".")[0]?.trim() ?? "";
}

/** Accept a single event or a SendGrid-style array. Unknown shapes yield nothing. */
export function parseMailProviderEvents(body: unknown): MailProviderEvent[] {
  const rows = Array.isArray(body) ? body : body && typeof body === "object" ? [body] : [];
  const events: MailProviderEvent[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const kind = asKind(record.kind ?? record.event ?? record.type);
    const messageId = messageIdOf(record);
    if (!kind || !hasProviderMessageId(messageId)) continue;
    events.push({ kind, messageId });
  }
  return events;
}

export function stageAfterDeliveryFailure(input: {
  kind: DeliveryKind;
  stage?: string | null;
  messageId: string;
  unlockedByMessageId?: string | null;
}): {
  stage: string;
  clientSendMessageId: string | null;
  clientSendFlag: "bounce" | "complaint" | null;
  revert: boolean;
  log: string;
} {
  const unlocked = (input.unlockedByMessageId ?? "").trim();
  const matches = hasProviderMessageId(input.messageId) && unlocked === input.messageId.trim();
  const late = isClientFacingLateStage(input.stage);
  if ((input.kind === "bounce" || input.kind === "complaint") && matches && late) {
    return {
      stage: "quote_review",
      clientSendMessageId: null,
      clientSendFlag: input.kind,
      revert: true,
      log: `Provider ${input.kind} for ${input.messageId}. Quote-sent stamp reverted to Quote review.`,
    };
  }
  return {
    stage: input.stage?.trim() || "quote_review",
    clientSendMessageId: unlocked || null,
    clientSendFlag: null,
    revert: false,
    log: `Provider ${input.kind} for ${input.messageId}.`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function quoteEmailHtml(input: { text: string; pixelUrl: string }): string {
  const body = escapeHtml(input.text).replaceAll("\n", "<br>");
  const pixel = input.pixelUrl.trim();
  return `<div>${body}</div><p style="color:#5c6b7a;font-size:12px">${escapeHtml(OPEN_TRACKING_NOTE)}</p>${
    pixel ? `<img src="${escapeHtml(pixel)}" width="1" height="1" alt="" />` : ""
  }`;
}

export function quoteEmailText(text: string): string {
  return `${text.trim()}\n\n${OPEN_TRACKING_NOTE}`;
}

export function deskPublicOrigin(): string {
  const explicit = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_ORIGIN || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = (process.env.VERCEL_URL || "").trim().replace(/^https?:\/\//, "");
  if (vercel) return `https://${vercel}`;
  return "http://127.0.0.1:43147";
}

export function openPixelUrl(token: string): string {
  return `${deskPublicOrigin()}/api/track/open/${encodeURIComponent(token)}`;
}

export const TRACKING_PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);
