import { inferDealProducts, normalizeDealProducts } from "@/lib/deals/deal-products";
import {
  productStageFor,
  type DealProductStages,
} from "@/lib/deals/product-stages";
import { parseShopFlow, type DealShopFlowState } from "@/lib/deals/shop-flow";
import { canonicalizePipelineSlug, resolveStageMove } from "@/lib/wire/pipeline";

/** Locked first stage on every new shop — never leftover `gather` / `shopping`. */
export const NEW_DEAL_PIPELINE_STAGE = resolveStageMove("gathering");

export type NewDealProductHint = {
  shopProducts?: string[] | null;
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
};

/** Gathering defaults — same shape `productStageFor` uses on the desk. */
export function gatheringProductStageDefaults() {
  return productStageFor({}, "auto");
}

export function seedGatheringProductStages(
  products: readonly string[] | null | undefined,
): DealProductStages {
  const out: DealProductStages = {};
  for (const product of normalizeDealProducts(products)) {
    out[product] = productStageFor({}, product);
  }
  return out;
}

/** Persist on create so the multi-product desk always has productStages. */
export function seedNewDealShopFlow(input: NewDealProductHint): DealShopFlowState {
  return {
    productStages: seedGatheringProductStages(inferDealProducts(input)),
  };
}

/** In-memory repair: keep stored stages, fill missing products with gathering. */
export function mergeShopFlowProductStages(
  shopFlow: unknown,
  products: readonly string[] | null | undefined,
): DealShopFlowState {
  const saved = parseShopFlow(shopFlow);
  const seeded = seedGatheringProductStages(products);
  return {
    ...saved,
    productStages: { ...seeded, ...saved.productStages },
  };
}

const RETIRED_CREATE_STAGES = new Set(["gather", "gather_info", "shopping"]);

function rawStageKey(value?: string | null): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[/·]+/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Leftover create slugs that white-screened the deal page. */
export function leftoverCreateStageNeedsRepair(deal: {
  pipelineStage?: string | null;
  pipelineStageSlug?: string | null;
}): { pipelineStage: string; pipelineStageSlug: string } | null {
  const rawSlug = rawStageKey(deal.pipelineStageSlug);
  const rawStage = rawStageKey(deal.pipelineStage);
  if (!RETIRED_CREATE_STAGES.has(rawSlug) && !RETIRED_CREATE_STAGES.has(rawStage)) {
    return null;
  }
  return NEW_DEAL_PIPELINE_STAGE;
}

export function shopFlowNeedsProductStageSeed(
  shopFlow: unknown,
  products: readonly string[] | null | undefined,
): boolean {
  if (!shopFlow || typeof shopFlow !== "object" || Array.isArray(shopFlow)) return true;
  const saved = parseShopFlow(shopFlow);
  const wanted = normalizeDealProducts(products);
  if (!wanted.length) return !saved.productStages || !Object.keys(saved.productStages).length;
  return wanted.some((product) => !saved.productStages?.[product]?.stage);
}

/** Canonical slug for header / chips — unknown leftovers become gathering. */
export function normalizeDealPageStageSlug(stage?: string | null): string {
  return canonicalizePipelineSlug(stage) || NEW_DEAL_PIPELINE_STAGE.pipelineStageSlug;
}
