import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const NOTE =
  "Auto Progressive — Quoted #550013376416 $700/6mo PIF at 50/100/25 (PIP 1k, Comp/Coll 1k, UM/UIM none). Bindable No — FL license required for POS/MVR (MVR N). Form PA. Agent 87747. Discounts: 3yr Safe-Driver + Homeowner; no lapse. Floor accepted per standing rule (10/20/10 unavailable).";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Progressive"), ilike(carriers.name, "%Progressive%")));
  const carrier =
    rows.find((c) => /^progressive$/i.test(c.name.trim())) ??
    rows.find((c) => /progressive/i.test(c.name) && !/commercial|specialty/i.test(c.name)) ??
    rows[0];
  if (!carrier) throw new Error("Progressive not found");
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
      result: "maybe",
      bindable: false,
      quoteNumber: "550013376416",
      premium: "700",
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();
  const patch = {
    riskOutcome: "maybe",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: "550013376416",
    premium: "700",
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
  } as any;
  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(JSON.stringify({ mode: "updated", quoteId: existing[0].id, logId: log.id, carrier: carrier.name }));
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
    console.log(JSON.stringify({ mode: "created", quoteId: q.id, logId: log.id, carrier: carrier.name }));
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
