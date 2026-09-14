/**
 * Migrate Tyler Bhattel / Term Life deal onto the life master sheet.
 * Does NOT invent life field values — only corrects form/shell routing.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deals, quoteSheets } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { emptySheetValues } from "../src/lib/quote-sheet/catalog";
import { resolveDealProduct, resolveDealSheetLine } from "../src/lib/deals/deal-line";

const DEAL_ID = "9e9c9347-64ae-4c77-a76d-13a6a999df25";

async function main() {
  const [deal] = await db.select().from(deals).where(eq(deals.id, DEAL_ID));
  if (!deal) throw new Error(`Deal ${DEAL_ID} not found`);

  console.log("BEFORE deal", {
    title: deal.title,
    lineOfBusiness: deal.lineOfBusiness,
    policySubType: deal.policySubType,
    quotingForm: deal.quotingForm,
    quotingLine: deal.quotingLine,
    quotingUnlocked: deal.quotingUnlocked,
  });

  const quotingForm = "Term Life";
  const quotingLine = "life" as const;
  const product = resolveDealProduct({
    lineOfBusiness: "LIFE",
    quotingLine,
    quotingForm,
    policySubType: deal.policySubType || "Term Life",
  });
  const sheetLine = resolveDealSheetLine({
    quotingLine,
    lineOfBusiness: "LIFE",
  });
  console.log("resolved", { product, sheetLine });

  await db
    .update(deals)
    .set({
      lineOfBusiness: "LIFE",
      policySubType: deal.policySubType || "Term Life",
      quotingForm,
      quotingLine,
      // Keep locked — agent still approves; we only open the correct shell.
      updatedAt: new Date(),
    })
    .where(eq(deals.id, DEAL_ID));

  const sheets = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.tenantId, DEFAULT_TENANT_ID), eq(quoteSheets.dealId, DEAL_ID)));

  console.log(
    "BEFORE sheets",
    sheets.map((s) => ({
      id: s.id,
      line: s.line,
      sheet_product: s.values?.sheet_product?.value,
      keyCount: Object.keys(s.values || {}).length,
    })),
  );

  const homeSheets = sheets.filter((s) => s.line === "home");
  let lifeSheet = sheets.find((s) => s.line === "life");

  if (!lifeSheet) {
    const blank = emptySheetValues("life", "life");
    blank.sheet_product = { value: "life", status: "confirmed", source: "agent" };
    const [created] = await db
      .insert(quoteSheets)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        dealId: DEAL_ID,
        line: "life",
        values: blank,
      })
      .returning();
    lifeSheet = created;
    console.log("CREATED life sheet", lifeSheet.id);
  } else {
    await db
      .update(quoteSheets)
      .set({
        values: {
          ...lifeSheet.values,
          sheet_product: { value: "life", status: "confirmed", source: "agent" },
        },
        updatedAt: new Date(),
      })
      .where(eq(quoteSheets.id, lifeSheet.id));
    console.log("UPDATED life sheet product", lifeSheet.id);
  }

  // Retire empty home shell(s) for this LIFE deal (do not invent field values).
  for (const home of homeSheets) {
    const filled = Object.entries(home.values || {}).some(([key, cell]) => {
      if (key === "sheet_product") return false;
      return Boolean(String(cell?.value ?? "").trim());
    });
    if (filled) {
      console.log("KEEP home sheet (has values)", home.id);
      continue;
    }
    await db.delete(quoteSheets).where(eq(quoteSheets.id, home.id));
    console.log("DELETED empty home sheet", home.id);
  }

  const [after] = await db.select().from(deals).where(eq(deals.id, DEAL_ID));
  const afterSheets = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.tenantId, DEFAULT_TENANT_ID), eq(quoteSheets.dealId, DEAL_ID)));

  console.log("AFTER deal", {
    title: after?.title,
    lineOfBusiness: after?.lineOfBusiness,
    policySubType: after?.policySubType,
    quotingForm: after?.quotingForm,
    quotingLine: after?.quotingLine,
    quotingUnlocked: after?.quotingUnlocked,
  });
  console.log(
    "AFTER sheets",
    afterSheets.map((s) => ({
      id: s.id,
      line: s.line,
      sheet_product: s.values?.sheet_product?.value,
      keys: Object.keys(s.values || {}),
    })),
  );
  console.log("SUCCESS product routing check", {
    product: resolveDealProduct({
      lineOfBusiness: after!.lineOfBusiness,
      quotingLine: after!.quotingLine,
      quotingForm: after!.quotingForm,
      policySubType: after!.policySubType,
    }),
    sheetLine: resolveDealSheetLine({
      quotingLine: after!.quotingLine,
      lineOfBusiness: after!.lineOfBusiness,
    }),
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
