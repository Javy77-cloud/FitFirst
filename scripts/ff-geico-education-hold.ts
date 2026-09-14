import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const NOTE =
  "Auto Geico — Conditional/blocked no rate: quote #564950R3702949. Portal Why: Education Level blank; Next disabled. MVR N. Form PA. User J0008221. Waiting education level.";

async function main() {
  const rows = await db.select().from(carriers).where(or(ilike(carriers.name, "Geico"), ilike(carriers.name, "%Geico%")));
  const carrier = rows.find((c) => /^geico$/i.test(c.name.trim())) ?? rows[0];
  if (!carrier) throw new Error("Geico not found");
  const user = writePortalUsername("J0008221");
  await db.update(carriers).set({
    agentPortalUrl: "https://sales.geico.com/quote",
    portalUrl: "https://sales.geico.com/quote",
    ...user,
    portalPasswordEnc: null,
    portalPasswordIv: null,
    portalSecretsUpdatedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(carriers.id, carrier.id));
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk");
  const existing = await db.select().from(quotes).where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, carrier.id)));
  const [log] = await db.insert(quoteAttemptLogs).values({
    tenantId: carrier.tenantId, dealId: DEAL, carrierId: carrier.id, riskId: risk.id,
    line: "auto", result: "quoted", bindable: false, quoteNumber: "564950R3702949", why: NOTE, attemptedAt: new Date(),
  } as any).returning();
  const patch = {
    riskOutcome: "maybe", nextStep: "go_back", bindable: false, quoteNumber: "564950R3702949",
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
