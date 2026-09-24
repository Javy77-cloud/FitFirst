import { describe, expect, it } from "vitest";
import {
  derivedHealthStars,
  healthFlagFromRatings,
  riskLevelFromScore,
} from "./health";
import { roleHealthSummary } from "./health-rollup";
import type { RenewalBoardCard } from "./board-data";

function card(partial: Partial<RenewalBoardCard>): RenewalBoardCard {
  return {
    queueId: "q",
    policyId: "p",
    stage: "upcoming",
    displayName: "Policy",
    policyNumber: "P-1",
    clientName: "Elena Hale",
    contactId: "c1",
    accountId: null,
    email: null,
    phone: null,
    lineOfBusiness: "HO3",
    policySubType: null,
    insuranceType: null,
    commissionFamily: null,
    carrierName: "Citizens",
    expirationDate: null,
    renewalDate: null,
    daysUntil: 28,
    premium: "2184",
    proposedPremium: "2547",
    premiumDelta: 363,
    premiumDeltaPct: 363 / 2184,
    ownerId: "agent-1",
    ownerName: "Maya",
    partyKey: "c:c1",
    risk: "high",
    riskScore: 80,
    why: "Expires in 28 days",
    whyExtra: null,
    hasCurrentTerm: true,
    hasProposedTerm: true,
    canCompare: true,
    chasedThisBand: false,
    reviewDue: false,
    reviewSkipCount: 0,
    healthStars: 2,
    policyHealthStars: 2,
    healthSource: "rated",
    healthFlagged: true,
    lastContactDays: 90,
    policyHealth: null,
    clientHealth: null,
    autopilotQueued: false,
    autopilotEscalated: false,
    ...partial,
  };
}

describe("client health + composite risk mapping", () => {
  it("maps critical/high bands to High and watch to Low", () => {
    expect(riskLevelFromScore({ band: "critical" })).toBe("high");
    expect(riskLevelFromScore({ band: "high" })).toBe("high");
    expect(riskLevelFromScore({ band: "elevated" })).toBe("medium");
    expect(riskLevelFromScore({ band: "watch" })).toBe("low");
  });

  it("derives 1–5 stars from the composite score and flags after two ratings under 3", () => {
    expect(derivedHealthStars(80)).toBe(2);
    expect(derivedHealthStars(10)).toBe(5);
    expect(healthFlagFromRatings(1)).toBe(false);
    expect(healthFlagFromRatings(2)).toBe(true);
  });

  it("rolls agent books per client and owner books per agent — never per-policy primary", () => {
    const cards = [
      card({ policyId: "p1", partyKey: "c:c1", healthStars: 2, healthFlagged: true }),
      card({ policyId: "p2", partyKey: "c:c1", healthStars: 2, healthFlagged: true }),
      card({
        policyId: "p3",
        partyKey: "c:c2",
        clientName: "Priya Nair",
        ownerId: "agent-2",
        ownerName: "Luis",
        healthStars: 5,
        healthFlagged: false,
      }),
    ];
    const agent = roleHealthSummary({
      cards,
      isOwner: false,
      viewerId: "agent-1",
      viewerName: "Maya",
    });
    expect(agent.scope).toBe("agent");
    expect(agent.clients).toBe(1);
    expect(agent.perAgent).toEqual([]);
    expect(agent.flagged).toBe(1);

    const owner = roleHealthSummary({
      cards,
      isOwner: true,
      viewerId: "owner-1",
      viewerName: "Javy",
    });
    expect(owner.scope).toBe("agency");
    expect(owner.clients).toBe(2);
    expect(owner.perAgent.map((row) => row.ownerName)).toEqual(["Maya", "Luis"]);
  });
});
