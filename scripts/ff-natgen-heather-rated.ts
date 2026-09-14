import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const CARRIER_ID = "49c35c9c-fe01-4443-8bf9-3342e327031f"; // National General
const PORTAL = "https://nationalgeneral.torrentflood.com/Application/Quote/21475957";
const NOTE =
  "Flood National General (NFIP & Excess) — Quoted #0003675104 / Application 21475957. Premium $487.00 NFIP provisional. Coverages Building $250,000 (portal/NFIP floor vs requested $310097); Contents $100,000; ded $2,000/$1,000. Bindable Conditional/application — not bound. Portal Why: NFIP Rating Engine unavailable; provisional rates applied. Excess Flood rates unavailable. Eff tried 10/11/2026. Form Flood. Portal nationalgeneral.torrentflood.com user JOE.G@AFAINS.COM (Joseph) — Javy OK for this quote. Compare: Neptune #FL6253AM93ORON $748.57 full $310k still best bindable Flood.";

async function main() {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, CARRIER_ID)).limit(1);
  if (!carrier) throw new Error("National General missing");

  await db
    .update(carriers)
    .set({
      agentPortalUrl: "https://nationalgeneral.torrentflood.com",
      portalUrl: "https://nationalgeneral.torrentflood.com",
      portalLogin: "JOE.G@AFAINS.COM (Joseph) — Javy OK for Heather NatGen Flood quote; Scott preferred standing",
      portalUsernameHint: "joe.g@afains.com / scott.l@afains.com",
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
      result: "quoted",
      bindable: false,
      quoteNumber: "0003675104",
      premium: "487.00",
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "maybe",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: "0003675104",
    premium: "487.00",
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
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
