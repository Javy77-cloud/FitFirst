import { describe, expect, it } from "vitest";
import { reviewPulseHeadline, triggerFromReviewMoment } from "./review-pulse";
import { miniReviewDue } from "./mini-review";

describe("bind → review → health pulse", () => {
  it("writes premium, not naggy, copy for locked moments", () => {
    expect(reviewPulseHeadline("bind", "Elena Hale")).toMatch(/Bound/);
    expect(reviewPulseHeadline("call", "Elena Hale")).toMatch(/Call logged/);
    expect(reviewPulseHeadline("bind", null)).toMatch(/them/);
    expect(reviewPulseHeadline("bind", undefined)).toMatch(/them/);
    expect(triggerFromReviewMoment("bind")).toBe("bind");
    expect(triggerFromReviewMoment("renewal_close")).toBe("close");
    expect(triggerFromReviewMoment("claim_wrap")).toBe("claim");
    expect(triggerFromReviewMoment("logged_call")).toBe("call");
  });

  it("stays quiet when a review is already on file — skip once, not twice", () => {
    expect(miniReviewDue({ triggerReady: true, answered: true, skipCount: 0 })).toBe(false);
    expect(miniReviewDue({ triggerReady: true, answered: false, skipCount: 0 })).toBe(true);
    expect(miniReviewDue({ triggerReady: true, answered: false, skipCount: 2 })).toBe(false);
  });
});
