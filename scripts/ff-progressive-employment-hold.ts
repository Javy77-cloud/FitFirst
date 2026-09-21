import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";
import { captureAutoGapsFromAttemptWhy } from "../src/lib/quote-bot/auto-question-gaps";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const NOTE =
  "Auto Progressive — Conditional/blocked no rate: quote #550013376416. Portal Why: Employment required. MVR N. Form PA. quoting.foragentsonly.com. Waiting employment category.";

async function main() {
  const rows = await db.select().from(carriers).where(or(ilike(carriers.name, "Progressive"), ilike(carriers.name, "Progressive%")));
  const carrier = rows.find((c) => /^progressive$/i.test(c.name.trim())) ?? rows[0];
  if (!carrier) throw new Error("Progressive not found");
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk");
  const existing = await db.select().from(quotes).where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, carrier.id)));
  try {
    captureAutoGapsFromAttemptWhy({
      why: NOTE,
      shopLine: "auto",
      carrierId: carrier.id,
      carrierName: carrier.name,
      dealId: DEAL,
      url: "https://quoting.foragentsonly.com",
      source: "scripts/ff-progressive-employment-hold.ts",
    });
  } catch (error) {
    console.log("gap capture skip", String(error).slice(0, 160));
  }
  const [log] = await db.insert(quoteAttemptLogs).values({
    tenantId: carrier.tenantId, dealId: DEAL, carrierId: carrier.id, riskId: risk.id,
    line: "auto", result: "quoted", bindable: false, quoteNumber: "550013376416", why: NOTE, attemptedAt: new Date(),
  } as any).returning();
  const patch = {
    riskOutcome: "maybe", nextStep: "go_back", bindable: false, quoteNumber: "550013376416",
    notes: NOTE, quoteAttemptLogId: log.id, agentStatus: "quoted", stub: false,
    carrierOpenUrl: "https://quoting.foragentsonly.com",
  } as any;
  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(JSON.stringify({ mode: "updated", quoteId: existing[0].id }));
  } else {
    const [q] = await db.insert(quotes).values({
      tenantId: carrier.tenantId, dealId: DEAL, riskId: risk.id, carrierId: carrier.id, ...patch,
    } as any).returning();
    console.log(JSON.stringify({ mode: "created", quoteId: q.id }));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
