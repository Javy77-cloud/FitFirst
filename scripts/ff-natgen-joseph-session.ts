import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const CARRIER_ID = "49c35c9c-fe01-4443-8bf9-3342e327031f"; // National General
const PORTAL = "https://torrentflood.com/Dashboard/Agency";
const NOTE =
  "Couldn’t finish quote because NFIP portal session is Joseph (torrentflood.com/Dashboard/Agency) — not Scott / Agency 9026706. NOT a UW decline. Product path correct (NFIP & Excess, not Beyond Floods). Need Scott login scott.l@afains.com / Agency 9026706. Handed to Javy. Skip Travelers.";

async function main() {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, CARRIER_ID)).limit(1);
  if (!carrier) throw new Error("National General missing");
  console.log("carrier", carrier.name, carrier.id);

  await db
    .update(carriers)
    .set({
      agentPortalUrl: PORTAL,
      portalUrl: PORTAL,
      portalLogin: "NEED Scott scott.l@afains.com / Agency 9026706 — NOT Joseph session on torrentflood.com",
      portalUsernameHint: "scott.l@afains.com",
      agencyCode: "9026706",
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, CARRIER_ID));

  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no flood risk");
  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, CARRIER_ID)));

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: CARRIER_ID,
      riskId: risk.id,
      line: "flood",
      result: "no_quote",
      bindable: false,
      quoteNumber: null,
      premium: null,
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "no_option",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: null,
    premium: null,
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: PORTAL,
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
        carrierId: CARRIER_ID,
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
