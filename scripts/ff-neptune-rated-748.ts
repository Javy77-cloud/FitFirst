import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const NOTE =
  "Flood Neptune — Quoted #FL6253AM93ORON $748.57 Bindable Yes. Building $310097 Contents $100000 ded $1000. Eff 10/11/2026. Zone X prior_flood_losses=No. Producer 064296. Portal neptuneflood.com/agent-hub user javier.g@afains.com. No separate tracking #. Not bound.";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Neptune"), ilike(carriers.name, "%Neptune%")));
  const carrier = rows.find((c) => /^neptune$/i.test(c.name.trim())) ?? rows[0];
  if (!carrier) throw new Error("Neptune not found");
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
      line: "flood",
      result: "quoted",
      bindable: true,
      quoteNumber: "FL6253AM93ORON",
      premium: "748.57",
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();
  const patch = {
    riskOutcome: "accepted",
    nextStep: "can_bind",
    bindable: true,
    quoteNumber: "FL6253AM93ORON",
    premium: "748.57",
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: "https://neptuneflood.com/agent-hub",
  } as any;
  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(JSON.stringify({ mode: "updated", quoteId: existing[0].id, logId: log.id }));
  } else {
    const [q] = await db
      .insert(quotes)
      .values({
        tenantId: carrier.tenantId,
        dealId: DEAL,
        riskId: risk.id,
        carrierId: carrier.id,
        ...patch,
      } as any)
      .returning();
    console.log(JSON.stringify({ mode: "created", quoteId: q.id, logId: log.id }));
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
