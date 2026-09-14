import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const CARRIER_ID = "59ce34a0-1bca-477a-879a-95d2127bff9e";
const NOTE =
  "Auto Nationwide — Declined/no_market: submission 461014264320. Rate unavailable — underwriting company placement changed, unable to continue. Portal nationwideexpress.";

async function main() {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, CARRIER_ID));
  if (!carrier) throw new Error("Nationwide not found");
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
      quoteNumber: "461014264320",
      attemptedAt: new Date(),
    } as any)
    .returning();

  let quoteId: string;
  let mode: string;
  if (existing[0]) {
    await db
      .update(quotes)
      .set({
        riskOutcome: "not_accepted",
        nextStep: "hard_no",
        bindable: false,
        notes: NOTE,
        quoteNumber: "461014264320",
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
        riskOutcome: "not_accepted",
        nextStep: "hard_no",
        bindable: false,
        notes: NOTE,
        quoteNumber: "461014264320",
        stub: false,
        agentStatus: "new",
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }
  console.log(JSON.stringify({ quoteId, mode, logId: log.id }, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
