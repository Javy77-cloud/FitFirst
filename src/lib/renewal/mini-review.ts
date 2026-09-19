export const MINI_REVIEW_QUESTIONS = [
  { id: "stay", prompt: "How likely are they to stay?" },
  { id: "talk", prompt: "How did the last conversation go?" },
  { id: "price", prompt: "How worried are they about price?" },
  { id: "packet", prompt: "How complete is the renewal packet?" },
  { id: "shop", prompt: "How shoppable is this risk right now?" },
] as const;

export type MiniReviewQuestionId = (typeof MINI_REVIEW_QUESTIONS)[number]["id"];
export type MiniReviewTrigger = "chase" | "bind" | "close" | "claim" | "call";

export type MiniReviewQuestion = {
  id: MiniReviewQuestionId;
  prompt: string;
};

/** Rotate 4 of 5 so the desk never sees the same wall twice. */
export function rotateMiniReviewQuestions(seed: string, count = 4): MiniReviewQuestion[] {
  const list = [...MINI_REVIEW_QUESTIONS];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = list.length - 1; i > 0; i -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const j = hash % (i + 1);
    const current = list[i];
    const swap = list[j];
    if (current && swap) {
      list[i] = swap;
      list[j] = current;
    }
  }
  return list.slice(0, Math.max(1, Math.min(count, list.length)));
}

export function countRatingsUnder3(scores: number[]): number {
  return scores.filter((score) => Number.isFinite(score) && score >= 1 && score < 3).length;
}

export function canSkipMiniReview(skipCount: number): boolean {
  return skipCount < 1;
}

export function miniReviewDue(input: {
  triggerReady: boolean;
  answered: boolean;
  skipCount: number;
}): boolean {
  if (!input.triggerReady || input.answered) return false;
  return input.skipCount < 2;
}

export function parseReviewScores(body: string | null | undefined): number[] {
  const raw = body ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]) as { scores?: Record<string, number> };
    return Object.values(parsed.scores ?? {}).filter((value) => typeof value === "number");
  } catch {
    return [];
  }
}
