import { describe, expect, it } from "vitest";
import {
  CHASE_MARK,
  chaseTemplateFor,
  parseChaseBand,
  primaryRenewalAction,
} from "./chase";
import { canSkipMiniReview, countRatingsUnder3, rotateMiniReviewQuestions } from "./mini-review";
import { compareLineTone, fallbackDiffSummary } from "./compare-tone";
import { buildFallbackDiffNote } from "./gemini-diff";

describe("90/60/30 chase templates", () => {
  it("picks the band template and refuses a second nag via the mark", () => {
    const note30 = chaseTemplateFor({ band: "under30", clientName: "Elena Hale", daysUntil: 12 });
    expect(note30.slug).toBe("renewal-chase-under30");
    expect(note30.body).toMatch(/know your policy/);
    expect(note30.body).toMatch(/watching/);
    expect(note30.body).toMatch(/quotes/);
    expect(chaseTemplateFor({ band: "30to60", clientName: "Elena Hale", daysUntil: 45 }).actionLabel).toMatch(
      /60-day/,
    );
    expect(chaseTemplateFor({ band: "60to90", clientName: "Elena Hale", daysUntil: 73 }).actionLabel).toMatch(
      /90-day/,
    );
    expect(parseChaseBand(`queued ${CHASE_MARK.under30}`)).toBe("under30");
    expect(primaryRenewalAction({ chasedThisBand: false, canCompare: true })).toBe("chase");
    expect(primaryRenewalAction({ chasedThisBand: true, canCompare: true })).toBe("compare");
    expect(primaryRenewalAction({ chasedThisBand: true, canCompare: false })).toBe("done");
  });
});

describe("mini-review", () => {
  it("rotates four questions and allows skip once not twice", () => {
    const first = rotateMiniReviewQuestions("c:c1:upcoming").map((row) => row.id);
    const second = rotateMiniReviewQuestions("c:c2:bound").map((row) => row.id);
    expect(first).toHaveLength(4);
    expect(second).toHaveLength(4);
    expect(canSkipMiniReview(0)).toBe(true);
    expect(canSkipMiniReview(1)).toBe(false);
    expect(countRatingsUnder3([2, 4, 1, 5])).toBe(2);
  });
});

describe("compare tones + Gemini fallback", () => {
  it("colors matched / moved / missing lines and stays snapshot-only without both sides", () => {
    expect(compareLineTone({ currentValue: "$10,000", proposedValue: "$10,000" })).toBe("green");
    expect(compareLineTone({ currentValue: "$10,000", proposedValue: "$12,000" })).toBe("amber");
    expect(compareLineTone({ currentValue: "$10,000", proposedValue: "—" })).toBe("red");
    expect(compareLineTone({ currentValue: "2184", proposedValue: "2547", kind: "premium" })).toBe("red");
    expect(compareLineTone({ currentValue: "2000", proposedValue: "2050", kind: "premium" })).toBe("red");
    expect(compareLineTone({ currentValue: "2000", proposedValue: "1900", kind: "premium" })).toBe("green");
    expect(compareLineTone({ currentValue: "2000", proposedValue: "2000", kind: "premium" })).toBe("green");
    expect(fallbackDiffSummary({ bothSides: false, changedCount: 0, missingCount: 0 })).toMatch(
      /Snapshot only/,
    );
    const note = buildFallbackDiffNote({
      bothSides: false,
      change: null,
      rows: [],
    });
    expect(note.source).toBe("fallback");
    expect(note.lossRisk).toBeNull();
    expect(note.bothSides).toBe(false);
  });
});
