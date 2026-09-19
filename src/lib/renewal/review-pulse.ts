import type { ReviewMoment } from "@/lib/health/reviews";
import type { MiniReviewTrigger } from "@/lib/renewal/mini-review";

export function triggerFromReviewMoment(moment: ReviewMoment): MiniReviewTrigger {
  if (moment === "renewal_close") return "close";
  if (moment === "claim_wrap") return "claim";
  if (moment === "logged_call") return "call";
  return "bind";
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
  if (trigger === "bind") return "One tap. Two scores under 3 flags the client — not the policy.";
  if (trigger === "claim") return "After wrap, two weak scores flag health on the renewal card.";
  return "Skip once if you need the desk. Next time it stays up.";
}
