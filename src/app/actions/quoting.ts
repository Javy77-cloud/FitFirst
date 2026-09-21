"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  SHOP_LINE_TO_LOB,
  type ShopLine,
} from "@/lib/domain";
import { DEAL_ID } from "@/lib/fixtures/ids";
import { db } from "@/lib/db";
import {
  carriers,
  deals,
  quoteAttemptLogs,
  quoteSheets,
  risks,
} from "@/lib/db/schema";
import { autoSnapshotFieldsForDeal } from "@/lib/appetite/auto-premium-capture";
import { lineLearningSnapshotFieldsForDeal } from "@/lib/appetite/line-learning-capture";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { persistDealWorkTab } from "@/lib/deals/work-tab";
import { persistSheetConfirmClear } from "@/lib/deals/shop-flow-persist";
import { autoAdvanceDealProductStage } from "@/app/actions/product-stage";
import { withFlash } from "@/lib/flash";
import { persistQuoteSheetValues, runFillDealSheets } from "@/app/actions/quote-sheet";
import { submittedSheetValues } from "@/lib/quote-sheet/apply";
import {
  canUnlockQuoting,
  isAppetiteCaptureResult,
  isQuotingFormId,
  quotingFormById,
  quotingUnlockedForDeal,
  sheetsToPrepare,
} from "@/lib/quoting/forms";
import { mergeShopLinesKeepExisting } from "@/lib/deals/package-lines";
import { captureAutoGapsFromAttemptWhy } from "@/lib/quote-bot/auto-question-gaps";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

async function loadDeal(dealId: string) {
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, dealId)));
  return deal ?? null;
}

async function ensureSheetsForDeal(dealId: string, lines: ShopLine[]) {
  const existing = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.tenantId, DEFAULT_TENANT_ID), eq(quoteSheets.dealId, dealId)));
  const have = new Set(existing.map((sheet) => sheet.line));
  const missing = lines.filter((line) => !have.has(line));
  if (missing.length === 0) return existing;
  await db.insert(quoteSheets).values(
    missing.map((line) => ({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      line,
      values: emptySheetValues(line),
    })),
  );
  return db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.tenantId, DEFAULT_TENANT_ID), eq(quoteSheets.dealId, dealId)));
}

export async function setQuotingLine(formData: FormData) {
  const dealId = str(formData, "dealId");
  const formId = str(formData, "quotingForm");
  if (!dealId || !isQuotingFormId(formId)) {
    throw new Error("Pick a line / policy type to quote.");
  }
  const form = quotingFormById(formId);
  if (!form) throw new Error("Unknown policy form.");
  const deal = await loadDeal(dealId);
  if (!deal) throw new Error("Deal not found.");

  const lines = mergeShopLinesKeepExisting(deal.shopLines, sheetsToPrepare(formId));
  await ensureSheetsForDeal(dealId, lines);
  await runFillDealSheets(dealId, form.shopLine);

  await db
    .update(deals)
    .set({
      quotingLine: form.shopLine,
      quotingForm: formId,
      lineOfBusiness: form.lob,
      shopLines: lines,
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId));

  revalidatePath(`/deals/${dealId}`);
  redirect(`/deals/${dealId}?tab=documents&line=${form.shopLine}`);
}

export async function approveMasterSheet(formData: FormData) {
  const dealId = str(formData, "dealId");
  const line = (str(formData, "line") || "home") as ShopLine;
  const reviewed = str(formData, "reviewed") === "yes";
  const sure = str(formData, "sure") === "yes";
  if (!canUnlockQuoting({ reviewed, sure })) {
    throw new Error("Visual review and a second confirmation are required.");
  }
  const deal = await loadDeal(dealId);
  if (!deal) throw new Error("Deal not found.");
  if (dealId === DEAL_ID && (deal.pipelineStage === "bound" || deal.pipelineStage === "closed_won")) {
    throw new Error("Ana stays shopping. Do not bind this shop.");
  }
  const subsequent = Boolean(deal.quotingUnlocked || deal.sheetApprovedAt);

  const session = await currentDeskSession();
  const now = new Date();
  const who = session.name || "desk";

  const submitted = submittedSheetValues(formData);
  if (Object.keys(submitted).length > 0) {
    await persistQuoteSheetValues(dealId, line, submitted);
  }

  await db
    .update(deals)
    .set({
      sheetApprovedAt: now,
      sheetApprovedBy: who,
      quotingUnlocked: true,
      updatedAt: now,
    })
    .where(eq(deals.id, dealId));

  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(
      and(
        eq(quoteSheets.tenantId, DEFAULT_TENANT_ID),
        eq(quoteSheets.dealId, dealId),
        eq(quoteSheets.line, line),
      ),
    );
  const reapprove = Boolean(deal.sheetApprovedAt || sheet?.approvedAt);
  if (sheet) {
    await db
      .update(quoteSheets)
      .set({
        approvedAt: now,
        approvedBy: who,
        quotingUnlocked: true,
        updatedAt: now,
      })
      .where(eq(quoteSheets.id, sheet.id));
  }

  await persistSheetConfirmClear(dealId, line).catch(() => null);

  // First confirm → Markets. Later / rating-critical re-approve → Quotes.
  const laterConfirm = subsequent || reapprove;
  if (laterConfirm) {
    const product = str(formData, "product");
    const productQuery = product ? `&product=${encodeURIComponent(product)}` : "";
    await persistDealWorkTab(dealId, "quotes").catch(() => null);
    revalidatePath(`/deals/${dealId}`);
    redirect(
      withFlash(
        `/deals/${dealId}?tab=quotes&line=${line}${productQuery}`,
        reapprove ? "Sheet re-approved" : "Sheet approved",
      ),
    );
  }
  await persistDealWorkTab(dealId, "markets").catch(() => null);
  await autoAdvanceDealProductStage({
    dealId,
    stageSlug: "markets",
    line,
  }).catch(() => null);
  revalidatePath(`/deals/${dealId}`);
  redirect(withFlash(`/deals/${dealId}?tab=markets&line=${line}`, "Sheet approved"));
}

export async function logAppetiteResult(formData: FormData) {
  const dealId = str(formData, "dealId");
  const carrierId = str(formData, "carrierId");
  const result = str(formData, "result");
  const deal = await loadDeal(dealId);
  if (!deal) throw new Error("Deal not found.");
  if (!quotingUnlockedForDeal(deal)) {
    throw new Error("Approve the Risk Profile before logging quote results.");
  }
  if (!carrierId) throw new Error("Pick a carrier.");
  if (!isAppetiteCaptureResult(result)) {
    throw new Error("Result must be quoted, declined, or maybe.");
  }
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!risk) throw new Error("Master risk missing.");

  const line = deal.quotingLine || (deal.lineOfBusiness === "AUTO" ? "auto" : "home");
  const lob = SHOP_LINE_TO_LOB[line as ShopLine] ?? deal.lineOfBusiness ?? "HO";
  const autoSnap = await autoSnapshotFieldsForDeal(dealId, lob);
  const lineSnap = await lineLearningSnapshotFieldsForDeal(dealId, lob);
  await db.insert(quoteAttemptLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId,
    riskId: risk.id,
    carrierId,
    lineOfBusiness: lob,
    result,
    bindable: false,
    quoteNumber: str(formData, "quoteNumber") || null,
    premium: str(formData, "premium") || null,
    covATried: risk.coverageA,
    why: str(formData, "why") || null,
    lostReason: result === "declined" ? str(formData, "lostReason") || null : null,
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
    ...autoSnap,
    ...lineSnap,
  });

  const [carrier] = await db
    .select({ name: carriers.name })
    .from(carriers)
    .where(eq(carriers.id, carrierId));
  try {
    captureAutoGapsFromAttemptWhy({
      why: str(formData, "why"),
      shopLine: line,
      lineOfBusiness: lob,
      carrierId,
      carrierName: carrier?.name ?? "Carrier",
      dealId,
      source: "logAppetiteResult",
    });
  } catch (error) {
    console.error("auto question gap capture failed", error);
  }

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/quotes");
  revalidatePath("/carriers/logs");
  redirect(`/deals/${dealId}?tab=quotes&logged=${result}`);
}
