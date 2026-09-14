import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs } from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";
const UPC = "76ccf3a7-68c2-436b-8642-554cf96391c2";
const OA = "d0435525-f869-4173-8880-3b70231598b0";

async function main() {
  for (const id of [UPC, OA]) {
    const [c] = await db.select().from(carriers).where(eq(carriers.id, id)).limit(1);
    console.log("CARRIER", {
      id: c?.id,
      name: c?.name,
      portalUrl: c?.portalUrl,
      agentPortalUrl: c?.agentPortalUrl,
      portalLogin: c?.portalLogin,
      portalUsernameHint: c?.portalUsernameHint,
      hasUser: Boolean(c?.portalUsernameEnc),
      hasPass: Boolean(c?.portalPasswordEnc),
      portalStatus: c?.portalStatus,
      appetiteNotes: (c?.appetiteNotes || "").slice(0, 300),
    });
    const qs = await db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        premium: quotes.premium,
        bindable: quotes.bindable,
        riskOutcome: quotes.riskOutcome,
        notes: quotes.notes,
      })
      .from(quotes)
      .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, id)));
    console.log("QUOTES", JSON.stringify(qs, null, 2));
    const logs = await db
      .select({
        id: quoteAttemptLogs.id,
        result: quoteAttemptLogs.result,
        why: quoteAttemptLogs.why,
        attemptedAt: quoteAttemptLogs.attemptedAt,
      })
      .from(quoteAttemptLogs)
      .where(and(eq(quoteAttemptLogs.dealId, DEAL), eq(quoteAttemptLogs.carrierId, id)));
    console.log("LOGS", JSON.stringify(logs, null, 2));
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
