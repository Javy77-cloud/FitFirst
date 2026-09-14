import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const NOTE =
  "Auto Liberty Mutual Personal Lines — TRUE UW Declined (no quote #). Portal Why: American Economy Insurance Company found ineligible based on policy, operator, prior-insurance, and vehicle attributes; consumer report factors cited. Coverages tried BI 10/20 PD 10k UM/UIM reject PIP 1k Comp/Coll 1k. MVR not offered. Form PA. Portal personal.libertymutual.com user jgarcia20. Replaces prior system-error / couldn’t-finish note (Personal Lines, not Small Business).";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(
      or(
        ilike(carriers.name, "Liberty Mutual"),
        ilike(carriers.name, "%Liberty%Mutual%"),
      ),
    );
  const carrier = rows.find((c) => /liberty\s*mutual/i.test(c.name)) ?? rows[0];
  if (!carrier) throw new Error("LM not found");

  try {
    await db
      .update(carriers)
      .set({
        agentPortalUrl: "https://personal.libertymutual.com",
        portalUrl: "https://personal.libertymutual.com",
        portalLogin: "jgarcia20 | Personal Lines ONLY — not Small Business",
        portalUsernameHint: "jgarcia20",
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
      result: "declined",
      bindable: false,
      quoteNumber: null,
      premium: null,
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "not_accepted",
    nextStep: "hard_no",
    bindable: false,
    quoteNumber: null,
    premium: null,
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted", // or lost? prior declines used quoted with decline outcome — check Allstate pattern
    stub: false,
    carrierOpenUrl: "https://personal.libertymutual.com",
  } as any;

  // Prefer agent status that reflects decline if schema has declined
  patch.agentStatus = "lost";

  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(
      JSON.stringify({
        mode: "updated",
        quoteId: existing[0].id,
        logId: log.id,
        prev: String((existing[0] as any).notes ?? "").slice(0, 100),
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
