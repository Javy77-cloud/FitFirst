import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const GEICO = "eaf069fd-d37e-41ed-8965-3d4ddc61ddf0";
const QUOTE_NUMBER = "564950R3702949";
const NOTE =
  "holding — ownership_length + commute_days_week blank, not inventing; no premium. Can reopen when those fields are filled.";

async function main() {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, GEICO));
  if (!carrier) throw new Error("Geico carrier not found");

  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk for deal");

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, GEICO)));

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: GEICO,
      riskId: risk.id,
      lineOfBusiness: "AUTO",
      result: "no_market",
      bindable: false,
      quoteNumber: QUOTE_NUMBER,
      premium: null,
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();

  let quoteId: string;
  let mode: string;
  if (existing[0]) {
    await db
      .update(quotes)
      .set({
        quoteNumber: QUOTE_NUMBER,
        premium: null,
        riskOutcome: "no_market",
        nextStep: "hard_no",
        bindable: false,
        notes: NOTE,
        quoteAttemptLogId: log.id,
        agentStatus: "new",
        stub: false,
        carrierOpenUrl: carrier.agentPortalUrl ?? "https://sales.geico.com/quote",
      })
      .where(eq(quotes.id, existing[0].id));
    quoteId = existing[0].id;
    mode = "updated";
  } else {
    const [q] = await db
      .insert(quotes)
      .values({
        tenantId: carrier.tenantId,
        dealId: DEAL,
        riskId: risk.id,
        carrierId: GEICO,
        quoteAttemptLogId: log.id,
        quoteNumber: QUOTE_NUMBER,
        premium: null,
        riskOutcome: "no_market",
        nextStep: "hard_no",
        bindable: false,
        notes: NOTE,
        stub: false,
        agentStatus: "new",
        carrierOpenUrl: carrier.agentPortalUrl ?? "https://sales.geico.com/quote",
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }

  const [q2] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
  const [log2] = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.id, log.id));

  console.log(
    JSON.stringify(
      {
        carrierId: GEICO,
        carrierName: carrier.name,
        portal: carrier.agentPortalUrl,
        portalUrl: carrier.portalUrl,
        riskId: risk.id,
        quoteId,
        logId: log.id,
        mode,
        quoteNumber: q2?.quoteNumber,
        premium: q2?.premium ?? null,
        riskOutcome: q2?.riskOutcome,
        nextStep: q2?.nextStep,
        bindable: q2?.bindable,
        notes: q2?.notes,
        logResult: log2?.result,
        logQuoteNumber: log2?.quoteNumber,
        logLob: log2?.lineOfBusiness,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
