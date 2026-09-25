import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { lifeHealthShopRepair } from "./deal-products";

let retitlePromise: Promise<number> | null = null;

/**
 * Page-load boot. Does not rewrite deals.title — that is
 * scripts/regenerate-deal-titles.ts, which writes an audit row per change.
 * Life/Health shop-line repair stays; it does not touch the title.
 */
export async function retitleExistingDeals(): Promise<number> {
  const rows = await db
    .select({
      id: deals.id,
      shopProducts: deals.shopProducts,
      shopLines: deals.shopLines,
      lineOfBusiness: deals.lineOfBusiness,
      quotingLine: deals.quotingLine,
      quotingForm: deals.quotingForm,
      policySubType: deals.policySubType,
      updatedAt: deals.updatedAt,
    })
    .from(deals)
    .where(eq(deals.tenantId, DEFAULT_TENANT_ID));

  let changed = 0;
  for (const row of rows) {
    const shopRepair = lifeHealthShopRepair(row);
    if (!shopRepair) continue;
    await db
      .update(deals)
      .set({
        shopLines: shopRepair.shopLines,
        shopProducts: shopRepair.shopProducts,
        updatedAt: row.updatedAt ?? new Date(),
      })
      .where(eq(deals.id, row.id));
    changed += 1;
  }
  return changed;
}

export async function ensureDealTitles(): Promise<number> {
  if (!retitlePromise) {
    retitlePromise = retitleExistingDeals().catch((error) => {
      retitlePromise = null;
      throw error;
    });
  }
  return retitlePromise;
}

export function resetDealTitleBoot() {
  retitlePromise = null;
}
