import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultDealsView, parseDealsView } from "./deals-views";
import { matchesDealLens } from "./deals-lenses";
import { COLD_COMM_DAYS, VELOCITY_PHASES } from "./velocity";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Deals Priority Stack + Radar", () => {
  it("makes Stack and Radar the only Deals shopping views", () => {
    const page = source("src/app/deals/page.tsx");
    const bar = source("src/components/deals/deal-workspace-bar.tsx");
    expect(page).toMatch(/parseDealsView/);
    expect(page).toMatch(/defaultDealsView/);
    expect(page).toMatch(/DealsCommandWorkspace/);
    expect(page).toMatch(/TodayActivityCorner/);
    expect(page).not.toMatch(/<DealsTable/);
    expect(page).not.toMatch(/<PipelineWorkspace/);
    expect(page).not.toMatch(/<TodayActivityStrip/);
    expect(bar).toMatch(/\["stack", "Stack"\]/);
    expect(bar).toMatch(/\["radar", "Radar"\]/);
    expect(source("src/components/deals/priority-stack.tsx")).toMatch(/data-ff-priority-stack/);
    expect(source("src/components/deals/priority-stack.tsx")).not.toMatch(/draggable/);
    expect(source("src/components/deals/deals-radar.tsx")).toMatch(/data-ff-deals-radar/);
    expect(source("src/components/deals/deals-radar.tsx")).toMatch(/data-ff-radar-dot/);
    expect(source("src/components/deals/deals-radar.tsx")).toMatch(/ff-product-chip/);
    expect(source("src/components/deals/deals-radar.tsx")).toMatch(/EventSpark/);
    expect(source("src/components/deals/priority-stack.tsx")).toMatch(/VelocityClockRail/);
    expect(source("src/components/deals/priority-stack.tsx")).not.toMatch(/DealQuickActions/);
    expect(source("src/app/globals.css")).toMatch(/ff-heat-pulse/);
    expect(source("src/app/globals.css")).toMatch(/ff-heat-flicker/);
  });

  it("defaults agents to Stack and owners to Radar, and keeps leads off the board", () => {
    expect(parseDealsView(undefined, "stack")).toBe("stack");
    expect(parseDealsView("list")).toBe("stack");
    expect(parseDealsView("board")).toBe("radar");
    expect(defaultDealsView({ isAdmin: false, user: { canSeeAgencyWidgets: false } as never })).toBe("stack");
    expect(defaultDealsView({ isAdmin: true, user: { canSeeAgencyWidgets: true } as never })).toBe("radar");
    expect(source("src/app/deals/page.tsx")).toMatch(/listDeals/);
    expect(source("src/app/deals/page.tsx")).not.toMatch(/listLeads/);
    expect(source("src/app/deals/page.tsx")).toMatch(/scheduleDealColdChaseNotices/);
    expect(COLD_COMM_DAYS).toBe(14);
    expect(VELOCITY_PHASES).toEqual([
      "lead_to_deal",
      "details",
      "docs",
      "risk",
      "quotes",
      "post_quote_gap",
    ]);
  });

  it("applies saved lenses without a public agent-name board", () => {
    expect(
      matchesDealLens(
        { ownerId: "a1", lineOfBusiness: "HO", heat: "hot", value: 321000, phase: "quotes" },
        { lens: "my-hot-pc", viewerId: "a1", canSeeTeam: false },
      ),
    ).toBe(true);
    expect(
      matchesDealLens(
        { ownerId: "a1", lineOfBusiness: "HO", heat: "hot", value: 321000, phase: "quotes" },
        { lens: "agency-cold", viewerId: "a1", canSeeTeam: true },
      ),
    ).toBe(false);
    expect(source("src/components/deals/deals-heat-pulse.tsx")).toMatch(/Your velocity/);
    expect(source("src/components/deals/deals-command-workspace.tsx")).not.toMatch(/leaderboard/);
    expect(source("src/lib/deals/velocity.ts")).toMatch(/Client health/);
    expect(source("src/components/deals/priority-stack.tsx")).toMatch(/Client health/);
    expect(source("src/components/deals/priority-stack.tsx")).not.toMatch(/retention/i);
    expect(source("src/app/deals/page.tsx")).toMatch(/scheduleDealColdChaseNotices/);
    expect(source("src/lib/deals/cold-chase.ts")).toMatch(/Deal went cold — one-click chase/);
  });
});
