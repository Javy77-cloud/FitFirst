import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const NOTE =
  "Couldn’t finish quote because wrong Beyond Floods account — opened as Joseph Andrew Garcia (joe.g@afains.com) instead of Scott / Agency 9026706. NOT a UW decline. Portal natgen.beyondfloods.com. Reopen under Scott session then retry. Prior public-QQ no_market was separate; this attempt is agent portal wrong-account.";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(
      or(
        ilike(carriers.name, "Beyond Floods"),
        ilike(carriers.name, "%Beyond%Flood%"),
        ilike(carriers.name, "%NatGen%"),
      ),
    );
  const carrier =
    rows.find((c) => /beyond\s*flood/i.test(c.name)) ??
    rows.find((c) => /natgen/i.test(c.name)) ??
    rows[0];
  if (!carrier) throw new Error("Beyond Floods not found");
  console.log("carrier", carrier.id, carrier.name);

  try {
    await db
      .update(carriers)
      .set({
        agentPortalUrl: "https://natgen.beyondfloods.com",
        portalUrl: "https://natgen.beyondfloods.com",
        portalLogin: "Scott / Agency 9026706 — NOT joe.g@afains.com",
        portalUsernameHint: "scott.l@afains.com / Agency 9026706",
        agencyCode: "9026706",
        portalSecretsUpdatedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(carriers.id, carrier.id));
  } catch (e) {
    console.log("portal skip", String(e).slice(0, 120));
  }

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
    console.log(
      JSON.stringify({
        mode: "updated",
        quoteId: existing[0].id,
        logId: log.id,
        prev: String((existing[0] as any).notes ?? "").slice(0, 140),
      }),
    );
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
