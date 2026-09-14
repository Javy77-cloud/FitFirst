import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";

async function main() {
  const rows = await db
    .select({
      id: quotes.id,
      name: carriers.name,
      riskOutcome: quotes.riskOutcome,
      nextStep: quotes.nextStep,
      quoteNumber: quotes.quoteNumber,
      premium: quotes.premium,
      notes: quotes.notes,
    })
    .from(quotes)
    .innerJoin(carriers, eq(quotes.carrierId, carriers.id))
    .where(eq(quotes.dealId, DEAL));
  for (const r of rows) {
    console.log("\n===", r.name, "|", r.id);
    console.log(r.riskOutcome, r.nextStep, "q#", r.quoteNumber, "$", r.premium);
    console.log(r.notes);
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
