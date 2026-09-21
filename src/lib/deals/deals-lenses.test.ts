import { describe, expect, it } from "vitest";
import {
  defaultDealScope,
  matchesDealLens,
  parseDealLens,
  parseValueBand,
  resolveDealFilters,
  resolveDealScope,
} from "./deals-lenses";

const mineHot = { ownerId: "a1", heat: "hot" as const, lineOfBusiness: "HO" };
const teamCold = { ownerId: "b2", heat: "cold" as const, lineOfBusiness: "HO" };
const mineCooling = { ownerId: "a1", heat: "cooling" as const, lineOfBusiness: "HO" };

describe("deal lens filters", () => {
  it("maps legacy lens ids and drops High value", () => {
    expect(parseDealLens("my-hot-pc")).toBe("my-hot");
    expect(parseDealLens("agency-cold")).toBe("book-cold");
    expect(parseDealLens("high-value-quoting")).toBe(null);
    expect(parseValueBand("high")).toBe(null);
  });

  it("forces Mine for agents and keeps the same default on Radar and Stack", () => {
    expect(defaultDealScope({ canSeeTeam: false, view: "radar" })).toBe("mine");
    expect(resolveDealScope({ scope: "team", canSeeTeam: false, view: "radar" })).toBe("mine");
    expect(resolveDealScope({ canSeeTeam: true, view: "radar" })).toBe("mine");
    expect(resolveDealScope({ canSeeTeam: true, view: "stack" })).toBe("mine");
    expect(resolveDealScope({ scope: "team", canSeeTeam: true, view: "stack" })).toBe("team");
    expect(resolveDealScope({ scope: "team", canSeeTeam: true, view: "radar" })).toBe("team");
  });

  it("ANDs heat and scope without blanking the other category", () => {
    expect(
      matchesDealLens(mineHot, {
        heat: "hot",
        scope: "mine",
        viewerId: "a1",
        canSeeTeam: true,
        view: "radar",
      }),
    ).toBe(true);
    expect(
      matchesDealLens(mineCooling, {
        heat: "hot",
        scope: "mine",
        viewerId: "a1",
        canSeeTeam: true,
        view: "radar",
      }),
    ).toBe(false);
    expect(
      matchesDealLens(teamCold, {
        heat: "cold",
        scope: "mine",
        viewerId: "a1",
        canSeeTeam: true,
        view: "radar",
      }),
    ).toBe(false);
    expect(
      matchesDealLens(teamCold, {
        heat: "cold",
        scope: "team",
        viewerId: "a1",
        canSeeTeam: true,
        view: "radar",
      }),
    ).toBe(true);
  });

  it("lets an explicit heat chip win over a leftover lens", () => {
    const resolved = resolveDealFilters({
      heat: "cooling",
      lens: "my-hot",
      scope: "mine",
      viewerId: "a1",
      canSeeTeam: false,
      view: "stack",
    });
    expect(resolved.heat).toBe("cooling");
    expect(resolved.scope).toBe("mine");
    expect(
      matchesDealLens(mineHot, {
        heat: "cooling",
        lens: "my-hot",
        viewerId: "a1",
        canSeeTeam: false,
        view: "stack",
      }),
    ).toBe(false);
  });

  it("hides book-cold from agents so they cannot see Team through a leftover URL", () => {
    const resolved = resolveDealFilters({
      lens: "book-cold",
      canSeeTeam: false,
      viewerId: "a1",
      view: "stack",
    });
    expect(resolved.scope).toBe("mine");
    expect(resolved.lens).toBe(null);
    expect(
      matchesDealLens(teamCold, {
        lens: "agency-cold",
        viewerId: "a1",
        canSeeTeam: false,
        view: "stack",
      }),
    ).toBe(false);
  });
});
