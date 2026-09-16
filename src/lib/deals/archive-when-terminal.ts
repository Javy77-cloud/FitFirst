import { and, eq } from "drizzle-orm";
import { inferDealProducts, parseDealProduct, type DealProductId } from "@/lib/deals/deal-products";
import {
  canonicalizeProductStage,
  parseProductStages,
  type DealProductStageState,
  type DealProductStages,
} from "@/lib/deals/product-stages";
import { parseShopFlow } from "@/lib/deals/shop-flow";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isProductIssuedDone } from "@/lib/policy/dec-prompt";
import {
  dealStageForPipeline,
  isArchiveStage,
  isClosedLostStage,
  isClosedWonStage,
} from "@/lib/wire/pipeline";

/**
 * Last-product auto-archive (Javy 2026-09-16).
 * Rosa Castellanos HO (`ROSA_DEC_DEAL_ID`) was archived by hand; new last-product
 * publishes / closed_won / closed_lost / issued-done should call
 * `maybeArchiveDealWhenAllProductsTerminal` instead.
 */
export const TERMINAL_PRODUCT_STAGES = ["closed_won", "closed_lost", "policy_issued"] as const;

export type DealClosedStage = "closed_won" | "closed_lost";

export type ArchiveWhenTerminalDecision = {
  shouldArchive: boolean;
  alreadyArchived: boolean;
  dealStage: DealClosedStage | null;
  reason: "shopping" | "empty" | "already_archived" | "archive";
  /** DB patch. Null when a backfill/re-run should not write. */
  patch: {
    archivedAt: Date;
    pipelineStage?: string;
    pipelineStageSlug?: string;
    updatedAt: Date;
  } | null;
};

const SHOPPING_STAGES = new Set([
  "gathering",
  "markets",
  "quote_review",
  "quote_sent",
  "bound",
  "pending_inspection",
]);

/** Union chips on the deal with leftover `productStages` keys so a sibling never gets dropped. */
export function productsForTerminalArchive(
  dealProducts: readonly DealProductId[],
  stages?: DealProductStages | null,
): DealProductId[] {
  const seen = new Set<DealProductId>();
  const out: DealProductId[] = [];
  for (const raw of [...dealProducts, ...Object.keys(stages ?? {})]) {
    const product = parseDealProduct(raw);
    if (!product || seen.has(product)) continue;
    seen.add(product);
    out.push(product);
  }
  return out;
}

/**
 * Terminal for archive: closed_won / closed_lost / policy_issued,
 * plus issuedDone or mint published (same as Closed won after mint publish).
 */
export function isProductTerminalForArchive(state?: DealProductStageState | null): boolean {
  if (!state) return false;
  if (state.issuedDone) return true;
  if ((state.mintStatus ?? "").toLowerCase() === "published") return true;
  const stage = canonicalizeProductStage(state.stage);
  if (SHOPPING_STAGES.has(stage)) return false;
  return (
    stage === "closed_won" ||
    stage === "closed_lost" ||
    stage === "policy_issued" ||
    isProductIssuedDone(state)
  );
}

export function allProductsTerminalForArchive(
  products: readonly DealProductId[],
  stages?: DealProductStages | null,
): boolean {
  const list = productsForTerminalArchive(products, stages);
  if (!list.length) return false;
  return list.every((product) => isProductTerminalForArchive(stages?.[product] ?? null));
}

export function dealStageWhenAllProductsTerminal(
  products: readonly DealProductId[],
  stages?: DealProductStages | null,
): DealClosedStage | null {
  const list = productsForTerminalArchive(products, stages);
  if (!allProductsTerminalForArchive(list, stages)) return null;
  const anyWon = list.some((product) => {
    const state = stages?.[product];
    if (!state) return false;
    if (isProductIssuedDone(state)) return true;
    if ((state.mintStatus ?? "").toLowerCase() === "published") return true;
    const stage = canonicalizeProductStage(state.stage);
    return stage === "closed_won" || stage === "policy_issued";
  });
  return anyWon ? "closed_won" : "closed_lost";
}

function dealAlreadyAtClosedStage(
  dealStage: DealClosedStage,
  pipelineStage?: string | null,
  pipelineStageSlug?: string | null,
): boolean {
  if (dealStage === "closed_won") {
    return isClosedWonStage(pipelineStageSlug) || isClosedWonStage(pipelineStage);
  }
  return isClosedLostStage(pipelineStageSlug) || isClosedLostStage(pipelineStage);
}

/** Pure decision — safe to re-run on already-archived / mixed / shopping deals. */
export function decideArchiveDealWhenAllProductsTerminal(input: {
  products: readonly DealProductId[];
  stages?: DealProductStages | null;
  archivedAt?: Date | string | null;
  pipelineStage?: string | null;
  pipelineStageSlug?: string | null;
  now?: Date;
}): ArchiveWhenTerminalDecision {
  const now = input.now ?? new Date();
  const list = productsForTerminalArchive(input.products, input.stages);
  if (!list.length) {
    return { shouldArchive: false, alreadyArchived: false, dealStage: null, reason: "empty", patch: null };
  }
  const dealStage = dealStageWhenAllProductsTerminal(list, input.stages);
  if (!dealStage) {
    return { shouldArchive: false, alreadyArchived: Boolean(input.archivedAt), dealStage: null, reason: "shopping", patch: null };
  }

  const alreadyArchived = Boolean(input.archivedAt);
  const onArchiveBoard =
    isArchiveStage(input.pipelineStageSlug) || isArchiveStage(input.pipelineStage);
  const stageMatches = dealAlreadyAtClosedStage(dealStage, input.pipelineStage, input.pipelineStageSlug);

  if (alreadyArchived && (onArchiveBoard || stageMatches)) {
    return {
      shouldArchive: false,
      alreadyArchived: true,
      dealStage,
      reason: "already_archived",
      patch: null,
    };
  }

  const archivedAt =
    input.archivedAt instanceof Date
      ? input.archivedAt
      : input.archivedAt
        ? new Date(input.archivedAt)
        : now;

  if (onArchiveBoard) {
    return {
      shouldArchive: true,
      alreadyArchived,
      dealStage,
      reason: "archive",
      patch: { archivedAt, updatedAt: now },
    };
  }

  return {
    shouldArchive: true,
    alreadyArchived,
    dealStage,
    reason: "archive",
    patch: {
      archivedAt,
      pipelineStage: dealStageForPipeline(dealStage),
      pipelineStageSlug: dealStage,
      updatedAt: now,
    },
  };
}

/**
 * When the last product is terminal, stamp `deals.archived_at` and keep
 * deal-level stage closed_won / closed_lost. No-op while any sibling is shopping.
 * Re-runs keep an existing `archived_at` (backfill-safe).
 */
export async function maybeArchiveDealWhenAllProductsTerminal(dealId: string, now = new Date()) {
  const id = dealId.trim();
  if (!id) return { archived: false as const, reason: "empty" as const };
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, id), eq(deals.tenantId, DEFAULT_TENANT_ID)));
  if (!deal) return { archived: false as const, reason: "empty" as const };

  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const products = inferDealProducts({
    shopProducts: deal.shopProducts,
    shopLines: deal.shopLines,
    lineOfBusiness: deal.lineOfBusiness,
    quotingLine: deal.quotingLine,
    quotingForm: deal.quotingForm,
    policySubType: deal.policySubType,
  });
  const decision = decideArchiveDealWhenAllProductsTerminal({
    products,
    stages,
    archivedAt: deal.archivedAt,
    pipelineStage: deal.pipelineStage,
    pipelineStageSlug: deal.pipelineStageSlug,
    now,
  });
  if (!decision.patch) {
    return { archived: false as const, reason: decision.reason, dealStage: decision.dealStage };
  }
  await db.update(deals).set(decision.patch).where(eq(deals.id, id));
  return {
    archived: true as const,
    reason: decision.reason,
    dealStage: decision.dealStage,
    alreadyArchived: decision.alreadyArchived,
  };
}
