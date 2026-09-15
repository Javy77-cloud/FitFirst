/**
 * One-shot Neon book merge: Gloria Martinez HO3+DP3 and Heather Camirand HO3+Auto+Flood
 * become one multi-product deal each.
 *
 * Usage (after drizzle 0120 is applied):
 *   DATABASE_URL=postgres://... tsx --env-file=.env scripts/merge-gloria-heather-multiproduct.ts
 *   DRY_RUN=1 DATABASE_URL=... tsx --env-file=.env scripts/merge-gloria-heather-multiproduct.ts
 *
 * Safe to re-run: archived donors are skipped; a single open deal with the required
 * products is treated as already merged.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import {
  activities,
  activityLogs,
  clientHistory,
  commsOutboundJobs,
  deals,
  deskCustomFieldValues,
  documents,
  drivers,
  emailSendJobs,
  extractionAttempts,
  extractionJobs,
  fillFeedbackLogs,
  fillLearningLogs,
  policies,
  quoteAttemptLogs,
  quoteSheets,
  quotes,
  reviewTasks,
  risks,
  vehicles,
  type QuoteSheetFieldValue,
} from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { productCreateDraft } from "../src/lib/deals/deal-products";
import {
  BOOK_MERGE_TARGETS,
  dealMatchesPerson,
  filledSheetCellCount,
  mergeQuoteSheetValues,
  planPersonMerge,
  sheetMoveAction,
  type MergeDealRow,
  type MergeRichness,
} from "../src/lib/deals/merge-multi-product-deals";

const DRY_RUN = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");

async function richnessFor(dealIds: string[]): Promise<MergeRichness[]> {
  if (!dealIds.length) return [];
  const [docRows, quoteRows, sheets] = await Promise.all([
    db
      .select({ dealId: documents.dealId })
      .from(documents)
      .where(inArray(documents.dealId, dealIds)),
    db
      .select({ dealId: quotes.dealId })
      .from(quotes)
      .where(inArray(quotes.dealId, dealIds)),
    db
      .select({ dealId: quoteSheets.dealId, line: quoteSheets.line, values: quoteSheets.values })
      .from(quoteSheets)
      .where(inArray(quoteSheets.dealId, dealIds)),
  ]);
  return dealIds.map((dealId) => {
    const dealSheets = sheets.filter((row) => row.dealId === dealId);
    return {
      dealId,
      docs: docRows.filter((row) => row.dealId === dealId).length,
      quotes: quoteRows.filter((row) => row.dealId === dealId).length,
      filledSheetCells: dealSheets.reduce((sum, row) => sum + filledSheetCellCount(row.values), 0),
      sheetLines: dealSheets.map((row) => row.line),
    };
  });
}

async function remountDealId(donorId: string, survivorId: string, survivorRiskId: string | null) {
  const tables = [
    documents,
    quotes,
    quoteAttemptLogs,
    extractionJobs,
    fillFeedbackLogs,
    fillLearningLogs,
    extractionAttempts,
    activities,
    activityLogs,
    policies,
    clientHistory,
    reviewTasks,
    drivers,
    vehicles,
    emailSendJobs,
    commsOutboundJobs,
  ] as const;
  for (const table of tables) {
    await db.update(table).set({ dealId: survivorId }).where(eq(table.dealId, donorId));
  }
  if (survivorRiskId) {
    await db.update(documents).set({ riskId: survivorRiskId }).where(eq(documents.dealId, survivorId));
    await db.update(quotes).set({ riskId: survivorRiskId }).where(eq(quotes.dealId, survivorId));
    await db.update(quoteAttemptLogs).set({ riskId: survivorRiskId }).where(eq(quoteAttemptLogs.dealId, survivorId));
    await db.update(drivers).set({ riskId: survivorRiskId }).where(eq(drivers.dealId, survivorId));
    await db.update(vehicles).set({ riskId: survivorRiskId }).where(eq(vehicles.dealId, survivorId));
  }
}

async function mergeSheets(donorId: string, survivorId: string) {
  const [donorSheets, survivorSheets] = await Promise.all([
    db.select().from(quoteSheets).where(eq(quoteSheets.dealId, donorId)),
    db.select().from(quoteSheets).where(eq(quoteSheets.dealId, survivorId)),
  ]);
  for (const donor of donorSheets) {
    const existing = survivorSheets.find((row) => row.line === donor.line);
    const action = sheetMoveAction({
      survivorHasLine: Boolean(existing),
      donorHasUserData: Boolean(
        donor.values && Object.values(donor.values).some((cell) => (cell?.value ?? "").trim()),
      ),
    });
    if (action === "move" && !existing) {
      await db.update(quoteSheets).set({ dealId: survivorId, updatedAt: new Date() }).where(eq(quoteSheets.id, donor.id));
      continue;
    }
    if (action === "merge-into-survivor" && existing) {
      const merged = mergeQuoteSheetValues(
        existing.values as Record<string, QuoteSheetFieldValue>,
        donor.values as Record<string, QuoteSheetFieldValue>,
      );
      await db
        .update(quoteSheets)
        .set({ values: merged, updatedAt: new Date() })
        .where(eq(quoteSheets.id, existing.id));
    }
  }
}

async function copyBlankCustomFields(donorId: string, survivorId: string) {
  const donorVals = await db
    .select()
    .from(deskCustomFieldValues)
    .where(
      and(
        eq(deskCustomFieldValues.module, "deals"),
        eq(deskCustomFieldValues.recordId, donorId),
      ),
    );
  const survivorVals = await db
    .select()
    .from(deskCustomFieldValues)
    .where(
      and(
        eq(deskCustomFieldValues.module, "deals"),
        eq(deskCustomFieldValues.recordId, survivorId),
      ),
    );
  const have = new Set(
    survivorVals.filter((row) => (row.value ?? "").trim()).map((row) => row.fieldKey),
  );
  for (const row of donorVals) {
    if (!(row.value ?? "").trim() || have.has(row.fieldKey)) continue;
    const existing = survivorVals.find((item) => item.fieldKey === row.fieldKey);
    if (existing) {
      await db
        .update(deskCustomFieldValues)
        .set({ value: row.value, updatedAt: new Date() })
        .where(eq(deskCustomFieldValues.id, existing.id));
    } else {
      await db.insert(deskCustomFieldValues).values({
        tenantId: row.tenantId,
        module: "deals",
        recordId: survivorId,
        fieldKey: row.fieldKey,
        value: row.value,
      });
    }
  }
}

async function archiveDonor(donorId: string, survivorId: string) {
  await db
    .update(deals)
    .set({
      archivedAt: new Date(),
      pipelineStage: "archive",
      pipelineStageSlug: "archive",
      notes: sql`trim(both from concat(coalesce(${deals.notes}, ''), ${` Merged into ${survivorId} (multi-product).`}))`,
      updatedAt: new Date(),
    })
    .where(eq(deals.id, donorId));
}

async function applyTarget(target: (typeof BOOK_MERGE_TARGETS)[number]) {
  const all = await db.select().from(deals).where(eq(deals.tenantId, DEFAULT_TENANT_ID));
  const matched = all.filter(
    (deal) =>
      dealMatchesPerson(deal, target.query) ||
      target.hintIds.includes(deal.id as (typeof target.hintIds)[number]),
  );
  if (!matched.length) {
    console.log(`[${target.key}] no deals matched "${target.query}" — skip`);
    return { key: target.key, status: "missing" as const };
  }
  const rows: MergeDealRow[] = matched.map((deal) => ({
    id: deal.id,
    title: deal.title,
    primaryNamedInsured: deal.primaryNamedInsured,
    lineOfBusiness: deal.lineOfBusiness,
    quotingForm: deal.quotingForm,
    quotingLine: deal.quotingLine,
    policySubType: deal.policySubType,
    shopLines: deal.shopLines,
    shopProducts: deal.shopProducts,
    archivedAt: deal.archivedAt,
    updatedAt: deal.updatedAt,
    contactId: deal.contactId,
  }));
  const richness = await richnessFor(rows.map((row) => row.id));
  const plan = planPersonMerge({
    deals: rows,
    richness,
    preferId: target.preferId,
    requiredProducts: [...target.requiredProducts],
  });
  if (!plan) {
    console.log(`[${target.key}] nothing open to merge`);
    return { key: target.key, status: "empty" as const };
  }
  const draft = productCreateDraft(plan.products);
  console.log(`[${target.key}]`, {
    survivorId: plan.survivorId,
    donorIds: plan.donorIds,
    products: plan.products,
    shopLines: plan.shopLines,
    alreadyMerged: plan.alreadyMerged,
    dryRun: DRY_RUN,
  });
  if (plan.alreadyMerged) {
    if (!DRY_RUN) {
      await db
        .update(deals)
        .set({
          shopProducts: draft.products,
          shopLines: draft.shopLines,
          accountKind: draft.accountKind,
          bindTarget: draft.bindTarget,
          updatedAt: new Date(),
        })
        .where(eq(deals.id, plan.survivorId));
    }
    return { key: target.key, status: "already" as const, ...plan };
  }
  if (DRY_RUN) return { key: target.key, status: "planned" as const, ...plan };

  const [survivorRisk] = await db.select().from(risks).where(eq(risks.dealId, plan.survivorId));
  for (const donorId of plan.donorIds) {
    await mergeSheets(donorId, plan.survivorId);
    await copyBlankCustomFields(donorId, plan.survivorId);
    await remountDealId(donorId, plan.survivorId, survivorRisk?.id ?? null);
    await archiveDonor(donorId, plan.survivorId);
  }
  await db
    .update(deals)
    .set({
      shopProducts: draft.products,
      shopLines: draft.shopLines,
      quotingLine: draft.quotingLine,
      quotingForm: draft.quotingForm,
      lineOfBusiness: draft.lineOfBusiness,
      accountKind: draft.accountKind,
      bindTarget: draft.bindTarget,
      updatedAt: new Date(),
    })
    .where(eq(deals.id, plan.survivorId));
  return { key: target.key, status: "merged" as const, ...plan };
}

async function main() {
  if (!process.env.DATABASE_URL && process.env.ALLOW_DEFAULT_DB !== "1") {
    throw new Error("DATABASE_URL is required (Neon). Refusing to run against the local default.");
  }
  const results = [];
  for (const target of BOOK_MERGE_TARGETS) {
    results.push(await applyTarget(target));
  }
  console.log(JSON.stringify({ dryRun: DRY_RUN, results }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
