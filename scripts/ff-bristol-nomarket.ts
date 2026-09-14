
import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const PORTAL = "https://www.bwproducers.com/producers/login.aspx";
const NOTE =
  "Auto Bristol West — No market: online quoting under maintenance. Portal bwproducers.com. Retry when BW quoting is back.";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "%Bristol%"), ilike(carriers.name, "%Bristol West%")));
  if (!rows.length) throw new Error("Bristol West not found");
  const carrier = rows[0];
  await db
    .update(carriers)
    .set({
      agentPortalUrl: PORTAL,
      portalUrl: PORTAL,
      updatedAt: new Date(),
    })
    .where(eq(carriers.id, carrier.id));

  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk for deal");

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

  if (existing[0]) {
    await db
      .update(quotes)
      .set({
        riskOutcome: "no_market",
        nextStep: "hard_no",
        bindable: false,
        notes: NOTE,
        quoteAttemptLogId: log.id,
        agentStatus: "new",
        stub: false,
      })
      .where(eq(quotes.id, existing[0].id));
    console.log(JSON.stringify({ carrierId: carrier.id, name: carrier.name, quoteId: existing[0].id, logId: log.id, portal: PORTAL }));
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
        nextStep: "hard_no",
        bindable: false,
        notes: NOTE,
        stub: false,
        agentStatus: "new",
      } as any)
      .returning();
    console.log(JSON.stringify({ carrierId: carrier.id, name: carrier.name, quoteId: q.id, logId: log.id, portal: PORTAL }));
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
