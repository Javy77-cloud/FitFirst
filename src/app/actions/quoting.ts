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
  deals,
  extractedFields,
  quoteAttemptLogs,
  quoteSheets,
  risks,
} from "@/lib/db/schema";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { fillSheetBlanks } from "@/lib/lifecycle/quote-sheet";
import {
  canUnlockQuoting,
  isAppetiteCaptureResult,
  isQuotingFormId,
  quotingFormById,
  quotingUnlockedForDeal,
  sheetsToPrepare,
} from "@/lib/quoting/forms";

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

async function fillLineFromExtracted(dealId: string, line: ShopLine) {
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  const fields = risk
    ? await db.select().from(extractedFields).where(eq(extractedFields.riskId, risk.id))
    : [];
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
  const current = sheet?.values ?? emptySheetValues(line);
  const filled = fillSheetBlanks(
    current,
    fields.map((field) => ({
      fieldKey: field.fieldKey,
      normalizedValue: field.normalizedValue,
      confidence: Number(field.confidence),
      flagged: field.flagged,
    })),
  );
  if (sheet) {
    await db
      .update(quoteSheets)
      .set({ values: filled.values, updatedAt: new Date() })
      .where(eq(quoteSheets.id, sheet.id));
  } else {
    await db.insert(quoteSheets).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      line,
      values: filled.values,
    });
  }
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

  const lines = sheetsToPrepare(formId);
  await ensureSheetsForDeal(dealId, lines);
  if (formId === "HO3" || form.shopLine === "home") {
    await fillLineFromExtracted(dealId, "home");
  }

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
  redirect(`/deals/${dealId}?tab=quote-sheet&line=${form.shopLine}`);
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

  const session = await currentDeskSession();
  const now = new Date();
  const who = session.name || "desk";

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

  revalidatePath(`/deals/${dealId}`);
  redirect(`/deals/${dealId}?tab=quote-sheet&line=${line}&handoff=1`);
}

export async function logAppetiteResult(formData: FormData) {
  const dealId = str(formData, "dealId");
  const carrierId = str(formData, "carrierId");
  const result = str(formData, "result");
  const deal = await loadDeal(dealId);
  if (!deal) throw new Error("Deal not found.");
  if (!quotingUnlockedForDeal(deal)) {
    throw new Error("Approve the master sheet before logging quote results.");
  }
  if (!carrierId) throw new Error("Pick a carrier.");
  if (!isAppetiteCaptureResult(result)) {
    throw new Error("Result must be quoted, declined, or maybe.");
  }
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!risk) throw new Error("Master risk missing.");

  const line = deal.quotingLine || (deal.lineOfBusiness === "AUTO" ? "auto" : "home");
  await db.insert(quoteAttemptLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId,
    riskId: risk.id,
    carrierId,
    lineOfBusiness: SHOP_LINE_TO_LOB[line as ShopLine] ?? deal.lineOfBusiness ?? "HO",
    result,
    bindable: false,
    quoteNumber: str(formData, "quoteNumber") || null,
    premium: str(formData, "premium") || null,
    covATried: risk.coverageA,
    why: str(formData, "why") || null,
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
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/quotes");
  revalidatePath("/carriers/logs");
  redirect(`/deals/${dealId}?tab=quotes&logged=${result}`);
}
