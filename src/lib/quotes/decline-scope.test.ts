import { describe, expect, it } from "vitest";
import { matchCarrier, similarSnapshot } from "@/lib/appetite/match";
import type { AppetiteRuleInput, PriorAttempt, RiskSnapshot } from "@/lib/domain";
import { declineVisibleOnDeal, quoteDeletePlan, quoteRowDeclineWhy } from "./decline-scope";

const risk: RiskSnapshot = {
  yearBuilt: 1989,
  roofYear: 1989,
  roofCovering: "shingle",
  construction: "frame",
  openingProtection: "none",
  occupancy: "owner",
  stories: 1,
  pool: false,
  protectionClass: "3",
  milesToCoast: 8,
  city: "Palm Bay",
  county: "Brevard",
  coverageA: 250000,
  mobileHome: false,
  replacementCostEstimate: null,
  state: "FL",
};

const rule: AppetiteRuleInput = {
  carrierId: "carrier-1",
  carrierName: "Example",
  lineOfBusiness: "HO",
  minCovA: null,
  maxCovA: null,
  minYearBuilt: null,
  maxRoofAge: null,
  allowedRoofCoverings: null,
  coastalAllowed: true,
  minMilesToCoast: null,
  maxMilesToCoast: null,
  mobileAllowed: true,
  requiresOpeningProtection: false,
  maxStories: null,
  allowedConstruction: null,
  allowedOccupancy: null,
  allowedCounties: null,
  excludedCounties: null,
  countyMinCovA: null,
  requireReplacementCost: false,
  rceFloorRatio: null,
  portalStatus: "open",
  dontWriteNotes: null,
  writtenLines: ["HO"],
};

function prior(partial: Partial<PriorAttempt>): PriorAttempt {
  return {
    carrierId: "carrier-1",
    result: "declined",
    why: null,
    bindable: false,
    snapYearBuilt: null,
    snapRoofYear: null,
    snapRoofCovering: null,
    snapConstruction: null,
    snapCounty: null,
    snapMilesToCoast: null,
    snapCoverageA: null,
    ...partial,
  };
}

describe("lost quote scope", () => {
  it("scopes a delete to the deal and quote ids being removed", () => {
    const plan = quoteDeletePlan({ dealId: "deal-a", quoteIds: ["q1", " "] });
    expect(plan).toEqual({ dealId: "deal-a", quoteIds: ["q1"], bookWide: false });
    expect(plan.bookWide).toBe(false);
  });

  it("does not show a killed quote's decline on another deal", () => {
    const why = quoteRowDeclineWhy({ quoteId: "q1", detail: "Agent marked dead" });
    expect(declineVisibleOnDeal({ dealId: "deal-a", why }, "deal-b")).toBe(false);
    expect(declineVisibleOnDeal({ dealId: "deal-a", why }, "deal-a")).toBe(true);
  });

  it("does not red-out a carrier book-wide from an empty-snap or other-deal decline", () => {
    expect(similarSnapshot(prior({}), risk)).toBe(false);
    const empty = matchCarrier(risk, rule, [prior({})]);
    expect(empty.learnedDecline).toBe(false);
    expect(empty.band).toBe("green");

    const otherDeal = matchCarrier(
      risk,
      rule,
      [
        prior({
          why: quoteRowDeclineWhy({ quoteId: "q1", detail: "dead" }),
          dealId: "deal-a",
          declineScope: "deal",
          snapYearBuilt: 1989,
          snapRoofYear: 1989,
          snapConstruction: "frame",
          snapCounty: "Brevard",
          snapRoofCovering: "shingle",
        }),
      ],
      2026,
      "HO",
      "deal-b",
    );
    expect(otherDeal.learnedDecline).toBe(false);
    expect(otherDeal.band).toBe("green");
  });
});
