/**
 * Re-tag quote.shop_line from attempt-log LOB + notes.
 * Safe to re-run. Use after drizzle 0122, or to fix Heather / Gloria chips.
 *
 *   DATABASE_URL=postgres://... tsx --env-file=.env scripts/ff-tag-quote-shop-lines.ts
 *   DEAL_ID=5ed997ba-21b5-4a70-bdf8-c78810cc79b1 tsx --env-file=.env scripts/ff-tag-quote-shop-lines.ts
 */
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteAttemptLogs, quotes } from "../src/lib/db/schema";
import { shopLineToPersist } from "../src/lib/deals/shop-flow";

const DEAL_ID = process.env.DEAL_ID?.trim() || "";

async function main() {
  const quoteRows = DEAL_ID
    ? await db.select().from(quotes).where(eq(quotes.dealId, DEAL_ID))
    : await db.select().from(quotes);
  const logs = await db
    .select({
      id: quoteAttemptLogs.id,
      dealId: quoteAttemptLogs.dealId,
      lineOfBusiness: quoteAttemptLogs.lineOfBusiness,
    })
    .from(quoteAttemptLogs);
  const logsByDeal = new Map<string, { id: string; lineOfBusiness?: string | null }[]>();
  for (const log of logs) {
    if (!log.dealId) continue;
    const bucket = logsByDeal.get(log.dealId) ?? [];
    bucket.push(log);
    logsByDeal.set(log.dealId, bucket);
  }

  let updated = 0;
  for (const quote of quoteRows) {
    const next = shopLineToPersist({
      shopLine: quote.shopLine,
      quoteAttemptLogId: quote.quoteAttemptLogId,
      notes: quote.notes,
      logs: logsByDeal.get(quote.dealId) ?? [],
    });
    if (!next || next === quote.shopLine) continue;
    await db.update(quotes).set({ shopLine: next }).where(eq(quotes.id, quote.id));
    updated += 1;
  }
  console.log(JSON.stringify({ dealId: DEAL_ID || "all", scanned: quoteRows.length, updated }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
