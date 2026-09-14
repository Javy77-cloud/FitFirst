import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";

async function main() {
  // Delete duplicate Progressive row (keep d1a27837 — the one from rated-700 script)
  const keep = "d1a27837-026e-47a4-aef8-264be84d06b3";
  const drop = "7b6314a1-f18f-4c94-bcae-6db173c763f3";
  await db.delete(quotes).where(eq(quotes.id, drop));
  console.log("DELETED_DUP_PROGRESSIVE", drop, "kept", keep);

  // Ensure Travelers row exists with proper notes
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Travelers"), ilike(carriers.name, "%Travelers%")));
  const carrier = rows.find((c) => /travelers/i.test(c.name)) ?? rows[0];
  if (!carrier) throw new Error("Travelers not found");
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk");
  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, carrier.id)));
  const note =
    "No quote obtained — no portal access (NordPass autofill). WHY: Travelers NordPass entry failed autofill; never reached rating. Queued for Javy simultaneous login handoff after Flow Flood. Form PA.";
  if (existing[0]) {
    await db
      .update(quotes)
      .set({
        riskOutcome: "not_accepted",
        nextStep: "go_back",
        bindable: false,
        notes: note,
        agentStatus: "quoted",
        stub: false,
        updatedAt: new Date(),
      } as any)
      .where(eq(quotes.id, existing[0].id));
    console.log("UPDATED_TRAVELERS", existing[0].id);
  } else {
    const [log] = await db
      .insert(quoteAttemptLogs)
      .values({
        tenantId: carrier.tenantId,
        dealId: DEAL,
        carrierId: carrier.id,
        riskId: risk.id,
        line: "auto",
        result: "no_market",
        bindable: false,
        why: note,
        attemptedAt: new Date(),
      } as any)
      .returning();
    const [q] = await db
      .insert(quotes)
      .values({
        tenantId: carrier.tenantId,
        dealId: DEAL,
        riskId: risk.id,
        carrierId: carrier.id,
        riskOutcome: "not_accepted",
        nextStep: "go_back",
        bindable: false,
        notes: note,
        quoteAttemptLogId: log.id,
        agentStatus: "quoted",
        stub: false,
      } as any)
      .returning();
    console.log("CREATED_TRAVELERS", q.id);
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
