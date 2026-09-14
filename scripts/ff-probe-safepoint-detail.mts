import { eq, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs } from "../src/lib/db/schema";

const IDS = [
  "544cec59-3bf9-4cd3-85f6-7fe81724a45a", // Manatee
  "ce842964-4b66-4457-89c6-621b021fbb06", // Safepoint Insurance
];

async function main() {
  for (const id of IDS) {
    const [c] = await db.select().from(carriers).where(eq(carriers.id, id)).limit(1);
    if (!c) {
      console.log("MISSING", id);
      continue;
    }
    console.log("\n==== CARRIER", c.id, c.name, "====");
    console.log({
      name: c.name,
      agencyCode: c.agencyCode,
      portalUrl: c.portalUrl,
      agentPortalUrl: c.agentPortalUrl,
      portalLogin: c.portalLogin,
      hint: c.portalUsernameHint,
      hasUser: Boolean(c.portalUsernameEnc),
      hasPw: Boolean(c.portalPasswordEnc),
      phone: c.phone,
      email: c.email,
      customerServicePhone: (c as any).customerServicePhone,
      claimsPhone: (c as any).claimsPhone,
      underwriterEmail: (c as any).underwriterEmail,
      mailingAddress: (c as any).mailingAddress,
      carrierInfo: (c as any).carrierInfo,
      appetiteNotes: c.appetiteNotes,
      appetiteRows: c.appetiteRows,
      dontWriteRows: (c as any).dontWriteRows,
      website: (c as any).website,
    });

    const qs = await db.select().from(quotes).where(eq(quotes.carrierId, id));
    console.log(
      "QUOTES_FOR_CARRIER",
      qs.map((q) => ({
        id: q.id,
        dealId: q.dealId,
        riskOutcome: q.riskOutcome,
        notes: (q.notes || "").slice(0, 180),
        logId: q.quoteAttemptLogId,
      })),
    );

    const logs = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.carrierId, id));
    console.log(
      "LOGS_FOR_CARRIER",
      logs.slice(0, 8).map((l) => ({
        id: l.id,
        dealId: l.dealId,
        result: l.result,
        why: (l.why || "").slice(0, 180),
      })),
    );
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
