import { canonicalizeProductStage, LATE_PRODUCT_STAGES } from "@/lib/deals/product-stages";

/** Client-facing stamps. Outside override uses the same list and cannot skip the send. */
export const CLIENT_SEND_LATE_STAGES = LATE_PRODUCT_STAGES;

const LATE = new Set<string>(CLIENT_SEND_LATE_STAGES);

export function isClientFacingLateStage(stage?: string | null): boolean {
  return LATE.has(canonicalizeProductStage(stage));
}

/** Provider placeholder ids are not a real send. */
export function hasProviderMessageId(messageId?: string | null): boolean {
  const value = (messageId ?? "").trim();
  if (!value) return false;
  if (value === "sent") return false;
  return true;
}

/**
 * Late stamps stay blocked until a provider message id exists.
 * `outsideOverride` is accepted and ignored — a reason string is not a send.
 */
export function lateStageSendBlocked(input: {
  stage?: string | null;
  messageId?: string | null;
  outsideOverride?: unknown;
}): boolean {
  void input.outsideOverride;
  if (!isClientFacingLateStage(input.stage)) return false;
  return !hasProviderMessageId(input.messageId);
}

export const CLIENT_SEND_REQUIRED_MESSAGE =
  "Quote email did not send. Connect Gmail and try again — the stage was not changed.";

export const CLIENT_SEND_NO_ADDRESS_MESSAGE =
  "This deal has no client email. Add one before Quote sent, Bound, Policy issued, or Closed won.";
