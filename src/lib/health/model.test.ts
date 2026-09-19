import { describe, expect, it } from "vitest";
import {
  CLIENT_HEALTH_WEIGHTS,
  POLICY_HEALTH_WEIGHTS,
  computeClientHealth,
  computePolicyHealth,
  healthBand,
  lockedHealthDigIn,
  rollupHealthScores,
  scoreBookShape,
  scoreEngagement,
  scoreOpenRisk,
  scoreRatings,
  scoreVelocity,
} from "./model";

const quietEngagement = {
  lastCommsDaysAgo: 21,
  commsLast30: 0,
  commsLast90: 1,
  medianReplyHours: 80,
};
const liveEngagement = {
  lastCommsDaysAgo: 1,
  commsLast30: 4,
  commsLast90: 6,
  medianReplyHours: 3,
};
const bookMono = { inForceCount: 1, lifetimeCount: 1, addedLast180: 0, endedLast180: 0 };
const bookMulti = { inForceCount: 3, lifetimeCount: 3, addedLast180: 1, endedLast180: 0 };
const velocitySlow = {
  leadToDealDays: 28,
  dealToCloseDays: 70,
  openDealAgeDays: null,
  daysUntilRenewal: 12,
  daysSinceRenewalComms: 20,
};
const velocityFast = {
  leadToDealDays: 2,
  dealToCloseDays: 10,
  openDealAgeDays: null,
  daysUntilRenewal: 40,
  daysSinceRenewalComms: 4,
};
const noRisk = {
  under30Silence: false,
  coldOpenDeals: 0,
  highAlertCount: 0,
  cancelOrLapse: false,
  paymentOverdue: null,
};
const hotRisk = {
  under30Silence: true,
  coldOpenDeals: 1,
  highAlertCount: 1,
  cancelOrLapse: false,
  paymentOverdue: null,
};

describe("health weights", () => {
  it("sums policy and client weights to 100 and never says retention", () => {
    const policy = Object.values(POLICY_HEALTH_WEIGHTS).reduce((sum, n) => sum + n, 0);
    const client = Object.values(CLIENT_HEALTH_WEIGHTS).reduce((sum, n) => sum + n, 0);
    expect(policy).toBe(100);
    expect(client).toBe(100);
    const source = [
      String(computeClientHealth),
      String(computePolicyHealth),
      String(scoreRatings),
    ].join("\n");
    expect(source).not.toMatch(/retention/i);
  });
});

describe("health bands", () => {
  it("maps 0–57 High, 58–74 Medium, 75+ Low", () => {
    expect(healthBand(12)).toBe("high");
    expect(healthBand(57)).toBe("high");
    expect(healthBand(58)).toBe("medium");
    expect(healthBand(74)).toBe("medium");
    expect(healthBand(75)).toBe("low");
  });
});

describe("named score inputs", () => {
  it("scores reply speed and silence from platform comms", () => {
    const quiet = scoreEngagement(quietEngagement);
    const live = scoreEngagement(liveEngagement);
    expect(quiet.score).toBeLessThan(live.score);
    expect(quiet.why).toMatch(/Silent 21d/);
    expect(live.why).toMatch(/replies in/);
    expect(live.source).toBe("live");
  });

  it("scores book shape from policies with us, tenure, adds, and cancels", () => {
    const mono = scoreBookShape(bookMono);
    const multi = scoreBookShape(bookMulti);
    const cancelled = scoreBookShape({
      inForceCount: 1,
      lifetimeCount: 3,
      addedLast180: 0,
      endedLast180: 2,
      tenureDays: 400,
    });
    expect(multi.score).toBeGreaterThan(mono.score);
    expect(cancelled.score).toBeLessThan(mono.score);
    expect(cancelled.why).toMatch(/ended in 180d/);
    expect(cancelled.why).toMatch(/with us/);
  });

  it("scores lead → deal → close velocity and renewal reply", () => {
    expect(scoreVelocity(velocityFast).score).toBeGreaterThan(scoreVelocity(velocitySlow).score);
    expect(scoreVelocity(velocitySlow).why).toMatch(/lead→deal/);
    expect(scoreVelocity(velocitySlow).why).toMatch(/deal→close/);
  });

  it("flags after two ratings under 3 and stays neutral with no reviews", () => {
    const none = scoreRatings({ ratings: [], average: null });
    const flagged = scoreRatings({ ratings: [2, 2, 4], average: 8 / 3 });
    const healthy = scoreRatings({ ratings: [5, 4], average: 4.5 });
    expect(none.source).toBe("neutral");
    expect(flagged.score).toBeLessThanOrEqual(35);
    expect(flagged.why).toMatch(/two ratings under 3/);
    expect(healthy.score).toBeGreaterThan(flagged.score);
  });

  it("drops open risk for Under-30 silence, cold deals, and High alerts; stubs payment", () => {
    const clean = scoreOpenRisk(noRisk);
    const hot = scoreOpenRisk(hotRisk);
    expect(hot.score).toBeLessThan(clean.score);
    expect(hot.why).toMatch(/Under-30 silence/);
    expect(clean.why).toMatch(/Payment flags stubbed/);
  });
});

describe("client vs policy health", () => {
  it("aggregates policy scores into client health and keeps client as the rollup", () => {
    const client = computeClientHealth({
      engagement: quietEngagement,
      bookShape: bookMono,
      velocity: velocitySlow,
      ratings: { ratings: [2, 1], average: 1.5 },
      openRisk: hotRisk,
      policyScores: [40, 42],
    });
    expect(client.kind).toBe("client");
    expect(client.band).toBe("high");
    expect(client.flags).toContain("Two ratings under 3");
    expect(client.factors.some((row) => row.id === "policyRollup")).toBe(true);
  });

  it("computes policy health from the same named inputs", () => {
    const policy = computePolicyHealth({
      engagement: liveEngagement,
      bookShape: bookMulti,
      velocity: velocityFast,
      ratings: { ratings: [5], average: 5 },
      openRisk: noRisk,
      deskSignals: {
        daysUntilRenewal: 80,
        premiumDelta: -20,
        premium: 1200,
        inForce: true,
      },
    });
    expect(policy.kind).toBe("policy");
    expect(policy.band).toBe("low");
  });
});

describe("locked dig-in rows", () => {
  it("exposes talk, reply, policy count, tenure, adds/cancels, and ratings", () => {
    const rows = lockedHealthDigIn({
      engagement: liveEngagement,
      bookShape: { ...bookMulti, tenureDays: 800 },
      ratings: { ratings: [5, 4], average: 4.5 },
    });
    const ids = rows.map((row) => row.id);
    expect(ids).toEqual(["interaction", "reply", "policyCount", "tenure", "bookMotion", "ratings"]);
    expect(rows.find((row) => row.id === "interaction")?.why).toMatch(/comms \/ 30d/);
    expect(rows.find((row) => row.id === "reply")?.why).toMatch(/Replies in/);
    expect(rows.find((row) => row.id === "policyCount")?.why).toMatch(/in-force/);
    expect(rows.find((row) => row.id === "tenure")?.why).toMatch(/with us/);
    expect(rows.find((row) => row.id === "bookMotion")?.why).toMatch(/add/);
    expect(rows.find((row) => row.id === "ratings")?.why).toMatch(/★/);
  });
});

describe("role rollups", () => {
  it("rolls client scores into agency and per-agent books", () => {
    const agency = rollupHealthScores([
      { ownerId: "a", ownerName: "Ava", score: 40 },
      { ownerId: "a", ownerName: "Ava", score: 50 },
      { ownerId: "b", ownerName: "Ben", score: 90 },
    ]);
    expect(agency.clientCount).toBe(3);
    expect(agency.highCount).toBe(2);
    expect(agency.lowCount).toBe(1);
    expect(agency.averageScore).toBeGreaterThan(0);
  });
});
