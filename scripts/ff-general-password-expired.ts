import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const NOTE =
  "Couldn’t finish quote because password expired — requires new password reset on pgac.com/mars (NordPass 090674). NOT a UW decline. No quote#. Skipped for now per Javy — reopen after NordPass password reset.";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(
      or(
        ilike(carriers.name, "The General"),
        ilike(carriers.name, "%General%"),
        ilike(carriers.name, "General"),
      ),
    );
  const carrier =
    rows.find((c) => /^the\s*general$/i.test(c.name.trim())) ??
    rows.find((c) => /general/i.test(c.name) && !/american|nationwide|farmers/i.test(c.name)) ??
    rows[0];
  if (!carrier) throw new Error("The General not found");
  console.log("carrier", carrier.id, carrier.name);

  try {
    await db
      .update(carriers)
      .set({
        agentPortalUrl: "https://pgac.com/mars",
        portalUrl: "https://pgac.com/mars",
        portalLogin: "NordPass 090674 — password expired, needs reset",
        portalUsernameHint: "NordPass 090674",
        portalSecretsUpdatedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(carriers.id, carrier.id));
  } catch (e) {
    console.log("portal skip", String(e).slice(0, 100));
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
      line: "auto",
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
    carrierOpenUrl: "https://pgac.com/mars",
  } as any;

  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(
      JSON.stringify({
        mode: "updated",
        quoteId: existing[0].id,
        logId: log.id,
        prev: String((existing[0] as any).notes ?? "").slice(0, 120),
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
