import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals, documents, quoteAttemptLogs, quoteSheets, quotes } from "@/lib/db/schema";
import { isDocumentsSourceDoc } from "@/lib/deals/quote-docs";
import {
  parseShopFlow,
  riskFingerprint,
  staleShopFlow,
  type DealShopFlowState,
} from "@/lib/deals/shop-flow";

export async function loadDealRiskFingerprint(dealId: string): Promise<string> {
  const [sheets, docs] = await Promise.all([
    db
      .select({ line: quoteSheets.line, values: quoteSheets.values })
      .from(quoteSheets)
      .where(and(eq(quoteSheets.tenantId, DEFAULT_TENANT_ID), eq(quoteSheets.dealId, dealId))),
    db
      .select({
        id: documents.id,
        filename: documents.filename,
        createdAt: documents.createdAt,
        slot: documents.slot,
        docType: documents.docType,
        tags: documents.tags,
      })
      .from(documents)
      .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.dealId, dealId))),
  ]);
  return riskFingerprint({
    sheets,
    docs: docs.filter((doc) => isDocumentsSourceDoc(doc)),
  });
}

export async function persistDealShopFlow(dealId: string, shopFlow: DealShopFlowState) {
  await db
    .update(deals)
    .set({ shopFlow, updatedAt: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.tenantId, DEFAULT_TENANT_ID)));
}

/** After a material sheet / source-doc change: Markets + Quotes must be re-run. */
export async function markShopFlowStaleAfterRiskChange(dealId: string) {
  if (!dealId) return;
  const [deal] = await db
    .select({ shopFlow: deals.shopFlow })
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.tenantId, DEFAULT_TENANT_ID)));
  if (!deal) return;
  const saved = parseShopFlow(deal.shopFlow);
  const alreadyTracking = saved.marketsFingerprint != null || saved.quotesFingerprint != null;
  if (alreadyTracking) {
    if (saved.marketsFingerprint === "" && saved.quotesFingerprint === "") return;
    await persistDealShopFlow(dealId, staleShopFlow(saved));
    return;
  }
  const [quoted] = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(and(eq(quotes.tenantId, DEFAULT_TENANT_ID), eq(quotes.dealId, dealId)))
    .limit(1);
  const [shopped] = quoted
    ? [quoted]
    : await db
        .select({ id: quoteAttemptLogs.id })
        .from(quoteAttemptLogs)
        .where(
          and(eq(quoteAttemptLogs.tenantId, DEFAULT_TENANT_ID), eq(quoteAttemptLogs.dealId, dealId)),
        )
        .limit(1);
  if (!quoted && !shopped) return;
  await persistDealShopFlow(dealId, staleShopFlow(saved));
}
