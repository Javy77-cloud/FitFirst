import { describe, expect, it } from "vitest";
import {
  ADVANCE_NOTHING_TO_ADVANCE,
  advanceTermAlreadyApplied,
  inferAnnualRollTermDates,
  planPolicyTermDemotions,
  resolveAdvanceTermDates,
  unresolvedAdvanceResult,
} from "./advance-current-term";

describe("inferAnnualRollTermDates", () => {
  it("rolls Zoila HO4-style term like sibling 10641239 (exp→eff, +prior length)", () => {
    const rolled = inferAnnualRollTermDates({
      termEffective: "2025-07-31T12:00:00.000Z",
      termExpiration: "2026-07-30T12:00:00.000Z",
    });
    expect(rolled).not.toBeNull();
    expect(rolled!.effective.toISOString().slice(0, 10)).toBe("2026-07-30");
    expect(rolled!.expiration.toISOString().slice(0, 10)).toBe("2027-07-29");
  });

  it("preserves 6-month term length", () => {
    const rolled = inferAnnualRollTermDates({
      termEffective: "2026-01-15T12:00:00.000Z",
      termExpiration: "2026-07-15T12:00:00.000Z",
    });
    expect(rolled!.effective.toISOString().slice(0, 10)).toBe("2026-07-15");
    expect(rolled!.expiration.toISOString().slice(0, 10)).toBe("2027-01-12");
  });
});

describe("resolveAdvanceTermDates", () => {
  const previous = {
    termEffective: "2025-07-31T12:00:00.000Z",
    termExpiration: "2026-07-30T12:00:00.000Z",
  };

  it("prefers complete DEC extract over annual roll", () => {
    const result = resolveAdvanceTermDates({
      extractedEffective: "2026-07-31",
      extractedExpiration: "2027-07-30",
      previousCurrent: previous,
      policyEffective: previous.termEffective,
      policyExpiration: previous.termExpiration,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("extracted");
    expect(result.dates.effective.toISOString().slice(0, 10)).toBe("2026-07-31");
    expect(result.dates.expiration.toISOString().slice(0, 10)).toBe("2027-07-30");
  });

  it("refuses partial DEC extract instead of inventing the other date", () => {
    const result = resolveAdvanceTermDates({
      extractedEffective: "2026-07-31",
      extractedExpiration: null,
      previousCurrent: previous,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/only one/i);
  });

  it("refuses conflicting DEC extract dates", () => {
    const result = resolveAdvanceTermDates({
      extractedEffective: "2027-07-30",
      extractedExpiration: "2026-07-31",
      previousCurrent: previous,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/conflicting/i);
  });

  it("uses agent-edited policy dates when they differ from prior current term", () => {
    const result = resolveAdvanceTermDates({
      previousCurrent: previous,
      policyEffective: "2026-08-01",
      policyExpiration: "2027-07-31",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("policy_edited");
    expect(result.dates.effective.toISOString().slice(0, 10)).toBe("2026-08-01");
  });

  it("uses proposed term when policy still matches old current", () => {
    const result = resolveAdvanceTermDates({
      previousCurrent: previous,
      policyEffective: previous.termEffective,
      policyExpiration: previous.termExpiration,
      proposed: {
        termEffective: "2026-07-30T12:00:00.000Z",
        termExpiration: "2027-07-29T12:00:00.000Z",
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("proposed_term");
    expect(result.dates.expiration.toISOString().slice(0, 10)).toBe("2027-07-29");
  });

  it("falls back to annual roll matching sibling pattern when prior is expired", () => {
    const result = resolveAdvanceTermDates({
      previousCurrent: previous,
      policyEffective: previous.termEffective,
      policyExpiration: previous.termExpiration,
      asOf: "2026-09-23",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("annual_roll");
    expect(result.dates.effective.toISOString().slice(0, 10)).toBe("2026-07-30");
    expect(result.dates.expiration.toISOString().slice(0, 10)).toBe("2027-07-29");
  });

  it("does not annual-roll a mid-term Current mark without extract/proposed", () => {
    const result = resolveAdvanceTermDates({
      previousCurrent: {
        termEffective: "2026-01-01T12:00:00.000Z",
        termExpiration: "2027-01-01T12:00:00.000Z",
      },
      policyEffective: "2026-01-01T12:00:00.000Z",
      policyExpiration: "2027-01-01T12:00:00.000Z",
      asOf: "2026-09-23",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe(ADVANCE_NOTHING_TO_ADVANCE);
  });
});

describe("unresolvedAdvanceResult", () => {
  it("soft-fails a first Current mark when there is nothing to roll", () => {
    expect(unresolvedAdvanceResult("document_term_role", ADVANCE_NOTHING_TO_ADVANCE)).toEqual({
      ok: true,
      advanced: false,
      reason: ADVANCE_NOTHING_TO_ADVANCE,
    });
    expect(unresolvedAdvanceResult("client_staying", ADVANCE_NOTHING_TO_ADVANCE).ok).toBe(true);
  });

  it("keeps manual_fix date failures as errors", () => {
    expect(unresolvedAdvanceResult("manual_fix", ADVANCE_NOTHING_TO_ADVANCE)).toEqual({
      ok: false,
      error: ADVANCE_NOTHING_TO_ADVANCE,
    });
  });
});

describe("advanceTermAlreadyApplied", () => {
  it("is true when current term already matches next dates", () => {
    expect(
      advanceTermAlreadyApplied(
        {
          termEffective: "2026-07-30T12:00:00.000Z",
          termExpiration: "2027-07-29T12:00:00.000Z",
        },
        {
          effective: new Date("2026-07-30T12:00:00.000Z"),
          expiration: new Date("2027-07-29T12:00:00.000Z"),
        },
      ),
    ).toBe(true);
  });
});

describe("planPolicyTermDemotions", () => {
  it("lists current term ids to demote to prior", () => {
    const plan = planPolicyTermDemotions([
      { id: "c1", role: "current", termEffective: "2025-07-31" },
      { id: "p1", role: "prior", termEffective: "2024-07-31" },
      { id: "prop", role: "proposed", termEffective: "2026-07-30" },
    ]);
    expect(plan.demoteCurrentToPrior).toEqual(["c1"]);
  });
});
