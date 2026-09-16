/**
 * One-shot: Heather Camirand (not Cameron) — drop leftover HO3 / Auto notices.
 * Keeps Flood Check mortgage. Safe to re-run.
 *
 *   DATABASE_URL=postgres://... tsx --env-file=.env scripts/ff-clear-heather-stale-notices.ts
 *   DRY_RUN=1 DATABASE_URL=... tsx --env-file=.env scripts/ff-clear-heather-stale-notices.ts
 */
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deals } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import {
  isHeatherCamirandDeal,
  parseProductStages,
  stripStaleCamirandProductNotices,
} from "../src/lib/deals/product-stages";
import { parseShopFlow } from "../src/lib/deals/shop-flow";

const DRY_RUN = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");

async function main() {
  const rows = await db
    .select({
      id: deals.id,
      title: deals.title,
      primaryNamedInsured: deals.primaryNamedInsured,
      shopFlow: deals.shopFlow,
    })
    .from(deals)
    .where(eq(deals.tenantId, DEFAULT_TENANT_ID));
  const targets = rows.filter((row) => isHeatherCamirandDeal(row));
  if (!targets.length) {
    console.log("NONE Heather Camirand deal");
    return;
  }
  for (const row of targets) {
    const saved = parseShopFlow(row.shopFlow);
    const cleaned = stripStaleCamirandProductNotices(parseProductStages(saved.productStages));
    if (cleaned === saved.productStages) {
      console.log("CLEAN", row.id, row.title);
      continue;
    }
    const next = { ...saved, productStages: cleaned };
    if (DRY_RUN) {
      console.log("DRY", row.id, row.title, JSON.stringify(cleaned));
      continue;
    }
    await db
      .update(deals)
      .set({ shopFlow: next, updatedAt: new Date() })
      .where(eq(deals.id, row.id));
    console.log("CLEARED", row.id, row.title);
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
