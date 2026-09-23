import { describe, expect, it } from "vitest";
import {
  glanceDate,
  partyAttentionHeat,
  policyAttention,
  relativeTouchLabel,
  sortCommandStack,
} from "./heat";

describe("book-list heat", () => {
  it("flags people who need a touch, not a shame board", () => {
    expect(partyAttentionHeat({ lastTouchDays: 100, inForce: 2, openDeals: 0 })).toBe("hot");
    expect(partyAttentionHeat({ lastTouchDays: 10, inForce: 1, openDeals: 1 })).toBe("cooling");
    expect(partyAttentionHeat({ lastTouchDays: 3, inForce: 1, openDeals: 0 })).toBe("cold");
    expect(relativeTouchLabel(0)).toBe("Today");
    expect(relativeTouchLabel(null)).toBe("Never");
  });

  it("bands policies by renewal, silence, and open needs", () => {
    expect(
      policyAttention({
        daysUntil: 12,
        lastTouchDays: 2,
        lapsed: false,
        openClaims: 0,
        pendingEndorsements: 0,
        missingDocs: 0,
      }).column,
    ).toBe("now");
    expect(
      policyAttention({
        daysUntil: 80,
        lastTouchDays: 40,
        lapsed: false,
        openClaims: 0,
        pendingEndorsements: 0,
        missingDocs: 0,
      }).column,
    ).toBe("watch");
    expect(
      policyAttention({
        daysUntil: 200,
        lastTouchDays: 4,
        lapsed: false,
        openClaims: 0,
        pendingEndorsements: 0,
        missingDocs: 0,
      }).column,
    ).toBe("current");
    expect(
      policyAttention({
        daysUntil: 200,
        lastTouchDays: 4,
        lapsed: false,
        openClaims: 1,
        pendingEndorsements: 0,
        missingDocs: 0,
      }).why,
    ).toMatch(/claim/);
    expect(glanceDate("2026-10-03T00:00:00.000Z")).toBe("Oct 3, 2026");
    expect(
      policyAttention({
        daysUntil: 12,
        lastTouchDays: 2,
        lapsed: false,
        openClaims: 0,
        pendingEndorsements: 0,
        missingDocs: 0,
        expirationLabel: "Oct 3, 2026",
      }).why,
    ).toBe("Renews in 12d, Oct 3, 2026");
  });

  it("stacks hottest / stalest first", () => {
    const ranked = sortCommandStack([
      { heat: "cold", lastTouchDays: 2 },
      { heat: "hot", lastTouchDays: 12 },
      { heat: "hot", lastTouchDays: 90 },
    ]);
    expect(ranked.map((row) => row.lastTouchDays)).toEqual([90, 12, 2]);
  });

  it("labels past expiration without a future countdown", () => {
    expect(
      policyAttention({
        daysUntil: -176,
        lastTouchDays: 2,
        lapsed: false,
        openClaims: 0,
        pendingEndorsements: 0,
        missingDocs: 0,
        expirationLabel: "Mar 31, 2026",
      }),
    ).toMatchObject({
      column: "now",
      why: "Expired Mar 31, 2026",
    });
    expect(
      policyAttention({
        daysUntil: -176,
        lastTouchDays: 2,
        lapsed: false,
        openClaims: 0,
        pendingEndorsements: 0,
        missingDocs: 0,
      }).why,
    ).toBe("Past expiration");
  });

  it("keeps Handled renewals out of care and midterm bands", () => {
    expect(
      policyAttention({
        daysUntil: 16,
        lastTouchDays: 2,
        lapsed: false,
        openClaims: 0,
        pendingEndorsements: 0,
        missingDocs: 0,
        renewalHandled: true,
      }).column,
    ).toBe("current");
    expect(
      policyAttention({
        daysUntil: 45,
        lastTouchDays: 2,
        lapsed: false,
        openClaims: 0,
        pendingEndorsements: 0,
        missingDocs: 0,
        renewalHandled: true,
      }).column,
    ).toBe("current");
    expect(
      policyAttention({
        daysUntil: 16,
        lastTouchDays: 2,
        lapsed: false,
        openClaims: 1,
        pendingEndorsements: 0,
        missingDocs: 0,
        renewalHandled: true,
      }).column,
    ).toBe("now");
  });


  it("keeps off-book statuses out of Needs care / Watch via lapsed or renewal heat", () => {
    for (const label of ["Lapsed", "Cancelled", "Non-renewed", "Expired"]) {
      expect(
        policyAttention({
          daysUntil: 318,
          lastTouchDays: 2,
          lapsed: true,
          openClaims: 0,
          pendingEndorsements: 0,
          missingDocs: 0,
          expirationLabel: "Aug 7, 2027",
          offBookLabel: label,
        }),
      ).toMatchObject({ column: "current", heat: "cold", why: label });
    }
    // Open claims still escalate
    expect(
      policyAttention({
        daysUntil: 318,
        lastTouchDays: 2,
        lapsed: true,
        openClaims: 1,
        pendingEndorsements: 0,
        missingDocs: 0,
        offBookLabel: "Lapsed",
      }).column,
    ).toBe("now");
  });


});