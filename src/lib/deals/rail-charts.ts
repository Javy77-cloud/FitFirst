import { bucketForMatch, type MarketBucket } from "@/lib/deals/manual-markets";
import {
  canonicalizeProductStage,
  PRODUCT_STAGE_LABELS,
  PRODUCT_STAGE_ORDER,
} from "@/lib/deals/product-stages";

export type ShoppingProgressRow = {
  key: string;
  label: string;
  stageLabel: string;
  filled: number;
  total: number;
  lost: boolean;
};

export type AppetiteMixSlice = {
  key: MarketBucket;
  label: string;
  count: number;
};

const APPETITE_LABEL: Record<MarketBucket, string> = {
  appetite: "In appetite",
  stretch: "Stretch",
  skip: "Skip",
};

/** Deal-wide product stages. One row per product on this deal. */
export function shoppingProgressForDeal(
  products: { key: string; label: string; stage?: string | null }[],
): ShoppingProgressRow[] {
  const total = PRODUCT_STAGE_ORDER.length;
  return products.map((product) => {
    const stage = canonicalizeProductStage(product.stage);
    const lost = stage === "closed_lost";
    const rank = (PRODUCT_STAGE_ORDER as readonly string[]).indexOf(stage);
    return {
      key: product.key,
      label: product.label,
      stageLabel: PRODUCT_STAGE_LABELS[stage] ?? "Gathering",
      filled: lost || rank < 0 ? 0 : rank + 1,
      total,
      lost,
    };
  });
}

function lifeOutcomeBucket(outcome: string): MarketBucket | null {
  if (outcome === "accept" || outcome === "preferred" || outcome === "select" || outcome === "standard") {
    return "appetite";
  }
  if (outcome === "graded" || outcome === "call_carrier") return "stretch";
  if (outcome === "decline") return "skip";
  return null;
}

/**
 * Active-product appetite mix. Uses the same buckets as Markets.
 * Life predictions fill the mix only when the sheet produced no carrier matches.
 */
export function appetiteMixForActiveProduct(input: {
  matches: { carrierId: string; band: "green" | "yellow" | "red" }[];
  manualIds?: string[];
  shopListIds?: string[];
  lifeOutcomes?: string[];
}): { slices: AppetiteMixSlice[]; total: number } {
  const manual = new Set((input.manualIds ?? []).filter(Boolean));
  const shopList = new Set((input.shopListIds ?? []).filter(Boolean));
  const matchedIds = new Set(input.matches.map((row) => row.carrierId));
  const counts: Record<MarketBucket, number> = { appetite: 0, stretch: 0, skip: 0 };

  if (input.matches.length > 0 || manual.size > 0) {
    for (const row of input.matches) {
      const bucket = bucketForMatch(
        row.band,
        manual.has(row.carrierId),
        shopList.has(row.carrierId) && matchedIds.has(row.carrierId),
      );
      counts[bucket] += 1;
    }
    for (const id of manual) {
      if (matchedIds.has(id)) continue;
      counts[bucketForMatch("red", true, false)] += 1;
    }
  } else {
    for (const outcome of input.lifeOutcomes ?? []) {
      const bucket = lifeOutcomeBucket(outcome);
      if (bucket) counts[bucket] += 1;
    }
  }

  const slices = (["appetite", "stretch", "skip"] as const).map((key) => ({
    key,
    label: APPETITE_LABEL[key],
    count: counts[key],
  }));
  return {
    slices,
    total: slices.reduce((sum, slice) => sum + slice.count, 0),
  };
}
