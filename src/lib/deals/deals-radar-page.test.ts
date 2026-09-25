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
    expect(source("src/components/deals/radar-board.tsx")).toMatch(/data-ff-radar-chart="heat"/);
    expect(source("src/components/deals/radar-board.tsx")).toMatch(/data-ff-radar-silence/);
    expect(source("src/components/deals/radar-board.tsx")).toMatch(/data-ff-radar-trend/);
    expect(source("src/app/globals.css")).toMatch(/\.ff-radar-banner-lead strong \{ font-size: 2\.7rem/);
    expect(source("src/app/globals.css")).toMatch(/\.ff-radar-chart-body \{[^}]*min-height: 5\.2rem/);
    expect(source("src/app/globals.css")).toMatch(
      /\.ff-radar-chart-body \{[^}]*align-items: center;[^}]*justify-content: center/,
    );
    expect(source("src/app/globals.css")).toMatch(/\.ff-radar-heat-body \{[^}]*justify-content: center/);
    expect(source("src/app/globals.css")).toMatch(/\.ff-radar-charts \{[^}]*repeat\(3, minmax\(0, 1fr\)\)/);
    expect(source("src/app/globals.css")).toMatch(/\.ff-radar-donut-wrap \{[^}]*10\.35rem/);
    expect(source("src/app/globals.css")).toMatch(/\.ff-radar-bars \{[^}]*min-height: 10\.35rem/);
    expect(source("src/app/globals.css")).toMatch(/\.ff-radar-bars \{[^}]*gap: 0\.45rem/);
    expect(source("src/app/globals.css")).toMatch(/\.ff-radar-trend svg \{[^}]*height: 8\.6rem/);
    expect(source("src/app/globals.css")).toMatch(/\.ff-heat-row-deals \{[^}]*overflow-x: clip/);
    expect(source("src/app/globals.css")).toMatch(/\.ff-heat-row-deals \{[^}]*repeat\(4, minmax\(0, 1fr\)\)/);
    expect(source("src/app/globals.css")).toMatch(/@container \(max-width: 58rem\)[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);
    expect(source("src/app/globals.css")).toMatch(/@container \(max-width: 42rem\)[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
    expect(source("src/app/globals.css")).not.toMatch(/\.ff-heat-row-deals \{[^}]*overflow-x: auto/);
    expect(source("src/components/deals/radar-board.tsx")).toMatch(/touches · 14 days/);
    expect(source("src/components/deals/radar-board.tsx")).toMatch(/RADAR_TREND_DAYS/);
    expect(source("src/lib/deals/radar-glance.ts")).toMatch(/RADAR_TREND_DAYS = 30/);
    expect(source("src/lib/deals/radar-glance.ts")).toMatch(/RADAR_TOUCH_KPI_DAYS = 14/);
    expect(source("src/components/deals/radar-board.tsx")).not.toMatch(/days silent/);
    expect(source("src/components/deals/priority-stack.tsx")).toMatch(/PriorityPinControl/);
    expect(source("src/components/deals/priority-stack.tsx")).not.toMatch(/VelocityClockRail/);
    expect(source("src/components/deals/priority-stack.tsx")).not.toMatch(/RenewalHealthMeter/);
    expect(source("src/components/deals/priority-stack.tsx")).not.toMatch(/DealQuickActions/);
    expect(source("src/components/deals/deals-command-workspace.tsx")).toMatch(/data-ff-stack-workspace/);
    expect(source("src/components/deals/deals-lenses.tsx")).toMatch(/Clear lenses/);
    expect(source("src/components/deals/deals-lenses.tsx")).not.toMatch(/High value/);
    expect(source("src/components/deals/deals-lenses.tsx")).not.toMatch(/My hot P&C/);
    expect(page).toMatch(/sessionSeesAgencyBook\(session\)/);
    expect(page).toMatch(/const canSeeTeam = sessionSeesAgencyBook\(session\)/);
    expect(page).not.toMatch(/const canSeeTeam = session\.isAdmin/);
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
    expect(defaultDealsView({ isAdmin: false, user: { canSeeAgencyWidgets: true } as never })).toBe("radar");
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

  it("Stack party label is primary applicant only (no co-app append)", () => {
    const desk = source("src/lib/deals/radar-desk.ts");
    const face = source("src/components/deals/deal-host-face.tsx");
    expect(desk).toMatch(/primaryApplicantDisplayName/);
    expect(desk).not.toMatch(/secondaryNamedInsured:\s*deal\.secondaryNamedInsured/);
    expect(face).toMatch(/primaryApplicantDisplayName/);
    expect(face).toMatch(/dealDisplayName/);
  });


  it("stack cue keeps silence only — no Next: subtitle under the silent line", () => {
    const face = source("src/components/deals/deal-host-face.tsx");
    expect(face).toMatch(/data-ff-silence-cue/);
    expect(face).not.toMatch(/data-ff-next-action/);
    expect(face).not.toMatch(/Next \$\{nextLabel\}/);
  });

  it("keeps Stack product names on the left and that product's place, stamps, and quotes on the right", () => {
    const face = source("src/components/deals/deal-host-face.tsx");
    const stack = source("src/components/deals/priority-stack.tsx");
    const css = source("src/app/globals.css");
    const meter = source("src/components/renewals/renewal-health-meter.tsx");
    expect(face).toMatch(/data-ff-product-lines/);
    expect(face).toMatch(/data-ff-product-label/);
    expect(face).toMatch(/data-ff-product-place/);
    expect(face).toMatch(/data-ff-product-quotes/);
    expect(face).toMatch(/data-ff-deal-stamp/);
    expect(face).toMatch(/data-ff-deal-zone="name"/);
    expect(face).toMatch(/ff-deal-host-name/);
    expect(face).toMatch(/data-ff-deal-zone="center"/);
    expect(face).toMatch(/data-ff-deal-zone="cue"/);
    expect(face).toMatch(/data-ff-deal-products/);
    expect(face).toMatch(/ff-deal-host-line/);
    expect(face).not.toMatch(/>\s*—\s*</);
    expect(face).toMatch(/RenewalHealthMeter/);
    expect(face).toMatch(/layout="stack"/);
    expect(face).toMatch(/glyph/);
    expect(stack).toMatch(/data-ff-deal-stack-header/);
    expect(stack).toMatch(/data-ff-stack-col="name"/);
    expect(stack).toMatch(/data-ff-stack-col="form"/);
    expect(stack).toMatch(/data-ff-stack-col="stage"/);
    expect(stack).toMatch(/data-ff-stack-col="stamp"/);
    expect(stack).toMatch(/data-ff-stack-col="quotes"/);
    expect(stack).toMatch(/data-ff-stack-col="health"/);
    expect(stack).toMatch(/Priority Stack/);
    expect(stack).toMatch(/glyph=\{<span className="ff-stack-glyph"/);
    expect(stack).toMatch(/<div className="ff-stack-card-body">/);
    expect(stack).not.toMatch(/<article[^>]*>\s*<span className="ff-stack-glyph"/);
    expect(meter).toMatch(/ff-renewal-health-label">Client/);
    expect(meter).toMatch(/ff-renewal-health-label">Policy/);
    expect(meter).toMatch(/layout === "stack"/);
    expect(meter).toMatch(/ff-renewal-health--stack/);
    expect(meter).toMatch(/data-ff-health-flag/);
    expect(meter).toMatch(/<Flag[\s\S]*?className="ff-renewal-health-flag-icon"/);
    expect(meter).toMatch(/fill="currentColor"/);
    expect(meter).not.toMatch(/layout === "stack"[\s\S]{0,200}?>Flag</);
    expect(face).toMatch(/stackHealthFlagged/);
    expect(face).toMatch(/policyHealth:\s*card\.policyHealth/);
    expect(css).toMatch(/\.ff-stack-products li \{[^}]*grid-template-columns:\s*6\.75rem minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/\.ff-stack-products \{[^}]*flex:\s*1 0 100%/);
    expect(css).toMatch(
      /--ff-deal-stack-spread:\s*14\.5rem minmax\(0,\s*1fr\) 12\.75rem/,
    );
    expect(css).toMatch(/--ff-deal-stack-job:\s*minmax\(0,\s*1fr\) auto/);
    expect(css).toMatch(/--ff-deal-stack-lines:\s*5\.75rem 5\.5rem 7\.75rem minmax\(0,\s*1fr\)/);
    expect(css).toMatch(
      /\[data-ff-priority-stack\] \.ff-deal-stack-header,\s*\[data-ff-priority-stack\] \.ff-deal-host-spread \{[^}]*grid-template-columns:\s*var\(--ff-deal-stack-spread\)/,
    );
    expect(css).toMatch(
      /\[data-ff-priority-stack\] \.ff-deal-host-job-single,\s*\[data-ff-priority-stack\] \.ff-deal-host-job-multi \{[^}]*grid-template-columns:\s*var\(--ff-deal-stack-job\)/,
    );
    expect(css).toMatch(
      /\[data-ff-priority-stack\] \.ff-deal-stack-header-lines,\s*\[data-ff-priority-stack\] \.ff-deal-host-lines \{[^}]*grid-template-columns:\s*var\(--ff-deal-stack-lines\)/,
    );
    // Quotes stay in the Quotes column — never span under Form/Stage on row 2
    expect(css).not.toMatch(
      /\[data-ff-priority-stack\] \.ff-deal-host-job-single \.ff-deal-host-quotes \{[^}]*grid-row:\s*2/,
    );
    expect(css).not.toMatch(
      /\[data-ff-priority-stack\] \.ff-deal-host-job-single \.ff-deal-host-quotes \{[^}]*grid-column:\s*1 \/ 5/,
    );
    expect(css).toMatch(/\[data-ff-priority-stack\] \.ff-deal-host-line \{[^}]*grid-column:\s*1 \/ -1/);
    expect(css).toMatch(/\[data-ff-priority-stack\] \.ff-deal-host-stamps \{[^}]*overflow:\s*visible/);
    expect(css).toMatch(/\[data-ff-priority-stack\] \.ff-deal-stack-header \{[^}]*position:\s*sticky/);
    expect(css).toMatch(/\[data-ff-priority-stack\] \.ff-deal-host-name \{[^}]*display:\s*flex/);
    expect(css).toMatch(
      /\[data-ff-priority-stack\] \.ff-renewal-health--stack \{[^}]*grid-template-columns:\s*3\.35rem 3\.35rem auto/,
    );
    expect(css).toMatch(
      /\[data-ff-priority-stack\] \.ff-renewal-health--stack \.ff-renewal-health-pair \{[^}]*flex-direction:\s*column/,
    );
    expect(css).toMatch(
      /\[data-ff-priority-stack\] \.ff-renewal-health--stack \.ff-renewal-health-flag-icon \{[^}]*fill:\s*currentColor/,
    );
    expect(css).toMatch(
      /\[data-ff-priority-stack\] \.ff-stack-product,\s*\[data-ff-priority-stack\] \.ff-deal-host-stage,\s*\[data-ff-priority-stack\] \.ff-deal-host-quotes \{[^}]*color:\s*var\(--ff-muted\);[^}]*font-weight:\s*500/,
    );
    expect(css).not.toMatch(/\.ff-deal-host-center,/);
    expect(css).not.toMatch(/\.ff-deal-host-center \.ff-stack-product[\s\S]{0,250}?flex:\s*1 1 7\.5rem/);
    expect(source("src/lib/deals/velocity.ts")).not.toMatch(/label:\s*"Chase"/);
    expect(source("src/lib/deals/radar-desk.ts")).toMatch(/carrierName:\s*carriers\.name/);
    expect(source("src/lib/deals/radar-desk.ts")).toMatch(/selectedQuoteIds/);
    expect(source("src/lib/deals/card-glance.ts")).toMatch(/quotesSentGlanceLabel/);
    expect(source("src/lib/deals/card-glance.ts")).toMatch(/stackHealthFlagged/);
    expect(source("src/lib/deals/card-glance.ts")).toMatch(/isStackQuoteLanguage/);
  });

  it("parks On hold out of the default Stack/Radar/List feed", () => {
    const page = source("src/app/deals/page.tsx");
    expect(page).toMatch(/includeDealInActiveFeed/);
    expect(source("src/lib/deals/on-hold.ts")).toMatch(/ON_HOLD_TAG = "on_hold"/);
    expect(source("src/lib/deals/cold-chase.ts")).toMatch(/!card\.onHold/);
  });
});
