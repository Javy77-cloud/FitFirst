import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals, documents, quoteAttemptLogs, quoteSheets, quotes } from "@/lib/db/schema";
import { BIND_RECHECK_CLEAR_PATCH } from "@/lib/deals/bind-gate";
import { isDocumentsSourceDoc } from "@/lib/deals/quote-docs";
import { writeCrmSignalsSafe } from "@/lib/crm/signals";
import {
  nextShopFlowAfterSheetEdit,
  parseShopFlow,
  quoteMatchesShopLine,
  riskFingerprint,
  staleShopFlow,
  staleShopFlowForLine,
  type DealShopFlowState,
} from "@/lib/deals/shop-flow";
import { isShopLine } from "@/lib/domain";

/** Drop bind-recheck Saves so Bind is gated again after terms / risk change. */
export async function clearBindRecheckAcks(dealId: string, quoteIds?: string[]) {
  if (!dealId) return;
  const scoped =
    quoteIds && quoteIds.length > 0
      ? and(
          eq(quotes.tenantId, DEFAULT_TENANT_ID),
          eq(quotes.dealId, dealId),
          inArray(quotes.id, quoteIds),
        )
      : and(eq(quotes.tenantId, DEFAULT_TENANT_ID), eq(quotes.dealId, dealId));
  await db.update(quotes).set(BIND_RECHECK_CLEAR_PATCH).where(scoped);
}

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
    .set({ shopFlow: parseShopFlow(shopFlow), updatedAt: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.tenantId, DEFAULT_TENANT_ID)));
}

async function clearLineQuotingUnlock(dealId: string, line?: string | null) {
  const now = new Date();
  if (line) {
    await db
      .update(quoteSheets)
      .set({ quotingUnlocked: false, approvedAt: null, approvedBy: null, updatedAt: now })
      .where(
        and(
          eq(quoteSheets.tenantId, DEFAULT_TENANT_ID),
          eq(quoteSheets.dealId, dealId),
          eq(quoteSheets.line, line),
        ),
      );
  } else {
    await db
      .update(quoteSheets)
      .set({ quotingUnlocked: false, approvedAt: null, approvedBy: null, updatedAt: now })
      .where(and(eq(quoteSheets.tenantId, DEFAULT_TENANT_ID), eq(quoteSheets.dealId, dealId)));
  }
  const remaining = await db
    .select({ quotingUnlocked: quoteSheets.quotingUnlocked })
    .from(quoteSheets)
    .where(and(eq(quoteSheets.tenantId, DEFAULT_TENANT_ID), eq(quoteSheets.dealId, dealId)));
  const anyUnlocked = remaining.some((row) => row.quotingUnlocked);
  await db
    .update(deals)
    .set({
      quotingUnlocked: anyUnlocked,
      ...(anyUnlocked ? {} : { sheetApprovedAt: null, sheetApprovedBy: null }),
      updatedAt: now,
    })
    .where(and(eq(deals.id, dealId), eq(deals.tenantId, DEFAULT_TENANT_ID)));
}

async function quoteIdsOnLine(dealId: string, line: string): Promise<string[]> {
  const rows = await db
    .select({
      id: quotes.id,
      shopLine: quotes.shopLine,
      quoteAttemptLogId: quotes.quoteAttemptLogId,
      notes: quotes.notes,
    })
    .from(quotes)
    .where(and(eq(quotes.tenantId, DEFAULT_TENANT_ID), eq(quotes.dealId, dealId)));
  if (!isShopLine(line)) return rows.map((row) => row.id);
  const logs = await db
    .select({ id: quoteAttemptLogs.id, lineOfBusiness: quoteAttemptLogs.lineOfBusiness })
    .from(quoteAttemptLogs)
    .where(and(eq(quoteAttemptLogs.tenantId, DEFAULT_TENANT_ID), eq(quoteAttemptLogs.dealId, dealId)));
  return rows
    .filter((row) =>
      quoteMatchesShopLine(
        {
          shopLine: row.shopLine,
          quoteAttemptLogId: row.quoteAttemptLogId,
          notes: row.notes,
          logs,
        },
        line,
        { multiLine: true },
      ),
    )
    .map((row) => row.id);
}

async function logSheetInvalidation(dealId: string, line?: string | null) {
  await writeCrmSignalsSafe({
    kind: "sheet_invalidated",
    title: line
      ? `Master sheet saved · ${line} — Markets + Quotes need a re-run`
      : "Master sheet saved — Markets + Quotes need a re-run",
    body: line
      ? `Sheet change on ${line} cleared approve and request-quotes for that line. Re-approve before shopping.`
      : "Sheet change cleared approve and request-quotes. Re-approve before shopping.",
    entityType: "deal",
    entityId: dealId,
    dealId,
    createTask: false,
    severity: "info",
  });
}

/** Sheet save/fill: keep Markets complete; cue Quotes to Recheck. */
export async function persistSheetRecheckCue(dealId: string, line: string) {
  if (!dealId || !line) return;
  const [deal] = await db
    .select({ shopFlow: deals.shopFlow })
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.tenantId, DEFAULT_TENANT_ID)));
  if (!deal) return;
  await persistDealShopFlow(dealId, nextShopFlowAfterSheetEdit({ saved: deal.shopFlow, line }));
}

/** After a material sheet / source-doc change: Markets + Quotes must be re-run. */
export async function markShopFlowStaleAfterRiskChange(dealId: string, line?: string | null) {
  if (!dealId) return;
  const [deal] = await db
    .select({ shopFlow: deals.shopFlow })
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.tenantId, DEFAULT_TENANT_ID)));
  if (!deal) return;
  const saved = parseShopFlow(deal.shopFlow);
  const scopedLine = line && isShopLine(line) ? line : null;
  const alreadyTracking =
    saved.marketsFingerprint != null ||
    saved.quotesFingerprint != null ||
    Object.keys(saved.lineFingerprints ?? {}).length > 0;

  const applyStale = async () => {
    const next = scopedLine ? staleShopFlowForLine(saved, scopedLine) : staleShopFlow(saved);
    await persistDealShopFlow(dealId, next);
    if (scopedLine) {
      const ids = await quoteIdsOnLine(dealId, scopedLine);
      await clearBindRecheckAcks(dealId, ids.length ? ids : undefined);
    } else {
      await clearBindRecheckAcks(dealId);
    }
    await clearLineQuotingUnlock(dealId, scopedLine);
    await logSheetInvalidation(dealId, scopedLine);
  };

  if (alreadyTracking) {
    const lineFp = scopedLine ? saved.lineFingerprints?.[scopedLine] : null;
    const alreadyStale = scopedLine
      ? lineFp?.markets === "" && lineFp?.quotes === ""
      : saved.marketsFingerprint === "" && saved.quotesFingerprint === "";
    if (alreadyStale) {
      await clearLineQuotingUnlock(dealId, scopedLine);
      return;
    }
    await applyStale();
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
  await applyStale();
}
