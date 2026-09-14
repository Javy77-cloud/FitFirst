import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quotes, quoteAttemptLogs, carriers } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const RISK = "4f297c28-00db-40be-8370-7aec6f2a1a1e";
const CARRIER = "3b11b057-541b-4112-8361-44c175539d3c";
const TENANT = "11111111-1111-4111-8111-111111111111";
const LOG_ID = "0b0f2d3e-7020-4bb7-87ba-8fbc1dc516bd"; // latest LM appetite shop log

const note =
  "Excluded household members require Reason Non-Rated/Excluded, separate auto policy status, age first licensed, suspension last 5yr; coverages entered but no premium; not inventing.";

async function main() {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, CARRIER));
  if (!carrier || !/liberty/i.test(carrier.name)) {
    throw new Error(`Liberty Mutual id mismatch: ${carrier?.name ?? "missing"}`);
  }

  await db
    .update(quoteAttemptLogs)
    .set({
      result: "no_market",
      bindable: false,
      why: note,
      attemptedAt: new Date(),
    })
    .where(eq(quoteAttemptLogs.id, LOG_ID));

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, CARRIER)));

  let quoteId: string;
  if (existing[0]) {
    quoteId = existing[0].id;
    await db
      .update(quotes)
      .set({
        riskOutcome: "no_market",
        nextStep: "hard_no",
        bindable: false,
        stub: false,
        notes: note,
        agentStatus: "new",
        quoteAttemptLogId: LOG_ID,
        premium: null,
      })
      .where(eq(quotes.id, quoteId));
  } else {
    const [row] = await db
      .insert(quotes)
      .values({
        tenantId: TENANT,
        dealId: DEAL,
        riskId: RISK,
        carrierId: CARRIER,
        quoteAttemptLogId: LOG_ID,
        riskOutcome: "no_market",
        nextStep: "hard_no",
        bindable: false,
        stub: false,
        notes: note,
        agentStatus: "new",
        coverageGaps: [],
      })
      .returning({ id: quotes.id });
    quoteId = row.id;
  }

  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
  console.log(
    JSON.stringify(
      {
        carrierId: CARRIER,
        carrierName: carrier.name,
        quoteId: q.id,
        logId: LOG_ID,
        riskOutcome: q.riskOutcome,
        nextStep: q.nextStep,
        bindable: q.bindable,
        stub: q.stub,
        notes: q.notes,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
