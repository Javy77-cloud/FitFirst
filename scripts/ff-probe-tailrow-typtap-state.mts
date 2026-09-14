import { db } from "../src/lib/db";
import { carriers, quotes } from "../src/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { normalizeAppetiteRows, normalizeDontWriteRows } from "../src/lib/carriers/appetite-rows";

const IDS = [
  "33333333-3333-4333-8333-333333333306", // Tailrow
  "0c3ec003-aa2d-44b0-89d2-8d85021d942e", // TypTap
  "33333333-3333-4333-8333-333333333304", // HOC
];

async function main() {
  for (const id of IDS) {
    const [c] = await db.select().from(carriers).where(eq(carriers.id, id)).limit(1);
    if (!c) {
      console.log({ id, missing: true });
      continue;
    }
    const app = normalizeAppetiteRows(c.appetiteRows);
    const dont = normalizeDontWriteRows(c.dontWriteRows);
    const qs = await db
      .select({
        id: quotes.id,
        dealId: quotes.dealId,
        riskOutcome: quotes.riskOutcome,
        quoteNumber: quotes.quoteNumber,
        bindable: quotes.bindable,
      })
      .from(quotes)
      .where(eq(quotes.carrierId, id));
    console.log(
      JSON.stringify(
        {
          id: c.id,
          name: c.name,
          portalUrl: c.portalUrl,
          agentPortalUrl: c.agentPortalUrl,
          portalLogin: c.portalLogin,
          phone: c.phone,
          email: c.email,
          underwriterEmail: c.underwriterEmail,
          mailingAddress: c.mailingAddress,
          appetiteNotesTail: String(c.appetiteNotes || "").slice(-400),
          dontWriteNotesTail: String((c as any).dontWriteNotes || "").slice(-300),
          appetiteRows: app.map((r) => ({
            id: r.id,
            date: r.dateRequested,
            lob: r.lob,
            acceptDecline: r.acceptDecline,
            notes: r.notes.slice(0, 160),
          })),
          dontWriteRows: dont.map((r) => ({
            id: r.id,
            date: r.date,
            lob: r.lob,
            reason: r.reason.slice(0, 160),
            notes: r.notes.slice(0, 120),
          })),
          quotes: qs,
        },
        null,
        2,
      ),
    );
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
