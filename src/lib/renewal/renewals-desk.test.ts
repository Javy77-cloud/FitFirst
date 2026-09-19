import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Renewals desk chrome", () => {
  it("uses an urgency-only board, pulse, and corner Today Activity on /renewals", () => {
    const desk = source("src/components/renewals/renewals-desk.tsx");
    const views = source("src/components/renewals/renewals-filtered-views.tsx");
    const board = source("src/components/renewals/renewals-urgency-board.tsx");
    const urgency = source("src/lib/renewal/urgency.ts");
    const card = source("src/components/renewals/renewal-card.tsx");
    const pulse = source("src/components/renewals/renewals-pulse.tsx");
    const corner = source("src/components/renewals/today-activity-corner.tsx");
    const renewalsPage = source("src/app/renewals/page.tsx");
    const dealsPage = source("src/app/deals/page.tsx");

    expect(desk).toMatch(/DealWorkspaceBar/);
    expect(desk).toMatch(/TodayActivityCorner/);
    expect(desk).toMatch(/DealWorkQueuePanel/);
    expect(desk).toMatch(/PipelineBookModeToggle/);
    expect(desk).toMatch(/pipelineBookToggleHrefs\(view\)/);
    expect(desk).toMatch(/cookieKey=\{RENEWALS_VIEW_COOKIE\}/);
    expect(desk).toMatch(/hrefBuilder=\{renewalsHref\}/);
    expect(desk).toMatch(/boardWhenNoPipeline=\{null\}/);
    expect(desk).toMatch(/basePath="\/renewals"/);
    expect(desk).toMatch(/PipelineFilterPopover/);
    expect(desk).toMatch(/renewals-pipeline/);
    expect(desk).toMatch(/RenewalsFilteredViews/);
    expect(desk).toMatch(/RenewalsPulse/);
    expect(desk).toMatch(/DeskTruthStrip/);
    expect(desk).toMatch(/renewalHeatShares/);
    expect(desk).not.toMatch(/RenewalsList/);
    expect(desk).not.toMatch(/TodayActivityStrip/);
    expect(desk).not.toMatch(/deal-upload-activity/);
    expect(desk).not.toMatch(/deal-today-slot/);
    expect(views).toMatch(/RenewalsUrgencyBoard/);
    expect(views).not.toMatch(/RenewalsKanban/);
    expect(views).not.toMatch(/RenewalsTable/);
    expect(views).not.toMatch(/RenewalsFunnel/);
    expect(board).toMatch(/RENEWAL_URGENCY_BANDS/);
    expect(board).toMatch(/data-ff-urgency-band/);
    expect(board).not.toMatch(/Upcoming|Contacted|Quoted|Bound|Lost/);
    expect(urgency).toMatch(/Under 30 days/);
    expect(urgency).toMatch(/30–60 days/);
    expect(urgency).toMatch(/60–90 days/);
    expect(urgency).toMatch(/90\+ days/);
    expect(urgency).not.toMatch(/Upcoming|Contacted|Quoted|Bound|Lost/);
    expect(card).toMatch(/clientName/);
    expect(card).toMatch(/data-ff-risk-badge/);
    expect(card).toMatch(/premiumDelta/);
    expect(card).toMatch(/renewalWhyLine/);
    expect(card).toMatch(/RenewalCompareDrawer/);
    expect(card).toMatch(/RenewalHealthMeter/);
    expect(card).toMatch(/sendRenewalChase/);
    expect(card).toMatch(/RenewalMiniReview/);
    expect(pulse).toMatch(/data-ff-renewals-pulse/);
    expect(pulse).toMatch(/Book pulse/);
    expect(desk).toMatch(/DeskTruthStrip/);
    expect(desk).toMatch(/roleHealthSummary/);
    expect(card).toMatch(/autopilotConfirmLabel|data-ff-autopilot/);
    expect(source("src/lib/renewal/autopilot.ts")).toMatch(/AUTOPILOT_SILENCE_DAYS/);
    expect(source("src/lib/notifications/panel.ts")).toMatch(/renewal_autopilot/);
    expect(source("src/lib/renewal/health-rollup.ts")).toMatch(/Never per-policy primary/);
    expect(source("src/components/renewals/renewal-compare-drawer.tsx")).toMatch(/data-ff-compare-eye/);
    expect(source("src/components/renewals/renewal-compare-drawer.tsx")).toMatch(/ff-renewal-compare-dark/);
    expect(source("src/lib/renewal/gemini-diff.ts")).toMatch(/bothSides/);
    expect(source("src/lib/renewal/gemini-diff.ts")).toMatch(/snapshot only|fallback/);
    expect(corner).toMatch(/data-ff-today-activity-corner/);
    expect(corner).toMatch(/Open Today Activity/);
    expect(corner).toMatch(/Collapse Today Activity/);
    expect(corner).toMatch(/TodayActivityStrip/);
    expect(desk).toMatch(/No archived renewals yet/);
    expect(desk).toMatch(/Classic queue/);
    expect(desk).toMatch(/Book health/);
    expect(renewalsPage).toMatch(/RenewalsDesk/);
    expect(renewalsPage).toMatch(/DeskPageTrail/);
    expect(renewalsPage).toMatch(/Back to policy/);
    expect(renewalsPage).toMatch(/canEditStages=\{session.isAdmin\}/);
    expect(dealsPage).toMatch(/book === "renewals"/);
    expect(dealsPage).toMatch(/<RenewalsDesk/);
    expect(dealsPage).not.toMatch(/RenewalsWorkspace/);
  });

  it("keeps coverage-gap and cross-sell prompts off renewals list, board, grid, and classic queue", () => {
    const list = source("src/components/renewals/renewals-list.tsx");
    const card = source("src/components/renewals/renewal-card.tsx");
    const grid = source("src/components/renewals/renewals-table.tsx");
    const queue = source("src/app/renewals/queue/page.tsx");
    const deskData = source("src/lib/renewal/board-data.ts");
    const desk = source("src/components/renewals/renewals-desk.tsx");
    expect(list).not.toMatch(/GapCountBadge/);
    expect(card).not.toMatch(/GapCountBadge/);
    expect(grid).not.toMatch(/GapCountBadge/);
    expect(queue).not.toMatch(/GapCountBadge/);
    expect(queue).not.toMatch(/loadRenewalGapCounts/);
    expect(card).not.toMatch(/RenewalCrossSellPanel/);
    expect(card).not.toMatch(/data-ff-renewal-cross-sell/);
    expect(desk).not.toMatch(/emailTemplates/);
    expect(deskData).not.toMatch(/gapCount/);
    expect(deskData).not.toMatch(/crossSell/);
    expect(deskData).not.toMatch(/analyzeCoverageGaps|householdGapCount|missingRenewalCrossSellLines/);
  });

  it("keeps RenewalGapStrip off policy renewal views and deal tabs", () => {
    const policy = source("src/app/policies/[id]/page.tsx");
    const deal = source("src/app/deals/[id]/page.tsx");
    expect(policy).not.toMatch(/RenewalGapStrip/);
    expect(policy).not.toMatch(/loadRenewalGapItems/);
    expect(policy).not.toMatch(/Add product to package/);
    expect(deal).not.toMatch(/RenewalGapStrip/);
    expect(deal).not.toMatch(/loadRenewalGapItems/);
    expect(deal).not.toMatch(/GapPanel/);
  });

  it("keeps deals and renewals default-view cookies independent", () => {
    const cookieNames = source("src/lib/wire/pipeline-view-cookies.ts");
    const prefs = source("src/app/actions/pipeline-view-prefs.ts");
    const bar = source("src/components/deals/deal-workspace-bar.tsx");
    expect(cookieNames).toMatch(/ff_pipeline_view/);
    expect(cookieNames).toMatch(/ff_renewals_view/);
    expect(prefs).toMatch(/pipeline-view-cookies/);
    expect(bar).toMatch(/hrefBuilder/);
    expect(bar).toMatch(/RENEWALS_VIEW_COOKIE/);
    expect(source("src/lib/wire/pipeline.ts")).toMatch(/export function renewalsHref/);
    expect(source("src/lib/wire/pipeline.ts")).toMatch(/parseRenewalsView/);
  });
});
