export const REVIEW_MOMENTS = [
  "bind",
  "renewal_close",
  "claim_wrap",
  "logged_call",
] as const;

export type ReviewMoment = (typeof REVIEW_MOMENTS)[number];

export const REVIEW_PROMPTS = [
  { id: "conversation", text: "How did this conversation go?" },
  { id: "responsiveness", text: "How responsive was the client?" },
  { id: "stay_confidence", text: "How confident are you they will stay?" },
  { id: "process_smooth", text: "How smooth was this touchpoint?" },
  { id: "next_step", text: "How clear is the next step with this client?" },
] as const;

export type ReviewPromptId = (typeof REVIEW_PROMPTS)[number]["id"];

export const REVIEW_MOMENT_LABEL: Record<ReviewMoment, string> = {
  bind: "after a bind",
  renewal_close: "after a renewal close",
  claim_wrap: "after a claim wrap",
  logged_call: "after a logged call",
};

const MAX_SKIPS = 2;

export function rotateReviewPrompt(seed: string): (typeof REVIEW_PROMPTS)[number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 2147483647;
  }
  return REVIEW_PROMPTS[Math.abs(hash) % REVIEW_PROMPTS.length] ?? REVIEW_PROMPTS[0];
}


/** True only for a finished call log — not an open schedule / reminder. */
export function isLoggedCallPulseCandidate(row: {
  kind?: string | null;
  status?: string | null;
}): boolean {
  if ((row.kind || "").trim().toLowerCase() !== "call") return false;
  return (row.status || "").trim().toLowerCase() === "completed";
}

export function shouldOfferReview(input: {
  alreadyRated: boolean;
  skipCount: number;
}): boolean {
  if (input.alreadyRated) return false;
  return input.skipCount < MAX_SKIPS;
}

export function parseReviewStars(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

export function isReviewMoment(value: string): value is ReviewMoment {
  return (REVIEW_MOMENTS as readonly string[]).includes(value);
}

export type PendingReviewPrompt = {
  moment: ReviewMoment;
  promptId: ReviewPromptId;
  promptText: string;
  entityLabel: string;
  contactId: string | null;
  policyId: string | null;
  dealId: string | null;
  activityId: string | null;
  skipCount: number;
};
