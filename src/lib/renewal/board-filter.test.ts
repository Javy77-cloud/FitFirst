import { describe, expect, it } from "vitest";
import { DEFAULT_DESK_LINE_SETTINGS } from "@/lib/desk/line-settings";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";
import {
  filterRenewalCards,
  renewalLobFamily,
  renewalStagesForPipeline,
} from "./board-filter";

function card(partial: Partial<RenewalBoardCard> & Pick<RenewalBoardCard, "stage" | "lineOfBusiness">): RenewalBoardCard {
  return {
    queueId: partial.queueId ?? partial.policyNumber ?? "q",
    policyId: partial.policyId ?? "p",
    displayName: partial.displayName ?? partial.policyNumber ?? "HO-1",
    policyNumber: partial.policyNumber ?? "HO-1",
    clientName: partial.clientName ?? "Client",
    contactId: null,
    accountId: null,
    email: null,
    phone: null,
    carrierName: "Carrier",
    expirationDate: null,
    daysUntil: 30,
    premium: null,
    proposedPremium: null,
    premiumDelta: null,
    premiumDeltaPct: null,
    policySubType: partial.policySubType ?? null,
    insuranceType: partial.insuranceType ?? null,
    commissionFamily: partial.commissionFamily ?? null,
    ownerId: null,
    ownerName: null,
    partyKey: "",
    risk: "low",
    riskScore: 0,
    why: "",
    whyExtra: null,
    hasCurrentTerm: false,
    hasProposedTerm: false,
    canCompare: false,
    chasedThisBand: false,
    reviewDue: false,
    reviewSkipCount: 0,
    healthStars: 4,
    policyHealthStars: 4,
    healthSource: "model",
    healthFlagged: false,
    lastContactDays: null,
    policyHealth: null,
    clientHealth: null,
    autopilotQueued: false,
    autopilotEscalated: false,
    ...partial,
  };
}

describe("renewal LOB family", () => {
  it("maps Home/Auto/Flood/Commercial to p-c and Health*/Life* to their boards", () => {
    expect(renewalLobFamily("HO3")).toBe("p-c");
    expect(renewalLobFamily("AUTO")).toBe("p-c");
    expect(renewalLobFamily("FLOOD")).toBe("p-c");
    expect(renewalLobFamily("GL")).toBe("p-c");
    expect(renewalLobFamily("HEALTH")).toBe("health");
    expect(renewalLobFamily("Medicare Advantage", "medicare_advantage")).toBe("health");
    expect(renewalLobFamily("LIFE")).toBe("life");
    expect(renewalLobFamily("Term Life", "term_life")).toBe("life");
  });
});

describe("renewal desk filters", () => {
  const rows = [
    card({ stage: "upcoming", lineOfBusiness: "HO3", policyNumber: "HO-1" }),
    card({ stage: "contacted", lineOfBusiness: "AUTO", policyNumber: "AU-1" }),
    card({ stage: "quoted", lineOfBusiness: "HEALTH", policyNumber: "HE-1", policySubType: "marketplace" }),
    card({ stage: "upcoming", lineOfBusiness: "LIFE", policyNumber: "LI-1", policySubType: "term_life" }),
    card({ stage: "bound", lineOfBusiness: "HO3", policyNumber: "HO-B" }),
    card({ stage: "lost", lineOfBusiness: "AUTO", policyNumber: "AU-L" }),
  ];

  it("All = shopping stages across LOBs; P&C/Health/Life filter family; Won-Lost = bound+lost", () => {
    const settings = DEFAULT_DESK_LINE_SETTINGS;
    expect(filterRenewalCards(rows, {}, settings).map((row) => row.policyNumber)).toEqual([
      "HO-1",
      "AU-1",
      "HE-1",
      "LI-1",
    ]);
    expect(filterRenewalCards(rows, { pipeline: "p-c" }, settings).map((row) => row.policyNumber)).toEqual([
      "HO-1",
      "AU-1",
    ]);
    expect(
      filterRenewalCards(rows, { pipeline: "p-c", pcSub: "home" }, settings).map((row) => row.policyNumber),
    ).toEqual(["HO-1"]);
    expect(filterRenewalCards(rows, { pipeline: "health" }, settings).map((row) => row.policyNumber)).toEqual([
      "HE-1",
    ]);
    expect(filterRenewalCards(rows, { pipeline: "life" }, settings).map((row) => row.policyNumber)).toEqual([
      "LI-1",
    ]);
    expect(filterRenewalCards(rows, { pipeline: "won-lost" }, settings).map((row) => row.policyNumber)).toEqual([
      "HO-B",
      "AU-L",
    ]);
    expect(filterRenewalCards(rows, { pipeline: "archive" }, settings)).toEqual([]);
  });

  it("shows shopping stages on All and bound/lost on Won-Lost", () => {
    const stages = [
      { slug: "upcoming" },
      { slug: "contacted" },
      { slug: "quoted" },
      { slug: "bound" },
      { slug: "lost" },
    ];
    expect(renewalStagesForPipeline(stages, null).map((row) => row.slug)).toEqual([
      "upcoming",
      "contacted",
      "quoted",
    ]);
    expect(renewalStagesForPipeline(stages, "won-lost").map((row) => row.slug)).toEqual(["bound", "lost"]);
    expect(renewalStagesForPipeline(stages, "archive")).toEqual([]);
  });
});
