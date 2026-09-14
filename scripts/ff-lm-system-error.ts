import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const NOTE =
  "Auto Liberty Mutual — No market: portal System Error kickout before Drivers (retry later). User jgarcia20. Gender Female / Out of household household already set.";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Liberty Mutual"), ilike(carriers.name, "%Liberty Mutual%")));
  const carrier =
    rows.find((c) => /^liberty mutual$/i.test(c.name.trim())) ??
    rows.find((c) => /liberty mutual/i.test(c.name)) ??
    rows[0];
  if (!carrier) throw new Error("LM not found");

  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk");

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, carrier.id)));

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: carrier.id,
      riskId: risk.id,
      line: "auto",
      result: "no_market",
      bindable: false,
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();

  let quoteId: string;
  let mode: string;
  if (existing[0]) {
    await db
      .update(quotes)
      .set({
        riskOutcome: "no_market",
        nextStep: "go_back",
        bindable: false,
        notes: NOTE,
        quoteAttemptLogId: log.id,
        agentStatus: "new",
        stub: false,
      } as any)
      .where(eq(quotes.id, existing[0].id));
    quoteId = existing[0].id;
    mode = "updated";
  } else {
    const [q] = await db
      .insert(quotes)
      .values({
        tenantId: carrier.tenantId,
        dealId: DEAL,
        riskId: risk.id,
        carrierId: carrier.id,
        quoteAttemptLogId: log.id,
        riskOutcome: "no_market",
        nextStep: "go_back",
        bindable: false,
        notes: NOTE,
        stub: false,
        agentStatus: "new",
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }

  console.log(JSON.stringify({ carrierId: carrier.id, name: carrier.name, quoteId, mode, logId: log.id }, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
