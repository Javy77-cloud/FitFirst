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

  it("shows household coverage-gap badges on list, board, grid, and classic queue", () => {
    const list = source("src/components/renewals/renewals-list.tsx");
    const card = source("src/components/renewals/renewal-card.tsx");
    const grid = source("src/components/renewals/renewals-table.tsx");
    const queue = source("src/app/renewals/queue/page.tsx");
    const deskData = source("src/lib/renewal/board-data.ts");
    expect(list).toMatch(/GapCountBadge/);
    expect(card).toMatch(/GapCountBadge/);
    expect(grid).toMatch(/GapCountBadge/);
    expect(queue).toMatch(/GapCountBadge/);
    expect(deskData).toMatch(/gapCount/);
    expect(deskData).toMatch(/analyzeCoverageGaps|householdGapCount/);
    expect(source("src/components/coverage/gap-count-badge.tsx")).toMatch(/if \(count <= 0\) return null/);
  });

  it("puts a compact coverage-gap strip on renewal policy, not on deal tabs", () => {
    const strip = source("src/components/coverage/renewal-gap-strip.tsx");
    const policy = source("src/app/policies/[id]/page.tsx");
    const deal = source("src/app/deals/[id]/page.tsx");
    expect(strip).toMatch(/Add product to package/);
    expect(strip).toMatch(/GAP_DISMISS_REASONS/);
    expect(source("src/lib/coverage/renewal-gaps.ts")).toMatch(/not_interested/);
    expect(source("src/lib/coverage/renewal-gaps.ts")).toMatch(/already_elsewhere/);
    expect(source("src/lib/coverage/renewal-gaps.ts")).toMatch(/not_eligible/);
    expect(strip).toMatch(/if \(findings\.length === 0\) return null/);
    expect(strip).not.toMatch(/sparkle/i);
    expect(policy).toMatch(/RenewalGapStrip/);
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
