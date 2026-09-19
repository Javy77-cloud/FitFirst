import type { MiniReviewTrigger } from "@/lib/renewal/mini-review";

export const REVIEW_PULSE_COOKIE = "ff-review-pulse";

export type ReviewPulsePayload = {
  policyId: string;
  contactId: string | null;
  accountId: string | null;
  trigger: MiniReviewTrigger;
  clientName: string;
};

const TRIGGERS: MiniReviewTrigger[] = ["chase", "bind", "close", "claim", "call"];

export function isReviewTrigger(value: string | null | undefined): value is MiniReviewTrigger {
  return Boolean(value && TRIGGERS.includes(value as MiniReviewTrigger));
}

export function encodeReviewPulse(payload: ReviewPulsePayload): string {
  return JSON.stringify({
    policyId: payload.policyId,
    contactId: payload.contactId,
    accountId: payload.accountId,
    trigger: payload.trigger,
    clientName: payload.clientName,
  });
}

export function decodeReviewPulse(raw: string | null | undefined): ReviewPulsePayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ReviewPulsePayload>;
    if (!parsed.policyId || !isReviewTrigger(parsed.trigger)) return null;
    return {
      policyId: parsed.policyId,
      contactId: parsed.contactId ?? null,
      accountId: parsed.accountId ?? null,
      trigger: parsed.trigger,
      clientName: (parsed.clientName ?? "this client").trim() || "this client",
    };
  } catch {
    return null;
  }
}

export function reviewPulseHeadline(trigger: MiniReviewTrigger, clientName: string): string {
  const first = clientName.trim().split(/\s+/)[0] || "them";
  if (trigger === "bind") return `Bound — how does ${first} feel?`;
  if (trigger === "close") return `Renewal closed — a 10-second pulse on ${first}`;
  if (trigger === "claim") return `Claim wrapped — how is ${first}?`;
  if (trigger === "call") return `Call logged — how did ${first} land?`;
  return `Chase sent — quick pulse on ${first}`;
}

export function reviewPulseHint(trigger: MiniReviewTrigger): string {
  if (trigger === "bind") return "One tap per question. Two scores under 3 flags the client — not the policy.";
  if (trigger === "claim") return "After wrap, two weak scores flag health on the renewal card.";
  return "Skip once if you need the desk. Next time it stays up.";
}
