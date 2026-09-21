import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultDealsView, parseDealsView } from "./deals-views";
import { matchesDealLens, resolveDealScope } from "./deals-lenses";
import { COLD_COMM_DAYS, RADAR_X_AXIS_LABEL, RADAR_Y_AXIS_LABEL, VELOCITY_PHASES } from "./velocity";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Deals Priority Stack + Radar", () => {
  it("keeps Stack, Radar, and List as the Deals shopping views", () => {
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
    expect(bar).toMatch(/\["list", "List"\]/);
    expect(source("src/components/deals/priority-stack.tsx")).toMatch(/data-ff-priority-stack/);
    expect(source("src/components/deals/priority-stack.tsx")).not.toMatch(/draggable/);
    expect(source("src/components/deals/deals-radar.tsx")).toMatch(/data-ff-deals-radar/);
    expect(source("src/components/deals/deals-radar.tsx")).toMatch(/data-ff-heat-glance/);
    expect(source("src/components/deals/deals-radar.tsx")).toMatch(/data-ff-heat-row/);
    expect(source("src/components/deals/deals-radar.tsx")).toMatch(/HEAT_STATES/);
    expect(source("src/components/deals/deals-radar.tsx")).toMatch(/href=\{card\.href\}/);
    expect(source("src/components/deals/deals-radar.tsx")).not.toMatch(/ff-radar-plot/);
    expect(source("src/components/deals/deals-radar.tsx")).not.toMatch(/data-ff-radar-dot/);
    expect(RADAR_X_AXIS_LABEL).toBe("Days in current phase");
    expect(RADAR_Y_AXIS_LABEL).toBe("Days silent");
    expect(source("src/components/deals/deals-radar.tsx")).not.toMatch(/valueAxisLabel/);
    expect(source("src/components/deals/priority-stack.tsx")).toMatch(/DealHostSpread/);
    expect(source("src/components/deals/priority-stack.tsx")).toMatch(/data-ff-stack-mid|DealHostSpread/);
    expect(source("src/components/deals/deals-radar.tsx")).toMatch(/RadarBoard/);
    expect(source("src/components/deals/deals-radar.tsx")).not.toMatch(/data-ff-radar-strip|RadarMetricStrip/);
    expect(source("src/components/deals/radar-board.tsx")).toMatch(/data-ff-radar-banner/);
    expect(source("src/components/deals/radar-board.tsx")).toMatch(/data-ff-radar-silence/);
    expect(source("src/components/deals/radar-board.tsx")).toMatch(/data-ff-radar-trend/);
    expect(source("src/components/deals/radar-board.tsx")).not.toMatch(/days silent/);
    expect(source("src/components/deals/priority-stack.tsx")).toMatch(/PriorityPinControl/);
    expect(source("src/components/deals/priority-stack.tsx")).not.toMatch(/VelocityClockRail/);
    expect(source("src/components/deals/priority-stack.tsx")).not.toMatch(/RenewalHealthMeter/);
    expect(source("src/components/deals/priority-stack.tsx")).not.toMatch(/DealQuickActions/);
    expect(source("src/components/deals/deals-command-workspace.tsx")).toMatch(/data-ff-stack-workspace/);
    expect(source("src/components/deals/deals-lenses.tsx")).toMatch(/Clear lenses/);
    expect(source("src/components/deals/deals-lenses.tsx")).not.toMatch(/High value/);
    expect(source("src/components/deals/deals-lenses.tsx")).not.toMatch(/My hot P&C/);
    expect(page).toMatch(/const canSeeTeam = session\.isAdmin/);
    expect(page).toMatch(/mineScopeForViewer/);
    expect(page).toMatch(/reassignAliasOwnedRecords/);
    expect(page).toMatch(/viewerIds: mine\.ownerIds/);
    expect(page).toMatch(/chipCounts/);
    expect(source("src/app/globals.css")).toMatch(/ff-heat-pulse/);
    expect(source("src/app/globals.css")).toMatch(/ff-heat-flicker/);
    expect(source("src/app/globals.css")).toMatch(/ff-stack-workspace/);
  });

  it("defaults agents to Stack and owners to Radar, and keeps leads off the board", () => {
    expect(parseDealsView(undefined, "stack")).toBe("stack");
    expect(parseDealsView("list")).toBe("list");
    expect(parseDealsView("table")).toBe("list");
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
    expect(resolveDealScope({ canSeeTeam: false, view: "stack" })).toBe("mine");
    expect(resolveDealScope({ canSeeTeam: true, view: "radar" })).toBe("team");
    expect(resolveDealScope({ canSeeTeam: true, view: "stack" })).toBe("team");
    expect(
      matchesDealLens(
        { ownerId: "a1", lineOfBusiness: "HO", heat: "hot", value: 321000, phase: "quotes" },
        { lens: "my-hot-pc", viewerId: "a1", canSeeTeam: false },
      ),
    ).toBe(true);
    expect(
      matchesDealLens(
        { ownerId: "a1", lineOfBusiness: "HO", heat: "hot", value: 321000, phase: "quotes" },
        { lens: "agency-cold", viewerId: "a1", canSeeTeam: true, view: "radar" },
      ),
    ).toBe(false);
    expect(source("src/components/deals/deals-heat-pulse.tsx")).toMatch(/Your velocity/);
    expect(source("src/components/deals/deals-command-workspace.tsx")).not.toMatch(/leaderboard/);
    expect(source("src/lib/deals/velocity.ts")).toMatch(/Client health/);
    expect(source("src/lib/deals/velocity.ts")).toMatch(/radarLegendCopy/);
    expect(source("src/lib/deals/velocity.ts")).toMatch(/Days in current phase/);
    expect(source("src/app/globals.css")).toMatch(/ff-heat-glance/);
    expect(source("src/app/globals.css")).toMatch(/ff-heat-pulse/);
    expect(source("src/components/deals/priority-stack.tsx")).toMatch(/data-ff-deal-job|DealHostJob/);
    expect(source("src/components/deals/priority-stack.tsx")).not.toMatch(/Client health/);
    expect(source("src/components/deals/priority-stack.tsx")).not.toMatch(/retention/i);
    expect(source("src/app/deals/page.tsx")).toMatch(/scheduleDealColdChaseNotices/);
    expect(source("src/lib/deals/cold-chase.ts")).toMatch(/Deal went cold — one-click chase/);
  });

  it("uses silence-heat Book Heat bubbles on Radar (no last-updated truth strip)", () => {
    const page = source("src/app/deals/page.tsx");
    const workspace = source("src/components/deals/deals-command-workspace.tsx");
    const radarUi = source("src/components/deals/deals-radar.tsx");
    const velocity = source("src/lib/deals/velocity.ts");
    expect(page).not.toMatch(/DeskTruthStrip/);
    expect(page).not.toMatch(/dealHeatShares/);
    expect(workspace).toMatch(/data-ff-book-heat/);
    expect(workspace).toMatch(/BookHeatHeader|Book heat/);
    expect(radarUi).toMatch(/data-ff-heat-glance/);
    expect(radarUi).toMatch(/ff-stack-glyph/);
    expect(radarUi).toMatch(/href=\{card\.href\}/);
    expect(velocity).toMatch(/export function bubbleSizeRem/);
    expect(source("src/lib/deals/radar-desk.ts")).toMatch(/updatedAt: parseDate\(deal\.updatedAt\)/);
  });

  it("keeps Stack product names on the left and that product's place, stamps, and quotes on the right", () => {
    const face = source("src/components/deals/deal-host-face.tsx");
    const css = source("src/app/globals.css");
    const meter = source("src/components/renewals/renewal-health-meter.tsx");
    expect(face).toMatch(/data-ff-product-lines/);
    expect(face).toMatch(/data-ff-product-label/);
    expect(face).toMatch(/data-ff-product-place/);
    expect(face).toMatch(/data-ff-product-quotes/);
    expect(face).toMatch(/data-ff-deal-stamp/);
    expect(face).toMatch(/RenewalHealthMeter/);
    expect(meter).toMatch(/ff-renewal-health-label">Client/);
    expect(meter).toMatch(/ff-renewal-health-label">Policy/);
    expect(css).toMatch(/\.ff-stack-products li \{[^}]*grid-template-columns:\s*6\.75rem minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/\.ff-stack-products \{[^}]*flex:\s*1 0 100%/);
    expect(source("src/lib/deals/velocity.ts")).not.toMatch(/label:\s*"Chase"/);
  });
});
