import { describe, expect, it } from "vitest";
import {
  REVIEW_MOMENTS,
  REVIEW_PROMPTS,
  parseReviewStars,
  rotateReviewPrompt,
  shouldOfferReview,
} from "./reviews";

describe("mini-review capture", () => {
  it("covers bind, renewal close, claim wrap, and logged call only", () => {
    expect([...REVIEW_MOMENTS]).toEqual(["bind", "renewal_close", "claim_wrap", "logged_call"]);
    expect(REVIEW_PROMPTS).toHaveLength(5);
  });

  it("allows skip once, not twice, and blocks a second rating", () => {
    expect(shouldOfferReview({ alreadyRated: false, skipCount: 0 })).toBe(true);
    expect(shouldOfferReview({ alreadyRated: false, skipCount: 1 })).toBe(true);
    expect(shouldOfferReview({ alreadyRated: false, skipCount: 2 })).toBe(false);
    expect(shouldOfferReview({ alreadyRated: true, skipCount: 0 })).toBe(false);
  });

  it("accepts 1–5 stars and rotates prompts", () => {
    expect(parseReviewStars(3)).toBe(3);
    expect(parseReviewStars(0)).toBeNull();
    expect(parseReviewStars(6)).toBeNull();
    const a = rotateReviewPrompt("bind:policy-1");
    const b = rotateReviewPrompt("logged_call:act-2");
    expect(REVIEW_PROMPTS.map((row) => row.id)).toContain(a.id);
    expect(REVIEW_PROMPTS.map((row) => row.id)).toContain(b.id);
  });
});
