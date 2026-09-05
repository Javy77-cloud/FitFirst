import {
  RENEWAL_QUEUE_DISCLAIMER,
  isRenewalQueueStage,
  renewalQueueNextStep,
  type RenewalQueueStage,
} from "@/lib/domain-ams";

export type RenewalQueueAction = "quote" | "offer" | "accept" | "lose" | "reset";

export function nextRenewalQueueStage(
  stage: RenewalQueueStage,
  action: RenewalQueueAction,
): RenewalQueueStage | null {
  if (action === "reset" && (stage === "accepted" || stage === "lost" || stage === "offered")) {
    return "upcoming";
  }
  if (action === "lose" && (stage === "upcoming" || stage === "quoting" || stage === "offered")) {
    return "lost";
  }
  if (action === "quote" && stage === "upcoming") return "quoting";
  if (action === "offer" && stage === "quoting") return "offered";
  if (action === "accept" && stage === "offered") return "accepted";
  return null;
}

export function renewalQueueChangesPolicy(): false {
  return false;
}

export function renewalQueueBindsPolicy(): false {
  return false;
}

export function isOpenRenewalQueue(stage: string): boolean {
  return isRenewalQueueStage(stage) && (stage === "upcoming" || stage === "quoting" || stage === "offered");
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
