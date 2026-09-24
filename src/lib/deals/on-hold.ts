/** Soft park for shopping deals — tag, not a pipeline stage. */

export const ON_HOLD_TAG = "on_hold" as const;
export const ON_HOLD_LABEL = "On hold" as const;
export const ON_HOLD_EVENT = "deal_on_hold" as const;
export const ON_HOLD_RESTORED_EVENT = "deal_on_hold_restored" as const;
export const ON_HOLD_ATTENTION = "on_hold" as const;

/** Keep Lost / Archive / Lead nurture / Renewals Handled as separate exits. */
export const ON_HOLD_FORBIDDEN_REUSE = [
  "lost",
  "closed_lost",
  "archived",
  "archive",
  "lead_nurture",
  "nurture",
  "handled",
  "renewals_handled",
] as const;

export function isOnHoldTag(tag: string | null | undefined): boolean {
  return (tag ?? "").trim().toLowerCase() === ON_HOLD_TAG;
}

export function dealHasOnHoldTag(tags: readonly string[] | null | undefined): boolean {
  return (tags ?? []).some((tag) => isOnHoldTag(tag));
}

export function onHoldTagLabel(tag: string): string {
  return isOnHoldTag(tag) ? ON_HOLD_LABEL : tag;
}

export function formatDealTagLabel(tag: string): string {
  if (isOnHoldTag(tag)) return ON_HOLD_LABEL;
  return tag
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export function withOnHoldTag(tags: readonly string[] | null | undefined): string[] {
  const next = [...(tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean)];
  if (!next.includes(ON_HOLD_TAG)) next.push(ON_HOLD_TAG);
  return next;
}

export function withoutOnHoldTag(tags: readonly string[] | null | undefined): string[] {
  return (tags ?? []).filter((tag) => !isOnHoldTag(tag));
}

export function wantsOnHoldFeed(input: {
  tags?: string | null;
  attention?: string | null;
}): boolean {
  const tags = (input.tags ?? "").trim().toLowerCase();
  const attention = (input.attention ?? "").trim().toLowerCase();
  return tags === ON_HOLD_TAG || attention === ON_HOLD_ATTENTION;
}

/** Default Stack / Radar / List hide On hold; explicit On hold filter shows only those. */
export function includeDealInActiveFeed(
  tags: readonly string[] | null | undefined,
  opts: { tags?: string | null; attention?: string | null },
): boolean {
  const held = dealHasOnHoldTag(tags);
  const wantHeld = wantsOnHoldFeed(opts);
  return wantHeld ? held : !held;
}

export function onHoldHistoryBody(note?: string | null): string {
  const trimmed = (note ?? "").trim();
  if (trimmed) return `${ON_HOLD_LABEL}: ${trimmed}`;
  return `${ON_HOLD_LABEL} — parked out of the active priority stack. Stage unchanged.`;
}

export function onHoldRestoredHistoryBody(): string {
  return `${ON_HOLD_LABEL} removed — deal back in the active priority stack. Stage unchanged.`;
}
