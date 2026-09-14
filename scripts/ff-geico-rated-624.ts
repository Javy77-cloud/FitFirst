import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const QUOTE_NO = "564950R3702949"; // earlier shop # — Gaya confirming if same after Javy finish
const NOTE =
  "Auto Geico — Quoted $624.70 / 6 months (True Monthly Auto Pay due today $100.96). Savings shown $293.85 (Paperless + Auto Pay). Bindable Yes / appears bindable — all nav steps checked, no holds visible on Quote Summary. NOT bound. Quote # 564950R3702949 (earlier shop; Gaya confirming if still same after Javy desk finish). Portal sales.geico.com/quote user J0008221. Replaces prior agent-lock / couldn’t-finish note.";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Geico"), ilike(carriers.name, "%Geico%")));
  const carrier = rows.find((c) => /^geico$/i.test(c.name.trim())) ?? rows[0];
  if (!carrier) throw new Error("Geico not found");

  try {
    await db
      .update(carriers)
      .set({
        agentPortalUrl: "https://sales.geico.com/quote",
        portalUrl: "https://sales.geico.com/quote",
        portalLogin: "J0008221",
        portalUsernameHint: "J0008221",
        portalSecretsUpdatedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(carriers.id, carrier.id));
  } catch (e) {
    console.log("portal update skip", String(e).slice(0, 120));
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
      result: "quoted",
      bindable: true,
      quoteNumber: QUOTE_NO,
      premium: "624.70",
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "accepted",
    nextStep: "can_bind",
    bindable: true,
    quoteNumber: QUOTE_NO,
    premium: "624.70",
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: "https://sales.geico.com/quote",
  } as any;

  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(
      JSON.stringify({
        mode: "updated",
        quoteId: existing[0].id,
        logId: log.id,
        premium: "624.70",
        quoteNumber: QUOTE_NO,
        prevNotes: String((existing[0] as any).notes ?? "").slice(0, 120),
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
