import {
  RENEWAL_QUEUE_DISCLAIMER,
  isRenewalQueueStage,
  normalizeRenewalQueueStage,
  renewalQueueNextStep,
  type RenewalQueueStage,
} from "@/lib/domain-ams";

export type RenewalQueueAction = "contact" | "quote" | "bind" | "lose" | "reset" | "quote_legacy" | "offer" | "accept";

/** Drag / advance map for the renewals board stages. */
export function nextRenewalQueueStage(
  stage: RenewalQueueStage | string,
  action: RenewalQueueAction,
): RenewalQueueStage | null {
  const current = normalizeRenewalQueueStage(stage) ?? (isRenewalQueueStage(stage) ? stage : null);
  if (!current) return null;

  if (action === "reset" && (current === "bound" || current === "lost" || current === "quoted")) {
    return "upcoming";
  }
  if (
    action === "lose" &&
    (current === "upcoming" || current === "contacted" || current === "quoted")
  ) {
    return "lost";
  }
  // New names
  if (action === "contact" && current === "upcoming") return "contacted";
  if (action === "quote" && current === "contacted") return "quoted";
  if (action === "bind" && current === "quoted") return "bound";
  // Legacy action aliases from older queue UI
  if ((action === "quote_legacy" || action === "quote") && current === "upcoming") return "contacted";
  if (action === "offer" && current === "contacted") return "quoted";
  if (action === "accept" && current === "quoted") return "bound";
  return null;
}

export function renewalQueueChangesPolicy(): false {
  return false;
}

export function renewalQueueBindsPolicy(): false {
  return false;
}

export function isOpenRenewalQueue(stage: string): boolean {
  const normalized = normalizeRenewalQueueStage(stage);
  return Boolean(
    normalized && (normalized === "upcoming" || normalized === "contacted" || normalized === "quoted"),
  );
}

export function renewalQueueLine(policyNumber: string, stage: string): string {
  return `Renewal queue · ${policyNumber} · ${stage.replaceAll("_", " ")}`;
}

export function renewalQueueActionCopy(stage: string): string {
  return renewalQueueNextStep(stage);
}

export function validateRenewalQueueNotes(notes?: string | null): string | null {
  const trimmed = notes?.trim() || null;
  return trimmed;
}

export { RENEWAL_QUEUE_DISCLAIMER };
