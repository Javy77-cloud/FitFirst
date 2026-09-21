/** Pixel width of the inbox thread list. Agents drag the splitter; this remembers it. */
export const INBOX_LIST_WIDTH_STORAGE_KEY = "ff-inbox-list-width:v1";

/** ~26.25rem. Close to a Gmail list, wide enough for sender + subject. */
export const INBOX_LIST_WIDTH_DEFAULT = 420;

/** 15rem. Below this the sender line collapses. */
export const INBOX_LIST_WIDTH_MIN = 240;

/** 18rem. The open message keeps a readable column. */
export const INBOX_LIST_BODY_MIN = 288;

/** Matches the splitter hit target in CSS. */
export const INBOX_SPLITTER_WIDTH = 10;

export const INBOX_SPLITTER_KEY_STEP = 24;

const STORED_WIDTH_MIN = 120;
const STORED_WIDTH_MAX = 4000;

export function parseInboxListWidth(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < STORED_WIDTH_MIN || rounded > STORED_WIDTH_MAX) return null;
  return rounded;
}

/**
 * Keep the list inside the split: at least a readable list, and enough room
 * left for the message body. A tiny container collapses the minimum so the
 * body is not pushed off-screen.
 */
export function clampInboxListWidth(width: number, containerWidth: number): number {
  const raw = Number.isFinite(width) ? Math.round(width) : INBOX_LIST_WIDTH_DEFAULT;
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return Math.max(INBOX_LIST_WIDTH_MIN, raw);
  }
  const max = Math.max(
    INBOX_LIST_WIDTH_MIN,
    Math.round(containerWidth - INBOX_SPLITTER_WIDTH - INBOX_LIST_BODY_MIN),
  );
  const min = Math.min(INBOX_LIST_WIDTH_MIN, max);
  return Math.min(max, Math.max(min, raw));
}

export function inboxListWidthFromPointer(
  clientX: number,
  containerLeft: number,
  containerWidth: number,
): number {
  return clampInboxListWidth(clientX - containerLeft, containerWidth);
}

export function nudgeInboxListWidth(current: number, delta: number, containerWidth: number): number {
  return clampInboxListWidth(current + delta, containerWidth);
}
