import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const NOTE =
  "Flood Flow — Quoted #CFBKXE $912.19 portal total ($719.00 Brit Custom carrier premium). Bindable Yes, not bound. Dwelling $310097 Contents $100000 ded $1000 ALE $31000. Construction Stucco (mapped from Frame-Stucco). Eff 10/11/2026. Form Flood. Portal agents.flowinsurance.com user gary.h@afains.com. QuoteRef also 48fN7CKXqJE72NUJfwNQfQmBUNYTaqB994SggVTP when reopening.";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(
      or(
        ilike(carriers.name, "Flow Flood"),
        ilike(carriers.name, "%Flow%Flood%"),
        ilike(carriers.name, "Flow"),
      ),
    );
  console.log(
    "carriers",
    rows.map((c) => ({ id: c.id, name: c.name })),
  );
  const carrier =
    rows.find((c) => /flow\s*flood/i.test(c.name.trim())) ??
    rows.find((c) => /^flow$/i.test(c.name.trim())) ??
    rows[0];
  if (!carrier) throw new Error("Flow Flood carrier not found");

  // Soft-update portal fields if columns exist on carrier
  try {
    await db
      .update(carriers)
      .set({
        portalUrl: "https://agents.flowinsurance.com",
        updatedAt: new Date(),
      } as any)
      .where(eq(carriers.id, carrier.id));
  } catch (e) {
    console.log("portalUrl skip", String(e).slice(0, 120));
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
      result: "quoted",
      bindable: true,
      quoteNumber: "CFBKXE",
      premium: "912.19",
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "accepted",
    nextStep: "can_bind",
    bindable: true,
    quoteNumber: "CFBKXE",
    premium: "912.19",
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: "https://agents.flowinsurance.com",
  } as any;

  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(
      JSON.stringify({
        mode: "updated",
        quoteId: existing[0].id,
        logId: log.id,
        carrier: carrier.name,
        premium: "912.19",
        quoteNumber: "CFBKXE",
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
    console.log(
      JSON.stringify({
        mode: "created",
        quoteId: q.id,
        logId: log.id,
        carrier: carrier.name,
        premium: "912.19",
        quoteNumber: "CFBKXE",
      }),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
