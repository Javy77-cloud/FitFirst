import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const QUOTE_NO = "564951A0529671";
const NOTE =
  "Auto Geico — Quoted #564951A0529671 $624.70 / 6 months. True Monthly Auto Pay: $100.96 due today + 5×$106.01. Pay-in-full proposal $575 (policy premium shown $606; discount $59). Savings $293.85 Paperless+Auto Pay. Bindable Yes — not bound (Finalize Next available; no leftover blocking holds). Javy finished on desk. Coverages BI 10/20 PD 10k PIP Insured+Relative 10k/$1k ded UM declined Comp/Coll $1k. Eff 09/11/2026–03/11/2027. Quote date 09/10/2026. MVR not explicitly shown. Portal sales.geico.com user J0008221. Replaces prior agent-lock / (800) 714-8843 couldn’t-finish and provisional #564950R3702949.";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Geico"), ilike(carriers.name, "%Geico%")));
  const carrier = rows.find((c) => /^geico$/i.test(c.name.trim())) ?? rows[0];
  if (!carrier) throw new Error("Geico not found");

  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk");
  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, carrier.id)));
  if (!existing[0]) throw new Error("no Geico quote row to patch");

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

  await db
    .update(quotes)
    .set({
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
    } as any)
    .where(eq(quotes.id, existing[0].id));

  console.log(
    JSON.stringify({
      mode: "patched",
      quoteId: existing[0].id,
      logId: log.id,
      quoteNumber: QUOTE_NO,
      premium: "624.70",
    }),
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
