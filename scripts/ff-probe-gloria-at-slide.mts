import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs } from "../src/lib/db/schema";
import { eq, and, ilike, desc } from "drizzle-orm";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";
const AT = "e66c7eef-e6a2-44e5-8255-9fe15b11803d";

async function main() {
  const slides = await db
    .select({
      id: carriers.id,
      name: carriers.name,
      portalUrl: carriers.portalUrl,
      agentPortalUrl: carriers.agentPortalUrl,
      phone: carriers.phone,
      email: carriers.email,
      claimsPhone: carriers.claimsPhone,
      customerServicePhone: carriers.customerServicePhone,
      underwriterEmail: carriers.underwriterEmail,
      mailingAddress: carriers.mailingAddress,
      portalLogin: carriers.portalLogin,
      portalUsernameHint: carriers.portalUsernameHint,
      appetiteRows: carriers.appetiteRows,
      dontWriteRows: carriers.dontWriteRows,
      appetiteNotes: carriers.appetiteNotes,
    })
    .from(carriers)
    .where(ilike(carriers.name, "%slide%"));
  console.log("SLIDES", JSON.stringify(slides, null, 2));

  const atQuotes = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, AT)));
  console.log(
    "AT QUOTES",
    JSON.stringify(
      atQuotes.map((q) => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        premium: q.premium,
        bindable: q.bindable,
        riskOutcome: q.riskOutcome,
        nextStep: q.nextStep,
        agentStatus: q.agentStatus,
        coverageA: q.coverageA,
        hurricaneDeductible: q.hurricaneDeductible,
        aopDeductible: q.aopDeductible,
        notes: (q.notes || "").slice(0, 400),
        bindRequirements: q.bindRequirements,
        carrierOpenUrl: q.carrierOpenUrl,
        quoteAttemptLogId: q.quoteAttemptLogId,
      })),
      null,
      2,
    ),
  );

  const [at] = await db.select().from(carriers).where(eq(carriers.id, AT)).limit(1);
  console.log(
    "AT CARRIER",
    JSON.stringify(
      {
        id: at?.id,
        name: at?.name,
        phone: at?.phone,
        customerServicePhone: at?.customerServicePhone,
        claimsPhone: at?.claimsPhone,
        underwriterEmail: at?.underwriterEmail,
        email: at?.email,
        mailingAddress: at?.mailingAddress,
        portalLogin: at?.portalLogin,
        portalUsernameHint: at?.portalUsernameHint,
        agentPortalUrl: at?.agentPortalUrl,
        portalUrl: at?.portalUrl,
        appetiteNotesTail: String(at?.appetiteNotes || "").slice(-600),
        appetiteRows: at?.appetiteRows,
        dontWriteRows: at?.dontWriteRows,
      },
      null,
      2,
    ),
  );

  const dealQuotes = await db.select().from(quotes).where(eq(quotes.dealId, DEAL));
  console.log(
    "ALL DEAL QUOTES",
    JSON.stringify(
      dealQuotes.map((q) => ({
        id: q.id,
        carrierId: q.carrierId,
        quoteNumber: q.quoteNumber,
        premium: q.premium,
        riskOutcome: q.riskOutcome,
        bindable: q.bindable,
        notes: (q.notes || "").slice(0, 140),
      })),
      null,
      2,
    ),
  );

  const logs = await db
    .select()
    .from(quoteAttemptLogs)
    .where(eq(quoteAttemptLogs.dealId, DEAL))
    .orderBy(desc(quoteAttemptLogs.attemptedAt));
  console.log(
    "LOGS",
    JSON.stringify(
      logs.map((l) => ({
        id: l.id,
        carrierId: l.carrierId,
        result: l.result,
        quoteNumber: l.quoteNumber,
        premium: l.premium,
        bindable: l.bindable,
        why: (l.why || "").slice(0, 160),
        attemptedAt: l.attemptedAt,
      })),
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
