import { describe, expect, it } from "vitest";
import type { HomePolicy } from "./aggregate";
import { DESK_AS_OF } from "./as-of";
import { leaderboardPair, rankAgents } from "./leaderboard";

function policy(partial: Partial<HomePolicy> & Pick<HomePolicy, "id" | "status" | "premium">): HomePolicy {
  return {
    contactId: "c1",
    carrierId: "car1",
    carrierName: "AI",
    contactName: "X",
    policyNumber: "P",
    lineOfBusiness: "HO",
    effectiveDate: new Date("2026-09-01T00:00:00.000Z"),
    expirationDate: new Date("2027-09-01T00:00:00.000Z"),
    ...partial,
  };
}

const agents = [
  { id: "javy", name: "Javy Rivera" },
  { id: "maya", name: "Maya Chen" },
  { id: "luis", name: "Luis Vega" },
];

describe("production leaderboard", () => {
  it("ranks top agents this month by premium and ignores Ana's quote", () => {
    const rows = [
      policy({ id: "1", status: "active", premium: 4000, ownerId: "javy" }),
      policy({ id: "2", status: "active", premium: 1500, ownerId: "maya" }),
      policy({ id: "3", status: "active", premium: 2200, ownerId: "luis" }),
      policy({ id: "ana", status: "quoted", premium: 321000, ownerId: "javy" }),
    ];
    const board = rankAgents(rows, agents, DESK_AS_OF);
    expect(board.map((r) => r.userId)).toEqual(["javy", "luis", "maya"]);
    expect(board[0]?.premium).toBe(4000);
    expect(board[0]?.rank).toBe(1);
  });

  it("builds this-month and last-month boards", () => {
    const rows = [
      policy({
        id: "sep",
        status: "active",
        premium: 3000,
        ownerId: "maya",
        effectiveDate: new Date("2026-09-02T00:00:00.000Z"),
      }),
      policy({
        id: "aug",
        status: "active",
        premium: 5000,
        ownerId: "javy",
        effectiveDate: new Date("2026-08-10T00:00:00.000Z"),
      }),
    ];
    const pair = leaderboardPair(rows, agents, DESK_AS_OF);
    expect(pair.thisMonth.map((r) => r.userId)).toEqual(["maya"]);
    expect(pair.lastMonth.map((r) => r.userId)).toEqual(["javy"]);
  });

  it("scores a contest window by policy count when asked", () => {
    const rows = [
      policy({ id: "a", status: "active", premium: 100, ownerId: "maya" }),
      policy({ id: "b", status: "active", premium: 100, ownerId: "maya" }),
      policy({ id: "c", status: "active", premium: 9000, ownerId: "javy" }),
    ];
    const board = rankAgents(rows, agents, DESK_AS_OF, "contest", {
      metric: "policy_count",
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      endsAt: new Date("2026-09-30T23:59:59.000Z"),
    });
    expect(board[0]?.userId).toBe("maya");
    expect(board[0]?.policyCount).toBe(2);
  });
});
