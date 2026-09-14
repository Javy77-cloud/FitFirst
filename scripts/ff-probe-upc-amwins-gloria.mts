import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";
import { eq, and, or, ilike } from "drizzle-orm";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";

async function main() {
  const univ = await db
    .select({
      id: carriers.id,
      name: carriers.name,
      portalUrl: carriers.portalUrl,
      agentPortalUrl: carriers.agentPortalUrl,
      portalLogin: carriers.portalLogin,
      portalUsernameHint: carriers.portalUsernameHint,
      portalStatus: carriers.portalStatus,
      website: carriers.website,
    })
    .from(carriers)
    .where(
      or(
        ilike(carriers.name, "%universal%"),
        ilike(carriers.name, "%upc%"),
        ilike(carriers.name, "%one alliance%"),
        ilike(carriers.name, "%alliance%"),
      ),
    );
  console.log("UNIVERSAL_CARRIERS", JSON.stringify(univ, null, 2));

  const amwins = await db
    .select({
      id: quotes.id,
      carrierId: quotes.carrierId,
      quoteNumber: quotes.quoteNumber,
      premium: quotes.premium,
      bindable: quotes.bindable,
      riskOutcome: quotes.riskOutcome,
      nextStep: quotes.nextStep,
      coverageA: quotes.coverageA,
      agentStatus: quotes.agentStatus,
      quoteAttemptLogId: quotes.quoteAttemptLogId,
      notes: quotes.notes,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.dealId, DEAL),
        eq(quotes.carrierId, "cbe2e171-1cac-4c49-8204-04787dfcbae3"),
      ),
    );
  console.log("AMWINS_QUOTES", JSON.stringify(amwins, null, 2));

  const amwinsLogs = await db
    .select({
      id: quoteAttemptLogs.id,
      result: quoteAttemptLogs.result,
      bindable: quoteAttemptLogs.bindable,
      quoteNumber: quoteAttemptLogs.quoteNumber,
      premium: quoteAttemptLogs.premium,
      covATried: quoteAttemptLogs.covATried,
      why: quoteAttemptLogs.why,
      attemptedAt: quoteAttemptLogs.attemptedAt,
    })
    .from(quoteAttemptLogs)
    .where(
      and(
        eq(quoteAttemptLogs.dealId, DEAL),
        eq(quoteAttemptLogs.carrierId, "cbe2e171-1cac-4c49-8204-04787dfcbae3"),
      ),
    );
  console.log("AMWINS_LOGS", JSON.stringify(amwinsLogs, null, 2));

  const [risk] = await db
    .select({ id: risks.id, dealId: risks.dealId })
    .from(risks)
    .where(eq(risks.dealId, DEAL))
    .limit(1);
  console.log("RISK", risk);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
