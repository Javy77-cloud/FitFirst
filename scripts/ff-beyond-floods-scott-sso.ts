import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const NOTE =
  "Couldn’t finish quote because Scott Beyond Floods SSO didn’t open from NatGen button; no existing Heather Camirand / Tallwood quote under joe.g@afains.com (Heather search no permission). NOT a UW decline. Standing: quote only under Scott / Agency 9026706. Product note: Flood Center separates NFIP & Excess Flood vs Beyond Floods (private) — separate paths. Reopen Scott Beyond Floods session, then retry Beyond Floods + NatGen Flood (NFIP/Excess) if available.";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Beyond Floods"), ilike(carriers.name, "%Beyond%Flood%")));
  const carrier = rows.find((c) => /beyond\s*flood/i.test(c.name)) ?? rows[0];
  if (!carrier) throw new Error("Beyond Floods not found");

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
    carrierOpenUrl: "https://natgen.beyondfloods.com",
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
