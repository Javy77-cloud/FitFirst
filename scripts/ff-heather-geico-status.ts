import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Geico"), ilike(carriers.name, "%Geico%")));
  const carrier = rows.find((c) => /^geico$/i.test(c.name.trim())) ?? rows[0];
  if (!carrier) throw new Error("Geico not found");
  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, carrier.id)));
  for (const q of existing) {
    console.log(
      JSON.stringify(
        {
          id: q.id,
          quoteNumber: (q as any).quoteNumber,
          premium: (q as any).premium,
          bindable: (q as any).bindable,
          riskOutcome: (q as any).riskOutcome,
          nextStep: (q as any).nextStep,
          agentStatus: (q as any).agentStatus,
          notes: String((q as any).notes ?? "").slice(0, 400),
        },
        null,
        2,
      ),
    );
  }
  if (!existing.length) console.log("no geico quote row");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
