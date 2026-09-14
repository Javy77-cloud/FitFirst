import { eq, and, ilike, or, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks, deals } from "../src/lib/db/schema";

const DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const NOTE =
  "Flood Beyond Floods — Declined/no_market. Portal: address could not be determined; cannot cover described property type; directed to manual address/contact. Also asked “Why are you requesting this quote?” (not on sheet). Agent login failed for scott.l@afains.com; used public quickquote.beyondfloods.com. No quote#. Form Flood.";

async function main() {
  const [deal] = await db.select().from(deals).where(eq(deals.id, DEAL)).limit(1);
  if (!deal) throw new Error("no deal");
  const tenantId = (deal as any).tenantId;

  let rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "%Beyond%"), ilike(carriers.name, "%Flood%")));
  console.log("NEAR", rows.map((r) => ({ id: r.id, name: r.name })));

  let carrier = rows.find((c) => /beyond\s*flood/i.test(c.name));
  if (!carrier) {
    const [created] = await db
      .insert(carriers)
      .values({
        tenantId,
        name: "Beyond Floods",
        // keep minimal — match existing shape
      } as any)
      .returning();
    carrier = created;
    console.log("CREATED", carrier.id, carrier.name);
  }

  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no flood risk");
  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, carrier.id)));
  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId,
      dealId: DEAL,
      carrierId: carrier.id,
      riskId: risk.id,
      line: "flood",
      result: "no_market",
      bindable: false,
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();
  const patch = {
    riskOutcome: "not_accepted",
    nextStep: "hard_no",
    bindable: false,
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: "https://quickquote.beyondfloods.com",
  } as any;
  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(JSON.stringify({ mode: "updated", quoteId: existing[0].id, logId: log.id, carrier: carrier.name }));
  } else {
    const [q] = await db
      .insert(quotes)
      .values({
        tenantId,
        dealId: DEAL,
        riskId: risk.id,
        carrierId: carrier.id,
        ...patch,
      } as any)
      .returning();
    console.log(JSON.stringify({ mode: "created", quoteId: q.id, logId: log.id, carrier: carrier.name }));
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
