"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { moveDealToStage } from "@/app/actions/pipeline";
import { currentDeskSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { deals, quoteAttemptLogs, quotes } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  inferDealProducts,
  parseDealProduct,
  splitHomeProducts,
  type DealProductId,
} from "@/lib/deals/deal-products";
import {
  isProductLostReason,
  lateStageNeedsQuoteSelection,
  liveSelectedQuoteIds,
  parseProductStages,
  productStageFor,
  setProductStage,
} from "@/lib/deals/product-stages";
import { issuePolicyFromDeclaration } from "@/app/actions/policy-mint";
import { isPolicyIssuedStage, quotesOnlyStageBlocked } from "@/lib/policy/mint-gate";
import { parseShopFlow, quoteMatchesDealProduct } from "@/lib/deals/shop-flow";
import { persistDealShopFlow } from "@/lib/deals/shop-flow-persist";
import { flashAction } from "@/lib/flash-action";
import { writeCrmSignalsSafe } from "@/lib/crm/signals";

async function loadDeal(dealId: string) {
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.tenantId, DEFAULT_TENANT_ID)));
  return deal ?? null;
}

function productsOnDeal(deal: {
  shopProducts?: string[] | null;
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
}): DealProductId[] {
  return inferDealProducts({
    shopProducts: deal.shopProducts,
    shopLines: deal.shopLines,
    lineOfBusiness: deal.lineOfBusiness,
    quotingLine: deal.quotingLine,
    quotingForm: deal.quotingForm,
    policySubType: deal.policySubType,
  });
}

async function liveQuoteIdsForProduct(
  dealId: string,
  product: DealProductId,
  deal: {
    shopFlow?: unknown;
    shopProducts?: string[] | null;
    shopLines?: string[] | null;
    lineOfBusiness?: string | null;
    quotingLine?: string | null;
    quotingForm?: string | null;
    policySubType?: string | null;
  },
): Promise<string[]> {
  const [quoteRows, logRows] = await Promise.all([
    db
      .select({
        id: quotes.id,
        shopLine: quotes.shopLine,
        notes: quotes.notes,
        quoteAttemptLogId: quotes.quoteAttemptLogId,
        quoteRunId: quotes.quoteRunId,
        stub: quotes.stub,
      })
      .from(quotes)
      .where(and(eq(quotes.tenantId, DEFAULT_TENANT_ID), eq(quotes.dealId, dealId))),
    db
      .select({ id: quoteAttemptLogs.id, lineOfBusiness: quoteAttemptLogs.lineOfBusiness })
      .from(quoteAttemptLogs)
      .where(and(eq(quoteAttemptLogs.tenantId, DEFAULT_TENANT_ID), eq(quoteAttemptLogs.dealId, dealId))),
  ]);
  const products = productsOnDeal(deal);
  const shopFlow = parseShopFlow(deal.shopFlow);
  return quoteRows
    .filter((row) => row.stub !== true)
    .filter((row) =>
      quoteMatchesDealProduct(
        {
          shopLine: row.shopLine,
          notes: row.notes,
          quoteAttemptLogId: row.quoteAttemptLogId,
          quoteRunId: row.quoteRunId,
          quoteRuns: shopFlow.quoteRuns,
          logs: logRows,
        },
        product,
        {
          multiLine: products.length > 1,
          isPrimaryLine: products[0] === product,
          splitHomeProducts: splitHomeProducts(products),
        },
      ),
    )
    .map((row) => row.id);
}

export async function setDealProductStage(input: {
  dealId: string;
  product: string;
  stageSlug: string;
  pipelineSlug: string;
  selectedQuoteIds?: string[];
  lostReason?: string | null;
  surface?: "quotes" | "header" | "chip";
}) {
  const dealId = input.dealId.trim();
  const product = parseDealProduct(input.product);
  const stageSlug = input.stageSlug.trim();
  if (!dealId || !product || !stageSlug) return { ok: false as const, reason: "invalid" };
  const deal = await loadDeal(dealId);
  if (!deal) return { ok: false as const, reason: "missing" };

  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const current = productStageFor(stages, product, deal.pipelineStageSlug ?? deal.pipelineStage);
  const liveQuoteIds = await liveQuoteIdsForProduct(dealId, product, deal);
  const selectedQuoteIds = liveSelectedQuoteIds(
    input.selectedQuoteIds ?? current.selectedQuoteIds,
    liveQuoteIds,
  );
  if (lateStageNeedsQuoteSelection({ stage: stageSlug, selectedQuoteIds, liveQuoteIds })) {
    return { ok: false as const, reason: "need_quote" };
  }
  if (quotesOnlyStageBlocked(stageSlug, input.surface)) {
    return { ok: false as const, reason: "quotes_only" };
  }
  if (stageSlug === "closed_lost" && input.lostReason && !isProductLostReason(input.lostReason)) {
    return { ok: false as const, reason: "need_lost_reason" };
  }
  if (isPolicyIssuedStage(stageSlug)) {
    const minted = await issuePolicyFromDeclaration({
      dealId,
      product,
      pipelineSlug: input.pipelineSlug,
      selectedQuoteIds,
      surface: input.surface ?? "quotes",
    });
    if (!minted.ok) return minted;
    revalidatePath(`/deals/${dealId}`);
    revalidatePath("/deals");
    return { ok: true as const, policyId: minted.policyId };
  }

  const nextStages = setProductStage(stages, product, {
    stage: stageSlug,
    selectedQuoteIds,
    lostReason: stageSlug === "closed_lost" ? input.lostReason ?? current.lostReason : null,
  });
  await persistDealShopFlow(dealId, { ...saved, productStages: nextStages });

  const products = productsOnDeal(deal);
  if (products.length <= 1) {
    await moveDealToStage({
      dealId,
      pipelineSlug: input.pipelineSlug,
      stageSlug,
    });
  } else {
    await writeCrmSignalsSafe({
      kind: "stage_moved",
      title: `Stage · ${product} · ${stageSlug} · ${deal.title}`,
      body: `${product} moved to ${stageSlug}. Other products keep their own stage.`,
      entityType: "deal",
      entityId: dealId,
      dealId,
      createTask: false,
    });
  }

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  return { ok: true as const };
}

export async function selectDealProductQuotes(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const productRaw = String(formData.get("product") ?? "").trim();
  const product = parseDealProduct(productRaw);
  const quoteIds = formData
    .getAll("quoteId")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  if (!dealId || !product) throw new Error("Deal and product are required.");
  const deal = await loadDeal(dealId);
  if (!deal) throw new Error("Deal not found.");
  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const next = setProductStage(stages, product, { selectedQuoteIds: quoteIds });
  await persistDealShopFlow(dealId, { ...saved, productStages: next });
  revalidatePath(`/deals/${dealId}`);
  flashAction(`/deals/${dealId}?tab=quotes&product=${product}`, "Quote selected");
}

export async function toggleDealProductQuote(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const product = parseDealProduct(String(formData.get("product") ?? ""));
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  if (!dealId || !product || !quoteId) throw new Error("Deal, product, and quote are required.");
  const deal = await loadDeal(dealId);
  if (!deal) throw new Error("Deal not found.");
  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const current = productStageFor(stages, product, deal.pipelineStageSlug ?? deal.pipelineStage);
  const selected = new Set(current.selectedQuoteIds);
  if (selected.has(quoteId)) selected.delete(quoteId);
  else selected.add(quoteId);
  const next = setProductStage(stages, product, { selectedQuoteIds: [...selected] });
  await persistDealShopFlow(dealId, { ...saved, productStages: next });
  revalidatePath(`/deals/${dealId}`);
}

export async function markDealProductLost(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const product = parseDealProduct(String(formData.get("product") ?? ""));
  const reason = String(formData.get("lostReason") ?? "").trim();
  const pipelineSlug = String(formData.get("pipelineSlug") ?? "p-c").trim() || "p-c";
  if (!dealId || !product) throw new Error("Deal and product are required.");
  if (!isProductLostReason(reason)) throw new Error("Pick a lost reason.");
  const session = await currentDeskSession();
  const result = await setDealProductStage({
    dealId,
    product,
    stageSlug: "closed_lost",
    pipelineSlug,
    lostReason: reason,
  });
  if (!result.ok) throw new Error("Could not mark product lost.");
  await writeCrmSignalsSafe({
    kind: "stage_moved",
    title: `Lost · ${product} · ${reason}`,
    body: `${session.name || "Agent"} closed ${product}: ${reason}.`,
    entityType: "deal",
    entityId: dealId,
    dealId,
    createTask: false,
  });
  flashAction(`/deals/${dealId}?product=${product}`, "Product marked lost");
}