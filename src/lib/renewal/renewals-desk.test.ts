import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Renewals desk chrome", () => {
  it("clones Deals workspace chrome on /renewals and /deals?book=renewals", () => {
    const desk = source("src/components/renewals/renewals-desk.tsx");
    const renewalsPage = source("src/app/renewals/page.tsx");
    const dealsPage = source("src/app/deals/page.tsx");
    expect(desk).toMatch(/DealWorkspaceBar/);
    expect(desk).toMatch(/TodayActivityStrip/);
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
    expect(desk).toMatch(/RenewalsList/);
    const views = source("src/components/renewals/renewals-filtered-views.tsx");
    expect(views).toMatch(/RenewalsKanban/);
    expect(views).toMatch(/RenewalsTable/);
    expect(views).toMatch(/RenewalsFunnel/);
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
