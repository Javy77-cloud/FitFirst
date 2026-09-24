"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { matchCarrier, rankFits, riskFromRecord } from "@/lib/appetite/match";
import { toAppetiteInput } from "@/lib/appetite/rule-input";
import { portalFor } from "@/lib/appetite/portals";
import { captureQuoteBotLoginFailure, loadCarrierLoginEvents } from "@/lib/carrier-login-issues/persist";
import {
  carrierLoginBlockEnabled,
  isCarrierLoginBlocked,
  rollupCarrierLoginIssues,
} from "@/lib/carrier-login-issues/store";
import {
  captureAutoGapsFromAttemptWhy,
  recordPortalObservedQuestions,
} from "@/lib/quote-bot/auto-question-gaps";
import { appointmentLine, DEFAULT_TENANT_ID, writesDealLine, type PriorAttempt } from "@/lib/domain";
import { resolveShopLineAndLob } from "@/lib/deals/package-lines";
import {
  MANUAL_QUOTE_NOTE,
  manualQuoteTarget,
  manualQuoteWrite,
  marketCarriersForManualQuote,
  parseManualQuotePremium,
} from "@/lib/deals/manual-quote";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { appointedByCarrierLine } from "@/lib/db/queries";
import {
  appetiteRules,
  carriers,
  deals,
  pipelines,
  quoteAttemptLogs,
  quoteNotes,
  quoteSheets,
  quotes,
  risks,
} from "@/lib/db/schema";
import { autoSnapshotFieldsForDeal } from "@/lib/appetite/auto-premium-capture";
import { lineLearningSnapshotFieldsForDeal } from "@/lib/appetite/line-learning-capture";
import { currentDeskSession } from "@/lib/auth/session";
import {
  isAgentStatus,
  isReasonForNo,
  pipelineSlugForAgentStatus,
  type AgentStatus,
  type ReasonForNo,
} from "@/lib/quotes/outcomes";
import { moveDealToStage } from "@/app/actions/pipeline";
import { applySavedSheetToDeal } from "@/app/actions/quote-sheet";
import { attachFinalizedQuotePdfs } from "@/lib/lifecycle/hooks";
import { isMatchPriorResult, quotingUnlockedForLine } from "@/lib/quoting/forms";
import {
  EXPLICIT_MARKET_ACTION_MARKER,
  MANUAL_MARKET_MARKER,
  excludedCarrierIdsFromLogs,
  manualCarrierIdsFromLogs,
  shopListCarrierIdsFromLogs,
} from "@/lib/deals/manual-markets";
import { forceDealWorkTab, persistDealWorkTab } from "@/lib/deals/work-tab";
import {
  clearBindRecheckAcks,
  clearSheetInvalidatedAfterShop,
  loadLineRiskFingerprint,
  persistDealShopFlow,
} from "@/lib/deals/shop-flow-persist";
import { maybeArchiveDealWhenAllProductsTerminal } from "@/lib/deals/archive-when-terminal";
import {
  nextShopFlowAfterQuoteRun,
  parseShopFlow,
  quoteMatchesShopLine,
  quoteRunIdAfterRequest,
} from "@/lib/deals/shop-flow";
import { dealFamilyFromHints, isLifeHealthShopLine, parseDealProduct } from "@/lib/deals/deal-products";
import {
  lifeHealthQuoteCarriers,
  parseLifeHealthFaceAmount,
  parseLifeHealthPremium,
  parseLifeHealthQuoteOutcome,
} from "@/lib/life/quote-writer";
import { syncQuoteOutcomes } from "@/lib/quotes/outcomes";
import { parseProductStages, setProductStage } from "@/lib/deals/product-stages";
import { autoAdvanceDealProductStage } from "@/app/actions/product-stage";
import { flashAction } from "@/lib/flash-action";
import { quotesRequestedHref } from "@/lib/flash";
import { isRedirectError } from "@/lib/lifecycle/shop";
import {
  BIND_RECHECK_CLEAR_PATCH,
  bindGateReady,
  bindRecheckTermsFingerprint,
  bindRecheckTermsFromQuote,
  type BindGateChecks,
} from "@/lib/deals/bind-gate";
import { snapshotFromRisk } from "@/lib/appetite/gate/snapshot";
import { runAndPersistQuoteGate } from "@/lib/appetite/gate/store";

export async function shopInAppetiteAction(formData: FormData) {
  await shopInAppetite(String(formData.get("dealId") ?? ""));
}

function selectedCarrierIdsFromForm(formData: FormData): string[] {
  return formData
    .getAll("carrierId")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

async function finishRequestQuotes(
  dealId: string,
  extras: { line?: string; product?: string },
) {
  // Force Quotes the same way RP Confirm forces Markets — never leave Markets after request.
  await forceDealWorkTab(dealId, "quotes").catch(() => null);
  flashAction(quotesRequestedHref(dealId, extras), "quotes-requested");
}

export async function requestAppetiteQuotesAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "");
  const selectedIds = selectedCarrierIdsFromForm(formData);
  const line = String(formData.get("line") ?? "").trim();
  const product = String(formData.get("product") ?? "").trim();
  try {
    await shopDealQuotes(dealId, "appetite", selectedIds.length ? selectedIds : undefined, line || undefined);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("requestAppetiteQuotesAction failed", error);
  }
  await finishRequestQuotes(dealId, { line, product });
}

export async function requestStretchQuotesAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "");
  const selectedIds = selectedCarrierIdsFromForm(formData);
  const line = String(formData.get("line") ?? "").trim();
  const product = String(formData.get("product") ?? "").trim();
  try {
    await shopDealQuotes(dealId, "stretch", selectedIds.length ? selectedIds : undefined, line || undefined);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("requestStretchQuotesAction failed", error);
  }
  await finishRequestQuotes(dealId, { line, product });
}

export async function shopInAppetite(dealId: string) {
  return shopDealQuotes(dealId, "appetite");
}

async function persistShopFlowAfterQuoteRequest(
  dealId: string,
  line: ReturnType<typeof resolveShopLineAndLob>["line"],
  opts: {
    logs: { id: string; lineOfBusiness?: string | null }[];
    requestCarrierIds?: string[];
  },
) {
  const fingerprint = await loadLineRiskFingerprint(dealId, line);
  const [deal] = await db.select({ shopFlow: deals.shopFlow }).from(deals).where(eq(deals.id, dealId));
  const saved = parseShopFlow(deal?.shopFlow);
  const existing = await db.select().from(quotes).where(eq(quotes.dealId, dealId));
  const onLine = existing.filter((quote) =>
    quoteMatchesShopLine(
      {
        shopLine: quote.shopLine,
        quoteAttemptLogId: quote.quoteAttemptLogId,
        notes: quote.notes,
        logs: opts.logs,
      },
      line,
      { multiLine: true },
    ),
  );
  const currentRun = saved.quoteRuns?.[line] ?? null;
  const runId =
    quoteRunIdAfterRequest({
      savedRunId: currentRun,
      existingRunIds: onLine.map((quote) => quote.quoteRunId),
    }) || randomUUID();

  // Do not archive or restamp live premiums. Request-quotes writes logs +
  // fingerprints only — Fill/portal create new rows later. Overwriting
  // shopLine hid Heather Auto/Flood; a new empty run hid Gloria HO3/DP3.
  const missingRun = onLine.filter((quote) => !quote.quoteRunId);
  if (missingRun.length) {
    await db
      .update(quotes)
      .set({ quoteRunId: runId })
      .where(inArray(quotes.id, missingRun.map((quote) => quote.id)));
  }
  const missingLine = onLine.filter((quote) => !quote.shopLine);
  if (missingLine.length) {
    await db
      .update(quotes)
      .set({ shopLine: line })
      .where(inArray(quotes.id, missingLine.map((quote) => quote.id)));
  }

  await persistDealShopFlow(
    dealId,
    nextShopFlowAfterQuoteRun({
      saved,
      line,
      fingerprint,
      newRunId: runId,
      requestCarrierIds: opts.requestCarrierIds,
    }),
  );
  await clearSheetInvalidatedAfterShop(dealId, line).catch(() => undefined);
  await autoAdvanceDealProductStage({
    dealId,
    stageSlug: "quote_review",
    line,
  }).catch(() => null);
}

async function archiveLineQuotesForNewRun(input: {
  dealId: string;
  line: ReturnType<typeof resolveShopLineAndLob>["line"];
  logs: { id: string; lineOfBusiness?: string | null }[];
  requestCarrierIds?: string[];
}) {
  await persistShopFlowAfterQuoteRequest(input.dealId, input.line, {
    logs: input.logs,
    requestCarrierIds: input.requestCarrierIds,
  });
}

export async function shopDealQuotes(
  dealId: string,
  pass: "appetite" | "stretch",
  selectedCarrierIds?: string[],
  shopLineOrLob?: string,
) {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  const resolved = resolveShopLineAndLob({
    override: shopLineOrLob,
    quotingLine: deal?.quotingLine,
    lineOfBusiness: deal?.lineOfBusiness,
  });
  if (deal) {
    await applySavedSheetToDeal(dealId, resolved.line);
  }
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!deal || !risk) throw new Error("Deal or master risk is missing");
  const [lineSheet] = await db
    .select({ quotingUnlocked: quoteSheets.quotingUnlocked, approvedAt: quoteSheets.approvedAt })
    .from(quoteSheets)
    .where(
      and(
        eq(quoteSheets.tenantId, DEFAULT_TENANT_ID),
        eq(quoteSheets.dealId, dealId),
        eq(quoteSheets.line, resolved.line),
      ),
    );
  if (!quotingUnlockedForLine({ deal, sheet: lineSheet })) {
    throw new Error("Approve the Risk Profile before shopping markets.");
  }

  const rules = await db
    .select({ rule: appetiteRules, carrier: carriers })
    .from(appetiteRules)
    .innerJoin(carriers, eq(appetiteRules.carrierId, carriers.id))
    .where(eq(appetiteRules.tenantId, DEFAULT_TENANT_ID));

  const logs = await db
    .select()
    .from(quoteAttemptLogs)
    .where(eq(quoteAttemptLogs.tenantId, DEFAULT_TENANT_ID));

  const snapshot = riskFromRecord(risk);
  const named = await db.select({ id: carriers.id, name: carriers.name }).from(carriers);
  const nameById = new Map(named.map((row) => [row.id, row.name]));
  const gateFilter = await runAndPersistQuoteGate({
    snapshot: snapshotFromRisk({
      risk,
      deal,
      admittedDeclinedCount: logs.filter(
        (log) => log.dealId === dealId && log.result === "declined" && !log.bindable,
      ).length,
    }),
    uuidToName: nameById,
  }).catch((err) => {
    console.error("appetite quote-gate failed", err);
    return null;
  });
  const skipGateIds = new Set(gateFilter?.skipLinkedCarrierIds ?? []);
  const appointedMap = await appointedByCarrierLine();
  const prior: PriorAttempt[] = logs
    .filter((log) => isMatchPriorResult(log.result))
    .map((log) => ({
      carrierId: log.carrierId,
      result: log.result as PriorAttempt["result"],
      why: log.why,
      bindable: log.bindable,
      snapYearBuilt: log.snapYearBuilt,
      snapRoofYear: log.snapRoofYear,
      snapRoofCovering: log.snapRoofCovering,
      snapConstruction: log.snapConstruction,
      snapCounty: log.snapCounty,
      snapMilesToCoast: log.snapMilesToCoast,
      snapCoverageA: log.snapCoverageA,
    }));

  const lineRules = rules.filter(({ carrier }) =>
    writesDealLine(carrier.writtenLines ?? [], resolved.lob),
  );
  const matches = rankFits(
    lineRules.map(({ rule, carrier }) => {
      const line = appointmentLine(rule.lineOfBusiness);
      const key = `${carrier.id}:${line}`;
      const appointed = appointedMap.has(key) ? appointedMap.get(key)! : null;
      return matchCarrier(snapshot, toAppetiteInput(carrier, rule, appointed), prior, undefined, resolved.lob);
    }),
  );

  const dealLogs = logs.filter((log) => log.dealId === dealId);
  const manualIds = new Set(manualCarrierIdsFromLogs(dealLogs));
  const shopListIds = new Set(shopListCarrierIdsFromLogs(dealLogs));
  const excludedIds = new Set(excludedCarrierIdsFromLogs(dealLogs));
  const byId = new Map(matches.map((match) => [match.carrierId, match]));

  const shopIds = new Set<string>();
  if (pass === "appetite") {
    for (const match of matches.filter((row) => row.band === "green")) shopIds.add(match.carrierId);
    for (const id of manualIds) {
      if (shopListIds.has(id)) {
        const listed = byId.get(id);
        if (listed && listed.band !== "green") continue;
      }
      shopIds.add(id);
    }
    await archiveLineQuotesForNewRun({
      dealId,
      line: resolved.line,
      logs: dealLogs,
      requestCarrierIds: selectedCarrierIds,
    });
  } else {
    const existing = await db.select().from(quotes).where(eq(quotes.dealId, dealId));
    const already = new Set(existing.map((row) => row.carrierId));
    for (const match of matches.filter((row) => row.band === "yellow")) {
      if (!already.has(match.carrierId)) shopIds.add(match.carrierId);
    }
  }

  if (selectedCarrierIds?.length) {
    const allow = new Set(selectedCarrierIds);
    for (const id of [...shopIds]) {
      if (!allow.has(id)) shopIds.delete(id);
    }
  }

  // Live desk: do not invent stub premiums. Real quotes come from Chrome Fill / portal paste.
  // Quote-gate Skip-Decline: do not open a portal for that carrier.
  // TODO: FF_BLOCK_CARRIER_LOGIN_ISSUES defaults OFF. Do not skip production markets
  // for login issues until that flag is explicitly set to 1.
  const loginRollup = carrierLoginBlockEnabled()
    ? rollupCarrierLoginIssues(await loadCarrierLoginEvents())
    : [];
  for (const carrierId of [...shopIds].filter((id) => !excludedIds.has(id) && !skipGateIds.has(id))) {
    const match = byId.get(carrierId);
    const carrierName = match?.carrierName ?? nameById.get(carrierId) ?? "Carrier";
    const loginBlocked = isCarrierLoginBlocked({ id: carrierId, name: carrierName }, loginRollup);
    const portal = portalFor(carrierId, carrierName);
    const portalResult = loginBlocked
      ? null
      : await portal.submitQuote({
          carrierId,
          dealId,
          riskId: risk.id,
        });
    if (portalResult?.observedQuestions?.length) {
      try {
        recordPortalObservedQuestions({
          shopLine: resolved.line,
          lineOfBusiness: resolved.lob,
          carrierId,
          carrierName,
          dealId,
          questions: portalResult.observedQuestions,
          source: "shopDealQuotes",
        });
      } catch (error) {
        console.error("auto question gap capture failed", error);
      }
    }
    if (portalResult) {
      await captureQuoteBotLoginFailure({
        carrierName,
        carrierId,
        errorMessage: portalResult.message,
        result: portalResult.status,
        lob: resolved.lob || deal.lineOfBusiness || "HO",
        dealId,
        source: "quote-bot.portal.submitQuote",
      });
    }
    const manual = manualIds.has(carrierId);
    const shopLob = resolved.lob || deal.lineOfBusiness || "HO";
    const shopAutoSnap = await autoSnapshotFieldsForDeal(dealId, shopLob);
    const portalWhy = loginBlocked
      ? "TODO FF_BLOCK_CARRIER_LOGIN_ISSUES=1 — skipped portal. Recurring login failure is on the carrier login list. Flag default is off."
      : portalResult?.message ?? "";
    await db.insert(quoteAttemptLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      riskId: risk.id,
      carrierId,
      lineOfBusiness: shopLob,
      result: "maybe",
      bindable: false,
      why: `${EXPLICIT_MARKET_ACTION_MARKER} ${pass} shop · ${portalWhy}${manual ? ` ${MANUAL_MARKET_MARKER}` : ""} · no stub premium (Fill/portal for real quote). Fit ${match?.fitScore ?? "—"}.`,
      snapYearBuilt: risk.yearBuilt,
      snapRoofYear: risk.roofYear,
      snapRoofCovering: risk.roofCovering,
      snapConstruction: risk.construction,
      snapCounty: risk.county,
      snapMilesToCoast: risk.milesToCoast,
      snapCoverageA: risk.coverageA,
      ...shopAutoSnap,
    });
  }

  if (pass === "stretch") {
    await persistShopFlowAfterQuoteRequest(dealId, resolved.line, {
      logs: dealLogs,
    });
  }

  try {
    await attachFinalizedQuotePdfs(dealId);
  } catch (error) {
    console.error("attachFinalizedQuotePdfs failed after request quotes", error);
  }

  revalidatePath(`/deals/${dealId}`);
  return matches;
}

export async function recordManualAttempt(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "");
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!risk) throw new Error("Master risk missing");

  const manualLob = String(formData.get("line") ?? "HO");
  const manualCarrierId = String(formData.get("carrierId") ?? "");
  const manualResult = String(formData.get("result") ?? "declined");
  const manualWhy = String(formData.get("why") ?? "") || null;
  const manualAutoSnap = await autoSnapshotFieldsForDeal(dealId, manualLob);
  const manualLineSnap = await lineLearningSnapshotFieldsForDeal(dealId, manualLob);
  await db.insert(quoteAttemptLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId,
    riskId: risk.id,
    carrierId: manualCarrierId,
    lineOfBusiness: manualLob,
    result: manualResult,
    bindable: formData.get("bindable") === "true",
    quoteNumber: String(formData.get("quoteNumber") ?? "") || null,
    premium: String(formData.get("premium") ?? "") || null,
    covATried: risk.coverageA,
    why: manualWhy,
    lostReason:
      String(formData.get("result") ?? "declined") === "declined"
        ? String(formData.get("lostReason") ?? "").trim() || null
        : null,
    snapYearBuilt: risk.yearBuilt,
    snapRoofYear: risk.roofYear,
    snapRoofCovering: risk.roofCovering,
    snapConstruction: risk.construction,
    snapOpeningProtection: risk.openingProtection,
    snapOccupancy: risk.occupancy,
    snapStories: risk.stories,
    snapPool: risk.pool,
    snapProtectionClass: risk.protectionClass,
    snapMilesToCoast: risk.milesToCoast,
    snapCity: risk.city,
    snapCounty: risk.county,
    snapCoverageA: risk.coverageA,
    ...manualAutoSnap,
    ...manualLineSnap,
  });

  const [manualCarrier] = manualCarrierId
    ? await db
        .select({ name: carriers.name })
        .from(carriers)
        .where(eq(carriers.id, manualCarrierId))
        .limit(1)
    : [];
  try {
    captureAutoGapsFromAttemptWhy({
      why: String(formData.get("why") ?? ""),
      lineOfBusiness: manualLob,
      carrierId: manualCarrierId,
      carrierName: manualCarrier?.name ?? "Carrier",
      dealId,
      source: "recordManualAttempt",
    });
  } catch (error) {
    console.error("auto question gap capture failed", error);
  }
  await captureQuoteBotLoginFailure({
    carrierName: manualCarrier?.name || "Carrier",
    carrierId: manualCarrierId,
    errorMessage: manualWhy || manualResult,
    result: manualResult,
    lob: manualLob,
    dealId,
    source: "quote-bot.recordManualAttempt",
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/carriers/logs");
  revalidatePath("/logs");
}

/**
 * Record a carrier premium already chosen on Markets.
 * Request Quotes only writes attempt logs, so the Quotes tab stays at 0 rows
 * until a quotes row exists. This inserts that row without a portal pull.
 * Insert or fill the matching carrier line only. Never deletes a deal, quote,
 * contact, or any other row.
 */
export async function recordManualQuoteAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const carrierId = String(formData.get("carrierId") ?? "").trim();
  const shopLineRaw = String(formData.get("shopLine") ?? "").trim();
  const productRaw = String(formData.get("product") ?? "").trim();
  if (!isUuid(dealId) || !isUuid(carrierId)) {
    throw new Error("Pick a carrier already on Markets.");
  }
  const premium = parseManualQuotePremium(String(formData.get("premium") ?? ""));
  if (!premium) throw new Error("Enter a premium greater than 0.");

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!deal || !risk) throw new Error("Deal or master risk is missing.");
  const [carrier] = await db
    .select()
    .from(carriers)
    .where(and(eq(carriers.id, carrierId), eq(carriers.tenantId, DEFAULT_TENANT_ID)));
  if (!carrier) throw new Error("Carrier not found.");

  const resolved = resolveShopLineAndLob({
    override: shopLineRaw,
    quotingLine: deal.quotingLine,
    lineOfBusiness: deal.lineOfBusiness,
  });
  const dealLogs = await db
    .select()
    .from(quoteAttemptLogs)
    .where(
      and(eq(quoteAttemptLogs.dealId, dealId), eq(quoteAttemptLogs.tenantId, DEFAULT_TENANT_ID)),
    );
  const allowed = marketCarriersForManualQuote(
    dealLogs.map((log) => ({
      carrierId: log.carrierId,
      why: log.why,
      lineOfBusiness: log.lineOfBusiness,
      carrierName: log.carrierId === carrierId ? carrier.name : "Carrier",
    })),
    resolved.line,
  );
  if (!allowed.some((row) => row.id === carrierId)) {
    throw new Error("That carrier is not on Markets for this line. Add it on Markets first.");
  }

  const saved = parseShopFlow(deal.shopFlow);
  const quoteRunId = saved.quoteRuns?.[resolved.line]?.trim() || randomUUID();
  const synced = syncQuoteOutcomes({ riskOutcome: "bindable" });
  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      riskId: risk.id,
      carrierId,
      lineOfBusiness: resolved.lob,
      result: "quoted",
      bindable: true,
      premium,
      why: MANUAL_QUOTE_NOTE,
      covATried: risk.coverageA,
    })
    .returning();
  if (!log) throw new Error("Could not save the quote.");

  const existing = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.dealId, dealId),
        eq(quotes.carrierId, carrierId),
        eq(quotes.tenantId, DEFAULT_TENANT_ID),
      ),
    );
  const target = manualQuoteTarget(existing, resolved.line);
  const quoteWrite = manualQuoteWrite({
    existing: target,
    premium,
    shopLine: resolved.line,
    quoteRunId,
    attemptLogId: log.id,
    riskOutcome: synced.riskOutcome,
    nextStep: synced.nextStep,
    bindable: synced.bindable,
  });
  let quoteId = target?.id ?? null;
  if (target) {
    await db
      .update(quotes)
      .set(quoteWrite)
      .where(
        and(
          eq(quotes.id, target.id),
          eq(quotes.dealId, dealId),
          eq(quotes.carrierId, carrierId),
        ),
      );
  } else {
    const [created] = await db
      .insert(quotes)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        dealId,
        riskId: risk.id,
        carrierId,
        agentStatus: "new",
        ...quoteWrite,
      })
      .returning({ id: quotes.id });
    quoteId = created?.id ?? null;
  }
  if (!quoteId) throw new Error("Could not save the quote.");

  const product = parseDealProduct(productRaw);
  const stages = parseProductStages(saved.productStages);
  const selected = new Set(
    product ? (stages[product]?.selectedQuoteIds ?? []).filter(Boolean) : [],
  );
  if (product) selected.add(quoteId);
  const productStages = product
    ? setProductStage(stages, product, { selectedQuoteIds: [...selected] })
    : saved.productStages;
  await persistDealShopFlow(dealId, {
    ...saved,
    quoteRuns: { ...saved.quoteRuns, [resolved.line]: quoteRunId },
    productStages,
  });
  if (product) {
    await autoAdvanceDealProductStage({
      dealId,
      stageSlug: "quote_review",
      line: resolved.line,
      product,
    }).catch(() => null);
  }
  await persistDealWorkTab(dealId, "quotes").catch(() => null);
  revalidatePath(`/deals/${dealId}`);
  flashAction(
    quotesRequestedHref(dealId, { line: resolved.line, product: product ?? productRaw }),
    "manual-quote-recorded",
  );
}

export async function deleteSelectedQuotesAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const ids = formData
    .getAll("quoteId")
    .map((value) => String(value).trim())
    .filter(Boolean);
  if (!dealId) throw new Error("Deal is missing.");
  if (ids.length === 0) throw new Error("Select at least one quote to delete.");

  await db
    .delete(quotes)
    .where(and(eq(quotes.dealId, dealId), inArray(quotes.id, ids), eq(quotes.tenantId, DEFAULT_TENANT_ID)));

  revalidatePath(`/deals/${dealId}`);
  flashAction(
    `/deals/${dealId}?tab=quotes`,
    ids.length === 1 ? "Quote deleted" : `${ids.length} quotes deleted`,
  );
}

function dealQuotesPath(dealId: string) {
  return `/deals/${dealId}?tab=quotes`;
}

async function requireQuoteForDeal(dealId: string, quoteId: string) {
  const [row] = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.id, quoteId),
        eq(quotes.dealId, dealId),
        eq(quotes.tenantId, DEFAULT_TENANT_ID),
      ),
    );
  if (!row) throw new Error("Quote not found on this deal.");
  return row;
}

export async function saveQuoteAgentRatingAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  const raw = String(formData.get("rating") ?? "").trim();
  if (!dealId || !quoteId) throw new Error("Deal and quote are required.");
  let agentRating: number | null = null;
  if (raw === "" || raw === "0" || raw.toLowerCase() === "clear") {
    agentRating = null;
  } else {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error("Rating must be 1–5.");
    agentRating = n;
  }
  await requireQuoteForDeal(dealId, quoteId);
  await db
    .update(quotes)
    .set({ agentRating })
    .where(and(eq(quotes.id, quoteId), eq(quotes.dealId, dealId)));
  revalidatePath(`/deals/${dealId}`);
  flashAction(dealQuotesPath(dealId), agentRating == null ? "Rating cleared" : `Rated ${agentRating}★`);
}


async function syncDealPipelineFromQuoteStatus(
  dealId: string,
  agentStatus: AgentStatus,
  quoteId?: string,
) {
  const stageSlug = pipelineSlugForAgentStatus(agentStatus);
  if (!stageSlug) return;
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) return;
  const quoteRow = quoteId
    ? await db
        .select({ notes: quotes.notes, shopLine: quotes.shopLine })
        .from(quotes)
        .where(and(eq(quotes.id, quoteId), eq(quotes.dealId, dealId)))
        .then((rows) => rows[0] ?? null)
    : null;
  const product =
    parseDealProduct(quoteRow?.shopLine ?? "") ||
    parseDealProduct(quoteRow?.notes ?? "") ||
    parseDealProduct(
      String(
        (deal as { shopProducts?: string[] | null }).shopProducts?.[0] ??
          deal.quotingForm ??
          deal.quotingLine ??
          "",
      ),
    );
  if (product && quoteId) {
    const saved = parseShopFlow(deal.shopFlow);
    const stages = parseProductStages(saved.productStages);
    const current = stages[product];
    const selected = new Set(current?.selectedQuoteIds ?? []);
    selected.add(quoteId);
    await persistDealShopFlow(dealId, {
      ...saved,
      productStages: setProductStage(stages, product, {
        stage: stageSlug,
        selectedQuoteIds: [...selected],
        ...(agentStatus === "waiting_on_inspection"
          ? { inspectionStatus: "inspection_before_bind" as const, noticeType: "inspection_before_bind" as const }
          : {}),
      }),
    });
    const multi = Array.isArray((deal as { shopProducts?: string[] | null }).shopProducts)
      ? ((deal as { shopProducts: string[] }).shopProducts.length > 1)
      : Array.isArray(deal.shopLines) && deal.shopLines.length > 1;
    if (multi) {
      await maybeArchiveDealWhenAllProductsTerminal(dealId);
      return;
    }
  }
  let pipelineSlug = "p-c";
  if (deal.pipelineId) {
    const [board] = await db
      .select()
      .from(pipelines)
      .where(and(eq(pipelines.tenantId, DEFAULT_TENANT_ID), eq(pipelines.id, deal.pipelineId)));
    if (board?.slug) pipelineSlug = board.slug;
  }
  await moveDealToStage({ dealId, pipelineSlug, stageSlug, allowLate: true });
  await maybeArchiveDealWhenAllProductsTerminal(dealId);
}

export async function saveQuoteAgentStatusAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  const statusRaw = String(formData.get("agentStatus") ?? "").trim();
  const reasonRaw = String(formData.get("reasonForNo") ?? "").trim();
  if (!dealId || !quoteId) throw new Error("Deal and quote are required.");
  if (!isAgentStatus(statusRaw)) throw new Error("Invalid quote status.");
  const agentStatus: AgentStatus = statusRaw;
  let reasonForNo: ReasonForNo | null = null;
  if (agentStatus === "dead") {
    if (!isReasonForNo(reasonRaw)) {
      throw new Error("Pick a reason-for-no when marking a quote dead.");
    }
    reasonForNo = reasonRaw;
  }
  const existing = await requireQuoteForDeal(dealId, quoteId);
  await db
    .update(quotes)
    .set({
      agentStatus,
      reasonForNo: agentStatus === "dead" ? reasonForNo : null,
    })
    .where(and(eq(quotes.id, quoteId), eq(quotes.dealId, dealId)));

  await syncDealPipelineFromQuoteStatus(dealId, agentStatus, quoteId);

  if (agentStatus === "dead" && reasonForNo) {
    await db.insert(quoteAttemptLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      riskId: existing.riskId,
      carrierId: existing.carrierId,
      lineOfBusiness: "HO",
      result: "declined",
      bindable: false,
      why: `Agent marked dead · reason_for_no=${reasonForNo}`,
      lostReason: reasonForNo,
      quoteNumber: existing.quoteNumber,
      premium: existing.premium,
    });
  }

  revalidatePath(`/deals/${dealId}`);
  flashAction(
    dealQuotesPath(dealId),
    agentStatus === "dead" ? "Quote marked dead" : "Quote status saved",
  );
}

export async function saveQuoteReasonForNoAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  const reasonRaw = String(formData.get("reasonForNo") ?? "").trim();
  if (!dealId || !quoteId) throw new Error("Deal and quote are required.");
  if (!isReasonForNo(reasonRaw)) throw new Error("Invalid reason-for-no.");
  const existing = await requireQuoteForDeal(dealId, quoteId);
  await db
    .update(quotes)
    .set({ agentStatus: "dead", reasonForNo: reasonRaw })
    .where(and(eq(quotes.id, quoteId), eq(quotes.dealId, dealId)));
  await syncDealPipelineFromQuoteStatus(dealId, "dead", quoteId);
  await db.insert(quoteAttemptLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId,
    riskId: existing.riskId,
    carrierId: existing.carrierId,
    lineOfBusiness: "HO",
    result: "declined",
    bindable: false,
    why: `Agent reason_for_no=${reasonRaw}`,
    lostReason: reasonRaw,
    quoteNumber: existing.quoteNumber,
    premium: existing.premium,
  });
  revalidatePath(`/deals/${dealId}`);
  flashAction(dealQuotesPath(dealId), "Reason for no saved");
}

export async function addQuoteNoteAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!dealId || !quoteId) throw new Error("Deal and quote are required.");
  if (!body) throw new Error("Note cannot be empty.");
  if (body.length > 4000) throw new Error("Note is too long.");
  await requireQuoteForDeal(dealId, quoteId);
  const session = await currentDeskSession();
  await db.insert(quoteNotes).values({
    tenantId: DEFAULT_TENANT_ID,
    quoteId,
    body,
    createdBy: session.name?.trim() || session.email || "agent",
  });
  revalidatePath(`/deals/${dealId}`);
  flashAction(dealQuotesPath(dealId), "Note added");
}

/** Insert recheck-queued notes for matching quote ids. Returns queued row count. */
async function queueRecheckNotesForQuotes(dealId: string, ids: string[]) {
  const rows = await db
    .select({ quote: quotes, carrier: carriers })
    .from(quotes)
    .innerJoin(carriers, eq(quotes.carrierId, carriers.id))
    .where(
      and(
        eq(quotes.dealId, dealId),
        inArray(quotes.id, ids),
        eq(quotes.tenantId, DEFAULT_TENANT_ID),
      ),
    );

  if (rows.length === 0) throw new Error("No matching quotes to re-quote.");

  const session = await currentDeskSession();
  const createdBy = session.name?.trim() || session.email || "agent";
  for (const row of rows) {
    await db.insert(quoteNotes).values({
      tenantId: DEFAULT_TENANT_ID,
      quoteId: row.quote.id,
      body: `Re-quote queued for ${row.carrier.name}.`,
      createdBy,
    });
  }
  return { count: rows.length, createdBy };
}

/** Queue a recheck for specifically marked quotes (no portal automation yet). */
export async function recheckQuotesAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const ids = formData
    .getAll("quoteId")
    .map((value) => String(value).trim())
    .filter(Boolean);
  if (!dealId) throw new Error("Deal is missing.");
  if (ids.length === 0) throw new Error("Select at least one quote to re-quote.");

  const { count: n } = await queueRecheckNotesForQuotes(dealId, ids);
  await clearBindRecheckAcks(dealId, ids);

  revalidatePath(`/deals/${dealId}`);
  flashAction(
    dealQuotesPath(dealId),
    n === 1 ? "Re-quote queued for 1 carrier" : `Re-quote queued for ${n} carriers`,
  );
}

/**
 * Accept carrier min Cov A for this quote only, then queue recheck (Re-quote).
 * Does not change deal.coverageAmount — only quote.coverageA.
 */
export async function acceptQuoteFloorAndRecheckAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  const rawFloor = String(formData.get("acceptedCoverageA") ?? "").trim().replaceAll(",", "");
  const acceptedCoverageA = Number(rawFloor);
  if (!dealId || !quoteId) throw new Error("Deal and quote are required.");
  if (!Number.isFinite(acceptedCoverageA) || acceptedCoverageA <= 0) {
    throw new Error("Accepted Coverage A floor is invalid.");
  }

  await requireQuoteForDeal(dealId, quoteId);
  const floor = Math.round(acceptedCoverageA);

  await db
    .update(quotes)
    .set({ coverageA: floor, ...BIND_RECHECK_CLEAR_PATCH })
    .where(and(eq(quotes.id, quoteId), eq(quotes.dealId, dealId), eq(quotes.tenantId, DEFAULT_TENANT_ID)));

  const session = await currentDeskSession();
  const createdBy = session.name?.trim() || session.email || "agent";
  const floorLabel = floor.toLocaleString("en-US");
  await db.insert(quoteNotes).values({
    tenantId: DEFAULT_TENANT_ID,
    quoteId,
    body: `Agent accepted Cov A floor $${floorLabel} for re-quote`,
    createdBy,
  });

  await queueRecheckNotesForQuotes(dealId, [quoteId]);

  revalidatePath(`/deals/${dealId}`);
  flashAction(dealQuotesPath(dealId), "Re-quote queued");
}

function bindRecheckChecksFromForm(formData: FormData): BindGateChecks {
  return {
    premium: formData.get("premium") === "1" || formData.get("premium") === "true",
    coverages: formData.get("coverages") === "1" || formData.get("coverages") === "true",
    deductibles: formData.get("deductibles") === "1" || formData.get("deductibles") === "true",
  };
}

/** Persist the bind-recheck disclosure Save for one quote. Blocks Bind until this lands. */
export async function saveBindRecheckAckAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  if (!dealId || !quoteId) throw new Error("Deal and quote are required.");
  if (!bindGateReady(bindRecheckChecksFromForm(formData))) {
    throw new Error("Confirm premium, coverages, and deductibles before saving.");
  }
  const row = await requireQuoteForDeal(dealId, quoteId);
  await db
    .update(quotes)
    .set({
      bindRecheckAckedAt: new Date(),
      bindRecheckAckFingerprint: bindRecheckTermsFingerprint(bindRecheckTermsFromQuote(row)),
    })
    .where(and(eq(quotes.id, quoteId), eq(quotes.dealId, dealId), eq(quotes.tenantId, DEFAULT_TENANT_ID)));
  revalidatePath(`/deals/${dealId}`);
  flashAction(dealQuotesPath(dealId), "Recheck saved");
}

/** Manual Life/Health quote-writer result — not a P&C rate pull. */
export async function saveLifeHealthQuoteResultAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const carrierId = String(formData.get("carrierId") ?? "").trim();
  const product = String(formData.get("product") ?? "").trim();
  const shopLineRaw = String(formData.get("shopLine") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!dealId) throw new Error("Deal is missing.");
  if (!carrierId) throw new Error("Pick a carrier.");
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!deal || !risk) throw new Error("Deal or master risk is missing");
  const family = dealFamilyFromHints({
    shopProducts: (deal as { shopProducts?: string[] | null }).shopProducts,
    shopLines: deal.shopLines,
    lineOfBusiness: deal.lineOfBusiness,
    quotingLine: deal.quotingLine,
    quotingForm: deal.quotingForm,
    policySubType: deal.policySubType,
  });
  if (family !== "life" && family !== "health") {
    throw new Error("Quote writer is Life/Health only.");
  }
  const shopLine = isLifeHealthShopLine(shopLineRaw) ? shopLineRaw : family;
  const dealLine = shopLine === "health" ? "HEALTH" : "LIFE";
  const [carrier] = await db
    .select()
    .from(carriers)
    .where(and(eq(carriers.id, carrierId), eq(carriers.tenantId, DEFAULT_TENANT_ID)));
  if (!carrier) throw new Error("Carrier not found.");
  const allowed = lifeHealthQuoteCarriers(
    [{ id: carrier.id, name: carrier.name, writtenLines: carrier.writtenLines }],
    dealLine,
  );
  if (!allowed.length) throw new Error("Carrier does not write this Life/Health line.");
  const outcome = parseLifeHealthQuoteOutcome(String(formData.get("outcome") ?? ""));
  const synced = syncQuoteOutcomes({ riskOutcome: outcome });
  const premium = parseLifeHealthPremium(String(formData.get("premium") ?? ""));
  const faceAmount = parseLifeHealthFaceAmount(String(formData.get("faceAmount") ?? ""));
  const quoteRunId = randomUUID();
  await db.insert(quotes).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId,
    riskId: risk.id,
    carrierId: carrier.id,
    premium,
    coverageA: faceAmount,
    notes: notes || null,
    stub: false,
    shopLine,
    quoteRunId,
    riskOutcome: synced.riskOutcome,
    nextStep: synced.nextStep,
    bindable: synced.bindable,
    agentStatus: "new",
  });
  await persistDealWorkTab(dealId, "quotes").catch(() => null);
  await autoAdvanceDealProductStage({
    dealId,
    stageSlug: "quote_review",
    line: shopLine,
    product: product || undefined,
    pipelineSlug: family === "health" ? "health" : "life",
  }).catch(() => null);
  revalidatePath(`/deals/${dealId}`);
  flashAction(`${dealQuotesPath(dealId)}${product ? `&product=${product}` : ""}`, "Quote result saved");
}
