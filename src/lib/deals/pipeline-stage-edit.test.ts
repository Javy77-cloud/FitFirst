import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EDITABLE_DEAL_PIPELINE_SLUGS } from "@/lib/wire/pipeline";
import { isEarlyBoardStage, isQuotesOnlyBoardStage } from "@/lib/deals/product-stages";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("deals pipeline stage editor + Lost/Archive layout", () => {
  it("lets admin edit P&C / Life / Health stages even when the All tab has no stages row", () => {
    expect(EDITABLE_DEAL_PIPELINE_SLUGS).toEqual(["p-c", "health", "life"]);
    const menu = source("src/components/deals/pipeline-views-menu.tsx");
    expect(menu).toMatch(/stageBoards/);
    expect(menu).toMatch(/StageColorMenu/);
    expect(menu).not.toMatch(/Edit stages/);
    expect(menu).not.toMatch(/PipelineStageEditor/);
    expect(menu).not.toMatch(/data-ff-edit-stages/);
    const page = source("src/app/deals/page.tsx");
    expect(page).toMatch(/EDITABLE_DEAL_PIPELINE_SLUGS/);
    expect(page).toMatch(/stageBoards=/);
    const bar = source("src/components/deals/deal-workspace-bar.tsx");
    expect(bar).toMatch(/stageBoards=\{stageBoards\}/);
    expect(bar).toMatch(/PipelineViewsMenu/);
  });

  it("keeps admin stage labels and added stages across /deals loads", () => {
    const ensure = source("src/lib/wire/ensure-pipelines.ts");
    expect(ensure).toMatch(/Live desk: keep admin labels/);
    expect(ensure).toMatch(/if \(stages.length === 0\)/);
    expect(ensure).not.toMatch(/existingStage.name !== stage.name/);
    expect(ensure).not.toMatch(/Closed Won shifts right without a wipe/);
    const editor = source("src/components/pipeline/stage-editor.tsx");
    expect(editor).toMatch(/addPipelineStage/);
    expect(editor).toMatch(/relabelPipelineStage/);
    expect(editor).toMatch(/deletePipelineStage/);
    expect(editor).toMatch(/reorderPipelineStage/);
    expect(editor).toMatch(/setPipelineStageColor/);
    expect(editor).toMatch(/placeholder="New stage"/);
    const settings = source("src/app/settings/pipeline-stages/page.tsx");
    expect(settings).toMatch(/requireAdminPage/);
    expect(settings).toMatch(/PipelineStageEditor/);
    expect(settings).toMatch(/"renewals"/);
    expect(settings).toMatch(/data-ff-admin-stage-settings/);
  });

  it("puts Lost / Archive under the stage strip and keeps star + ⋮ on the right", () => {
    const bar = source("src/components/deals/deal-workspace-bar.tsx");
    expect(bar).toMatch(/data-ff-closed-under-strip/);
    expect(bar).toMatch(/data-testid="deal-closed-filters"/);
    expect(bar).toMatch(/PipelineViewDefaultStar/);
    expect(bar).toMatch(/PipelineViewsMenu/);
    const closedAt = bar.indexOf("deal-closed-filters");
    const viewsAt = bar.indexOf("deal-pipeline-views");
    const starAt = bar.lastIndexOf("<PipelineViewDefaultStar");
    expect(closedAt).toBeGreaterThan(-1);
    expect(closedAt).toBeLessThan(viewsAt);
    expect(starAt).toBeGreaterThan(viewsAt);
    expect(bar).toMatch(/ml-auto \$\{FF_CHIP_TAB_GROUP\}/);
  });

  it("treats custom stages after Quote sent as Quotes-only on list and board", () => {
    expect(isEarlyBoardStage("gathering")).toBe(true);
    expect(isEarlyBoardStage("uw_hold")).toBe(false);
    const board = [
      { slug: "gathering", sortOrder: 0 },
      { slug: "markets", sortOrder: 1 },
      { slug: "quote_review", sortOrder: 2 },
      { slug: "quote_sent", sortOrder: 3 },
      { slug: "awaiting_uw", sortOrder: 4 },
    ];
    expect(isQuotesOnlyBoardStage("awaiting_uw", board)).toBe(true);
    expect(isQuotesOnlyBoardStage("gathering", board)).toBe(false);
    expect(source("src/app/actions/pipeline.ts")).toMatch(/isQuotesOnlyBoardStage\(canonical, boardStages\)/);
    expect(source("src/components/deals/deal-stage-select.tsx")).toMatch(
      /isQuotesOnlyBoardStage\(next, options\)/,
    );
  });
});
