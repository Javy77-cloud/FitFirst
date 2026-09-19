import { describe, expect, it } from "vitest";
import { decodeReviewPulse, encodeReviewPulse, reviewPulseHeadline } from "./review-pulse";
import { miniReviewDue } from "./mini-review";

describe("bind → review → health pulse", () => {
  it("round-trips the cookie payload and writes premium, not naggy, copy", () => {
    const raw = encodeReviewPulse({
      policyId: "p1",
      contactId: "c1",
      accountId: null,
      trigger: "bind",
      clientName: "Elena Hale",
    });
    expect(decodeReviewPulse(raw)).toEqual({
      policyId: "p1",
      contactId: "c1",
      accountId: null,
      trigger: "bind",
      clientName: "Elena Hale",
    });
    expect(decodeReviewPulse("nope")).toBeNull();
    expect(reviewPulseHeadline("bind", "Elena Hale")).toMatch(/Bound/);
    expect(reviewPulseHeadline("call", "Elena Hale")).toMatch(/Call logged/);
  });

  it("stays quiet when a review is already on file — skip once, not twice", () => {
    expect(miniReviewDue({ triggerReady: true, answered: true, skipCount: 0 })).toBe(false);
    expect(miniReviewDue({ triggerReady: true, answered: false, skipCount: 0 })).toBe(true);
    expect(miniReviewDue({ triggerReady: true, answered: false, skipCount: 2 })).toBe(false);
  });
});
