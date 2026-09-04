import { describe, expect, it } from "vitest";
import { DESK_AS_OF } from "@/lib/home/as-of";
import {
  bandForScore,
  daysUntil,
  householdHasLapse,
  householdInForceCount,
  isBeforeRateIncreaseWindow,
  isInRateIncreaseWindow,
  nearestRenewalDays,
  scoreRenewalRisk,
} from "./score";

describe("renewal-risk heuristics (no ML)", () => {
  it("flags Hale-style HO before/inside the rate-increase window", () => {
    const haleExp = new Date("2026-10-01T05:00:00.000Z");
    const days = daysUntil(DESK_AS_OF, haleExp);
    expect(days).toBe(28);
    expect(isInRateIncreaseWindow(days)).toBe(true);

    const risk = scoreRenewalRisk({
      daysToRenewal: days,
      premiumChangePct: 0.166,
      inForceCount: 1,
      hasLapseHistory: false,
      daysSinceContact: 90,
    });
    expect(risk.score).toBe(80);
    expect(risk.band).toBe("critical");
    expect(risk.flagged).toBe(true);
    expect(risk.factors.map((f) => f.id)).toEqual(
      expect.arrayContaining(["days_to_renewal", "premium_change", "monoline", "no_contact_60d"]),
    );
  });

  it("scores Nair-style Auto lower when premium is down but still flags before the window", () => {
    const nairExp = new Date("2026-11-15T05:00:00.000Z");
    const days = daysUntil(DESK_AS_OF, nairExp);
    expect(days).toBe(73);
    expect(isInRateIncreaseWindow(days)).toBe(true);
    expect(isBeforeRateIncreaseWindow(88)).toBe(true);

    const risk = scoreRenewalRisk({
      daysToRenewal: days,
      premiumChangePct: -0.05,
      inForceCount: 1,
      hasLapseHistory: false,
      daysSinceContact: 12,
    });
    expect(risk.score).toBe(20 + 15);
    expect(risk.band).toBe("elevated");
    expect(risk.flagged).toBe(true);
    expect(risk.factors.find((f) => f.id === "premium_change")).toBeUndefined();
  });

  it("does not invent a score for Ana-style 0-policy shopping", () => {
    expect(householdInForceCount([{ status: "quote_sent" }])).toBe(0);
    expect(nearestRenewalDays([], DESK_AS_OF)).toBeNull();
    const risk = scoreRenewalRisk({
      daysToRenewal: null,
      premiumChangePct: null,
      inForceCount: 0,
      hasLapseHistory: false,
      daysSinceContact: null,
    });
    expect(risk.score).toBe(15);
    expect(risk.flagged).toBe(false);
  });

  it("adds lapse history and keeps band labels deterministic", () => {
    expect(householdHasLapse([{ status: "active" }, { status: "lapse" }])).toBe(true);
    expect(bandForScore(80)).toBe("critical");
    const risk = scoreRenewalRisk({
      daysToRenewal: 50,
      premiumChangePct: 0.2,
      inForceCount: 1,
      hasLapseHistory: true,
      daysSinceContact: 80,
    });
    expect(risk.score).toBe(100);
    expect(risk.label).toBe("Critical");
    expect(risk.inRateIncreaseWindow).toBe(true);
  });
});
