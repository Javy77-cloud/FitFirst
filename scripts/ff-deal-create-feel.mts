/**
 * Feel-pass for deals list create flows (no Next request cookies).
 * Exercises copy helpers + DB create paths mirroring deal-create.ts.
 */
import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID, isShopLine, type ShopLine } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals, quoteSheets, risks, users } from "@/lib/db/schema";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { loadRecordValues, writeRecordValues } from "@/lib/custom-fields/store";
import { persistDealWorkTab } from "@/lib/deals/work-tab";
import { DEAL_WORK_TAB_KEY } from "@/lib/deals/tabs";
import { formatDealTitle } from "@/lib/deals/deal-title";
import { copyDealDetailValues, titleForCopiedDeal } from "@/lib/deals/create-from-source";
import { searchDealsForCreate } from "@/app/actions/deal-create";

async function main() {
  const [admin] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.email, "javy@fitfirst.local")));
  if (!admin) throw new Error("admin missing");

  // --- scratch ---
  const scratchTitle = formatDealTitle({ firstName: "New", lastName: "Shop", line: "HO" });
  const [scratch] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      title: scratchTitle,
      pipelineStage: "shopping",
      pipelineStageSlug: "gather",
      lineOfBusiness: "HO",
      state: "FL",
      ownerId: admin.id,
      source: "manual",
      shopLines: ["home"],
      accountKind: "personal",
      bindTarget: "contact",
    })
    .returning();
  await db.insert(risks).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: scratch.id,
    riskType: "property",
    state: "FL",
  });
  await db.insert(quoteSheets).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: scratch.id,
    line: "home",
    values: emptySheetValues("home"),
  });
  await persistDealWorkTab(scratch.id, "details");
  const scratchVals = await loadRecordValues(scratch.id, "deals");
  console.log("SCRATCH", {
    id: scratch.id,
    title: scratch.title,
    tab: scratchVals[DEAL_WORK_TAB_KEY],
    detailKeys: Object.keys(scratchVals).filter((k) => k !== DEAL_WORK_TAB_KEY).length,
  });

  // --- copy from existing ---
  const [source] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, "03dccdd7-db06-4c89-9b7a-cf0a2064d044")))
    .limit(1)
    .then(async (rows) => {
      if (rows[0]) return rows;
      return db
        .select()
        .from(deals)
        .where(eq(deals.tenantId, DEFAULT_TENANT_ID))
        .orderBy(desc(deals.updatedAt))
        .limit(1);
    });
  if (!source) throw new Error("no source deal");

  const custom = await loadRecordValues(source.id, "deals");
  const details = copyDealDetailValues(custom);
  const shopLines = ((source.shopLines ?? []).filter(isShopLine) as ShopLine[]).length
    ? ((source.shopLines ?? []).filter(isShopLine) as ShopLine[])
    : (["home"] as ShopLine[]);
  const title = titleForCopiedDeal({
    title: source.title,
    lineOfBusiness: source.lineOfBusiness,
    primaryNamedInsured: source.primaryNamedInsured,
  });
  const [copied] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId: source.leadId,
      contactId: source.contactId,
      accountId: source.accountId,
      title,
      pipelineStage: "shopping",
      pipelineStageSlug: "gather",
      pipelineId: source.pipelineId,
      lineOfBusiness: source.lineOfBusiness,
      bindTarget: source.bindTarget,
      state: source.state,
      notes: source.notes,
      primaryNamedInsured: source.primaryNamedInsured,
      secondaryNamedInsured: source.secondaryNamedInsured,
      shopLines,
      policySubType: source.policySubType,
      propertyOneliner: source.propertyOneliner,
      currentCarrier: source.currentCarrier,
      accountKind: source.accountKind,
      ownerId: source.ownerId || admin.id,
      source: source.source ?? "manual",
      quotingForm: source.quotingForm,
      quotingLine: source.quotingLine,
      coverageAmount: source.coverageAmount,
      tags: source.tags ?? [],
    })
    .returning();
  await db.insert(risks).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: copied.id,
    contactId: source.contactId,
    riskType: source.lineOfBusiness === "AUTO" ? "auto" : "property",
    state: source.state || "FL",
  });
  if (shopLines.length) {
    await db.insert(quoteSheets).values(
      shopLines.map((line) => ({
        tenantId: DEFAULT_TENANT_ID,
        dealId: copied.id,
        line,
        values: emptySheetValues(line),
      })),
    );
  }
  if (Object.keys(details).length) await writeRecordValues(copied.id, details, "deals");
  await persistDealWorkTab(copied.id, "documents");
  const copiedVals = await loadRecordValues(copied.id, "deals");
  console.log("COPIED", {
    id: copied.id,
    title: copied.title,
    contactId: copied.contactId,
    sourceContactId: source.contactId,
    sameContact: copied.contactId === source.contactId,
    tab: copiedVals[DEAL_WORK_TAB_KEY],
    detailKeys: Object.keys(copiedVals).filter((k) => k !== DEAL_WORK_TAB_KEY).length,
    noCopySuffix: !/\(copy\)/i.test(copied.title),
  });

  const hits = await searchDealsForCreate("Edmerson");
  console.log(
    "SEARCH",
    hits.slice(0, 4).map((h) => `${h.kind}:${h.title}`),
  );

  // cleanup feel-pass rows so we do not pollute the book forever
  for (const id of [scratch.id, copied.id]) {
    await db.delete(quoteSheets).where(eq(quoteSheets.dealId, id));
    await db.delete(risks).where(eq(risks.dealId, id));
    await db.delete(deals).where(eq(deals.id, id));
  }
  console.log("CLEANED feel-pass deals");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
