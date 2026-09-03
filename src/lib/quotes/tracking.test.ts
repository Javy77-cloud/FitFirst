import { describe, expect, it } from "vitest";
import { matchCarrier, rankFits } from "@/lib/appetite/match";
import type { AppetiteRuleInput, PriorAttempt, RiskSnapshot } from "@/lib/domain";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { CARRIER_IDS } from "@/lib/fixtures/ids";
import {
  assignCheapestQuotedRanks,
  buildTrackingRows,
  groupTrackingShops,
  trackingStatus,
  type TrackingAttemptInput,
} from "./tracking";

const dib: RiskSnapshot = {
  yearBuilt: fixture.risk.yearBuilt,
  roofYear: fixture.risk.roofYear,
  roofCovering: fixture.risk.roofCovering,
  construction: fixture.risk.construction,
  openingProtection: fixture.risk.openingProtection,
  occupancy: fixture.risk.occupancy,
  stories: fixture.risk.stories,
  pool: fixture.risk.pool,
  protectionClass: fixture.risk.protectionClass,
  milesToCoast: fixture.risk.milesToCoast,
  city: fixture.risk.city,
  county: fixture.risk.county,
  coverageA: fixture.risk.coverageA,
  mobileHome: false,
  replacementCostEstimate: null,
  state: fixture.risk.state,
};

type CarrierKey = keyof typeof CARRIER_IDS;

function ruleFromFixture(carrier: (typeof fixture.carriers)[number]): AppetiteRuleInput {
  return {
    carrierId: CARRIER_IDS[carrier.key as CarrierKey],
    carrierName: carrier.name,
    lineOfBusiness: carrier.rule.lineOfBusiness,
    minCovA: "minCovA" in carrier.rule ? (carrier.rule.minCovA as number) : null,
    maxCovA: null,
    minYearBuilt: null,
    maxRoofAge: "maxRoofAge" in carrier.rule ? (carrier.rule.maxRoofAge as number) : null,
    allowedRoofCoverings:
      "allowedRoofCoverings" in carrier.rule
        ? (carrier.rule.allowedRoofCoverings as string[])
        : null,
    coastalAllowed: true,
    minMilesToCoast:
      "minMilesToCoast" in carrier.rule ? (carrier.rule.minMilesToCoast as number) : null,
    maxMilesToCoast: null,
    mobileAllowed: false,
    requiresOpeningProtection: false,
    maxStories: null,
    allowedConstruction:
      "allowedConstruction" in carrier.rule
        ? (carrier.rule.allowedConstruction as string[])
        : null,
    allowedOccupancy: null,
    allowedCounties: null,
    excludedCounties: null,
    countyMinCovA:
      "countyMinCovA" in carrier.rule
        ? (carrier.rule.countyMinCovA as Record<string, number>)
        : null,
    requireReplacementCost: false,
    rceFloorRatio: null,
    portalStatus: carrier.portalStatus as AppetiteRuleInput["portalStatus"],
    dontWriteNotes: carrier.dontWriteNotes,
    writtenLines: carrier.writtenLines,
  };
}

function anaPriors(): PriorAttempt[] {
  return fixture.attempts.map((attempt) => ({
    carrierId: CARRIER_IDS[attempt.carrierKey as CarrierKey],
    result: attempt.result as PriorAttempt["result"],
    why: attempt.why,
    bindable: attempt.bindable,
    snapYearBuilt: fixture.risk.yearBuilt,
    snapRoofYear: fixture.risk.roofYear,
    snapRoofCovering: fixture.risk.roofCovering,
    snapConstruction: fixture.risk.construction,
    snapCounty: fixture.risk.county,
    snapMilesToCoast: fixture.risk.milesToCoast,
    snapCoverageA: fixture.risk.coverageA,
  }));
}

const reyesPriors: PriorAttempt[] = [
  {
    carrierId: CARRIER_IDS.sagesure,
    result: "quoted",
    why: "Winter Park masonry HO3 quoted.",
    bindable: true,
    snapYearBuilt: 2016,
    snapRoofYear: 2016,
    snapRoofCovering: "architectural shingle",
    snapConstruction: "masonry",
    snapCounty: "Orange",
    snapMilesToCoast: 28,
    snapCoverageA: 275000,
  },
  {
    carrierId: CARRIER_IDS.hoc,
    result: "portal_closed",
    why: "No NB.",
    bindable: false,
    snapYearBuilt: 2016,
    snapRoofYear: 2016,
    snapRoofCovering: "architectural shingle",
    snapConstruction: "masonry",
    snapCounty: "Orange",
    snapMilesToCoast: 28,
    snapCoverageA: 275000,
  },
];

function anaAttempts(): TrackingAttemptInput[] {
  return fixture.attempts.map((attempt, index) => ({
    id: `ana-${attempt.carrierKey}`,
    dealId: "ana-deal",
    dealTitle: "Dib · Palm Bay HO3",
    dealStage: "shopping",
    carrierId: CARRIER_IDS[attempt.carrierKey as CarrierKey],
    carrierName: fixture.carriers.find((carrier) => carrier.key === attempt.carrierKey)?.name ?? attempt.carrierKey,
    line: attempt.lineOfBusiness,
    result: attempt.result,
    bindable: attempt.bindable,
    premium: attempt.premium,
    quoteNumber: attempt.quoteNumber,
    attemptedAt: new Date(`2026-09-02T16:00:0${index}.000Z`),
    why: attempt.why,
  }));
}

describe("quote tracking status", () => {
  it("maps attempt results to quoted / declined / skip, and bound when a policy exists", () => {
    expect(trackingStatus("quoted", false)).toBe("quoted");
    expect(trackingStatus("declined", false)).toBe("declined");
    expect(trackingStatus("floor_only", false)).toBe("skip");
    expect(trackingStatus("takeout_only", false)).toBe("skip");
    expect(trackingStatus("portal_closed", false)).toBe("skip");
    expect(trackingStatus("quoted", true)).toBe("bound");
  });

  it("does not treat floor premiums as quoted when ranking cheapest", () => {
    const rows = assignCheapestQuotedRanks(
      buildTrackingRows(anaAttempts()),
    );
    const ranked = rows.filter((row) => row.cheapestQuotedRank != null);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].carrierName).toBe("American Integrity");
    expect(ranked[0].status).toBe("quoted");
    expect(ranked[0].bindable).toBe(false);
    expect(ranked[0].cheapestQuotedRank).toBe(1);

    const geovera = rows.find((row) => row.carrierName === "GeoVera");
    expect(geovera?.status).toBe("skip");
    expect(geovera?.premium).toBe(4001.35);
    expect(geovera?.cheapestQuotedRank).toBeNull();
  });

  it("keeps Ana's shop at 1 quoted / 3 declined / 6 skip / 0 bound and 0 bindable", () => {
    const shop = groupTrackingShops(buildTrackingRows(anaAttempts()))[0];
    expect(shop.quotedCount).toBe(1);
    expect(shop.declinedCount).toBe(3);
    expect(shop.skipCount).toBe(6);
    expect(shop.boundCount).toBe(0);
    expect(shop.rows.every((row) => row.bindable === false)).toBe(true);
    expect(shop.cheapestQuoted?.carrierName).toBe("American Integrity");
  });

  it("ranks cheapest quoted on a second deal and marks a bound policy", () => {
    const reyes: TrackingAttemptInput[] = [
      {
        id: "reyes-sagesure",
        dealId: "reyes-deal",
        dealTitle: "Reyes · Winter Park HO3",
        dealStage: "bound",
        carrierId: CARRIER_IDS.sagesure,
        carrierName: "SageSure (Markel)",
        line: "HO3",
        result: "quoted",
        bindable: true,
        premium: 2186,
        quoteNumber: "SS-WP-4401",
        attemptedAt: new Date("2026-08-18T15:00:00.000Z"),
        why: "Quoted and bound.",
      },
      {
        id: "reyes-ai",
        dealId: "reyes-deal",
        dealTitle: "Reyes · Winter Park HO3",
        dealStage: "bound",
        carrierId: CARRIER_IDS.americanIntegrity,
        carrierName: "American Integrity",
        line: "HO3",
        result: "quoted",
        bindable: true,
        premium: 2410,
        quoteNumber: "QT-WP-9012",
        attemptedAt: new Date("2026-08-18T15:00:00.000Z"),
        why: "Quoted.",
      },
      {
        id: "reyes-qbe",
        dealId: "reyes-deal",
        dealTitle: "Reyes · Winter Park HO3",
        dealStage: "bound",
        carrierId: CARRIER_IDS.qbe,
        carrierName: "QBE",
        line: "HO3",
        result: "quoted",
        bindable: true,
        premium: 2655,
        quoteNumber: "QBE-WP-9102",
        attemptedAt: new Date("2026-08-18T15:00:00.000Z"),
        why: "Quoted.",
      },
      {
        id: "reyes-hoc",
        dealId: "reyes-deal",
        dealTitle: "Reyes · Winter Park HO3",
        dealStage: "bound",
        carrierId: CARRIER_IDS.hoc,
        carrierName: "Homeowners Choice",
        line: "HO3",
        result: "portal_closed",
        bindable: false,
        premium: null,
        quoteNumber: null,
        attemptedAt: new Date("2026-08-18T15:00:00.000Z"),
        why: "No NB.",
      },
    ];

    const rows = buildTrackingRows(reyes, [
      { dealId: "reyes-deal", carrierId: CARRIER_IDS.sagesure, policyId: "pol-reyes" },
    ]);
    const shop = groupTrackingShops(rows)[0];
    expect(shop.boundCount).toBe(1);
    expect(shop.quotedCount).toBe(2);
    expect(shop.skipCount).toBe(1);
    expect(shop.cheapestQuoted?.carrierName).toBe("SageSure (Markel)");
    expect(shop.cheapestQuoted?.status).toBe("bound");
    expect(shop.cheapestQuoted?.cheapestQuotedRank).toBe(1);
    expect(rows.find((row) => row.carrierName === "American Integrity")?.cheapestQuotedRank).toBe(2);
    expect(rows.find((row) => row.carrierName === "QBE")?.cheapestQuotedRank).toBe(3);

    const board = groupTrackingShops([...buildTrackingRows(anaAttempts()), ...rows]);
    expect(board.map((item) => item.dealTitle)).toEqual([
      "Dib · Palm Bay HO3",
      "Reyes · Winter Park HO3",
    ]);
  });
});

describe("Ana markets stay 0 green / 10 skip", () => {
  it("is 0 green / 10 skip from her own shop, and a second-deal log does not change that", () => {
    const rules = fixture.carriers.map(ruleFromFixture);
    const onlyAna = rankFits(rules.map((rule) => matchCarrier(dib, rule, anaPriors(), 2026)));
    expect(onlyAna.filter((row) => row.band === "green")).toHaveLength(0);
    expect(onlyAna.filter((row) => row.band === "red")).toHaveLength(10);

    const withReyes = rankFits(
      rules.map((rule) => matchCarrier(dib, rule, [...anaPriors(), ...reyesPriors], 2026)),
    );
    expect(withReyes.filter((row) => row.band === "green")).toHaveLength(0);
    expect(withReyes.filter((row) => row.band === "red")).toHaveLength(10);
    expect(withReyes).toHaveLength(10);
  });
});
