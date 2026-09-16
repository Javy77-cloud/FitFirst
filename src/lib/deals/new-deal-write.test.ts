import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  leftoverCreateStageNeedsRepair,
  mergeShopFlowProductStages,
  NEW_DEAL_PIPELINE_STAGE,
  normalizeDealPageStageSlug,
  seedGatheringProductStages,
  seedNewDealShopFlow,
  shopFlowNeedsProductStageSeed,
} from "./new-deal-write";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const GATHERING_DEFAULTS = {
  stage: "gathering",
  selectedQuoteIds: [],
  lostReason: null,
  policyId: null,
  mintStatus: null,
  issuedDone: false,
  inspectionStatus: "none",
  noticeType: "none",
  noticeTaskId: null,
  escrowNote: null,
  noticeNote: null,
  noticeNotes: [],
  listNote: null,
};

describe("new deal write", () => {
  it("locks the first stage to canonical gathering", () => {
    expect(NEW_DEAL_PIPELINE_STAGE).toEqual({
      pipelineStage: "gathering",
      pipelineStageSlug: "gathering",
    });
    expect(normalizeDealPageStageSlug("gather")).toBe("gathering");
    expect(normalizeDealPageStageSlug("shopping")).toBe("gathering");
    expect(normalizeDealPageStageSlug(null)).toBe("gathering");
    expect(leftoverCreateStageNeedsRepair({ pipelineStage: "shopping", pipelineStageSlug: "gather" })).toEqual(
      NEW_DEAL_PIPELINE_STAGE,
    );
    expect(
      leftoverCreateStageNeedsRepair({ pipelineStage: "gathering", pipelineStageSlug: "gathering" }),
    ).toBeNull();
  });

  it("seeds gathering shop_flow.productStages for auto", () => {
    const flow = seedNewDealShopFlow({ shopProducts: ["auto"], shopLines: ["auto"], lineOfBusiness: "AUTO" });
    expect(flow.productStages).toBeTruthy();
    expect(flow.productStages?.auto).toMatchObject(GATHERING_DEFAULTS);
    expect(Object.keys(flow.productStages ?? {})).toEqual(["auto"]);
    expect(shopFlowNeedsProductStageSeed(null, ["auto"])).toBe(true);
    expect(shopFlowNeedsProductStageSeed(flow, ["auto"])).toBe(false);
  });

  it("seeds gathering defaults for every selected product", () => {
    const flow = seedNewDealShopFlow({
      shopProducts: ["homeowners", "auto", "flood"],
      shopLines: ["home", "auto", "flood"],
    });
    expect(Object.keys(flow.productStages ?? {})).toEqual(["homeowners", "auto", "flood"]);
    expect(flow.productStages?.homeowners).toMatchObject(GATHERING_DEFAULTS);
    expect(flow.productStages?.auto).toMatchObject(GATHERING_DEFAULTS);
    expect(flow.productStages?.flood).toMatchObject(GATHERING_DEFAULTS);
    expect(seedGatheringProductStages(["auto", "homeowners"]).homeowners?.stage).toBe("gathering");
  });

  it("fills missing productStages on a leftover null shop_flow without dropping stored stages", () => {
    const repaired = mergeShopFlowProductStages(null, ["auto"]);
    expect(repaired.productStages?.auto).toMatchObject(GATHERING_DEFAULTS);
    const kept = mergeShopFlowProductStages(
      {
        productStages: {
          auto: { stage: "markets", selectedQuoteIds: [] },
        },
      },
      ["auto", "flood"],
    );
    expect(kept.productStages?.auto?.stage).toBe("markets");
    expect(kept.productStages?.flood).toMatchObject(GATHERING_DEFAULTS);
  });

  it("createDeal writes gathering + shop_flow, never leftover gather", () => {
    const save = source("src/app/actions/crm.ts");
    const createFn = save.slice(
      save.indexOf("export async function createDeal("),
      save.indexOf("export async function createDealFromDecDrop"),
    );
    expect(createFn).toMatch(/NEW_DEAL_PIPELINE_STAGE/);
    expect(createFn).toMatch(/seedNewDealShopFlow/);
    expect(createFn).toMatch(/shopFlow:/);
    expect(createFn).not.toMatch(/pipelineStageSlug:\s*"gather"/);
    expect(createFn).not.toMatch(/pipelineStage:\s*"shopping"/);

    expect(save).toMatch(/seedNewDealShopFlow/);
    expect(source("src/app/actions/deal-create.ts")).toMatch(/NEW_DEAL_PIPELINE_STAGE/);
    expect(source("src/app/actions/deal-create.ts")).toMatch(/seedNewDealShopFlow/);
    expect(source("src/app/actions/deal-create.ts")).not.toMatch(/pipelineStageSlug:\s*"gather"/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/mergeShopFlowProductStages/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/normalizeDealPageStageSlug/);
    expect(source("src/app/deals/[id]/error.tsx")).toMatch(/data-ff-deal-load-error/);
    expect(source("src/lib/db/queries.ts")).toMatch(/leftoverCreateStageNeedsRepair/);
  });
});
