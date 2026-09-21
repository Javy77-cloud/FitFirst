import { describe, expect, it } from "vitest";
import {
  COLD_COMM_DAYS,
  buildVelocityClocks,
  clientHealthScore,
  commGapDays,
  dealValue,
  eventsFromTouches,
  formatClockDays,
  heatFromCommGap,
  heatForDeal,
  isClosedShoppingDeal,
  isPlatformCommKind,
  policyHealthScore,
  primaryDealAction,
  privateRankLabel,
  radarLegendCopy,
  bubbleSizeRem,
  radarPosition,
  rankByScore,
  resolveActivePhase,
  silenceDays,
  sparkBuckets,
  urgencyScore,
} from "./velocity";

const now = new Date("2026-09-19T12:00:00.000Z");

describe("velocity engine", () => {
  it("treats call / email / SMS / meeting as platform-logged comms and ignores tasks", () => {
    expect(isPlatformCommKind("call")).toBe(true);
    expect(isPlatformCommKind("email")).toBe(true);
    expect(isPlatformCommKind("sms")).toBe(true);
    expect(isPlatformCommKind("meeting")).toBe(true);
    expect(isPlatformCommKind("task")).toBe(false);
    expect(isPlatformCommKind("training")).toBe(false);
    expect(eventsFromTouches({ comms: [{ at: now, kind: "task" }] })).toEqual([]);
    expect(eventsFromTouches({ comms: [{ at: now, kind: "call" }] })).toHaveLength(1);
  });

  it("sizes Book Heat bubbles by deal value", () => {
    expect(bubbleSizeRem(0)).toBeLessThan(bubbleSizeRem(50_000));
    expect(bubbleSizeRem(50_000)).toBeLessThan(bubbleSizeRem(500_000));
    expect(bubbleSizeRem(1_000_000)).toBeGreaterThan(1);
  });

    it("locks the 14-day cold rule and near-cold flicker band", () => {
    expect(COLD_COMM_DAYS).toBe(14);
    expect(heatFromCommGap(4)).toBe("hot");
    expect(heatFromCommGap(5)).toBe("cooling");
    expect(heatFromCommGap(10)).toBe("near_cold");
    expect(heatFromCommGap(14)).toBe("cold");
    expect(
      commGapDays({
        lastCommAt: new Date("2026-09-05T12:00:00.000Z"),
        openedAt: new Date("2026-08-01T12:00:00.000Z"),
        now,
      }),
    ).toBe(14);
  });

  it("walks details → docs → risk → quotes → post-quote as the active phase", () => {
    expect(
      resolveActivePhase({ detailsReady: false, docsReady: false, riskReady: false, quotesReady: false }),
    ).toBe("details");
    expect(
      resolveActivePhase({ detailsReady: true, docsReady: false, riskReady: false, quotesReady: false }),
    ).toBe("docs");
    expect(
      resolveActivePhase({ detailsReady: true, docsReady: true, riskReady: false, quotesReady: false }),
    ).toBe("risk");
    expect(
      resolveActivePhase({ detailsReady: true, docsReady: true, riskReady: true, quotesReady: false }),
    ).toBe("quotes");
    expect(
      resolveActivePhase({ detailsReady: true, docsReady: true, riskReady: true, quotesReady: true }),
    ).toBe("post_quote_gap");
  });

  it("defaults value to Coverage A and falls back to quoted premium", () => {
    expect(dealValue(321000, 1800)).toEqual({ amount: 321000, metric: "coverage_a" });
    expect(dealValue(null, 1800)).toEqual({ amount: 1800, metric: "premium" });
    expect(dealValue(null, null)).toEqual({ amount: 0, metric: "coverage_a" });
  });

  it("builds lead→deal as a completed diagnostic and keeps live clocks running", () => {
    const clocks = buildVelocityClocks({
      createdAt: new Date("2026-09-10T12:00:00.000Z"),
      leadCreatedAt: new Date("2026-09-01T12:00:00.000Z"),
      detailsReady: true,
      detailsReadyAt: new Date("2026-09-11T12:00:00.000Z"),
      docsReady: false,
      riskReady: false,
      quotesReady: false,
      now,
    });
    expect(clocks.lead_to_deal.complete).toBe(true);
    expect(clocks.lead_to_deal.diagnostic).toBe(true);
    expect(clocks.lead_to_deal.days).toBe(9);
    expect(clocks.details.complete).toBe(true);
    expect(clocks.docs.complete).toBe(false);
    expect(clocks.docs.days).toBe(8);
  });

  it("bubbles cold deals in the stack and maps one primary action per phase", () => {
    const cold = urgencyScore({
      heat: "cold",
      commGapDays: 16,
      daysInPhase: 8,
      value: 321000,
      phase: "post_quote_gap",
    });
    const hot = urgencyScore({
      heat: "hot",
      commGapDays: 1,
      daysInPhase: 1,
      value: 80000,
      phase: "details",
    });
    expect(cold).toBeGreaterThan(hot);
    expect(primaryDealAction({ dealId: "d1", phase: "details", heat: "hot" }).label).toBe("Open details");
    expect(primaryDealAction({ dealId: "d1", phase: "docs", heat: "hot" }).href).toBe(
      "/deals/d1?tab=documents",
    );
    expect(primaryDealAction({ dealId: "d1", phase: "docs", heat: "cold" }).label).toBe("Upload docs");
    expect(primaryDealAction({ dealId: "d1", phase: "post_quote_gap", heat: "cold" }).label).toBe("Follow up");
    expect(primaryDealAction({ dealId: "d1", phase: "quotes", heat: "cold" }).label).toBe("Send quote");
    expect(primaryDealAction({ dealId: "d1", phase: "details", heat: "cold" }).label).toBe("Call");
    expect(
      primaryDealAction({ dealId: "d1", phase: "quotes", heat: "hot", quoteSent: true }).label,
    ).toBe("Follow up");
    expect(primaryDealAction({ dealId: "d1", phase: "quotes", heat: "hot" }).label).not.toBe("Chase");
    expect(isClosedShoppingDeal({ pipelineStageSlug: "closed_won" })).toBe(true);
    expect(heatForDeal({ commGapDays: 16, closed: true })).toBe("cold");
    expect(heatForDeal({ silenceDays: 2, daysInPhase: 12, value: 40_000 })).toBe("hot");
    expect(heatForDeal({ silenceDays: 14 })).toBe("cold");
  });

  it("places radar dots by phase age and silence, not Coverage A", () => {
    expect(radarPosition({ daysInPhase: 10.5, silenceDays: 10.5 })).toEqual({
      x: 0.5,
      y: 0.5,
    });
    expect(radarLegendCopy()).toMatchObject({
      x: "Days in current phase (Details · Docs · Risk · Quotes · Post-quote gap)",
      xTitle: "Days in current phase",
      yTitle: "Days silent",
      xStart: "Now",
      xEnd: "21d",
    });
    expect(radarLegendCopy().y).toMatch(/Days silent/);
    expect(radarLegendCopy().y).not.toMatch(/Coverage A/);
    expect(
      silenceDays({
        lastCommAt: new Date("2026-08-01T12:00:00.000Z"),
        lastQuoteAt: new Date("2026-09-17T12:00:00.000Z"),
        quotesReady: true,
        openedAt: new Date("2026-08-01T12:00:00.000Z"),
        now,
      }),
    ).toBe(2);
    expect(
      silenceDays({
        lastCommAt: new Date("2026-09-18T12:00:00.000Z"),
        lastQuoteAt: new Date("2026-09-10T12:00:00.000Z"),
        quotesReady: true,
        openedAt: new Date("2026-08-01T12:00:00.000Z"),
        now,
      }),
    ).toBe(1);
    expect(formatClockDays(1)).toBe("1d");
    expect(privateRankLabel(6, 40)).toBe("6 of 40, top 15%");
    expect(rankByScore([10, 20, 30, 40], 20)).toEqual({
      position: 2,
      total: 4,
      label: "2 of 4, top 50%",
    });
    expect(clientHealthScore({ commGapDays: 2, detailsReady: true, docsReady: true, quotesReady: true })).toBeGreaterThan(
      80,
    );
    expect(
      policyHealthScore({
        detailsReady: true,
        docsReady: true,
        riskReady: true,
        quotesReady: true,
        commGapDays: 0,
      }),
    ).toBe(100);
  });

  it("buckets the last 14 days into a 7-point spark", () => {
    expect(
      sparkBuckets(
        [new Date("2026-09-19T11:00:00.000Z"), new Date("2026-09-12T12:00:00.000Z")],
        now,
      ),
    ).toHaveLength(7);
  });
});
