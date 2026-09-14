import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const NOTE =
  "Auto Geico — Declined/blocked online: quote #564950R3702949. Portal: Last time you accessed this quote, you were working with a GEICO agent. To continue, call (800) 714-8843. No premium. Form PA. User J0008221. Phone GEICO or leave.";

async function main() {
  const rows = await db.select().from(carriers).where(or(ilike(carriers.name, "Geico"), ilike(carriers.name, "%Geico%")));
  const carrier = rows.find((c) => /^geico$/i.test(c.name.trim())) ?? rows[0];
  if (!carrier) throw new Error("Geico not found");
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk");
  const existing = await db.select().from(quotes).where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, carrier.id)));
  const [log] = await db.insert(quoteAttemptLogs).values({
    tenantId: carrier.tenantId, dealId: DEAL, carrierId: carrier.id, riskId: risk.id,
    line: "auto", result: "no_market", bindable: false, quoteNumber: "564950R3702949", why: NOTE, attemptedAt: new Date(),
  } as any).returning();
  const patch = {
    riskOutcome: "not_accepted", nextStep: "go_back", bindable: false, quoteNumber: "564950R3702949",
    notes: NOTE, quoteAttemptLogId: log.id, agentStatus: "quoted", stub: false,
    carrierOpenUrl: "https://sales.geico.com/quote",
  } as any;
  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(JSON.stringify({ mode: "updated", quoteId: existing[0].id, logId: log.id }));
  } else {
    const [q] = await db.insert(quotes).values({
      tenantId: carrier.tenantId, dealId: DEAL, riskId: risk.id, carrierId: carrier.id, ...patch,
    } as any).returning();
    console.log(JSON.stringify({ mode: "created", quoteId: q.id, logId: log.id }));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
