import { describe, expect, it } from "vitest";
import {
  countOpenDealsByOwner,
  isOpenDealStage,
  leadMatchesTerritory,
  normalizeWrittenLine,
  pickProducerByCapacity,
  producersForRule,
  routeLead,
  ruleMatchesLead,
  type RoutingProducer,
  type RoutingRule,
  type RoutingTerritory,
} from "./auto-route";

const SPACE_COAST: RoutingTerritory = {
  id: "terr-sc",
  name: "Space Coast",
  states: ["FL"],
  counties: ["Brevard"],
  geoLabel: "Palm Bay / Melbourne / Brevard",
};

const maya: RoutingProducer = {
  id: "maya",
  name: "Maya Chen",
  role: "agent",
  active: true,
  accessStatus: "active",
  openDealCount: 3,
};

const javy: RoutingProducer = {
  id: "javy",
  name: "Javy Rivera",
  role: "admin",
  active: true,
  accessStatus: "active",
  openDealCount: 11,
};

const luis: RoutingProducer = {
  id: "luis",
  name: "Luis Vega",
  role: "agent",
  active: true,
  accessStatus: "frozen",
  openDealCount: 0,
};

const hoRule: RoutingRule = {
  id: "rule-ho",
  name: "Space Coast Home",
  enabled: true,
  sortOrder: 10,
  territoryId: "terr-sc",
  writtenLine: "HO",
  maxOpenDeals: 12,
  producerId: null,
};

const membership = {
  officeMemberships: [
    { userId: "maya", officeId: "palm-bay" },
    { userId: "javy", officeId: "palm-bay" },
  ],
  territoryMemberships: [{ userId: "javy", territoryId: "terr-sc" }],
  territoryOfficeLinks: [{ territoryId: "terr-sc", officeId: "palm-bay" }],
};

describe("written line aliases", () => {
  it("maps Home / Auto / GL copy onto desk line codes", () => {
    expect(normalizeWrittenLine("Home")).toBe("HO");
    expect(normalizeWrittenLine("homeowners")).toBe("HO");
    expect(normalizeWrittenLine("Auto")).toBe("AUTO");
    expect(normalizeWrittenLine("PA")).toBe("AUTO");
    expect(normalizeWrittenLine("GL")).toBe("GL");
    expect(normalizeWrittenLine("")).toBeNull();
    expect(normalizeWrittenLine("HO")).toBe("HO");
  });
});

describe("territory + rule match", () => {
  it("matches a Melbourne HO lead to Space Coast", () => {
    expect(leadMatchesTerritory({ state: "FL", city: "Melbourne" }, SPACE_COAST)).toBe(true);
    expect(leadMatchesTerritory({ state: "MT", city: "Billings" }, SPACE_COAST)).toBe(false);
    expect(
      ruleMatchesLead(hoRule, { state: "FL", city: "Melbourne", insuranceTypeDesired: "Home" }, [SPACE_COAST]),
    ).toBe(true);
    expect(
      ruleMatchesLead(hoRule, { state: "FL", city: "Melbourne", insuranceTypeDesired: "AUTO" }, [SPACE_COAST]),
    ).toBe(false);
  });
});

describe("producer capacity", () => {
  it("counts open shops and skips frozen or full producers", () => {
    expect(isOpenDealStage("quote_sent")).toBe(true);
    expect(isOpenDealStage("bound")).toBe(false);
    expect(
      countOpenDealsByOwner([
        { ownerId: "maya", pipelineStage: "shopping" },
        { ownerId: "maya", pipelineStage: "quote_sent" },
        { ownerId: "maya", pipelineStage: "bound" },
      ]).get("maya"),
    ).toBe(2);
    expect(pickProducerByCapacity([maya, { ...javy, openDealCount: 12 }], 12)?.id).toBe("maya");
    expect(pickProducerByCapacity([{ ...maya, openDealCount: 12 }], 12)).toBeNull();
    expect(producersForRule(hoRule, [maya, javy, luis], membership).map((row) => row.id)).toEqual([
      "maya",
      "javy",
    ]);
  });
});

describe("routeLead", () => {
  it("assigns the least-loaded Space Coast producer on a Home lead", () => {
    const decision = routeLead({
      lead: { state: "FL", city: "Melbourne", insuranceTypeDesired: "HO" },
      rules: [hoRule],
      producers: [maya, javy, luis],
      territories: [SPACE_COAST],
      ...membership,
    });
    expect(decision.outcome).toBe("assigned");
    if (decision.outcome === "assigned") {
      expect(decision.producerId).toBe("maya");
      expect(decision.ruleId).toBe("rule-ho");
      expect(decision.reason).toMatch(/Maya Chen/);
    }
  });

  it("posts unmatched territory or full books to the lead-offer board", () => {
    const miss = routeLead({
      lead: { state: "MT", city: "Billings", insuranceTypeDesired: "AUTO" },
      rules: [hoRule],
      producers: [maya],
      territories: [SPACE_COAST],
      ...membership,
    });
    expect(miss.outcome).toBe("unassigned");
    expect(miss.reason).toMatch(/lead-offer board/);

    const full = routeLead({
      lead: { state: "FL", city: "Palm Bay", insuranceTypeDesired: "Home" },
      rules: [hoRule],
      producers: [{ ...maya, openDealCount: 20 }, { ...javy, openDealCount: 20 }],
      territories: [SPACE_COAST],
      ...membership,
    });
    expect(full.outcome).toBe("unassigned");
    expect(full.reason).toMatch(/capacity/);
  });
});
