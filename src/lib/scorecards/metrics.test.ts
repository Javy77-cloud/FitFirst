import { describe, expect, it } from "vitest";
import { rankScorecards, scoreForProducer, visibleScorecards } from "./metrics";
import type { ScorecardDeal, ScorecardPolicy, ScorecardProducer } from "./types";

const javy: ScorecardProducer = { id: "javy", name: "Javy Rivera", role: "admin", status: "active" };
const maya: ScorecardProducer = { id: "maya", name: "Maya Chen", role: "agent", status: "active" };
const luis: ScorecardProducer = { id: "luis", name: "Luis Vega", role: "agent", status: "frozen" };

function deal(
  partial: Pick<ScorecardDeal, "id" | "ownerId" | "pipelineStage"> & Partial<ScorecardDeal>,
): ScorecardDeal {
  return { boundAt: null, archivedAt: null, ...partial };
}

function policy(
  partial: Pick<ScorecardPolicy, "id" | "ownerId" | "status" | "premium"> & Partial<ScorecardPolicy>,
): ScorecardPolicy {
  return { ...partial };
}

describe("producer scorecards", () => {
  it("counts conversion, retention, premium, and binds — Ana quote is not a bind", () => {
    const deals = [
      deal({ id: "ana", ownerId: "javy", pipelineStage: "quote_sent" }),
      deal({ id: "elena", ownerId: "javy", pipelineStage: "bound", boundAt: new Date("2026-08-01") }),
      deal({ id: "maya-shop", ownerId: "maya", pipelineStage: "shopping" }),
      deal({ id: "maya-won", ownerId: "maya", pipelineStage: "closed_won", boundAt: new Date("2026-08-12") }),
    ];
    const policies = [
      policy({ id: "elena-pol", ownerId: "javy", status: "active", premium: 2184, dealId: "elena" }),
      policy({ id: "maya-ho", ownerId: "maya", status: "active", premium: 1900, dealId: "maya-won" }),
      policy({ id: "maya-lapse", ownerId: "maya", status: "lapsed", premium: 800, dealId: "old" }),
      policy({ id: "ana-quote", ownerId: "javy", status: "quoted", premium: 321000, dealId: "ana" }),
    ];

    const javyCard = scoreForProducer(javy, deals, policies);
    expect(javyCard.shops).toBe(1);
    expect(javyCard.binds).toBe(1);
    expect(javyCard.conversion).toBe(0.5);
    expect(javyCard.premium).toBe(2184);
    expect(javyCard.inForce).toBe(1);
    expect(javyCard.retention).toBe(1);

    const mayaCard = scoreForProducer(maya, deals, policies);
    expect(mayaCard.binds).toBe(1);
    expect(mayaCard.shops).toBe(1);
    expect(mayaCard.lapsed).toBe(1);
    expect(mayaCard.retention).toBe(0.5);
    expect(mayaCard.premium).toBe(1900);
  });

  it("ranks Admin board by the chosen metric and lets an Agent see only their row", () => {
    const deals = [
      deal({ id: "a", ownerId: "javy", pipelineStage: "bound", boundAt: new Date() }),
      deal({ id: "b", ownerId: "maya", pipelineStage: "bound", boundAt: new Date() }),
      deal({ id: "c", ownerId: "maya", pipelineStage: "bound", boundAt: new Date() }),
      deal({ id: "d", ownerId: "luis", pipelineStage: "lost" }),
    ];
    const policies = [
      policy({ id: "p1", ownerId: "javy", status: "active", premium: 9000, dealId: "a" }),
      policy({ id: "p2", ownerId: "maya", status: "active", premium: 1200, dealId: "b" }),
      policy({ id: "p3", ownerId: "maya", status: "active", premium: 800, dealId: "c" }),
    ];

    const byPremium = rankScorecards([javy, maya, luis], deals, policies, "premium");
    expect(byPremium.map((row) => row.userId)).toEqual(["javy", "maya", "luis"]);
    expect(byPremium[0]?.rank).toBe(1);

    const byBinds = rankScorecards([javy, maya, luis], deals, policies, "binds");
    expect(byBinds[0]?.userId).toBe("maya");
    expect(byBinds[0]?.binds).toBe(2);

    const agentView = visibleScorecards(byPremium, { isAdmin: false, userId: "maya" });
    expect(agentView).toHaveLength(1);
    expect(agentView[0]?.userId).toBe("maya");
    expect(agentView[0]?.rank).toBe(2);

    const adminView = visibleScorecards(byPremium, { isAdmin: true, userId: "javy" });
    expect(adminView).toHaveLength(3);
  });

  it("does not treat a Coverage A quote of $321,000 as written premium", () => {
    const card = scoreForProducer(
      javy,
      [deal({ id: "ana", ownerId: "javy", pipelineStage: "quote_sent" })],
      [policy({ id: "ghost", ownerId: "javy", status: "quoted", premium: 321000, dealId: "ana" })],
    );
    expect(card.binds).toBe(0);
    expect(card.premium).toBe(0);
    expect(card.shops).toBe(1);
  });
});
